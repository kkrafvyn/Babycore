let cloudPausedUntil = 0;
let lastCloudWarnAt = 0;

export const isCloudSyncPaused = (): boolean =>
  !navigator.onLine || Date.now() < cloudPausedUntil;

export const pauseCloudSync = (durationMs = 120_000): void => {
  cloudPausedUntil = Math.max(cloudPausedUntil, Date.now() + durationMs);
};

export const resumeCloudSync = (): void => {
  cloudPausedUntil = 0;
};

export const isTransientFetchError = (error: unknown): boolean => {
  const message = String(
    (error as { message?: string })?.message || error || '',
  ).toLowerCase();

  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('name_not_resolved') ||
    message.includes('err_name_not_resolved')
  );
};

export const warnCloudOnce = (label: string, error: unknown): void => {
  const now = Date.now();
  if (now - lastCloudWarnAt < 30_000) {
    return;
  }

  lastCloudWarnAt = now;
  console.warn(label, error);
};
