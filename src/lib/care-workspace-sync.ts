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

export const applyCareWorkspaceSyncData = (value: unknown) => {
  const parsed = parseCareWorkspaceSyncData(value);
  if (!parsed) {
    return;
  }

  replaceSharedCareTasks(parsed.sharedCareTasks);
  replaceParentWellnessEntries(parsed.parentWellnessEntries);
  replaceOfflineEmergencyCardSnapshots(parsed.offlineEmergencySnapshots);
};
