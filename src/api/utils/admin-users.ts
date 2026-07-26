import { randomBytes } from 'node:crypto';

import { supabase as defaultSupabase } from './supabase.js';

export type AdminCreatableRole = 'admin' | 'manager';
export type AdminProfileType = 'baby' | 'doctor' | 'caregiver';

export interface CreateAdminManagedUserInput {
  adminUserId: string;
  email: string;
  name: string;
  role: AdminCreatableRole;
  profileType: AdminProfileType;
  password?: string;
}

export interface CreateAdminManagedUserResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: AdminCreatableRole;
    profileType: AdminProfileType;
  };
  temporaryPassword?: string;
}

const VALID_ROLES = new Set<AdminCreatableRole>([
  'admin',
  'manager',
]);

const VALID_PROFILE_TYPES = new Set<AdminProfileType>(['baby', 'doctor', 'caregiver']);

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizeName = (value: string): string => value.trim();
const normalizePassword = (value?: string): string => String(value || '').trim();

const generateTemporaryPassword = (): string => `Cradlyn!${randomBytes(12).toString('base64url')}`;

export const createAdminManagedUser = async (
  input: CreateAdminManagedUserInput,
  supabase = defaultSupabase,
): Promise<CreateAdminManagedUserResult> => {
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const role = String(input.role || 'manager').trim().toLowerCase() as AdminCreatableRole;
  const profileType = String(input.profileType || 'baby').trim().toLowerCase() as AdminProfileType;
  const suppliedPassword = normalizePassword(input.password);

  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  if (!name) {
    return { success: false, error: 'Name is required' };
  }

  if (!VALID_ROLES.has(role)) {
    return { success: false, error: 'Only admin and limited admin accounts can be created here' };
  }

  if (!VALID_PROFILE_TYPES.has(profileType)) {
    return { success: false, error: 'Invalid profile type' };
  }

  const temporaryPassword = suppliedPassword || generateTemporaryPassword();
  if (temporaryPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long' };
  }

  const authAdmin = (supabase.auth as any).admin;
  const { data, error } = await authAdmin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      name,
      onboarding_profile_type: profileType,
    },
  });

  if (error || !data?.user?.id) {
    return {
      success: false,
      error: error?.message || 'Failed to create user',
    };
  }

  const createdUserId = String(data.user.id);
  const now = new Date().toISOString();

  const { error: roleError } = await supabase.from('user_roles').upsert(
    {
      user_id: createdUserId,
      role,
      assigned_by: input.adminUserId,
      assigned_at: now,
      updated_at: now,
      created_at: now,
    },
    { onConflict: 'user_id' },
  );

  if (roleError) {
    await authAdmin.deleteUser(createdUserId).catch(() => undefined);
    return {
      success: false,
      error: roleError.message || 'Failed to assign user role',
    };
  }

  await supabase.from('role_assignment_logs').insert({
    user_id: createdUserId,
    previous_role: null,
    new_role: role,
    assigned_by: input.adminUserId,
    reason: 'admin_user_created',
    created_at: now,
  });

  await supabase.from('admin_actions_log').insert({
    admin_id: input.adminUserId,
    action: 'user_created',
    target_user_id: createdUserId,
    details: {
      role,
      profileType,
      email,
      name,
    },
    created_at: now,
  });

  return {
    success: true,
    user: {
      id: createdUserId,
      email,
      name,
      role,
      profileType,
    },
    temporaryPassword: suppliedPassword ? undefined : temporaryPassword,
  };
};

export type AdminPasswordResetMode = 'temporary' | 'recovery_link';

export interface ResetAdminManagedUserPasswordInput {
  adminUserId: string;
  targetUserId: string;
  mode: AdminPasswordResetMode;
  password?: string;
  redirectTo?: string;
}

export interface ResetAdminManagedUserPasswordResult {
  success: boolean;
  error?: string;
  email?: string;
  mode?: AdminPasswordResetMode;
  temporaryPassword?: string;
  recoveryLink?: string;
}

const resolvePasswordResetRedirect = (override?: string): string => {
  const candidate =
    String(override || process.env.VITE_APP_URL || process.env.CLIENT_URL || 'https://www.cradlyn.com').trim() ||
    'https://www.cradlyn.com';

  try {
    const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
    url.pathname = '/login';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return 'https://www.cradlyn.com/login';
  }
};

export const resetAdminManagedUserPassword = async (
  input: ResetAdminManagedUserPasswordInput,
  supabase = defaultSupabase,
): Promise<ResetAdminManagedUserPasswordResult> => {
  const targetUserId = String(input.targetUserId || '').trim();
  const mode = input.mode === 'recovery_link' ? 'recovery_link' : 'temporary';

  if (!targetUserId) {
    return { success: false, error: 'User id is required' };
  }

  const authAdmin = (supabase.auth as any).admin;
  const { data: targetUserData, error: targetUserError } = await authAdmin.getUserById(targetUserId);

  if (targetUserError || !targetUserData?.user) {
    return {
      success: false,
      error: targetUserError?.message || 'User not found',
    };
  }

  const email = String(targetUserData.user.email || '').trim().toLowerCase();
  if (!email) {
    return { success: false, error: 'User does not have an email address' };
  }

  const now = new Date().toISOString();
  let temporaryPassword: string | undefined;
  let recoveryLink: string | undefined;

  if (mode === 'temporary') {
    const suppliedPassword = normalizePassword(input.password);
    temporaryPassword = suppliedPassword || generateTemporaryPassword();

    if (temporaryPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    const { error: updateError } = await authAdmin.updateUserById(targetUserId, {
      password: temporaryPassword,
    });

    if (updateError) {
      return {
        success: false,
        error: updateError.message || 'Failed to set temporary password',
      };
    }
  } else {
    const { data: linkData, error: linkError } = await authAdmin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: resolvePasswordResetRedirect(input.redirectTo),
      },
    });

    if (linkError) {
      return {
        success: false,
        error: linkError.message || 'Failed to generate password reset link',
      };
    }

    recoveryLink = String(
      linkData?.properties?.action_link || linkData?.action_link || linkData?.link || '',
    ).trim();

    if (!recoveryLink) {
      return {
        success: false,
        error: 'Password reset link was not returned by Supabase',
      };
    }
  }

  await supabase.from('admin_actions_log').insert({
    admin_id: input.adminUserId,
    action: mode === 'temporary' ? 'password_reset_temporary' : 'password_reset_link',
    target_user_id: targetUserId,
    details: {
      email,
      mode,
    },
    created_at: now,
  });

  return {
    success: true,
    email,
    mode,
    temporaryPassword,
    recoveryLink,
  };
};
