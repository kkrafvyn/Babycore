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
} from '../types/index';

const DB_NAME = 'babylog';
const DB_VERSION = 4;

// Store names
const STORES = {
  BABIES: 'babies',
  SLEEP_LOGS: 'sleep_logs',
  FEED_LOGS: 'feed_logs',
  DIAPER_LOGS: 'diaper_logs',
  GROWTH_MEASUREMENTS: 'growth_measurements',
  VACCINATION_RECORDS: 'vaccination_records',
  USER_SETTINGS: 'user_settings',
  MILESTONES: 'milestones',
  MEMORIES: 'memories',
  HEALTH_LOGS: 'health_logs',
  JOURNAL_ENTRIES: 'journal_entries',
  ACHIEVEMENTS: 'achievements',
};

let db: IDBDatabase | null = null;

export const initializeDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains(STORES.BABIES)) {
        database.createObjectStore(STORES.BABIES, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.SLEEP_LOGS)) {
        const sleepStore = database.createObjectStore(STORES.SLEEP_LOGS, { keyPath: 'id' });
        sleepStore.createIndex('babyId', 'babyId', { unique: false });
        sleepStore.createIndex('timestamp', 'startTime', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.FEED_LOGS)) {
        const feedStore = database.createObjectStore(STORES.FEED_LOGS, { keyPath: 'id' });
        feedStore.createIndex('babyId', 'babyId', { unique: false });
        feedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.DIAPER_LOGS)) {
        const diaperStore = database.createObjectStore(STORES.DIAPER_LOGS, { keyPath: 'id' });
        diaperStore.createIndex('babyId', 'babyId', { unique: false });
        diaperStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.GROWTH_MEASUREMENTS)) {
        const growthStore = database.createObjectStore(STORES.GROWTH_MEASUREMENTS, { keyPath: 'id' });
        growthStore.createIndex('babyId', 'babyId', { unique: false });
        growthStore.createIndex('date', 'date', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.VACCINATION_RECORDS)) {
        const vaccineStore = database.createObjectStore(STORES.VACCINATION_RECORDS, { keyPath: 'id' });
        vaccineStore.createIndex('babyId', 'babyId', { unique: false });
        vaccineStore.createIndex('dueDate', 'dueDate', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.USER_SETTINGS)) {
        database.createObjectStore(STORES.USER_SETTINGS, { keyPath: 'userId' });
      }
      if (!database.objectStoreNames.contains(STORES.MILESTONES)) {
        const store = database.createObjectStore(STORES.MILESTONES, { keyPath: 'id' });
        store.createIndex('babyId', 'babyId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.MEMORIES)) {
        const store = database.createObjectStore(STORES.MEMORIES, { keyPath: 'id' });
        store.createIndex('babyId', 'babyId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.HEALTH_LOGS)) {
        const store = database.createObjectStore(STORES.HEALTH_LOGS, { keyPath: 'id' });
        store.createIndex('babyId', 'babyId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.JOURNAL_ENTRIES)) {
        const store = database.createObjectStore(STORES.JOURNAL_ENTRIES, { keyPath: 'id' });
        store.createIndex('babyId', 'babyId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.ACHIEVEMENTS)) {
        const store = database.createObjectStore(STORES.ACHIEVEMENTS, { keyPath: 'id' });
        store.createIndex('babyId', 'babyId', { unique: false });
      }
    };
  });
};

const getDB = async (): Promise<IDBDatabase> => {
  if (!db) {
    db = await initializeDB();
  }
  return db;
};

// Generic operations factory
const createOperations = <T>(storeName: string, sortKey?: string, sortOrder: 'asc' | 'desc' = 'desc') => {
  return {
    add: async (item: T): Promise<void> => {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.add(item);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    getAllByBaby: async (babyId: string): Promise<T[]> => {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index('babyId');
        const request = index.getAll(babyId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          let result = request.result;
          if (sortKey) {
            result = result.sort((a, b) => {
              const valA = new Date(a[sortKey]).getTime();
              const valB = new Date(b[sortKey]).getTime();
              return sortOrder === 'desc' ? valB - valA : valA - valB;
            });
          }
          resolve(result);
        };
      });
    },
    update: async (item: T): Promise<void> => {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    delete: async (id: string): Promise<void> => {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const tx = database.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  };
};

// Baby operations (different because of keyPath)
export const addBaby = async (baby: Baby): Promise<void> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.add(baby);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getBabies = async (): Promise<Baby[]> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readonly');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const getBaby = async (id: string): Promise<Baby | undefined> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readonly');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const updateBaby = async (baby: Baby): Promise<void> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.put(baby);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const deleteBaby = async (id: string): Promise<void> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Log operations using factory
const sleepOps = createOperations<SleepLog>(STORES.SLEEP_LOGS, 'startTime');
export const addSleepLog = sleepOps.add;
export const getSleepLogsByBaby = sleepOps.getAllByBaby;
export const updateSleepLog = sleepOps.update;
export const deleteSleepLog = sleepOps.delete;

const feedOps = createOperations<FeedLog>(STORES.FEED_LOGS, 'timestamp');
export const addFeedLog = feedOps.add;
export const getFeedLogsByBaby = feedOps.getAllByBaby;
export const updateFeedLog = feedOps.update;
export const deleteFeedLog = feedOps.delete;

const diaperOps = createOperations<DiaperLog>(STORES.DIAPER_LOGS, 'timestamp');
export const addDiaperLog = diaperOps.add;
export const getDiaperLogsByBaby = diaperOps.getAllByBaby;
export const updateDiaperLog = diaperOps.update;
export const deleteDiaperLog = diaperOps.delete;

const growthOps = createOperations<GrowthMeasurement>(STORES.GROWTH_MEASUREMENTS, 'date');
export const addGrowthMeasurement = growthOps.add;
export const getGrowthMeasurementsByBaby = growthOps.getAllByBaby;
export const updateGrowthMeasurement = growthOps.update;
export const deleteGrowthMeasurement = growthOps.delete;

const vaccineOps = createOperations<VaccinationRecord>(STORES.VACCINATION_RECORDS, 'dueDate', 'asc');
export const addVaccinationRecord = vaccineOps.add;
export const getVaccinationRecordsByBaby = vaccineOps.getAllByBaby;
export const updateVaccinationRecord = vaccineOps.update;
export const deleteVaccinationRecord = vaccineOps.delete;

const milestoneOps = createOperations<Milestone>(STORES.MILESTONES, 'date');
export const addMilestone = milestoneOps.add;
export const getMilestonesByBaby = milestoneOps.getAllByBaby;
export const updateMilestone = milestoneOps.update;
export const deleteMilestone = milestoneOps.delete;

const memoryOps = createOperations<MemoryLog>(STORES.MEMORIES, 'timestamp');
export const addMemoryLog = memoryOps.add;
export const getMemoryLogsByBaby = memoryOps.getAllByBaby;
export const updateMemoryLog = memoryOps.update;
export const deleteMemoryLog = memoryOps.delete;

const healthOps = createOperations<HealthLog>(STORES.HEALTH_LOGS, 'timestamp');
export const addHealthLog = healthOps.add;
export const getHealthLogsByBaby = healthOps.getAllByBaby;
export const updateHealthLog = healthOps.update;
export const deleteHealthLog = healthOps.delete;

const journalOps = createOperations<JournalEntry>(STORES.JOURNAL_ENTRIES, 'date');
export const addJournalEntry = journalOps.add;
export const getJournalEntriesByBaby = journalOps.getAllByBaby;
export const updateJournalEntry = journalOps.update;
export const deleteJournalEntry = journalOps.delete;

const achievementOps = createOperations<Achievement>(STORES.ACHIEVEMENTS, 'unlockedAt');
export const addAchievement = achievementOps.add;
export const getAchievementsByBaby = achievementOps.getAllByBaby;
export const updateAchievement = achievementOps.update;
export const deleteAchievement = achievementOps.delete;

// User settings operations
export const getUserSettings = async (userId: string): Promise<UserSettings | undefined> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.USER_SETTINGS], 'readonly');
    const store = tx.objectStore(STORES.USER_SETTINGS);
    const request = store.get(userId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.USER_SETTINGS], 'readwrite');
    const store = tx.objectStore(STORES.USER_SETTINGS);
    const request = store.put(settings);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
