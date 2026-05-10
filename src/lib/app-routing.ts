export type PublicRoute = 'welcome' | 'onboarding' | 'login' | 'policies';

export const PUBLIC_ROUTE_PATHS: Record<PublicRoute, string> = {
  welcome: '/',
  onboarding: '/onboarding',
  login: '/login',
  policies: '/policies',
};

export const APP_VIEWS = [
  'dashboard',
  'journal',
  'logs',
  'growth',
  'settings',
  'feeding',
  'sleep',
  'diaper',
  'vaccination',
  'export',
  'partner-sync',
  'health',
  'memories',
  'timeline',
  'insights',
  'predictor',
  'tips',
  'photos',
  'report',
  'handoff',
  'baby-journal',
  'sleep-training',
  'white-noise',
  'achievements',
  'reminders',
  'compare',
  'scrapbook',
  'health-alerts',
  'photo-gallery',
  'advanced-analytics',
  'ai-insights',
  'subscriptions',
  'health-records',
  'community',
  'content-library',
  'wearable',
  'family-sharing',
  'patients',
  'voice-logging',
  'doctor-reports',
  'care-priority',
  'parent-wellness',
  'activity-center',
  'emergency-card',
  'clinic-panel',
  'sync-center',
  'payment',
  'admin',
] as const;

export type AppView = (typeof APP_VIEWS)[number];

export const APP_VIEW_PATHS: Record<AppView, string> = APP_VIEWS.reduce((acc, view) => {
  acc[view] = `/${view}`;
  return acc;
}, {} as Record<AppView, string>);

export const normalizePathname = (pathname: string): string => {
  const normalized = pathname.trim().toLowerCase().replace(/\/+$/, '');
  return normalized || '/';
};

export const isAppView = (value: string): value is AppView =>
  APP_VIEWS.includes(value as AppView);

export const getPublicRouteFromPathname = (pathname: string): PublicRoute | null => {
  const normalizedPath = normalizePathname(pathname);
  const match = (Object.entries(PUBLIC_ROUTE_PATHS) as Array<[PublicRoute, string]>).find(
    ([, routePath]) => normalizePathname(routePath) === normalizedPath,
  );

  return match?.[0] || null;
};

export const getEmergencyShareTokenFromPathname = (pathname: string): string | null => {
  const normalizedPath = normalizePathname(pathname);
  const match = normalizedPath.match(/^\/emergency-card\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export const resolveAppViewIntent = (value: string): AppView | null => {
  const normalizedValue = normalizePathname(value);
  if (normalizedValue === '/') {
    return null;
  }

  const directCandidate = normalizedValue.replace(/^\/+/, '');
  if (isAppView(directCandidate)) {
    return directCandidate;
  }

  if (directCandidate.startsWith('app/')) {
    const nestedCandidate = directCandidate.slice(4);
    if (isAppView(nestedCandidate)) {
      return nestedCandidate;
    }
  }

  return getAppViewFromPathname(normalizedValue);
};

export const getAppViewFromPathname = (pathname: string): AppView | null => {
  const normalizedPath = normalizePathname(pathname);

  const directMatch = (Object.entries(APP_VIEW_PATHS) as Array<[AppView, string]>).find(
    ([, viewPath]) => normalizePathname(viewPath) === normalizedPath,
  );
  if (directMatch) {
    return directMatch[0];
  }

  if (normalizedPath === '/app') {
    return 'dashboard';
  }

  if (normalizedPath.startsWith('/app/')) {
    const candidateView = normalizedPath.replace('/app/', '');
    if (isAppView(candidateView)) {
      return candidateView;
    }
  }

  return null;
};

export const getPublicRoutePath = (route: PublicRoute): string => PUBLIC_ROUTE_PATHS[route];
export const getAppViewPath = (view: AppView): string => APP_VIEW_PATHS[view];
