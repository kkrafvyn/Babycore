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
const DB_VERSION = 5;
const BABY_OWNER_SCOPE_INDEX = 'ownerScopeId';
const GUEST_OWNER_SCOPE_ID = 'guest';

type StoredBaby = Baby & {
  ownerScopeId?: string;
};

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

const BABY_PROFILE_DEPENDENT_STORES = [
  STORES.SLEEP_LOGS,
  STORES.FEED_LOGS,
  STORES.DIAPER_LOGS,
  STORES.GROWTH_MEASUREMENTS,
  STORES.VACCINATION_RECORDS,
  STORES.MILESTONES,
  STORES.MEMORIES,
  STORES.HEALTH_LOGS,
  STORES.JOURNAL_ENTRIES,
  STORES.ACHIEVEMENTS,
] as const;

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
      const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction;
      if (!upgradeTransaction) {
        throw new Error('Missing IndexedDB upgrade transaction');
      }

      // Create object stores
      let babiesStore: IDBObjectStore;
      if (!database.objectStoreNames.contains(STORES.BABIES)) {
        babiesStore = database.createObjectStore(STORES.BABIES, { keyPath: 'id' });
      } else {
        babiesStore = upgradeTransaction.objectStore(STORES.BABIES);
      }
      if (!babiesStore.indexNames.contains(BABY_OWNER_SCOPE_INDEX)) {
        babiesStore.createIndex(BABY_OWNER_SCOPE_INDEX, BABY_OWNER_SCOPE_INDEX, { unique: false });
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

const normalizeOwnerScopeId = (ownerScopeId?: string): string => {
  const normalized = ownerScopeId?.trim();
  return normalized ? normalized : GUEST_OWNER_SCOPE_ID;
};

const stripBabyOwnerScope = (baby: StoredBaby): Baby => {
  const { ownerScopeId: _ownerScopeId, ...safeBaby } = baby;
  return safeBaby as Baby;
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
export const addBaby = async (baby: Baby, ownerScopeId?: string): Promise<void> => {
  const database = await getDB();
  const normalizedScopeId = normalizeOwnerScopeId(ownerScopeId);
  const storedBaby: StoredBaby = {
    ...baby,
    ownerScopeId: normalizedScopeId,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.add(storedBaby);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getBabies = async (ownerScopeId?: string): Promise<Baby[]> => {
  const database = await getDB();
  const normalizedScopeId = normalizeOwnerScopeId(ownerScopeId);

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readonly');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.indexNames.contains(BABY_OWNER_SCOPE_INDEX)
      ? store.index(BABY_OWNER_SCOPE_INDEX).getAll(normalizedScopeId)
      : store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const records = (request.result as StoredBaby[]).filter(
        (baby) => baby.ownerScopeId === normalizedScopeId,
      );
      resolve(records.map(stripBabyOwnerScope));
    };
  });
};

export const getBaby = async (id: string, ownerScopeId?: string): Promise<Baby | undefined> => {
  const database = await getDB();
  const normalizedScopeId = normalizeOwnerScopeId(ownerScopeId);

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readonly');
    const store = tx.objectStore(STORES.BABIES);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const record = request.result as StoredBaby | undefined;
      if (!record || record.ownerScopeId !== normalizedScopeId) {
        resolve(undefined);
        return;
      }
      resolve(stripBabyOwnerScope(record));
    };
  });
};

export const updateBaby = async (baby: Baby, ownerScopeId?: string): Promise<void> => {
  const database = await getDB();
  const normalizedScopeId = normalizeOwnerScopeId(ownerScopeId);

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const getRequest = store.get(baby.id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result as StoredBaby | undefined;
      if (existingRecord && existingRecord.ownerScopeId !== normalizedScopeId) {
        reject(new Error('Cannot update a baby profile owned by another account.'));
        return;
      }

      const putRequest = store.put({
        ...baby,
        ownerScopeId: normalizedScopeId,
      } as StoredBaby);

      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
};

export const transferBabyOwnerScope = async (
  id: string,
  fromOwnerScopeId?: string,
  toOwnerScopeId?: string,
): Promise<boolean> => {
  const database = await getDB();
  const normalizedFromScopeId = normalizeOwnerScopeId(fromOwnerScopeId);
  const normalizedToScopeId = normalizeOwnerScopeId(toOwnerScopeId);

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result as StoredBaby | undefined;
      if (!existingRecord) {
        resolve(false);
        return;
      }

      if (existingRecord.ownerScopeId === normalizedToScopeId) {
        resolve(false);
        return;
      }

      if (existingRecord.ownerScopeId !== normalizedFromScopeId) {
        reject(new Error('Cannot transfer a baby profile owned by another account.'));
        return;
      }

      const putRequest = store.put({
        ...existingRecord,
        ownerScopeId: normalizedToScopeId,
      } as StoredBaby);

      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(true);
    };
  });
};

export const deleteBaby = async (id: string, ownerScopeId?: string): Promise<void> => {
  const database = await getDB();
  const normalizedScopeId = normalizeOwnerScopeId(ownerScopeId);

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.BABIES, ...BABY_PROFILE_DEPENDENT_STORES], 'readwrite');
    const store = tx.objectStore(STORES.BABIES);
    const getRequest = store.get(id);
    let settled = false;

    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error || 'Failed to delete baby profile.')));
    };

    const deleteStoreRecordsForBaby = (storeName: string) => {
      const dependentStore = tx.objectStore(storeName);
      const cursorRequest = dependentStore.openCursor();

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;

        const record = cursor.value as { babyId?: string };
        if (record.babyId === id) {
          cursor.delete();
        }
        cursor.continue();
      };
    };

    tx.oncomplete = resolveOnce;
    tx.onerror = () => rejectOnce(tx.error || getRequest.error);
    tx.onabort = () => rejectOnce(tx.error || new Error('Baby profile deletion was cancelled.'));
    getRequest.onerror = () => rejectOnce(getRequest.error);
    getRequest.onsuccess = () => {
      const existingRecord = getRequest.result as StoredBaby | undefined;
      if (!existingRecord) {
        return;
      }

      if (existingRecord.ownerScopeId !== normalizedScopeId) {
        rejectOnce(new Error('Cannot delete a baby profile owned by another account.'));
        tx.abort();
        return;
      }

      store.delete(id);
      BABY_PROFILE_DEPENDENT_STORES.forEach(deleteStoreRecordsForBaby);
    };
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
