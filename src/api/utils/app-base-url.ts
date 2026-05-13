import type { Request } from 'express';

const APP_BASE_URL_ENV_KEYS = [
  'CLIENT_URL',
  'APP_URL',
  'SITE_URL',
  'PUBLIC_URL',
  'PUBLIC_APP_URL',
  'PUBLIC_WEB_ORIGIN',
  'DEPLOYMENT_URL',
  'DEPLOY_URL',
  'DEPLOY_PRIME_URL',
  'URL',
  'NETLIFY_URL',
  'CF_PAGES_URL',
  'RENDER_EXTERNAL_URL',
  'RAILWAY_PUBLIC_DOMAIN',
  'VERCEL_URL',
] as const;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const normalizeHostname = (value: string): string => value.replace(/^\[|\]$/g, '').trim().toLowerCase();

const isPrivateIpv4Host = (hostname: string): boolean => {
  const parts = hostname.split('.').map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((segment) => !Number.isInteger(segment) || segment < 0 || segment > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  return false;
};

const isLocalHostname = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  if (['localhost', '127.0.0.1', '::1'].includes(normalized)) {
    return true;
  }

  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) {
    return true;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) {
    return true;
  }

  return isPrivateIpv4Host(normalized);
};

const shouldTrustRequestOrigin = (): boolean =>
  TRUE_VALUES.has(String(process.env.TRUST_REQUEST_HOST_ORIGIN || '').trim().toLowerCase());

const normalizeUrl = (value: string, options?: { fallbackProtocol?: string; preservePath?: boolean }): string | null => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized);
  if (!hasProtocol && /[/?#]/.test(normalized)) {
    return null;
  }

  const candidate = hasProtocol ? normalized : `${options?.fallbackProtocol || 'https'}://${normalized}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    if (options?.preservePath) {
      return trimTrailingSlash(parsed.toString());
    }

    return trimTrailingSlash(parsed.origin);
  } catch {
    return null;
  }
};

const normalizeConfiguredUrl = (value?: string): string | null => {
  return normalizeUrl(String(value || ''), { fallbackProtocol: 'https', preservePath: true });
};

const getHeaderValue = (req: Pick<Request, 'get' | 'headers'>, headerName: string): string => {
  const direct = typeof req.get === 'function' ? req.get(headerName) : undefined;
  if (direct) {
    return String(direct).trim();
  }

  const raw = req.headers?.[headerName.toLowerCase()];
  if (Array.isArray(raw)) {
    return String(raw[0] || '').trim();
  }

  return String(raw || '').trim();
};

export const resolveConfiguredAppBaseUrl = (): string | null => {
  for (const envKey of APP_BASE_URL_ENV_KEYS) {
    const configuredUrl = normalizeConfiguredUrl(process.env[envKey]);
    if (configuredUrl) {
      return configuredUrl;
    }
  }

  return null;
};

export const resolveClientAppBaseUrl = (
  req: Pick<Request, 'get' | 'headers'> & Partial<Pick<Request, 'protocol'>>,
): string => {
  const configuredUrl = resolveConfiguredAppBaseUrl();
  if (configuredUrl) {
    return configuredUrl;
  }

  const origin = getHeaderValue(req, 'origin');
  const normalizedOrigin = normalizeUrl(origin, { preservePath: false });
  if (
    normalizedOrigin &&
    (shouldTrustRequestOrigin() || isLocalHostname(new URL(normalizedOrigin).hostname))
  ) {
    return normalizedOrigin;
  }

  const forwardedProto = getHeaderValue(req, 'x-forwarded-proto').split(',')[0]?.trim();
  const forwardedHost = getHeaderValue(req, 'x-forwarded-host').split(',')[0]?.trim();
  const host = forwardedHost || getHeaderValue(req, 'host');
  const protocol = forwardedProto || String(req.protocol || '').trim() || 'https';

  if (host) {
    const normalizedHostUrl = normalizeUrl(host, {
      fallbackProtocol: protocol === 'http' || protocol === 'https' ? protocol : 'https',
      preservePath: false,
    });

    if (
      normalizedHostUrl &&
      (shouldTrustRequestOrigin() || isLocalHostname(new URL(normalizedHostUrl).hostname))
    ) {
      return normalizedHostUrl;
    }
  }

  console.warn(
    'resolveClientAppBaseUrl(): falling back to localhost because no trusted app base URL is configured.',
  );
  return 'http://localhost:5173';
};
