import {
  appPath,
  resolveEmailBranding,
  type EmailBranding,
} from './app-branding.js';

type EmailButton = {
  label: string;
  href: string;
};

type EmailStat = {
  label: string;
  value: string;
  helper?: string;
};

type TemplateOptions = {
  branding?: EmailBranding;
};

type BaseEmailTemplateInput = {
  preview: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  bodyHtml?: string;
  button?: EmailButton;
  secondaryLink?: EmailButton;
  stats?: EmailStat[];
  footerNote?: string;
  branding?: EmailBranding;
};

type DigestStats = {
  feedings: number;
  sleep: number;
  diapers: number;
  vaccinations: number;
};

type InviteEmailInput = {
  recipientName?: string;
  babyName?: string;
  role: string;
  inviteLink: string;
} & TemplateOptions;

type WeeklyDigestEmailInput = {
  babyName: string;
  stats: DigestStats;
  dashboardUrl?: string;
} & TemplateOptions;

type MonthlyNewsletterEmailInput = WeeklyDigestEmailInput;

type MilestoneEmailInput = {
  babyName: string;
  milestoneName: string;
  date?: string;
  notes?: string;
  dashboardUrl?: string;
} & TemplateOptions;

type DoctorReportEmailInput = {
  babyName: string;
  reportType: string;
  reportUrl: string;
} & TemplateOptions;

type PaymentConfirmationEmailInput = {
  amount: number;
  currency: string;
  provider?: string;
  planName: string;
  renewalDate?: string;
  dashboardUrl?: string;
} & TemplateOptions;

type SubscriptionEmailInput = {
  planName: string;
  actionUrl: string;
  renewalDate?: string;
} & TemplateOptions;

type PasswordResetEmailInput = {
  resetLink: string;
} & TemplateOptions;

type WelcomeEmailInput = {
  userName: string;
  getStartedUrl: string;
} & TemplateOptions;

type WeeklySummaryEmailInput = {
  babyName: string;
  totalSleep: number;
  totalFeedings: number;
  diaperChanges: number;
  growthProgress: string;
  dashboardUrl: string;
} & TemplateOptions;

type VaccinationReminderEmailInput = {
  babyName: string;
  vaccines: Array<{ name: string; dueDate: Date | string }>;
  calendarUrl: string;
} & TemplateOptions;

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveBranding = (branding?: EmailBranding): EmailBranding => branding || resolveEmailBranding();

const renderPreviewText = (preview: string): string => `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preview)}
  </div>
`;

const renderButton = ({ label, href }: EmailButton): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 30px auto 8px;">
    <tr>
      <td style="border-radius: 999px; background: #5f6062; box-shadow: 0 10px 24px rgba(33, 37, 41, 0.18);">
        <a href="${escapeHtml(href)}" style="display:inline-block;min-width:170px;padding:16px 28px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:800;line-height:1;color:#ffffff;text-align:center;text-decoration:none;border-radius:999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const renderStats = (stats: EmailStat[]): string => {
  if (!stats.length) return '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 4px;">
      ${stats
        .map(
          (stat) => `
            <tr>
              <td style="padding:18px 22px;border-radius:28px;background:#f0f2f7;border:1px solid #e7e9ef;">
                <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#49697a;">
                  ${escapeHtml(stat.label)}
                </div>
                <div style="margin-top:8px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:900;line-height:1.1;color:#20242a;text-shadow:0 2px 0 rgba(0,0,0,0.08);">
                  ${escapeHtml(stat.value)}
                </div>
                ${
                  stat.helper
                    ? `<div style="margin-top:8px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.55;color:#686d76;">${escapeHtml(stat.helper)}</div>`
                    : ''
                }
              </td>
            </tr>
            <tr><td height="14" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          `,
        )
        .join('')}
    </table>
  `;
};

const renderBrandHeader = (branding: EmailBranding): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto 22px;">
    <tr>
      <td style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:0;color:#55575c;">
        <span style="display:inline-block;width:28px;height:28px;margin-right:9px;border-radius:999px;background:#e5f8ff;color:#45697d;text-align:center;line-height:28px;font-size:16px;vertical-align:middle;">&#9786;</span>
        ${escapeHtml(branding.appName)}
      </td>
      <td align="right">
        <span style="display:inline-block;padding:10px 18px;border-radius:999px;background:#5f6062;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:800;color:#ffffff;">
          ${escapeHtml(branding.productName)}
        </span>
      </td>
    </tr>
  </table>
`;

const renderFooterLinks = (branding: EmailBranding): string => `
  <a href="${escapeHtml(branding.privacyUrl)}" style="color:#45697d;text-decoration:none;">Privacy Policy</a>
  &nbsp;&nbsp;&nbsp;
  <a href="${escapeHtml(branding.termsUrl)}" style="color:#45697d;text-decoration:none;">Terms of Service</a>
  &nbsp;&nbsp;&nbsp;
  <a href="${escapeHtml(branding.contactUrl)}" style="color:#45697d;text-decoration:none;">Contact Us</a>
`;

export const renderBaseEmailTemplate = ({
  preview,
  eyebrow,
  title,
  intro,
  bodyHtml,
  button,
  secondaryLink,
  stats = [],
  footerNote,
  branding: brandingInput,
}: BaseEmailTemplateInput): string => {
  const branding = resolveBranding(brandingInput);
  const eyebrowLabel = eyebrow || branding.appName;

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="x-apple-disable-message-reformatting">
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:#f8f7fb;">
      ${renderPreviewText(preview)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f7fb;">
        <tr>
          <td align="center" style="padding:28px 18px 42px;">
            ${renderBrandHeader(branding)}
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto 26px;background:#eef0f5;border:1px solid #ebeaf0;border-radius:42px;overflow:hidden;">
              <tr>
                <td align="center" style="padding:44px 32px 38px;">
                  <div style="display:inline-block;width:112px;height:112px;border-radius:34px;background:#ffffff;box-shadow:0 18px 44px rgba(37, 43, 54, 0.08);">
                    <div style="margin:24px auto 0;width:64px;height:64px;border-radius:999px;background:#dff8ff;color:#45697d;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:32px;font-weight:900;line-height:64px;text-align:center;">
                      ${escapeHtml(branding.appName.charAt(0).toUpperCase())}
                    </div>
                  </div>
                  <div style="margin-top:30px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;color:#49697a;">
                    ${escapeHtml(eyebrowLabel)}
                  </div>
                  <h1 style="max-width:560px;margin:12px auto 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:42px;line-height:1.08;font-weight:900;letter-spacing:0;color:#242932;text-align:center;text-shadow:0 3px 0 rgba(0,0,0,0.09);">
                    ${escapeHtml(title)}
                  </h1>
                  ${
                    intro
                      ? `<div style="max-width:500px;margin:20px auto 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;line-height:1.65;color:#5f646d;text-align:center;">${intro}</div>`
                      : ''
                  }
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#ffffff;border:1px solid #ebeaf0;border-radius:34px;overflow:hidden;box-shadow:0 24px 64px rgba(37,43,54,0.06);">
              <tr>
                <td style="padding:34px 34px 36px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.72;color:#555b66;">
                  ${bodyHtml || ''}
                  ${renderStats(stats)}
                  ${button ? renderButton(button) : ''}
                  ${
                    secondaryLink
                      ? `<p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#7b8089;text-align:center;">If the button does not work, open this link:<br><a href="${escapeHtml(secondaryLink.href)}" style="color:#45697d;word-break:break-all;">${escapeHtml(secondaryLink.href)}</a></p>`
                      : ''
                  }
                  ${
                    footerNote
                      ? `<p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #eceef3;font-size:13px;line-height:1.7;color:#7b8089;text-align:center;">${escapeHtml(footerNote)}</p>`
                      : ''
                  }
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:28px auto 0;">
              <tr>
                <td style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:800;color:#55575c;">
                  ${escapeHtml(branding.appName)}
                </td>
                <td align="right" style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.7;color:#9aa3b2;">
                  ${renderFooterLinks(branding)}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:16px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.7;color:#9aa3b2;">
                  ${escapeHtml(branding.appName)} helps families keep care history, health records, and shared routines in one calm place.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`.trim();
};

export const renderInviteEmail = ({
  recipientName,
  babyName,
  role,
  inviteLink,
  branding,
}: InviteEmailInput): { subject: string; html: string; text: string } => {
  const brand = resolveBranding(branding);
  const roleLabel = role || 'caregiver';
  const title = babyName ? `Welcome to ${babyName}'s care circle` : 'Welcome to the family';
  const intro = [
    recipientName ? `Hi ${escapeHtml(recipientName)},` : '',
    babyName
      ? `You were invited as <strong>${escapeHtml(roleLabel)}</strong> to help care for <strong>${escapeHtml(babyName)}</strong>.`
      : `You were invited as <strong>${escapeHtml(roleLabel)}</strong> to ${escapeHtml(brand.appName)}.`,
  ]
    .filter(Boolean)
    .join('<br>');

  return {
    subject: babyName ? `${brand.appName} invite: ${babyName}` : `${brand.appName} invite: ${roleLabel}`,
    html: renderBaseEmailTemplate({
      preview: `Accept your ${brand.appName} care invite.`,
      eyebrow: 'Care invite',
      title,
      intro,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;text-align:center;">Open the invite to join the shared care workspace and keep the moments that matter in sync.</p>',
      button: { label: 'Accept invite', href: inviteLink },
      secondaryLink: { label: 'Accept invite', href: inviteLink },
      footerNote: `You can ignore this message if you were not expecting a ${brand.appName} invite.`,
      branding: brand,
    }),
    text: [
      `You have been invited to ${brand.appName}.`,
      babyName ? `Role: ${roleLabel} for ${babyName}` : `Role: ${roleLabel}`,
      `Accept invite: ${inviteLink}`,
    ].join('\n'),
  };
};

const renderDigestStats = (stats: DigestStats) => [
  { label: 'Average feedings per day', value: stats.feedings.toFixed(1) },
  { label: 'Total sleep', value: `${stats.sleep.toFixed(1)} hrs` },
  { label: 'Diaper changes', value: `${stats.diapers.toFixed(1)}/day` },
  ...(stats.vaccinations > 0 ? [{ label: 'New vaccinations', value: String(stats.vaccinations) }] : []),
];

export const renderWeeklyDigestEmail = ({
  babyName,
  stats,
  dashboardUrl,
  branding,
}: WeeklyDigestEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Your weekly ${brand.appName} summary for ${babyName}.`,
      eyebrow: 'The weekly digest',
      title: `Finding ${babyName}'s rhythm`,
      intro: 'A gentle summary of sleep, feeding, diaper changes, and health moments from the last seven days.',
      stats: renderDigestStats(stats),
      ...(dashboardUrl ? { button: { label: 'Open dashboard', href: dashboardUrl } } : {}),
      footerNote: 'For medical questions, use this summary as a conversation starter with your clinician.',
      branding: brand,
    }),
    text: [
      `${babyName}'s weekly ${brand.appName} summary`,
      `Average feedings per day: ${stats.feedings.toFixed(1)}`,
      `Total sleep: ${stats.sleep.toFixed(1)} hrs`,
      `Diaper changes: ${stats.diapers.toFixed(1)}/day`,
      `New vaccinations: ${stats.vaccinations}`,
      dashboardUrl ? `Open dashboard: ${dashboardUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

export const renderMonthlyNewsletterEmail = ({
  babyName,
  stats,
  dashboardUrl,
  branding,
}: MonthlyNewsletterEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Your monthly ${brand.appName} roundup for ${babyName}.`,
      eyebrow: 'Monthly roundup',
      title: `${babyName}'s month in review`,
      intro: 'A calm snapshot of sleep, feeding, diaper changes, and health moments from the last thirty days.',
      stats: renderDigestStats(stats),
      ...(dashboardUrl ? { button: { label: 'View monthly summary', href: dashboardUrl } } : {}),
      footerNote: 'This roundup is for family coordination, not medical diagnosis.',
      branding: brand,
    }),
    text: [
      `${babyName}'s monthly ${brand.appName} roundup`,
      `Average feedings per day: ${stats.feedings.toFixed(1)}`,
      `Total sleep: ${stats.sleep.toFixed(1)} hrs`,
      `Diaper changes: ${stats.diapers.toFixed(1)}/day`,
      `New vaccinations: ${stats.vaccinations}`,
      dashboardUrl ? `Open dashboard: ${dashboardUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

export const renderMilestoneEmail = ({
  babyName,
  milestoneName,
  date,
  notes,
  dashboardUrl,
  branding,
}: MilestoneEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `${babyName} reached a new milestone.`,
      eyebrow: 'Milestone',
      title: `${babyName} reached a milestone`,
      intro: `<strong>${escapeHtml(milestoneName)}</strong> has been added to ${escapeHtml(babyName)}'s care history.`,
      bodyHtml: [
        date ? `<p style="margin:0 0 12px;text-align:center;"><strong>Date:</strong> ${escapeHtml(date)}</p>` : '',
        notes ? `<p style="margin:0 0 18px;text-align:center;">${escapeHtml(notes)}</p>` : '',
      ].join(''),
      ...(dashboardUrl ? { button: { label: 'View milestone', href: dashboardUrl } } : {}),
      branding: brand,
    }),
    text: [
      `${babyName} reached a milestone`,
      milestoneName,
      date ? `Date: ${date}` : '',
      notes || '',
      dashboardUrl ? `View milestone: ${dashboardUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

export const renderDoctorReportEmail = ({
  babyName,
  reportType,
  reportUrl,
  branding,
}: DoctorReportEmailInput): { subject: string; html: string; text: string } => {
  const brand = resolveBranding(branding);
  const subject = `Medical Report for ${babyName}`;

  return {
    subject,
    html: renderBaseEmailTemplate({
      preview: `A ${brand.appName} medical report for ${babyName} was shared with you.`,
      eyebrow: 'Medical report',
      title: subject,
      intro: `A parent shared a ${escapeHtml(brand.appName)} medical report with you.`,
      stats: [{ label: 'Report type', value: reportType || 'General' }],
      button: { label: 'Open report', href: reportUrl },
      secondaryLink: { label: 'Open report', href: reportUrl },
      footerNote: 'This link follows the report token expiration policy configured by the parent.',
      branding: brand,
    }),
    text: [subject, `Report type: ${reportType || 'General'}`, `Open report: ${reportUrl}`].join('\n'),
  };
};

export const renderPaymentConfirmationEmail = ({
  amount,
  currency,
  provider,
  planName,
  renewalDate,
  dashboardUrl,
  branding,
}: PaymentConfirmationEmailInput): { subject: string; html: string; text: string } => {
  const brand = resolveBranding(branding);
  const providerLabel =
    provider === 'paystack' ? 'Paystack' : provider === 'flutterwave' ? 'Flutterwave' : provider;
  const actionUrl = dashboardUrl || appPath(brand.baseUrl, '/dashboard');

  return {
    subject: `Payment Confirmation - ${brand.appName} Premium`,
    html: renderBaseEmailTemplate({
      preview: `Your ${brand.appName} Premium subscription is active.`,
      eyebrow: 'Premium tracking',
      title: 'Your care tools are active',
      intro: `Thank you for upgrading ${escapeHtml(brand.appName)}. Your subscription is ready for calmer, more complete tracking.`,
      stats: [
        { label: 'Plan', value: planName },
        { label: 'Amount', value: `${amount} ${currency}` },
        { label: 'Status', value: 'Active' },
        ...(renewalDate ? [{ label: 'Next renewal', value: renewalDate }] : []),
        ...(providerLabel ? [{ label: 'Provider', value: providerLabel }] : []),
      ],
      button: { label: `Open ${brand.appName}`, href: actionUrl },
      footerNote: 'Keep this email for your records.',
      branding: brand,
    }),
    text: [
      `Payment Confirmation - ${brand.appName} Premium`,
      `Plan: ${planName}`,
      `Amount: ${amount} ${currency}`,
      `Status: Active`,
      renewalDate ? `Next renewal: ${renewalDate}` : '',
      providerLabel ? `Provider: ${providerLabel}` : '',
      `Open dashboard: ${actionUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

export const renderSubscriptionRenewalEmail = ({
  planName,
  renewalDate,
  actionUrl,
  branding,
}: SubscriptionEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Your ${planName} subscription renewal is coming up.`,
      eyebrow: 'Billing reminder',
      title: 'Your plan renews soon',
      intro: `Your <strong>${escapeHtml(planName)}</strong> subscription will renew on ${escapeHtml(renewalDate || 'your renewal date')}.`,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;text-align:center;">Make sure your payment method is up to date so your care history, insights, and reports stay uninterrupted.</p>',
      button: { label: 'Manage subscription', href: actionUrl },
      branding: brand,
    }),
    text: [
      `Subscription Renewal Reminder - ${brand.appName}`,
      `Plan: ${planName}`,
      renewalDate ? `Renewal date: ${renewalDate}` : '',
      `Manage subscription: ${actionUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

export const renderSubscriptionExpiredEmail = ({
  planName,
  actionUrl,
  branding,
}: SubscriptionEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Your ${planName} subscription has expired.`,
      eyebrow: 'Premium paused',
      title: 'Restore your care tools',
      intro: `Your <strong>${escapeHtml(planName)}</strong> subscription has expired.`,
      stats: [
        { label: 'Growth tracking', value: 'Paused' },
        { label: 'Family sharing', value: 'Paused' },
        { label: 'Reports', value: 'Paused' },
      ],
      button: { label: 'Renew subscription', href: actionUrl },
      footerNote: 'Your account data remains protected while your premium access is paused.',
      branding: brand,
    }),
    text: [
      `Subscription Expired - ${brand.appName} Premium`,
      `Plan: ${planName}`,
      `Renew subscription: ${actionUrl}`,
    ].join('\n'),
  };
};

export const renderPasswordResetEmail = ({
  resetLink,
  branding,
}: PasswordResetEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Reset your ${brand.appName} password.`,
      eyebrow: 'Account security',
      title: 'Reset your password',
      intro: `Use the secure link below to choose a new password for your ${escapeHtml(brand.appName)} account.`,
      button: { label: 'Reset password', href: resetLink },
      secondaryLink: { label: 'Reset password', href: resetLink },
      footerNote: 'This link expires in 24 hours. You can ignore this email if you did not request it.',
      branding: brand,
    }),
    text: [
      `Reset your ${brand.appName} password`,
      `Reset password: ${resetLink}`,
      'This link expires in 24 hours.',
    ].join('\n'),
  };
};

export const renderWelcomeEmail = ({
  userName,
  getStartedUrl,
  branding,
}: WelcomeEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Welcome to ${brand.appName}.`,
      eyebrow: 'Welcome',
      title: 'Welcome to the family',
      intro: `Hi ${escapeHtml(userName)}, you have taken a beautiful step toward a calmer parenting journey.`,
      stats: [
        { label: 'Growth insights', value: 'Ready' },
        { label: 'Sleep patterns', value: 'Ready' },
        { label: 'Feeding logs', value: 'Ready' },
      ],
      button: { label: 'Get started', href: getStartedUrl },
      footerNote: 'Start with one small log. Patterns emerge over time.',
      branding: brand,
    }),
    text: [
      `Welcome to ${brand.appName}, ${userName}`,
      'Add your baby profile, then start tracking sleep, feeding, diaper changes, growth, and vaccines.',
      `Get started: ${getStartedUrl}`,
    ].join('\n'),
  };
};

export const renderWeeklySummaryReportEmail = ({
  babyName,
  totalSleep,
  totalFeedings,
  diaperChanges,
  growthProgress,
  dashboardUrl,
  branding,
}: WeeklySummaryEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `Your weekly summary for ${babyName}.`,
      eyebrow: 'Weekly summary',
      title: `Finding ${babyName}'s rhythm`,
      intro: `Here is how ${escapeHtml(babyName)} is doing this week.`,
      stats: [
        { label: 'Total sleep', value: `${totalSleep} hrs` },
        { label: 'Feeding sessions', value: String(totalFeedings) },
        { label: 'Diaper changes', value: String(diaperChanges) },
        { label: 'Growth progress', value: growthProgress },
      ],
      button: { label: 'View full report', href: dashboardUrl },
      branding: brand,
    }),
    text: [
      `Weekly Summary: ${babyName}`,
      `Total sleep: ${totalSleep} hours`,
      `Feeding sessions: ${totalFeedings}`,
      `Diaper changes: ${diaperChanges}`,
      `Growth progress: ${growthProgress}`,
      `View full report: ${dashboardUrl}`,
    ].join('\n'),
  };
};

export const renderVaccinationReminderEmail = ({
  babyName,
  vaccines,
  calendarUrl,
  branding,
}: VaccinationReminderEmailInput): { html: string; text: string } => {
  const brand = resolveBranding(branding);

  return {
    html: renderBaseEmailTemplate({
      preview: `${babyName} has upcoming vaccinations.`,
      eyebrow: 'Care reminder',
      title: 'Vaccines to review',
      intro: `${escapeHtml(babyName)} has upcoming vaccinations. Schedule an appointment with your pediatrician to stay protected.`,
      stats: vaccines.map((vaccine) => ({
        label: vaccine.name,
        value:
          vaccine.dueDate instanceof Date
            ? vaccine.dueDate.toLocaleDateString()
            : String(vaccine.dueDate),
      })),
      button: { label: 'View vaccination calendar', href: calendarUrl },
      branding: brand,
    }),
    text: [
      `Vaccination Reminder: ${babyName}`,
      ...vaccines.map((vaccine) => {
        const dueDate =
          vaccine.dueDate instanceof Date
            ? vaccine.dueDate.toLocaleDateString()
            : String(vaccine.dueDate);
        return `${vaccine.name} - Due: ${dueDate}`;
      }),
      `View vaccination calendar: ${calendarUrl}`,
    ].join('\n'),
  };
};
