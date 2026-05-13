import { Capacitor } from '@capacitor/core';

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');
const loggedWarnings = new Set<string>();
const isNativeRuntime = (): boolean => typeof window !== 'undefined' && Capacitor.isNativePlatform();

const shouldLogRuntimeWarning = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  return Boolean(import.meta.env.DEV) || isLocalHost(window.location.hostname);
};

const warnOnce = (message: string): void => {
  if (loggedWarnings.has(message)) {
    return;
  }

  loggedWarnings.add(message);
  if (shouldLogRuntimeWarning()) {
    console.warn(message);
  }
};

const sanitizeConfiguredBaseUrl = (
  configuredUrl: string,
  appIsLocal: boolean,
): string | undefined => {
  const trimmed = configuredUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('/')) {
    return normalizeBaseUrl(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    const pointsToLocalHost = isLocalHost(parsed.hostname);

    if (!appIsLocal && pointsToLocalHost) {
      warnOnce(
        `Ignoring local API base URL "${configuredUrl}" because app is running on a non-local host.`,
      );
      return undefined;
    }

    return normalizeBaseUrl(parsed.toString());
  } catch {
    warnOnce(`Invalid API base URL ignored: "${configuredUrl}"`);
    return undefined;
  }
};

const sanitizeNativeBaseUrl = (configuredUrl: string): string | undefined => {
  const sanitized = sanitizeConfiguredBaseUrl(configuredUrl, false);
  if (!sanitized) {
    return undefined;
  }

  if (sanitized.startsWith('/')) {
    warnOnce(
      `Ignoring native API base URL "${configuredUrl}" because bundled native apps require an absolute hosted API URL.`,
    );
    return undefined;
  }

  return sanitized;
};

export const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const configuredProductionBaseUrl = import.meta.env.VITE_API_BASE_URL_PROD || '';
  const configuredNativeBaseUrl = import.meta.env.VITE_NATIVE_API_BASE_URL || '';

  if (typeof window !== 'undefined') {
    if (isNativeRuntime()) {
      const safeNativeBaseUrl =
        sanitizeNativeBaseUrl(configuredNativeBaseUrl) ||
        sanitizeNativeBaseUrl(configuredProductionBaseUrl) ||
        sanitizeNativeBaseUrl(configuredBaseUrl);

      if (safeNativeBaseUrl) {
        return safeNativeBaseUrl;
      }

      warnOnce(
        'Native app is falling back to "/api". Set VITE_NATIVE_API_BASE_URL to your hosted API root for production mobile builds.',
      );
      return '/api';
    }

    const appIsLocal = isLocalHost(window.location.hostname);

    if (!appIsLocal && configuredProductionBaseUrl) {
      const safeProductionBaseUrl = sanitizeConfiguredBaseUrl(configuredProductionBaseUrl, appIsLocal);
      if (safeProductionBaseUrl) {
        return safeProductionBaseUrl;
      }
    }

    const safeConfiguredBaseUrl = sanitizeConfiguredBaseUrl(configuredBaseUrl, appIsLocal);
    if (safeConfiguredBaseUrl) {
      return safeConfiguredBaseUrl;
    }

    return '/api';
  }

  const safeServerBaseUrl =
    sanitizeConfiguredBaseUrl(configuredProductionBaseUrl, false) ||
    sanitizeConfiguredBaseUrl(configuredBaseUrl, false);

  return safeServerBaseUrl || '/api';
};
