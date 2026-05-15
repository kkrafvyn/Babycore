export type AdminAccountMode = 'admin' | 'child_profile';

export const PRIMARY_ADMIN_EMAIL = 'ponk3020@gmail.com';

export const normalizeAdminEmail = (email?: string | null) => (email || '').trim().toLowerCase();

export const isPrimaryAdminEmail = (email?: string | null) =>
  normalizeAdminEmail(email) === PRIMARY_ADMIN_EMAIL;

export const getAdminAccountMode = (metadata?: Record<string, unknown> | null): AdminAccountMode =>
  metadata?.admin_account_mode === 'child_profile' ? 'child_profile' : 'admin';
