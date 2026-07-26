import type { Request } from 'express';

import { APP_PRODUCTION_ORIGIN, APP_SUPPORT_EMAIL } from '../../lib/app-domain.js';
import { resolveClientAppBaseUrl, resolveConfiguredAppBaseUrl } from './app-base-url.js';

export type EmailBranding = {
  appName: string;
  productName: string;
  baseUrl: string;
  privacyUrl: string;
  termsUrl: string;
  contactUrl: string;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const normalizeUrl = (value: string, fallbackProtocol = 'https'): string | null => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)
    ? normalized
    : `${fallbackProtocol}://${normalized}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return trimTrailingSlash(parsed.toString());
  } catch {
    return null;
  }
};

export const APP_DISPLAY_NAME = 'Cradlyn';
export const APP_PRODUCT_NAME = 'Cradlyn';

export const resolveAppDisplayName = (): string =>
  String(process.env.APP_NAME || process.env.VITE_APP_NAME || APP_DISPLAY_NAME).trim() ||
  APP_DISPLAY_NAME;

export const resolveAppProductName = (): string =>
  String(process.env.APP_PRODUCT_NAME || process.env.VITE_APP_PRODUCT_NAME || APP_PRODUCT_NAME).trim() ||
  APP_PRODUCT_NAME;

export const resolveAppBaseUrl = (req?: Pick<Request, 'get' | 'headers' | 'protocol'>): string => {
  const configured = resolveConfiguredAppBaseUrl();
  if (configured) {
    return configured;
  }

  if (req) {
    return resolveClientAppBaseUrl(req);
  }

  return normalizeUrl(String(process.env.VITE_APP_URL || process.env.CLIENT_URL || ''), 'https') ||
    APP_PRODUCTION_ORIGIN;
};

export const resolveEmailBranding = (
  overrides?: Partial<EmailBranding> & { req?: Pick<Request, 'get' | 'headers' | 'protocol'> },
): EmailBranding => {
  const baseUrl = trimTrailingSlash(overrides?.baseUrl || resolveAppBaseUrl(overrides?.req));
  const contactFromEnv =
    normalizeUrl(String(process.env.APP_CONTACT_URL || process.env.SUPPORT_URL || ''), 'https') ||
    normalizeUrl(String(process.env.VAPID_SUBJECT || '').replace(/^mailto:/i, ''), 'mailto') ||
    `mailto:${String(process.env.SUPPORT_EMAIL || process.env.VITE_SUPPORT_EMAIL || APP_SUPPORT_EMAIL).trim()}`;

  return {
    appName: overrides?.appName || resolveAppDisplayName(),
    productName: overrides?.productName || resolveAppProductName(),
    baseUrl,
    privacyUrl: overrides?.privacyUrl || `${baseUrl}/policies#privacy-policy`,
    termsUrl: overrides?.termsUrl || `${baseUrl}/policies#terms-of-service`,
    contactUrl: overrides?.contactUrl || contactFromEnv,
  };
};

export const appPath = (baseUrl: string, path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimTrailingSlash(baseUrl)}${normalizedPath}`;
};
