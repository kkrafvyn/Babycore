import { appPath, resolveEmailBranding } from './app-branding.js';
import {
  buildMonthlyNewsletterContent,
  buildWeeklyDigestContent,
} from './email-report-content.js';
import {
  renderSubscriptionExpiredEmail,
  renderSubscriptionRenewalEmail,
} from './email-templates.js';
import { sendTransactionalEmail } from './email.js';
import { supabase } from './supabase.js';

type ReminderPreferences = Record<string, unknown>;

const RENEWAL_WINDOW_DAYS = 7;

const parseReminderPreferences = (value: unknown): ReminderPreferences => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as ReminderPreferences;
  }
  return {};
};

const resolveUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const authAdmin = (supabase.auth as any)?.admin;
    if (!authAdmin?.getUserById) {
      return null;
    }

    const { data, error } = await authAdmin.getUserById(userId);
    if (error) {
      console.warn('Unable to resolve user email:', error.message);
      return null;
    }

    return data?.user?.email?.trim().toLowerCase() || null;
  } catch (error) {
    console.warn('Failed resolving user email:', error);
    return null;
  }
};

const updateReminderPreferences = async (
  userId: string,
  patch: ReminderPreferences,
): Promise<void> => {
  const { data: settings, error: readError } = await supabase
    .from('user_settings')
    .select('reminder_preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const nextPreferences = {
    ...parseReminderPreferences(settings?.reminder_preferences),
    ...patch,
  };

  const { error: writeError } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      reminder_preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (writeError) {
    throw writeError;
  }
};

const fetchBabyLogs = async (babyId: string, startDate: Date) => {
  const startIso = startDate.toISOString();

  const [feedingLogs, sleepLogs, diaperLogs, vaccinations] = await Promise.all([
    supabase.from('feed_logs').select('*').eq('baby_id', babyId).gte('timestamp', startIso),
    supabase.from('sleep_logs').select('*').eq('baby_id', babyId).gte('start_time', startIso),
    supabase.from('diaper_logs').select('*').eq('baby_id', babyId).gte('created_at', startIso),
    supabase.from('vaccination_records').select('*').eq('baby_id', babyId).gte('due_date', startIso),
  ]);

  return {
    feeding: feedingLogs.data || [],
    sleep: sleepLogs.data || [],
    diapers: diaperLogs.data || [],
    vaccinations: vaccinations.data || [],
  };
};

export async function processDueEmailReports(limit = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
  failures: Array<{ id: string; error: string }>;
}> {
  const summary = {
    processed: 0,
    sent: 0,
    failed: 0,
    failures: [] as Array<{ id: string; error: string }>,
  };

  const nowIso = new Date().toISOString();
  const branding = resolveEmailBranding();
  const dashboardUrl = appPath(branding.baseUrl, '/dashboard');

  const { data: dueReports, error } = await supabase
    .from('email_reports')
    .select('id, user_id, baby_id, report_type, recipient_email, scheduled_for')
    .is('sent_at', null)
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(Math.max(1, Math.min(200, limit)));

  if (error) {
    throw error;
  }

  for (const report of dueReports || []) {
    summary.processed += 1;

    try {
      const recipientEmail =
        String(report.recipient_email || '').trim().toLowerCase() ||
        (await resolveUserEmail(String(report.user_id)));

      if (!recipientEmail) {
        throw new Error('Missing recipient email');
      }

      const { data: baby, error: babyError } = await supabase
        .from('babies')
        .select('id, name')
        .eq('id', report.baby_id)
        .maybeSingle();

      if (babyError) {
        throw babyError;
      }

      if (!baby) {
        throw new Error('Baby not found for scheduled report');
      }

      const reportType = String(report.report_type || 'weekly_digest');
      const windowDays = reportType === 'monthly_newsletter' ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - windowDays);

      const logs = await fetchBabyLogs(String(report.baby_id), startDate);
      const content =
        reportType === 'monthly_newsletter'
          ? buildMonthlyNewsletterContent(
              baby,
              logs.feeding,
              logs.sleep,
              logs.diapers,
              logs.vaccinations,
              dashboardUrl,
            )
          : buildWeeklyDigestContent(
              baby,
              logs.feeding,
              logs.sleep,
              logs.diapers,
              logs.vaccinations,
              dashboardUrl,
            );

      await sendTransactionalEmail({
        to: recipientEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });

      const { error: updateError } = await supabase
        .from('email_reports')
        .update({
          sent_at: nowIso,
          email_html: content.html,
          recipient_email: recipientEmail,
        })
        .eq('id', report.id);

      if (updateError) {
        throw updateError;
      }

      summary.sent += 1;
    } catch (reportError: any) {
      summary.failed += 1;
      summary.failures.push({
        id: String(report.id),
        error: reportError?.message || 'Failed to send scheduled report',
      });
    }
  }

  return summary;
}

export async function processSubscriptionBillingEmails(limit = 100): Promise<{
  renewalRemindersSent: number;
  expiredNoticesSent: number;
  subscriptionsExpired: number;
  failures: Array<{ userId: string; error: string }>;
}> {
  const summary = {
    renewalRemindersSent: 0,
    expiredNoticesSent: 0,
    subscriptionsExpired: 0,
    failures: [] as Array<{ userId: string; error: string }>,
  };

  const branding = resolveEmailBranding();
  const billingUrl = appPath(branding.baseUrl, '/payment');
  const subscribeUrl = appPath(branding.baseUrl, '/payment');
  const now = Date.now();
  const renewalCutoff = new Date(now + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: renewalCandidates, error: renewalError } = await supabase
    .from('user_settings')
    .select('user_id, subscription_plan, subscription_status, subscription_end_date, reminder_preferences')
    .eq('subscription_status', 'active')
    .not('subscription_end_date', 'is', null)
    .gt('subscription_end_date', nowIso)
    .lte('subscription_end_date', renewalCutoff)
    .limit(Math.max(1, Math.min(200, limit)));

  if (renewalError) {
    throw renewalError;
  }

  for (const settings of renewalCandidates || []) {
    const userId = String(settings.user_id);
    const endDate = String(settings.subscription_end_date);
    const preferences = parseReminderPreferences(settings.reminder_preferences);

    if (preferences.subscription_renewal_reminder_for === endDate) {
      continue;
    }

    try {
      const recipientEmail = await resolveUserEmail(userId);
      if (!recipientEmail) {
        throw new Error('User email not found');
      }

      const planName = String(settings.subscription_plan || 'Premium');
      const email = renderSubscriptionRenewalEmail({
        planName,
        renewalDate: new Date(endDate).toLocaleDateString(),
        actionUrl: billingUrl,
        branding,
      });

      await sendTransactionalEmail({
        to: recipientEmail,
        subject: `Subscription Renewal Reminder - ${branding.appName}`,
        html: email.html,
        text: email.text,
      });

      await updateReminderPreferences(userId, {
        subscription_renewal_reminder_for: endDate,
      });

      summary.renewalRemindersSent += 1;
    } catch (error: any) {
      summary.failures.push({
        userId,
        error: error?.message || 'Failed to send renewal reminder',
      });
    }
  }

  const { data: expiredCandidates, error: expiredError } = await supabase
    .from('user_settings')
    .select('user_id, subscription_plan, subscription_status, subscription_end_date, reminder_preferences')
    .eq('subscription_status', 'active')
    .not('subscription_end_date', 'is', null)
    .lt('subscription_end_date', nowIso)
    .limit(Math.max(1, Math.min(200, limit)));

  if (expiredError) {
    throw expiredError;
  }

  for (const settings of expiredCandidates || []) {
    const userId = String(settings.user_id);
    const endDate = String(settings.subscription_end_date);
    const preferences = parseReminderPreferences(settings.reminder_preferences);

    try {
      const { error: statusError } = await supabase
        .from('user_settings')
        .update({
          subscription_status: 'expired',
          updated_at: nowIso,
        })
        .eq('user_id', userId);

      if (statusError) {
        throw statusError;
      }

      summary.subscriptionsExpired += 1;

      if (preferences.subscription_expired_notice_for === endDate) {
        continue;
      }

      const recipientEmail = await resolveUserEmail(userId);
      if (!recipientEmail) {
        throw new Error('User email not found');
      }

      const planName = String(settings.subscription_plan || 'Premium');
      const email = renderSubscriptionExpiredEmail({
        planName,
        actionUrl: subscribeUrl,
        branding,
      });

      await sendTransactionalEmail({
        to: recipientEmail,
        subject: `Subscription Expired - ${branding.appName} Premium`,
        html: email.html,
        text: email.text,
      });

      await updateReminderPreferences(userId, {
        subscription_expired_notice_for: endDate,
        subscription_renewal_reminder_for: endDate,
      });

      summary.expiredNoticesSent += 1;
    } catch (error: any) {
      summary.failures.push({
        userId,
        error: error?.message || 'Failed to process expired subscription',
      });
    }
  }

  return summary;
}
