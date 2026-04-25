/**
 * Payments API Routes
 * Endpoints for processing subscriptions and add-on purchases
 */

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import axios from 'axios';

/**
 * POST /api/payments/process-addon
 * Process payment for premium add-on subscription
 */
export async function processAddonPayment(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { addonId, paymentMethod, amount } = req.body;

    if (!userId || !addonId || !paymentMethod || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get addon details
    const { data: addon, error: addonError } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('id', addonId)
      .single();

    if (addonError || !addon) {
      return res.status(404).json({ error: 'Add-on not found' });
    }

    // Process payment based on method
    let paymentResult;

    if (paymentMethod === 'paystack') {
      paymentResult = await processPaystackPayment(userId, addon, amount);
    } else if (paymentMethod === 'flutterwave') {
      paymentResult = await processFlutterwavePayment(userId, addon, amount);
    } else if (paymentMethod === 'stripe') {
      paymentResult = await processStripePayment(userId, addon, amount);
    } else {
      return res.status(400).json({ error: 'Unsupported payment method' });
    }

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Record subscription in database
    const billingCycle = addon.billing_cycle || 'monthly';
    const renewalDate = calculateRenewalDate(billingCycle);

    const { data: subscription, error: subError } = await supabase
      .from('user_addon_subscriptions')
      .insert({
        user_id: userId,
        addon_id: addonId,
        status: 'active',
        purchased_at: new Date().toISOString(),
        renewal_date: renewalDate,
        payment_method: paymentMethod,
        transaction_id: paymentResult.transactionId,
        amount_paid: amount,
      })
      .select()
      .single();

    if (subError) throw subError;

    // Send confirmation email
    await sendPaymentConfirmationEmail(userId, addon, subscription);

    return res.json({
      success: true,
      subscription,
      message: `Successfully subscribed to ${addon.name}`,
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/payments/cancel-subscription
 * Cancel addon subscription
 */
export async function cancelAddonSubscription(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { subscriptionId } = req.body;

    if (!userId || !subscriptionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update subscription status
    const { data: subscription, error } = await supabase
      .from('user_addon_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      subscription,
      message: 'Subscription cancelled',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/payments/webhook/paystack
 * Handle Paystack payment webhook
 */
export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    const event = req.body;

    if (!verifyPaystackSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (event.event === 'charge.success') {
      const { reference, customer, amount } = event.data;

      // Update subscription
      await supabase
        .from('user_addon_subscriptions')
        .update({
          status: 'active',
          last_payment_date: new Date().toISOString(),
          renewal_date: calculateRenewalDate('monthly'),
        })
        .eq('payment_method', 'paystack')
        .eq('transaction_id', reference);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/payments/webhook/flutterwave
 * Handle Flutterwave payment webhook
 */
export async function handleFlutterwaveWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['verifi-hash'] as string;
    
    if (!verifyFlutterwaveSignature(req, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.completed') {
      const { id, customer, amount } = event.data;

      // Update subscription
      await supabase
        .from('user_addon_subscriptions')
        .update({
          status: 'active',
          last_payment_date: new Date().toISOString(),
          renewal_date: calculateRenewalDate('monthly'),
        })
        .eq('payment_method', 'flutterwave')
        .eq('transaction_id', id);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Helper functions

async function processPaystackPayment(
  userId: string,
  addon: any,
  amount: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    // Create payment reference
    const reference = `${Date.now()}-${userId}`;

    // Initialize transaction
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: (await supabase.auth.getUser()).data.user?.email,
        amount: amount * 100, // Paystack uses kobo
        reference,
        metadata: {
          userId,
          addonId: addon.id,
          addonName: addon.name,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return {
      success: true,
      transactionId: reference,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || 'Payment failed',
    };
  }
}

async function processFlutterwavePayment(
  userId: string,
  addon: any,
  amount: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const reference = `${Date.now()}-${userId}`;

    const response = await axios.post(
      'https://api.flutterwave.com/v3/charges?type=card',
      {
        amount,
        currency: 'NGN',
        customer: {
          email: (await supabase.auth.getUser()).data.user?.email,
        },
        reference,
        tx_ref: reference,
        customizations: {
          title: addon.name,
          description: addon.description,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    return {
      success: true,
      transactionId: reference,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || 'Payment failed',
    };
  }
}

async function processStripePayment(
  userId: string,
  addon: any,
  amount: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Stripe implementation placeholder
  try {
    // Initialize Stripe payment intent
    // Implementation depends on Stripe SDK setup
    return {
      success: true,
      transactionId: `stripe_${Date.now()}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment failed',
    };
  }
}

function calculateRenewalDate(billingCycle: string): string {
  const date = new Date();
  
  if (billingCycle === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  
  return date.toISOString();
}

async function sendPaymentConfirmationEmail(
  userId: string,
  addon: any,
  subscription: any
): Promise<void> {
  // Send confirmation email via SendGrid, Resend, etc.
  // Implementation depends on email service setup
}

function verifyPaystackSignature(req: Request): boolean {
  const signature = req.headers['x-paystack-signature'] as string;
  const hash = require('crypto')
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return hash === signature;
}

function verifyFlutterwaveSignature(req: Request, signature: string): boolean {
  const hash = require('crypto')
    .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return hash === signature;
}
