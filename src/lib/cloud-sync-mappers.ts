import type { HealthLog, UserSettings } from '../types';

type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function toHealthLogCloudRow(log: HealthLog) {
  return {
    id: log.id,
    baby_id: log.babyId,
    timestamp: log.timestamp,
    type: log.type,
    value: log.value,
    unit: log.unit,
    name: log.name,
    dose: log.dose,
    next_dose_at: log.nextDoseAt,
    notes: log.notes,
    created_at: log.createdAt,
  };
}

export function fromHealthLogCloudRow(row: any): HealthLog {
  return {
    id: row.id,
    babyId: row.baby_id,
    timestamp: row.timestamp,
    type: row.type,
    value: row.value ?? undefined,
    unit: row.unit ?? undefined,
    name: row.name ?? undefined,
    dose: row.dose ?? undefined,
    nextDoseAt: row.next_dose_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function toUserSettingsCloudRow(userId: string, settings: UserSettings) {
  return {
    user_id: userId,
    units: settings.units,
    language: settings.language ?? 'en',
    care_profile_preferences: settings.careProfilePreferences ?? {},
    care_workspace_data: settings.careWorkspaceData ?? {},
    notifications_enabled: settings.notificationsEnabled,
    feeding_interval: settings.feedingInterval ?? null,
    reminder_preferences: settings.reminderPreferences ?? {},
    quiet_hours_start: settings.quietHoursStart ?? null,
    quiet_hours_end: settings.quietHoursEnd ?? null,
    theme: settings.theme ?? 'system',
    subscription_plan: settings.subscriptionPlan ?? null,
    subscription_status: settings.subscriptionStatus ?? null,
    subscription_start_date: settings.subscriptionStartDate ?? null,
    subscription_end_date: settings.subscriptionEndDate ?? null,
    subscription_currency: settings.subscriptionCurrency ?? null,
    biometric_lock_enabled: settings.biometricLockEnabled ?? false,
    privacy_lock_delay: settings.privacyLockDelay ?? null,
    updated_at: settings.updatedAt,
  };
}

export function fromUserSettingsCloudRow(row: any): UserSettings {
  return {
    userId: row.user_id,
    units: row.units || 'metric',
    language: row.language || 'en',
    careProfilePreferences: isJsonRecord(row.care_profile_preferences)
      ? (row.care_profile_preferences as UserSettings['careProfilePreferences'])
      : undefined,
    careWorkspaceData: isJsonRecord(row.care_workspace_data)
      ? (row.care_workspace_data as UserSettings['careWorkspaceData'])
      : undefined,
    notificationsEnabled: row.notifications_enabled !== false,
    feedingInterval: row.feeding_interval ?? undefined,
    reminderPreferences: isJsonRecord(row.reminder_preferences)
      ? (row.reminder_preferences as UserSettings['reminderPreferences'])
      : undefined,
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined,
    theme: row.theme || 'system',
    subscriptionPlan: row.subscription_plan ?? undefined,
    subscriptionStatus: row.subscription_status ?? undefined,
    subscriptionStartDate: row.subscription_start_date ?? undefined,
    subscriptionEndDate: row.subscription_end_date ?? undefined,
    subscriptionCurrency: row.subscription_currency ?? undefined,
    biometricLockEnabled: row.biometric_lock_enabled ?? false,
    privacyLockDelay: row.privacy_lock_delay ?? undefined,
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}
