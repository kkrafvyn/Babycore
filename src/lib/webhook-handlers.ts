/**
 * Webhook Handlers for Payment Verification
 * Receives callbacks from Paystack and Flutterwave
 */

import { supabase } from './supabase';

interface WebhookPayload {
  reference?: string;
  tx_ref?: string;
  status: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Handle Paystack Webhook
 * Paystack sends POST to your webhook URL with transaction data
 */
export async function handlePaystackWebhook(payload: WebhookPayload) {
  try {
    const reference = payload.reference;

    if (!reference) {
      console.error('No reference in Paystack webhook');
      return { success: false, error: 'Missing reference' };
    }

    // For Paystack: status should be 'success'
    if (payload.status !== 'success') {
      console.log(`Payment ${reference} status: ${payload.status}`);
      return { success: true };
    }

    // Verify payment amount matches
    const metadata = payload.metadata || {};
    const expectedAmount = metadata.amount;

    if (expectedAmount && payload.amount !== expectedAmount * 100) {
      // Paystack sends amount in kobo (multiply by 100)
      console.error(`Amount mismatch for ${reference}`);
      return { success: false, error: 'Amount mismatch' };
    }

    // Update subscription in database
    const userId = metadata.user_id;
    const planId = metadata.plan_id;

    if (!userId || !planId) {
      console.error('Missing user_id or plan_id in metadata');
      return { success: false, error: 'Missing metadata' };
    }

    // Record payment
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userId,
      reference,
      provider: 'paystack',
      amount: payload.amount / 100, // Convert back to standard amount
      currency: payload.currency,
      status: 'completed',
      metadata: {
        plan_id: planId,
        email: payload.customer.email,
      },
      created_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;

    // Update subscription
    const { error: subError } = await supabase.from('subscriptions').update(
      {
        status: 'active',
        plan_id: planId,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        updated_at: new Date().toISOString(),
      }
    ).eq('user_id', userId);

    if (subError) throw subError;

    console.log(`Payment ${reference} verified and subscription activated`);
    return { success: true, reference };
  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handle Flutterwave Webhook
 * Flutterwave sends POST to your webhook URL with transaction data
 */
export async function handleFlutterwaveWebhook(payload: WebhookPayload) {
  try {
    const txRef = payload.tx_ref;

    if (!txRef) {
      console.error('No tx_ref in Flutterwave webhook');
      return { success: false, error: 'Missing tx_ref' };
    }

    // For Flutterwave: status should be 'success'
    if (payload.status !== 'success') {
      console.log(`Payment ${txRef} status: ${payload.status}`);
      return { success: true };
    }

    const metadata = payload.metadata || {};
    const expectedAmount = metadata.amount;

    if (expectedAmount && payload.amount !== expectedAmount) {
      console.error(`Amount mismatch for ${txRef}`);
      return { success: false, error: 'Amount mismatch' };
    }

    const userId = metadata.user_id;
    const planId = metadata.plan_id;

    if (!userId || !planId) {
      console.error('Missing user_id or plan_id in metadata');
      return { success: false, error: 'Missing metadata' };
    }

    // Record payment
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userId,
      reference: txRef,
      provider: 'flutterwave',
      amount: payload.amount,
      currency: payload.currency,
      status: 'completed',
      metadata: {
        plan_id: planId,
        email: payload.customer.email,
      },
      created_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;

    // Update subscription
    const { error: subError } = await supabase.from('subscriptions').update(
      {
        status: 'active',
        plan_id: planId,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }
    ).eq('user_id', userId);

    if (subError) throw subError;

    console.log(`Payment ${txRef} verified and subscription activated`);
    return { success: true, reference: txRef };
  } catch (error) {
    console.error('Error processing Flutterwave webhook:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Verify webhook signature (security check)
 */
export function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

export function verifyFlutterwaveSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(payload + secret).digest('hex');
  return hash === signature;
}
