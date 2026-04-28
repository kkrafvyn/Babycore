import { describe, expect, it } from 'vitest';
import { resolveSyncScope, summarizeSyncSnapshot } from './sync-diagnostics';

describe('sync-diagnostics', () => {
  it('summarizes snapshot counts safely', () => {
    expect(
      summarizeSyncSnapshot({
        babies: [{ id: 'baby-1' }],
        sleepLogs: [{ id: 'sleep-1' }, { id: 'sleep-2' }],
        feedLogs: [{ id: 'feed-1' }],
        diaperLogs: [],
        growthMeasurements: [{ id: 'growth-1' }],
        vaccinationRecords: [{ id: 'vaccine-1' }, { id: 'vaccine-2' }],
        milestones: [{ id: 'milestone-1' }],
        memories: [{ id: 'memory-1' }, { id: 'memory-2' }, { id: 'memory-3' }],
      }),
    ).toEqual({
      babyCount: 1,
      sleepLogCount: 2,
      feedLogCount: 1,
      diaperLogCount: 0,
      growthMeasurementCount: 1,
      vaccinationRecordCount: 2,
      milestoneCount: 1,
      memoryCount: 3,
      totalRecordCount: 10,
    });
  });

  it('falls back to zeroes for missing collections', () => {
    expect(summarizeSyncSnapshot(null)).toEqual({
      babyCount: 0,
      sleepLogCount: 0,
      feedLogCount: 0,
      diaperLogCount: 0,
      growthMeasurementCount: 0,
      vaccinationRecordCount: 0,
      milestoneCount: 0,
      memoryCount: 0,
      totalRecordCount: 0,
    });
  });

  it('resolves guest and account scopes', () => {
    expect(resolveSyncScope(true)).toBe('account');
    expect(resolveSyncScope(false)).toBe('guest');
  });
});
