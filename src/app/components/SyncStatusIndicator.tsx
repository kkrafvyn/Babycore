import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, Download, CheckCircle } from 'lucide-react';
import { cloudSyncManager, type SyncState } from '../../lib/cloud-sync';
import { motion, AnimatePresence } from 'motion/react';

interface SyncStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  compact = false,
  showDetails = true,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(cloudSyncManager.getSyncState());
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handleSyncStateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSyncState(customEvent.detail);

      // Show toast on sync complete
      if (customEvent.detail.isSyncing === false && syncState.isSyncing === true) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    };

    window.addEventListener('syncStateChanged', handleSyncStateChange);
    return () => window.removeEventListener('syncStateChanged', handleSyncStateChange);
  }, [syncState]);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-500 ${
          syncState.isOnline
            ? syncState.isSyncing
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
        }`}
      >
        {syncState.isOnline ? (
          syncState.isSyncing ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                <Download size={14} />
              </motion.div>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <CheckCircle size={14} />
              <span>Synced</span>
            </>
          )
        ) : (
          <>
            <CloudOff size={14} />
            <span>Offline</span>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <>
      {/* Full Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
      >
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncState.isOnline ? (
              syncState.isSyncing ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Cloud className="text-blue-500" size={20} />
                  </motion.div>
                  <span className="font-600 text-gray-900 dark:text-white">Syncing...</span>
                </>
              ) : (
                <>
                  <Cloud className="text-green-500" size={20} />
                  <span className="font-600 text-gray-900 dark:text-white">All synced</span>
                </>
              )
            ) : (
              <>
                <CloudOff className="text-gray-500" size={20} />
                <span className="font-600 text-gray-900 dark:text-white">Offline mode</span>
              </>
            )}
          </div>

          {syncState.pendingChanges > 0 && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm font-600">
              {syncState.pendingChanges} pending
            </div>
          )}
        </div>

        {/* Status Details */}
        {showDetails && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Internet Connection</span>
              <span className={syncState.isOnline ? 'text-green-600 dark:text-green-400 font-600' : 'text-gray-500'}>
                {syncState.isOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Sync Status</span>
              <span className="font-500 text-gray-900 dark:text-white">
                {syncState.isSyncing ? 'In progress...' : 'Ready'}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Account Scope</span>
              <span className="font-500 text-gray-900 dark:text-white">
                {syncState.dataScope === 'account' ? syncState.accountEmail || 'Signed in' : 'Guest only'}
              </span>
            </div>

            {syncState.lastSyncTime && (
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>Last Sync</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {getTimeAgo(syncState.lastSyncTime)}
                </span>
              </div>
            )}

            {syncState.pendingChanges > 0 && (
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>Changes Pending</span>
                <span className="font-600 text-orange-600 dark:text-orange-400">
                  {syncState.pendingChanges} item{syncState.pendingChanges !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Local Snapshot</span>
              <span className="text-gray-700 dark:text-gray-300">
                {syncState.localSummary.babyCount} babies, {syncState.localSummary.totalRecordCount} records
              </span>
            </div>
          </div>
        )}

        {/* Auto-sync Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded p-2 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Download size={14} />
          <span>Changes sync automatically every 5 minutes when online</span>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 bg-green-500 text-white rounded-lg px-4 py-3 shadow-lg flex items-center gap-2 z-40"
          >
            <CheckCircle size={20} />
            <span className="font-500">All changes synced</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Compact hook for status indicator in headers
 */
export const useSyncStatus = () => {
  const [syncState, setSyncState] = useState<SyncState>(cloudSyncManager.getSyncState());

  useEffect(() => {
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSyncState(customEvent.detail);
    };

    window.addEventListener('syncStateChanged', handleSync);
    return () => window.removeEventListener('syncStateChanged', handleSync);
  }, []);

  return syncState;
};

/**
 * Helper function to format time ago
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
