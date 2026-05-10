import { supabase } from './supabase';
import { getApiBaseUrl } from './api-base-url';
import {
  fromHealthLogCloudRow,
  fromUserSettingsCloudRow,
  toHealthLogCloudRow,
  toUserSettingsCloudRow,
} from './cloud-sync-mappers';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncError: string | null;
}

interface TableSyncResult {
  table: string;
  ok: boolean;
  error?: string;
}

const syncStatus: SyncStatus = {
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: 0,
  syncError: null,
};

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

const isLocalBrowserHost = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const shouldAllowDirectSupabaseFallback = (): boolean =>
  typeof window === 'undefined' || isLocalBrowserHost();

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

    try {
      return JSON.stringify(candidate);
    } catch {
      return 'Unknown sync error';
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'Unknown sync error';
};

const isTablePermissionDenied = (error: unknown, table: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === 'string' ? candidate.code.trim() : '';
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';

  return code === '42501' && message.includes(`permission denied for table ${table.toLowerCase()}`);
};

const getAuthenticatedUser = async (): Promise<{ id: string; email?: string } | null> => {
  const auth = supabase.auth as any;
  const {
    data: { user },
  } = await auth.getUser();
  return user || null;
};

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const getActiveSessionAccessToken = async (): Promise<string | null> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  return session?.access_token || null;
};

const callSyncBackend = async <TPayload>(
  path: string,
  init: RequestInit,
): Promise<TPayload | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = await getActiveSessionAccessToken();
  if (!accessToken) {
    return null;
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 404 || response.status === 405) {
    return null;
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Sync backend request failed with status ${response.status}`,
    );
  }

  return payload as TPayload;
};

const resolveAccessibleBabyIds = async (
  user: { id: string; email?: string },
): Promise<{ ownedIds: string[]; sharedIds: string[]; allIds: string[] }> => {
  const [ownedBabies, inviteByUser, inviteByEmail, doctorAssignments] = await Promise.all([
    supabase.from('babies').select('id').eq('user_id', user.id),
    supabase
      .from('family_sharing_invites')
      .select('baby_id')
      .eq('accepted_by', user.id)
      .not('accepted_at', 'is', null),
    normalizeEmail(user.email)
      ? supabase
          .from('family_sharing_invites')
          .select('baby_id')
          .ilike('invited_email', normalizeEmail(user.email))
          .not('accepted_at', 'is', null)
      : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from('doctor_baby_assignments')
      .select('baby_id,status')
      .eq('doctor_id', user.id),
  ]);

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

  // Owned babies should not be considered "shared" during sync writes.
  ownedIds.forEach((id) => sharedSet.delete(id));

  const sharedIds = Array.from(sharedSet);
  const allIds = Array.from(new Set([...ownedIds, ...sharedIds]));

  return { ownedIds, sharedIds, allIds };
};

const genericSync = async (table: string, data: any[]): Promise<TableSyncResult> => {
  if (!data.length) {
    return { table, ok: true };
  }

  try {
    const { error } = await supabase.from(table).upsert(data);
    if (error) throw error;
    return { table, ok: true };
  } catch (error) {
    console.error(`Error syncing ${table}:`, error);
    const message = formatSyncError(error);
    syncStatus.syncError = `${table}: ${message}`;
    return { table, ok: false, error: message };
  }
};

export const syncBabies = (babies: any[]) => genericSync('babies', babies);
export const syncSleepLogs = (logs: any[]) => genericSync('sleep_logs', logs);
export const syncFeedLogs = (logs: any[]) => genericSync('feed_logs', logs);
export const syncDiaperLogs = (logs: any[]) => genericSync('diaper_logs', logs);
export const syncGrowthMeasurements = (measurements: any[]) => genericSync('growth_measurements', measurements);
export const syncVaccinationRecords = (records: any[]) => genericSync('vaccination_records', records);
export const syncMilestones = (milestones: any[]) => genericSync('milestones', milestones);
export const syncMemories = (memories: any[]) => genericSync('memories', memories);
export const syncJournalEntries = (entries: any[]) => genericSync('journal_entries', entries);
export const syncHealthLogs = (logs: any[]) => genericSync('health_logs', logs);
export const syncUserSettings = async (userId: string, settings: any): Promise<TableSyncResult> => {
  if (!settings) {
    return { table: 'user_settings', ok: true };
  }

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert(toUserSettingsCloudRow(userId, settings), { onConflict: 'user_id' });

    if (error) throw error;
    return { table: 'user_settings', ok: true };
  } catch (error) {
    if (isTablePermissionDenied(error, 'user_settings')) {
      return { table: 'user_settings', ok: true };
    }

    console.error('Error syncing user_settings:', error);
    const message = formatSyncError(error);
    syncStatus.syncError = `user_settings: ${message}`;
    return { table: 'user_settings', ok: false, error: message };
  }
};

export async function performFullSync(localData: {
  babies: any[];
  sleepLogs: any[];
  feedLogs: any[];
  diaperLogs: any[];
  healthLogs?: any[];
  growthMeasurements: any[];
  vaccinationRecords: any[];
  milestones: any[];
  memories: any[];
  journalEntries?: any[];
  careWorkspaceData?: any;
  userSettings: any;
}): Promise<boolean> {
  const user = await getAuthenticatedUser();
  if (!user) {
    syncStatus.syncError = 'User not authenticated';
    return false;
  }

  try {
    syncStatus.isSyncing = true;
    syncStatus.syncError = null;

    let backendResult: {
      success: boolean;
      results?: TableSyncResult[];
      error?: string;
    } | null = null;

    try {
      backendResult = await callSyncBackend<{
        success: boolean;
        results?: TableSyncResult[];
        error?: string;
      }>('/sync/full', {
        method: 'POST',
        body: JSON.stringify({ localData }),
      });
    } catch (error) {
      console.warn('Backend sync route failed.', error);
      if (!shouldAllowDirectSupabaseFallback()) {
        syncStatus.syncError = formatSyncError(error);
        return false;
      }
    }

    if (backendResult) {
      const failedResults = (backendResult.results || []).filter((result) => !result.ok);
      const allSuccess = backendResult.success && failedResults.length === 0;

      if (allSuccess) {
        syncStatus.lastSyncTime = new Date();
        syncStatus.pendingChanges = 0;
        syncStatus.syncError = null;
      } else {
        syncStatus.syncError =
          failedResults.map((result) => `${result.table}: ${result.error || 'sync failed'}`).join(' | ') ||
          backendResult.error ||
          'Cloud sync rejected by backend';
      }

      return allSuccess;
    }

    const { sharedIds } = await resolveAccessibleBabyIds(user);
    const sharedIdSet = new Set(sharedIds);
    const ownedBabiesOnly = localData.babies.filter((baby) => !sharedIdSet.has(String(baby?.id || '')));

    const babyResult = await syncBabies(
      ownedBabiesOnly.map((b) => ({
        id: b.id,
        user_id: user.id,
        name: b.name,
        date_of_birth: b.dateOfBirth,
        gender: b.gender,
        photo_url: b.photoUrl,
        country: b.country,
        created_at: b.createdAt,
      })),
    );

    const settingsPayload = localData.userSettings
      ? {
          ...localData.userSettings,
          careWorkspaceData: localData.careWorkspaceData ?? localData.userSettings?.careWorkspaceData,
        }
      : localData.careWorkspaceData
      ? {
          userId: user.id,
          units: 'metric',
          language: 'en',
          notificationsEnabled: true,
          updatedAt: new Date().toISOString(),
          careWorkspaceData: localData.careWorkspaceData,
        }
      : null;

    const settingsResult = await syncUserSettings(user.id, settingsPayload);

    const dependentResults = babyResult.ok
      ? await Promise.all([
          syncSleepLogs(localData.sleepLogs.map((l) => ({
            id: l.id,
            baby_id: l.babyId,
            start_time: l.startTime,
            end_time: l.endTime,
            duration: l.duration,
            notes: l.notes,
            created_at: l.createdAt,
          }))),
          syncFeedLogs(localData.feedLogs.map((l) => ({
            id: l.id,
            baby_id: l.babyId,
            timestamp: l.timestamp,
            type: l.type,
            amount: l.bottleAmount,
            milk_type: l.bottleType,
            food_description: l.solidDescription,
            notes: l.notes,
            created_at: l.createdAt,
            // For breast feeds, we map duration based on which side was active.
            left_duration: l.breastLeft ? l.duration : 0,
            right_duration: l.breastRight ? l.duration : 0,
          }))),
          syncDiaperLogs(localData.diaperLogs.map((l) => ({
            id: l.id,
            baby_id: l.babyId,
            timestamp: l.timestamp,
            type: l.type,
            notes: l.notes,
            created_at: l.createdAt,
          }))),
          syncHealthLogs((localData.healthLogs || []).map((log) => toHealthLogCloudRow(log))),
          syncGrowthMeasurements(localData.growthMeasurements.map((m) => ({
            id: m.id,
            baby_id: m.babyId,
            date: m.date,
            weight: m.weight,
            height: m.height,
            head_circumference: m.headCircumference,
            created_at: m.createdAt,
          }))),
          syncVaccinationRecords(localData.vaccinationRecords.map((r) => ({
            id: r.id,
            baby_id: r.babyId,
            vaccine_name: r.name,
            due_date: r.dueDate,
            status: r.status,
            given_date: r.givenDate,
            notes: r.notes,
            created_at: r.createdAt,
          }))),
          syncMilestones(localData.milestones.map((m) => ({
            id: m.id,
            baby_id: m.babyId,
            date: m.date,
            type: m.type,
            description: m.description,
            photo_url: m.photoUrl,
            notes: m.notes,
            created_at: m.createdAt,
          }))),
          syncMemories(localData.memories.map((m) => ({
            id: m.id,
            baby_id: m.babyId,
            timestamp: m.timestamp,
            text: m.text,
            photo_url: m.photoUrl,
            is_milestone: m.isMilestone,
            created_at: m.createdAt,
          }))),
          syncJournalEntries((localData.journalEntries || []).map((entry) => ({
            id: entry.id,
            baby_id: entry.babyId,
            date: entry.date,
            prompt: entry.prompt,
            text: entry.text,
            mood: entry.mood,
            created_at: entry.createdAt,
          }))),
        ])
      : [];

    const results = [babyResult, settingsResult, ...dependentResults];
    const failedResults = results.filter((result) => !result.ok);
    const allSuccess = failedResults.length === 0;
    if (allSuccess) {
      syncStatus.lastSyncTime = new Date();
      syncStatus.pendingChanges = 0;
      syncStatus.syncError = null;
    } else {
      syncStatus.syncError = failedResults
        .map((result) => `${result.table}: ${result.error || 'sync failed'}`)
        .join(' | ');
    }
    return allSuccess;
  } catch (error) {
    syncStatus.syncError = formatSyncError(error);
    return false;
  } finally {
    syncStatus.isSyncing = false;
  }
}

export async function pullFromCloud(): Promise<any> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    let backendSnapshot: {
      success: boolean;
      snapshot?: any;
    } | null = null;

    try {
      backendSnapshot = await callSyncBackend<{
        success: boolean;
        snapshot?: any;
      }>('/sync/snapshot', {
        method: 'GET',
      });
    } catch (error) {
      console.warn('Backend snapshot route failed.', error);
      if (!shouldAllowDirectSupabaseFallback()) {
        throw error;
      }
    }

    if (backendSnapshot?.snapshot) {
      return backendSnapshot.snapshot;
    }

    const { data: userSettingsRow, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userSettingsError) {
      console.warn('Unable to pull user settings from cloud:', userSettingsError);
    }

    const { allIds } = await resolveAccessibleBabyIds(user);
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

    const babies = await supabase.from('babies').select('*').in('id', allIds);
    if (babies.error) {
      throw babies.error;
    }

    const babyIds = (babies.data || []).map((baby: any) => baby.id);

    const fetchByBabyIds = (table: string) =>
      supabase.from(table).select('*').in('baby_id', babyIds);

    const [sleepLogs, feedLogs, diaperLogs, healthLogs, growth, vaccine, milestones, memories, journalEntries] = await Promise.all([
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
      growth.error,
      vaccine.error,
      milestones.error,
      memories.error,
      journalEntries.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      throw queryErrors[0];
    }

    return {
      babies: (babies.data || []).map(b => ({
        id: b.id,
        name: b.name,
        dateOfBirth: b.date_of_birth,
        gender: b.gender,
        photoUrl: b.photo_url,
        country: b.country,
        createdAt: b.created_at
      })),
      sleepLogs: (sleepLogs.data || []).map(l => ({
        id: l.id,
        babyId: l.baby_id,
        startTime: l.start_time,
        endTime: l.end_time,
        duration: l.duration,
        notes: l.notes,
        createdAt: l.created_at
      })),
      feedLogs: (feedLogs.data || []).map(l => ({
        id: l.id,
        babyId: l.baby_id,
        timestamp: l.timestamp,
        type: l.type,
        duration: l.left_duration || l.right_duration || 0,
        breastLeft: !!l.left_duration,
        breastRight: !!l.right_duration,
        bottleAmount: l.amount,
        bottleType: l.milk_type,
        solidDescription: l.food_description,
        notes: l.notes,
        createdAt: l.created_at
      })),
      diaperLogs: (diaperLogs.data || []).map(l => ({
        id: l.id,
        babyId: l.baby_id,
        timestamp: l.timestamp,
        type: l.type,
        notes: l.notes,
        createdAt: l.created_at
      })),
      healthLogs: (healthLogs.data || []).map((log) => fromHealthLogCloudRow(log)),
      growthMeasurements: (growth.data || []).map(m => ({
        id: m.id,
        babyId: m.baby_id,
        date: m.date,
        weight: m.weight,
        height: m.height,
        headCircumference: m.head_circumference,
        createdAt: m.created_at
      })),
      vaccinationRecords: (vaccine.data || []).map(r => ({
        id: r.id,
        babyId: r.baby_id,
        name: r.vaccine_name || r.name,
        dueDate: r.due_date,
        status: r.status,
        givenDate: r.given_date,
        notes: r.notes,
        createdAt: r.created_at
      })),
      milestones: (milestones.data || []).map(m => ({
        id: m.id,
        babyId: m.baby_id,
        date: m.date,
        type: m.type,
        description: m.description,
        photoUrl: m.photo_url,
        notes: m.notes,
        createdAt: m.created_at
      })),
      memories: (memories.data || []).map(m => ({
        id: m.id,
        babyId: m.baby_id,
        timestamp: m.timestamp,
        text: m.text,
        photoUrl: m.photo_url,
        isMilestone: m.is_milestone,
        createdAt: m.created_at
      })),
      journalEntries: (journalEntries.data || []).map((entry) => ({
        id: entry.id,
        babyId: entry.baby_id,
        date: entry.date,
        prompt: entry.prompt,
        text: entry.text,
        mood: entry.mood,
        createdAt: entry.created_at,
      })),
      careWorkspaceData: userSettingsRow?.care_workspace_data || null,
      userSettings: userSettingsRow ? fromUserSettingsCloudRow(userSettingsRow) : null,
    };
  } catch (error) {
    console.error('Error pulling from cloud:', error);
    throw error;
  }
}

/**
 * Set up real-time sync listener
 */
export function setupRealtimeSync(callback: (change: any) => void) {
  let channel: any | null = null;
  let isDisposed = false;

  try {
    getAuthenticatedUser().then((user) => {
      if (!user || isDisposed) return;

      const realtimeChannel = supabase.channel(`sync:${user.id}:${Date.now()}`);

      realtimeChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'babies',
        },
        (payload) => {
          callback({
            table: 'babies',
            event: payload.eventType,
            data: payload.new || payload.old,
          });
        },
      );

      const tables = [
        'sleep_logs',
        'feed_logs',
        'diaper_logs',
        'health_logs',
        'growth_measurements',
        'vaccination_records',
        'milestones',
        'memories',
        'journal_entries',
      ];

      tables.forEach((table) => {
        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          callback({
            table,
            event: payload.eventType,
            data: payload.new || payload.old,
          });
        });
      });

      realtimeChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback({
            table: 'user_settings',
            event: payload.eventType,
            data: payload.new || payload.old,
          });
        },
      );

      realtimeChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_care_workspaces',
        },
        (payload) => {
          callback({
            table: 'shared_care_workspaces',
            event: payload.eventType,
            data: payload.new || payload.old,
          });
        },
      );

      channel = realtimeChannel.subscribe();
    });
  } catch (error) {
    console.error('Error setting up real-time sync:', error);
  }

  return () => {
    isDisposed = true;
    if (!channel) {
      return;
    }

    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.warn('Failed to remove realtime channel:', error);
    }
  };
}
