import { emitCareWorkspaceUpdated } from './care-workspace-events';
import type { OfflineEmergencyCardSnapshot } from './offline-emergency-card';
import {
  getAllOfflineEmergencyCardSnapshots,
  replaceOfflineEmergencyCardSnapshots,
} from './offline-emergency-card';
import type { ParentWellnessEntry } from './parent-wellness';
import {
  getAllParentWellnessEntries,
  replaceParentWellnessEntries,
} from './parent-wellness';
import type { SharedCareTask } from './shared-care-tasks';
import {
  getAllSharedCareTasks,
  replaceSharedCareTasks,
} from './shared-care-tasks';

export interface CareWorkspaceSyncData {
  sharedCareTasks: SharedCareTask[];
  parentWellnessEntries: ParentWellnessEntry[];
  offlineEmergencySnapshots: OfflineEmergencyCardSnapshot[];
  syncedAt: string;
}

const mergeById = <T extends { id?: string; babyId?: string; savedAt?: string }>(
  current: T[],
  incoming: T[],
): T[] => {
  const index = new Map<string, T>();

  current.forEach((item) => {
    const key = String(item.id || `${item.babyId || ''}:${item.savedAt || ''}`);
    index.set(key, item);
  });

  incoming.forEach((item) => {
    const key = String(item.id || `${item.babyId || ''}:${item.savedAt || ''}`);
    index.set(key, item);
  });

  return Array.from(index.values());
};

const normalizeBabyIds = (babyIds?: string[]): Set<string> | null => {
  if (!babyIds?.length) return null;
  return new Set(babyIds.map((babyId) => String(babyId || '').trim()).filter(Boolean));
};

export const buildCareWorkspaceSyncData = (babyIds?: string[]): CareWorkspaceSyncData => {
  const allowedBabyIds = normalizeBabyIds(babyIds);
  const includeBaby = (babyId: string) => !allowedBabyIds || allowedBabyIds.has(babyId);

  return {
    sharedCareTasks: getAllSharedCareTasks().filter((task) => includeBaby(task.babyId)),
    parentWellnessEntries: getAllParentWellnessEntries().filter((entry) => includeBaby(entry.babyId)),
    offlineEmergencySnapshots: getAllOfflineEmergencyCardSnapshots().filter((snapshot) =>
      includeBaby(snapshot.babyId),
    ),
    syncedAt: new Date().toISOString(),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseCareWorkspaceSyncData = (value: unknown): CareWorkspaceSyncData | null => {
  if (!isRecord(value)) return null;

  return {
    sharedCareTasks: Array.isArray(value.sharedCareTasks) ? (value.sharedCareTasks as SharedCareTask[]) : [],
    parentWellnessEntries: Array.isArray(value.parentWellnessEntries)
      ? (value.parentWellnessEntries as ParentWellnessEntry[])
      : [],
    offlineEmergencySnapshots: Array.isArray(value.offlineEmergencySnapshots)
      ? (value.offlineEmergencySnapshots as OfflineEmergencyCardSnapshot[])
      : [],
    syncedAt: typeof value.syncedAt === 'string' ? value.syncedAt : new Date().toISOString(),
  };
};

export const mergeCareWorkspaceSyncData = (
  currentValue: unknown,
  incomingValue: unknown,
  babyIds?: string[],
): CareWorkspaceSyncData | null => {
  const current = parseCareWorkspaceSyncData(currentValue) || buildCareWorkspaceSyncData();
  const incoming = parseCareWorkspaceSyncData(incomingValue);
  if (!incoming) {
    return parseCareWorkspaceSyncData(currentValue);
  }

  const allowedBabyIds = normalizeBabyIds(babyIds);
  const includeBaby = (babyId: string) => !allowedBabyIds || allowedBabyIds.has(babyId);
  const keepOtherBabies = <T extends { babyId: string }>(items: T[]) =>
    items.filter((item) => !includeBaby(item.babyId));
  const keepSelectedBabies = <T extends { babyId: string }>(items: T[]) =>
    items.filter((item) => includeBaby(item.babyId));

  return {
    sharedCareTasks: mergeById(
      keepOtherBabies(current.sharedCareTasks),
      keepSelectedBabies(incoming.sharedCareTasks),
    ),
    parentWellnessEntries: mergeById(
      keepOtherBabies(current.parentWellnessEntries),
      keepSelectedBabies(incoming.parentWellnessEntries),
    ),
    offlineEmergencySnapshots: mergeById(
      keepOtherBabies(current.offlineEmergencySnapshots),
      keepSelectedBabies(incoming.offlineEmergencySnapshots),
    ),
    syncedAt: incoming.syncedAt || current.syncedAt || new Date().toISOString(),
  };
};

export const applyCareWorkspaceSyncData = (value: unknown) => {
  const parsed = parseCareWorkspaceSyncData(value);
  if (!parsed) {
    return;
  }

  replaceSharedCareTasks(parsed.sharedCareTasks);
  replaceParentWellnessEntries(parsed.parentWellnessEntries);
  replaceOfflineEmergencyCardSnapshots(parsed.offlineEmergencySnapshots);
  emitCareWorkspaceUpdated({ source: 'sync' });
};

export const applyCareWorkspaceSyncDataForBabies = (value: unknown, babyIds: string[]) => {
  const merged = mergeCareWorkspaceSyncData(buildCareWorkspaceSyncData(), value, babyIds);
  if (!merged) {
    return;
  }

  replaceSharedCareTasks(merged.sharedCareTasks);
  replaceParentWellnessEntries(merged.parentWellnessEntries);
  replaceOfflineEmergencyCardSnapshots(merged.offlineEmergencySnapshots);
  emitCareWorkspaceUpdated({ babyId: babyIds[0], source: 'sync' });
};
