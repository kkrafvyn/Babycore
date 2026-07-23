import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveEmailBranding } from '../src/api/utils/app-branding.js';
import { renderEditorialAuthEmail } from '../src/api/utils/email-editorial-layout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'supabase', 'templates');

const branding = resolveEmailBranding();

const renderAuthEmail = ({
  title,
  eyebrow,
  intro,
  bodyHtml = '',
  buttonLabel,
  buttonHref,
  footerNote = '',
}: {
  title: string;
  eyebrow: string;
  intro: string;
  bodyHtml?: string;
  buttonLabel: string;
  buttonHref: string;
  footerNote?: string;
}): string =>
  renderEditorialAuthEmail({
    preview: `${title} — ${branding.appName}`,
    eyebrow,
    title,
    intro,
    bodyHtml,
    button: { label: buttonLabel, href: buttonHref },
    secondaryLink: { label: buttonLabel, href: buttonHref },
    footerNote,
    branding,
  });

const templates = [
  {
    file: 'confirmation.html',
    subject: `Confirm your ${branding.appName} account`,
    content: renderAuthEmail({
      eyebrow: 'Account security',
      title: 'Confirm your email',
      intro: `Thanks for joining ${branding.appName}. Confirm your email address to finish setting up your account.`,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;text-align:center;">You can also enter this one-time code if your email client blocks links:</p><p style="margin:0 auto 18px;font-size:28px;font-weight:900;letter-spacing:6px;color:#242932;text-align:center;">{{ .Token }}</p>',
      buttonLabel: 'Confirm email',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'If you did not create an account, you can ignore this email.',
    }),
  },
  {
    file: 'recovery.html',
    subject: `Reset your ${branding.appName} password`,
    content: renderAuthEmail({
      eyebrow: 'Account security',
      title: 'Reset your password',
      intro: `Use the secure link below to choose a new password for your ${branding.appName} account.`,
      buttonLabel: 'Reset password',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'This link expires soon. Ignore this email if you did not request a password reset.',
    }),
  },
  {
    file: 'magic_link.html',
    subject: `Your ${branding.appName} sign-in link`,
    content: renderAuthEmail({
      eyebrow: 'Secure sign in',
      title: 'Sign in to your account',
      intro: `Open the secure link below to sign in to ${branding.appName}.`,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;text-align:center;">Prefer a code instead? Use this one-time password:</p><p style="margin:0 auto 18px;font-size:28px;font-weight:900;letter-spacing:6px;color:#242932;text-align:center;">{{ .Token }}</p>',
      buttonLabel: 'Sign in',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'If you did not request this sign-in link, you can ignore this email.',
    }),
  },
  {
    file: 'invite.html',
    subject: `You have been invited to ${branding.appName}`,
    content: renderAuthEmail({
      eyebrow: 'Care invite',
      title: 'Accept your invite',
      intro: `You were invited to join a shared ${branding.appName} care workspace.`,
      buttonLabel: 'Accept invite',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'You can ignore this message if you were not expecting an invite.',
    }),
  },
  {
    file: 'email_change.html',
    subject: `Confirm your new ${branding.appName} email`,
    content: renderAuthEmail({
      eyebrow: 'Account security',
      title: 'Confirm email change',
      intro: 'Confirm this email address change to keep your account secure.',
      buttonLabel: 'Confirm new email',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'If you did not request this change, contact support immediately.',
    }),
  },
];

fs.mkdirSync(outputDir, { recursive: true });

for (const template of templates) {
  fs.writeFileSync(path.join(outputDir, template.file), template.content, 'utf8');
}

fs.writeFileSync(
  path.join(outputDir, 'subjects.json'),
  JSON.stringify(
    Object.fromEntries(templates.map((template) => [template.file.replace('.html', ''), template.subject])),
    null,
    2,
  ),
  'utf8',
);

console.log(`Generated ${templates.length} Supabase auth templates for "${branding.appName}" in ${outputDir}`);
