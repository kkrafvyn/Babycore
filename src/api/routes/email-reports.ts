/**
 * Email Reports API Routes
 * Endpoints for sending weekly digests, newsletters, and milestone announcements
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { resolveClientAppBaseUrl } from '../utils/app-base-url.js';
import {
  buildMilestoneEmailContent,
  buildMonthlyNewsletterContent,
  buildWeeklyDigestContent,
} from '../utils/email-report-content.js';
import { sendTransactionalEmail } from '../utils/email.js';
import { APP_NOREPLY_EMAIL } from '../../lib/app-domain.js';
import { ensureBabyAccess } from '../utils/baby-access.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const getEmailTransporter = async () => ({
  sendMail: async (mailOptions: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }) =>
    sendTransactionalEmail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
      from: mailOptions.from,
    }),
});

const resolveUserEmail = async (
  userId: string,
  fallbackEmail?: string,
): Promise<string | null> => {
  if (fallbackEmail) {
    return fallbackEmail.trim().toLowerCase();
  }

  try {
    const adminAuth = (supabase.auth as any)?.admin;
    if (!adminAuth?.getUserById) {
      return null;
    }

    const { data, error } = await adminAuth.getUserById(userId);
    if (error) {
      console.warn('Unable to resolve user email from auth admin API:', error.message);
      return null;
    }

    return data?.user?.email?.trim().toLowerCase() || null;
  } catch (error) {
    console.warn('Failed resolving user email:', error);
    return null;
  }
};

/**
 * POST /api/email-reports/generate-weekly
 * Generate and send weekly digest email
 */
export async function generateWeeklyDigest(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const requesterEmail = req.user?.email as string | undefined;
    const { babyId } = req.body;

    if (!userId || !babyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId), {
      write: true,
      forbiddenMessage: 'You do not have permission to email reports for this baby',
    });
    if (!access) return;

    const userEmail = await resolveUserEmail(userId, requesterEmail);
    const baby = access.baby;

    if (!userEmail || !baby) {
      return res.status(404).json({ error: 'User or baby not found' });
    }

    // Get week's data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const [feedingLogs, sleepLogs, diaperLogs, vaccinations] = await Promise.all([
      supabase
        .from('feed_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('timestamp', startDate.toISOString()),
      supabase
        .from('sleep_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('start_time', startDate.toISOString()),
      supabase
        .from('diaper_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('vaccination_records')
        .select('*')
        .eq('baby_id', babyId)
        .gte('due_date', startDate.toISOString()),
    ]);

    // Generate email content
    const dashboardUrl = `${resolveClientAppBaseUrl(req)}/dashboard`;
    const emailContent = buildWeeklyDigestContent(
      baby,
      feedingLogs.data || [],
      sleepLogs.data || [],
      diaperLogs.data || [],
      vaccinations.data || [],
      dashboardUrl,
    );

    // Send email
    await sendTransactionalEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      from: process.env.EMAIL_FROM || APP_NOREPLY_EMAIL,
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
        recipient_email: userEmail,
      });

    if (logError) console.error('Error logging email:', logError);

    return res.json({
      success: true,
      message: 'Weekly digest sent successfully',
      stats: emailContent.stats,
    });
  } catch (error: any) {
    console.error('Weekly digest error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/email-reports/send-milestone-announcement
 * Send announcement when baby reaches milestone
 */
export async function sendMilestoneAnnouncement(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const requesterEmail = req.user?.email as string | undefined;
    const { babyId, milestone, details } = req.body;

    if (!userId || !babyId || !milestone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId), {
      write: true,
      forbiddenMessage: 'You do not have permission to send milestone announcements for this baby',
    });
    if (!access) return;

    const userEmail = await resolveUserEmail(userId, requesterEmail);
    const baby = access.baby;

    if (!userEmail || !baby) {
      return res.status(404).json({ error: 'User or baby not found' });
    }

    // Generate milestone announcement
    const emailContent = buildMilestoneEmailContent(
      baby,
      milestone,
      details,
      `${resolveClientAppBaseUrl(req)}/dashboard`,
    );

    // Send email
    const transporter = await getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || APP_NOREPLY_EMAIL,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
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
  } catch (error: any) {
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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/email-reports/preview
 * Get preview of email report
 */
export async function getReportPreview(req: AuthRequest, res: Response) {
  try {
    const { babyId, reportType = 'weekly' } = req.body;

    if (!babyId) {
      return res.status(400).json({ error: 'Baby ID required' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId));
    if (!access) return;

    // Get report data for the selected preview window.
    const baby = access.baby;
    if (!baby) {
      return res.status(404).json({ error: 'Baby not found' });
    }

    const startDate = new Date();
    if (reportType === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (reportType === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const dashboardUrl = `${resolveClientAppBaseUrl(req)}/dashboard`;
    const [feeding, sleep, diapers, vaccinations] = await Promise.all([
      supabase
        .from('feed_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('timestamp', startDate.toISOString()),
      supabase
        .from('sleep_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('start_time', startDate.toISOString()),
      supabase
        .from('diaper_logs')
        .select('*')
        .eq('baby_id', babyId)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('vaccination_records')
        .select('*')
        .eq('baby_id', babyId)
        .gte('due_date', startDate.toISOString()),
    ]);

    const content =
      reportType === 'monthly'
        ? buildMonthlyNewsletterContent(
            baby,
            feeding.data || [],
            sleep.data || [],
            diapers.data || [],
            vaccinations.data || [],
            dashboardUrl,
          )
        : buildWeeklyDigestContent(
            baby,
            feeding.data || [],
            sleep.data || [],
            diapers.data || [],
            vaccinations.data || [],
            dashboardUrl,
          );

    return res.json({
      success: true,
      preview: content.html,
      stats: content.stats,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
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

  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

router.post('/generate-weekly', generateWeeklyDigest);
router.post('/send-milestone-announcement', sendMilestoneAnnouncement);
router.post('/schedule-newsletter', scheduleNewsletter);
router.post('/preview', getReportPreview);

export default router;
