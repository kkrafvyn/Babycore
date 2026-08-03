import { Capacitor } from '@capacitor/core';
import { APP_PRODUCTION_API_BASE_URL } from './app-domain';

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

/** Prefer www host so native clients avoid apex 308 redirects that break fetch/CORS. */
export const normalizeHostedApiBaseUrl = (value: string): string => {
  const normalized = normalizeBaseUrl(value.trim());
  if (!normalized.startsWith('http')) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === 'cradlyn.com') {
      parsed.hostname = 'www.cradlyn.com';
    }
    return normalizeBaseUrl(parsed.toString());
  } catch {
    return normalized;
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

    return normalizeHostedApiBaseUrl(parsed.toString());
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

export const resolveApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  let normalized = path.startsWith('/') ? path : `/${path}`;

  // Callers may pass either `/ml/...` or legacy `/api/ml/...`.
  if (normalized.startsWith('/api/')) {
    normalized = normalized.slice(4);
  } else if (normalized === '/api') {
    normalized = '';
  }

  return `${base}${normalized}`;
};

export const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const configuredProductionBaseUrl = import.meta.env.VITE_API_BASE_URL_PROD || '';
  const configuredNativeBaseUrl = import.meta.env.VITE_NATIVE_API_BASE_URL || '';
  const configuredAppUrl = import.meta.env.VITE_APP_URL || '';

  if (typeof window !== 'undefined') {
    if (isNativeRuntime()) {
      const safeNativeBaseUrl =
        sanitizeNativeBaseUrl(configuredNativeBaseUrl) ||
        sanitizeNativeBaseUrl(configuredProductionBaseUrl) ||
        sanitizeNativeBaseUrl(configuredBaseUrl) ||
        (configuredAppUrl
          ? sanitizeNativeBaseUrl(`${configuredAppUrl.replace(/\/$/, '')}/api`)
          : undefined);

      if (safeNativeBaseUrl) {
        return safeNativeBaseUrl;
      }

      return APP_PRODUCTION_API_BASE_URL;
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
