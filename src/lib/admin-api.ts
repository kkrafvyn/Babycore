import { getApiBaseUrl } from './api-base-url';
import type { BillingEventRecord } from './payment-api';
import { supabase } from './supabase';

export interface AdminOverviewResponse {
  success: boolean;
  data?: {
    counts: Record<string, number>;
    roleDistribution: Array<{ role: string; count: number }>;
    recent: Record<string, any[]>;
    generatedAt: string;
  };
  message?: string;
  error?: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'caregiver' | 'viewer' | string;
  assignedAt?: string | null;
  assignedBy?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
  profileType?: string;
  babiesCount?: number;
}

export interface AdminUsersResponse {
  success: boolean;
  data?: {
    users: AdminUserRecord[];
    total: number;
    limit: number;
    offset: number;
    page?: number;
    hasMore?: boolean;
  };
  error?: string;
}

export interface AdminLogsResponse {
  success: boolean;
  data?: {
    logs: Array<Record<string, any>>;
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface AdminMutationResponse {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  error?: string;
}

export interface AdminBillingResponse {
  success: boolean;
  data?: {
    events: BillingEventRecord[];
    total: number;
    limit: number;
    offset: number;
    summary: {
      total: number;
      failed: number;
      retrying: number;
      recovered: number;
      abandoned: number;
    };
  };
  error?: string;
}

const getAdminAuthToken = async (): Promise<string | null> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
    error: sessionError,
  } = await auth.getSession();

  if (sessionError || !session?.access_token) {
    return null;
  }

  return session.access_token;
};

const adminRequest = async <T>(path: string, init?: RequestInit): Promise<T & { success: boolean; error?: string }> => {
  const accessToken = await getAdminAuthToken();
  if (!accessToken) {
    return { success: false, error: 'No valid session token found. Please sign in again.' } as T & {
      success: boolean;
      error?: string;
    };
  }

  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}${path}`;

  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers || {}),
      },
    });

    const data = (await response.json()) as T & { success: boolean; error?: string };
    if (!response.ok) {
      return {
        ...data,
        success: false,
        error: data.error || `Admin request failed (${response.status})`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Admin request failed.',
    } as T & { success: boolean; error?: string };
  }
};

export const getCurrentUserRole = async (): Promise<string> => {
  try {
    const auth = supabase.auth as any;
    const {
      data: { user },
    } = await auth.getUser();

    if (!user?.id) return 'user';

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !data?.role) {
      return user.user_metadata?.role || 'user';
    }

    return data.role;
  } catch (error) {
    console.error('Failed to get user role:', error);
    return 'user';
  }
};

export const fetchAdminOverview = async (): Promise<AdminOverviewResponse> => {
  return adminRequest<AdminOverviewResponse>('/admin/overview', { method: 'GET' });
};

export const fetchAdminUsers = async (input?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<AdminUsersResponse> => {
  const query = new URLSearchParams();
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit));
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset));
  if (input?.search?.trim()) query.set('search', input.search.trim());

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return adminRequest<AdminUsersResponse>(`/admin/users${suffix}`, {
    method: 'GET',
  });
};

export const updateAdminUserRole = async (
  userId: string,
  role: 'admin' | 'manager' | 'user' | 'caregiver' | 'viewer',
  reason?: string,
): Promise<AdminMutationResponse> =>
  adminRequest<AdminMutationResponse>(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role,
      ...(reason ? { reason } : {}),
    }),
  });

export const promoteAdminUser = async (
  userId: string,
  newRole: 'manager' | 'admin',
  reason?: string,
): Promise<AdminMutationResponse> =>
  adminRequest<AdminMutationResponse>(`/admin/users/${encodeURIComponent(userId)}/promote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newRole,
      ...(reason ? { reason } : {}),
    }),
  });

export const demoteAdminUser = async (
  userId: string,
  reason?: string,
): Promise<AdminMutationResponse> =>
  adminRequest<AdminMutationResponse>(`/admin/users/${encodeURIComponent(userId)}/demote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(reason ? { reason } : {}),
    }),
  });

export const deleteAdminUser = async (userId: string): Promise<AdminMutationResponse> =>
  adminRequest<AdminMutationResponse>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });

export const fetchAdminLogs = async (input?: {
  limit?: number;
  offset?: number;
}): Promise<AdminLogsResponse> => {
  const query = new URLSearchParams();
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit));
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return adminRequest<AdminLogsResponse>(`/admin/logs${suffix}`, {
    method: 'GET',
  });
};

export const fetchAdminAuditLogs = async (input?: {
  limit?: number;
  offset?: number;
}): Promise<AdminLogsResponse> => {
  const query = new URLSearchParams();
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit));
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return adminRequest<AdminLogsResponse>(`/admin/audit-logs${suffix}`, {
    method: 'GET',
  });
};

export const fetchAdminBilling = async (input?: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  recoveryStatus?: string;
}): Promise<AdminBillingResponse> => {
  const query = new URLSearchParams();
  if (typeof input?.limit === 'number') query.set('limit', String(input.limit));
  if (typeof input?.offset === 'number') query.set('offset', String(input.offset));
  if (input?.search?.trim()) query.set('search', input.search.trim());
  if (input?.status?.trim()) query.set('status', input.status.trim());
  if (input?.recoveryStatus?.trim()) query.set('recoveryStatus', input.recoveryStatus.trim());

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return adminRequest<AdminBillingResponse>(`/admin/billing${suffix}`, {
    method: 'GET',
  });
};

export const retryAdminBillingEvent = async (
  reference: string,
): Promise<AdminMutationResponse> =>
  adminRequest<AdminMutationResponse>('/admin/billing/retry-now', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reference }),
  });

export const resolveAdminBillingEvent = async (input: {
  reference: string;
  status: 'reconciled' | 'cancelled';
  notes?: string;
}): Promise<AdminMutationResponse> =>
  adminRequest<AdminMutationResponse>('/admin/billing/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

export const exportAdminBillingEvents = async (input?: {
  search?: string;
  status?: string;
  recoveryStatus?: string;
}): Promise<void> => {
  const accessToken = await getAdminAuthToken();
  if (!accessToken) {
    throw new Error('No valid session token found. Please sign in again.');
  }

  const query = new URLSearchParams();
  if (input?.search?.trim()) query.set('search', input.search.trim());
  if (input?.status?.trim()) query.set('status', input.status.trim());
  if (input?.recoveryStatus?.trim()) query.set('recoveryStatus', input.recoveryStatus.trim());

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${getApiBaseUrl()}/admin/billing/export${suffix}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Admin export failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `billing-events-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
