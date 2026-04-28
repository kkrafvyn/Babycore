export type ScheduledPaymentRecoveryStatus = 'retry_scheduled' | 'abandoned';

export type ScheduledPaymentRetryPlan = {
  retryCount: number;
  delayMinutes: number | null;
  nextRetryAt: string | null;
  recoveryStatus: ScheduledPaymentRecoveryStatus;
};

const PAYMENT_RETRY_DELAYS_MINUTES = [30, 60, 180, 360, 720] as const;

export const MAX_AUTOMATED_PAYMENT_RETRIES = PAYMENT_RETRY_DELAYS_MINUTES.length;

export const getPaymentRetryDelayMinutes = (retryCount: number): number => {
  const normalizedRetryCount = Math.max(1, Math.floor(retryCount || 0));
  const delayIndex = Math.min(
    normalizedRetryCount - 1,
    PAYMENT_RETRY_DELAYS_MINUTES.length - 1,
  );
  return PAYMENT_RETRY_DELAYS_MINUTES[delayIndex];
};

export const planNextPaymentRetry = (
  retryCount: number,
  now: number | string | Date = Date.now(),
): ScheduledPaymentRetryPlan => {
  const normalizedRetryCount = Math.max(1, Math.floor(retryCount || 0));
  if (normalizedRetryCount >= MAX_AUTOMATED_PAYMENT_RETRIES) {
    return {
      retryCount: normalizedRetryCount,
      delayMinutes: null,
      nextRetryAt: null,
      recoveryStatus: 'abandoned',
    };
  }

  const delayMinutes = getPaymentRetryDelayMinutes(normalizedRetryCount);
  const nowMs =
    typeof now === 'number' ? now : new Date(now).getTime();

  return {
    retryCount: normalizedRetryCount,
    delayMinutes,
    nextRetryAt: new Date(nowMs + delayMinutes * 60 * 1000).toISOString(),
    recoveryStatus: 'retry_scheduled',
  };
};
