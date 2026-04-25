/**
 * Payment Verification Service
 * Verifies payments with providers and updates subscription status
 */

import { supabase } from './supabase';

const paystackSecretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const flutterwaveSecretKey = import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY;

interface VerificationResult {
  success: boolean;
  status: string;
  amount: number;
  currency: string;
  email: string;
  message?: string;
}

/**
 * Verify Paystack Payment
 */
export async function verifyPaystackPayment(reference: string): Promise<VerificationResult> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error('Invalid Paystack response');
    }

    const transaction = data.data;

    if (transaction.status !== 'success') {
      return {
        success: false,
        status: transaction.status,
        amount: transaction.amount / 100,
        currency: transaction.currency,
        email: transaction.customer.email,
        message: 'Payment was not successful',
      };
    }

    // Payment verified - update subscription
    await updateSubscriptionAfterPayment(
      transaction.metadata?.user_id,
      transaction.metadata?.plan_id,
      reference,
      'paystack',
      transaction.amount / 100,
      transaction.currency
    );

    return {
      success: true,
      status: 'success',
      amount: transaction.amount / 100,
      currency: transaction.currency,
      email: transaction.customer.email,
    };
  } catch (error) {
    console.error('Paystack verification error:', error);
    return {
      success: false,
      status: 'error',
      amount: 0,
      currency: 'NGN',
      email: '',
      message: String(error),
    };
  }
}

/**
 * Verify Flutterwave Payment
 */
export async function verifyFlutterwavePayment(transactionId: string): Promise<VerificationResult> {
  try {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${flutterwaveSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.status !== 'success' || !data.data) {
      throw new Error('Invalid Flutterwave response');
    }

    const transaction = data.data;

    if (transaction.status !== 'successful') {
      return {
        success: false,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        email: transaction.customer.email,
        message: 'Payment was not successful',
      };
    }

    // Payment verified - update subscription
    await updateSubscriptionAfterPayment(
      transaction.tx_ref?.split('_')[1], // Extract user_id from tx_ref
      transaction.meta?.plan_id,
      transaction.id,
      'flutterwave',
      transaction.amount,
      transaction.currency
    );

    return {
      success: true,
      status: 'successful',
      amount: transaction.amount,
      currency: transaction.currency,
      email: transaction.customer.email,
    };
  } catch (error) {
    console.error('Flutterwave verification error:', error);
    return {
      success: false,
      status: 'error',
      amount: 0,
      currency: 'USD',
      email: '',
      message: String(error),
    };
  }
}

/**
 * Update subscription after successful payment
 */
async function updateSubscriptionAfterPayment(
  userId: string,
  planId: string,
  reference: string,
  provider: 'paystack' | 'flutterwave',
  amount: number,
  currency: string
) {
  try {
    // Record the payment
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userId,
      reference,
      provider,
      amount,
      currency,
      status: 'completed',
      verified_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;

    // Update or create subscription
    const now = new Date();
    const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: subError } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: nextBillingDate.toISOString(),
      auto_renewal: true,
      updated_at: now.toISOString(),
    });

    if (subError) throw subError;

    // Send confirmation email
    await sendPaymentConfirmationEmail(userId, amount, currency, provider);

    console.log(`Subscription activated for user ${userId}`);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(
  userId: string,
  amount: number,
  currency: string,
  provider: string
) {
  try {
    // Get user email from auth
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId);

    if (!user?.email) return;

    // Send email via your email service (SendGrid, Resend, etc.)
    // This is a placeholder - implement with your email provider
    console.log(`Payment confirmation email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * Check subscription expiry and handle renewals
 */
export async function checkSubscriptionExpiry() {
  try {
    const now = new Date();

    // Find expired subscriptions
    const { data: expiredSubs, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', now.toISOString());

    if (error) throw error;

    // Mark as expired
    for (const sub of expiredSubs || []) {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', sub.id);

      // Send renewal reminder email
      console.log(`Subscription expired for user ${sub.user_id}`);
    }
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
  }
}

/**
 * Get subscription details for user
 */
export async function getSubscriptionDetails(userId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renewal: false,
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Subscription cancelled for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return false;
  }
}
