import { sendTransactionalEmail } from '../_shared/email.js';
import {
  parseRequestBody,
  setCommonHeaders,
  type VercelRequest,
  type VercelResponse,
} from '../_shared/http.js';
import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase.js';

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    metadata?: {
      userId?: string;
      user_id?: string;
      planId?: string;
      plan_id?: string;
      planName?: string;
      plan_name?: string;
    };
  };
}

type FinalizePayload = {
  reference?: string;
  email?: string;
  planId?: string;
  planName?: string;
  amount?: number | string;
  currency?: string;
};

const toMinorUnits = (amount: number): number => Math.round(amount * 100);

const verifyWithPaystack = async (
  reference: string,
  secretKey: string,
): Promise<PaystackVerifyResponse> => {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = (await response.json()) as PaystackVerifyResponse;

  if (!response.ok) {
    throw new Error(data?.message || `Paystack verification failed (${response.status})`);
  }

  return data;
};

const inferBillingPeriod = (planId: string): 'monthly' | 'annual' =>
  /year|annual/i.test(planId) ? 'annual' : 'monthly';

const getPeriodEndDate = (startDate: Date, period: 'monthly' | 'annual'): Date => {
  const endDate = new Date(startDate);
  if (period === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
};

const ensurePremiumAddon = async (
  supabase: any,
  input: { name: string; amount: number; currency: string },
): Promise<string> => {
  const addonName = input.name || 'Premium Access';

  const existing = await supabase
    .from('subscription_addons')
    .select('id')
    .eq('addon_name', addonName)
    .maybeSingle();

  if (existing.data?.id) return String(existing.data.id);

  const { data, error } = await supabase
    .from('subscription_addons')
    .insert({
      addon_name: addonName,
      addon_type: 'premium_reports',
      price: input.amount,
      currency: input.currency,
      description: 'Premium access subscription',
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw error || new Error('Unable to create premium addon');
  }

  return String(data.id);
};

const upsertPremiumSubscription = async (
  supabase: any,
  input: { userId: string; addonId: string; startDate: string; endDate: string },
): Promise<void> => {
  const { error } = await supabase
    .from('user_addon_subscriptions')
    .upsert(
      {
        user_id: input.userId,
        addon_id: input.addonId,
        subscribed_at: input.startDate,
        expires_at: input.endDate,
        is_active: true,
      },
      { onConflict: 'user_id,addon_id' },
    );

  if (error) throw error;
};

const syncUserSettings = async (
  supabase: any,
  input: {
    userId: string;
    planId: string;
    startDate: string;
    endDate: string;
    currency: string;
  },
): Promise<void> => {
  try {
    await supabase.from('user_settings').upsert(
      {
        user_id: input.userId,
        subscription_plan: input.planId,
        subscription_status: 'active',
        subscription_start_date: input.startDate,
        subscription_end_date: input.endDate,
        subscription_currency: input.currency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  } catch (error) {
    console.warn('Unable to sync user_settings subscription fields:', error);
  }
};

const sendPaymentConfirmation = async (input: {
  recipientEmail: string;
  planName: string;
  amount: number;
  currency: string;
  renewalDate: string;
}): Promise<void> => {
  const html = `
    <h2>Payment Confirmed</h2>
    <p>Your BabyCore premium subscription is now active.</p>
    <p><strong>Plan:</strong> ${input.planName}</p>
    <p><strong>Amount:</strong> ${input.amount} ${input.currency}</p>
    <p><strong>Renewal date:</strong> ${new Date(input.renewalDate).toLocaleDateString()}</p>
    <p>Thank you for upgrading.</p>
  `;

  try {
    await sendTransactionalEmail({
      to: input.recipientEmail,
      subject: 'BabyCore Premium Payment Confirmation',
      html,
    });
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, verified: false, message: 'Method not allowed' });
    return;
  }

  const authenticatedUser = await getAuthenticatedUser(req);
  if (!authenticatedUser) {
    res.status(401).json({ success: false, verified: false, message: 'Unauthorized' });
    return;
  }

  const body = parseRequestBody(req.body) as FinalizePayload;
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
  const planName = typeof body.planName === 'string' ? body.planName.trim() : 'Premium Access';
  const amount = Number(body.amount);
  const expectedCurrency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || process.env.VITE_PAYSTACK_LIVE_SECRET_KEY;

  if (!reference || !planId || !Number.isFinite(amount) || amount <= 0 || !expectedCurrency) {
    res.status(400).json({
      success: false,
      verified: false,
      message: 'Missing or invalid payment verification fields',
    });
    return;
  }

  if (!paystackSecretKey) {
    res.status(500).json({
      success: false,
      verified: false,
      message: 'PAYSTACK_SECRET_KEY is not configured',
    });
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const verification = await verifyWithPaystack(reference, paystackSecretKey);
    const paidAmountMinor = verification.data?.amount ?? 0;
    const paidCurrency = (verification.data?.currency || '').toUpperCase();
    const paidStatus = verification.data?.status || 'unknown';
    const expectedAmountMinor = toMinorUnits(amount);
    const metadataUserId =
      verification.data?.metadata?.userId || verification.data?.metadata?.user_id || '';

    if (!verification.status || paidStatus !== 'success') {
      res.status(400).json({
        success: false,
        verified: false,
        message: `Payment status is ${paidStatus}`,
      });
      return;
    }

    if (paidAmountMinor !== expectedAmountMinor) {
      res.status(400).json({
        success: false,
        verified: false,
        message: 'Paid amount does not match expected amount',
      });
      return;
    }

    if (paidCurrency && paidCurrency !== expectedCurrency) {
      res.status(400).json({
        success: false,
        verified: false,
        message: `Currency mismatch: expected ${expectedCurrency}, got ${paidCurrency}`,
      });
      return;
    }

    if (metadataUserId && metadataUserId !== authenticatedUser.id) {
      res.status(403).json({
        success: false,
        verified: false,
        message: 'Payment reference does not belong to the authenticated user',
      });
      return;
    }

    const period = inferBillingPeriod(planId);
    const startDate = new Date();
    const endDate = getPeriodEndDate(startDate, period);

    const addonId = await ensurePremiumAddon(supabase, {
      name: planName,
      amount,
      currency: expectedCurrency,
    });

    await upsertPremiumSubscription(supabase, {
      userId: authenticatedUser.id,
      addonId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    await syncUserSettings(supabase, {
      userId: authenticatedUser.id,
      planId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currency: expectedCurrency,
    });

    await sendPaymentConfirmation({
      recipientEmail: authenticatedUser.email || email,
      planName,
      amount,
      currency: expectedCurrency,
      renewalDate: endDate.toISOString(),
    });

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment verified and subscription activated',
      reference,
      paidAt: verification.data?.paid_at || null,
      subscription: {
        status: 'active',
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        planId,
        planName,
        amount,
        currency: expectedCurrency,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      verified: false,
      message: error?.message || 'Payment verification failed',
    });
  }
}
