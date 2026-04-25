/**
 * Cloud Sync Module
 * Handles Supabase integration for cloud backup and multi-device sync
 * Supports offline-first architecture with automatic sync when online
 */

import { Baby, SleepLog, FeedLog, DiaperLog, GrowthMeasurement, VaccinationRecord } from '../types/index';

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
      // Sync in batches
      const changes = Array.from(this.syncQueue.entries());

      for (const [key, change] of changes) {
        try {
          await this.syncChange(key, change);
          this.syncQueue.delete(key);
        } catch (error) {
          console.error(`Failed to sync ${key}:`, error);
          // Keep in queue for retry
        }
      }

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

  /**
   * Sync a single change
   */
  private async syncChange(key: string, change: any): Promise<void> {
    // In production, this would call Supabase APIs
    // For now, it's a placeholder
    console.log(`Syncing ${key} (${change.type})`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mocked success
    return Promise.resolve();
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

    // In production, this would fetch from Supabase
    // For now, return empty arrays
    return {
      babies: [],
      sleepLogs: [],
      feedLogs: [],
      diaperLogs: [],
      growthMeasurements: [],
      vaccinationRecords: [],
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
    // Implementation would export local data to JSON
    const data = {
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

// Note: React import would be at top of actual file
import React from 'react';
