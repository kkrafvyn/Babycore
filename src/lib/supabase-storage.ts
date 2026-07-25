// Storage wrapper - provides unified interface for IndexedDB (offline-first) and eventually Supabase (cloud sync)
// For now, all operations use local IndexedDB for offline-first functionality

import {
  Baby,
  SleepLog,
  FeedLog,
  DiaperLog,
  GrowthMeasurement,
  VaccinationRecord,
  UserSettings,
  Milestone,
  MemoryLog,
  HealthLog,
  JournalEntry,
  Achievement,
} from "../types/index";

import * as LocalStorage from "./storage";
import {
  isCloudSyncPaused,
  isTransientFetchError,
  pauseCloudSync,
  resumeCloudSync,
  warnCloudOnce,
} from './network-status';
import {
  toDiaperLogCloudRow,
  toFeedLogCloudRow,
  toGrowthMeasurementCloudRow,
  fromUserSettingsCloudRow,
  isMissingUserSettingsOptionalColumnsError,
  toHealthLogCloudRow,
  toJournalEntryCloudRow,
  toLegacyUserSettingsCloudRow,
  toMemoryLogCloudRow,
  toMilestoneCloudRow,
  toSleepLogCloudRow,
  toUserSettingsCloudRow,
  toVaccinationRecordCloudRow,
} from './cloud-sync-mappers';
import { getApiBaseUrl } from './api-base-url';
import { getCurrentUser, supabase } from "./supabase";

const STORAGE_SCOPE_PREFIX = 'user:';
const GUEST_STORAGE_SCOPE = 'guest';
const CLOUD_BABY_REPAIR_RETRY_MS = 30_000;
const cloudBabyRepairAttemptedAt = new Map<string, number>();

const resolveStorageScopeId = async (): Promise<string> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return GUEST_STORAGE_SCOPE;
  }

  return `${STORAGE_SCOPE_PREFIX}${user.id}`;
};

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const isTablePermissionDenied = (error: unknown, table: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === 'string' ? candidate.code.trim() : '';
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';

  return code === '42501' && message.includes(`permission denied for table ${table.toLowerCase()}`);
};

const isTableRlsViolation = (error: unknown, table: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === 'string' ? candidate.code.trim() : '';
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';

  return (
    code === '42501' &&
    message.includes('row-level security policy') &&
    message.includes(`table "${table.toLowerCase()}"`)
  );
};

const isAnyTablePermissionDenied = (error: unknown, tables: string[]): boolean =>
  tables.some((table) => isTablePermissionDenied(error, table) || isTableRlsViolation(error, table));

const isCloudBabyAccessPermissionDenied = (error: unknown): boolean =>
  isAnyTablePermissionDenied(error, ['babies', 'family_sharing_invites', 'doctor_baby_assignments']);

const isLocalBrowserHost = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const getActiveSessionAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const auth = supabase.auth as any;
  const {
    data: { session },
    error,
  } = await auth.getSession();

  if (error || !session?.access_token) {
    return null;
  }

  return session.access_token;
};

const syncBabiesViaBackend = async (babies: Baby[]): Promise<boolean> => {
  if (babies.length === 0 || typeof window === 'undefined') {
    return false;
  }

  const accessToken = await getActiveSessionAccessToken();
  if (!accessToken) {
    return false;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/sync/full`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        babies,
        sleepLogs: [],
        feedLogs: [],
        diaperLogs: [],
        healthLogs: [],
        growthMeasurements: [],
        vaccinationRecords: [],
        milestones: [],
        memories: [],
        journalEntries: [],
        userSettings: null,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);
    return Boolean(payload?.success);
  } catch {
    return false;
  }
};

const markCloudBabyRepairAttempt = (babyId: string): void => {
  cloudBabyRepairAttemptedAt.set(babyId, Date.now());
};

const clearCloudBabyRepairAttempt = (babyId: string): void => {
  cloudBabyRepairAttemptedAt.delete(babyId);
};

const shouldAttemptCloudBabyRepair = (babyId: string): boolean => {
  const lastAttemptAt = cloudBabyRepairAttemptedAt.get(babyId);
  if (!lastAttemptAt) {
    return true;
  }

  return Date.now() - lastAttemptAt >= CLOUD_BABY_REPAIR_RETRY_MS;
};

const toBabyCloudRow = (baby: Baby, userId: string) => ({
  id: baby.id,
  user_id: userId,
  name: baby.name,
  date_of_birth: baby.dateOfBirth,
  gender: baby.gender,
  photo_url: baby.photoUrl || null,
  country: baby.country,
  created_at: baby.createdAt,
});

const fromBabyCloudRow = (row: any): Baby => ({
  id: row.id,
  name: row.name,
  dateOfBirth: row.date_of_birth,
  gender: row.gender || 'other',
  photoUrl: row.photo_url || undefined,
  country: row.country || 'US',
  createdAt: row.created_at || new Date().toISOString(),
});

const getAcceptedInviteRowsForCurrentUser = async () => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return [] as any[];
  }

  const userEmail = normalizeEmail(user.email);

  const queries = [
    supabase
      .from('family_sharing_invites')
      .select(
        'id,baby_id,baby_name_snapshot,baby_photo_url_snapshot,created_at,accepted_at,accepted_by,invited_email',
      )
      .eq('accepted_by', user.id)
      .not('accepted_at', 'is', null),
  ];

  if (userEmail) {
    queries.push(
      supabase
        .from('family_sharing_invites')
        .select(
          'id,baby_id,baby_name_snapshot,baby_photo_url_snapshot,created_at,accepted_at,accepted_by,invited_email',
        )
        .ilike('invited_email', userEmail)
        .not('accepted_at', 'is', null),
    );
  }

  const results = await Promise.all(queries as any[]);
  const rows: any[] = [];

  for (const result of results) {
    if (result.error) {
      if (isTablePermissionDenied(result.error, 'family_sharing_invites')) {
        continue;
      }
      console.warn('Failed to fetch sharing invites for current user:', result.error);
      continue;
    }

    rows.push(...(result.data || []));
  }

  const dedupedById = new Map<string, any>();
  for (const row of rows) {
    dedupedById.set(row.id, row);
  }

  return Array.from(dedupedById.values());
};

const getAssignedSharedBabies = async (): Promise<Baby[]> => {
  const acceptedInvites = await getAcceptedInviteRowsForCurrentUser();
  if (acceptedInvites.length === 0) {
    return [];
  }

  const babyIds = Array.from(
    new Set(
      acceptedInvites
        .map((invite) => String(invite.baby_id || '').trim())
        .filter(Boolean),
    ),
  );

  if (babyIds.length === 0) {
    return [];
  }

  const fallbackBabies: Baby[] = acceptedInvites.map((invite) => ({
    id: String(invite.baby_id || ''),
    name: invite.baby_name_snapshot?.trim() || `Baby ${String(invite.baby_id || '').slice(0, 8)}`,
    dateOfBirth: invite.created_at || new Date().toISOString(),
    gender: 'other',
    photoUrl: invite.baby_photo_url_snapshot || undefined,
    country: 'US',
    createdAt: invite.created_at || new Date().toISOString(),
  }));

  const { data: babyRows, error: babyRowsError } = await supabase
    .from('babies')
    .select('id,name,date_of_birth,gender,photo_url,country,created_at')
    .in('id', babyIds);

  if (babyRowsError) {
    if (isCloudBabyAccessPermissionDenied(babyRowsError)) {
      return fallbackBabies;
    }
    console.warn('Failed to fetch shared babies from cloud:', babyRowsError);
  }

  const cloudBabiesById = new Map<string, Baby>();
  for (const row of babyRows || []) {
    cloudBabiesById.set(row.id, {
      id: row.id,
      name: row.name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      photoUrl: row.photo_url || undefined,
      country: row.country || 'US',
      createdAt: row.created_at || new Date().toISOString(),
    });
  }

  const merged = new Map<string, Baby>();
  for (const baby of fallbackBabies) {
    merged.set(baby.id, baby);
  }

  for (const invite of acceptedInvites) {
    const inviteBabyId = String(invite.baby_id || '');
    const cloudBaby = cloudBabiesById.get(inviteBabyId);
    if (cloudBaby) {
      merged.set(inviteBabyId, cloudBaby);
    }
  }

  return Array.from(merged.values());
};

type DoctorAssignedBabyApiRow = {
  babyId: string;
  babyName: string;
  babyDateOfBirth?: string | null;
  babyGender?: 'boy' | 'girl' | 'other' | string | null;
  babyPhotoUrl?: string | null;
  babyCountry?: string | null;
  babyCreatedAt?: string | null;
};

const mapDoctorAssignedBabyApiRow = (row: DoctorAssignedBabyApiRow): Baby => ({
  id: String(row.babyId || ''),
  name: row.babyName?.trim() || `Baby ${String(row.babyId || '').slice(0, 8)}`,
  dateOfBirth: row.babyDateOfBirth || row.babyCreatedAt || new Date().toISOString(),
  gender:
    row.babyGender === 'boy' || row.babyGender === 'girl' || row.babyGender === 'other'
      ? row.babyGender
      : 'other',
  photoUrl: row.babyPhotoUrl || undefined,
  country: row.babyCountry || 'US',
  createdAt: row.babyCreatedAt || new Date().toISOString(),
});

const canAccessDoctorPortal = (user: {
  app_metadata?: { role?: string };
  user_metadata?: { onboarding_profile_type?: string };
} | null): boolean => {
  if (!user) {
    return false;
  }

  const appRole = String(user.app_metadata?.role || '').trim().toLowerCase();
  if (appRole === 'doctor' || appRole === 'admin') {
    return true;
  }

  return String(user.user_metadata?.onboarding_profile_type || '').trim().toLowerCase() === 'doctor';
};

const getDoctorAssignedBabiesViaBackend = async (): Promise<Baby[] | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const user = await getCurrentUser();
  if (!canAccessDoctorPortal(user)) {
    return null;
  }

  const accessToken = await getActiveSessionAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/doctor/babies`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 403 || response.status === 404 || response.status === 405) {
      return null;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.success === false) {
      return null;
    }

    return Array.isArray(payload?.data)
      ? payload.data.map((row: DoctorAssignedBabyApiRow) => mapDoctorAssignedBabyApiRow(row))
      : [];
  } catch {
    return null;
  }
};

const getDoctorAssignedBabiesDirect = async (): Promise<Baby[]> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return [];
  }

  try {
    const { data: assignmentRows, error: assignmentError } = await supabase
      .from('doctor_baby_assignments')
      .select('baby_id')
      .eq('doctor_id', user.id)
      .eq('status', 'active');

    if (assignmentError) {
      throw assignmentError;
    }

    const babyIds = Array.from(
      new Set(
        (assignmentRows || [])
          .map((assignment) => String(assignment.baby_id || '').trim())
          .filter(Boolean),
      ),
    );

    if (babyIds.length === 0) {
      return [];
    }

    const { data: babyRows, error: babyError } = await supabase
      .from('babies')
      .select('id,name,date_of_birth,gender,photo_url,country,created_at')
      .in('id', babyIds);

    if (babyError) {
      throw babyError;
    }

    return (babyRows || []).map(fromBabyCloudRow);
  } catch (error) {
    if (isCloudBabyAccessPermissionDenied(error)) {
      return [];
    }

    console.warn('Failed to fetch doctor assigned babies directly from cloud:', error);
    return [];
  }
};

const getDoctorAssignedBabies = async (): Promise<Baby[]> => {
  const user = await getCurrentUser();
  if (!canAccessDoctorPortal(user)) {
    return [];
  }

  const backendBabies = await getDoctorAssignedBabiesViaBackend();
  if (backendBabies !== null) {
    return backendBabies;
  }

  return getDoctorAssignedBabiesDirect();
};

const upsertBabyToCloud = async (baby: Baby): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    markCloudBabyRepairAttempt(baby.id);

    if (await syncBabiesViaBackend([baby])) {
      clearCloudBabyRepairAttempt(baby.id);
      return;
    }

    // Production browser sessions should rely on the backend sync route so
    // users are not blocked by client-side RLS policy differences.
    if (typeof window !== 'undefined' && !isLocalBrowserHost()) {
      return;
    }

    const { error } = await supabase
      .from('babies')
      .upsert(toBabyCloudRow(baby, user.id), { onConflict: 'id' });

    if (error) {
      throw error;
    }

    clearCloudBabyRepairAttempt(baby.id);
  } catch (error) {
    if (isCloudBabyAccessPermissionDenied(error)) {
      return;
    }
    console.warn('Unable to sync baby profile directly to cloud:', error);
  }
};

const deleteBabyFromCloud = async (id: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from('babies').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      throw error;
    }
  } catch (error) {
    if (isCloudBabyAccessPermissionDenied(error)) {
      return;
    }
    console.warn('Unable to delete baby profile from cloud:', error);
  }
};

const getRemoteOwnedBabies = async (): Promise<Baby[]> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('babies')
      .select('id,name,date_of_birth,gender,photo_url,country,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(fromBabyCloudRow);
  } catch (error) {
    if (isCloudBabyAccessPermissionDenied(error)) {
      return [];
    }
    console.warn('Unable to load owned babies from cloud:', error);
    return [];
  }
};

const repairMissingOwnedBabiesInCloud = async (
  localBabies: Baby[],
  remoteOwnedBabies: Baby[],
): Promise<void> => {
  if (localBabies.length === 0) {
    return;
  }

  const remoteIds = new Set(remoteOwnedBabies.map((baby) => baby.id));
  remoteOwnedBabies.forEach((baby) => clearCloudBabyRepairAttempt(baby.id));
  const missingRemoteBabies = localBabies.filter(
    (baby) => !remoteIds.has(baby.id) && shouldAttemptCloudBabyRepair(baby.id),
  );

  if (missingRemoteBabies.length === 0) {
    return;
  }

  await Promise.all(missingRemoteBabies.map((baby) => upsertBabyToCloud(baby)));
};

const upsertRecordToCloud = async (
  table: string,
  row: Record<string, unknown>,
  label: string,
): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn(`Unable to sync ${label} directly to cloud:`, error);
  }
};

const deleteRecordFromCloud = async (table: string, id: string, label: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn(`Unable to delete ${label} from cloud:`, error);
  }
};

const upsertSleepLogToCloud = (log: SleepLog): Promise<void> =>
  upsertRecordToCloud('sleep_logs', toSleepLogCloudRow(log), 'sleep log');

const deleteSleepLogFromCloud = (id: string): Promise<void> =>
  deleteRecordFromCloud('sleep_logs', id, 'sleep log');

const upsertFeedLogToCloud = (log: FeedLog): Promise<void> =>
  upsertRecordToCloud('feed_logs', toFeedLogCloudRow(log), 'feed log');

const deleteFeedLogFromCloud = (id: string): Promise<void> =>
  deleteRecordFromCloud('feed_logs', id, 'feed log');

const upsertDiaperLogToCloud = (log: DiaperLog): Promise<void> =>
  upsertRecordToCloud('diaper_logs', toDiaperLogCloudRow(log), 'diaper log');

const deleteDiaperLogFromCloud = (id: string): Promise<void> =>
  deleteRecordFromCloud('diaper_logs', id, 'diaper log');

const upsertGrowthMeasurementToCloud = (measurement: GrowthMeasurement): Promise<void> =>
  upsertRecordToCloud('growth_measurements', toGrowthMeasurementCloudRow(measurement), 'growth measurement');

const deleteGrowthMeasurementFromCloud = (id: string): Promise<void> =>
  deleteRecordFromCloud('growth_measurements', id, 'growth measurement');

const upsertVaccinationRecordToCloud = (record: VaccinationRecord): Promise<void> =>
  upsertRecordToCloud('vaccination_records', toVaccinationRecordCloudRow(record), 'vaccination record');

const deleteVaccinationRecordFromCloud = (id: string): Promise<void> =>
  deleteRecordFromCloud('vaccination_records', id, 'vaccination record');

const upsertMilestoneToCloud = (milestone: Milestone): Promise<void> =>
  upsertRecordToCloud('milestones', toMilestoneCloudRow(milestone), 'milestone');

const deleteMilestoneFromCloud = (id: string): Promise<void> =>
  deleteRecordFromCloud('milestones', id, 'milestone');

const upsertMemoryLogToCloud = async (log: MemoryLog): Promise<void> => {
  await upsertRecordToCloud('memories', toMemoryLogCloudRow(log), 'memory log');
};

const deleteMemoryLogFromCloud = async (id: string): Promise<void> => {
  await deleteRecordFromCloud('memories', id, 'memory log');
};

const upsertJournalEntryToCloud = async (entry: JournalEntry): Promise<void> => {
  await upsertRecordToCloud('journal_entries', toJournalEntryCloudRow(entry), 'journal entry');
};

const deleteJournalEntryFromCloud = async (id: string): Promise<void> => {
  await deleteRecordFromCloud('journal_entries', id, 'journal entry');
};

const upsertHealthLogToCloud = async (log: HealthLog): Promise<void> => {
  await upsertRecordToCloud('health_logs', toHealthLogCloudRow(log), 'health log');
};

const deleteHealthLogFromCloud = async (id: string): Promise<void> => {
  await deleteRecordFromCloud('health_logs', id, 'health log');
};

const upsertUserSettingsToCloud = async (userId: string, settings: UserSettings): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id || user.id !== userId) {
    return;
  }

  try {
    const primaryRow = toUserSettingsCloudRow(userId, settings);
    let { error } = await supabase
      .from('user_settings')
      .upsert(primaryRow, { onConflict: 'user_id' });

    if (error && isMissingUserSettingsOptionalColumnsError(error)) {
      ({ error } = await supabase
        .from('user_settings')
        .upsert(toLegacyUserSettingsCloudRow(userId, settings), { onConflict: 'user_id' }));
    }

    if (error) {
      throw error;
    }
  } catch (error) {
    if (isTablePermissionDenied(error, 'user_settings')) {
      return;
    }
    console.warn('Unable to sync user settings directly to cloud:', error);
  }
};

const getRemoteUserSettings = async (userId: string): Promise<UserSettings | undefined> => {
  if (isCloudSyncPaused()) {
    return undefined;
  }

  const user = await getCurrentUser();
  if (!user?.id || user.id !== userId) {
    return undefined;
  }

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return undefined;
    }

    resumeCloudSync();
    return fromUserSettingsCloudRow(data);
  } catch (error) {
    if (isTablePermissionDenied(error, 'user_settings')) {
      return undefined;
    }
    if (isTransientFetchError(error)) {
      pauseCloudSync();
    }
    warnCloudOnce('Unable to load user settings from cloud:', error);
    return undefined;
  }
};

type SyncWriteOptions = {
  skipCloudSync?: boolean;
};

// Baby operations
export const getLocalBabiesForActiveScope = async (): Promise<Baby[]> => {
  const scopeId = await resolveStorageScopeId();
  return LocalStorage.getBabies(scopeId);
};

export const addBaby = async (baby: Baby, options?: SyncWriteOptions): Promise<void> => {
  const scopeId = await resolveStorageScopeId();
  await LocalStorage.addBaby(baby, scopeId);
  if (!options?.skipCloudSync) {
    await upsertBabyToCloud(baby);
  }
};

export const migrateGuestBabiesToCurrentUser = async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return 0;
  }

  const targetScopeId = `${STORAGE_SCOPE_PREFIX}${user.id}`;
  const guestBabies = await LocalStorage.getBabies(GUEST_STORAGE_SCOPE);

  if (guestBabies.length === 0) {
    return 0;
  }

  let migratedCount = 0;
  for (const baby of guestBabies) {
    try {
      const migrated = await LocalStorage.transferBabyOwnerScope(
        baby.id,
        GUEST_STORAGE_SCOPE,
        targetScopeId,
      );

      if (migrated) {
        migratedCount += 1;
        await upsertBabyToCloud(baby);
      }
    } catch (error) {
      console.warn(`Failed to migrate guest baby ${baby.id} to account scope:`, error);
    }
  }

  return migratedCount;
};

export const getBabies = async (): Promise<Baby[]> => {
  const scopeId = await resolveStorageScopeId();
  const user = await getCurrentUser();
  const [sharedAssignedBabies, doctorAssignedBabies, remoteOwnedBabies] = await Promise.all([
    getAssignedSharedBabies(),
    getDoctorAssignedBabies(),
    user?.id ? getRemoteOwnedBabies() : Promise.resolve([] as Baby[]),
  ]);

  const localBabies = await LocalStorage.getBabies(scopeId);

  if (user?.id) {
    await repairMissingOwnedBabiesInCloud(localBabies, remoteOwnedBabies);
  }

  if (user?.id && remoteOwnedBabies.length > 0) {
    await Promise.all(
      remoteOwnedBabies.map((baby) =>
        LocalStorage.updateBaby(baby, scopeId).catch((error) => {
          console.warn(`Failed to hydrate owned baby ${baby.id} into local storage:`, error);
        }),
      ),
    );
  }

  const merged = new Map<string, Baby>();
  for (const baby of remoteOwnedBabies) {
    merged.set(baby.id, baby);
  }
  for (const baby of localBabies) {
    merged.set(baby.id, baby);
  }
  for (const baby of sharedAssignedBabies) {
    merged.set(baby.id, baby);
  }
  for (const baby of doctorAssignedBabies) {
    merged.set(baby.id, baby);
  }

  return Array.from(merged.values());
};

export const getBaby = async (id: string): Promise<Baby | undefined> => {
  const scopeId = await resolveStorageScopeId();
  const localBaby = await LocalStorage.getBaby(id, scopeId);
  if (localBaby) {
    return localBaby;
  }

  const sharedAssignedBabies = await getAssignedSharedBabies();
  const doctorAssignedBabies = await getDoctorAssignedBabies();
  return doctorAssignedBabies.find((baby) => baby.id === id) || sharedAssignedBabies.find((baby) => baby.id === id);
};

export const updateBaby = async (baby: Baby, options?: SyncWriteOptions): Promise<void> => {
  const scopeId = await resolveStorageScopeId();
  await LocalStorage.updateBaby(baby, scopeId);
  if (!options?.skipCloudSync) {
    await upsertBabyToCloud(baby);
  }
};

export const deleteBaby = async (id: string): Promise<void> => {
  const scopeId = await resolveStorageScopeId();
  await LocalStorage.deleteBaby(id, scopeId);
  await deleteBabyFromCloud(id);
};

// Sleep log operations
export const addSleepLog = async (log: SleepLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addSleepLog(log);
  if (!options?.skipCloudSync) {
    await upsertSleepLogToCloud(log);
  }
};
export const getSleepLogsByBaby = async (babyId: string): Promise<SleepLog[]> => LocalStorage.getSleepLogsByBaby(babyId);
export const updateSleepLog = async (log: SleepLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateSleepLog(log);
  if (!options?.skipCloudSync) {
    await upsertSleepLogToCloud(log);
  }
};
export const deleteSleepLog = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteSleepLog(id);
  if (!options?.skipCloudSync) {
    await deleteSleepLogFromCloud(id);
  }
};

// Feed log operations
export const addFeedLog = async (log: FeedLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addFeedLog(log);
  if (!options?.skipCloudSync) {
    await upsertFeedLogToCloud(log);
  }
};
export const getFeedLogsByBaby = async (babyId: string): Promise<FeedLog[]> => LocalStorage.getFeedLogsByBaby(babyId);
export const updateFeedLog = async (log: FeedLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateFeedLog(log);
  if (!options?.skipCloudSync) {
    await upsertFeedLogToCloud(log);
  }
};
export const deleteFeedLog = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteFeedLog(id);
  if (!options?.skipCloudSync) {
    await deleteFeedLogFromCloud(id);
  }
};

// Diaper log operations
export const addDiaperLog = async (log: DiaperLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addDiaperLog(log);
  if (!options?.skipCloudSync) {
    await upsertDiaperLogToCloud(log);
  }
};
export const getDiaperLogsByBaby = async (babyId: string): Promise<DiaperLog[]> => LocalStorage.getDiaperLogsByBaby(babyId);
export const updateDiaperLog = async (log: DiaperLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateDiaperLog(log);
  if (!options?.skipCloudSync) {
    await upsertDiaperLogToCloud(log);
  }
};
export const deleteDiaperLog = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteDiaperLog(id);
  if (!options?.skipCloudSync) {
    await deleteDiaperLogFromCloud(id);
  }
};

// Growth measurement operations
export const addGrowthMeasurement = async (
  measurement: GrowthMeasurement,
  options?: SyncWriteOptions,
): Promise<void> => {
  await LocalStorage.addGrowthMeasurement(measurement);
  if (!options?.skipCloudSync) {
    await upsertGrowthMeasurementToCloud(measurement);
  }
};
export const getGrowthMeasurementsByBaby = async (babyId: string): Promise<GrowthMeasurement[]> => LocalStorage.getGrowthMeasurementsByBaby(babyId);
export const updateGrowthMeasurement = async (
  measurement: GrowthMeasurement,
  options?: SyncWriteOptions,
): Promise<void> => {
  await LocalStorage.updateGrowthMeasurement(measurement);
  if (!options?.skipCloudSync) {
    await upsertGrowthMeasurementToCloud(measurement);
  }
};
export const deleteGrowthMeasurement = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteGrowthMeasurement(id);
  if (!options?.skipCloudSync) {
    await deleteGrowthMeasurementFromCloud(id);
  }
};

// Vaccination record operations
export const addVaccinationRecord = async (
  record: VaccinationRecord,
  options?: SyncWriteOptions,
): Promise<void> => {
  await LocalStorage.addVaccinationRecord(record);
  if (!options?.skipCloudSync) {
    await upsertVaccinationRecordToCloud(record);
  }
};
export const getVaccinationRecordsByBaby = async (babyId: string): Promise<VaccinationRecord[]> => LocalStorage.getVaccinationRecordsByBaby(babyId);
export const updateVaccinationRecord = async (
  record: VaccinationRecord,
  options?: SyncWriteOptions,
): Promise<void> => {
  await LocalStorage.updateVaccinationRecord(record);
  if (!options?.skipCloudSync) {
    await upsertVaccinationRecordToCloud(record);
  }
};
export const deleteVaccinationRecord = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteVaccinationRecord(id);
  if (!options?.skipCloudSync) {
    await deleteVaccinationRecordFromCloud(id);
  }
};

// Milestone operations
export const addMilestone = async (milestone: Milestone, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addMilestone(milestone);
  if (!options?.skipCloudSync) {
    await upsertMilestoneToCloud(milestone);
  }
};
export const getMilestonesByBaby = async (babyId: string): Promise<Milestone[]> => LocalStorage.getMilestonesByBaby(babyId);
export const updateMilestone = async (milestone: Milestone, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateMilestone(milestone);
  if (!options?.skipCloudSync) {
    await upsertMilestoneToCloud(milestone);
  }
};
export const deleteMilestone = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteMilestone(id);
  if (!options?.skipCloudSync) {
    await deleteMilestoneFromCloud(id);
  }
};

// Memory log operations
export const addMemoryLog = async (log: MemoryLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addMemoryLog(log);
  if (!options?.skipCloudSync) {
    await upsertMemoryLogToCloud(log);
  }
};
export const getMemoryLogsByBaby = async (babyId: string): Promise<MemoryLog[]> => LocalStorage.getMemoryLogsByBaby(babyId);
export const updateMemoryLog = async (log: MemoryLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateMemoryLog(log);
  if (!options?.skipCloudSync) {
    await upsertMemoryLogToCloud(log);
  }
};
export const deleteMemoryLog = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteMemoryLog(id);
  if (!options?.skipCloudSync) {
    await deleteMemoryLogFromCloud(id);
  }
};

// Health log operations
export const addHealthLog = async (log: HealthLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addHealthLog(log);
  if (!options?.skipCloudSync) {
    await upsertHealthLogToCloud(log);
  }
};
export const getHealthLogsByBaby = async (babyId: string): Promise<HealthLog[]> => LocalStorage.getHealthLogsByBaby(babyId);
export const updateHealthLog = async (log: HealthLog, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateHealthLog(log);
  if (!options?.skipCloudSync) {
    await upsertHealthLogToCloud(log);
  }
};
export const deleteHealthLog = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteHealthLog(id);
  if (!options?.skipCloudSync) {
    await deleteHealthLogFromCloud(id);
  }
};

// Journal entry operations
export const addJournalEntry = async (entry: JournalEntry, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.addJournalEntry(entry);
  // Baby Journal writes directly to storage, so we sync it immediately for cross-device visibility.
  if (!options?.skipCloudSync) {
    await upsertJournalEntryToCloud(entry);
  }
};
export const getJournalEntriesByBaby = async (babyId: string): Promise<JournalEntry[]> => LocalStorage.getJournalEntriesByBaby(babyId);
export const updateJournalEntry = async (entry: JournalEntry, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.updateJournalEntry(entry);
  if (!options?.skipCloudSync) {
    await upsertJournalEntryToCloud(entry);
  }
};
export const deleteJournalEntry = async (id: string, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.deleteJournalEntry(id);
  if (!options?.skipCloudSync) {
    await deleteJournalEntryFromCloud(id);
  }
};

// Achievement operations
export const addAchievement = async (achievement: Achievement): Promise<void> => LocalStorage.addAchievement(achievement);
export const getAchievementsByBaby = async (babyId: string): Promise<Achievement[]> => LocalStorage.getAchievementsByBaby(babyId);
export const updateAchievement = async (achievement: Achievement): Promise<void> => LocalStorage.updateAchievement(achievement);
export const deleteAchievement = async (id: string): Promise<void> => LocalStorage.deleteAchievement(id);

// Settings operations
export const setUserSettings = async (
  userId: string,
  settings: UserSettings,
  options?: SyncWriteOptions,
): Promise<void> => {
  const settingsWithUserId = { ...settings, userId };
  await LocalStorage.saveUserSettings(settingsWithUserId);
  if (!options?.skipCloudSync) {
    await upsertUserSettingsToCloud(userId, settingsWithUserId);
  }
};

export const saveUserSettings = async (settings: UserSettings, options?: SyncWriteOptions): Promise<void> => {
  await LocalStorage.saveUserSettings(settings);
  if (!options?.skipCloudSync && settings.userId) {
    await upsertUserSettingsToCloud(settings.userId, settings);
  }
};

export const getUserSettings = async (userId?: string): Promise<UserSettings | undefined> => {
  if (!userId) {
    return LocalStorage.getUserSettings('');
  }

  const remoteSettings = await getRemoteUserSettings(userId);
  if (remoteSettings) {
    await LocalStorage.saveUserSettings(remoteSettings);
    return remoteSettings;
  }

  return LocalStorage.getUserSettings(userId);
};
