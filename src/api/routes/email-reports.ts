/**
 * Email Reports API Routes
 * Endpoints for sending weekly digests, newsletters, and milestone announcements
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
  modulePath: string,
) => Promise<any>;

// Lazy load nodemailer only when needed
let nodemailer: any = null;
const loadNodemailer = async () => {
  if (!nodemailer) {
    try {
      nodemailer = await dynamicImport('nodemailer');
    } catch (err) {
      console.warn('nodemailer not available, email features disabled');
      return null;
    }
  }
  return nodemailer;
};

// Email transporter setup (using SendGrid or Resend)
const getEmailTransporter = async () => {
  const nm = await loadNodemailer();
  if (!nm) return null;

  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    return nm.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY!,
      },
    });
  }
  
  // Mock transporter for development
  return {
    sendMail: async (mailOptions: any) => {
      console.log('Email would be sent:', mailOptions);
      return { accepted: [mailOptions.to], rejected: [] };
    },
  };
};

/**
 * POST /api/email-reports/generate-weekly
 * Generate and send weekly digest email
 */
export async function generateWeeklyDigest(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user email and baby data
    const authClient = supabase.auth as any;
    const { data: { user } } = await authClient.getUser();
    const { data: baby } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .single();

    if (!user?.email || !baby) {
      return res.status(404).json({ error: 'User or baby not found' });
    }

    // Get week's data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const [feedingLogs, sleepLogs, diaperLogs, vaccinations] = await Promise.all([
      supabase
        .from('feeding_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('sleep_analytics')
        .select('*')
        .eq('baby_id', babyId)
        .gte('recorded_date', startDate.toISOString()),
      supabase
        .from('diaper_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('vaccination_records')
        .select('*')
        .eq('baby_id', babyId)
        .gte('date', startDate.toISOString()),
    ]);

    // Generate email content
    const emailContent = generateWeeklyDigestContent(
      baby,
      feedingLogs.data || [],
      sleepLogs.data || [],
      diaperLogs.data || [],
      vaccinations.data || []
    );

    // Send email
    const transporter = await getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@babylog.app',
      to: user.email,
      subject: `Weekly Update: ${baby.name}'s Progress`,
      html: emailContent.html,
    });

    // Record email sent
    const { error: logError } = await supabase
      .from('email_reports')
      .insert({
        id: uuidv4(),
        user_id: userId,
        baby_id: babyId,
        report_type: 'weekly_digest',
        sent_at: new Date().toISOString(),
        recipient_email: user.email,
      });

    if (logError) console.error('Error logging email:', logError);

    return res.json({
      success: true,
      message: 'Weekly digest sent successfully',
      stats: emailContent.stats,
    });
  } catch (error) {
    console.error('Weekly digest error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/email-reports/send-milestone-announcement
 * Send announcement when baby reaches milestone
 */
export async function sendMilestoneAnnouncement(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, milestone, details } = req.body;

    if (!userId || !babyId || !milestone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user and baby data
    const authClient = supabase.auth as any;
    const { data: { user } } = await authClient.getUser();
    const { data: baby } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .single();

    if (!user?.email || !baby) {
      return res.status(404).json({ error: 'User or baby not found' });
    }

    // Generate milestone announcement
    const emailContent = generateMilestoneEmail(baby, milestone, details);

    // Send email
    const transporter = await getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@babylog.app',
      to: user.email,
      subject: `🎉 ${baby.name} reached a milestone!`,
      html: emailContent.html,
    });

    // Record milestone announcement
    const { error } = await supabase
      .from('milestone_announcements')
      .insert({
        id: uuidv4(),
        user_id: userId,
        baby_id: babyId,
        milestone_type: milestone,
        details,
        announced_at: new Date().toISOString(),
      });

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Milestone announcement sent',
    });
  } catch (error) {
    console.error('Milestone announcement error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/email-reports/schedule-newsletter
 * Schedule automated newsletter
 */
export async function scheduleNewsletter(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { frequency = 'weekly', enabled = true } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const { data: schedule, error } = await supabase
      .from('email_report_schedules')
      .upsert({
        user_id: userId,
        report_type: 'newsletter',
        frequency,
        enabled,
        next_send_date: calculateNextSendDate(frequency),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      schedule,
      message: `Newsletter ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/email-reports/preview
 * Get preview of email report
 */
export async function getReportPreview(req: Request, res: Response) {
  try {
    const { babyId, reportType = 'weekly' } = req.body;

    if (!babyId) {
      return res.status(400).json({ error: 'Baby ID required' });
    }

    // Get sample data
    const { data: baby } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .single();

    const startDate = new Date();
    if (reportType === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (reportType === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const [feeding, sleep, diapers] = await Promise.all([
      supabase
        .from('feeding_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('created_at', startDate.toISOString())
        .limit(10),
      supabase
        .from('sleep_analytics')
        .select('*')
        .eq('baby_id', babyId)
        .gte('recorded_date', startDate.toISOString())
        .limit(10),
      supabase
        .from('diaper_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('created_at', startDate.toISOString())
        .limit(10),
    ]);

    const content = generateWeeklyDigestContent(
      baby,
      feeding.data || [],
      sleep.data || [],
      diapers.data || [],
      []
    );

    return res.json({
      success: true,
      preview: content.html,
      stats: content.stats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Helper functions

function generateWeeklyDigestContent(
  baby: any,
  feeding: any[],
  sleep: any[],
  diapers: any[],
  vaccinations: any[]
) {
  const avgFeedingsPerDay = feeding.length / 7;
  const totalSleepHours = sleep.reduce((sum, s) => sum + (s.total_sleep_minutes || 0), 0) / 60;
  const avgDiaperChanges = diapers.length / 7;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .stat-card { background: #f5f7fa; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
          .stat-label { font-size: 12px; color: #7c8493; text-transform: uppercase; }
          .stat-value { font-size: 24px; font-weight: bold; color: #2d3748; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Weekly Update for ${baby.name}</h2>
            <p>Last 7 days summary</p>
          </div>

          <div class="stat-card">
            <div class="stat-label">Average Feedings Per Day</div>
            <div class="stat-value">${avgFeedingsPerDay.toFixed(1)}</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Total Sleep Hours</div>
            <div class="stat-value">${totalSleepHours.toFixed(1)} hrs</div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Diaper Changes</div>
            <div class="stat-value">${avgDiaperChanges.toFixed(1)}/day</div>
          </div>

          ${vaccinations.length > 0 ? `
            <div class="stat-card">
              <div class="stat-label">New Vaccinations</div>
              <div class="stat-value">${vaccinations.length}</div>
            </div>
          ` : ''}

          <p style="text-align: center; color: #7c8493; margin-top: 30px; font-size: 12px;">
            For more details, visit your BabyLog dashboard
          </p>
        </div>
      </body>
    </html>
  `;

  return {
    html,
    stats: {
      feedings: avgFeedingsPerDay,
      sleep: totalSleepHours,
      diapers: avgDiaperChanges,
      vaccinations: vaccinations.length,
    },
  };
}

function generateMilestoneEmail(baby: any, milestone: string, details: any) {
  const milestoneNames: { [key: string]: string } = {
    rolling: 'Started Rolling Over',
    sitting: 'Started Sitting Up',
    crawling: 'Started Crawling',
    walking: 'First Steps',
    talking: 'First Words',
    smiling: 'First Smile',
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .milestone-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px; border-radius: 8px; text-align: center; }
          .milestone-icon { font-size: 48px; margin-bottom: 20px; }
          .milestone-title { font-size: 28px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="milestone-card">
            <div class="milestone-icon">🎉</div>
            <div class="milestone-title">${baby.name} achieved a milestone!</div>
            <h2>${milestoneNames[milestone] || milestone}</h2>
            ${details?.date ? `<p>Date: ${details.date}</p>` : ''}
            ${details?.notes ? `<p>${details.notes}</p>` : ''}
          </div>
          <p style="text-align: center; margin-top: 30px;">
            Celebrate this achievement in your BabyLog dashboard! 🎊
          </p>
        </div>
      </body>
    </html>
  `;

  return { html };
}

function calculateNextSendDate(frequency: string): string {
  const date = new Date();
  
  if (frequency === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  }
  
  date.setHours(9, 0, 0, 0); // Set to 9 AM
  return date.toISOString();
}

router.post('/generate-weekly', generateWeeklyDigest);
router.post('/send-milestone-announcement', sendMilestoneAnnouncement);
router.post('/schedule-newsletter', scheduleNewsletter);
router.post('/preview', getReportPreview);

export default router;
