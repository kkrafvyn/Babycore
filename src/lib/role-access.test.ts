import { describe, expect, it } from 'vitest';
import {
  canOpenAppViewForRole,
  getRoleDefaultWorkspace,
  isViewerAllowedView,
  normalizeAppUserRole,
} from './role-access';

describe('role-access', () => {
  it('routes each account role to its primary workspace', () => {
    expect(getRoleDefaultWorkspace('admin')).toBe('admin');
    expect(getRoleDefaultWorkspace('manager')).toBe('manager');
    expect(getRoleDefaultWorkspace('doctor')).toBe('clinic-panel');
    expect(getRoleDefaultWorkspace('caregiver')).toBe('patients');
    expect(getRoleDefaultWorkspace('user')).toBe('dashboard');
    expect(getRoleDefaultWorkspace('viewer')).toBe('dashboard');
  });

  it('normalizes unknown or missing roles to parent user access', () => {
    expect(normalizeAppUserRole('')).toBe('user');
    expect(normalizeAppUserRole('owner')).toBe('user');
    expect(normalizeAppUserRole(null)).toBe('user');
  });

  it('keeps viewer access read-only across the app', () => {
    expect(isViewerAllowedView('dashboard')).toBe(true);
    expect(isViewerAllowedView('logs')).toBe(true);
    expect(isViewerAllowedView('growth')).toBe(true);
    expect(isViewerAllowedView('health-records')).toBe(true);
    expect(isViewerAllowedView('feeding')).toBe(false);
    expect(isViewerAllowedView('sleep')).toBe(false);
    expect(isViewerAllowedView('diaper')).toBe(false);
    expect(isViewerAllowedView('vaccination')).toBe(false);
    expect(isViewerAllowedView('payment')).toBe(false);
    expect(isViewerAllowedView('admin')).toBe(false);
    expect(isViewerAllowedView('manager')).toBe(false);
  });

  it('blocks viewer write screens even when the view is not premium', () => {
    expect(
      canOpenAppViewForRole({
        role: 'viewer',
        view: 'feeding',
        hasPremiumAccess: true,
      }),
    ).toEqual({ allowed: false, reason: 'read_only' });
  });

  it('opens premium routes while package enforcement is disabled for QA', () => {
    expect(
      canOpenAppViewForRole({
        role: 'user',
        view: 'ai-insights',
        premiumFeature: 'aiInsights',
        hasPremiumAccess: false,
      }),
    ).toEqual({ allowed: false, reason: 'premium' });

    expect(
      canOpenAppViewForRole({
        role: 'user',
        view: 'ai-insights',
        premiumFeature: 'aiInsights',
        hasPremiumAccess: true,
      }),
    ).toEqual({ allowed: true });
  });

  it('lets admin, manager, doctor, caregiver, and parent roles open their workspaces', () => {
    expect(canOpenAppViewForRole({ role: 'admin', view: 'admin' })).toEqual({ allowed: true });
    expect(canOpenAppViewForRole({ role: 'manager', view: 'manager' })).toEqual({ allowed: true });
    expect(canOpenAppViewForRole({ role: 'doctor', view: 'clinic-panel' })).toEqual({ allowed: true });
    expect(canOpenAppViewForRole({ role: 'caregiver', view: 'patients' })).toEqual({ allowed: true });
    expect(canOpenAppViewForRole({ role: 'user', view: 'dashboard' })).toEqual({ allowed: true });
  });
});
