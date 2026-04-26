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
