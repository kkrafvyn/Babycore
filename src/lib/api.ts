/**
 * API Integration Layer
 * Handles all API requests between frontend and backend
 */

import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

const getAuthenticatedUser = async (): Promise<{ id: string } | null> => {
  const auth = supabase.auth as any;
  const {
    data: { user },
  } = await auth.getUser();
  return user || null;
};

const getAuthenticatedAccessToken = async (): Promise<string | null> => {
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

const requestAuthedApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const accessToken = await getAuthenticatedAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `API request failed (${response.status})`);
  }

  return payload as T;
};

/**
 * API Routes for backend services
 */
export const API = {
  /**
   * Payment verification endpoints
   */
  payment: {
    verifyPaystack: async (reference: string) => {
      const { data, error } = await supabase.functions.invoke('verify-paystack', {
        body: { reference },
      });
      if (error) throw error;
      return data;
    },

    verifyFlutterwave: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('verify-flutterwave', {
        body: { transactionId },
      });
      if (error) throw error;
      return data;
    },

    getSubscriptionStatus: async (userId: string) => {
      const { data, error } = await supabase
        .rpc('get_user_subscription_status', { user_id: userId });
      if (error) throw error;
      return data;
    },

    cancelSubscription: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId },
      });
      if (error) throw error;
      return data;
    },
  },

  /**
   * Email service endpoints
   */
  email: {
    sendPaymentConfirmation: async (email: string, amount: number, currency: string, provider: string) => {
      const { data, error } = await supabase.functions.invoke('send-payment-confirmation', {
        body: { email, amount, currency, provider },
      });
      if (error) throw error;
      return data;
    },

    sendWelcomeEmail: async () =>
      requestAuthedApi('/auth/welcome-email', {
        method: 'POST',
      }),

    sendVaccinationReminder: async (email: string, babyName: string, vaccines: any[]) => {
      const { sendVaccinationReminderEmail } = await import('./email-service');
      return sendVaccinationReminderEmail(email, babyName, vaccines);
    },
  },

  /**
   * Subscription endpoints
   */
  subscription: {
    get: async () => {
      const user = await getAuthenticatedUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    create: async (planId: string, provider: 'paystack' | 'flutterwave') => {
      const user = await getAuthenticatedUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_id: planId,
        status: 'pending',
      });

      if (error) throw error;
      return data;
    },

    update: async (subscriptionId: string, updates: any) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId);

      if (error) throw error;
      return data;
    },

    cancel: async () => {
      const user = await getAuthenticatedUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
  },

  /**
   * Cloud sync endpoints
   */
  sync: {
    fullSync: async (data: any) => {
      return requestAuthedApi('/sync/full', {
        method: 'POST',
        body: JSON.stringify({ localData: data }),
      });
    },

    pullCloud: async () => {
      const response = await requestAuthedApi<{ success: boolean; snapshot?: any }>('/sync/snapshot', {
        method: 'GET',
      });
      return response.snapshot || null;
    },
  },

  /**
   * Analytics endpoints
   */
  analytics: {
    logEvent: async (eventType: string, eventData: any = null) => {
      const user = await getAuthenticatedUser();

      if (!user) return;

      const { error } = await supabase.functions.invoke('log-analytics-event', {
        body: { userId: user.id, eventType, eventData },
      });

      if (error) console.error('Analytics error:', error);
    },
  },

  /**
   * Family sharing endpoints
   */
  family: {
    invite: async (babyId: string, email: string, role: string = 'viewer') => {
      const response = await requestAuthedApi<{ success: boolean; data?: any }>('/family/invite', {
        method: 'POST',
        body: JSON.stringify({ babyId, email, role }),
      });
      return response.data;
    },

    getMembers: async (babyId: string) => {
      const response = await requestAuthedApi<{ success: boolean; data?: any[] }>(
        `/family/members?babyId=${encodeURIComponent(babyId)}`,
        {
          method: 'GET',
        },
      );
      return response.data || [];
    },

    removeMember: async (memberId: string) => {
      await requestAuthedApi(`/family/invites/${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
      });
    },

    updateRole: async (memberId: string, role: string) => {
      await requestAuthedApi(`/family/invites/${encodeURIComponent(memberId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
  },
};

/**
 * Hook to use API in React components
 */
export function useAPI() {
  return API;
}

/**
 * Generic API request handler with error handling
 */
export async function apiRequest<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: any) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error('API Error:', error);
    if (errorHandler) {
      errorHandler(error);
    }
    throw error;
  }
}

/**
 * Retry logic for failed API calls
 */
export async function apiRequestWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
