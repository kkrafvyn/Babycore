import type { Response } from 'express';

import { appPath, resolveEmailBranding } from '../utils/app-branding.js';
import { renderWelcomeEmail } from '../utils/email-templates.js';
import { sendTransactionalEmail } from '../utils/email.js';
import { supabase } from '../utils/supabase.js';
import type { AuthRequest } from '../middleware/auth.js';

const parseReminderPreferences = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const resolveDisplayName = (user: any): string => {
  const metadata = user?.user_metadata || {};
  return (
    String(metadata.full_name || metadata.name || metadata.display_name || user?.email || 'there').trim() ||
    'there'
  );
};

export async function sendWelcomeEmailHandler(req: AuthRequest, res: Response): Promise<void> {
  const userId = String(req.user?.id || '').trim();
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const recipientEmail = String(req.user?.email || '').trim().toLowerCase();
  if (!recipientEmail) {
    res.status(400).json({ success: false, error: 'Authenticated user is missing an email address' });
    return;
  }

  try {
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('reminder_preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    const preferences = parseReminderPreferences(settings?.reminder_preferences);
    if (preferences.welcome_email_sent_at) {
      res.status(200).json({
        success: true,
        skipped: true,
        message: 'Welcome email already sent',
      });
      return;
    }

    const branding = resolveEmailBranding({ req });
    const userName = resolveDisplayName(req.user);
    const email = renderWelcomeEmail({
      userName,
      getStartedUrl: appPath(branding.baseUrl, '/dashboard'),
      branding,
    });

    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject: `Welcome to ${branding.appName}!`,
      html: email.html,
      text: email.text,
    });

    const sentAt = new Date().toISOString();
    const { error: upsertError } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        reminder_preferences: {
          ...preferences,
          welcome_email_sent_at: sentAt,
        },
        updated_at: sentAt,
      },
      { onConflict: 'user_id' },
    );

    if (upsertError) {
      throw upsertError;
    }

    res.status(200).json({
      success: true,
      message: 'Welcome email sent',
      result,
    });
  } catch (error: any) {
    const message = String(error?.message || 'Failed to send welcome email');
    if (/Resend request failed \(401\)/.test(message) || /API key is invalid/i.test(message)) {
      res.status(200).json({
        success: true,
        skipped: true,
        message: 'Welcome email skipped because email service is not configured',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
}
