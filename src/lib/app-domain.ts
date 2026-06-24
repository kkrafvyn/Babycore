export const APP_DOMAIN = 'budandbloom.com';
export const APP_PRODUCTION_ORIGIN = `https://${APP_DOMAIN}`;
export const APP_SUPPORT_EMAIL = `support@${APP_DOMAIN}`;
export const APP_NOREPLY_EMAIL = `noreply@${APP_DOMAIN}`;
export const APP_SHARE_EMAIL_DOMAIN = `share.${APP_DOMAIN}`;
export const APP_VAPID_MAILTO = `mailto:${APP_SUPPORT_EMAIL}`;
export const LEGACY_SHARE_EMAIL_DOMAIN = 'share.budandbloom.app';

const SHARE_INVITE_PATTERN = /^invite-[a-f0-9]+@share\.budandbloom\.(?:com|app)$/;

export const isShareInviteEmail = (email: string): boolean =>
  SHARE_INVITE_PATTERN.test(String(email || '').trim().toLowerCase());

export const createShareInviteEmail = (uniqueToken: string): string =>
  `invite-${uniqueToken}@${APP_SHARE_EMAIL_DOMAIN}`.toLowerCase();
