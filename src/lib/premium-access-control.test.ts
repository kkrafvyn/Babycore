import { describe, expect, it } from 'vitest';

import {
  buildPremiumAccessMatrix,
  isPremiumTestingAccessOpen,
  resolveUserPremiumAccessSnapshot,
} from './premium-access-control';
import {
  DEFAULT_PAYMENT_COLLECTION_CONFIG,
  DEFAULT_PREMIUM_ACCESS_CONFIG,
} from './payment-config';

describe('premium-access-control', () => {
  it('grants free premium when payments are paused', () => {
    const snapshot = resolveUserPremiumAccessSnapshot(
      { ...DEFAULT_PAYMENT_COLLECTION_CONFIG, enabled: false, source: 'database' },
      { ...DEFAULT_PREMIUM_ACCESS_CONFIG, enabled: true, source: 'database' },
    );

    expect(snapshot.usersGetFreePremium).toBe(true);
    expect(snapshot.headline).toContain('without paying');
  });

  it('requires a plan only when payments and enforcement are both on', () => {
    const snapshot = resolveUserPremiumAccessSnapshot(
      { ...DEFAULT_PAYMENT_COLLECTION_CONFIG, enabled: true, source: 'database' },
      { ...DEFAULT_PREMIUM_ACCESS_CONFIG, enabled: true, source: 'database' },
    );

    expect(snapshot.usersGetFreePremium).toBe(false);
    expect(snapshot.statusLabel).toBe('Plan required');
  });

  it('marks the current matrix row', () => {
    const snapshot = resolveUserPremiumAccessSnapshot(
      { ...DEFAULT_PAYMENT_COLLECTION_CONFIG, enabled: false, source: 'database' },
      { ...DEFAULT_PREMIUM_ACCESS_CONFIG, enabled: false, source: 'database' },
    );

    const matrix = buildPremiumAccessMatrix(snapshot);
    expect(matrix.filter((row) => row.isCurrent)).toHaveLength(1);
    expect(matrix.find((row) => row.isCurrent)?.usersGetPremium).toBe(true);
  });

  it('detects QA open access from live config', () => {
    expect(
      isPremiumTestingAccessOpen(
        { ...DEFAULT_PAYMENT_COLLECTION_CONFIG, enabled: false, source: 'database' },
        { ...DEFAULT_PREMIUM_ACCESS_CONFIG, enabled: true, source: 'database' },
      ),
    ).toBe(true);
  });
});
