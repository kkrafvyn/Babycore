export const APP_DOMAIN = 'cradlyn.com';
export const APP_HOST = `www.${APP_DOMAIN}`;
export const APP_PRODUCTION_ORIGIN = `https://${APP_HOST}`;
export const APP_PRODUCTION_API_BASE_URL = `${APP_PRODUCTION_ORIGIN}/api`;
export const APP_SUPPORT_EMAIL = `support@${APP_DOMAIN}`;
export const APP_NOREPLY_EMAIL = `noreply@${APP_DOMAIN}`;
export const APP_SHARE_EMAIL_DOMAIN = `share.${APP_DOMAIN}`;
export const APP_VAPID_MAILTO = `mailto:${APP_SUPPORT_EMAIL}`;
export const LEGACY_SHARE_EMAIL_DOMAIN = 'share.cradlyn.app';

const LEGACY_FROM_DOMAIN_PATTERN = /@(?:babylog\.app|cradlyn\.app)\b/i;

/** Remap old Babylog sender domains to the verified Cradlyn noreply address. */
export const normalizeTransactionalFromAddress = (address: string): string => {
  const trimmed = String(address || '').trim();
  if (!trimmed || !LEGACY_FROM_DOMAIN_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const displayNameMatch = trimmed.match(/^(.+?)\s*<[^>]+>$/);
  const displayName =
    displayNameMatch?.[1]?.trim() ||
    String(process.env.APP_NAME || process.env.VITE_APP_NAME || 'Cradlyn').trim() ||
    'Cradlyn';

  return `${displayName} <${APP_NOREPLY_EMAIL}>`;
};

const SHARE_INVITE_PATTERN = /^invite-[a-f0-9]+@share\.cradlyn\.(?:com|app)$/;

export const isShareInviteEmail = (email: string): boolean =>
  SHARE_INVITE_PATTERN.test(String(email || '').trim().toLowerCase());

export const createShareInviteEmail = (uniqueToken: string): string =>
  `invite-${uniqueToken}@${APP_SHARE_EMAIL_DOMAIN}`.toLowerCase();
