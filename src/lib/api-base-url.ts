const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');
const loggedWarnings = new Set<string>();

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

const shouldIgnoreCrossOriginConfiguredUrl = (
  sanitizedUrl: string,
  appOrigin: string,
  hostname: string,
): boolean => {
  if (sanitizedUrl.startsWith('/')) {
    return false;
  }

  try {
    const parsed = new URL(sanitizedUrl);
    const runningOnVercelPreviewOrProd = hostname.endsWith('vercel.app');
    return runningOnVercelPreviewOrProd && parsed.origin !== appOrigin;
  } catch {
    return false;
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

export const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const configuredProductionBaseUrl = import.meta.env.VITE_API_BASE_URL_PROD || '';

  if (typeof window !== 'undefined') {
    const appIsLocal = isLocalHost(window.location.hostname);
    const appOrigin = window.location.origin;
    const currentHostname = window.location.hostname.toLowerCase();

    if (!appIsLocal && configuredProductionBaseUrl) {
      const safeProductionBaseUrl = sanitizeConfiguredBaseUrl(configuredProductionBaseUrl, appIsLocal);
      if (safeProductionBaseUrl) {
        if (shouldIgnoreCrossOriginConfiguredUrl(safeProductionBaseUrl, appOrigin, currentHostname)) {
          warnOnce(
            `Ignoring cross-origin production API base URL "${safeProductionBaseUrl}" in favor of same-origin /api.`,
          );
        } else {
          return safeProductionBaseUrl;
        }
      }
    }

    const safeConfiguredBaseUrl = sanitizeConfiguredBaseUrl(configuredBaseUrl, appIsLocal);
    if (safeConfiguredBaseUrl) {
      if (shouldIgnoreCrossOriginConfiguredUrl(safeConfiguredBaseUrl, appOrigin, currentHostname)) {
        warnOnce(
          `Ignoring cross-origin API base URL "${safeConfiguredBaseUrl}" in favor of same-origin /api.`,
        );
      } else {
        return safeConfiguredBaseUrl;
      }
    }

    return '/api';
  }

  const safeServerBaseUrl =
    sanitizeConfiguredBaseUrl(configuredProductionBaseUrl, false) ||
    sanitizeConfiguredBaseUrl(configuredBaseUrl, false);

  return safeServerBaseUrl || '/api';
};
