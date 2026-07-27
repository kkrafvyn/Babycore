import { APP_PRODUCTION_ORIGIN } from './app-domain';

export const APP_DISPLAY_NAME = 'Cradlyn';
export const APP_PRODUCT_NAME = 'Cradlyn';
export const APP_LOGO_SRC = '/logo.svg';

export const getClientAppName = (): string =>
  String(import.meta.env.VITE_APP_NAME || APP_DISPLAY_NAME).trim() || APP_DISPLAY_NAME;

export const getClientProductName = (): string =>
  String(import.meta.env.VITE_APP_PRODUCT_NAME || APP_PRODUCT_NAME).trim() || APP_PRODUCT_NAME;

export const getClientLogoSrc = (): string => APP_LOGO_SRC;

export const getClientAppBaseUrl = (): string => {
  const configured = String(import.meta.env.VITE_APP_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return APP_PRODUCTION_ORIGIN;
};

export const clientAppPath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getClientAppBaseUrl()}${normalizedPath}`;
};

export const getDeleteAccountUrl = (): string => clientAppPath('/delete-account');
