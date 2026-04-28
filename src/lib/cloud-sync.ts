/**
 * Cloud Sync Module
 * Handles Supabase integration for cloud backup and multi-device sync
 * Supports offline-first architecture with automatic sync when online
 */

import React from 'react';
import { Baby, SleepLog, FeedLog, DiaperLog, GrowthMeasurement, VaccinationRecord, JournalEntry } from '../types/index';
import {
  getBabies,
  getDiaperLogsByBaby,
  getFeedLogsByBaby,
  getGrowthMeasurementsByBaby,
  getJournalEntriesByBaby,
  getMemoryLogsByBaby,
  getMilestonesByBaby,
  getSleepLogsByBaby,
  getUserSettings,
  getVaccinationRecordsByBaby,
} from './supabase-storage';
import { pullFromCloud, performFullSync as performCloudSync } from './cloud-sync-service';
import { getCurrentUser } from './supabase';
import { resolveSyncScope, summarizeSyncSnapshot, type SyncSnapshotSummary } from './sync-diagnostics';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  pendingChanges: number;
  syncError?: string | null;
  conflicts: SyncConflict[];
  accountId?: string | null;
  accountEmail?: string | null;
  dataScope: 'guest' | 'account';
  localSummary: SyncSnapshotSummary;
}

export interface SyncConflict {
  id: string;
  dataset?: string;
  recordId?: string;
  type: 'local' | 'remote';
  data: any;
  remoteData?: any;
  timestamp: Date;
}

class CloudSyncManager {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private pendingChanges = 0;
  private syncError: string | null = null;
  private conflicts: SyncConflict[] = [];
  private resolvedConflictKeys: Set<string> = new Set();
  private syncQueue: Map<string, any> = new Map();
  private lastSyncTime: Date | null = null;
  private syncInterval: number | null = null;
  private accountId: string | null = null;
  private accountEmail: string | null = null;
  private dataScope: 'guest' | 'account' = 'guest';
  private localSummary: SyncSnapshotSummary = summarizeSyncSnapshot(null);

  constructor() {
    this.setupNetworkListeners();
    this.startAutoSync();
    void this.refreshDiagnostics();
  }

  /**
   * Setup online/offline listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  }

  /**
   * Handle going online
   */
  private onOnline(): void {
    this.isOnline = true;
    console.log('App is online, starting sync...');
    this.syncAll();
    this.dispatchSyncStateChange();
  }

  /**
   * Handle going offline
   */
  private onOffline(): void {
    this.isOnline = false;
    console.log('App is offline');
    this.dispatchSyncStateChange();
  }

  /**
   * Start automatic sync every 5 minutes
   */
  private startAutoSync(): void {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime || undefined,
      pendingChanges: this.pendingChanges,
      syncError: this.syncError,
      conflicts: this.conflicts,
      accountId: this.accountId,
      accountEmail: this.accountEmail,
      dataScope: this.dataScope,
      localSummary: this.localSummary,
    };
  }

  /**
   * Queue a local change for sync
   */
  queueChange(key: string, data: any, type: 'create' | 'update' | 'delete'): void {
    this.syncQueue.set(key, {
      data,
      type,
      timestamp: new Date().toISOString(),
    });
    this.pendingChanges = this.syncQueue.size + this.conflicts.length;
    this.dispatchSyncStateChange();

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.syncAll();
    }
  }

  /**
   * Sync all pending changes to cloud
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.syncError = null;
    this.dispatchSyncStateChange();

    try {
      const localSnapshot = await this.buildLocalSnapshot();
      if (!localSnapshot) {
        throw new Error('Unable to build local snapshot');
      }

      this.captureDiagnosticsFromSnapshot(localSnapshot);

      const remoteSnapshot = await pullFromCloud().catch(() => null);
      if (remoteSnapshot) {
        this.conflicts = this.detectConflicts(localSnapshot, remoteSnapshot);
        if (this.conflicts.length > 0) {
          this.syncError = 'Conflicts detected. Resolve conflicts before syncing.';
          this.pendingChanges = this.syncQueue.size + this.conflicts.length;
          this.dispatchSyncStateChange();
          return;
        }
      } else {
        this.conflicts = [];
      }

      const synced = await performCloudSync(localSnapshot);
      if (!synced) {
        throw new Error('Cloud sync rejected by backend');
      }

      this.syncQueue.clear();
      this.conflicts = [];
      this.lastSyncTime = new Date();
      this.pendingChanges = this.syncQueue.size;

      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncError = error instanceof Error ? error.message : String(error);
    } finally {
      this.isSyncing = false;
      this.dispatchSyncStateChange();
    }
  }

  private captureDiagnosticsFromSnapshot(snapshot: {
    babies: any[];
    sleepLogs: any[];
    feedLogs: any[];
    diaperLogs: any[];
    growthMeasurements: any[];
    vaccinationRecords: any[];
    milestones: any[];
    memories: any[];
    journalEntries: any[];
    userSettings: any;
  }): void {
    this.localSummary = summarizeSyncSnapshot(snapshot);
  }

  async refreshDiagnostics(): Promise<void> {
    try {
      const user = await getCurrentUser();
      this.accountId = user?.id || null;
      this.accountEmail = user?.email || null;
      this.dataScope = resolveSyncScope(Boolean(user?.id));

      const localSnapshot = await this.buildLocalSnapshot();
      if (localSnapshot) {
        this.captureDiagnosticsFromSnapshot(localSnapshot);
      } else {
        this.localSummary = summarizeSyncSnapshot(null);
      }
    } catch (error) {
      console.warn('Unable to refresh sync diagnostics:', error);
    } finally {
      this.dispatchSyncStateChange();
    }
  }

  private async buildLocalSnapshot(): Promise<{
    babies: any[];
    sleepLogs: any[];
    feedLogs: any[];
    diaperLogs: any[];
    growthMeasurements: any[];
    vaccinationRecords: any[];
    milestones: any[];
    memories: any[];
    journalEntries: any[];
    userSettings: any;
  } | null> {
    const babies = await getBabies();
    const aggregate = {
      sleepLogs: [] as any[],
      feedLogs: [] as any[],
      diaperLogs: [] as any[],
      growthMeasurements: [] as any[],
      vaccinationRecords: [] as any[],
      milestones: [] as any[],
      memories: [] as any[],
      journalEntries: [] as any[],
    };

    for (const baby of babies) {
      const [sleepLogs, feedLogs, diaperLogs, growthMeasurements, vaccinationRecords, milestones, memories, journalEntries] =
        await Promise.all([
          getSleepLogsByBaby(baby.id),
          getFeedLogsByBaby(baby.id),
          getDiaperLogsByBaby(baby.id),
          getGrowthMeasurementsByBaby(baby.id),
          getVaccinationRecordsByBaby(baby.id),
          getMilestonesByBaby(baby.id),
          getMemoryLogsByBaby(baby.id),
          getJournalEntriesByBaby(baby.id),
        ]);

      aggregate.sleepLogs.push(...sleepLogs);
      aggregate.feedLogs.push(...feedLogs);
      aggregate.diaperLogs.push(...diaperLogs);
      aggregate.growthMeasurements.push(...growthMeasurements);
      aggregate.vaccinationRecords.push(...vaccinationRecords);
      aggregate.milestones.push(...milestones);
      aggregate.memories.push(...memories);
      aggregate.journalEntries.push(...journalEntries);
    }

    const user = await getCurrentUser();
    const userSettings = user?.id ? await getUserSettings(user.id) : null;

    return {
      babies,
      sleepLogs: aggregate.sleepLogs,
      feedLogs: aggregate.feedLogs,
      diaperLogs: aggregate.diaperLogs,
      growthMeasurements: aggregate.growthMeasurements,
      vaccinationRecords: aggregate.vaccinationRecords,
      milestones: aggregate.milestones,
      memories: aggregate.memories,
      journalEntries: aggregate.journalEntries,
      userSettings,
    };
  }

  private stableStringify(value: any): string {
    if (value === null || value === undefined) return String(value);
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value).sort();
      return `{${keys
        .map((key) => `${JSON.stringify(key)}:${this.stableStringify((value as Record<string, any>)[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  private recordsEqual(left: any, right: any): boolean {
    return this.stableStringify(left) === this.stableStringify(right);
  }

  private extractRecordTimestamp(record: any): number {
    const candidates = [
      record?.updatedAt,
      record?.updated_at,
      record?.logged_at,
      record?.timestamp,
      record?.date,
      record?.createdAt,
      record?.created_at,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const parsed = Date.parse(String(candidate));
      if (!Number.isNaN(parsed)) return parsed;
    }

    return 0;
  }

  private detectConflicts(localSnapshot: any, remoteSnapshot: any): SyncConflict[] {
    const datasets = [
      'babies',
      'sleepLogs',
      'feedLogs',
      'diaperLogs',
      'growthMeasurements',
      'vaccinationRecords',
      'milestones',
      'memories',
      'journalEntries',
    ] as const;

    const conflicts: SyncConflict[] = [];

    for (const dataset of datasets) {
      const localRows = Array.isArray(localSnapshot?.[dataset]) ? localSnapshot[dataset] : [];
      const remoteRows = Array.isArray(remoteSnapshot?.[dataset]) ? remoteSnapshot[dataset] : [];
      const remoteMap = new Map<string, any>();

      for (const row of remoteRows) {
        if (!row?.id) continue;
        remoteMap.set(String(row.id), row);
      }

      for (const localRow of localRows) {
        const recordId = String(localRow?.id || '');
        if (!recordId) continue;
        const remoteRow = remoteMap.get(recordId);
        if (!remoteRow) continue;

        const localTimestamp = this.extractRecordTimestamp(localRow);
        const remoteTimestamp = this.extractRecordTimestamp(remoteRow);
        if (localTimestamp === 0 || remoteTimestamp === 0) {
          continue;
        }

        if (Math.abs(localTimestamp - remoteTimestamp) < 1000) {
          continue;
        }

        if (this.recordsEqual(localRow, remoteRow)) {
          continue;
        }

        const conflictKey = `${dataset}:${recordId}:${localTimestamp}:${remoteTimestamp}`;
        if (this.resolvedConflictKeys.has(conflictKey)) {
          continue;
        }

        conflicts.push({
          id: conflictKey,
          dataset,
          recordId,
          type: localTimestamp >= remoteTimestamp ? 'local' : 'remote',
          data: localRow,
          remoteData: remoteRow,
          timestamp: new Date(Math.max(localTimestamp, remoteTimestamp)),
        });
      }
    }

    return conflicts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Pull remote changes from cloud
   */
  async pullRemoteChanges(): Promise<{
    babies: Baby[];
    sleepLogs: SleepLog[];
    feedLogs: FeedLog[];
    diaperLogs: DiaperLog[];
    growthMeasurements: GrowthMeasurement[];
    vaccinationRecords: VaccinationRecord[];
    journalEntries: JournalEntry[];
  }> {
    if (!this.isOnline) {
      throw new Error('Cannot pull changes while offline');
    }

    const remote = await pullFromCloud();
    return {
      babies: remote?.babies || [],
      sleepLogs: remote?.sleepLogs || [],
      feedLogs: remote?.feedLogs || [],
      diaperLogs: remote?.diaperLogs || [],
      growthMeasurements: remote?.growthMeasurements || [],
      vaccinationRecords: remote?.vaccinationRecords || [],
      journalEntries: remote?.journalEntries || [],
    };
  }

  /**
   * Handle sync conflicts (local vs remote)
   */
  async resolveConflict(conflict: SyncConflict, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    console.log(`Resolving conflict for ${conflict.id} with ${resolution} version`);

    if (resolution === 'local') {
      // Queue local change again
      this.queueChange(conflict.id, conflict.data, 'update');
    } else if (resolution === 'merge') {
      const merged = mergeConflictData(conflict.data, conflict.remoteData || {});
      this.queueChange(conflict.id, merged, 'update');
    }

    // If resolution is remote, we intentionally skip local re-queue and trust cloud copy.
    this.resolvedConflictKeys.add(conflict.id);
    this.conflicts = this.conflicts.filter((entry) => entry.id !== conflict.id);
    this.pendingChanges = this.syncQueue.size + this.conflicts.length;
    if (this.conflicts.length === 0) {
      this.syncError = null;
    }
    this.dispatchSyncStateChange();

    if (this.isOnline && !this.isSyncing && this.conflicts.length === 0) {
      await this.syncAll();
    }
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.refreshDiagnostics();
    await this.syncAll();
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.pendingChanges;
  }

  getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  /**
   * Clear sync queue (use with caution)
   */
  clearSyncQueue(): void {
    this.syncQueue.clear();
    this.pendingChanges = this.conflicts.length;
    this.dispatchSyncStateChange();
  }

  /**
   * Dispatch sync state change event
   */
  private dispatchSyncStateChange(): void {
    window.dispatchEvent(
      new CustomEvent('syncStateChanged', {
        detail: this.getSyncState(),
      }),
    );
  }

  /**
   * Export all local data
   */
  async exportAllData(): Promise<Blob> {
    const snapshot = await this.buildLocalSnapshot();
    const data = {
      snapshot,
      syncQueue: Array.from(this.syncQueue.entries()),
      lastSyncTime: this.lastSyncTime,
      exportTime: new Date().toISOString(),
    };

    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }

  /**
   * Import data (restore from backup)
   */
  async importData(file: Blob): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text);

    // Process imported data
    if (data.syncQueue) {
      for (const [key, change] of data.syncQueue) {
        this.queueChange(key, change.data, change.type);
      }
    }

    await this.syncAll();
  }
}

export const cloudSyncManager = new CloudSyncManager();

/**
 * React Hook for sync state
 */
export const useSyncState = () => {
  const [syncState, setSyncState] = React.useState<SyncState>(cloudSyncManager.getSyncState());

  React.useEffect(() => {
    const handleSync = (event: CustomEvent) => {
      setSyncState(event.detail);
    };

    window.addEventListener('syncStateChanged', handleSync as EventListener);

    return () => {
      window.removeEventListener('syncStateChanged', handleSync as EventListener);
    };
  }, []);

  return syncState;
};

export function mergeConflictData(localData: any, remoteData: any): any {
  if (!localData) return remoteData;
  if (!remoteData) return localData;

  if (Array.isArray(localData) && Array.isArray(remoteData)) {
    const map = new Map<string, any>();
    for (const item of remoteData) {
      map.set(String(item?.id || JSON.stringify(item)), item);
    }
    for (const item of localData) {
      const key = String(item?.id || JSON.stringify(item));
      const remoteItem = map.get(key);
      if (!remoteItem) {
        map.set(key, item);
        continue;
      }

      const localUpdated = Date.parse(item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at || '');
      const remoteUpdated = Date.parse(
        remoteItem?.updatedAt || remoteItem?.updated_at || remoteItem?.createdAt || remoteItem?.created_at || '',
      );
      map.set(key, Number.isFinite(localUpdated) && localUpdated >= remoteUpdated ? item : remoteItem);
    }
    return Array.from(map.values());
  }

  if (typeof localData === 'object' && typeof remoteData === 'object') {
    const merged: Record<string, any> = { ...remoteData, ...localData };

    for (const key of Object.keys(merged)) {
      const localValue = localData[key];
      const remoteValue = remoteData[key];
      if (
        localValue &&
        remoteValue &&
        typeof localValue === 'object' &&
        typeof remoteValue === 'object' &&
        !Array.isArray(localValue) &&
        !Array.isArray(remoteValue)
      ) {
        merged[key] = mergeConflictData(localValue, remoteValue);
      }
    }

    return merged;
  }

  return localData;
}
