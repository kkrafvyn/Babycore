import { supabase as defaultSupabase } from './supabase.js';

export type ManagedSubscriptionPlanId = 'premium-monthly' | 'premium-yearly';
export type ManagedSubscriptionPlanMarket = 'ghana' | 'international';

export interface ManagedSubscriptionPlan {
  id: ManagedSubscriptionPlanId;
  name: string;
  description: string;
  billingPeriod: 'monthly' | 'yearly';
  provider: 'paystack';
  ghanaAmount: number;
  internationalAmount: number;
  ghanaCurrency: 'GHS';
  internationalCurrency: 'USD';
  isActive: boolean;
}

type PricingSeedRow = {
  addon_name: string;
  addon_type: 'premium_reports';
  price: number;
  currency: 'GHS' | 'USD';
  description: string;
  content_url: string;
  is_active: boolean;
};

const PLAN_META: Record<
  ManagedSubscriptionPlanId,
  Omit<ManagedSubscriptionPlan, 'ghanaAmount' | 'internationalAmount' | 'isActive'>
> = {
  'premium-monthly': {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    description: 'Full access for one month',
    billingPeriod: 'monthly',
    provider: 'paystack',
    ghanaCurrency: 'GHS',
    internationalCurrency: 'USD',
  },
  'premium-yearly': {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    description: 'Full access for one year (save 17%)',
    billingPeriod: 'yearly',
    provider: 'paystack',
    ghanaCurrency: 'GHS',
    internationalCurrency: 'USD',
  },
};

export const DEFAULT_MANAGED_SUBSCRIPTION_PLANS: ManagedSubscriptionPlan[] = [
  {
    ...PLAN_META['premium-monthly'],
    ghanaAmount: 4.99,
    internationalAmount: 4.99,
    isActive: true,
  },
  {
    ...PLAN_META['premium-yearly'],
    ghanaAmount: 49.99,
    internationalAmount: 49.99,
    isActive: true,
  },
];

const buildPricingAddonName = (
  planId: ManagedSubscriptionPlanId,
  market: ManagedSubscriptionPlanMarket,
): string => `config:pricing:${planId}:${market}`;

const PRICING_SEED_ROWS: PricingSeedRow[] = [
  {
    addon_name: buildPricingAddonName('premium-monthly', 'ghana'),
    addon_type: 'premium_reports',
    price: DEFAULT_MANAGED_SUBSCRIPTION_PLANS[0].ghanaAmount,
    currency: 'GHS',
    description: 'Managed pricing config for Ghana premium monthly checkout.',
    content_url: 'pricing-config://premium-monthly/ghana',
    is_active: false,
  },
  {
    addon_name: buildPricingAddonName('premium-monthly', 'international'),
    addon_type: 'premium_reports',
    price: DEFAULT_MANAGED_SUBSCRIPTION_PLANS[0].internationalAmount,
    currency: 'USD',
    description: 'Managed pricing config for international premium monthly checkout.',
    content_url: 'pricing-config://premium-monthly/international',
    is_active: false,
  },
  {
    addon_name: buildPricingAddonName('premium-yearly', 'ghana'),
    addon_type: 'premium_reports',
    price: DEFAULT_MANAGED_SUBSCRIPTION_PLANS[1].ghanaAmount,
    currency: 'GHS',
    description: 'Managed pricing config for Ghana premium yearly checkout.',
    content_url: 'pricing-config://premium-yearly/ghana',
    is_active: false,
  },
  {
    addon_name: buildPricingAddonName('premium-yearly', 'international'),
    addon_type: 'premium_reports',
    price: DEFAULT_MANAGED_SUBSCRIPTION_PLANS[1].internationalAmount,
    currency: 'USD',
    description: 'Managed pricing config for international premium yearly checkout.',
    content_url: 'pricing-config://premium-yearly/international',
    is_active: false,
  },
];

const getPlanDefault = (planId: ManagedSubscriptionPlanId): ManagedSubscriptionPlan =>
  DEFAULT_MANAGED_SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ||
  DEFAULT_MANAGED_SUBSCRIPTION_PLANS[0];

const getPlanAmount = (
  rowsByName: Map<string, any>,
  planId: ManagedSubscriptionPlanId,
  market: ManagedSubscriptionPlanMarket,
): number => {
  const row = rowsByName.get(buildPricingAddonName(planId, market));
  const fallback = getPlanDefault(planId);
  const defaultAmount =
    market === 'ghana' ? fallback.ghanaAmount : fallback.internationalAmount;
  const parsed = Number(row?.price);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultAmount;
};

const getPlanActiveState = (
  rowsByName: Map<string, any>,
  planId: ManagedSubscriptionPlanId,
): boolean => {
  const ghanaRow = rowsByName.get(buildPricingAddonName(planId, 'ghana'));
  const intlRow = rowsByName.get(buildPricingAddonName(planId, 'international'));

  if (typeof ghanaRow?.is_active === 'boolean') return ghanaRow.is_active;
  if (typeof intlRow?.is_active === 'boolean') return intlRow.is_active;

  return getPlanDefault(planId).isActive;
};

const mapRowsToPlans = (rows: any[] | null | undefined): ManagedSubscriptionPlan[] => {
  const rowsByName = new Map<string, any>(
    (rows || []).map((row) => [String(row?.addon_name || ''), row]),
  );

  return (Object.keys(PLAN_META) as ManagedSubscriptionPlanId[]).map((planId) => {
    const meta = PLAN_META[planId];
    return {
      ...meta,
      ghanaAmount: getPlanAmount(rowsByName, planId, 'ghana'),
      internationalAmount: getPlanAmount(rowsByName, planId, 'international'),
      isActive: getPlanActiveState(rowsByName, planId),
    };
  });
};

export const ensureManagedSubscriptionPricingRows = async (
  supabase = defaultSupabase,
): Promise<void> => {
  const rowNames = PRICING_SEED_ROWS.map((row) => row.addon_name);
  const { data, error } = await supabase
    .from('subscription_addons')
    .select('addon_name')
    .in('addon_name', rowNames);

  if (error) {
    throw error;
  }

  const existingNames = new Set((data || []).map((row: any) => String(row?.addon_name || '')));
  const missingRows = PRICING_SEED_ROWS.filter((row) => !existingNames.has(row.addon_name));

  if (missingRows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('subscription_addons').insert(missingRows);
  if (insertError) {
    throw insertError;
  }
};

export const getManagedSubscriptionPricing = async (
  supabase = defaultSupabase,
): Promise<ManagedSubscriptionPlan[]> => {
  try {
    await ensureManagedSubscriptionPricingRows(supabase);
    const { data, error } = await supabase
      .from('subscription_addons')
      .select('addon_name, price, currency, is_active')
      .in(
        'addon_name',
        PRICING_SEED_ROWS.map((row) => row.addon_name),
      );

    if (error) {
      throw error;
    }

    return mapRowsToPlans(data);
  } catch (error) {
    console.warn('Falling back to default managed subscription pricing:', error);
    return DEFAULT_MANAGED_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan }));
  }
};

export const updateManagedSubscriptionPricing = async (
  updates: Array<{
    id: ManagedSubscriptionPlanId;
    ghanaAmount: number;
    internationalAmount: number;
    isActive?: boolean;
  }>,
  supabase = defaultSupabase,
): Promise<ManagedSubscriptionPlan[]> => {
  await ensureManagedSubscriptionPricingRows(supabase);

  for (const update of updates) {
    const planId = update.id;
    if (!(planId in PLAN_META)) {
      throw new Error(`Unknown pricing plan: ${planId}`);
    }

    const ghanaAmount = Number(update.ghanaAmount);
    const internationalAmount = Number(update.internationalAmount);
    if (!Number.isFinite(ghanaAmount) || ghanaAmount < 0) {
      throw new Error(`Invalid Ghana amount for ${planId}`);
    }
    if (!Number.isFinite(internationalAmount) || internationalAmount < 0) {
      throw new Error(`Invalid international amount for ${planId}`);
    }

    const isActive =
      typeof update.isActive === 'boolean' ? update.isActive : getPlanDefault(planId).isActive;

    const rowsToUpdate = [
      {
        addon_name: buildPricingAddonName(planId, 'ghana'),
        price: ghanaAmount,
        currency: 'GHS',
        is_active: isActive,
      },
      {
        addon_name: buildPricingAddonName(planId, 'international'),
        price: internationalAmount,
        currency: 'USD',
        is_active: isActive,
      },
    ];

    for (const row of rowsToUpdate) {
      const { error } = await supabase
        .from('subscription_addons')
        .update({
          price: row.price,
          currency: row.currency,
          is_active: row.is_active,
        })
        .eq('addon_name', row.addon_name);

      if (error) {
        throw error;
      }
    }
  }

  return getManagedSubscriptionPricing(supabase);
};

