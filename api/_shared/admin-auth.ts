import { createSupabaseAdminClient, getAuthenticatedUser } from './supabase.js';
import { type VercelRequest } from './http.js';

export type AdminContext = {
  user: any;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
};

export type AdminContextResult =
  | {
      ok: true;
      context: AdminContext;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export const ensureAdminContext = async (
  request: VercelRequest,
): Promise<AdminContextResult> => {
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (error: any) {
    return {
      ok: false,
      status: 500,
      error: error?.message || 'Supabase admin client unavailable',
    };
  }

  const user = await getAuthenticatedUser(request);
  if (!user?.id) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
    };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    return {
      ok: false,
      status: 403,
      error: 'Admin role required',
    };
  }

  return {
    ok: true,
    context: {
      user,
      supabase,
    },
  };
};

export const getQueryString = (request: VercelRequest, key: string): string => {
  const value = request.query?.[key];
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }
  return String(value || '').trim();
};

export const getQueryNumber = (
  request: VercelRequest,
  key: string,
  fallback: number,
  min?: number,
  max?: number,
): number => {
  const raw = getQueryString(request, key);
  const parsed = Number(raw);
  let value = Number.isFinite(parsed) ? parsed : fallback;

  if (typeof min === 'number') value = Math.max(min, value);
  if (typeof max === 'number') value = Math.min(max, value);

  return value;
};

export const getPathParam = (request: VercelRequest, key: string): string => {
  const direct = getQueryString(request, key);
  if (direct) return direct;

  const path = String(request.url || '');
  const match = path.match(new RegExp(`/${key}/([^/?#]+)`));
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  return '';
};

export const readCurrentRole = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<string> => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return String(data?.role || 'user');
};

export const persistUserRole = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  targetUserId: string,
  nextRole: string,
  adminUserId: string,
): Promise<{ success: boolean; error?: string }> => {
  const now = new Date().toISOString();
  const payload = {
    user_id: targetUserId,
    role: nextRole,
    assigned_by: adminUserId,
    assigned_at: now,
    updated_at: now,
  };

  const { error } = await supabase
    .from('user_roles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
};

export const logAdminRoleChange = async (
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    adminUserId: string;
    targetUserId: string;
    previousRole: string;
    nextRole: string;
    reason?: string;
    action: string;
  },
): Promise<void> => {
  const now = new Date().toISOString();

  await supabase.from('role_assignment_logs').insert({
    user_id: input.targetUserId,
    previous_role: input.previousRole,
    new_role: input.nextRole,
    assigned_by: input.adminUserId,
    reason: input.reason || null,
    created_at: now,
  });

  await supabase.from('admin_actions_log').insert({
    admin_id: input.adminUserId,
    action: input.action,
    target_user_id: input.targetUserId,
    details: {
      previousRole: input.previousRole,
      nextRole: input.nextRole,
      reason: input.reason || null,
    },
    created_at: now,
  });
};

