import { getApiBaseUrl } from './api-base-url';

export interface PaymentCollectionConfig {
  enabled: boolean;
  reason: string;
  source?: 'database' | 'environment' | 'fallback';
  updatedAt?: string | null;
}

export const DEFAULT_PAYMENT_COLLECTION_REASON =
  'Payments are disabled while Babycore completes full-app testing before marketing.';

export const DEFAULT_PAYMENT_COLLECTION_CONFIG: PaymentCollectionConfig = {
  enabled: false,
  reason: DEFAULT_PAYMENT_COLLECTION_REASON,
  source: 'fallback',
  updatedAt: null,
};

const normalizePaymentCollectionConfig = (value: any): PaymentCollectionConfig => ({
  enabled: Boolean(value?.enabled),
  reason:
    typeof value?.reason === 'string' && value.reason.trim()
      ? value.reason.trim()
      : DEFAULT_PAYMENT_COLLECTION_REASON,
  source: value?.source || 'fallback',
  updatedAt: value?.updatedAt || null,
});

export const fetchPaymentCollectionConfig = async (): Promise<PaymentCollectionConfig> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/payments/config`, {
      method: 'GET',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || `Unable to load payment settings (${response.status})`);
    }

    return normalizePaymentCollectionConfig(payload?.data?.paymentCollection);
  } catch (error) {
    console.warn('Unable to load payment collection settings. Falling back to disabled.', error);
    return DEFAULT_PAYMENT_COLLECTION_CONFIG;
  }
};

export const assertPaymentCollectionEnabled = async (): Promise<PaymentCollectionConfig> => {
  const config = await fetchPaymentCollectionConfig();
  if (!config.enabled) {
    throw new Error(config.reason || DEFAULT_PAYMENT_COLLECTION_REASON);
  }
  return config;
};
