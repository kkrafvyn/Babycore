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

/**
 * Get available add-ons
 */
export async function getAvailableAddons(): Promise<SubscriptionAddon[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('is_active', true)
      .order('addon_name', { ascending: true });

    if (error) throw error;
    return data || [];
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
    const { data, error } = await supabase
      .from('user_addon_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('subscribed_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
  paymentMethodId?: string
): Promise<UserAddonSubscription | null> {
  try {
    // Get addon details
    const { data: addon } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('id', addonId)
      .single();

    if (!addon) throw new Error('Addon not found');

    // Calculate expiration date (30 days for most add-ons)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Process payment (if applicable - depends on payment provider)
    if (addon.price > 0 && paymentMethodId) {
      const paymentResponse = await processAddonPayment(
        userId,
        addonId,
        addon.price,
        addon.currency,
        paymentMethodId
      );

      if (!paymentResponse.success) {
        throw new Error('Payment failed');
      }
    }

    // Create subscription
    const { data, error } = await supabase
      .from('user_addon_subscriptions')
      .insert({
        user_id: userId,
        addon_id: addonId,
        expires_at: addon.price > 0 ? expiresAt.toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error subscribing to addon:', err);
    return null;
  }
}

/**
 * Process payment for add-on (backend would handle actual payment)
 */
async function processAddonPayment(
  userId: string,
  addonId: string,
  amount: number,
  currency: string,
  paymentMethodId: string
): Promise<{ success: boolean; transactionId?: string }> {
  try {
    const response = await fetch('/api/payments/process-addon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        addon_id: addonId,
        amount,
        currency,
        payment_method_id: paymentMethodId,
      }),
    });

    if (!response.ok) throw new Error('Payment processing failed');
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error processing payment:', err);
    return { success: false };
  }
}

/**
 * Cancel add-on subscription
 */
export async function cancelAddonSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_addon_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId);

    if (error) throw error;
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
    const { data, error } = await supabase
      .from('user_addon_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('addon_id', [
        // This would need a join with subscription_addons table
        // For now, simplified query
      ]);

    if (error) throw error;
    return (data?.length ?? 0) > 0;
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
    const { data: addon } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('id', addonId)
      .single();

    if (!addon) return null;

    const { data: subscription } = await supabase
      .from('user_addon_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('addon_id', addonId)
      .eq('is_active', true)
      .single();

    return {
      ...addon,
      isSubscribed: !!subscription,
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase
      .from('user_addon_subscriptions')
      .update({
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .eq('id', subscriptionId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error renewing subscription:', err);
    return false;
  }
}
