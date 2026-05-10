import { describe, expect, it } from 'vitest';
import type { UserSettings } from '../types';
import {
  fromHealthLogCloudRow,
  fromUserSettingsCloudRow,
  toHealthLogCloudRow,
  toUserSettingsCloudRow,
} from './cloud-sync-mappers';

describe('cloud-sync-mappers', () => {
  it('maps health logs to and from cloud rows', () => {
    const log = {
      id: 'log-1',
      babyId: 'baby-1',
      timestamp: '2026-04-28T10:00:00.000Z',
      type: 'temperature' as const,
      value: '37.2',
      unit: 'C',
      notes: 'After nap',
      createdAt: '2026-04-28T10:00:00.000Z',
    };

    expect(fromHealthLogCloudRow(toHealthLogCloudRow(log))).toEqual({
      ...log,
      name: undefined,
      dose: undefined,
      nextDoseAt: undefined,
    });
  });

  it('maps user settings to and from cloud rows', () => {
    const settings: UserSettings = {
      userId: 'user-1',
      units: 'metric' as const,
      language: 'en',
      careProfilePreferences: {
        childStage: 'infant' as const,
        feedingStyle: 'mixed' as const,
        carePriorities: ['feeding', 'sleep'],
        healthConsiderations: [],
        supportFocus: [],
      },
      notificationsEnabled: true,
      feedingInterval: 3,
      reminderPreferences: { feeding: true, quietHoursEnabled: true },
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      theme: 'system' as const,
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active' as const,
      subscriptionStartDate: '2026-04-01T00:00:00.000Z',
      subscriptionEndDate: '2026-05-01T00:00:00.000Z',
      subscriptionCurrency: 'USD',
      biometricLockEnabled: true,
      privacyLockDelay: 5,
      careWorkspaceData: {},
      updatedAt: '2026-04-28T11:00:00.000Z',
    };

    expect(fromUserSettingsCloudRow(toUserSettingsCloudRow('user-1', settings))).toEqual(settings);
  });
});
