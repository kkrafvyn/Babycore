import { getApiBaseUrl } from './api-base-url';
import { supabase } from './supabase';

export interface SubscriptionAddon {
  id: string;
  addon_name: string;
  addon_type: 'content_course' | 'consultant_chat' | 'doctor_qa' | 'premium_reports';
  price: number;
  currency: string;
  description?: string;
  content_url?: string;
  is_active: boolean;
}

export interface UserAddonSubscription {
  id: string;
  user_id: string;
  addon_id: string;
  subscribed_at: string;
  expires_at?: string;
  is_active: boolean;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();
  const accessToken: string | undefined = session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

const callPaymentsApi = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(await getAuthHeaders()),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || `Payments request failed (${response.status})`);
  }

  return payload as T;
};

/**
 * Get available add-ons
 */
export async function getAvailableAddons(): Promise<SubscriptionAddon[]> {
  try {
    const payload = await callPaymentsApi<{ success: boolean; data: SubscriptionAddon[] }>('/payments/addons');
    return payload.data || [];
  } catch (err) {
    console.error('Error fetching add-ons:', err);
    return [];
  }
}

/**
 * Get user's active add-on subscriptions
 */
export async function getUserAddonSubscriptions(userId: string): Promise<UserAddonSubscription[]> {
  try {
    if (!userId) return [];
    const payload = await callPaymentsApi<{ success: boolean; data: UserAddonSubscription[] }>(
      '/payments/addon-subscriptions',
    );
    return payload.data || [];
  } catch (err) {
    console.error('Error fetching user subscriptions:', err);
    return [];
  }
}

/**
 * Subscribe to an add-on
 */
export async function subscribeToAddon(
  userId: string,
  addonId: string,
): Promise<UserAddonSubscription | null> {
  try {
    if (!userId) throw new Error('User is not authenticated');
    const payload = await callPaymentsApi<{
      success: boolean;
      subscription: UserAddonSubscription;
    }>('/payments/process-addon', {
      method: 'POST',
      body: JSON.stringify({ addonId }),
    });

    return payload.subscription || null;
  } catch (err) {
    console.error('Error subscribing to addon:', err);
    throw err;
  }
}

/**
 * Cancel add-on subscription
 */
export async function cancelAddonSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await callPaymentsApi('/payments/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    });
    return true;
  } catch (err) {
    console.error('Error canceling subscription:', err);
    return false;
  }
}

/**
 * Check if user has specific add-on active
 */
export async function hasActiveAddon(userId: string, addonType: string): Promise<boolean> {
  try {
    const [addons, subscriptions] = await Promise.all([
      getAvailableAddons(),
      getUserAddonSubscriptions(userId),
    ]);
    const activeAddonIds = new Set(subscriptions.map((subscription) => subscription.addon_id));
    return addons.some((addon) => addon.addon_type === addonType && activeAddonIds.has(addon.id));
  } catch (err) {
    console.error('Error checking addon status:', err);
    return false;
  }
}

/**
 * Get add-on details with subscription status
 */
export async function getAddonWithStatus(
  userId: string,
  addonId: string
): Promise<SubscriptionAddon & { isSubscribed: boolean } | null> {
  try {
    const [addons, subscriptions] = await Promise.all([
      getAvailableAddons(),
      getUserAddonSubscriptions(userId),
    ]);
    const addon = addons.find((candidate) => candidate.id === addonId);
    if (!addon) return null;

    return {
      ...addon,
      isSubscribed: subscriptions.some((subscription) => subscription.addon_id === addonId),
    };
  } catch (err) {
    console.error('Error getting addon with status:', err);
    return null;
  }
}

/**
 * Renew expiring add-on subscription
 */
export async function renewAddonSubscription(subscriptionId: string): Promise<boolean> {
  try {
    console.warn('Add-on renewals must go through the premium checkout flow.', subscriptionId);
    return false;
  } catch (err) {
    console.error('Error renewing subscription:', err);
    return false;
  }
}
