import type {
  DiaperLog,
  FeedLog,
  GrowthMeasurement,
  HealthLog,
  JournalEntry,
  MemoryLog,
  Milestone,
  SleepLog,
  UserSettings,
  VaccinationRecord,
} from '../types';

type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const USER_SETTINGS_OPTIONAL_COLUMNS = [
  'care_profile_preferences',
  'care_workspace_data',
] as const;

const getErrorCode = (error: unknown): string =>
  typeof (error as any)?.code === 'string' ? (error as any).code.trim() : '';

const getErrorText = (error: unknown): string =>
  String(
    (error as any)?.message || (error as any)?.details || (error as any)?.hint || error || '',
  ).toLowerCase();

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

const toCloudMilkType = (value?: FeedLog['bottleType'] | string | null): string | null => {
  if (!value) return null;
  return value === 'breast_milk' ? 'breast' : value;
};

const fromCloudMilkType = (value?: string | null): FeedLog['bottleType'] | undefined => {
  if (!value) return undefined;
  return value === 'breast' ? 'breast_milk' : (value as FeedLog['bottleType']);
};

export function toSleepLogCloudRow(log: SleepLog) {
  return {
    id: log.id,
    baby_id: log.babyId,
    start_time: log.startTime,
    end_time: log.endTime,
    duration: log.duration,
    notes: log.notes ?? null,
    created_at: log.createdAt,
  };
}

export function fromSleepLogCloudRow(row: any): SleepLog {
  return {
    id: row.id,
    babyId: row.baby_id,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function toFeedLogCloudRow(log: FeedLog) {
  return {
    id: log.id,
    baby_id: log.babyId,
    timestamp: log.timestamp,
    type: log.type,
    amount: log.bottleAmount ?? null,
    milk_type: toCloudMilkType(log.bottleType),
    food_description: log.solidDescription ?? null,
    notes: log.notes ?? null,
    created_at: log.createdAt,
    left_duration: log.breastLeft ? log.duration ?? 0 : 0,
    right_duration: log.breastRight ? log.duration ?? 0 : 0,
  };
}

export function fromFeedLogCloudRow(row: any): FeedLog {
  const leftDuration = Number(row.left_duration || 0);
  const rightDuration = Number(row.right_duration || 0);

  return {
    id: row.id,
    babyId: row.baby_id,
    timestamp: row.timestamp,
    type: row.type,
    duration: leftDuration || rightDuration || undefined,
    breastLeft: leftDuration > 0,
    breastRight: rightDuration > 0,
    bottleAmount: row.amount ?? undefined,
    bottleType: fromCloudMilkType(row.milk_type),
    solidDescription: row.food_description ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function toDiaperLogCloudRow(log: DiaperLog) {
  return {
    id: log.id,
    baby_id: log.babyId,
    timestamp: log.timestamp,
    type: log.type,
    notes: log.notes ?? null,
    created_at: log.createdAt,
  };
}

export function fromDiaperLogCloudRow(row: any): DiaperLog {
  return {
    id: row.id,
    babyId: row.baby_id,
    timestamp: row.timestamp,
    type: row.type,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function toGrowthMeasurementCloudRow(measurement: GrowthMeasurement) {
  return {
    id: measurement.id,
    baby_id: measurement.babyId,
    date: measurement.date,
    weight: measurement.weight ?? null,
    height: measurement.height ?? null,
    head_circumference: measurement.headCircumference ?? null,
    created_at: measurement.createdAt,
  };
}

export function fromGrowthMeasurementCloudRow(row: any): GrowthMeasurement {
  return {
    id: row.id,
    babyId: row.baby_id,
    date: row.date,
    weight: row.weight ?? undefined,
    height: row.height ?? undefined,
    headCircumference: row.head_circumference ?? undefined,
    createdAt: row.created_at,
  };
}

export function toVaccinationRecordCloudRow(record: VaccinationRecord) {
  return {
    id: record.id,
    baby_id: record.babyId,
    vaccine_name: record.name,
    due_date: record.dueDate,
    status: record.status,
    given_date: record.givenDate ?? null,
    notes: record.notes ?? null,
    created_at: record.createdAt,
  };
}

export function fromVaccinationRecordCloudRow(row: any): VaccinationRecord {
  return {
    id: row.id,
    babyId: row.baby_id,
    name: row.vaccine_name || row.name,
    dueDate: row.due_date,
    status: row.status,
    givenDate: row.given_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function toMilestoneCloudRow(milestone: Milestone) {
  return {
    id: milestone.id,
    baby_id: milestone.babyId,
    date: milestone.date,
    type: milestone.type,
    description: milestone.description,
    photo_url: milestone.photoUrl ?? null,
    notes: milestone.notes ?? null,
    created_at: milestone.createdAt,
  };
}

export function fromMilestoneCloudRow(row: any): Milestone {
  return {
    id: row.id,
    babyId: row.baby_id,
    date: row.date,
    type: row.type,
    description: row.description,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function toMemoryLogCloudRow(log: MemoryLog) {
  return {
    id: log.id,
    baby_id: log.babyId,
    timestamp: log.timestamp,
    text: log.text,
    photo_url: log.photoUrl ?? null,
    is_milestone: log.isMilestone ?? false,
    created_at: log.createdAt,
  };
}

export function fromMemoryLogCloudRow(row: any): MemoryLog {
  return {
    id: row.id,
    babyId: row.baby_id,
    timestamp: row.timestamp,
    text: row.text,
    photoUrl: row.photo_url ?? undefined,
    isMilestone: row.is_milestone ?? undefined,
    createdAt: row.created_at,
  };
}

export function toJournalEntryCloudRow(entry: JournalEntry) {
  return {
    id: entry.id,
    baby_id: entry.babyId,
    date: entry.date,
    prompt: entry.prompt,
    text: entry.text,
    mood: entry.mood ?? null,
    created_at: entry.createdAt,
  };
}

export function fromJournalEntryCloudRow(row: any): JournalEntry {
  return {
    id: row.id,
    babyId: row.baby_id,
    date: row.date,
    prompt: row.prompt,
    text: row.text,
    mood: row.mood ?? undefined,
    createdAt: row.created_at,
  };
}

export function toLegacyUserSettingsCloudRow(userId: string, settings: UserSettings) {
  const row = toUserSettingsCloudRow(userId, settings) as Record<string, unknown>;
  for (const column of USER_SETTINGS_OPTIONAL_COLUMNS) {
    delete row[column];
  }
  return row;
}

export function isMissingUserSettingsOptionalColumnsError(error: unknown): boolean {
  const code = getErrorCode(error);
  const text = getErrorText(error);

  return (
    (code === '42703' || code === 'PGRST204') &&
    USER_SETTINGS_OPTIONAL_COLUMNS.some((column) => text.includes(column))
  );
}

export function isMissingSupabaseRelationError(error: unknown, relationName: string): boolean {
  const code = getErrorCode(error);
  const text = getErrorText(error);
  const normalizedRelationName = relationName.toLowerCase();

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    text.includes(`relation "${normalizedRelationName}"`) ||
    text.includes(`table ${normalizedRelationName}`) ||
    text.includes(`table "${normalizedRelationName}"`) ||
    text.includes(`table '${normalizedRelationName}'`) ||
    text.includes(`public.${normalizedRelationName}`)
  );
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
