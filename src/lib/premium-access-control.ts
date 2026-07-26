import type { PaymentCollectionConfig } from './payment-config';

export type UserPremiumAccessCause =
  | 'checking'
  | 'payments_paused'
  | 'premium_enforcement_off'
  | 'plan_required';

export interface UserPremiumAccessSnapshot {
  ready: boolean;
  loading: boolean;
  usersGetFreePremium: boolean;
  statusLabel: string;
  headline: string;
  reason: string;
  cause: UserPremiumAccessCause;
  paymentsEnabled: boolean;
  premiumEnforcementEnabled: boolean;
}

export interface PremiumAccessMatrixRow {
  paymentsOn: boolean;
  enforcementOn: boolean;
  usersGetPremium: boolean;
  label: string;
  isCurrent: boolean;
}

export const resolveUserPremiumAccessSnapshot = (
  paymentCollection: PaymentCollectionConfig | null | undefined,
  premiumAccess: PaymentCollectionConfig | null | undefined,
  loading = false,
): UserPremiumAccessSnapshot => {
  const paymentsEnabled = Boolean(paymentCollection?.enabled);
  const premiumEnforcementEnabled = Boolean(premiumAccess?.enabled);
  const ready = Boolean(paymentCollection && premiumAccess);

  if (loading || !ready) {
    return {
      ready: false,
      loading: loading || !ready,
      usersGetFreePremium: false,
      statusLabel: 'Checking',
      headline: 'Checking user premium access',
      reason: 'Loading payment controls…',
      cause: 'checking',
      paymentsEnabled,
      premiumEnforcementEnabled,
    };
  }

  const usersGetFreePremium = !paymentsEnabled || !premiumEnforcementEnabled;

  let cause: UserPremiumAccessCause;
  let reason: string;

  if (!paymentsEnabled && !premiumEnforcementEnabled) {
    cause = 'payments_paused';
    reason =
      'Payments and premium enforcement are both off, so every signed-in user can use premium packages for free.';
  } else if (!paymentsEnabled) {
    cause = 'payments_paused';
    reason =
      'Payments are paused, so users still get premium for free even if premium enforcement is turned on.';
  } else if (!premiumEnforcementEnabled) {
    cause = 'premium_enforcement_off';
    reason =
      'Premium enforcement is off, so users can open premium tools without an active subscription.';
  } else {
    cause = 'plan_required';
    reason =
      'Payments and premium enforcement are both on. Users need an active paid plan to use premium packages.';
  }

  return {
    ready: true,
    loading: false,
    usersGetFreePremium,
    statusLabel: usersGetFreePremium ? 'Free premium' : 'Plan required',
    headline: usersGetFreePremium
      ? 'Users can use premium packages without paying'
      : 'Users must subscribe to use premium packages',
    reason,
    cause,
    paymentsEnabled,
    premiumEnforcementEnabled,
  };
};

export const buildPremiumAccessMatrix = (
  snapshot: UserPremiumAccessSnapshot,
): PremiumAccessMatrixRow[] => {
  const combos: Omit<PremiumAccessMatrixRow, 'isCurrent'>[] = [
    {
      paymentsOn: false,
      enforcementOn: false,
      usersGetPremium: true,
      label: 'Both off — free premium for all users',
    },
    {
      paymentsOn: false,
      enforcementOn: true,
      usersGetPremium: true,
      label: 'Payments off — free premium (pause overrides enforcement)',
    },
    {
      paymentsOn: true,
      enforcementOn: false,
      usersGetPremium: true,
      label: 'Enforcement off — free premium without checkout',
    },
    {
      paymentsOn: true,
      enforcementOn: true,
      usersGetPremium: false,
      label: 'Both on — subscription required for premium',
    },
  ];

  return combos.map((row) => ({
    ...row,
    isCurrent:
      snapshot.ready &&
      row.paymentsOn === snapshot.paymentsEnabled &&
      row.enforcementOn === snapshot.premiumEnforcementEnabled,
  }));
};

export const isPremiumTestingAccessOpen = (
  paymentCollection: PaymentCollectionConfig,
  premiumAccess: PaymentCollectionConfig,
): boolean => {
  const paymentsPaused =
    paymentCollection.source !== 'fallback' && !paymentCollection.enabled;
  const enforcementOff =
    premiumAccess.source !== 'fallback' && !premiumAccess.enabled;
  return paymentsPaused || enforcementOff;
};
