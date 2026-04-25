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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    syncStatus.syncError = 'User not authenticated';
    return false;
  }

  try {
    syncStatus.isSyncing = true;
    syncStatus.syncError = null;

    const results = await Promise.all([
      syncBabies(localData.babies.map(b => ({ 
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
        name: r.name,
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fetchTable = (table: string, filter?: any) => {
       let query = supabase.from(table).select('*');
       if (filter) query = query.match(filter);
       return query;
    };

    const [babies, sleepLogs, feedLogs, diaperLogs, growth, vaccine, milestones, memories] = await Promise.all([
      fetchTable('babies', { user_id: user.id }),
      fetchTable('sleep_logs'),
      fetchTable('feed_logs'),
      fetchTable('diaper_logs'),
      fetchTable('growth_measurements'),
      fetchTable('vaccination_records'),
      fetchTable('milestones'),
      fetchTable('memories'),
    ]);

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
        name: r.name,
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
  try {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Listen to babies changes
      supabase
        .channel('public:babies')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'babies',
            filter: `user_id=eq.${user.id}`,
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
        supabase
          .channel(`public:${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            callback({
              table,
              event: payload.eventType,
              data: payload.new || payload.old,
            });
          })
          .subscribe();
      });
    });
  } catch (error) {
    console.error('Error setting up real-time sync:', error);
  }
}
