import { resolveEmailBranding, type EmailBranding } from './app-branding.js';

export type EditorialButton = {
  label: string;
  href: string;
};

export type EditorialStat = {
  label: string;
  value: string;
  helper?: string;
};

export type EditorialFeature = {
  title: string;
  body: string;
  icon?: string;
};

export type EditorialEmailInput = {
  preview: string;
  volumeLabel?: string;
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  intro?: string;
  bodyHtml?: string;
  button?: EditorialButton;
  secondaryLink?: EditorialButton;
  stats?: EditorialStat[];
  features?: EditorialFeature[];
  quote?: { text: string; attribution?: string };
  ctaBox?: { title: string; body: string; buttonLabel: string; buttonHref: string };
  footerNote?: string;
  branding?: EmailBranding;
  variant?: 'auth' | 'digest' | 'welcome' | 'newsletter';
};

const FONT =
  "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderPreviewText = (preview: string): string => `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preview)}
  </div>
`;

const renderHeader = (branding: EmailBranding, signInUrl?: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto 24px;">
    <tr>
      <td style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#55575c;">
        ${escapeHtml(branding.appName)}
      </td>
      <td align="center" style="font-family:${FONT};font-size:13px;font-weight:600;color:#8b919a;">
        <span style="color:#45697d;border-bottom:2px solid #45697d;padding-bottom:2px;">Journal</span>
        &nbsp;&nbsp;Guides&nbsp;&nbsp;Expert Help
      </td>
      <td align="right">
        ${
          signInUrl
            ? `<a href="${escapeHtml(signInUrl)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#55575c;font-family:${FONT};font-size:13px;font-weight:800;color:#ffffff;text-decoration:none;">Sign In</a>`
            : `<span style="display:inline-block;padding:10px 18px;border-radius:999px;background:#55575c;font-family:${FONT};font-size:13px;font-weight:800;color:#ffffff;">Sign In</span>`
        }
      </td>
    </tr>
  </table>
`;

const renderHero = ({
  volumeLabel,
  eyebrow,
  title,
  titleAccent,
  intro,
}: Pick<EditorialEmailInput, 'volumeLabel' | 'eyebrow' | 'title' | 'titleAccent' | 'intro'>): string => {
  const titleHtml = titleAccent
    ? `${escapeHtml(title.replace(titleAccent, '').trim())} <span style="font-family:${SERIF};font-style:italic;font-weight:700;color:#45697d;">${escapeHtml(titleAccent)}</span>`
    : escapeHtml(title);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto 24px;background:#eef0f5;border:1px solid #ebeaf0;border-radius:42px;overflow:hidden;">
      <tr>
        <td align="center" style="padding:44px 32px 38px;">
          ${
            volumeLabel
              ? `<div style="display:inline-block;margin-bottom:18px;padding:8px 14px;border-radius:999px;background:#e5f8ff;font-family:${FONT};font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#45697d;">${escapeHtml(volumeLabel)}</div>`
              : ''
          }
          ${
            eyebrow
              ? `<div style="font-family:${FONT};font-size:11px;font-weight:900;letter-spacing:2.4px;text-transform:uppercase;color:#49697a;margin-bottom:10px;">${escapeHtml(eyebrow)}</div>`
              : ''
          }
          <h1 style="max-width:560px;margin:0 auto;font-family:${FONT};font-size:42px;line-height:1.08;font-weight:900;color:#242932;text-align:center;">
            ${titleHtml}
          </h1>
          ${
            intro
              ? `<div style="max-width:500px;margin:20px auto 0;font-family:${FONT};font-size:17px;line-height:1.65;color:#5f646d;text-align:center;">${intro}</div>`
              : ''
          }
        </td>
      </tr>
    </table>
  `;
};

const renderButton = ({ label, href }: EditorialButton, inverted = false): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 8px;">
    <tr>
      <td style="border-radius:999px;background:${inverted ? '#ffffff' : '#55575c'};box-shadow:0 10px 24px rgba(33,37,41,0.18);">
        <a href="${escapeHtml(href)}" style="display:inline-block;min-width:170px;padding:16px 28px;font-family:${FONT};font-size:15px;font-weight:800;line-height:1;color:${inverted ? '#242932' : '#ffffff'};text-align:center;text-decoration:none;border-radius:999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const renderStats = (stats: EditorialStat[]): string => {
  if (!stats.length) return '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 4px;">
      ${stats
        .map(
          (stat) => `
            <tr>
              <td style="padding:18px 22px;border-radius:28px;background:#f0f2f7;border:1px solid #e7e9ef;">
                <div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#49697a;">
                  ${escapeHtml(stat.label)}
                </div>
                <div style="margin-top:8px;font-family:${FONT};font-size:28px;font-weight:900;line-height:1.1;color:#20242a;">
                  ${escapeHtml(stat.value)}
                </div>
                ${
                  stat.helper
                    ? `<div style="margin-top:8px;font-family:${FONT};font-size:13px;line-height:1.55;color:#686d76;">${escapeHtml(stat.helper)}</div>`
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

const renderFeatures = (features: EditorialFeature[]): string => {
  if (!features.length) return '';

  const columnWidth = features.length === 2 ? '50%' : '33%';

  const cells = features
    .map(
      (feature) => `
        <td width="${columnWidth}" valign="top" style="padding:8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f8fb;border:1px solid #eceef3;border-radius:28px;">
            <tr>
              <td style="padding:22px 18px;text-align:center;">
                <div style="width:44px;height:44px;margin:0 auto 14px;border-radius:999px;background:#e5f8ff;color:#45697d;font-family:${FONT};font-size:18px;font-weight:900;line-height:44px;text-align:center;">
                  ${escapeHtml(feature.icon || '✦')}
                </div>
                <div style="font-family:${FONT};font-size:16px;font-weight:900;color:#242932;margin-bottom:8px;">${escapeHtml(feature.title)}</div>
                <div style="font-family:${FONT};font-size:13px;line-height:1.6;color:#686d76;">${escapeHtml(feature.body)}</div>
              </td>
            </tr>
          </table>
        </td>
      `,
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0 8px;">
      <tr>
        <td colspan="3" align="center" style="padding-bottom:16px;font-family:${FONT};font-size:24px;font-weight:900;color:#242932;">
          Guided by Calm
        </td>
      </tr>
      <tr>${cells}</tr>
    </table>
  `;
};

const renderQuote = (quote: { text: string; attribution?: string }): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 8px;background:#f0f2f7;border-radius:28px;">
    <tr>
      <td style="padding:28px 26px;text-align:center;">
        <div style="font-family:${SERIF};font-size:28px;line-height:1;color:#45697d;margin-bottom:12px;">“</div>
        <div style="font-family:${SERIF};font-size:18px;line-height:1.7;font-style:italic;color:#4d5663;">
          ${escapeHtml(quote.text)}
        </div>
        ${
          quote.attribution
            ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid #dde1ea;font-family:${FONT};font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#8b919a;">${escapeHtml(quote.attribution)}</div>`
            : ''
        }
      </td>
    </tr>
  </table>
`;

const renderCtaBox = (ctaBox: NonNullable<EditorialEmailInput['ctaBox']>): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:24px auto 0;background:#55575c;border-radius:34px;overflow:hidden;">
    <tr>
      <td style="padding:34px 28px;text-align:center;">
        <div style="font-family:${FONT};font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;margin-bottom:12px;">
          ${escapeHtml(ctaBox.title)}
        </div>
        <div style="max-width:460px;margin:0 auto 18px;font-family:${FONT};font-size:15px;line-height:1.7;color:#d7dbe3;">
          ${escapeHtml(ctaBox.body)}
        </div>
        ${renderButton({ label: ctaBox.buttonLabel, href: ctaBox.buttonHref }, true)}
      </td>
    </tr>
  </table>
`;

const renderFooter = (branding: EmailBranding): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:28px auto 0;">
    <tr>
      <td align="center" style="font-family:${FONT};font-size:14px;font-weight:800;color:#55575c;padding-bottom:14px;">
        ${escapeHtml(branding.appName)}
      </td>
    </tr>
    <tr>
      <td align="center" style="font-family:${FONT};font-size:12px;line-height:1.9;color:#9aa3b2;">
        <a href="${escapeHtml(branding.privacyUrl)}" style="color:#45697d;text-decoration:none;">Privacy Policy</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${escapeHtml(`${branding.baseUrl}/settings`)}" style="color:#45697d;text-decoration:none;">Unsubscribe</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${escapeHtml(branding.contactUrl)}" style="color:#45697d;text-decoration:none;">Support</a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:10px;font-family:${FONT};font-size:12px;line-height:1.7;color:#9aa3b2;">
        <a href="${escapeHtml(branding.termsUrl)}" style="color:#45697d;text-decoration:none;">Terms of Service</a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:18px;font-family:${FONT};font-size:11px;line-height:1.7;color:#b0b7c3;">
        © ${new Date().getFullYear()} ${escapeHtml(branding.appName)}. Designed for your peace of mind.
      </td>
    </tr>
  </table>
`;

export const renderEditorialEmailTemplate = ({
  preview,
  volumeLabel,
  eyebrow,
  title,
  titleAccent,
  intro,
  bodyHtml,
  button,
  secondaryLink,
  stats = [],
  features = [],
  quote,
  ctaBox,
  footerNote,
  branding: brandingInput,
}: EditorialEmailInput): string => {
  const branding = brandingInput || resolveEmailBranding();
  const signInUrl = `${branding.baseUrl}/auth`;

  return `<!doctype html>
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
          ${renderHeader(branding, signInUrl)}
          ${renderHero({ volumeLabel, eyebrow, title, titleAccent, intro })}
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#ffffff;border:1px solid #ebeaf0;border-radius:34px;overflow:hidden;box-shadow:0 24px 64px rgba(37,43,54,0.06);">
            <tr>
              <td style="padding:34px 34px 36px;font-family:${FONT};font-size:16px;line-height:1.72;color:#555b66;">
                ${bodyHtml || ''}
                ${renderFeatures(features)}
                ${renderStats(stats)}
                ${quote ? renderQuote(quote) : ''}
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
          ${ctaBox ? renderCtaBox(ctaBox) : ''}
          ${renderFooter(branding)}
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const renderEditorialAuthEmail = (input: EditorialEmailInput): string =>
  renderEditorialEmailTemplate(input);
