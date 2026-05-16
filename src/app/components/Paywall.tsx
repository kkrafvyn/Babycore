import React, { useState } from 'react';
import { AlertCircle, X, Zap } from 'lucide-react';
import { subscriptionManager, pricing, type SubscriptionPeriod } from '../../lib/premium';
import { motion } from 'framer-motion';
import { useAppContext } from '../AppContext';
import {
  fetchSubscriptionPlans,
  getPaystackLocationConfig,
  resolveSubscriptionPlanAmount,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from '../../lib/payment-manager';
import {
  DEFAULT_PREMIUM_ACCESS_CONFIG,
  DEFAULT_PREMIUM_ACCESS_REASON,
  fetchPaymentFeatureConfig,
  type PaymentCollectionConfig,
} from '../../lib/payment-config';

interface PaywallProps {
  feature?: string;
  onClose: () => void;
  onUpgrade?: () => Promise<void>;
}

const MotionDiv = motion.div as any;

export const Paywall: React.FC<PaywallProps> = ({ feature = 'Premium Features', onClose, onUpgrade }) => {
  const { currentBaby } = useAppContext();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPeriod>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);
  const [premiumAccess, setPremiumAccess] = useState<PaymentCollectionConfig>(DEFAULT_PREMIUM_ACCESS_CONFIG);
  const [premiumAccessLoading, setPremiumAccessLoading] = useState(true);
  const subscription = subscriptionManager.getSubscription();
  const isTrialActive = subscription?.status === 'trial';
  const locationConfig = getPaystackLocationConfig(currentBaby?.country);
  const monthlyPlan = plans.find((plan) => plan.id === 'premium-monthly') || SUBSCRIPTION_PLANS[0];
  const annualPlan = plans.find((plan) => plan.id === 'premium-yearly') || SUBSCRIPTION_PLANS[1];
  const monthlyAmount = resolveSubscriptionPlanAmount(monthlyPlan, currentBaby?.country);
  const annualAmount = resolveSubscriptionPlanAmount(annualPlan, currentBaby?.country);
  const annualSavings =
    monthlyAmount > 0
      ? Math.max(0, Math.round((1 - annualAmount / (monthlyAmount * 12)) * 100))
      : Number(pricing.annual.savings) || 17;

  React.useEffect(() => {
    let cancelled = false;

    const loadManagedPlans = async () => {
      const managedPlans = await fetchSubscriptionPlans();
      if (!cancelled && managedPlans.length > 0) {
        setPlans(managedPlans);
      }
    };

    void loadManagedPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadPremiumAccess = async () => {
      setPremiumAccessLoading(true);
      const config = await fetchPaymentFeatureConfig();
      if (!cancelled) {
        setPremiumAccess(config.premiumAccess);
        setPremiumAccessLoading(false);
      }
    };

    void loadPremiumAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const premiumFeatures = [
    {
      icon: 'GC',
      title: 'Growth Chart',
      description: 'Track height, weight, and head circumference with WHO percentiles',
    },
    {
      icon: 'VC',
      title: 'Vaccination Calendar',
      description: 'Country-specific schedules with automatic reminders',
    },
    {
      icon: 'DR',
      title: 'Doctor Access',
      description: 'Unlock doctor reports and clinical collaboration tools',
    },
    {
      icon: 'DX',
      title: 'Data Export',
      description: 'PDF reports and CSV exports for your pediatrician',
    },
    {
      icon: 'CS',
      title: 'Cloud Sync',
      description: 'Sync across devices and automatic backup',
    },
    {
      icon: 'WA',
      title: 'Weekly Analytics',
      description: 'Detailed insights into feeding, sleep, and growth trends',
    },
  ];

  const handleUpgrade = async () => {
    if (!onUpgrade) return;
    if (!premiumAccess.enabled) return;
    setIsLoading(true);
    try {
      await onUpgrade();
      onClose();
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center">
      <MotionDiv
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-surface rounded-t-[3.5rem] shadow-2xl overflow-y-auto no-scrollbar max-h-[92vh] border-t border-white/10"
      >
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl p-8 flex items-center justify-between border-b border-border-gray dark:border-zinc-800">
          <div>
            <h2 className="text-2xl font-headline font-black text-foreground tracking-tighter">Unlock Sanctuary</h2>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mt-1">{feature}</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center text-text-light hover:scale-110 active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        </header>

        <div className="p-8 pb-32 space-y-10">
          {isTrialActive && (
            <div className="bg-secondary/10 border border-secondary/20 p-6 rounded-[2rem] flex items-center gap-5">
              <div className="w-12 h-12 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <p className="text-sm font-black text-secondary">Active Sanctuary Trial</p>
                <p className="text-[11px] font-bold text-text-dim">
                  Enjoy unrestricted access for {subscriptionManager.getDaysRemaining()} more days.
                </p>
              </div>
            </div>
          )}

          {!premiumAccessLoading && !premiumAccess.enabled && (
            <div className="flex items-start gap-4 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <AlertCircle className="shrink-0 text-emerald-600 dark:text-emerald-300" size={20} />
              <div>
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                  Premium access is open for testing
                </p>
                <p className="mt-1 text-[11px] font-bold leading-relaxed text-emerald-700 dark:text-emerald-300">
                  {premiumAccess.reason ||
                    'Premium tools are available without checkout while Babycore tests packages.'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <p className="text-[10px] font-black text-text-light uppercase tracking-widest px-2">
              Subscription Architectures
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => premiumAccess.enabled && setSelectedPlan('monthly')}
                disabled={!premiumAccess.enabled}
                className={`p-8 rounded-[2.5rem] border text-left transition-all ${
                  selectedPlan === 'monthly'
                    ? 'bg-surface border-secondary shadow-xl'
                    : 'bg-surface-gray dark:bg-zinc-900 border-border-gray dark:border-zinc-800'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <p
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    selectedPlan === 'monthly' ? 'text-secondary' : 'text-text-dim'
                  }`}
                >
                  Monthly
                </p>
                <p
                  className={`text-3xl font-headline font-black mt-2 tracking-tighter ${
                    selectedPlan === 'monthly' ? 'text-foreground' : 'text-text-light'
                  }`}
                >
                  {locationConfig.currency} {monthlyAmount.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold text-text-dim mt-2 italic">Rolling Access</p>
              </button>
              <button
                onClick={() => premiumAccess.enabled && setSelectedPlan('annual')}
                disabled={!premiumAccess.enabled}
                className={`relative p-8 rounded-[2.5rem] border text-left transition-all ${
                  selectedPlan === 'annual'
                    ? 'bg-surface border-secondary shadow-xl'
                    : 'bg-surface-gray dark:bg-zinc-900 border-border-gray dark:border-zinc-800'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="absolute -top-3 -right-3 bg-secondary text-white text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                  Best Value
                </div>
                <p
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    selectedPlan === 'annual' ? 'text-secondary' : 'text-text-dim'
                  }`}
                >
                  Annual
                </p>
                <p
                  className={`text-3xl font-headline font-black mt-2 tracking-tighter ${
                    selectedPlan === 'annual' ? 'text-foreground' : 'text-text-light'
                  }`}
                >
                  {locationConfig.currency} {annualAmount.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold text-text-dim mt-2 italic">Save {annualSavings}%</p>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-text-light uppercase tracking-widest px-2">Sanctuary Utilities</p>
            <div className="grid grid-cols-1 gap-3">
              {premiumFeatures.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-5 p-5 bg-surface-gray dark:bg-zinc-900/50 rounded-3xl border border-border-gray/30 dark:border-zinc-800/30 group hover:border-secondary transition-all"
                >
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center text-xs font-black tracking-widest shadow-sm group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-headline font-black text-sm text-foreground tracking-tight leading-none">
                      {item.title}
                    </p>
                    <p className="text-[11px] font-bold text-text-dim leading-tight mt-1.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={isLoading || premiumAccessLoading || !premiumAccess.enabled}
            className="w-full bg-secondary text-white py-6 rounded-full font-headline font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-secondary/30 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-pulse">Initializing...</span>
            ) : premiumAccessLoading ? (
              <>Checking Premium...</>
            ) : !premiumAccess.enabled ? (
              <>Premium Open For Testing</>
            ) : (
              <>Initialize {selectedPlan} Sanctuary</>
            )}
          </button>

          <div className="flex flex-col items-center gap-4 py-4 text-[9px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40 italic">
            <span>Encryption Standard AES-256 Enabled</span>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};
