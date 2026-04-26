/**
 * Payments API Routes
 * Endpoints for processing subscriptions and add-on purchases
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

type FinalizePayload = {
  reference: string;
  email: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  countryCode?: string;
};

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
  } catch (error: any) {
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
  } catch (error: any) {
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
      const { reference, amount, currency, metadata } = event.data || {};
      const userIdFromMeta = metadata?.userId || metadata?.user_id;
      const planNameFromMeta = metadata?.planName || metadata?.plan_name || 'Premium Access';
      const planIdFromMeta = metadata?.planId || metadata?.plan_id || 'premium-monthly';

      if (userIdFromMeta) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (/year|annual/i.test(String(planIdFromMeta))) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        const addonId = await ensurePremiumAddon({
          name: String(planNameFromMeta),
          amount: Number(amount || 0) / 100,
          currency: String(currency || 'USD'),
        });

        await upsertPremiumSubscription({
          userId: String(userIdFromMeta),
          addonId,
          subscribedAt: startDate.toISOString(),
          expiresAt: endDate.toISOString(),
        });
      }

    }

    return res.json({ success: true });
  } catch (error: any) {
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
      const { amount, currency, meta } = event.data || {};
      const userIdFromMeta = meta?.userId || meta?.user_id;
      const planNameFromMeta = meta?.planName || meta?.plan_name || 'Premium Access';
      const planIdFromMeta = meta?.planId || meta?.plan_id || 'premium-monthly';

      if (userIdFromMeta) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (/year|annual/i.test(String(planIdFromMeta))) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        const addonId = await ensurePremiumAddon({
          name: String(planNameFromMeta),
          amount: Number(amount || 0),
          currency: String(currency || 'USD'),
        });

        await upsertPremiumSubscription({
          userId: String(userIdFromMeta),
          addonId,
          subscribedAt: startDate.toISOString(),
          expiresAt: endDate.toISOString(),
        });
      }

    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/payments/finalize
 * Verify Paystack payment and activate premium subscription.
 */
export async function finalizePremiumPayment(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const payload = req.body as FinalizePayload;

    if (!userId) {
      return res.status(401).json({ success: false, verified: false, message: 'Not authenticated' });
    }

    if (!payload.reference || !payload.email || !payload.planId || !payload.amount) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Missing payment verification fields',
      });
    }

    const verification = await verifyPaystackTransaction(payload.reference);

    if (!verification.success || verification.data?.status !== 'success') {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Payment not verified by Paystack',
      });
    }

    const paidAmount = Number(verification.data?.amount || 0) / 100;
    const expectedAmount = Number(payload.amount || 0);
    const amountMatches = Math.abs(paidAmount - expectedAmount) <= 0.01;

    if (!amountMatches) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Amount mismatch in payment verification',
      });
    }

    const billingPeriod = /year|annual/i.test(payload.planId) ? 'annual' : 'monthly';
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingPeriod === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const premiumAddonId = await ensurePremiumAddon({
      name: payload.planName || 'Premium Access',
      amount: paidAmount,
      currency: payload.currency || 'USD',
    });

    await upsertPremiumSubscription({
      userId,
      addonId: premiumAddonId,
      subscribedAt: startDate.toISOString(),
      expiresAt: endDate.toISOString(),
    });

    await syncUserSettingsSubscription({
      userId,
      planId: payload.planId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currency: payload.currency || 'USD',
    });

    return res.json({
      success: true,
      verified: true,
      reference: payload.reference,
      subscription: {
        status: 'active',
        period: billingPeriod,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        planId: payload.planId,
        planName: payload.planName,
        price: paidAmount,
        currency: payload.currency || 'USD',
      },
    });
  } catch (error: any) {
    console.error('Finalize premium payment error:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      message: error?.message || 'Failed to finalize premium payment',
    });
  }
}

/**
 * GET /api/payments/subscription-status
 * Returns backend subscription status for the authenticated user.
 */
export async function getSubscriptionStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { data: activeSubscription, error } = await supabase
      .from('user_addon_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!activeSubscription) {
      return res.json({ success: true, subscription: null });
    }

    const now = Date.now();
    const endMs = activeSubscription.expires_at ? new Date(activeSubscription.expires_at).getTime() : 0;
    const isExpired = endMs > 0 && endMs < now;

    if (isExpired) {
      return res.json({ success: true, subscription: null });
    }

    const { data: addon } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('id', activeSubscription.addon_id)
      .maybeSingle();

    const startDate = activeSubscription.subscribed_at || activeSubscription.created_at || new Date().toISOString();
    const endDate = activeSubscription.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const period = inferBillingPeriod(startDate, endDate);

    return res.json({
      success: true,
      subscription: {
        status: 'active',
        period,
        startDate,
        endDate,
        renewalDate: endDate,
        planId: addon?.addon_name || 'premium',
        planName: addon?.addon_name || 'Premium',
        price: Number(addon?.price || 0),
        currency: addon?.currency || 'USD',
        autoRenewal: true,
      },
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load subscription status',
    });
  }
}

// Helper functions

async function processPaystackPayment(
  userId: string,
  addon: any,
  amount: number
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const authAdmin = (supabase.auth as any).admin;
    const { data: authData } = await authAdmin.getUserById(userId);
    const email = authData?.user?.email;
    if (!email) throw new Error('User email not found for payment initialization');
    // Create payment reference
    const reference = `${Date.now()}-${userId}`;

    // Initialize transaction
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
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
    const authAdmin = (supabase.auth as any).admin;
    const { data: authData } = await authAdmin.getUserById(userId);
    const email = authData?.user?.email;
    if (!email) throw new Error('User email not found for payment initialization');
    const reference = `${Date.now()}-${userId}`;

    const response = await axios.post(
      'https://api.flutterwave.com/v3/charges?type=card',
      {
        amount,
        currency: 'NGN',
        customer: {
          email,
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
  return {
    success: false,
    error: 'Stripe gateway is not configured for this project. Use Paystack or Flutterwave.',
  };
}

async function verifyPaystackTransaction(reference: string): Promise<any> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  return response.data;
}

async function ensurePremiumAddon(params: { name: string; amount: number; currency: string }): Promise<string> {
  const normalizedName = params.name || 'Premium Access';

  const existing = await supabase
    .from('subscription_addons')
    .select('id')
    .eq('addon_name', normalizedName)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id;

  const { data, error } = await supabase
    .from('subscription_addons')
    .insert({
      addon_name: normalizedName,
      addon_type: 'premium_reports',
      price: params.amount,
      currency: params.currency,
      description: 'Premium access subscription',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function upsertPremiumSubscription(params: {
  userId: string;
  addonId: string;
  subscribedAt: string;
  expiresAt: string;
}): Promise<void> {
  const { error } = await supabase
    .from('user_addon_subscriptions')
    .upsert(
      {
        user_id: params.userId,
        addon_id: params.addonId,
        subscribed_at: params.subscribedAt,
        expires_at: params.expiresAt,
        is_active: true,
      },
      { onConflict: 'user_id,addon_id' },
    );

  if (error) throw error;
}

async function syncUserSettingsSubscription(params: {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  currency: string;
}): Promise<void> {
  // Best effort only: some deployments may not have user_settings on Supabase.
  try {
    await supabase.from('user_settings').upsert(
      {
        user_id: params.userId,
        subscription_plan: params.planId,
        subscription_status: 'active',
        subscription_start_date: params.startDate,
        subscription_end_date: params.endDate,
        subscription_currency: params.currency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  } catch (error) {
    console.warn('Unable to sync user_settings subscription fields:', error);
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
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !secret) return false;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return hash === signature;
}

function inferBillingPeriod(startDate: string, endDate: string): 'monthly' | 'annual' {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  return diffDays > 300 ? 'annual' : 'monthly';
}

function verifyFlutterwaveSignature(req: Request, signature: string): boolean {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!signature || !secret) return false;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return hash === signature;
}

router.post('/process-addon', processAddonPayment);
router.post('/cancel-subscription', cancelAddonSubscription);
router.post('/finalize', finalizePremiumPayment);
router.get('/subscription-status', getSubscriptionStatus);
router.post('/webhook/paystack', handlePaystackWebhook);
router.post('/webhook/flutterwave', handleFlutterwaveWebhook);

export default router;
