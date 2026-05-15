import { supabase as defaultSupabase } from './supabase.js';

export type PaymentCollectionSource = 'database' | 'environment' | 'fallback';

export interface PaymentCollectionSettings {
  enabled: boolean;
  reason: string;
  source: PaymentCollectionSource;
  updatedAt?: string | null;
}

export const DEFAULT_PAYMENT_COLLECTION_REASON =
  'Payments are disabled while Babycore completes full-app testing before marketing.';
export const DEFAULT_PREMIUM_ACCESS_REASON =
  'Premium features are disabled while Babycore completes package testing before marketing.';

const PAYMENT_COLLECTION_ADDON_NAME = 'config:payments:collection';
const PAYMENT_COLLECTION_CONTENT_URL = 'payment-config://collection';
const PREMIUM_ACCESS_ADDON_NAME = 'config:premium:access';
const PREMIUM_ACCESS_CONTENT_URL = 'premium-config://access';

const truthyValues = new Set(['1', 'true', 'yes', 'y', 'on', 'enabled']);
const falseyValues = new Set(['0', 'false', 'no', 'n', 'off', 'disabled']);

const parseBooleanFlag = (value?: string): boolean | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (truthyValues.has(normalized)) return true;
  if (falseyValues.has(normalized)) return false;
  return null;
};

const getEnvironmentDefaultEnabled = (): boolean =>
  parseBooleanFlag(
    process.env.PAYMENT_COLLECTION_ENABLED ||
      process.env.PAYMENTS_ENABLED ||
      process.env.VITE_PAYMENT_COLLECTION_ENABLED,
  ) ?? false;

const getPremiumAccessEnvironmentDefaultEnabled = (): boolean =>
  parseBooleanFlag(
    process.env.PREMIUM_ACCESS_ENABLED ||
      process.env.PREMIUM_FEATURES_ENABLED ||
      process.env.VITE_PREMIUM_ACCESS_ENABLED,
  ) ?? false;

const getFallbackSettings = (source: PaymentCollectionSource = 'fallback'): PaymentCollectionSettings => ({
  enabled: getEnvironmentDefaultEnabled(),
  reason: process.env.PAYMENT_COLLECTION_DISABLED_REASON || DEFAULT_PAYMENT_COLLECTION_REASON,
  source,
  updatedAt: null,
});

const getFallbackPremiumAccessSettings = (
  source: PaymentCollectionSource = 'fallback',
): PaymentCollectionSettings => ({
  enabled: getPremiumAccessEnvironmentDefaultEnabled(),
  reason: process.env.PREMIUM_ACCESS_DISABLED_REASON || DEFAULT_PREMIUM_ACCESS_REASON,
  source,
  updatedAt: null,
});

const normalizeReason = (reason?: string, fallback = DEFAULT_PAYMENT_COLLECTION_REASON): string => {
  const trimmed = reason?.trim();
  return trimmed || fallback;
};

const mapConfigRowToSettings = (
  row: any,
  fallbackReason = DEFAULT_PAYMENT_COLLECTION_REASON,
): PaymentCollectionSettings => ({
  enabled: Boolean(row?.is_active),
  reason: normalizeReason(row?.description, fallbackReason),
  source: 'database',
  updatedAt: row?.created_at ? String(row.created_at) : null,
});

const fetchPaymentCollectionRow = async (supabase = defaultSupabase): Promise<any | null> => {
  const { data, error } = await supabase
    .from('subscription_addons')
    .select('id, is_active, description, created_at')
    .eq('addon_name', PAYMENT_COLLECTION_ADDON_NAME)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

const fetchPremiumAccessRow = async (supabase = defaultSupabase): Promise<any | null> => {
  const { data, error } = await supabase
    .from('subscription_addons')
    .select('id, is_active, description, created_at')
    .eq('addon_name', PREMIUM_ACCESS_ADDON_NAME)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

const insertPaymentCollectionRow = async (
  supabase = defaultSupabase,
  settings: Pick<PaymentCollectionSettings, 'enabled' | 'reason'>,
): Promise<PaymentCollectionSettings> => {
  const { data, error } = await supabase
    .from('subscription_addons')
    .insert({
      addon_name: PAYMENT_COLLECTION_ADDON_NAME,
      addon_type: 'premium_reports',
      price: 0,
      currency: 'USD',
      description: normalizeReason(settings.reason),
      content_url: `${PAYMENT_COLLECTION_CONTENT_URL}/${settings.enabled ? 'enabled' : 'disabled'}`,
      is_active: settings.enabled,
    })
    .select('id, is_active, description, created_at')
    .single();

  if (error) throw error;
  return mapConfigRowToSettings(data);
};

const insertPremiumAccessRow = async (
  supabase = defaultSupabase,
  settings: Pick<PaymentCollectionSettings, 'enabled' | 'reason'>,
): Promise<PaymentCollectionSettings> => {
  const { data, error } = await supabase
    .from('subscription_addons')
    .insert({
      addon_name: PREMIUM_ACCESS_ADDON_NAME,
      addon_type: 'premium_reports',
      price: 0,
      currency: 'USD',
      description: normalizeReason(settings.reason, DEFAULT_PREMIUM_ACCESS_REASON),
      content_url: `${PREMIUM_ACCESS_CONTENT_URL}/${settings.enabled ? 'enabled' : 'disabled'}`,
      is_active: settings.enabled,
    })
    .select('id, is_active, description, created_at')
    .single();

  if (error) throw error;
  return mapConfigRowToSettings(data, DEFAULT_PREMIUM_ACCESS_REASON);
};

export const getPaymentCollectionSettings = async (
  supabase = defaultSupabase,
): Promise<PaymentCollectionSettings> => {
  try {
    const existingRow = await fetchPaymentCollectionRow(supabase);
    if (existingRow) {
      return mapConfigRowToSettings(existingRow);
    }

    const fallback = getFallbackSettings('environment');
    return await insertPaymentCollectionRow(supabase, fallback);
  } catch (error) {
    console.warn('Falling back to default payment collection settings:', error);
    return getFallbackSettings();
  }
};

export const getPremiumAccessSettings = async (
  supabase = defaultSupabase,
): Promise<PaymentCollectionSettings> => {
  try {
    const existingRow = await fetchPremiumAccessRow(supabase);
    if (existingRow) {
      return mapConfigRowToSettings(existingRow, DEFAULT_PREMIUM_ACCESS_REASON);
    }

    const fallback = getFallbackPremiumAccessSettings('environment');
    return await insertPremiumAccessRow(supabase, fallback);
  } catch (error) {
    console.warn('Falling back to default premium access settings:', error);
    return getFallbackPremiumAccessSettings();
  }
};

export const setPaymentCollectionEnabled = async (
  input: {
    enabled: boolean;
    reason?: string;
  },
  supabase = defaultSupabase,
): Promise<PaymentCollectionSettings> => {
  const existingRow = await fetchPaymentCollectionRow(supabase);
  const nextReason = normalizeReason(input.reason);
  const payload = {
    addon_type: 'premium_reports',
    price: 0,
    currency: 'USD',
    description: nextReason,
    content_url: `${PAYMENT_COLLECTION_CONTENT_URL}/${input.enabled ? 'enabled' : 'disabled'}`,
    is_active: input.enabled,
  };

  if (!existingRow?.id) {
    return insertPaymentCollectionRow(supabase, {
      enabled: input.enabled,
      reason: nextReason,
    });
  }

  const { data, error } = await supabase
    .from('subscription_addons')
    .update(payload)
    .eq('id', existingRow.id)
    .select('id, is_active, description, created_at')
    .single();

  if (error) throw error;
  return mapConfigRowToSettings(data);
};

export const setPremiumAccessEnabled = async (
  input: {
    enabled: boolean;
    reason?: string;
  },
  supabase = defaultSupabase,
): Promise<PaymentCollectionSettings> => {
  const existingRow = await fetchPremiumAccessRow(supabase);
  const nextReason = normalizeReason(input.reason, DEFAULT_PREMIUM_ACCESS_REASON);
  const payload = {
    addon_type: 'premium_reports',
    price: 0,
    currency: 'USD',
    description: nextReason,
    content_url: `${PREMIUM_ACCESS_CONTENT_URL}/${input.enabled ? 'enabled' : 'disabled'}`,
    is_active: input.enabled,
  };

  if (!existingRow?.id) {
    return insertPremiumAccessRow(supabase, {
      enabled: input.enabled,
      reason: nextReason,
    });
  }

  const { data, error } = await supabase
    .from('subscription_addons')
    .update(payload)
    .eq('id', existingRow.id)
    .select('id, is_active, description, created_at')
    .single();

  if (error) throw error;
  return mapConfigRowToSettings(data, DEFAULT_PREMIUM_ACCESS_REASON);
};

export const isConfigAddonName = (addonName?: string | null): boolean =>
  String(addonName || '').startsWith('config:');
