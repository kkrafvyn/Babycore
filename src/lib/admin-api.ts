import { getApiBaseUrl } from './api-base-url';
import { getResponseErrorMessage, readJsonResponse } from './http-json';
import type { BillingEventRecord } from './payment-api';
import type { PaymentCollectionConfig } from './payment-config';
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
  role: 'admin' | 'manager' | 'user' | 'doctor' | 'caregiver' | 'viewer' | string;
  source?: string;
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

export interface AdminPricingPlan {
  id: 'premium-monthly' | 'premium-yearly';
  name: string;
  description: string;
  billingPeriod: 'monthly' | 'yearly';
  provider: 'paystack';
  ghanaAmount: number;
  internationalAmount: number;
  ghanaCurrency: 'GHS';
  internationalCurrency: 'USD';
  isActive: boolean;
}

export interface AdminPricingResponse {
  success: boolean;
  data?: {
    plans: AdminPricingPlan[];
  };
  error?: string;
}

export interface AdminPaymentConfigResponse {
  success: boolean;
  data?: {
    paymentCollection: PaymentCollectionConfig;
  };
  message?: string;
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

const MAIN_ADMIN_EMAILS = new Set(['ponk3020@gmail.com']);

const normalizeAdminEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const normalizeRole = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const normalizeProfileType = (value: unknown): 'baby' | 'doctor' | 'caregiver' | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'baby' || normalized === 'doctor' || normalized === 'caregiver') {
    return normalized;
  }
  return null;
};

const getFallbackUserRole = (user: any): string => {
  const appRole = normalizeRole(user?.app_metadata?.role);
  if (MAIN_ADMIN_EMAILS.has(normalizeAdminEmail(user?.email))) return 'admin';
  if (appRole) return appRole;

  const profileType = normalizeProfileType(user?.user_metadata?.onboarding_profile_type);
  if (profileType === 'doctor' || profileType === 'caregiver') {
    return profileType;
  }

  return 'user';
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

    const data = await readJsonResponse<T & { success: boolean; error?: string }>(response);
    if (!response.ok) {
      return {
        ...(data || {}),
        success: false,
        error: getResponseErrorMessage(data, `Admin request failed (${response.status})`),
      } as T & { success: boolean; error?: string };
    }

    if (!data) {
      return {
        success: false,
        error: 'Admin request returned an unexpected response.',
      } as T & { success: boolean; error?: string };
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
  let fallbackRole = 'user';

  try {
    const auth = supabase.auth as any;
    const {
      data: { user },
    } = await auth.getUser();

    if (!user?.id) return 'user';

    fallbackRole = getFallbackUserRole(user);
    const accessToken = await getAdminAuthToken();
    if (!accessToken) {
      return fallbackRole;
    }

    const response = await fetch(`${getApiBaseUrl()}/admin/current-role`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return fallbackRole;
    }

    const payload = await readJsonResponse<{ success?: boolean; role?: string }>(response);
    return payload?.success && payload.role ? payload.role : fallbackRole;
  } catch (error) {
    console.warn('Using fallback user role after role lookup failed:', error);
    return fallbackRole;
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

export const createAdminUser = async (input: {
  email: string;
  name: string;
  role: 'admin' | 'manager';
  profileType: 'baby' | 'doctor' | 'caregiver';
  password?: string;
}): Promise<
  AdminMutationResponse & {
    data?: {
      success: boolean;
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        profileType: string;
      };
      temporaryPassword?: string;
    };
  }
> =>
  adminRequest<any>('/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

export const updateAdminUserRole = async (
  userId: string,
  role: 'admin' | 'manager' | 'user' | 'doctor' | 'caregiver' | 'viewer',
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

export const fetchAdminPricing = async (): Promise<AdminPricingResponse> =>
  adminRequest<AdminPricingResponse>('/admin/pricing', {
    method: 'GET',
  });

export const saveAdminPricing = async (
  plans: Array<{
    id: 'premium-monthly' | 'premium-yearly';
    ghanaAmount: number;
    internationalAmount: number;
    isActive?: boolean;
  }>,
): Promise<AdminPricingResponse & { message?: string }> =>
  adminRequest<any>('/admin/pricing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plans }),
  });

export const fetchAdminPaymentConfig = async (): Promise<AdminPaymentConfigResponse> =>
  adminRequest<AdminPaymentConfigResponse>('/admin/payment-config', {
    method: 'GET',
  });

export const saveAdminPaymentConfig = async (input: {
  enabled: boolean;
  reason?: string;
}): Promise<AdminPaymentConfigResponse> =>
  adminRequest<AdminPaymentConfigResponse>('/admin/payment-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

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
