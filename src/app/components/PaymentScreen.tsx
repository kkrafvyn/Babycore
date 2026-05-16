import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronLeft, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../AppContext';
import {
  fetchSubscriptionPlans,
  getPaystackLocationConfig,
  resolveSubscriptionPlanAmount,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  usePaymentManager,
} from '../../lib/payment-manager';
import { initializePaystack } from '../../lib/paystack';
import { i18nT } from '../../lib/i18n';
import {
  finalizePremiumPayment,
  getBillingHistory,
  recoverFailedPayment,
  savePaymentEvent,
  type BillingEventRecord,
} from '../../lib/payment-api';
import {
  DEFAULT_PAYMENT_COLLECTION_CONFIG,
  DEFAULT_PAYMENT_COLLECTION_REASON,
  DEFAULT_PREMIUM_ACCESS_CONFIG,
  DEFAULT_PREMIUM_ACCESS_REASON,
  fetchPaymentFeatureConfig,
  type PaymentCollectionConfig,
} from '../../lib/payment-config';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface PaymentScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

const formatTimestamp = (value?: string | null): string => {
  if (!value) return 'Unknown time';
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? 'Unknown time' : timestamp.toLocaleString();
};

const formatBillingAmount = (entry: BillingEventRecord, fallbackCurrency: string): string => {
  const amount = Number(entry.amount || 0);
  return `${entry.currency || fallbackCurrency} ${amount.toFixed(2)}`;
};

const getRecoveryBadgeClass = (status?: string | null): string => {
  switch (status) {
    case 'recovered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';
    case 'retry_scheduled':
    case 'retrying':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300';
    case 'abandoned':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300';
    default:
      return 'border-border-gray bg-surface-gray text-text-dim dark:border-zinc-700 dark:bg-zinc-900';
  }
};

const getStatusToneClass = (status?: string | null): string => {
  switch (status) {
    case 'reconciled':
    case 'success':
      return 'text-emerald-600 dark:text-emerald-300';
    case 'failed':
      return 'text-rose-600 dark:text-rose-300';
    default:
      return 'text-text-dim';
  }
};

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ onBack, onSuccess }) => {
  const { user, currentBaby, updateSettings } = useAppContext();
  const paymentManager = usePaymentManager();
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);
  const [paymentCollection, setPaymentCollection] = useState<PaymentCollectionConfig>(
    DEFAULT_PAYMENT_COLLECTION_CONFIG,
  );
  const [premiumAccess, setPremiumAccess] = useState<PaymentCollectionConfig>(DEFAULT_PREMIUM_ACCESS_CONFIG);
  const [paymentCollectionLoading, setPaymentCollectionLoading] = useState(true);

  const paystackPlans = useMemo(
    () => subscriptionPlans.filter((plan) => plan.provider === 'paystack'),
    [subscriptionPlans],
  );
  const [selectedPlan, setSelectedPlan] = useState<string>('premium-monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billingHistory, setBillingHistory] = useState<BillingEventRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [recoveringRef, setRecoveringRef] = useState<string | null>(null);
  const billingSummary = useMemo(
    () =>
      billingHistory.reduce(
        (acc, entry) => {
          acc.total += 1;
          if (entry.status === 'failed') acc.failed += 1;
          if (entry.recovery_status === 'retry_scheduled' || entry.recovery_status === 'retrying') acc.retrying += 1;
          if (entry.recovery_status === 'recovered') acc.recovered += 1;
          if (entry.recovery_status === 'abandoned') acc.abandoned += 1;
          return acc;
        },
        {
          total: 0,
          failed: 0,
          retrying: 0,
          recovered: 0,
          abandoned: 0,
        },
      ),
    [billingHistory],
  );

  const selectedPlanData = useMemo(
    () => paystackPlans.find((plan) => plan.id === selectedPlan) || paystackPlans[0],
    [paystackPlans, selectedPlan],
  );
  const paystackLocationConfig = useMemo(() => getPaystackLocationConfig(currentBaby?.country), [currentBaby?.country]);
  const isGhanaCheckout = paystackLocationConfig.currency === 'GHS';
  const paymentChannelLabel = isGhanaCheckout ? 'Card, Mobile Money, and Bank' : 'Card only';
  const paymentCheckoutSummary = isGhanaCheckout
    ? 'Ghana checkouts are billed in GHS and support card, mobile money, and bank payments.'
    : 'Outside Ghana, checkouts are billed in USD and accept card payments only.';
  const amount = useMemo(
    () => resolveSubscriptionPlanAmount(selectedPlanData, currentBaby?.country),
    [currentBaby?.country, selectedPlanData],
  );
  const formatAmount = (value: number): string => {
    if (!Number.isFinite(value)) return '0';
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  };
  const paystackPublicKey =
    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY || '';

  React.useEffect(() => {
    try {
      if (paymentCollectionLoading || !paymentCollection.enabled || !premiumAccess.enabled) {
        return;
      }

      if (!paystackPublicKey) {
        setError(
          'Paystack public key is missing. Set VITE_PAYSTACK_PUBLIC_KEY in your frontend deployment environment and redeploy.',
        );
        return;
      }

      initializePaystack({
        publicKey: paystackPublicKey,
      });
    } catch (err) {
      console.error('Failed to initialize Paystack:', err);
    }
  }, [paymentCollection.enabled, paymentCollectionLoading, paystackPublicKey, premiumAccess.enabled]);

  const loadBillingHistoryData = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const history = await getBillingHistory(20);
      setBillingHistory(history);
    } catch (err) {
      console.warn('Failed to load billing history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadPaymentCollection = async () => {
      setPaymentCollectionLoading(true);
      const config = await fetchPaymentFeatureConfig();
      if (!cancelled) {
        setPaymentCollection(config.paymentCollection);
        setPremiumAccess(config.premiumAccess);
        setPaymentCollectionLoading(false);
      }
    };

    void loadPaymentCollection();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    void loadBillingHistoryData();
  }, [loadBillingHistoryData]);

  React.useEffect(() => {
    let cancelled = false;

    const loadManagedPlans = async () => {
      const managedPlans = await fetchSubscriptionPlans();
      if (!cancelled && managedPlans.length > 0) {
        setSubscriptionPlans(managedPlans);
      }
    };

    void loadManagedPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!paystackPlans.length) return;
    if (!paystackPlans.some((plan) => plan.id === selectedPlan)) {
      setSelectedPlan(paystackPlans[0].id);
    }
  }, [paystackPlans, selectedPlan]);

  const handlePayment = async () => {
    if (paymentCollectionLoading) {
      setError('Checking payment availability. Please try again in a moment.');
      return;
    }

    if (!paymentCollection.enabled) {
      setError(paymentCollection.reason || DEFAULT_PAYMENT_COLLECTION_REASON);
      return;
    }

    if (!premiumAccess.enabled) {
      setError(premiumAccess.reason || 'Premium access is open for testing right now. No checkout is required.');
      return;
    }

    if (!user?.email || !selectedPlanData || !firstName.trim() || !lastName.trim()) {
      setError(i18nT('payment.fillRequired', 'Please fill in all required fields'));
      return;
    }

    setLoading(true);
    setError(null);
    let processedPayment: {
      reference: string;
      provider?: string;
      amount: number;
      currency: any;
      planId: string;
      planName: string;
      countryCode?: string;
    } | null = null;

    try {
      const plan = selectedPlanData;

      const paymentResult = await paymentManager.processSubscription(
        plan,
        user.email,
        firstName,
        lastName,
        phoneNumber,
        currentBaby?.country,
        user.id,
        amount,
      );
      processedPayment = paymentResult;

      await savePaymentEvent({
        reference: paymentResult.reference,
        provider: paymentResult.provider,
        eventType: 'client_checkout_success',
        status: 'pending',
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        planId: paymentResult.planId,
        planName: paymentResult.planName,
        countryCode: paymentResult.countryCode,
        customerEmail: user.email,
      });

      await finalizePremiumPayment({
        reference: paymentResult.reference,
        email: user.email,
        planId: paymentResult.planId,
        planName: paymentResult.planName,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        countryCode: paymentResult.countryCode,
      });

      await updateSettings({
        subscriptionPlan: plan.id,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date().toISOString(),
      });

      await savePaymentEvent({
        reference: paymentResult.reference,
        provider: paymentResult.provider,
        eventType: 'client_finalize_success',
        status: 'success',
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        planId: paymentResult.planId,
        planName: paymentResult.planName,
        countryCode: paymentResult.countryCode,
        customerEmail: user.email,
        verifiedAt: new Date().toISOString(),
        recoveryStatus: 'not_needed',
      });

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(errorMessage);
      console.error('Payment error:', err);

      if (processedPayment?.reference) {
        try {
          await savePaymentEvent({
            reference: processedPayment.reference,
            provider: processedPayment.provider || 'paystack',
            eventType: 'client_finalize_failed',
            status: 'failed',
            amount: processedPayment.amount,
            currency: processedPayment.currency,
            planId: processedPayment.planId,
            planName: processedPayment.planName,
            countryCode: processedPayment.countryCode,
            customerEmail: user.email,
            errorMessage,
            failureSource: 'client_finalize',
            recoveryStatus: 'eligible',
          });
        } catch (saveErr) {
          console.warn('Failed to persist failed payment event:', saveErr);
        }
      }
    } finally {
      setLoading(false);
      void loadBillingHistoryData();
    }
  };

  const handleRecoverPayment = async (reference: string) => {
    setRecoveringRef(reference);
    try {
      const result = await recoverFailedPayment(reference);
      if (result.recovered) {
        await updateSettings({
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date().toISOString(),
        });
      }
      alert(result.message || 'Recovery request completed.');
      await loadBillingHistoryData();
    } catch (err: any) {
      alert(err?.message || 'Recovery failed.');
    } finally {
      setRecoveringRef(null);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-border-gray bg-background/80 px-8 backdrop-blur-xl dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-primary transition-all hover:scale-110 active:scale-95 dark:text-zinc-400"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black tracking-tight text-foreground">
            {i18nT('payment.title')}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-24">
        <div className="mx-auto w-full max-w-md space-y-10">
          {error && (
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 rounded-[2rem] border border-error/20 bg-error/10 p-6"
            >
              <AlertCircle className="shrink-0 text-error" size={20} />
              <p className="text-xs font-bold leading-relaxed text-error">{error}</p>
            </MotionDiv>
          )}

          {!paymentCollectionLoading && !paymentCollection.enabled && (
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20"
            >
              <AlertCircle className="shrink-0 text-amber-600 dark:text-amber-300" size={20} />
              <div>
                <p className="text-sm font-black text-amber-800 dark:text-amber-200">Payments are paused for testing</p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-amber-700 dark:text-amber-300">
                  {paymentCollection.reason || DEFAULT_PAYMENT_COLLECTION_REASON}
                </p>
              </div>
            </MotionDiv>
          )}

          {!paymentCollectionLoading && !premiumAccess.enabled && (
            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20"
            >
              <AlertCircle className="shrink-0 text-amber-600 dark:text-amber-300" size={20} />
              <div>
                <p className="text-sm font-black text-amber-800 dark:text-amber-200">
                  Premium access is open for testing
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-amber-700 dark:text-amber-300">
                  {premiumAccess.reason ||
                    'Premium tools are available without checkout while Babycore tests packages.'}
                </p>
              </div>
            </MotionDiv>
          )}

          <div className="space-y-6">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-light">
              Access Architecture
            </h3>
            <div className="space-y-4">
              {paystackPlans.map((plan) => (
                <MotionButton
                  key={plan.id}
                  onClick={() => premiumAccess.enabled && setSelectedPlan(plan.id)}
                  disabled={!premiumAccess.enabled}
                  className={`group relative w-full overflow-hidden rounded-[3rem] border p-8 text-left transition-all ${
                    selectedPlan === plan.id
                      ? 'border-secondary bg-surface shadow-xl'
                      : 'border-border-gray bg-surface hover:border-text-light/30 dark:border-zinc-800'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="space-y-1">
                      <h3
                        className={`text-xl font-headline font-black tracking-tight ${
                          selectedPlan === plan.id ? 'text-foreground' : 'text-text-light'
                        }`}
                      >
                        {plan.name}
                      </h3>
                      <p className="text-[11px] font-bold leading-tight text-text-dim">{plan.description}</p>
                    </div>
                    {selectedPlan === plan.id && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-white shadow-lg">
                        <Check size={18} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 mt-8 flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-headline font-black tracking-tighter ${
                        selectedPlan === plan.id ? 'text-foreground' : 'text-text-light'
                      }`}
                    >
                      {paystackLocationConfig.currency}{' '}
                      {formatAmount(resolveSubscriptionPlanAmount(plan, currentBaby?.country))}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
                      /{plan.billingPeriod === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>

                  <div className="relative z-10 mt-8 flex gap-3 overflow-x-auto border-t border-border-gray pb-1 pt-6 no-scrollbar dark:border-zinc-800/50">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex shrink-0 items-center gap-2 rounded-full border border-border-gray/30 bg-surface-gray px-4 py-2 dark:bg-zinc-800/50"
                      >
                        <Check size={10} className="text-secondary" strokeWidth={4} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{feature}</span>
                      </div>
                    ))}
                  </div>
                </MotionButton>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-light">Patron Identity</h3>
            <div className="space-y-8 rounded-[3rem] border border-border-gray bg-surface p-10 shadow-sm dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Name"
                    className="input-onboarding"
                  />
                </div>
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Surname"
                    className="input-onboarding"
                  />
                </div>
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                    Channel Contact
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (000) 000-0000"
                    className="input-onboarding"
                  />
                </div>
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                    Encrypted Vault Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input-onboarding cursor-not-allowed opacity-40"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[3rem] bg-secondary p-10 text-white shadow-2xl">
            <div className="absolute right-0 top-0 h-48 w-48 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">Grand Total</p>
                  <h4 className="text-2xl font-headline font-black tracking-tight">{selectedPlanData?.name}</h4>
                </div>
                <p className="text-4xl font-headline font-black tracking-tighter">
                  {paystackLocationConfig.currency} {formatAmount(amount)}
                </p>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">{paymentChannelLabel}</p>
                <p className="text-[10px] font-bold italic leading-relaxed text-white/70">{paymentCheckoutSummary}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Billing History</p>
              <span className="text-[10px] font-bold text-text-dim">
                {loadingHistory ? 'Loading...' : `${billingHistory.length} records`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Failed', value: billingSummary.failed },
                { label: 'Retrying', value: billingSummary.retrying },
                { label: 'Recovered', value: billingSummary.recovered },
                { label: 'Abandoned', value: billingSummary.abandoned },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border-gray bg-surface-gray px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-light">{item.label}</p>
                  <p className="mt-1 text-lg font-headline font-black text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {(billingHistory || []).slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border-gray p-3 dark:border-zinc-700">
                <p className="text-xs font-black text-foreground">{entry.plan_name || 'Premium Access'}</p>
                <p className={`mt-1 text-[11px] font-semibold ${getStatusToneClass(entry.status)}`}>
                  {formatBillingAmount(entry, paystackLocationConfig.currency)} | {entry.status}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getRecoveryBadgeClass(
                      entry.recovery_status,
                    )}`}
                  >
                    {entry.recovery_status || 'not_needed'}
                  </span>
                  {typeof entry.retry_count === 'number' && entry.retry_count > 0 && (
                    <span className="rounded-full bg-surface-gray px-2 py-1 text-[10px] font-black uppercase tracking-wider text-text-dim dark:bg-zinc-900">
                      {entry.retry_count} retries
                    </span>
                  )}
                  {entry.provider && (
                    <span className="rounded-full bg-surface-gray px-2 py-1 text-[10px] font-black uppercase tracking-wider text-text-dim dark:bg-zinc-900">
                      {entry.provider}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[10px] font-semibold text-text-dim">
                  {entry.reference} | {formatTimestamp(entry.attempted_at)}
                </p>

                {entry.error_message && (
                  <p className="mt-2 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                    {entry.error_message}
                  </p>
                )}

                {(entry.failure_code || entry.failure_source) && (
                  <p className="mt-1 text-[10px] font-semibold text-text-dim">
                    {entry.failure_code || 'failure'} | {entry.failure_source || 'gateway'}
                  </p>
                )}

                {(entry.verified_at || entry.recovered_at || entry.next_retry_at) && (
                  <div className="mt-2 space-y-1">
                    {entry.verified_at && (
                      <p className="text-[10px] font-semibold text-text-dim">
                        Verified {formatTimestamp(entry.verified_at)}
                      </p>
                    )}
                    {entry.recovered_at && (
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                        Recovered {formatTimestamp(entry.recovered_at)}
                      </p>
                    )}
                    {entry.next_retry_at && entry.status === 'failed' && (
                      <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        Next retry {formatTimestamp(entry.next_retry_at)}
                      </p>
                    )}
                  </div>
                )}

                {entry.payment_event_transitions?.length ? (
                  <div className="mt-2 rounded-lg border border-border-gray bg-surface-gray p-2 dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-[10px] font-black uppercase tracking-wider text-text-light">Recovery Timeline</p>
                    {entry.payment_event_transitions.slice(0, 3).map((transition) => (
                      <p key={transition.id} className="mt-1 text-[10px] font-semibold text-text-dim">
                        {transition.event_type}
                        {' -> '}
                        {transition.new_status}
                        {' | '}
                        {formatTimestamp(transition.created_at)}
                      </p>
                    ))}
                  </div>
                ) : null}

                {entry.status === 'failed' && entry.recovery_status !== 'abandoned' && (
                  <button
                    onClick={() => handleRecoverPayment(entry.reference)}
                    disabled={recoveringRef === entry.reference || !paymentCollection.enabled || !premiumAccess.enabled}
                    className="mt-2 h-8 rounded-lg bg-secondary px-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-60"
                  >
                    {recoveringRef === entry.reference
                      ? 'Recovering...'
                      : paymentCollection.enabled && premiumAccess.enabled
                        ? 'Recover Payment'
                        : 'Recovery Paused'}
                  </button>
                )}
              </div>
            ))}

            {!loadingHistory && billingHistory.length === 0 && (
              <p className="text-xs font-semibold text-text-dim">No billing events yet.</p>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-gray bg-background/80 p-8 backdrop-blur-xl dark:border-zinc-800">
        <div className="mx-auto max-w-md">
          <MotionButton
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePayment}
            disabled={
              loading ||
              paymentCollectionLoading ||
              !paymentCollection.enabled ||
              !premiumAccess.enabled ||
              !selectedPlanData
            }
            className="flex h-20 w-full items-center justify-center gap-4 rounded-full bg-secondary py-6 font-headline text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-secondary/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin text-white/50" />
                <span>{i18nT('payment.processing')}</span>
              </>
            ) : paymentCollectionLoading ? (
              <span>Checking Payments...</span>
            ) : !paymentCollection.enabled ? (
              <span>Payments Paused</span>
            ) : !premiumAccess.enabled ? (
              <span>Premium Open</span>
            ) : (
              <>
                <span>{i18nT('payment.payNow')}</span>
                <div className="h-4 w-px bg-white/20" />
                <span>
                  {paystackLocationConfig.currency} {formatAmount(amount)}
                </span>
              </>
            )}
          </MotionButton>
        </div>
      </div>
    </div>
  );
};
