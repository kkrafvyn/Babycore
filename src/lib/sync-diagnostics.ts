export interface SyncSnapshotLike {
  babies?: unknown[];
  sleepLogs?: unknown[];
  feedLogs?: unknown[];
  diaperLogs?: unknown[];
  healthLogs?: unknown[];
  growthMeasurements?: unknown[];
  vaccinationRecords?: unknown[];
  milestones?: unknown[];
  memories?: unknown[];
  journalEntries?: unknown[];
}

export interface SyncSnapshotSummary {
  babyCount: number;
  sleepLogCount: number;
  feedLogCount: number;
  diaperLogCount: number;
  healthLogCount: number;
  growthMeasurementCount: number;
  vaccinationRecordCount: number;
  milestoneCount: number;
  memoryCount: number;
  journalEntryCount: number;
  totalRecordCount: number;
}

const getCollectionSize = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

export function summarizeSyncSnapshot(snapshot?: SyncSnapshotLike | null): SyncSnapshotSummary {
  const babyCount = getCollectionSize(snapshot?.babies);
  const sleepLogCount = getCollectionSize(snapshot?.sleepLogs);
  const feedLogCount = getCollectionSize(snapshot?.feedLogs);
  const diaperLogCount = getCollectionSize(snapshot?.diaperLogs);
  const healthLogCount = getCollectionSize(snapshot?.healthLogs);
  const growthMeasurementCount = getCollectionSize(snapshot?.growthMeasurements);
  const vaccinationRecordCount = getCollectionSize(snapshot?.vaccinationRecords);
  const milestoneCount = getCollectionSize(snapshot?.milestones);
  const memoryCount = getCollectionSize(snapshot?.memories);
  const journalEntryCount = getCollectionSize(snapshot?.journalEntries);

  return {
    babyCount,
    sleepLogCount,
    feedLogCount,
    diaperLogCount,
    healthLogCount,
    growthMeasurementCount,
    vaccinationRecordCount,
    milestoneCount,
    memoryCount,
    journalEntryCount,
    totalRecordCount:
      sleepLogCount +
      feedLogCount +
      diaperLogCount +
      healthLogCount +
      growthMeasurementCount +
      vaccinationRecordCount +
      milestoneCount +
      memoryCount +
      journalEntryCount,
  };
}

export function resolveSyncScope(hasAuthenticatedUser: boolean): 'guest' | 'account' {
  return hasAuthenticatedUser ? 'account' : 'guest';
}
