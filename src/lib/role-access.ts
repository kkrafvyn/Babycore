import type { AppView } from './app-routing';

export type AppUserRole = 'admin' | 'manager' | 'user' | 'doctor' | 'caregiver' | 'viewer';
export type RoleAccessBlockReason = 'read_only' | 'premium';

export interface RoleAccessDecision {
  allowed: boolean;
  reason?: RoleAccessBlockReason;
}

export interface AppViewAccessInput {
  role?: string | null;
  view: AppView;
  hasPremiumAccess?: boolean;
  premiumFeature?: unknown;
}

export const VIEWER_READ_ONLY_VIEWS = [
  'dashboard',
  'logs',
  'growth',
  'settings',
  'memories',
  'timeline',
  'insights',
  'tips',
  'photos',
  'report',
  'baby-journal',
  'photo-gallery',
  'health-records',
  'family-sharing',
  'patients',
  'doctor-reports',
  'emergency-card',
  'sync-center',
] as const satisfies readonly AppView[];

export const ROLE_DEFAULT_WORKSPACES: Record<AppUserRole, AppView> = {
  admin: 'admin',
  manager: 'manager',
  user: 'dashboard',
  doctor: 'clinic-panel',
  caregiver: 'patients',
  viewer: 'dashboard',
};

const VIEWER_READ_ONLY_VIEW_SET = new Set<AppView>(VIEWER_READ_ONLY_VIEWS);

export const normalizeAppUserRole = (role?: string | null): AppUserRole => {
  if (
    role === 'admin' ||
    role === 'manager' ||
    role === 'doctor' ||
    role === 'caregiver' ||
    role === 'viewer'
  ) {
    return role;
  }

  return 'user';
};

export const isReadOnlyViewerRole = (role?: string | null): boolean =>
  normalizeAppUserRole(role) === 'viewer';

export const isViewerAllowedView = (view: AppView): boolean => VIEWER_READ_ONLY_VIEW_SET.has(view);

export const getRoleDefaultWorkspace = (role?: string | null): AppView =>
  ROLE_DEFAULT_WORKSPACES[normalizeAppUserRole(role)];

export const canOpenAppViewForRole = ({
  role,
  view,
  hasPremiumAccess = false,
  premiumFeature,
}: AppViewAccessInput): RoleAccessDecision => {
  if (isReadOnlyViewerRole(role) && !isViewerAllowedView(view)) {
    return { allowed: false, reason: 'read_only' };
  }

  if (premiumFeature && !hasPremiumAccess) {
    return { allowed: false, reason: 'premium' };
  }

  return { allowed: true };
};
