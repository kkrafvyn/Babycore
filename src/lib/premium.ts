/**
 * Premium Subscription Module
 * Handles subscription management, feature access, and in-app purchases
 */

import { getApiBaseUrl } from './api-base-url';
import { readJsonResponse } from './http-json';
import {
  resolveSubscriptionPlanAmount,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from './payment-manager';
import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionPeriod = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export interface Subscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  period: SubscriptionPeriod;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  autoRenewal: boolean;
  price?: number;
  currency?: string;
}

export interface PremiumFeatures {
  growthChart: boolean;
  vaccinationCalendar: boolean;
  dataExport: boolean;
  cloudSync: boolean;
  multiBaby: boolean;
  weeklyAnalytics: boolean;
  advancedNotifications: boolean;
  healthAlerts: boolean;
  voiceLogging: boolean;
  aiInsights: boolean;
  doctorAccess: boolean;
  doctorReports: boolean;
  wearableIntegration: boolean;
  communityAccess: boolean;
  familySharing: boolean;
  contentLibrary: boolean;
  caregiverHandoff: boolean;
  advancedAnalytics: boolean;
  noAds: boolean;
}

// Feature access matrix
const featureMatrix: Record<SubscriptionTier, PremiumFeatures> = {
  free: {
    growthChart: false,
    vaccinationCalendar: false,
    dataExport: false,
    cloudSync: false,
    multiBaby: false,
    weeklyAnalytics: false,
    advancedNotifications: false,
    healthAlerts: false,
    voiceLogging: false,
    aiInsights: false,
    doctorAccess: false,
    doctorReports: false,
    wearableIntegration: false,
    communityAccess: false,
    familySharing: false,
    contentLibrary: false,
    caregiverHandoff: false,
    advancedAnalytics: false,
    noAds: false,
  },
  premium: {
    growthChart: true,
    vaccinationCalendar: true,
    dataExport: true,
    cloudSync: true,
    multiBaby: true,
    weeklyAnalytics: true,
    advancedNotifications: true,
    healthAlerts: true,
    voiceLogging: true,
    aiInsights: true,
    doctorAccess: true,
    doctorReports: true,
    wearableIntegration: true,
    communityAccess: true,
    familySharing: true,
    contentLibrary: true,
    caregiverHandoff: true,
    advancedAnalytics: true,
    noAds: true,
  },
};

export const isPremiumSubscriptionActive = (
  status?: 'free' | 'active' | 'expired' | 'trial' | string,
): boolean => status === 'active' || status === 'trial';

const getDefaultSubscriptionPlan = (billingPeriod: 'monthly' | 'yearly'): SubscriptionPlan =>
  SUBSCRIPTION_PLANS.find((plan) => plan.billingPeriod === billingPeriod) || SUBSCRIPTION_PLANS[0];

const DEFAULT_MONTHLY_PLAN = getDefaultSubscriptionPlan('monthly');
const DEFAULT_ANNUAL_PLAN = getDefaultSubscriptionPlan('yearly');
const DEFAULT_MONTHLY_PRICE = resolveSubscriptionPlanAmount(DEFAULT_MONTHLY_PLAN, 'US');
const DEFAULT_ANNUAL_PRICE = resolveSubscriptionPlanAmount(DEFAULT_ANNUAL_PLAN, 'US');
const DEFAULT_ANNUAL_SAVINGS = DEFAULT_MONTHLY_PRICE > 0
  ? Math.max(0, Math.round((1 - DEFAULT_ANNUAL_PRICE / (DEFAULT_MONTHLY_PRICE * 12)) * 100))
  : 0;

// Pricing information
export const pricing = {
  monthly: {
    price: DEFAULT_MONTHLY_PRICE,
    currency: 'USD',
    billingInterval: 'month',
  },
  annual: {
    price: DEFAULT_ANNUAL_PRICE,
    currency: 'USD',
    billingInterval: 'year',
    savings: String(DEFAULT_ANNUAL_SAVINGS),
  },
};

class SubscriptionManager {
  private subscription: Subscription | null = null;
  private lastBackendSync: string | null = null;

  /**
   * Initialize subscription from storage or API
   */
  async initialize(userId: string): Promise<Subscription> {
    const remoteSubscription = await this.fetchSubscriptionFromBackend(userId);
    if (remoteSubscription) {
      this.subscription = remoteSubscription;
      this.saveToStorage();
      this.lastBackendSync = new Date().toISOString();
      return this.subscription;
    }

    this.subscription = this.loadFromStorage(userId) || {
      userId,
      tier: 'free',
      status: 'expired',
      period: 'monthly',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      autoRenewal: false,
    };

    return this.subscription;
  }

  /**
   * Get current subscription
   */
  getSubscription(): Subscription | null {
    return this.subscription;
  }

  /**
   * Check if user has active subscription
   */
  isActive(): boolean {
    if (!this.subscription) return false;
    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    return (this.subscription.status === 'active' || this.subscription.status === 'trial') && now < endDate;
  }

  /**
   * Check if feature is available
   */
  hasFeature(feature: keyof PremiumFeatures): boolean {
    if (!this.subscription) return false;
    const tier: SubscriptionTier = this.isActive() ? this.subscription.tier : 'free';
    return featureMatrix[tier][feature];
  }

  /**
   * Get all available features
   */
  getAvailableFeatures(): PremiumFeatures {
    if (!this.subscription) return featureMatrix['free'];
    return featureMatrix[this.isActive() ? this.subscription.tier : 'free'];
  }

  /**
   * Check subscription eligibility for trial
   */
  canStartTrial(): boolean {
    // Check if user has never had a subscription
    const hasTrialUsed = localStorage.getItem('babylog_trial_used');
    return !hasTrialUsed;
  }

  /**
   * Start free trial (14 days)
   */
  async startTrial(userId: string): Promise<Subscription> {
    if (!this.canStartTrial()) {
      throw new Error('Trial already used');
    }

    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    this.subscription = {
      userId,
      tier: 'premium',
      status: 'trial',
      period: 'monthly',
      startDate: new Date().toISOString(),
      endDate: trialEndDate.toISOString(),
      autoRenewal: false,
    };

    localStorage.setItem('babylog_trial_used', 'true');
    this.saveToStorage();

    return this.subscription;
  }

  /**
   * Upgrade to premium in the local subscription store.
   * Backend payment confirmation should call this after transaction verification.
   */
  async upgradeToPremium(period: SubscriptionPeriod): Promise<Subscription> {
    if (!this.subscription) {
      throw new Error('No subscription initialized');
    }

    const endDate = new Date();
    if (period === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    this.subscription = {
      ...this.subscription,
      tier: 'premium',
      status: 'active',
      period,
      endDate: endDate.toISOString(),
      renewalDate: endDate.toISOString(),
      autoRenewal: true,
      price: period === 'monthly' ? pricing.monthly.price : pricing.annual.price,
      currency: pricing.monthly.currency,
    };

    this.saveToStorage();
    return this.subscription;
  }

  async refreshFromBackend(): Promise<Subscription | null> {
    if (!this.subscription?.userId) return null;
    const remote = await this.fetchSubscriptionFromBackend(this.subscription.userId);
    if (!remote) return this.subscription;
    this.subscription = remote;
    this.saveToStorage();
    this.lastBackendSync = new Date().toISOString();
    return this.subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<void> {
    if (!this.subscription) return;

    this.subscription.status = 'cancelled';
    this.subscription.autoRenewal = false;

    this.saveToStorage();
  }

  /**
   * Get days remaining on subscription
   */
  getDaysRemaining(): number {
    if (!this.subscription) return 0;

    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    const daysMs = endDate.getTime() - now.getTime();
    const days = Math.ceil(daysMs / (1000 * 60 * 60 * 24));

    return Math.max(0, days);
  }

  /**
   * Check if subscription is expiring soon (within 7 days)
   */
  isExpiringSoon(): boolean {
    return this.getDaysRemaining() <= 7 && this.getDaysRemaining() > 0;
  }

  /**
   * Get renewal price
   */
  getRenewalPrice(): string {
    if (!this.subscription) return 'N/A';

    const period = this.subscription.period;
    const price = Number(
      this.subscription.price ??
        (period === 'monthly' ? pricing.monthly.price : pricing.annual.price),
    );
    const currency =
      this.subscription.currency || (period === 'monthly' ? pricing.monthly.currency : pricing.annual.currency);

    return `${currency} ${price.toFixed(2)}`;
  }

  /**
   * Restore purchases from local state.
   * App Store / Play Store restore hooks can be integrated in mobile builds.
   */
  async restorePurchases(): Promise<Subscription | null> {
    return this.refreshFromBackend();
  }

  /**
   * Save subscription to storage
   */
  private saveToStorage(): void {
    if (this.subscription) {
      localStorage.setItem(
        `babylog_subscription_${this.subscription.userId}`,
        JSON.stringify(this.subscription),
      );
    }
  }

  /**
   * Load subscription from storage
   */
  private loadFromStorage(userId: string): Subscription | null {
    const data = localStorage.getItem(`babylog_subscription_${userId}`);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }

  private async fetchSubscriptionFromBackend(userId: string): Promise<Subscription | null> {
    try {
      const auth = supabase.auth as any;
      const {
        data: { session },
      } = await auth.getSession();

      if (!session?.access_token) {
        return null;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/payments/subscription-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = await readJsonResponse<{
        success?: boolean;
        subscription?: Record<string, any> | null;
      }>(response);
      if (!payload?.success || !payload?.subscription) {
        return {
          userId,
          tier: 'free',
          status: 'expired',
          period: 'monthly',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          autoRenewal: false,
        };
      }

      const remote = payload.subscription;
      const period: SubscriptionPeriod =
        remote.period === 'annual' || remote.period === 'yearly' ? 'annual' : 'monthly';

      return {
        userId,
        tier: 'premium',
        status: remote.status === 'trial' ? 'trial' : 'active',
        period,
        startDate: remote.startDate || new Date().toISOString(),
        endDate: remote.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDate: remote.renewalDate,
        autoRenewal: remote.autoRenewal !== false,
        price: Number(remote.price || (period === 'monthly' ? pricing.monthly.price : pricing.annual.price)),
        currency: remote.currency || (period === 'monthly' ? pricing.monthly.currency : pricing.annual.currency),
      };
    } catch (error) {
      console.error('Failed to fetch premium subscription from backend:', error);
      return null;
    }
  }
}

export const subscriptionManager = new SubscriptionManager();

/**
 * Hook-like functions for React components
 */

export const useSubscription = (userId: string) => {
  return {
    subscription: subscriptionManager.getSubscription(),
    isActive: subscriptionManager.isActive(),
    hasFeature: (feature: keyof PremiumFeatures) => subscriptionManager.hasFeature(feature),
    getAvailableFeatures: () => subscriptionManager.getAvailableFeatures(),
    getDaysRemaining: () => subscriptionManager.getDaysRemaining(),
    isExpiringSoon: subscriptionManager.isExpiringSoon(),
  };
};

export const usePremiumFeature = (feature: keyof PremiumFeatures) => {
  const hasAccess = subscriptionManager.hasFeature(feature);

  return {
    hasAccess,
    showPaywall: () => {
      window.dispatchEvent(
        new CustomEvent('showPaywall', {
          detail: { feature, premium: true },
        }),
      );
    },
  };
};
