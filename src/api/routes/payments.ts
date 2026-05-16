/**
 * Payments API Routes
 * Endpoints for processing subscriptions and add-on purchases
 */

import { Router, Request, Response } from 'express';
import { createRequestSupabaseClient, hasServiceConfig, supabase } from '../utils/supabase.js';
import axios from 'axios';
import crypto from 'crypto';
import { sendTransactionalEmail } from '../utils/email.js';
import { MAX_AUTOMATED_PAYMENT_RETRIES, planNextPaymentRetry } from '../../lib/billing-retry.js';
import {
  DEFAULT_PAYMENT_COLLECTION_REASON,
  getPaymentCollectionSettings,
  getPremiumAccessSettings,
  isConfigAddonName,
} from '../utils/payment-collection-control.js';
import { getManagedSubscriptionPricing } from '../utils/payment-pricing.js';

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

export type PaymentEventStatus = 'pending' | 'success' | 'failed' | 'reconciled' | 'cancelled';
export type PaymentRecoveryStatus =
  | 'not_needed'
  | 'eligible'
  | 'retry_scheduled'
  | 'retrying'
  | 'recovered'
  | 'abandoned';

type PaymentEventPayload = {
  userId: string;
  reference: string;
  provider?: string;
  providerEventId?: string | null;
  eventType?: string;
  status: PaymentEventStatus;
  amount?: number | null;
  currency?: string | null;
  planId?: string | null;
  planName?: string | null;
  countryCode?: string | null;
  customerEmail?: string | null;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  errorMessage?: string | null;
  failureCode?: string | null;
  failureSource?: string | null;
  gatewayPayload?: Record<string, any> | null;
  verifiedAt?: string | null;
  webhookReceivedAt?: string | null;
  recoveredAt?: string | null;
  reconciledBy?: string | null;
  reconciliationNotes?: string | null;
  retryCount?: number | null;
  incrementRetry?: boolean;
  lastRetryAt?: string | null;
  nextRetryAt?: string | null;
  recoveryStatus?: PaymentRecoveryStatus;
  transitionMetadata?: Record<string, any> | null;
};

export type PaymentEventRecord = {
  id: string;
  user_id: string;
  reference: string;
  provider?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  country_code?: string | null;
  customer_email?: string | null;
  currency?: string | null;
  amount?: number | null;
  subscription_id?: string | null;
  invoice_id?: string | null;
  retry_count?: number | null;
  next_retry_at?: string | null;
  gateway_payload?: Record<string, any> | null;
  status?: PaymentEventStatus | null;
  recovery_status?: PaymentRecoveryStatus | null;
};

const sendPaymentCollectionDisabled = (
  res: Response,
  settings: Awaited<ReturnType<typeof getPaymentCollectionSettings>>,
  extras: Record<string, unknown> = {},
) =>
  res.status(403).json({
    ...extras,
    success: false,
    code: 'PAYMENTS_DISABLED',
    message: settings.reason || DEFAULT_PAYMENT_COLLECTION_REASON,
    data: {
      paymentCollection: settings,
    },
  });

const getPaystackSecretKey = (): string =>
  process.env.PAYSTACK_SECRET_KEY ||
  process.env.PAYSTACK_SERVICE_KEY ||
  process.env.PAYSTACK_SECRET ||
  process.env.VITE_PAYSTACK_LIVE_SECRET_KEY ||
  process.env.VITE_PAYSTACK_SECRET_KEY ||
  '';

const buildRetryAt = (minutes = 30): string => new Date(Date.now() + minutes * 60 * 1000).toISOString();

const defaultRecoveryStatusForStatus = (status: PaymentEventStatus): PaymentRecoveryStatus => {
  if (status === 'failed') return 'eligible';
  if (status === 'cancelled') return 'abandoned';
  return 'not_needed';
};

const resolveBillingPeriodFromPlan = (planId: string): 'monthly' | 'annual' =>
  /year|annual/i.test(planId) ? 'annual' : 'monthly';

const buildSubscriptionWindow = (
  planId: string,
  now: Date = new Date(),
): {
  billingPeriod: 'monthly' | 'annual';
  startDate: string;
  endDate: string;
} => {
  const billingPeriod = resolveBillingPeriodFromPlan(planId);
  const startDate = new Date(now);
  const endDate = new Date(startDate);

  if (billingPeriod === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return {
    billingPeriod,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

export const activatePremiumSubscriptionForPayment = async (params: {
  userId: string;
  planId: string;
  planName: string;
  currency: string;
  paidAmount: number;
}): Promise<{
  billingPeriod: 'monthly' | 'annual';
  startDate: string;
  endDate: string;
}> => {
  const { billingPeriod, startDate, endDate } = buildSubscriptionWindow(params.planId);
  const premiumAddonId = await ensurePremiumAddon({
    name: params.planName,
    amount: params.paidAmount,
    currency: params.currency,
  });

  await upsertPremiumSubscription({
    userId: params.userId,
    addonId: premiumAddonId,
    subscribedAt: startDate,
    expiresAt: endDate,
  });

  await syncUserSettingsSubscription({
    userId: params.userId,
    planId: params.planId,
    startDate,
    endDate,
    currency: params.currency,
  });

  return {
    billingPeriod,
    startDate,
    endDate,
  };
};

export const safeSendPaymentConfirmationEmail = async (
  userId: string,
  addon: { name: string; currency: string },
  subscription: { amount_paid: number; renewal_date: string },
): Promise<void> => {
  try {
    await sendPaymentConfirmationEmail(userId, addon, subscription);
  } catch (error) {
    console.warn('Failed to send payment confirmation email:', error);
  }
};

/**
 * GET /api/payments/addons
 * List active add-ons that can be shown in the app.
 */
export async function getAvailableAddons(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('is_active', true)
      .order('addon_name', { ascending: true });

    if (error) throw error;

    return res.json({
      success: true,
      data: (data || []).filter((addon: any) => !isConfigAddonName(addon?.addon_name)),
    });
  } catch (error: any) {
    console.error('Get add-ons error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load add-ons',
    });
  }
}

/**
 * GET /api/payments/addon-subscriptions
 * List active add-on subscriptions for the authenticated user.
 */
export async function getUserAddonSubscriptions(req: Request, res: Response) {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_addon_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('subscribed_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Get add-on subscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load add-on subscriptions',
    });
  }
}

/**
 * POST /api/payments/process-addon
 * Process payment for premium add-on subscription
 */
export async function processAddonPayment(req: Request, res: Response) {
  try {
    const userId = getRequestUserId(req);
    const { addonId } = req.body;

    if (!userId || !addonId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Get addon details
    const { data: addon, error: addonError } = await supabase
      .from('subscription_addons')
      .select('*')
      .eq('id', addonId)
      .single();

    if (addonError || !addon) {
      return res.status(404).json({ success: false, message: 'Add-on not found' });
    }

    const addonPrice = Number(addon.price || 0);
    if (addonPrice <= 0) {
      const subscription = await activateAddonSubscription({
        userId,
        addonId,
        addon,
      });
      return res.json({
        success: true,
        subscription,
        message: `Successfully subscribed to ${addon.addon_name || 'add-on'}`,
      });
    }

    const paymentCollection = await getPaymentCollectionSettings();
    if (!paymentCollection.enabled) {
      return sendPaymentCollectionDisabled(res, paymentCollection);
    }

    return res.status(402).json({
      success: false,
      message: 'Paid add-on checkout is not configured yet. Use the main Premium checkout for paid access.',
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/payments/cancel-subscription
 * Cancel addon subscription
 */
export async function cancelAddonSubscription(req: Request, res: Response) {
  try {
    const userId = getRequestUserId(req);
    const { subscriptionId } = req.body;

    if (!userId || !subscriptionId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Update subscription status
    const { data: subscription, error } = await supabase
      .from('user_addon_subscriptions')
      .update({
        is_active: false,
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
    return res.status(500).json({ success: false, message: error.message });
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

    const eventType = String(event?.event || '');
    const { reference, amount, currency, metadata } = event.data || {};
    const userIdFromMeta = metadata?.userId || metadata?.user_id;
    const planNameFromMeta = metadata?.planName || metadata?.plan_name || 'Premium Access';
    const planIdFromMeta = metadata?.planId || metadata?.plan_id || 'premium-monthly';

    if (userIdFromMeta && reference) {
      await recordPaymentEvent({
        userId: String(userIdFromMeta),
        reference: String(reference),
        provider: 'paystack',
        providerEventId: event?.data?.id ? String(event.data.id) : null,
        eventType: eventType || 'webhook',
        status: eventType === 'charge.success' ? 'success' : eventType === 'charge.failed' ? 'failed' : 'pending',
        amount: Number(amount || 0) / 100,
        currency: String(currency || 'USD'),
        planId: String(planIdFromMeta),
        planName: String(planNameFromMeta),
        customerEmail: event?.data?.customer?.email ? String(event.data.customer.email) : null,
        subscriptionId: event?.data?.subscription?.subscription_code
          ? String(event.data.subscription.subscription_code)
          : metadata?.subscriptionId
            ? String(metadata.subscriptionId)
            : null,
        invoiceId: event?.data?.invoice_id ? String(event.data.invoice_id) : null,
        errorMessage: eventType === 'charge.failed' ? String(event?.data?.gateway_response || 'Payment failed') : null,
        failureCode: eventType === 'charge.failed' ? String(event?.data?.status || 'charge_failed') : null,
        failureSource: 'paystack_webhook',
        gatewayPayload: event?.data || {},
        webhookReceivedAt: new Date().toISOString(),
        verifiedAt: eventType === 'charge.success' ? new Date().toISOString() : null,
        recoveryStatus:
          eventType === 'charge.failed' ? 'eligible' : eventType === 'charge.success' ? 'not_needed' : 'not_needed',
        transitionMetadata: {
          webhookEvent: eventType,
        },
      });
    }

    if (eventType === 'charge.success') {
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
    const eventType = String(event?.event || '');
    const { amount, currency, tx_ref, status, meta } = event.data || {};
    const userIdFromMeta = meta?.userId || meta?.user_id;
    const planNameFromMeta = meta?.planName || meta?.plan_name || 'Premium Access';
    const planIdFromMeta = meta?.planId || meta?.plan_id || 'premium-monthly';

    if (userIdFromMeta && tx_ref) {
      await recordPaymentEvent({
        userId: String(userIdFromMeta),
        reference: String(tx_ref),
        provider: 'flutterwave',
        providerEventId: event?.data?.id ? String(event.data.id) : null,
        eventType: eventType || 'webhook',
        status:
          eventType === 'charge.completed' && String(status).toLowerCase() === 'successful' ? 'success' : 'failed',
        amount: Number(amount || 0),
        currency: String(currency || 'USD'),
        planId: String(planIdFromMeta),
        planName: String(planNameFromMeta),
        customerEmail: event?.data?.customer?.email ? String(event.data.customer.email) : null,
        subscriptionId: meta?.subscriptionId ? String(meta.subscriptionId) : null,
        invoiceId: event?.data?.flw_ref ? String(event.data.flw_ref) : null,
        errorMessage:
          eventType === 'charge.completed' && String(status).toLowerCase() === 'successful'
            ? null
            : String(event?.data?.processor_response || 'Payment failed'),
        failureCode:
          eventType === 'charge.completed' && String(status).toLowerCase() === 'successful'
            ? null
            : String(status || 'charge_failed'),
        failureSource: 'flutterwave_webhook',
        gatewayPayload: event?.data || {},
        webhookReceivedAt: new Date().toISOString(),
        verifiedAt:
          eventType === 'charge.completed' && String(status).toLowerCase() === 'successful'
            ? new Date().toISOString()
            : null,
        recoveryStatus:
          eventType === 'charge.completed' && String(status).toLowerCase() === 'successful' ? 'not_needed' : 'eligible',
        transitionMetadata: {
          webhookEvent: eventType,
        },
      });
    }

    if (eventType === 'charge.completed' && String(status).toLowerCase() === 'successful') {
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
      return res.status(401).json({
        success: false,
        verified: false,
        message: 'Not authenticated',
      });
    }

    const paymentCollection = await getPaymentCollectionSettings();
    if (!paymentCollection.enabled) {
      return sendPaymentCollectionDisabled(res, paymentCollection, {
        verified: false,
      });
    }

    if (!payload.reference || !payload.email || !payload.planId || !payload.amount) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Missing payment verification fields',
      });
    }

    await recordPaymentEvent({
      userId,
      reference: payload.reference,
      provider: 'paystack',
      eventType: 'finalize_request',
      status: 'pending',
      amount: Number(payload.amount || 0),
      currency: payload.currency || 'USD',
      planId: payload.planId || null,
      planName: payload.planName || null,
      countryCode: payload.countryCode || null,
      customerEmail: payload.email || null,
      transitionMetadata: {
        flow: 'finalize',
      },
    });

    const verification = await verifyPaystackTransaction(payload.reference);

    if (!verification.success || verification.data?.status !== 'success') {
      await recordPaymentEvent({
        userId,
        reference: payload.reference,
        provider: 'paystack',
        eventType: 'verification_failed',
        status: 'failed',
        amount: Number(payload.amount || 0),
        currency: payload.currency || 'USD',
        planId: payload.planId || null,
        planName: payload.planName || null,
        countryCode: payload.countryCode || null,
        customerEmail: payload.email || null,
        errorMessage: 'Payment not verified by Paystack',
        failureCode: String(verification?.data?.status || 'verification_failed'),
        failureSource: 'paystack_verify',
        gatewayPayload: verification?.data || {},
        nextRetryAt: buildRetryAt(15),
        recoveryStatus: 'retry_scheduled',
        transitionMetadata: {
          flow: 'finalize',
        },
      });
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
      await recordPaymentEvent({
        userId,
        reference: payload.reference,
        provider: 'paystack',
        eventType: 'amount_mismatch',
        status: 'failed',
        amount: Number(payload.amount || 0),
        currency: payload.currency || 'USD',
        planId: payload.planId || null,
        planName: payload.planName || null,
        countryCode: payload.countryCode || null,
        customerEmail: payload.email || null,
        errorMessage: `Amount mismatch. expected=${expectedAmount} paid=${paidAmount}`,
        failureCode: 'amount_mismatch',
        failureSource: 'paystack_verify',
        gatewayPayload: verification?.data || {},
        nextRetryAt: buildRetryAt(30),
        recoveryStatus: 'retry_scheduled',
        transitionMetadata: {
          flow: 'finalize',
          expectedAmount,
          paidAmount,
        },
      });
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Amount mismatch in payment verification',
      });
    }

    const { billingPeriod, startDate, endDate } = await activatePremiumSubscriptionForPayment({
      userId,
      planId: payload.planId,
      planName: payload.planName || 'Premium Access',
      currency: payload.currency || 'USD',
      paidAmount,
    });

    await safeSendPaymentConfirmationEmail(
      userId,
      {
        name: payload.planName || 'Premium Access',
        currency: payload.currency || 'USD',
      },
      {
        amount_paid: paidAmount,
        renewal_date: endDate,
      },
    );

    await recordPaymentEvent({
      userId,
      reference: payload.reference,
      provider: 'paystack',
      eventType: 'payment_finalized',
      status: 'reconciled',
      amount: paidAmount,
      currency: payload.currency || 'USD',
      planId: payload.planId || null,
      planName: payload.planName || null,
      countryCode: payload.countryCode || null,
      customerEmail: payload.email || null,
      providerEventId: verification?.data?.id ? String(verification.data.id) : null,
      subscriptionId: verification?.data?.subscription?.subscription_code
        ? String(verification.data.subscription.subscription_code)
        : null,
      invoiceId: verification?.data?.invoice_id ? String(verification.data.invoice_id) : null,
      gatewayPayload: verification?.data || {},
      verifiedAt: new Date().toISOString(),
      reconciledBy: userId,
      reconciliationNotes: 'Verified and finalized through Paystack payment flow.',
      recoveryStatus: 'not_needed',
      nextRetryAt: null,
      transitionMetadata: {
        flow: 'finalize',
        billingPeriod,
      },
    });

    return res.json({
      success: true,
      verified: true,
      reference: payload.reference,
      subscription: {
        status: 'active',
        period: billingPeriod,
        startDate,
        endDate,
        planId: payload.planId,
        planName: payload.planName,
        price: paidAmount,
        currency: payload.currency || 'USD',
      },
    });
  } catch (error: any) {
    console.error('Finalize premium payment error:', error);
    if (req.user?.id && req.body?.reference) {
      try {
        await recordPaymentEvent({
          userId: req.user.id,
          reference: String(req.body.reference),
          provider: 'paystack',
          eventType: 'finalize_error',
          status: 'failed',
          amount: Number(req.body?.amount || 0),
          currency: req.body?.currency || 'USD',
          planId: req.body?.planId || null,
          planName: req.body?.planName || null,
          countryCode: req.body?.countryCode || null,
          customerEmail: req.body?.email || null,
          errorMessage: error?.message || 'Failed to finalize premium payment',
          failureCode: 'finalize_error',
          failureSource: 'paystack_finalize',
          nextRetryAt: buildRetryAt(30),
          recoveryStatus: 'retry_scheduled',
          transitionMetadata: {
            flow: 'finalize',
          },
        });
      } catch (recordError) {
        console.error('Failed to persist finalize error event:', recordError);
      }
    }
    return res.status(500).json({
      success: false,
      verified: false,
      message: error?.message || 'Failed to finalize premium payment',
    });
  }
}

/**
 * GET /api/payments/pricing
 * Returns the current premium pricing used by checkout.
 */
export async function getSubscriptionPricing(req: Request, res: Response) {
  try {
    const plans = await getManagedSubscriptionPricing();
    return res.json({
      success: true,
      data: {
        plans,
      },
    });
  } catch (error: any) {
    console.error('Get subscription pricing error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load subscription pricing',
    });
  }
}

/**
 * GET /api/payments/config
 * Returns whether live payment collection is currently enabled.
 */
export async function getPaymentCollectionConfig(req: Request, res: Response) {
  try {
    const [paymentCollection, premiumAccess] = await Promise.all([
      getPaymentCollectionSettings(),
      getPremiumAccessSettings(),
    ]);
    return res.json({
      success: true,
      data: {
        paymentCollection,
        premiumAccess,
      },
    });
  } catch (error: any) {
    console.error('Get payment config error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load payment configuration',
    });
  }
}

const getLatestSuccessfulPaymentSnapshot = async (paymentClient: any, userId: string) => {
  const { data, error } = await paymentClient
    .from('payment_events')
    .select('amount, currency, plan_id, plan_name, verified_at, attempted_at, status')
    .eq('user_id', userId)
    .in('status', ['reconciled', 'success'])
    .order('verified_at', { ascending: false, nullsFirst: false })
    .order('attempted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const getRequestUserId = (req: Request): string | undefined => (req as any).user?.id;

const isPremiumAccessAddon = (addon: any): boolean => {
  const addonName = String(addon?.addon_name || '').toLowerCase();
  const description = String(addon?.description || '').toLowerCase();

  if (isConfigAddonName(addon?.addon_name)) return false;

  return (
    description.includes('premium access subscription') ||
    addonName === 'premium access' ||
    addonName === 'premium monthly' ||
    addonName === 'premium yearly'
  );
};

const buildAddonSubscriptionExpiry = (addon: any): string | null => {
  const price = Number(addon?.price || 0);
  if (price <= 0) {
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString();
};

const activateAddonSubscription = async (params: { userId: string; addonId: string; addon: any }) => {
  const { data, error } = await supabase
    .from('user_addon_subscriptions')
    .upsert(
      {
        user_id: params.userId,
        addon_id: params.addonId,
        subscribed_at: new Date().toISOString(),
        expires_at: buildAddonSubscriptionExpiry(params.addon),
        is_active: true,
      },
      { onConflict: 'user_id,addon_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

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

    const now = Date.now();
    const [paymentCollection, premiumAccess] = await Promise.all([
      getPaymentCollectionSettings(),
      getPremiumAccessSettings(),
    ]);
    const premiumTestingAccessOpen =
      (!premiumAccess.enabled && premiumAccess.source !== 'fallback') ||
      (!paymentCollection.enabled && paymentCollection.source !== 'fallback');
    if (premiumTestingAccessOpen) {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      return res.json({
        success: true,
        subscription: {
          status: 'active',
          period: 'monthly',
          startDate,
          endDate,
          renewalDate: endDate,
          planId: 'premium-qa-open-access',
          planName: 'Premium QA Open Access',
          price: 0,
          currency: 'USD',
          autoRenewal: false,
        },
        data: {
          paymentCollection,
          premiumAccess,
          premiumTestingAccessOpen: true,
        },
      });
    }

    if (!premiumAccess.enabled) {
      return res.json({
        success: true,
        subscription: null,
        data: {
          premiumAccess,
        },
      });
    }

    const subscriptionReadClient = hasServiceConfig
      ? supabase
      : createRequestSupabaseClient(req.headers?.authorization);
    const { data: settings, error: settingsError } = await subscriptionReadClient
      .from('user_settings')
      .select(
        'subscription_plan, subscription_status, subscription_start_date, subscription_end_date, subscription_currency',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (settings?.subscription_status === 'active' && settings.subscription_plan) {
      const startDate = settings.subscription_start_date || new Date().toISOString();
      const endDate = settings.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const endMs = endDate ? new Date(endDate).getTime() : 0;
      const isExpired = endMs > 0 && endMs < now;

      if (!isExpired) {
        const latestPayment = await getLatestSuccessfulPaymentSnapshot(subscriptionReadClient, userId).catch(
          () => null,
        );

        return res.json({
          success: true,
          subscription: {
            status: 'active',
            period: inferBillingPeriod(startDate, endDate),
            startDate,
            endDate,
            renewalDate: endDate,
            planId: String(latestPayment?.plan_id || settings.subscription_plan || 'premium'),
            planName: String(latestPayment?.plan_name || settings.subscription_plan || 'Premium'),
            price: Number(latestPayment?.amount || 0),
            currency: String(latestPayment?.currency || settings.subscription_currency || 'USD'),
            autoRenewal: true,
          },
        });
      }
    }

    if (!hasServiceConfig) {
      return res.json({ success: true, subscription: null });
    }

    const { data: activeSubscriptions, error } = await supabase
      .from('user_addon_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('expires_at', { ascending: false });

    if (error) throw error;

    if (!activeSubscriptions?.length) {
      return res.json({ success: true, subscription: null });
    }

    const addonIds = activeSubscriptions.map((subscription: any) => subscription.addon_id).filter(Boolean);
    const { data: addons, error: addonsError } = await supabase
      .from('subscription_addons')
      .select('*')
      .in('id', addonIds);

    if (addonsError) throw addonsError;

    const addonsById = new Map((addons || []).map((addon: any) => [addon.id, addon]));
    const activeSubscription = activeSubscriptions.find((subscription: any) => {
      const addon = addonsById.get(subscription.addon_id);
      const endMs = subscription.expires_at ? new Date(subscription.expires_at).getTime() : 0;
      return isPremiumAccessAddon(addon) && !(endMs > 0 && endMs < now);
    });

    if (!activeSubscription) {
      return res.json({ success: true, subscription: null });
    }

    const addon = addonsById.get(activeSubscription.addon_id);
    const startDate = activeSubscription.subscribed_at || activeSubscription.created_at || new Date().toISOString();
    const endDate = activeSubscription.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const period = inferBillingPeriod(startDate, endDate);
    const latestPayment = await getLatestSuccessfulPaymentSnapshot(supabase, userId).catch(() => null);

    return res.json({
      success: true,
      subscription: {
        status: 'active',
        period,
        startDate,
        endDate,
        renewalDate: endDate,
        planId: String(latestPayment?.plan_id || addon?.addon_name || 'premium'),
        planName: String(latestPayment?.plan_name || addon?.addon_name || 'Premium'),
        price: Number(latestPayment?.amount ?? addon?.price ?? 0),
        currency: String(latestPayment?.currency || addon?.currency || 'USD'),
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

/**
 * GET /api/payments/billing-history
 * Returns payment events for the authenticated user.
 */
export async function getBillingHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const paymentReadClient = hasServiceConfig ? supabase : createRequestSupabaseClient(req.headers?.authorization);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 100)));
    const { data, error } = await paymentReadClient
      .from('payment_events')
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const eventIds = (data || []).map((entry: any) => entry.id).filter(Boolean);
    const transitionsByEventId = new Map<string, any[]>();

    if (eventIds.length > 0) {
      const { data: transitions, error: transitionsError } = await paymentReadClient
        .from('payment_event_transitions')
        .select('*')
        .in('payment_event_id', eventIds)
        .order('created_at', { ascending: false });

      if (transitionsError) throw transitionsError;

      for (const transition of transitions || []) {
        const key = String(transition.payment_event_id || '');
        if (!key) continue;
        const existing = transitionsByEventId.get(key) || [];
        existing.push(transition);
        transitionsByEventId.set(key, existing);
      }
    }

    return res.json({
      success: true,
      data: (data || []).map((entry: any) => ({
        ...entry,
        payment_event_transitions: (transitionsByEventId.get(String(entry.id)) || []).slice(0, 8),
      })),
    });
  } catch (error: any) {
    console.error('Get billing history error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load billing history',
    });
  }
}

/**
 * POST /api/payments/payment-event
 * Client-facing endpoint to persist pending/failed attempts for reconciliation.
 */
export async function savePaymentEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const {
      reference,
      provider = 'paystack',
      eventType = 'client_attempt',
      status = 'pending',
      amount,
      currency,
      planId,
      planName,
      countryCode,
      customerEmail,
      subscriptionId,
      invoiceId,
      errorMessage,
      failureCode,
      failureSource,
      gatewayPayload,
      providerEventId,
      verifiedAt,
      webhookReceivedAt,
      reconciliationNotes,
      nextRetryAt,
      recoveryStatus,
    } = req.body || {};

    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required' });
    }

    if (!['pending', 'success', 'failed', 'reconciled', 'cancelled'].includes(String(status))) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await recordPaymentEvent({
      userId,
      reference: String(reference),
      provider: String(provider || 'paystack'),
      eventType: String(eventType || 'client_attempt'),
      status: status as PaymentEventStatus,
      amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
      currency: currency ? String(currency) : null,
      planId: planId ? String(planId) : null,
      planName: planName ? String(planName) : null,
      countryCode: countryCode ? String(countryCode) : null,
      customerEmail: customerEmail ? String(customerEmail) : null,
      subscriptionId: subscriptionId ? String(subscriptionId) : null,
      invoiceId: invoiceId ? String(invoiceId) : null,
      errorMessage: errorMessage ? String(errorMessage) : null,
      failureCode: failureCode ? String(failureCode) : null,
      failureSource: failureSource ? String(failureSource) : null,
      gatewayPayload: gatewayPayload || null,
      providerEventId: providerEventId ? String(providerEventId) : null,
      verifiedAt: verifiedAt ? String(verifiedAt) : null,
      webhookReceivedAt: webhookReceivedAt ? String(webhookReceivedAt) : null,
      reconciliationNotes: reconciliationNotes ? String(reconciliationNotes) : null,
      nextRetryAt: nextRetryAt ? String(nextRetryAt) : null,
      recoveryStatus: recoveryStatus ? (String(recoveryStatus) as PaymentRecoveryStatus) : undefined,
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Save payment event error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to save payment event',
    });
  }
}

/**
 * POST /api/payments/recover-failed
 * Re-verify a failed payment and activate subscription if transaction is successful.
 */
export async function recoverFailedPayment(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const paymentCollection = await getPaymentCollectionSettings();
    if (!paymentCollection.enabled) {
      return sendPaymentCollectionDisabled(res, paymentCollection, {
        recovered: false,
      });
    }

    const reference = String(req.body?.reference || '').trim();
    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required' });
    }

    const { data: paymentEvent, error: eventError } = await supabase
      .from('payment_events')
      .select('*')
      .eq('user_id', userId)
      .eq('reference', reference)
      .maybeSingle();
    if (eventError) throw eventError;

    if (!paymentEvent) {
      return res.status(404).json({ success: false, message: 'Payment event not found' });
    }

    const verification = await verifyPaystackTransaction(reference);
    const verificationOk = verification.success && verification.data?.status === 'success';
    const nextRetryPlan = planNextPaymentRetry(Number(paymentEvent.retry_count || 0) + 1);

    if (!verificationOk) {
      await recordPaymentEvent({
        userId,
        reference,
        provider: paymentEvent.provider || 'paystack',
        eventType: 'recover_failed',
        status: 'failed',
        amount: Number(paymentEvent.amount || 0),
        currency: paymentEvent.currency || 'USD',
        planId: paymentEvent.plan_id || null,
        planName: paymentEvent.plan_name || null,
        countryCode: paymentEvent.country_code || null,
        customerEmail: userEmail || paymentEvent.customer_email || null,
        errorMessage: 'Paystack verification still failing',
        failureCode: String(verification?.data?.status || 'recover_failed'),
        failureSource: 'paystack_recovery',
        gatewayPayload: verification?.data || {},
        incrementRetry: true,
        lastRetryAt: new Date().toISOString(),
        nextRetryAt: nextRetryPlan.nextRetryAt,
        recoveryStatus: nextRetryPlan.recoveryStatus,
        transitionMetadata: {
          flow: 'recover',
          maxAutomatedRetries: MAX_AUTOMATED_PAYMENT_RETRIES,
        },
      });

      return res.status(nextRetryPlan.recoveryStatus === 'abandoned' ? 409 : 400).json({
        success: false,
        recovered: false,
        message:
          nextRetryPlan.recoveryStatus === 'abandoned'
            ? 'Payment recovery limit reached. Please contact support.'
            : 'Payment is still not verified by gateway',
      });
    }

    const paidAmount = Number(verification.data?.amount || 0) / 100;
    const planId = String(paymentEvent.plan_id || req.body?.planId || 'premium-monthly');
    const planName = String(paymentEvent.plan_name || req.body?.planName || 'Premium Access');
    const currency = String(paymentEvent.currency || req.body?.currency || 'USD');
    const { startDate, endDate } = await activatePremiumSubscriptionForPayment({
      userId,
      planId,
      planName,
      currency,
      paidAmount,
    });

    await recordPaymentEvent({
      userId,
      reference,
      provider: paymentEvent.provider || 'paystack',
      eventType: 'recover_success',
      status: 'reconciled',
      amount: paidAmount,
      currency,
      planId,
      planName,
      countryCode: paymentEvent.country_code || null,
      customerEmail: userEmail || paymentEvent.customer_email || null,
      providerEventId: verification?.data?.id ? String(verification.data.id) : null,
      subscriptionId: verification?.data?.subscription?.subscription_code
        ? String(verification.data.subscription.subscription_code)
        : paymentEvent.subscription_id || null,
      invoiceId: verification?.data?.invoice_id
        ? String(verification.data.invoice_id)
        : paymentEvent.invoice_id || null,
      gatewayPayload: verification?.data || {},
      verifiedAt: new Date().toISOString(),
      recoveredAt: new Date().toISOString(),
      reconciledBy: userId,
      reconciliationNotes: 'Recovered and reactivated after manual payment retry.',
      incrementRetry: true,
      lastRetryAt: new Date().toISOString(),
      nextRetryAt: null,
      recoveryStatus: 'recovered',
      transitionMetadata: {
        flow: 'recover',
      },
    });

    if (userEmail) {
      await safeSendPaymentConfirmationEmail(
        userId,
        {
          name: planName,
          currency,
        },
        {
          amount_paid: paidAmount,
          renewal_date: endDate,
        },
      );
    }

    return res.json({
      success: true,
      recovered: true,
      message: 'Payment recovered and premium activated.',
      subscription: {
        status: 'active',
        startDate,
        endDate,
        planId,
        planName,
        price: paidAmount,
        currency,
      },
    });
  } catch (error: any) {
    console.error('Recover failed payment error:', error);
    return res.status(500).json({
      success: false,
      recovered: false,
      message: error?.message || 'Failed to recover payment',
    });
  }
}

/**
 * Background reconciliation for due failed payment events.
 */
export async function processScheduledPaymentRetries(limit = 25): Promise<{
  processed: number;
  recovered: number;
  rescheduled: number;
  abandoned: number;
  skipped: number;
  failures: Array<{ reference: string; error: string }>;
}> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const summary = {
    processed: 0,
    recovered: 0,
    rescheduled: 0,
    abandoned: 0,
    skipped: 0,
    failures: [] as Array<{ reference: string; error: string }>,
  };

  const paymentCollection = await getPaymentCollectionSettings();
  if (!paymentCollection.enabled) {
    console.info('Skipping scheduled payment retries because payment collection is disabled.');
    return summary;
  }

  const { data: paymentEvents, error } = await supabase
    .from('payment_events')
    .select('*')
    .eq('provider', 'paystack')
    .eq('status', 'failed')
    .in('recovery_status', ['eligible', 'retry_scheduled', 'retrying'])
    .order('next_retry_at', { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Math.min(100, limit)));

  if (error) {
    throw error;
  }

  for (const rawEvent of (paymentEvents || []) as PaymentEventRecord[]) {
    const nextRetryAtMs = rawEvent.next_retry_at ? new Date(rawEvent.next_retry_at).getTime() : Number.NaN;
    const dueForRetry =
      rawEvent.recovery_status === 'eligible' || !Number.isFinite(nextRetryAtMs) || nextRetryAtMs <= now;

    if (!dueForRetry || !rawEvent.reference || !rawEvent.user_id) {
      summary.skipped += 1;
      continue;
    }

    summary.processed += 1;

    try {
      const verification = await verifyPaystackTransaction(rawEvent.reference);
      const verificationOk = verification.success && verification.data?.status === 'success';

      if (!verificationOk) {
        const retryPlan = planNextPaymentRetry(Number(rawEvent.retry_count || 0) + 1, nowIso);
        await recordPaymentEvent({
          userId: rawEvent.user_id,
          reference: rawEvent.reference,
          provider: rawEvent.provider || 'paystack',
          eventType: 'scheduled_retry_failed',
          status: 'failed',
          amount: Number(rawEvent.amount || 0),
          currency: rawEvent.currency || 'USD',
          planId: rawEvent.plan_id || null,
          planName: rawEvent.plan_name || null,
          countryCode: rawEvent.country_code || null,
          customerEmail: rawEvent.customer_email || null,
          subscriptionId: rawEvent.subscription_id || null,
          invoiceId: rawEvent.invoice_id || null,
          errorMessage: 'Automated gateway verification still failing',
          failureCode: String(verification?.data?.status || 'scheduled_retry_failed'),
          failureSource: 'scheduled_payment_retry',
          gatewayPayload: verification?.data || {},
          incrementRetry: true,
          lastRetryAt: nowIso,
          nextRetryAt: retryPlan.nextRetryAt,
          recoveryStatus: retryPlan.recoveryStatus,
          transitionMetadata: {
            flow: 'scheduled_retry',
            maxAutomatedRetries: MAX_AUTOMATED_PAYMENT_RETRIES,
          },
        });

        if (retryPlan.recoveryStatus === 'abandoned') {
          summary.abandoned += 1;
        } else {
          summary.rescheduled += 1;
        }
        continue;
      }

      const paidAmount = Number(verification.data?.amount || 0) / 100;
      const planId = String(rawEvent.plan_id || 'premium-monthly');
      const planName = String(rawEvent.plan_name || 'Premium Access');
      const currency = String(rawEvent.currency || 'USD');
      const { billingPeriod, startDate, endDate } = await activatePremiumSubscriptionForPayment({
        userId: rawEvent.user_id,
        planId,
        planName,
        currency,
        paidAmount,
      });

      await recordPaymentEvent({
        userId: rawEvent.user_id,
        reference: rawEvent.reference,
        provider: rawEvent.provider || 'paystack',
        eventType: 'scheduled_retry_recovered',
        status: 'reconciled',
        amount: paidAmount,
        currency,
        planId,
        planName,
        countryCode: rawEvent.country_code || null,
        customerEmail: rawEvent.customer_email || null,
        providerEventId: verification?.data?.id ? String(verification.data.id) : null,
        subscriptionId: verification?.data?.subscription?.subscription_code
          ? String(verification.data.subscription.subscription_code)
          : rawEvent.subscription_id || null,
        invoiceId: verification?.data?.invoice_id ? String(verification.data.invoice_id) : rawEvent.invoice_id || null,
        gatewayPayload: verification?.data || {},
        verifiedAt: nowIso,
        recoveredAt: nowIso,
        reconciledBy: rawEvent.user_id,
        reconciliationNotes: 'Recovered automatically by scheduled payment retry.',
        incrementRetry: true,
        lastRetryAt: nowIso,
        nextRetryAt: null,
        recoveryStatus: 'recovered',
        transitionMetadata: {
          flow: 'scheduled_retry',
          billingPeriod,
        },
      });

      await safeSendPaymentConfirmationEmail(
        rawEvent.user_id,
        {
          name: planName,
          currency,
        },
        {
          amount_paid: paidAmount,
          renewal_date: endDate,
        },
      );

      summary.recovered += 1;
    } catch (scheduledRetryError: any) {
      console.error('Scheduled payment retry failed:', {
        reference: rawEvent.reference,
        error: scheduledRetryError,
      });
      summary.failures.push({
        reference: rawEvent.reference,
        error: scheduledRetryError?.message || 'Unknown scheduled retry error',
      });
    }
  }

  return summary;
}

// Helper functions

export async function recordPaymentEvent(payload: PaymentEventPayload): Promise<void> {
  const now = new Date().toISOString();
  const { data: previousEvent, error: previousEventError } = await supabase
    .from('payment_events')
    .select('*')
    .eq('reference', payload.reference)
    .maybeSingle();

  if (previousEventError) {
    throw previousEventError;
  }

  const retryCount = Math.max(
    0,
    Number(payload.retryCount ?? Number(previousEvent?.retry_count || 0) + (payload.incrementRetry ? 1 : 0)),
  );
  const recoveryStatus =
    payload.recoveryStatus ||
    (payload.status === 'failed' && previousEvent?.recovery_status === 'retrying'
      ? 'retry_scheduled'
      : defaultRecoveryStatusForStatus(payload.status));
  const eventPayload = {
    user_id: payload.userId,
    reference: payload.reference,
    provider: payload.provider || previousEvent?.provider || 'paystack',
    provider_event_id: payload.providerEventId ?? previousEvent?.provider_event_id ?? null,
    event_type: payload.eventType || previousEvent?.event_type || 'payment_event',
    status: payload.status,
    amount: payload.amount ?? previousEvent?.amount ?? null,
    currency: payload.currency ?? previousEvent?.currency ?? null,
    plan_id: payload.planId ?? previousEvent?.plan_id ?? null,
    plan_name: payload.planName ?? previousEvent?.plan_name ?? null,
    country_code: payload.countryCode ?? previousEvent?.country_code ?? null,
    customer_email: payload.customerEmail ?? previousEvent?.customer_email ?? null,
    subscription_id: payload.subscriptionId ?? previousEvent?.subscription_id ?? null,
    invoice_id: payload.invoiceId ?? previousEvent?.invoice_id ?? null,
    error_message:
      payload.errorMessage !== undefined
        ? payload.errorMessage
        : payload.status === 'success' || payload.status === 'reconciled'
          ? null
          : (previousEvent?.error_message ?? null),
    failure_code:
      payload.failureCode !== undefined
        ? payload.failureCode
        : payload.status === 'success' || payload.status === 'reconciled'
          ? null
          : (previousEvent?.failure_code ?? null),
    failure_source:
      payload.failureSource !== undefined
        ? payload.failureSource
        : payload.status === 'success' || payload.status === 'reconciled'
          ? null
          : (previousEvent?.failure_source ?? null),
    gateway_payload: payload.gatewayPayload || previousEvent?.gateway_payload || {},
    attempted_at: now,
    verified_at:
      payload.verifiedAt ??
      (payload.status === 'success' || payload.status === 'reconciled' ? now : (previousEvent?.verified_at ?? null)),
    webhook_received_at: payload.webhookReceivedAt ?? previousEvent?.webhook_received_at ?? null,
    recovered_at: payload.recoveredAt ?? previousEvent?.recovered_at ?? null,
    reconciled_by: payload.reconciledBy ?? previousEvent?.reconciled_by ?? null,
    reconciliation_notes: payload.reconciliationNotes ?? previousEvent?.reconciliation_notes ?? null,
    retry_count: retryCount,
    last_retry_at: payload.lastRetryAt ?? previousEvent?.last_retry_at ?? null,
    next_retry_at:
      payload.nextRetryAt !== undefined
        ? payload.nextRetryAt
        : payload.status === 'success' || payload.status === 'reconciled'
          ? null
          : (previousEvent?.next_retry_at ?? null),
    recovery_status: recoveryStatus,
    last_transition_at: now,
    updated_at: now,
  };

  const { data: persistedEvent, error } = await supabase
    .from('payment_events')
    .upsert(eventPayload, { onConflict: 'reference' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const { error: transitionError } = await supabase.from('payment_event_transitions').insert({
    payment_event_id: persistedEvent.id,
    user_id: payload.userId,
    reference: payload.reference,
    provider: eventPayload.provider,
    event_type: eventPayload.event_type,
    previous_status: previousEvent?.status || null,
    new_status: payload.status,
    amount: eventPayload.amount,
    currency: eventPayload.currency,
    error_message: eventPayload.error_message,
    gateway_payload: eventPayload.gateway_payload,
    retry_count: retryCount,
    recovery_status: recoveryStatus,
    metadata: {
      previousEventType: previousEvent?.event_type || null,
      providerEventId: eventPayload.provider_event_id,
      customerEmail: eventPayload.customer_email,
      subscriptionId: eventPayload.subscription_id,
      invoiceId: eventPayload.invoice_id,
      webhookReceivedAt: eventPayload.webhook_received_at,
      reconciledBy: eventPayload.reconciled_by,
      reconciliationNotes: eventPayload.reconciliation_notes,
      ...((payload.transitionMetadata || {}) as Record<string, unknown>),
    },
  });

  if (transitionError) {
    throw transitionError;
  }
}

export async function verifyPaystackTransaction(reference: string): Promise<any> {
  const secret = getPaystackSecretKey();
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured (set PAYSTACK_SECRET_KEY or VITE_PAYSTACK_LIVE_SECRET_KEY)');
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
  const { error } = await supabase.from('user_addon_subscriptions').upsert(
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

async function sendPaymentConfirmationEmail(userId: string, addon: any, subscription: any): Promise<void> {
  const authAdmin = (supabase.auth as any).admin;
  const { data: authData, error: authError } = await authAdmin.getUserById(userId);
  if (authError) {
    throw authError;
  }

  const recipientEmail = authData?.user?.email;
  if (!recipientEmail) {
    throw new Error('User email not found for payment confirmation');
  }

  const amount = Number(subscription?.amount_paid ?? addon?.price ?? 0);
  const currency = String(addon?.currency || 'USD');
  const addonName = String(addon?.name || addon?.addon_name || 'Premium Access');
  const renewalDate = subscription?.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString() : 'N/A';

  const html = `
    <h2>Payment Confirmed</h2>
    <p>Your BabyCore premium subscription is active.</p>
    <p><strong>Plan:</strong> ${addonName}</p>
    <p><strong>Amount:</strong> ${amount} ${currency}</p>
    <p><strong>Status:</strong> Active</p>
    <p><strong>Next renewal:</strong> ${renewalDate}</p>
    <p>Thank you for trusting BabyCore with your family care workflow.</p>
  `;

  const text = [
    'Payment Confirmed',
    `Plan: ${addonName}`,
    `Amount: ${amount} ${currency}`,
    `Status: Active`,
    `Next renewal: ${renewalDate}`,
    'Thank you for using BabyCore.',
  ].join('\n');

  await sendTransactionalEmail({
    to: recipientEmail,
    subject: 'BabyCore Premium Payment Confirmation',
    html,
    text,
  });
}

function verifyPaystackSignature(req: Request): boolean {
  const signature = req.headers['x-paystack-signature'] as string;
  const secret = getPaystackSecretKey();
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

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
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');

  return hash === signature;
}

router.post('/process-addon', processAddonPayment);
router.post('/cancel-subscription', cancelAddonSubscription);
router.post('/finalize', finalizePremiumPayment);
router.get('/config', getPaymentCollectionConfig);
router.get('/pricing', getSubscriptionPricing);
router.get('/addons', getAvailableAddons);
router.get('/addon-subscriptions', getUserAddonSubscriptions);
router.get('/subscription-status', getSubscriptionStatus);
router.get('/billing-history', getBillingHistory);
router.post('/payment-event', savePaymentEvent);
router.post('/recover-failed', recoverFailedPayment);
router.post('/webhook/paystack', handlePaystackWebhook);
router.post('/webhook/flutterwave', handleFlutterwaveWebhook);

export default router;
