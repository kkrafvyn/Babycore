export const getClientAppName = (): string =>
  String(import.meta.env.VITE_APP_NAME || 'BabyLog').trim() || 'BabyLog';

export const getClientAppBaseUrl = (): string => {
  const configured = String(import.meta.env.VITE_APP_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:5173';
};

export const clientAppPath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getClientAppBaseUrl()}${normalizedPath}`;
};
