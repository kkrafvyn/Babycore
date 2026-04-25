/**
 * Premium Subscription Module
 * Handles subscription management, feature access, and in-app purchases
 */

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
    noAds: true,
  },
};

// Pricing information
export const pricing = {
  monthly: {
    price: 4.99,
    currency: 'USD',
    billingInterval: 'month',
  },
  annual: {
    price: 39.99,
    currency: 'USD',
    billingInterval: 'year',
    savings: '17%', // calculated: (4.99 * 12 - 39.99) / (4.99 * 12) = 33%
  },
};

class SubscriptionManager {
  private subscription: Subscription | null = null;

  /**
   * Initialize subscription from storage or API
   */
  async initialize(userId: string): Promise<Subscription> {
    this.subscription = this.loadFromStorage(userId) || {
      userId,
      tier: 'free',
      status: 'active',
      period: 'monthly',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
    return this.subscription.status === 'active' && now < endDate;
  }

  /**
   * Check if feature is available
   */
  hasFeature(feature: keyof PremiumFeatures): boolean {
    if (!this.subscription) return false;
    const tier = this.subscription.tier;
    return featureMatrix[tier][feature];
  }

  /**
   * Get all available features
   */
  getAvailableFeatures(): PremiumFeatures {
    if (!this.subscription) return featureMatrix['free'];
    return featureMatrix[this.subscription.tier];
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
   * Upgrade to premium (mocked - real implementation would use App Store/Play Store APIs)
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
  isExpiringsoon(): boolean {
    return this.getDaysRemaining() <= 7 && this.getDaysRemaining() > 0;
  }

  /**
   * Get renewal price
   */
  getRenewalPrice(): string {
    if (!this.subscription) return 'N/A';

    const period = this.subscription.period;
    const price = period === 'monthly' ? pricing.monthly.price : pricing.annual.price;

    return `${this.subscription.currency || '$'}${price}`;
  }

  /**
   * Restore purchases (for app store)
   */
  async restorePurchases(): Promise<Subscription | null> {
    // This would call App Store/Play Store APIs in real implementation
    console.log('Restoring purchases from App Store/Play Store...');
    return this.subscription;
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
    isExpiringSoon: subscriptionManager.isExpiringsin(),
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
