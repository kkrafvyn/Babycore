import { describe, expect, it } from 'vitest';

import {
  buildEmergencyShareLocationSummary,
  calculateEmergencyShareTtlMinutes,
  formatEmergencyGrowthSummary,
  getEmergencyShareLinkStatus,
  normalizeEmergencySharePresetKey,
  resolveEmergencyShareDisplayName,
  summarizeEmergencyShareUserAgent,
} from './emergency-share-utils';

describe('emergency-share-utils', () => {
  it('hides the display name when demographics are excluded', () => {
    expect(resolveEmergencyShareDisplayName('Ava', ['allergies', 'medications'])).toBe('Baby');
    expect(resolveEmergencyShareDisplayName('Ava', ['demographics', 'allergies'])).toBe('Ava');
  });

  it('formats growth summaries consistently', () => {
    expect(
      formatEmergencyGrowthSummary({
        date: '2026-04-28',
        weight: 7.4,
        height: 66,
        head_circumference: 43,
      }),
    ).toBe('Date 2026-04-28 | W 7.4 | H 66 | HC 43');
  });

  it('normalizes preset keys and falls back to custom', () => {
    expect(normalizeEmergencySharePresetKey('travel')).toBe('travel');
    expect(normalizeEmergencySharePresetKey('CAREGIVER_HANDOFF')).toBe('caregiver_handoff');
    expect(normalizeEmergencySharePresetKey('unknown')).toBe('custom');
  });

  it('calculates ttl minutes from created and expiry timestamps', () => {
    expect(
      calculateEmergencyShareTtlMinutes('2026-04-28T10:00:00.000Z', '2026-04-28T13:00:00.000Z'),
    ).toBe(180);
    expect(
      calculateEmergencyShareTtlMinutes('2026-04-28T10:00:00.000Z', '2026-04-28T10:00:00.000Z'),
    ).toBeNull();
  });

  it('summarizes user agent and location details', () => {
    expect(
      summarizeEmergencyShareUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Mobile | Safari | iOS');
    expect(
      buildEmergencyShareLocationSummary({
        city: 'Seattle',
        region: 'WA',
        countryCode: 'US',
      }),
    ).toBe('Seattle, WA, US');
  });

  it('resolves share link lifecycle states', () => {
    expect(
      getEmergencyShareLinkStatus({
        expiresAt: '2026-04-28T11:00:00.000Z',
        now: '2026-04-28T10:00:00.000Z',
      }),
    ).toBe('active');
    expect(
      getEmergencyShareLinkStatus({
        revokedAt: '2026-04-28T09:00:00.000Z',
        now: '2026-04-28T10:00:00.000Z',
      }),
    ).toBe('revoked');
    expect(
      getEmergencyShareLinkStatus({
        expiresAt: '2026-04-28T09:00:00.000Z',
        now: '2026-04-28T10:00:00.000Z',
      }),
    ).toBe('expired');
    expect(
      getEmergencyShareLinkStatus({
        maxViews: 3,
        viewCount: 3,
        now: '2026-04-28T10:00:00.000Z',
      }),
    ).toBe('view_limit_reached');
  });
});
