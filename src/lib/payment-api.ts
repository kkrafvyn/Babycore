import { getApiBaseUrl } from './api-base-url';
import type { Currency } from './payment-manager';
import { supabase } from './supabase';

export interface FinalizePremiumPaymentPayload {
  reference: string;
  email: string;
  planId: string;
  planName: string;
  amount: number;
  currency: Currency;
  countryCode?: string;
}

export interface FinalizePremiumPaymentResponse {
  success: boolean;
  verified: boolean;
  message?: string;
  reference?: string;
}

export type PaymentRecoveryStatus =
  | 'not_needed'
  | 'eligible'
  | 'retry_scheduled'
  | 'retrying'
  | 'recovered'
  | 'abandoned';

export interface BillingEventTransition {
  id: string;
  payment_event_id: string;
  user_id: string;
  reference: string;
  provider: string;
  event_type: string;
  previous_status?: 'pending' | 'success' | 'failed' | 'reconciled' | 'cancelled' | null;
  new_status: 'pending' | 'success' | 'failed' | 'reconciled' | 'cancelled';
  amount?: number | null;
  currency?: string | null;
  error_message?: string | null;
  gateway_payload?: Record<string, any>;
  retry_count?: number | null;
  recovery_status?: PaymentRecoveryStatus | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface BillingEventRecord {
  id: string;
  user_id?: string;
  reference: string;
  provider: string;
  provider_event_id?: string | null;
  event_type: string;
  status: 'pending' | 'success' | 'failed' | 'reconciled' | 'cancelled';
  amount?: number | null;
  currency?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  country_code?: string | null;
  customer_email?: string | null;
  subscription_id?: string | null;
  invoice_id?: string | null;
  error_message?: string | null;
  failure_code?: string | null;
  failure_source?: string | null;
  gateway_payload?: Record<string, any>;
  attempted_at?: string;
  verified_at?: string | null;
  webhook_received_at?: string | null;
  recovered_at?: string | null;
  reconciled_by?: string | null;
  reconciliation_notes?: string | null;
  retry_count?: number;
  last_retry_at?: string | null;
  next_retry_at?: string | null;
  recovery_status?: PaymentRecoveryStatus | null;
  last_transition_at?: string | null;
  created_at?: string;
  updated_at?: string;
  payment_event_transitions?: BillingEventTransition[];
}

export const finalizePremiumPayment = async (
  payload: FinalizePremiumPaymentPayload,
): Promise<FinalizePremiumPaymentResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/payments/finalize`;
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  let data: FinalizePremiumPaymentResponse | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.success || !data.verified) {
    const message =
      data?.message || `Payment verification failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
};

export const savePaymentEvent = async (payload: {
  reference: string;
  provider?: string;
  eventType?: string;
  status: 'pending' | 'success' | 'failed' | 'reconciled' | 'cancelled';
  amount?: number;
  currency?: Currency;
  planId?: string;
  planName?: string;
  countryCode?: string;
  customerEmail?: string;
  subscriptionId?: string;
  invoiceId?: string;
  errorMessage?: string;
  failureCode?: string;
  failureSource?: string;
  gatewayPayload?: Record<string, any>;
  providerEventId?: string;
  verifiedAt?: string;
  webhookReceivedAt?: string;
  reconciliationNotes?: string;
  nextRetryAt?: string | null;
  recoveryStatus?: PaymentRecoveryStatus;
}): Promise<void> => {
  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/payments/payment-event`;
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Unable to save payment event (${response.status})`);
  }
};

export const getBillingHistory = async (limit = 50): Promise<BillingEventRecord[]> => {
  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/payments/billing-history?limit=${Math.max(1, Math.min(200, limit))}`;
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || `Unable to load billing history (${response.status})`);
  }

  return Array.isArray(data.data) ? data.data : [];
};

export const recoverFailedPayment = async (reference: string): Promise<{
  success: boolean;
  recovered: boolean;
  message?: string;
}> => {
  const apiBaseUrl = getApiBaseUrl();
  const endpoint = `${apiBaseUrl}/payments/recover-failed`;
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ reference }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || `Unable to recover payment (${response.status})`);
  }

  return {
    success: Boolean(data?.success),
    recovered: Boolean(data?.recovered),
    message: data?.message,
  };
};
