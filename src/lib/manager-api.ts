import { getApiBaseUrl } from './api-base-url';
import { getResponseErrorMessage, readJsonResponse } from './http-json';
import { supabase } from './supabase';

export interface ManagerDashboardResponse {
  success: boolean;
  data?: {
    roleStatistics: Record<string, number>;
    recentActivity: Array<Record<string, any>>;
    managerId: string;
  };
  error?: string;
}

export interface ManagerReportsResponse {
  success: boolean;
  data?: {
    reports: Array<Record<string, any>>;
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface ManagerActivityResponse {
  success: boolean;
  data?: {
    logs: Array<Record<string, any>>;
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface ManagerPermissionsResponse {
  success: boolean;
  data?: Record<string, boolean>;
  error?: string;
}

const getManagerAuthToken = async (): Promise<string | null> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
    error,
  } = await auth.getSession();

  if (error || !session?.access_token) {
    return null;
  }

  return session.access_token;
};

const managerRequest = async <T>(path: string, init?: RequestInit): Promise<T & { success: boolean; error?: string }> => {
  const accessToken = await getManagerAuthToken();
  if (!accessToken) {
    return { success: false, error: 'No valid session token found. Please sign in again.' } as T & {
      success: boolean;
      error?: string;
    };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
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
        error: getResponseErrorMessage(data, `Manager request failed (${response.status})`),
      } as T & { success: boolean; error?: string };
    }

    if (!data) {
      return {
        success: false,
        error: 'Manager request returned an unexpected response.',
      } as T & { success: boolean; error?: string };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Manager request failed.',
    } as T & { success: boolean; error?: string };
  }
};

export const fetchManagerDashboard = async (): Promise<ManagerDashboardResponse> =>
  managerRequest<ManagerDashboardResponse>('/manager/dashboard', { method: 'GET' });

export const fetchManagerReports = async (): Promise<ManagerReportsResponse> =>
  managerRequest<ManagerReportsResponse>('/manager/reports', { method: 'GET' });

export const fetchManagerActivityLogs = async (): Promise<ManagerActivityResponse> =>
  managerRequest<ManagerActivityResponse>('/manager/activity-logs?limit=30&offset=0', { method: 'GET' });

export const fetchManagerPermissions = async (): Promise<ManagerPermissionsResponse> =>
  managerRequest<ManagerPermissionsResponse>('/manager/permissions', { method: 'GET' });
