/**
 * Cloud Sync Module
 * Handles Supabase integration for cloud backup and multi-device sync
 * Supports offline-first architecture with automatic sync when online
 */

import React from 'react';
import { Baby, SleepLog, FeedLog, DiaperLog, GrowthMeasurement, VaccinationRecord } from '../types/index';
import {
  getBabies,
  getDiaperLogsByBaby,
  getFeedLogsByBaby,
  getGrowthMeasurementsByBaby,
  getMemoryLogsByBaby,
  getMilestonesByBaby,
  getSleepLogsByBaby,
  getUserSettings,
  getVaccinationRecordsByBaby,
} from './supabase-storage';
import { pullFromCloud, performFullSync as performCloudSync } from './cloud-sync-service';
import { getCurrentUser } from './supabase';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  pendingChanges: number;
}

export interface SyncConflict {
  id: string;
  type: 'local' | 'remote';
  data: any;
  timestamp: Date;
}

class CloudSyncManager {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private pendingChanges = 0;
  private syncQueue: Map<string, any> = new Map();
  private lastSyncTime: Date | null = null;
  private syncInterval: number | null = null;

  constructor() {
    this.setupNetworkListeners();
    this.startAutoSync();
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
    this.pendingChanges = this.syncQueue.size;
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
    this.dispatchSyncStateChange();

    try {
      const localSnapshot = await this.buildLocalSnapshot();
      if (!localSnapshot) {
        throw new Error('Unable to build local snapshot');
      }

      const synced = await performCloudSync(localSnapshot);
      if (!synced) {
        throw new Error('Cloud sync rejected by backend');
      }

      this.syncQueue.clear();
      this.lastSyncTime = new Date();
      this.pendingChanges = this.syncQueue.size;

      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
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
    };

    for (const baby of babies) {
      const [sleepLogs, feedLogs, diaperLogs, growthMeasurements, vaccinationRecords, milestones, memories] =
        await Promise.all([
          getSleepLogsByBaby(baby.id),
          getFeedLogsByBaby(baby.id),
          getDiaperLogsByBaby(baby.id),
          getGrowthMeasurementsByBaby(baby.id),
          getVaccinationRecordsByBaby(baby.id),
          getMilestonesByBaby(baby.id),
          getMemoryLogsByBaby(baby.id),
        ]);

      aggregate.sleepLogs.push(...sleepLogs);
      aggregate.feedLogs.push(...feedLogs);
      aggregate.diaperLogs.push(...diaperLogs);
      aggregate.growthMeasurements.push(...growthMeasurements);
      aggregate.vaccinationRecords.push(...vaccinationRecords);
      aggregate.milestones.push(...milestones);
      aggregate.memories.push(...memories);
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
      userSettings,
    };
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
    };
  }

  /**
   * Handle sync conflicts (local vs remote)
   */
  async resolveConflict(conflict: SyncConflict, resolution: 'local' | 'remote'): Promise<void> {
    console.log(`Resolving conflict for ${conflict.id} with ${resolution} version`);

    if (resolution === 'local') {
      // Queue local change again
      this.queueChange(conflict.id, conflict.data, 'update');
    }
    // If remote, just ignore the local version
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.syncAll();
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.pendingChanges;
  }

  /**
   * Clear sync queue (use with caution)
   */
  clearSyncQueue(): void {
    this.syncQueue.clear();
    this.pendingChanges = 0;
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
