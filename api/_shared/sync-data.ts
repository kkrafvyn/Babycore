import {
  fromHealthLogCloudRow,
  fromUserSettingsCloudRow,
  toHealthLogCloudRow,
  toUserSettingsCloudRow,
} from '../../src/lib/cloud-sync-mappers.js';
import type { UserSettings } from '../../src/types/index.js';

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
    sleepLogs: (sleepLogs.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    feedLogs: (feedLogs.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      timestamp: row.timestamp,
      type: row.type,
      duration: row.left_duration || row.right_duration || 0,
      breastLeft: !!row.left_duration,
      breastRight: !!row.right_duration,
      bottleAmount: row.amount,
      bottleType: row.milk_type,
      solidDescription: row.food_description,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    diaperLogs: (diaperLogs.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      timestamp: row.timestamp,
      type: row.type,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    healthLogs: (healthLogs.data || []).map((row: any) => fromHealthLogCloudRow(row)),
    growthMeasurements: (growthMeasurements.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      date: row.date,
      weight: row.weight,
      height: row.height,
      headCircumference: row.head_circumference,
      createdAt: row.created_at,
    })),
    vaccinationRecords: (vaccinationRecords.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      name: row.vaccine_name || row.name,
      dueDate: row.due_date,
      status: row.status,
      givenDate: row.given_date,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    milestones: (milestones.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      date: row.date,
      type: row.type,
      description: row.description,
      photoUrl: row.photo_url,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    memories: (memories.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      timestamp: row.timestamp,
      text: row.text,
      photoUrl: row.photo_url,
      isMilestone: row.is_milestone,
      createdAt: row.created_at,
    })),
    journalEntries: (journalEntries.data || []).map((row: any) => ({
      id: row.id,
      babyId: row.baby_id,
      date: row.date,
      prompt: row.prompt,
      text: row.text,
      mood: row.mood,
      createdAt: row.created_at,
    })),
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

  const settingsResult = localData?.userSettings
    ? await upsertTable(
        supabaseAdmin,
        'user_settings',
        [toUserSettingsCloudRow(user.id, localData.userSettings as UserSettings)],
        { onConflict: 'user_id' },
      )
    : ({ table: 'user_settings', ok: true } as TableSyncResult);

  const dependentResults = await Promise.all([
    upsertTable(
      supabaseAdmin,
      'sleep_logs',
      byOwnedBabyId(localData?.sleepLogs, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        start_time: row.startTime,
        end_time: row.endTime,
        duration: row.duration,
        notes: row.notes,
        created_at: row.createdAt,
      })),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'feed_logs',
      byOwnedBabyId(localData?.feedLogs, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        timestamp: row.timestamp,
        type: row.type,
        amount: row.bottleAmount,
        milk_type: row.bottleType,
        food_description: row.solidDescription,
        notes: row.notes,
        created_at: row.createdAt,
        left_duration: row.breastLeft ? row.duration : 0,
        right_duration: row.breastRight ? row.duration : 0,
      })),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'diaper_logs',
      byOwnedBabyId(localData?.diaperLogs, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        timestamp: row.timestamp,
        type: row.type,
        notes: row.notes,
        created_at: row.createdAt,
      })),
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
      byOwnedBabyId(localData?.growthMeasurements, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        date: row.date,
        weight: row.weight,
        height: row.height,
        head_circumference: row.headCircumference,
        created_at: row.createdAt,
      })),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'vaccination_records',
      byOwnedBabyId(localData?.vaccinationRecords, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        vaccine_name: row.name,
        due_date: row.dueDate,
        status: row.status,
        given_date: row.givenDate,
        notes: row.notes,
        created_at: row.createdAt,
      })),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'milestones',
      byOwnedBabyId(localData?.milestones, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        date: row.date,
        type: row.type,
        description: row.description,
        photo_url: row.photoUrl,
        notes: row.notes,
        created_at: row.createdAt,
      })),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'memories',
      byOwnedBabyId(localData?.memories, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        timestamp: row.timestamp,
        text: row.text,
        photo_url: row.photoUrl,
        is_milestone: row.isMilestone,
        created_at: row.createdAt,
      })),
      { onConflict: 'id' },
    ),
    upsertTable(
      supabaseAdmin,
      'journal_entries',
      byOwnedBabyId(localData?.journalEntries, (row) => String(row?.babyId || '')).map((row: any) => ({
        id: row.id,
        baby_id: row.babyId,
        date: row.date,
        prompt: row.prompt,
        text: row.text,
        mood: row.mood,
        created_at: row.createdAt,
      })),
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
