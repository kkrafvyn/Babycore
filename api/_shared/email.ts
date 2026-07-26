import { APP_NOREPLY_EMAIL, normalizeTransactionalFromAddress } from '../../src/lib/app-domain.js';
import nodemailer from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

type SendEmailResult = {
  success: boolean;
  provider: 'resend' | 'sendgrid' | 'smtp' | 'dry-run';
  id?: string;
  message?: string;
};

const getFromAddress = (override?: string): string =>
  normalizeTransactionalFromAddress(
    (
      override ||
      process.env.SMTP_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      APP_NOREPLY_EMAIL
    ).trim(),
  );

const toPlainText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

export const sendTransactionalEmail = async (
  input: SendEmailInput,
): Promise<SendEmailResult> => {
  const payload = {
    from: getFromAddress(input.from),
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text || toPlainText(input.html),
  };

  const resendKey = process.env.RESEND_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      throw new Error(body.message || `Resend request failed (${response.status})`);
    }

    return {
      success: true,
      provider: 'resend',
      id: body.id,
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
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: getFromAddress(input.from) },
        subject: input.subject,
        content: [{ type: 'text/html', value: input.html }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `SendGrid request failed (${response.status})`);
    }

    return {
      success: true,
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
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    return {
      success: true,
      provider: 'smtp',
      id: info?.messageId,
    };
  }

  console.info('Email provider key missing. Running in dry-run mode.', {
    to: input.to,
    subject: input.subject,
  });

  return {
    success: true,
    provider: 'dry-run',
    message: 'No email provider key configured. Email accepted in dry-run mode.',
  };
};
