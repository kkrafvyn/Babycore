export interface SyncSnapshotLike {
  babies?: unknown[];
  sleepLogs?: unknown[];
  feedLogs?: unknown[];
  diaperLogs?: unknown[];
  growthMeasurements?: unknown[];
  vaccinationRecords?: unknown[];
  milestones?: unknown[];
  memories?: unknown[];
}

export interface SyncSnapshotSummary {
  babyCount: number;
  sleepLogCount: number;
  feedLogCount: number;
  diaperLogCount: number;
  growthMeasurementCount: number;
  vaccinationRecordCount: number;
  milestoneCount: number;
  memoryCount: number;
  totalRecordCount: number;
}

const getCollectionSize = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

export function summarizeSyncSnapshot(snapshot?: SyncSnapshotLike | null): SyncSnapshotSummary {
  const babyCount = getCollectionSize(snapshot?.babies);
  const sleepLogCount = getCollectionSize(snapshot?.sleepLogs);
  const feedLogCount = getCollectionSize(snapshot?.feedLogs);
  const diaperLogCount = getCollectionSize(snapshot?.diaperLogs);
  const growthMeasurementCount = getCollectionSize(snapshot?.growthMeasurements);
  const vaccinationRecordCount = getCollectionSize(snapshot?.vaccinationRecords);
  const milestoneCount = getCollectionSize(snapshot?.milestones);
  const memoryCount = getCollectionSize(snapshot?.memories);

  return {
    babyCount,
    sleepLogCount,
    feedLogCount,
    diaperLogCount,
    growthMeasurementCount,
    vaccinationRecordCount,
    milestoneCount,
    memoryCount,
    totalRecordCount:
      sleepLogCount +
      feedLogCount +
      diaperLogCount +
      growthMeasurementCount +
      vaccinationRecordCount +
      milestoneCount +
      memoryCount,
  };
}

export function resolveSyncScope(hasAuthenticatedUser: boolean): 'guest' | 'account' {
  return hasAuthenticatedUser ? 'account' : 'guest';
}
