import { supabase } from './supabase';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncError: string | null;
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

const getAuthenticatedUser = async (): Promise<{ id: string; email?: string } | null> => {
  const auth = supabase.auth as any;
  const {
    data: { user },
  } = await auth.getUser();
  return user || null;
};

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

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

const genericSync = async (table: string, data: any[]) => {
  if (!data.length) return true;
  try {
    const { error } = await supabase.from(table).upsert(data);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error syncing ${table}:`, error);
    syncStatus.syncError = String(error);
    return false;
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

export async function performFullSync(localData: {
  babies: any[];
  sleepLogs: any[];
  feedLogs: any[];
  diaperLogs: any[];
  growthMeasurements: any[];
  vaccinationRecords: any[];
  milestones: any[];
  memories: any[];
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
    const { sharedIds } = await resolveAccessibleBabyIds(user);
    const sharedIdSet = new Set(sharedIds);
    const ownedBabiesOnly = localData.babies.filter((baby) => !sharedIdSet.has(String(baby?.id || '')));

    const results = await Promise.all([
      syncBabies(ownedBabiesOnly.map(b => ({
        id: b.id,
        user_id: user.id,
        name: b.name,
        date_of_birth: b.dateOfBirth,
        gender: b.gender,
        photo_url: b.photoUrl,
        country: b.country,
        created_at: b.createdAt
      }))),
      syncSleepLogs(localData.sleepLogs.map(l => ({
        id: l.id,
        baby_id: l.babyId,
        start_time: l.startTime,
        end_time: l.endTime,
        duration: l.duration,
        notes: l.notes,
        created_at: l.createdAt
      }))),
      syncFeedLogs(localData.feedLogs.map(l => ({
        id: l.id,
        baby_id: l.babyId,
        timestamp: l.timestamp,
        type: l.type,
        amount: l.bottleAmount,
        milk_type: l.bottleType,
        food_description: l.solidDescription,
        notes: l.notes,
        created_at: l.createdAt,
        // For breast feeds, we map duration based on which side was active
        left_duration: l.breastLeft ? l.duration : 0,
        right_duration: l.breastRight ? l.duration : 0
      }))),
      syncDiaperLogs(localData.diaperLogs.map(l => ({
        id: l.id,
        baby_id: l.babyId,
        timestamp: l.timestamp,
        type: l.type,
        notes: l.notes,
        created_at: l.createdAt
      }))),
      syncGrowthMeasurements(localData.growthMeasurements.map(m => ({
        id: m.id,
        baby_id: m.babyId,
        date: m.date,
        weight: m.weight,
        height: m.height,
        head_circumference: m.headCircumference,
        created_at: m.createdAt
      }))),
      syncVaccinationRecords(localData.vaccinationRecords.map(r => ({
        id: r.id,
        baby_id: r.babyId,
        vaccine_name: r.name,
        due_date: r.dueDate,
        status: r.status,
        given_date: r.givenDate,
        notes: r.notes,
        created_at: r.createdAt
      }))),
      syncMilestones(localData.milestones.map(m => ({
        id: m.id,
        baby_id: m.babyId,
        date: m.date,
        type: m.type,
        description: m.description,
        photo_url: m.photoUrl,
        notes: m.notes,
        created_at: m.createdAt
      }))),
      syncMemories(localData.memories.map(m => ({
        id: m.id,
        baby_id: m.babyId,
        timestamp: m.timestamp,
        text: m.text,
        photo_url: m.photoUrl,
        is_milestone: m.isMilestone,
        created_at: m.createdAt
      }))),
    ]);

    const allSuccess = results.every(r => r === true);
    if (allSuccess) {
      syncStatus.lastSyncTime = new Date();
      syncStatus.pendingChanges = 0;
    } else {
      syncStatus.syncError = 'Some data failed to sync';
    }
    return allSuccess;
  } catch (error) {
    syncStatus.syncError = String(error);
    return false;
  } finally {
    syncStatus.isSyncing = false;
  }
}

export async function pullFromCloud(): Promise<any> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    const { allIds } = await resolveAccessibleBabyIds(user);
    if (allIds.length === 0) {
      return {
        babies: [],
        sleepLogs: [],
        feedLogs: [],
        diaperLogs: [],
        growthMeasurements: [],
        vaccinationRecords: [],
        milestones: [],
        memories: [],
      };
    }

    const babies = await supabase.from('babies').select('*').in('id', allIds);
    if (babies.error) {
      throw babies.error;
    }

    const babyIds = (babies.data || []).map((baby: any) => baby.id);

    const fetchByBabyIds = (table: string) =>
      supabase.from(table).select('*').in('baby_id', babyIds);

    const [sleepLogs, feedLogs, diaperLogs, growth, vaccine, milestones, memories] = await Promise.all([
      fetchByBabyIds('sleep_logs'),
      fetchByBabyIds('feed_logs'),
      fetchByBabyIds('diaper_logs'),
      fetchByBabyIds('growth_measurements'),
      fetchByBabyIds('vaccination_records'),
      fetchByBabyIds('milestones'),
      fetchByBabyIds('memories'),
    ]);

    const queryErrors = [
      sleepLogs.error,
      feedLogs.error,
      diaperLogs.error,
      growth.error,
      vaccine.error,
      milestones.error,
      memories.error,
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
  const channels: any[] = [];
  let isDisposed = false;

  try {
    getAuthenticatedUser().then((user) => {
      if (!user || isDisposed) return;

      // Listen to babies changes
      const babiesChannel = supabase
        .channel('public:babies')
        .on(
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
          }
        )
        .subscribe();
      channels.push(babiesChannel);

      // Listen to other tables
      const tables = [
        'sleep_logs', 
        'feed_logs', 
        'diaper_logs', 
        'growth_measurements', 
        'vaccination_records',
        'milestones',
        'memories'
      ];

      tables.forEach((table) => {
        const tableChannel = supabase
          .channel(`public:${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            callback({
              table,
              event: payload.eventType,
              data: payload.new || payload.old,
            });
          })
          .subscribe();
        channels.push(tableChannel);
      });
    });
  } catch (error) {
    console.error('Error setting up real-time sync:', error);
  }

  return () => {
    isDisposed = true;
    channels.forEach((channel) => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Failed to remove realtime channel:', error);
      }
    });
  };
}
