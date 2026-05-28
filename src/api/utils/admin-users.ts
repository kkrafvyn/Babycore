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

const generateTemporaryPassword = (): string => `Babycore!${randomBytes(12).toString('base64url')}`;

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
