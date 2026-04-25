import { getApiBaseUrl } from './api-base-url';
import type { Currency } from './payment-manager';

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
