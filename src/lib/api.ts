/**
 * API Integration Layer
 * Handles all API requests between frontend and backend
 */

import { supabase } from './supabase';

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

    sendWelcomeEmail: async (email: string, userName: string) => {
      const { data, error } = await supabase.functions.invoke('send-welcome-email', {
        body: { email, userName },
      });
      if (error) throw error;
      return data;
    },

    sendVaccinationReminder: async (email: string, babyName: string, vaccines: any[]) => {
      const { data, error } = await supabase.functions.invoke('send-vaccination-reminder', {
        body: { email, babyName, vaccines },
      });
      if (error) throw error;
      return data;
    },
  },

  /**
   * Subscription endpoints
   */
  subscription: {
    get: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      const { data: result, error } = await supabase.functions.invoke('full-sync', {
        body: data,
      });
      if (error) throw error;
      return result;
    },

    pullCloud: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const [babies, sleepLogs, feedLogs, diaperLogs, growthMeasurements, vaccinationRecords] =
        await Promise.all([
          supabase.from('babies').select('*').eq('user_id', user.id),
          supabase.from('sleep_logs').select('*'),
          supabase.from('feed_logs').select('*'),
          supabase.from('diaper_logs').select('*'),
          supabase.from('growth_measurements').select('*'),
          supabase.from('vaccination_records').select('*'),
        ]);

      return {
        babies: babies.data || [],
        sleepLogs: sleepLogs.data || [],
        feedLogs: feedLogs.data || [],
        diaperLogs: diaperLogs.data || [],
        growthMeasurements: growthMeasurements.data || [],
        vaccinationRecords: vaccinationRecords.data || [],
      };
    },
  },

  /**
   * Analytics endpoints
   */
  analytics: {
    logEvent: async (eventType: string, eventData: any = null) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      const { data, error } = await supabase.functions.invoke('invite-family-member', {
        body: { babyId, email, role },
      });
      if (error) throw error;
      return data;
    },

    getMembers: async (babyId: string) => {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('baby_id', babyId);

      if (error) throw error;
      return data;
    },

    removeMember: async (memberId: string) => {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId);

      if (error) throw error;
    },

    updateRole: async (memberId: string, role: string) => {
      const { error } = await supabase
        .from('family_members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;
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
