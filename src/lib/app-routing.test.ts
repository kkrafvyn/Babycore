import { describe, expect, it } from 'vitest';

import {
  getEmergencyShareTokenFromPathname,
  getPublicRouteFromPathname,
  resolveAppViewIntent,
} from './app-routing';

describe('app-routing', () => {
  it('resolves app views from plain names and slash-prefixed deep links', () => {
    expect(resolveAppViewIntent('dashboard')).toBe('dashboard');
    expect(resolveAppViewIntent('/emergency-card')).toBe('emergency-card');
    expect(resolveAppViewIntent('/app/sync-center')).toBe('sync-center');
    expect(resolveAppViewIntent('/app/expenses')).toBe('expenses');
    expect(resolveAppViewIntent('/nutrition')).toBe('nutrition');
  });

  it('does not confuse public emergency share URLs with app views', () => {
    expect(resolveAppViewIntent('/emergency-card/share-token')).toBeNull();
    expect(getPublicRouteFromPathname('/')).toBe('welcome');
  });

  it('extracts public emergency share tokens from encoded paths', () => {
    expect(getEmergencyShareTokenFromPathname('/emergency-card/share%20token')).toBe('share token');
  });
});
