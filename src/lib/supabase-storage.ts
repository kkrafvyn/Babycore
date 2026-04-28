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
import { getCurrentUser, supabase } from "./supabase";

const STORAGE_SCOPE_PREFIX = 'user:';
const GUEST_STORAGE_SCOPE = 'guest';

const resolveStorageScopeId = async (): Promise<string> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return GUEST_STORAGE_SCOPE;
  }

  return `${STORAGE_SCOPE_PREFIX}${user.id}`;
};

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

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

  const { data: babyRows, error: babyRowsError } = await supabase
    .from('babies')
    .select('id,name,date_of_birth,gender,photo_url,country,created_at')
    .in('id', babyIds);

  if (babyRowsError) {
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

  const fallbackBabies: Baby[] = acceptedInvites.map((invite) => {
    const inviteBabyId = String(invite.baby_id || '');
    const cloudBaby = cloudBabiesById.get(inviteBabyId);
    if (cloudBaby) {
      return cloudBaby;
    }

    return {
      id: inviteBabyId,
      name: invite.baby_name_snapshot?.trim() || `Baby ${inviteBabyId.slice(0, 8)}`,
      dateOfBirth: invite.created_at || new Date().toISOString(),
      gender: 'other',
      photoUrl: invite.baby_photo_url_snapshot || undefined,
      country: 'US',
      createdAt: invite.created_at || new Date().toISOString(),
    };
  });

  const merged = new Map<string, Baby>();
  for (const baby of fallbackBabies) {
    merged.set(baby.id, baby);
  }

  return Array.from(merged.values());
};

const upsertMemoryLogToCloud = async (log: MemoryLog): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from('memories').upsert(
      {
        id: log.id,
        baby_id: log.babyId,
        timestamp: log.timestamp,
        text: log.text,
        photo_url: log.photoUrl,
        is_milestone: log.isMilestone,
        created_at: log.createdAt,
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Unable to sync memory log directly to cloud:', error);
  }
};

const deleteMemoryLogFromCloud = async (id: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Unable to delete memory log from cloud:', error);
  }
};

const upsertJournalEntryToCloud = async (entry: JournalEntry): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from('journal_entries').upsert(
      {
        id: entry.id,
        baby_id: entry.babyId,
        date: entry.date,
        prompt: entry.prompt,
        text: entry.text,
        mood: entry.mood,
        created_at: entry.createdAt,
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Unable to sync journal entry directly to cloud:', error);
  }
};

const deleteJournalEntryFromCloud = async (id: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user?.id) {
    return;
  }

  try {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Unable to delete journal entry from cloud:', error);
  }
};

// Baby operations
export const addBaby = async (baby: Baby): Promise<void> => {
  const scopeId = await resolveStorageScopeId();
  return LocalStorage.addBaby(baby, scopeId);
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
      }
    } catch (error) {
      console.warn(`Failed to migrate guest baby ${baby.id} to account scope:`, error);
    }
  }

  return migratedCount;
};

export const getBabies = async (): Promise<Baby[]> => {
  const scopeId = await resolveStorageScopeId();
  const [localBabies, sharedAssignedBabies] = await Promise.all([
    LocalStorage.getBabies(scopeId),
    getAssignedSharedBabies(),
  ]);

  const merged = new Map<string, Baby>();
  for (const baby of localBabies) {
    merged.set(baby.id, baby);
  }
  for (const baby of sharedAssignedBabies) {
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
  return sharedAssignedBabies.find((baby) => baby.id === id);
};

export const updateBaby = async (baby: Baby): Promise<void> => {
  const scopeId = await resolveStorageScopeId();
  return LocalStorage.updateBaby(baby, scopeId);
};

export const deleteBaby = async (id: string): Promise<void> => {
  const scopeId = await resolveStorageScopeId();
  return LocalStorage.deleteBaby(id, scopeId);
};

// Sleep log operations
export const addSleepLog = async (log: SleepLog): Promise<void> => LocalStorage.addSleepLog(log);
export const getSleepLogsByBaby = async (babyId: string): Promise<SleepLog[]> => LocalStorage.getSleepLogsByBaby(babyId);
export const updateSleepLog = async (log: SleepLog): Promise<void> => LocalStorage.updateSleepLog(log);
export const deleteSleepLog = async (id: string): Promise<void> => LocalStorage.deleteSleepLog(id);

// Feed log operations
export const addFeedLog = async (log: FeedLog): Promise<void> => LocalStorage.addFeedLog(log);
export const getFeedLogsByBaby = async (babyId: string): Promise<FeedLog[]> => LocalStorage.getFeedLogsByBaby(babyId);
export const updateFeedLog = async (log: FeedLog): Promise<void> => LocalStorage.updateFeedLog(log);
export const deleteFeedLog = async (id: string): Promise<void> => LocalStorage.deleteFeedLog(id);

// Diaper log operations
export const addDiaperLog = async (log: DiaperLog): Promise<void> => LocalStorage.addDiaperLog(log);
export const getDiaperLogsByBaby = async (babyId: string): Promise<DiaperLog[]> => LocalStorage.getDiaperLogsByBaby(babyId);
export const updateDiaperLog = async (log: DiaperLog): Promise<void> => LocalStorage.updateDiaperLog(log);
export const deleteDiaperLog = async (id: string): Promise<void> => LocalStorage.deleteDiaperLog(id);

// Growth measurement operations
export const addGrowthMeasurement = async (measurement: GrowthMeasurement): Promise<void> => LocalStorage.addGrowthMeasurement(measurement);
export const getGrowthMeasurementsByBaby = async (babyId: string): Promise<GrowthMeasurement[]> => LocalStorage.getGrowthMeasurementsByBaby(babyId);
export const updateGrowthMeasurement = async (measurement: GrowthMeasurement): Promise<void> => LocalStorage.updateGrowthMeasurement(measurement);
export const deleteGrowthMeasurement = async (id: string): Promise<void> => LocalStorage.deleteGrowthMeasurement(id);

// Vaccination record operations
export const addVaccinationRecord = async (record: VaccinationRecord): Promise<void> => LocalStorage.addVaccinationRecord(record);
export const getVaccinationRecordsByBaby = async (babyId: string): Promise<VaccinationRecord[]> => LocalStorage.getVaccinationRecordsByBaby(babyId);
export const updateVaccinationRecord = async (record: VaccinationRecord): Promise<void> => LocalStorage.updateVaccinationRecord(record);
export const deleteVaccinationRecord = async (id: string): Promise<void> => LocalStorage.deleteVaccinationRecord(id);

// Milestone operations
export const addMilestone = async (milestone: Milestone): Promise<void> => LocalStorage.addMilestone(milestone);
export const getMilestonesByBaby = async (babyId: string): Promise<Milestone[]> => LocalStorage.getMilestonesByBaby(babyId);
export const updateMilestone = async (milestone: Milestone): Promise<void> => LocalStorage.updateMilestone(milestone);
export const deleteMilestone = async (id: string): Promise<void> => LocalStorage.deleteMilestone(id);

type SyncWriteOptions = {
  skipCloudSync?: boolean;
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
export const addHealthLog = async (log: HealthLog): Promise<void> => LocalStorage.addHealthLog(log);
export const getHealthLogsByBaby = async (babyId: string): Promise<HealthLog[]> => LocalStorage.getHealthLogsByBaby(babyId);
export const updateHealthLog = async (log: HealthLog): Promise<void> => LocalStorage.updateHealthLog(log);
export const deleteHealthLog = async (id: string): Promise<void> => LocalStorage.deleteHealthLog(id);

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
export const setUserSettings = async (userId: string, settings: UserSettings): Promise<void> => {
  const settingsWithUserId = { ...settings, userId };
  return LocalStorage.saveUserSettings(settingsWithUserId);
};

export const saveUserSettings = async (settings: UserSettings): Promise<void> => LocalStorage.saveUserSettings(settings);

export const getUserSettings = async (userId?: string): Promise<UserSettings | undefined> => {
  if (!userId) return LocalStorage.getUserSettings('');
  return LocalStorage.getUserSettings(userId);
};
