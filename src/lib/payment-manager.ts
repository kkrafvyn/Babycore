/**
 * Unified Payment Manager
 * Supports both Flutterwave and Paystack payment providers
 */

import { getApiBaseUrl } from './api-base-url';
import { getFlutterwaveClient, FlutterwavePaymentOptions } from './flutterwave';
import { assertPaymentCollectionEnabled } from './payment-config';
import {
  getPaystackClient,
  PaystackPaymentChannel,
  PaystackPaymentOptions,
} from './paystack';

export type PaymentProvider = 'flutterwave' | 'paystack';
export type Currency = 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR' | 'UGX';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  billingPeriod: 'monthly' | 'yearly';
  ghanaAmount: number;
  internationalAmount: number;
  features: string[];
  provider: PaymentProvider;
  planCode?: string; // For subscription plans
}

export const resolveSubscriptionPlanAmount = (
  plan?: SubscriptionPlan,
  countryCode?: string,
): number => {
  if (!plan) return 0;

  const prefersGhanaPricing = getPaystackLocationConfig(countryCode).currency === 'GHS';
  const preferredAmount = prefersGhanaPricing
    ? Number(plan.ghanaAmount || 0)
    : Number(plan.internationalAmount || 0);
  const fallbackAmount = prefersGhanaPricing
    ? Number(plan.internationalAmount || 0)
    : Number(plan.ghanaAmount || 0);

  if (Number.isFinite(preferredAmount) && preferredAmount > 0) return preferredAmount;
  if (Number.isFinite(fallbackAmount) && fallbackAmount > 0) return fallbackAmount;
  return 0;
};

export interface PaymentOptions {
  provider: PaymentProvider;
  amount: number;
  currency: Currency;
  channels?: PaystackPaymentChannel[];
  countryCode?: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  description?: string;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export interface PaymentTransaction {
  id: string;
  provider: PaymentProvider;
  reference: string;
  amount: number;
  currency: Currency;
  email: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface ProcessedSubscription {
  reference: string;
  provider: PaymentProvider;
  amount: number;
  currency: Currency;
  planId: string;
  planName: string;
  countryCode?: string;
}

export interface PaystackLocationConfig {
  currency: Currency;
  channels: PaystackPaymentChannel[];
}

const GHANA_PAYSTACK_LOCATION_CONFIG: PaystackLocationConfig = {
  currency: 'GHS',
  channels: ['card', 'mobile_money', 'bank'],
};

const DEFAULT_PAYSTACK_LOCATION_CONFIG: PaystackLocationConfig = {
  currency: 'USD',
  channels: ['card'],
};

export const getPaystackLocationConfig = (countryCode?: string): PaystackLocationConfig => {
  const normalizedCode = (countryCode || '').trim().toUpperCase();
  // Product rule: Ghana keeps local checkout, while every other market uses USD card-only checkout.
  return normalizedCode === 'GH'
    ? GHANA_PAYSTACK_LOCATION_CONFIG
    : DEFAULT_PAYSTACK_LOCATION_CONFIG;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    description: 'Full access for one month',
    billingPeriod: 'monthly',
    ghanaAmount: 4.99,
    internationalAmount: 4.99,
    features: [
      'Doctor access',
      'Growth charts',
      'Vaccination calendar',
      'Health alerts',
      'Cloud sync',
      'Data export',
    ],
    provider: 'paystack',
    planCode: 'PLN_premium_monthly_usd',
  },
  {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    description: 'Full access for one year (save 17%)',
    billingPeriod: 'yearly',
    ghanaAmount: 49.99,
    internationalAmount: 49.99,
    features: [
      'Doctor access',
      'Growth charts',
      'Vaccination calendar',
      'AI & advanced analytics',
      'Family + community features',
      'Cloud sync and export',
    ],
    provider: 'paystack',
    planCode: 'PLN_premium_yearly_usd',
  },
];

const isBillingPeriod = (value: unknown): value is 'monthly' | 'yearly' =>
  value === 'monthly' || value === 'yearly';

const normalizeSubscriptionPlan = (value: any): SubscriptionPlan | null => {
  const id = String(value?.id || '').trim();
  if (!id) return null;

  const billingPeriod = isBillingPeriod(value?.billingPeriod)
    ? value.billingPeriod
    : String(value?.billingPeriod || '').trim().toLowerCase() === 'yearly'
      ? 'yearly'
      : 'monthly';
  const provider = String(value?.provider || 'paystack').trim().toLowerCase();
  if (provider !== 'paystack' && provider !== 'flutterwave') {
    return null;
  }

  return {
    id,
    name: String(value?.name || id),
    description: String(value?.description || ''),
    billingPeriod,
    ghanaAmount: Number(value?.ghanaAmount || 0),
    internationalAmount: Number(value?.internationalAmount || 0),
    features: Array.isArray(value?.features)
      ? value.features.map((feature: unknown) => String(feature))
      : [],
    provider,
    planCode: value?.planCode ? String(value.planCode) : undefined,
  };
};

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/payments/pricing`, {
      method: 'GET',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || `Failed to load subscription plans (${response.status})`);
    }

    const plans = Array.isArray(payload?.data?.plans)
      ? payload.data.plans.map(normalizeSubscriptionPlan).filter(Boolean)
      : [];

    return plans.length > 0 ? (plans as SubscriptionPlan[]) : [...SUBSCRIPTION_PLANS];
  } catch (error) {
    console.warn('Unable to load managed subscription plans. Falling back to defaults.', error);
    return [...SUBSCRIPTION_PLANS];
  }
};

export class UnifiedPaymentManager {
  private static instance: UnifiedPaymentManager;
  private transactions: PaymentTransaction[] = [];
  private primaryProvider: PaymentProvider = 'paystack';
  private fallbackProvider: PaymentProvider = 'flutterwave';

  private constructor() {
    this.loadTransactions();
  }

  static getInstance(): UnifiedPaymentManager {
    if (!UnifiedPaymentManager.instance) {
      UnifiedPaymentManager.instance = new UnifiedPaymentManager();
    }
    return UnifiedPaymentManager.instance;
  }

  setPrimaryProvider(provider: PaymentProvider): void {
    this.primaryProvider = provider;
    this.fallbackProvider = provider === 'paystack' ? 'flutterwave' : 'paystack';
  }

  getPrimaryProvider(): PaymentProvider {
    return this.primaryProvider;
  }

  /**
   * Process payment with selected provider
   */
  async processPayment(options: PaymentOptions): Promise<void> {
    const transaction: PaymentTransaction = {
      id: options.reference,
      provider: options.provider,
      reference: options.reference,
      amount: options.amount,
      currency: options.currency,
      email: options.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: options.metadata,
    };

    try {
      if (options.provider === 'paystack') {
        await this.processPaystackPayment(options);
      } else if (options.provider === 'flutterwave') {
        await this.processFlutterwavePayment(options);
      } else {
        throw new Error(`Unknown payment provider: ${options.provider}`);
      }

      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();
      options.onSuccess?.();
    } catch (error) {
      transaction.status = 'failed';
      options.onError?.(error);
      throw error;
    } finally {
      this.saveTransaction(transaction);
    }
  }

  /**
   * Process payment via Paystack
   */
  private async processPaystackPayment(options: PaymentOptions): Promise<void> {
    const client = getPaystackClient();
    const amountInMinorUnit = Math.round(options.amount * 100);

    const paystackOptions: PaystackPaymentOptions = {
      email: options.email,
      amount: amountInMinorUnit,
      reference: options.reference,
      currency: options.currency,
      channels: options.channels,
      firstName: options.firstName,
      lastName: options.lastName,
      phoneNumber: options.phoneNumber,
      metadata: {
        ...options.metadata,
        description: options.description,
        currency: options.currency,
      },
      onSuccess: options.onSuccess,
      onError: options.onError,
      onClose: options.onClose,
    };

    return client.initializeTransaction(paystackOptions);
  }

  /**
   * Process payment via Flutterwave
   */
  private async processFlutterwavePayment(options: PaymentOptions): Promise<void> {
    const client = getFlutterwaveClient();

    const flutterwaveOptions: FlutterwavePaymentOptions = {
      amount: options.amount,
      currency: options.currency,
      email: options.email,
      phoneNumber: options.phoneNumber || '',
      firstName: options.firstName,
      lastName: options.lastName,
      txRef: options.reference,
      customization: {
        title: 'Cradlyn Subscription',
        description: options.description || 'Premium subscription payment',
      },
      meta: {
        ...options.metadata,
        currency: options.currency,
      },
      onSuccess: options.onSuccess,
      onError: options.onError,
      onClose: options.onClose,
    };

    return client.initializePayment(flutterwaveOptions);
  }

  /**
   * Process subscription with provider
   */
  async processSubscription(
    plan: SubscriptionPlan,
    email: string,
    firstName: string,
    lastName: string,
    phoneNumber?: string,
    countryCode?: string,
    userId?: string,
    amountOverride?: number,
  ): Promise<ProcessedSubscription> {
    await assertPaymentCollectionEnabled();

    const computedAmount = resolveSubscriptionPlanAmount(plan, countryCode);
    const amount =
      typeof amountOverride === 'number' && Number.isFinite(amountOverride) && amountOverride > 0
        ? amountOverride
        : computedAmount;
    const paystackLocationConfig = getPaystackLocationConfig(countryCode);
    const currency: Currency =
      plan.provider === 'paystack' ? paystackLocationConfig.currency : 'USD';
    const normalizedCountryCode = countryCode?.trim().toUpperCase();

    const reference = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.processPayment({
      provider: plan.provider,
      amount,
      currency,
      channels: plan.provider === 'paystack' ? paystackLocationConfig.channels : undefined,
      countryCode: normalizedCountryCode,
      email,
      firstName,
      lastName,
      phoneNumber,
      reference,
      description: plan.description,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        isSubscription: true,
        countryCode: normalizedCountryCode,
        userId,
      },
    });

    return {
      reference,
      provider: plan.provider,
      amount,
      currency,
      planId: plan.id,
      planName: plan.name,
      countryCode: normalizedCountryCode,
    };
  }

  /**
   * Get all transactions
   */
  getTransactions(): PaymentTransaction[] {
    return [...this.transactions];
  }

  /**
   * Get transaction by reference
   */
  getTransaction(reference: string): PaymentTransaction | undefined {
    return this.transactions.find((t) => t.reference === reference);
  }

  /**
   * Get transactions by email
   */
  getTransactionsByEmail(email: string): PaymentTransaction[] {
    return this.transactions.filter((t) => t.email === email);
  }

  /**
   * Save transaction to localStorage
   */
  private saveTransaction(transaction: PaymentTransaction): void {
    this.transactions.push(transaction);
    localStorage.setItem(
      'payment_transactions',
      JSON.stringify(this.transactions)
    );
  }

  /**
   * Load transactions from localStorage
   */
  private loadTransactions(): void {
    const saved = localStorage.getItem('payment_transactions');
    if (saved) {
      try {
        this.transactions = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load transactions:', error);
        this.transactions = [];
      }
    }
  }

  /**
   * Get subscription plan by ID
   */
  getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  }

  /**
   * Get all subscription plans
   */
  getAllSubscriptionPlans(): SubscriptionPlan[] {
    return [...SUBSCRIPTION_PLANS];
  }

  /**
   * Get plans by provider
   */
  getPlansByProvider(provider: PaymentProvider): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS.filter((p) => p.provider === provider);
  }

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string, provider: PaymentProvider): Promise<boolean> {
    try {
      if (provider === 'paystack') {
        const client = getPaystackClient();
        const result = await client.verifyTransaction(reference);
        return result.status && result.data?.status === 'success';
      } else if (provider === 'flutterwave') {
        const client = getFlutterwaveClient();
        const result = await client.verifyTransaction(reference);
        return result.status === 'successful';
      }
      return false;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  }
}

/**
 * Get unified payment manager instance
 */
export function getPaymentManager(): UnifiedPaymentManager {
  return UnifiedPaymentManager.getInstance();
}

/**
 * Hook-like function for payment operations
 */
export function usePaymentManager() {
  return getPaymentManager();
}
