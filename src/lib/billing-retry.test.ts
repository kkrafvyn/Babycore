import { describe, expect, it } from 'vitest';

import {
  MAX_AUTOMATED_PAYMENT_RETRIES,
  getPaymentRetryDelayMinutes,
  planNextPaymentRetry,
} from './billing-retry';

describe('billing-retry', () => {
  it('uses stepped delays for retry attempts', () => {
    expect(getPaymentRetryDelayMinutes(1)).toBe(30);
    expect(getPaymentRetryDelayMinutes(2)).toBe(60);
    expect(getPaymentRetryDelayMinutes(3)).toBe(180);
  });

  it('schedules the next retry before the automated limit', () => {
    const plan = planNextPaymentRetry(2, '2026-04-28T10:00:00.000Z');

    expect(plan.retryCount).toBe(2);
    expect(plan.delayMinutes).toBe(60);
    expect(plan.nextRetryAt).toBe('2026-04-28T11:00:00.000Z');
    expect(plan.recoveryStatus).toBe('retry_scheduled');
  });

  it('abandons retries at the automated cap', () => {
    const plan = planNextPaymentRetry(MAX_AUTOMATED_PAYMENT_RETRIES, '2026-04-28T10:00:00.000Z');

    expect(plan.delayMinutes).toBeNull();
    expect(plan.nextRetryAt).toBeNull();
    expect(plan.recoveryStatus).toBe('abandoned');
  });
});
