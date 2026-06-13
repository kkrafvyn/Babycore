import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'supabase', 'templates');

const appName = String(process.env.APP_NAME || process.env.VITE_APP_NAME || 'BabyLog').trim() || 'BabyLog';
const productName = String(process.env.APP_PRODUCT_NAME || 'Serenity').trim() || 'Serenity';

const renderAuthEmail = ({
  title,
  eyebrow,
  intro,
  bodyHtml = '',
  buttonLabel,
  buttonHref,
  footerNote = '',
}) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8f7fb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f7fb;">
      <tr>
        <td align="center" style="padding:28px 18px 42px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto 22px;">
            <tr>
              <td style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:900;color:#55575c;">
                <span style="display:inline-block;width:28px;height:28px;margin-right:9px;border-radius:999px;background:#e5f8ff;color:#45697d;text-align:center;line-height:28px;font-size:16px;vertical-align:middle;">&#9786;</span>
                ${appName}
              </td>
              <td align="right">
                <span style="display:inline-block;padding:10px 18px;border-radius:999px;background:#5f6062;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:800;color:#ffffff;">
                  ${productName}
                </span>
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto 26px;background:#eef0f5;border:1px solid #ebeaf0;border-radius:42px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:44px 32px 38px;">
                <div style="display:inline-block;width:112px;height:112px;border-radius:34px;background:#ffffff;box-shadow:0 18px 44px rgba(37, 43, 54, 0.08);">
                  <div style="margin:24px auto 0;width:64px;height:64px;border-radius:999px;background:#dff8ff;color:#45697d;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:32px;font-weight:900;line-height:64px;text-align:center;">
                    ${appName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div style="margin-top:30px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;color:#49697a;">
                  ${eyebrow}
                </div>
                <h1 style="max-width:560px;margin:12px auto 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:42px;line-height:1.08;font-weight:900;color:#242932;text-align:center;">
                  ${title}
                </h1>
                <div style="max-width:500px;margin:20px auto 0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:17px;line-height:1.65;color:#5f646d;text-align:center;">
                  ${intro}
                </div>
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#ffffff;border:1px solid #ebeaf0;border-radius:34px;overflow:hidden;box-shadow:0 24px 64px rgba(37,43,54,0.06);">
            <tr>
              <td style="padding:34px 34px 36px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.72;color:#555b66;text-align:center;">
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:30px auto 8px;">
                  <tr>
                    <td style="border-radius:999px;background:#5f6062;box-shadow:0 10px 24px rgba(33,37,41,0.18);">
                      <a href="${buttonHref}" style="display:inline-block;min-width:170px;padding:16px 28px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:800;line-height:1;color:#ffffff;text-align:center;text-decoration:none;border-radius:999px;">
                        ${buttonLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#7b8089;text-align:center;">
                  If the button does not work, open this link:<br>
                  <a href="${buttonHref}" style="color:#45697d;word-break:break-all;">${buttonHref}</a>
                </p>
                ${
                  footerNote
                    ? `<p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #eceef3;font-size:13px;line-height:1.7;color:#7b8089;text-align:center;">${footerNote}</p>`
                    : ''
                }
              </td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:28px auto 0;">
            <tr>
              <td style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:800;color:#55575c;">
                ${appName}
              </td>
              <td align="right" style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.7;color:#9aa3b2;">
                Account security email
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:16px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.7;color:#9aa3b2;">
                ${appName} helps families keep care history, health records, and shared routines in one calm place.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const templates = [
  {
    file: 'confirmation.html',
    subject: `Confirm your ${appName} account`,
    content: renderAuthEmail({
      eyebrow: 'Account security',
      title: 'Confirm your email',
      intro: `Thanks for joining ${appName}. Confirm your email address to finish setting up your account.`,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;">You can also enter this one-time code if your email client blocks links:</p><p style="margin:0 auto 18px;font-size:28px;font-weight:900;letter-spacing:6px;color:#242932;">{{ .Token }}</p>',
      buttonLabel: 'Confirm email',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'If you did not create an account, you can ignore this email.',
    }),
  },
  {
    file: 'recovery.html',
    subject: `Reset your ${appName} password`,
    content: renderAuthEmail({
      eyebrow: 'Account security',
      title: 'Reset your password',
      intro: `Use the secure link below to choose a new password for your ${appName} account.`,
      buttonLabel: 'Reset password',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'This link expires soon. Ignore this email if you did not request a password reset.',
    }),
  },
  {
    file: 'magic_link.html',
    subject: `Your ${appName} sign-in link`,
    content: renderAuthEmail({
      eyebrow: 'Secure sign in',
      title: 'Sign in to your account',
      intro: `Open the secure link below to sign in to ${appName}.`,
      bodyHtml:
        '<p style="max-width:500px;margin:0 auto 18px;">Prefer a code instead? Use this one-time password:</p><p style="margin:0 auto 18px;font-size:28px;font-weight:900;letter-spacing:6px;color:#242932;">{{ .Token }}</p>',
      buttonLabel: 'Sign in',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'If you did not request this sign-in link, you can ignore this email.',
    }),
  },
  {
    file: 'invite.html',
    subject: `You have been invited to ${appName}`,
    content: renderAuthEmail({
      eyebrow: 'Care invite',
      title: 'Accept your invite',
      intro: `You were invited to join a shared ${appName} care workspace.`,
      buttonLabel: 'Accept invite',
      buttonHref: '{{ .ConfirmationURL }}',
      footerNote: 'You can ignore this message if you were not expecting an invite.',
    }),
  },
  {
    file: 'email_change.html',
    subject: `Confirm your new ${appName} email`,
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

console.log(`Generated ${templates.length} Supabase auth templates for "${appName}" in ${outputDir}`);
