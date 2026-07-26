import { APP_NOREPLY_EMAIL, normalizeTransactionalFromAddress } from '../../lib/app-domain.js';
import nodemailer from 'nodemailer';

export type EmailProvider = 'resend' | 'sendgrid' | 'smtp' | 'dry-run';

export interface TransactionalEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface TransactionalEmailResult {
  provider: EmailProvider;
  id?: string;
}

const resolveFromAddress = (provided?: string): string =>
  normalizeTransactionalFromAddress(
    provided ||
      process.env.SMTP_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      APP_NOREPLY_EMAIL,
  );

const resolveSmtpConfig = (): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
} | null => {
  const host = process.env.SMTP_HOST?.trim();
  const user = (process.env.SMTP_USER || process.env.SMTP_USERNAME || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  const portValue = Number(process.env.SMTP_PORT || 587);

  if (!host || !user || !pass || !Number.isFinite(portValue)) {
    return null;
  }

  const secureFlag = (process.env.SMTP_SECURE || '').toLowerCase();
  const secure =
    secureFlag.length > 0 ? ['1', 'true', 'yes'].includes(secureFlag) : portValue === 465;

  return {
    host,
    port: portValue,
    secure,
    user,
    pass,
  };
};

const toRecipientList = (to: string | string[]): string[] =>
  (Array.isArray(to) ? to : [to]).map((item) => item.trim()).filter(Boolean);

export async function sendTransactionalEmail(
  options: TransactionalEmailOptions,
): Promise<TransactionalEmailResult> {
  const recipients = toRecipientList(options.to);
  if (!recipients.length) {
    throw new Error('No email recipients provided');
  }

  const from = resolveFromAddress(options.from);

  const resendKey = process.env.RESEND_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as { id?: string };
    return {
      provider: 'resend',
      id: payload.id,
    };
  }

  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: recipients.map((email) => ({ email })),
          },
        ],
        from: { email: from },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || '' },
          { type: 'text/html', value: options.html },
        ],
        ...(options.replyTo ? { reply_to: { email: options.replyTo } } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SendGrid request failed (${response.status}): ${body}`);
    }

    return {
      provider: 'sendgrid',
    };
  }

  const smtpConfig = resolveSmtpConfig();
  if (smtpConfig) {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    return {
      provider: 'smtp',
      id: info?.messageId,
    };
  }

  console.warn(
    `[email:dry-run] No SENDGRID_API_KEY, RESEND_API_KEY, or SMTP_* configured. Intended recipients: ${recipients.join(', ')}`,
  );
  return { provider: 'dry-run' };
}
