import { describe, expect, it } from 'vitest';
import type { UserSettings } from '../types';
import {
  fromHealthLogCloudRow,
  fromUserSettingsCloudRow,
  isMissingSupabaseRelationError,
  isMissingUserSettingsOptionalColumnsError,
  toHealthLogCloudRow,
  toLegacyUserSettingsCloudRow,
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

  it('can build a legacy-safe user settings row without optional sync columns', () => {
    const settings: UserSettings = {
      userId: 'user-1',
      units: 'metric',
      language: 'en',
      careProfilePreferences: {
        childStage: 'infant',
        feedingStyle: 'mixed',
        carePriorities: ['feeding'],
        healthConsiderations: [],
        supportFocus: [],
      },
      notificationsEnabled: true,
      careWorkspaceData: { sharedCareTasks: [] },
      updatedAt: '2026-04-28T11:00:00.000Z',
    };

    expect(toLegacyUserSettingsCloudRow('user-1', settings)).toEqual({
      user_id: 'user-1',
      units: 'metric',
      language: 'en',
      notifications_enabled: true,
      feeding_interval: null,
      reminder_preferences: {},
      quiet_hours_start: null,
      quiet_hours_end: null,
      theme: 'system',
      subscription_plan: null,
      subscription_status: null,
      subscription_start_date: null,
      subscription_end_date: null,
      subscription_currency: null,
      biometric_lock_enabled: false,
      privacy_lock_delay: null,
      updated_at: '2026-04-28T11:00:00.000Z',
    });
  });

  it('detects missing optional user settings columns from Supabase errors', () => {
    expect(
      isMissingUserSettingsOptionalColumnsError({
        code: 'PGRST204',
        message:
          "Could not find the 'care_profile_preferences' column of 'user_settings' in the schema cache",
      }),
    ).toBe(true);

    expect(
      isMissingUserSettingsOptionalColumnsError({
        code: '42703',
        message: 'column user_settings.care_workspace_data does not exist',
      }),
    ).toBe(true);
  });

  it('detects missing relation errors from Supabase schema cache responses', () => {
    expect(
      isMissingSupabaseRelationError(
        {
          code: 'PGRST205',
          message: "Could not find the table 'public.shared_care_workspaces' in the schema cache",
        },
        'shared_care_workspaces',
      ),
    ).toBe(true);
  });
});
