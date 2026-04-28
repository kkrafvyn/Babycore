/**
 * Unified Payment Manager
 * Supports both Flutterwave and Paystack payment providers
 */

import { getFlutterwaveClient, FlutterwavePaymentOptions } from './flutterwave';
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
  monthlyPrice: number; // in NGN for Paystack, USD for Flutterwave etc.
  yearlyPrice: number;
  features: string[];
  provider: PaymentProvider;
  planCode?: string; // For subscription plans
}

export const resolveSubscriptionPlanAmount = (plan?: SubscriptionPlan): number => {
  if (!plan) return 0;

  const planId = String(plan.id || '').toLowerCase();
  const monthly = Number(plan.monthlyPrice || 0);
  const yearly = Number(plan.yearlyPrice || 0);

  if (planId.includes('year')) return yearly > 0 ? yearly : monthly;
  if (planId.includes('month')) return monthly > 0 ? monthly : yearly;

  if (monthly > 0 && yearly === 0) return monthly;
  if (yearly > 0 && monthly === 0) return yearly;

  return monthly > 0 ? monthly : yearly;
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

const PAYSTACK_LOCATION_MAP: Record<string, PaystackLocationConfig> = {
  NG: {
    currency: 'NGN',
    channels: ['card', 'bank', 'ussd', 'bank_transfer'],
  },
  GH: {
    currency: 'GHS',
    channels: ['card', 'mobile_money', 'bank'],
  },
  ZA: {
    currency: 'ZAR',
    channels: ['card', 'bank_transfer', 'eft'],
  },
  KE: {
    currency: 'KES',
    channels: ['card', 'mobile_money'],
  },
  UG: {
    currency: 'UGX',
    channels: ['card', 'mobile_money'],
  },
};

const DEFAULT_PAYSTACK_LOCATION_CONFIG: PaystackLocationConfig = {
  currency: 'USD',
  channels: ['card'],
};

export const getPaystackLocationConfig = (countryCode?: string): PaystackLocationConfig => {
  const normalizedCode = (countryCode || '').trim().toUpperCase();
  return PAYSTACK_LOCATION_MAP[normalizedCode] || DEFAULT_PAYSTACK_LOCATION_CONFIG;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    description: 'Full access for one month',
    monthlyPrice: 4.99,
    yearlyPrice: 0,
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
    monthlyPrice: 0,
    yearlyPrice: 49.99,
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
        title: 'BabyLog Subscription',
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
    const computedAmount = resolveSubscriptionPlanAmount(plan);
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
