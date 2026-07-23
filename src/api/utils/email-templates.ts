import {
  appPath,
  resolveEmailBranding,
  type EmailBranding,
} from './app-branding.js';
import {
  escapeHtml as editorialEscapeHtml,
  renderEditorialEmailTemplate,
} from './email-editorial-layout.js';

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

export const escapeHtml = editorialEscapeHtml;

const isFullHtmlDocument = (html: string): boolean =>
  /^\s*<!doctype html/i.test(html) || /^\s*<html[\s>]/i.test(html);

export const wrapEmailHtml = (
  html: string,
  {
    preview,
    title,
    branding,
  }: {
    preview: string;
    title: string;
    branding?: EmailBranding;
  },
): string => {
  if (isFullHtmlDocument(html)) {
    return html;
  }

  return renderBaseEmailTemplate({
    preview,
    volumeLabel: 'FROM THE EDITORIAL TEAM',
    title,
    bodyHtml: html,
    branding,
  });
};

export const renderCustomEmail = ({
  preview,
  title,
  bodyHtml,
  button,
  branding,
}: {
  preview: string;
  title: string;
  bodyHtml: string;
  button?: EmailButton;
  branding?: EmailBranding;
}): { html: string } => ({
  html: wrapEmailHtml(bodyHtml, { preview, title, branding }),
});

const resolveBranding = (branding?: EmailBranding): EmailBranding => branding || resolveEmailBranding();

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
  volumeLabel,
  titleAccent,
  features,
  quote,
  ctaBox,
}: BaseEmailTemplateInput & {
  volumeLabel?: string;
  titleAccent?: string;
  features?: Array<{ title: string; body: string; icon?: string }>;
  quote?: { text: string; attribution?: string };
  ctaBox?: { title: string; body: string; buttonLabel: string; buttonHref: string };
}): string =>
  renderEditorialEmailTemplate({
    preview,
    volumeLabel,
    eyebrow,
    title,
    titleAccent,
    intro,
    bodyHtml,
    button,
    secondaryLink,
    stats,
    features,
    quote,
    ctaBox,
    footerNote,
    branding: brandingInput,
  });

export const renderInviteEmail = ({
  recipientName,
  babyName,
  role,
  inviteLink,
  branding,
}: InviteEmailInput): { subject: string; html: string; text: string } => {
  const brand = resolveBranding(branding);
  const roleLabel = role || 'caregiver';
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
      volumeLabel: 'CARE INVITE',
      eyebrow: 'Family sharing',
      title: babyName ? `Join ${babyName}'s` : 'Join the',
      titleAccent: babyName ? 'care circle' : 'Journey',
      intro,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;text-align:center;">Open the invite to join the shared care workspace and keep the moments that matter in sync.</p>',
      quote: {
        text: 'The days are long, but the years are short. Make every moment of connection count with the right support.',
        attribution: 'Editorial Board',
      },
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
      volumeLabel: 'THE WEEKLY GLIMPSE',
      eyebrow: 'Volume digest',
      title: 'Finding Your Calm in the',
      titleAccent: 'Chaos.',
      intro:
        'A sanctuary of calm for the modern parent. Curated insights to guide you through the beautiful, quiet moments of early parenthood.',
      bodyHtml: `<p style="max-width:520px;margin:0 auto 18px;text-align:center;">Here is how <strong>${escapeHtml(babyName)}</strong> is doing this week — sleep, feeding, diaper changes, and health moments from the last seven days.</p>`,
      stats: renderDigestStats(stats),
      features: [
        {
          icon: '☽',
          title: 'Mindful Moments',
          body: '4.2 minute breathwork for tired minds.',
        },
        {
          icon: '🍴',
          title: 'Feeding Tips',
          body: 'Decoding the late-night hunger cry.',
        },
      ],
      quote: {
        text: 'The most important thing a parent can do is to simply be present in the quiet.',
        attribution: 'Editorial Board',
      },
      ...(dashboardUrl ? { button: { label: 'Continue Reading →', href: dashboardUrl } } : {}),
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
      volumeLabel: 'MONTHLY ROUNDUP',
      eyebrow: 'Issue digest',
      title: 'The Weekly',
      titleAccent: 'Glimpse',
      intro:
        'A calm snapshot of sleep, feeding, diaper changes, and health moments from the last thirty days.',
      bodyHtml: `<p style="max-width:520px;margin:0 auto 18px;text-align:center;"><strong>${escapeHtml(babyName)}'s month in review</strong> — patterns, milestones, and the quiet moments worth remembering.</p>`,
      stats: renderDigestStats(stats),
      quote: {
        text: 'The days are long, but the years are short. Make every moment of connection count with the right support.',
        attribution: 'Editorial Board',
      },
      ...(dashboardUrl
        ? {
            ctaBox: {
              title: 'Never miss a glimpse.',
              body: 'Our weekly digest is curated to provide peace of mind and professional insight directly to your inbox.',
              buttonLabel: 'View monthly summary',
              buttonHref: dashboardUrl,
            },
          }
        : {}),
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
      volumeLabel: 'MILESTONE MOMENT',
      eyebrow: 'Visual milestones',
      title: `${babyName} reached a`,
      titleAccent: 'milestone',
      intro: `<strong>${escapeHtml(milestoneName)}</strong> has been added to ${escapeHtml(babyName)}'s care history.`,
      bodyHtml: [
        date ? `<p style="margin:0 0 12px;text-align:center;"><strong>Date:</strong> ${escapeHtml(date)}</p>` : '',
        notes ? `<p style="margin:0 0 18px;text-align:center;">${escapeHtml(notes)}</p>` : '',
      ].join(''),
      quote: {
        text: 'In the small details, we find the greatest stories.',
      },
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
      volumeLabel: 'EXPERT HELP',
      eyebrow: 'Medical report',
      title: `Report for ${babyName}`,
      intro: `A parent shared a ${escapeHtml(brand.appName)} medical report with you.`,
      stats: [{ label: 'Report type', value: reportType || 'General' }],
      quote: {
        text: 'The most important thing a parent can do is to simply be present in the quiet.',
        attribution: 'Clinical guidance',
      },
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
      volumeLabel: 'PREMIUM ACTIVE',
      eyebrow: 'Payment confirmed',
      title: 'Your care tools are',
      titleAccent: 'active',
      intro: `Thank you for upgrading ${escapeHtml(brand.appName)}. Your subscription is ready for calmer, more complete tracking.`,
      stats: [
        { label: 'Plan', value: planName },
        { label: 'Amount', value: `${amount} ${currency}` },
        { label: 'Status', value: 'Active' },
        ...(renewalDate ? [{ label: 'Next renewal', value: renewalDate }] : []),
        ...(providerLabel ? [{ label: 'Provider', value: providerLabel }] : []),
      ],
      button: { label: `Open ${brand.appName}`, href: actionUrl },
      ctaBox: {
        title: 'Start your serene journey today.',
        body: `Your premium tools are ready. Open ${brand.appName} to unlock insights, sharing, and reports.`,
        buttonLabel: `Open ${brand.appName}`,
        buttonHref: actionUrl,
      },
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
      volumeLabel: 'BILLING REMINDER',
      eyebrow: 'Subscription renewal',
      title: 'Your plan renews',
      titleAccent: 'soon',
      intro: `Your <strong>${escapeHtml(planName)}</strong> subscription will renew on ${escapeHtml(renewalDate || 'your renewal date')}.`,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;text-align:center;">Make sure your payment method is up to date so your care history, insights, and reports stay uninterrupted.</p>',
      button: { label: 'Manage subscription', href: actionUrl },
      ctaBox: {
        title: 'Never miss a glimpse.',
        body: 'Keep your premium access uninterrupted so your family always has calm, complete care history.',
        buttonLabel: 'Manage subscription',
        buttonHref: actionUrl,
      },
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
      volumeLabel: 'PREMIUM PAUSED',
      eyebrow: 'Subscription expired',
      title: 'Restore your care',
      titleAccent: 'tools',
      intro: `Your <strong>${escapeHtml(planName)}</strong> subscription has expired.`,
      stats: [
        { label: 'Growth tracking', value: 'Paused' },
        { label: 'Family sharing', value: 'Paused' },
        { label: 'Reports', value: 'Paused' },
      ],
      button: { label: 'Renew subscription', href: actionUrl },
      ctaBox: {
        title: 'Start your serene journey today.',
        body: 'Renew your subscription to restore insights, family sharing, and premium reports.',
        buttonLabel: 'Renew subscription',
        buttonHref: actionUrl,
      },
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
      volumeLabel: 'ACCOUNT SECURITY',
      eyebrow: 'Password reset',
      title: 'Reset your',
      titleAccent: 'password',
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
      volumeLabel: `WELCOME TO ${brand.appName.toUpperCase()}`,
      title: 'Welcome to the',
      titleAccent: 'Journey',
      intro: `Hi ${escapeHtml(userName)}, parenthood is a collection of quiet moments and profound milestones. We're here to help you document them with the grace they deserve.`,
      features: [
        {
          icon: '⏱',
          title: 'Track',
          body: 'Log sleep, feedings, and diapers with effortless timers designed for tired eyes.',
        },
        {
          icon: '📊',
          title: 'Insights',
          body: 'Discover patterns in your little one\'s rhythms with calm, actionable summaries.',
        },
        {
          icon: '📖',
          title: 'Journal',
          body: 'Capture photos, notes, and milestones in a beautiful narrative of growth.',
        },
      ],
      quote: {
        text: 'In the small details, we find the greatest stories.',
      },
      button: { label: 'Get Started', href: getStartedUrl },
      ctaBox: {
        title: 'Start your serene journey today.',
        body: `Join thousands of parents who have found their peace of mind with ${brand.appName}.`,
        buttonLabel: 'Download the App',
        buttonHref: getStartedUrl,
      },
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
      volumeLabel: 'THE WEEKLY GLIMPSE',
      eyebrow: 'Weekly summary',
      title: 'Finding Your Calm in the',
      titleAccent: 'Chaos.',
      intro: `Here is how ${escapeHtml(babyName)} is doing this week.`,
      stats: [
        { label: 'Total sleep', value: `${totalSleep} hrs` },
        { label: 'Feeding sessions', value: String(totalFeedings) },
        { label: 'Diaper changes', value: String(diaperChanges) },
        { label: 'Growth progress', value: growthProgress },
      ],
      quote: {
        text: 'The most important thing a parent can do is to simply be present in the quiet.',
        attribution: 'Editorial Board',
      },
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
      volumeLabel: 'CARE REMINDER',
      eyebrow: 'Vaccination schedule',
      title: 'Vaccines to',
      titleAccent: 'review',
      intro: `${escapeHtml(babyName)} has upcoming vaccinations. Schedule an appointment with your pediatrician to stay protected.`,
      stats: vaccines.map((vaccine) => ({
        label: vaccine.name,
        value:
          vaccine.dueDate instanceof Date
            ? vaccine.dueDate.toLocaleDateString()
            : String(vaccine.dueDate),
      })),
      quote: {
        text: 'The days are long, but the years are short. Make every moment of connection count with the right support.',
        attribution: 'Editorial Board',
      },
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
