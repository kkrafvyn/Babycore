import { getApiBaseUrl } from './api-base-url';
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
  const auth = supabase.auth as any;
  const {
    data: { session },
    error: sessionError,
  } = await auth.getSession();

  if (sessionError || !session?.access_token) {
    return {
      success: false,
      error: 'No valid session token found. Please sign in again.',
    };
  }

  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/admin/overview`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = (await response.json()) as AdminOverviewResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Admin request failed (${response.status})`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to fetch admin overview.',
    };
  }
};
