import type { EmergencyShareCardResponse } from './care-advanced-api';
import {
  formatEmergencyHealthCard,
  type EmergencyHealthCard,
} from './emergency-health-card-service';

export interface OfflineEmergencyCardSnapshot {
  babyId: string;
  babyName: string;
  savedAt: string;
  source: 'api' | 'fallback' | 'hybrid';
  text: string;
  apiCard: EmergencyShareCardResponse | null;
  fallbackCard: EmergencyHealthCard | null;
}

interface SaveOfflineEmergencyCardInput {
  babyId: string;
  babyName: string;
  apiCard?: EmergencyShareCardResponse | null;
  fallbackCard?: EmergencyHealthCard | null;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'babylog.offline-emergency-cards.v1';
const memoryStorage = new Map<string, string>();

const getStorage = (): StorageLike => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
    },
  };
};

const readAllSnapshots = (): OfflineEmergencyCardSnapshot[] => {
  const raw = getStorage().getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as OfflineEmergencyCardSnapshot[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((snapshot) => typeof snapshot?.babyId === 'string' && snapshot.babyId.trim().length > 0);
  } catch {
    return [];
  }
};

const writeAllSnapshots = (snapshots: OfflineEmergencyCardSnapshot[]) => {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(snapshots));
};

export const getAllOfflineEmergencyCardSnapshots = (): OfflineEmergencyCardSnapshot[] =>
  readAllSnapshots();

export const getOfflineEmergencyCardSnapshot = (
  babyId: string,
): OfflineEmergencyCardSnapshot | null =>
  readAllSnapshots().find((snapshot) => snapshot.babyId === babyId) ?? null;

export const saveOfflineEmergencyCardSnapshot = (
  input: SaveOfflineEmergencyCardInput,
): OfflineEmergencyCardSnapshot => {
  const apiCard = input.apiCard ?? null;
  const fallbackCard = input.fallbackCard ?? null;
  const text = apiCard?.text || (fallbackCard ? formatEmergencyHealthCard(fallbackCard) : '');

  if (!text.trim()) {
    throw new Error('Emergency card data is required before saving an offline snapshot.');
  }

  const nextSnapshot: OfflineEmergencyCardSnapshot = {
    babyId: input.babyId,
    babyName: input.babyName,
    savedAt: new Date().toISOString(),
    source: apiCard && fallbackCard ? 'hybrid' : apiCard ? 'api' : 'fallback',
    text,
    apiCard,
    fallbackCard,
  };

  const existing = readAllSnapshots().filter((snapshot) => snapshot.babyId !== input.babyId);
  existing.push(nextSnapshot);
  writeAllSnapshots(existing);
  return nextSnapshot;
};

export const clearOfflineEmergencyCardSnapshot = (babyId: string): boolean => {
  const snapshots = readAllSnapshots();
  const filtered = snapshots.filter((snapshot) => snapshot.babyId !== babyId);
  if (filtered.length === snapshots.length) return false;
  writeAllSnapshots(filtered);
  return true;
};

export const replaceOfflineEmergencyCardSnapshots = (
  snapshots: OfflineEmergencyCardSnapshot[],
) => {
  writeAllSnapshots(
    snapshots.filter(
      (snapshot) => typeof snapshot?.babyId === 'string' && snapshot.babyId.trim().length > 0,
    ),
  );
};

export const clearOfflineEmergencyCardSnapshotsForTests = () => {
  getStorage().removeItem(STORAGE_KEY);
  memoryStorage.delete(STORAGE_KEY);
};
