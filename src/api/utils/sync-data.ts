import {
  fromDiaperLogCloudRow,
  fromFeedLogCloudRow,
  fromGrowthMeasurementCloudRow,
  fromHealthLogCloudRow,
  fromJournalEntryCloudRow,
  fromMemoryLogCloudRow,
  fromMilestoneCloudRow,
  fromSleepLogCloudRow,
  fromUserSettingsCloudRow,
  fromVaccinationRecordCloudRow,
  isMissingUserSettingsOptionalColumnsError,
  toDiaperLogCloudRow,
  toFeedLogCloudRow,
  toGrowthMeasurementCloudRow,
  toHealthLogCloudRow,
  toJournalEntryCloudRow,
  toLegacyUserSettingsCloudRow,
  toMemoryLogCloudRow,
  toMilestoneCloudRow,
  toSleepLogCloudRow,
  toUserSettingsCloudRow,
  toVaccinationRecordCloudRow,
} from '../../lib/cloud-sync-mappers.js';
import type { UserSettings } from '../../types/index.js';

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const formatSyncError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      parts.push(candidate.message.trim());
    }

    if (typeof candidate.details === 'string' && candidate.details.trim()) {
      parts.push(candidate.details.trim());
    }

    if (typeof candidate.hint === 'string' && candidate.hint.trim()) {
      parts.push(`Hint: ${candidate.hint.trim()}`);
    }

    if (typeof candidate.code === 'string' && candidate.code.trim()) {
      parts.push(`Code: ${candidate.code.trim()}`);
    }

    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  return typeof error === 'string' && error.trim() ? error.trim() : 'Unknown sync error';
};

const resolveAccessibleBabyIds = async (supabaseAdmin: any, user: { id: string; email?: string }) => {
  const normalizedUserEmail = normalizeEmail(user.email);

  const [ownedBabies, inviteByUser, inviteByEmail, doctorAssignments] = await Promise.all([
    supabaseAdmin.from('babies').select('id').eq('user_id', user.id),
    supabaseAdmin
      .from('family_sharing_invites')
      .select('baby_id')
      .eq('accepted_by', user.id)
      .not('accepted_at', 'is', null),
    normalizedUserEmail
      ? supabaseAdmin
          .from('family_sharing_invites')
          .select('baby_id')
          .ilike('invited_email', normalizedUserEmail)
          .not('accepted_at', 'is', null)
      : Promise.resolve({ data: [], error: null } as any),
    supabaseAdmin
      .from('doctor_baby_assignments')
      .select('baby_id,status')
      .eq('doctor_id', user.id),
  ]);

  const queryErrors = [
    ownedBabies.error,
    inviteByUser.error,
    inviteByEmail.error,
    doctorAssignments.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    throw queryErrors[0];
  }

  const ownedIds = (ownedBabies.data || []).map((row: any) => row.id).filter(Boolean);
  const sharedSet = new Set<string>();

  for (const row of inviteByUser.data || []) {
    if (row?.baby_id) sharedSet.add(row.baby_id);
  }

  for (const row of inviteByEmail.data || []) {
    if (row?.baby_id) sharedSet.add(row.baby_id);
  }

  for (const row of doctorAssignments.data || []) {
    if (row?.baby_id && (!row?.status || row.status === 'active')) {
      sharedSet.add(row.baby_id);
    }
  }

  ownedIds.forEach((id: string) => sharedSet.delete(id));

  const sharedIds = Array.from(sharedSet);
  const allIds = Array.from(new Set([...ownedIds, ...sharedIds]));

  return { ownedIds, sharedIds, allIds };
};

const mapBabyRow = (row: any) => ({
  id: row.id,
  name: row.name,
  dateOfBirth: row.date_of_birth,
  gender: row.gender,
  photoUrl: row.photo_url || undefined,
  country: row.country || 'US',
  createdAt: row.created_at || new Date().toISOString(),
});

export const buildSyncSnapshot = async (supabaseAdmin: any, user: { id: string; email?: string }) => {
  const { allIds } = await resolveAccessibleBabyIds(supabaseAdmin, user);

  const { data: userSettingsRow, error: userSettingsError } = await supabaseAdmin
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (userSettingsError) {
    throw userSettingsError;
  }

  if (allIds.length === 0) {
    return {
      babies: [],
      sleepLogs: [],
      feedLogs: [],
      diaperLogs: [],
      healthLogs: [],
      growthMeasurements: [],
      vaccinationRecords: [],
      milestones: [],
      memories: [],
      journalEntries: [],
      careWorkspaceData: userSettingsRow?.care_workspace_data || null,
      userSettings: userSettingsRow ? fromUserSettingsCloudRow(userSettingsRow) : null,
    };
  }

  const babies = await supabaseAdmin.from('babies').select('*').in('id', allIds);
  if (babies.error) {
    throw babies.error;
  }

  const babyIds = (babies.data || []).map((baby: any) => baby.id);
  if (babyIds.length === 0) {
    return {
      babies: [],
      sleepLogs: [],
      feedLogs: [],
      diaperLogs: [],
      healthLogs: [],
      growthMeasurements: [],
      vaccinationRecords: [],
      milestones: [],
      memories: [],
      journalEntries: [],
      careWorkspaceData: userSettingsRow?.care_workspace_data || null,
      userSettings: userSettingsRow ? fromUserSettingsCloudRow(userSettingsRow) : null,
    };
  }

  const fetchByBabyIds = (table: string) => supabaseAdmin.from(table).select('*').in('baby_id', babyIds);

  const [
    sleepLogs,
    feedLogs,
    diaperLogs,
    healthLogs,
    growthMeasurements,
    vaccinationRecords,
    milestones,
    memories,
    journalEntries,
  ] = await Promise.all([
    fetchByBabyIds('sleep_logs'),
    fetchByBabyIds('feed_logs'),
    fetchByBabyIds('diaper_logs'),
    fetchByBabyIds('health_logs'),
    fetchByBabyIds('growth_measurements'),
    fetchByBabyIds('vaccination_records'),
    fetchByBabyIds('milestones'),
    fetchByBabyIds('memories'),
    fetchByBabyIds('journal_entries'),
  ]);

  const queryErrors = [
    sleepLogs.error,
    feedLogs.error,
    diaperLogs.error,
    healthLogs.error,
    growthMeasurements.error,
    vaccinationRecords.error,
    milestones.error,
    memories.error,
    journalEntries.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    throw queryErrors[0];
  }

  return {
    babies: (babies.data || []).map(mapBabyRow),
    sleepLogs: (sleepLogs.data || []).map((row: any) => fromSleepLogCloudRow(row)),
    feedLogs: (feedLogs.data || []).map((row: any) => fromFeedLogCloudRow(row)),
    diaperLogs: (diaperLogs.data || []).map((row: any) => fromDiaperLogCloudRow(row)),
    healthLogs: (healthLogs.data || []).map((row: any) => fromHealthLogCloudRow(row)),
    growthMeasurements: (growthMeasurements.data || []).map((row: any) =>
      fromGrowthMeasurementCloudRow(row),
    ),
    vaccinationRecords: (vaccinationRecords.data || []).map((row: any) =>
      fromVaccinationRecordCloudRow(row),
    ),
    milestones: (milestones.data || []).map((row: any) => fromMilestoneCloudRow(row)),
    memories: (memories.data || []).map((row: any) => fromMemoryLogCloudRow(row)),
    journalEntries: (journalEntries.data || []).map((row: any) => fromJournalEntryCloudRow(row)),
    careWorkspaceData: userSettingsRow?.care_workspace_data || null,
    userSettings: userSettingsRow ? fromUserSettingsCloudRow(userSettingsRow) : null,
  };
};

type TableSyncResult = {
  table: string;
  ok: boolean;
  error?: string;
};

const upsertTable = async (
  supabaseAdmin: any,
  table: string,
  rows: any[],
  options?: Record<string, unknown>,
): Promise<TableSyncResult> => {
  if (!rows.length) {
    return { table, ok: true };
  }

  const { error } = await supabaseAdmin.from(table).upsert(rows, options);
  if (error) {
    return { table, ok: false, error: formatSyncError(error) };
  }

  return { table, ok: true };
};

const upsertUserSettings = async (
  supabaseAdmin: any,
  userId: string,
  settings: UserSettings,
): Promise<TableSyncResult> => {
  const primaryRow = toUserSettingsCloudRow(userId, settings);
  let { error } = await supabaseAdmin
    .from('user_settings')
    .upsert([primaryRow], { onConflict: 'user_id' });

  if (error && isMissingUserSettingsOptionalColumnsError(error)) {
    ({ error } = await supabaseAdmin
      .from('user_settings')
      .upsert([toLegacyUserSettingsCloudRow(userId, settings)], { onConflict: 'user_id' }));
  }

  if (error) {
    return { table: 'user_settings', ok: false, error: formatSyncError(error) };
  }

  return { table: 'user_settings', ok: true };
};

export const applyFullSync = async (
  supabaseAdmin: any,
  user: { id: string; email?: string },
  localData: any,
) => {
  const payloadBabies = Array.isArray(localData?.babies) ? localData.babies : [];
  const payloadBabyIds = payloadBabies.map((baby: any) => String(baby?.id || '')).filter(Boolean);
  const existingOwnedBabies =
    payloadBabyIds.length > 0
      ? await supabaseAdmin.from('babies').select('id,user_id').in('id', payloadBabyIds)
      : ({ data: [], error: null } as any);

  if (existingOwnedBabies.error) {
    throw existingOwnedBabies.error;
  }

  const existingOwnership = new Map<string, string>();
  for (const row of existingOwnedBabies.data || []) {
    if (row?.id && row?.user_id) {
      existingOwnership.set(String(row.id), String(row.user_id));
    }
  }

  const babyRows = payloadBabies
    .filter((baby: any) => {
      const existingOwnerId = existingOwnership.get(String(baby?.id || ''));
      return !existingOwnerId || existingOwnerId === user.id;
    })
    .map((baby: any) => ({
      id: baby.id,
      user_id: user.id,
      name: baby.name,
      date_of_birth: baby.dateOfBirth,
      gender: baby.gender,
      photo_url: baby.photoUrl || null,
      country: baby.country,
      created_at: baby.createdAt,
    }));

  const babyResult = await upsertTable(supabaseAdmin, 'babies', babyRows, { onConflict: 'id' });

  const refreshedOwnedBabies = await supabaseAdmin.from('babies').select('id').eq('user_id', user.id);
  if (refreshedOwnedBabies.error) {
    throw refreshedOwnedBabies.error;
  }

  const ownedBabyIds = new Set<string>(
    (refreshedOwnedBabies.data || []).map((row: any) => String(row.id)).filter(Boolean),
  );

  const byOwnedBabyId = (rows: any[] | undefined, resolveBabyId: (row: any) => string) =>
    (Array.isArray(rows) ? rows : []).filter((row) => ownedBabyIds.has(resolveBabyId(row)));

  const settingsPayload = localData?.userSettings
    ? {
        ...localData.userSettings,
        careWorkspaceData:
          localData?.careWorkspaceData ?? localData.userSettings?.careWorkspaceData,
      }
    : localData?.careWorkspaceData
      ? {
          userId: user.id,
          units: 'metric',
          language: 'en',
          notificationsEnabled: true,
          updatedAt: new Date().toISOString(),
          careWorkspaceData: localData.careWorkspaceData,
        }
      : null;

  const settingsResult = settingsPayload
    ? await upsertUserSettings(supabaseAdmin, user.id, settingsPayload as UserSettings)
    : ({ table: 'user_settings', ok: true } as TableSyncResult);

  const dependentResults = await Promise.all([
    upsertTable(
      supabaseAdmin,
      'sleep_logs',
      byOwnedBabyId(localData?.sleepLogs, (row) => String(row?.babyId || '')).map((row: any) =>
        toSleepLogCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'feed_logs',
      byOwnedBabyId(localData?.feedLogs, (row) => String(row?.babyId || '')).map((row: any) =>
        toFeedLogCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'diaper_logs',
      byOwnedBabyId(localData?.diaperLogs, (row) => String(row?.babyId || '')).map((row: any) =>
        toDiaperLogCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'health_logs',
      byOwnedBabyId(localData?.healthLogs, (row) => String(row?.babyId || '')).map((row: any) =>
        toHealthLogCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'growth_measurements',
      byOwnedBabyId(localData?.growthMeasurements, (row) => String(row?.babyId || '')).map((row: any) =>
        toGrowthMeasurementCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'vaccination_records',
      byOwnedBabyId(localData?.vaccinationRecords, (row) => String(row?.babyId || '')).map((row: any) =>
        toVaccinationRecordCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'milestones',
      byOwnedBabyId(localData?.milestones, (row) => String(row?.babyId || '')).map((row: any) =>
        toMilestoneCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'memories',
      byOwnedBabyId(localData?.memories, (row) => String(row?.babyId || '')).map((row: any) =>
        toMemoryLogCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'journal_entries',
      byOwnedBabyId(localData?.journalEntries, (row) => String(row?.babyId || '')).map((row: any) =>
        toJournalEntryCloudRow(row),
      ),
      { onConflict: 'id' },
    ),
  ]);

  const results = [babyResult, settingsResult, ...dependentResults];
  const failedResults = results.filter((result) => !result.ok);

  return {
    success: failedResults.length === 0,
    results,
  };
};
