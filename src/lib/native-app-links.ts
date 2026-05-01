import {
  getPublicRouteFromPathname,
  normalizePathname,
  resolveAppViewIntent,
  type AppView,
  type PublicRoute,
} from './app-routing';

export const NATIVE_APP_SCHEME = 'com.babylog.app';
const OPEN_HOSTS = new Set(['open', 'app', 'view']);

export interface ParsedNativeAppLink {
  url: string;
  canonicalPath: string;
  appView: AppView | null;
  publicRoute: PublicRoute | null;
  params: URLSearchParams;
}

const toCanonicalPath = (url: URL): string => {
  if (url.hostname === 'auth') {
    return normalizePathname(`/auth${url.pathname || ''}`);
  }

  if (OPEN_HOSTS.has(url.hostname)) {
    const requestedPath = url.pathname.trim().replace(/^\/+/, '');
    return normalizePathname(requestedPath ? `/${requestedPath}` : '/dashboard');
  }

  const parts = [url.hostname, url.pathname]
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');

  return normalizePathname(parts.startsWith('/') ? parts : `/${parts}`);
};

export const isNativeAppUrl = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === `${NATIVE_APP_SCHEME}:`;
  } catch {
    return false;
  }
};

export const parseNativeAppUrl = (value?: string | null): ParsedNativeAppLink | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== `${NATIVE_APP_SCHEME}:`) {
      return null;
    }

    const canonicalPath = toCanonicalPath(url);
    return {
      url: value,
      canonicalPath,
      appView: resolveAppViewIntent(canonicalPath),
      publicRoute: getPublicRouteFromPathname(canonicalPath),
      params: url.searchParams,
    };
  } catch {
    return null;
  }
};

export const buildNativeAppUrl = (
  route: AppView | PublicRoute | string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string => {
  const rawPath = route.startsWith('/') ? route : `/${route}`;
  const normalizedPath = normalizePathname(rawPath);
  const pathWithoutLeadingSlash = normalizedPath.replace(/^\/+/, '');
  const url = new URL(`${NATIVE_APP_SCHEME}://open/${pathWithoutLeadingSlash}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};
