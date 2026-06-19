import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Cloud,
  CloudOff,
  DownloadCloud,
  RefreshCw,
  ShieldCheck,
  User,
  Database,
} from 'lucide-react';
import { cloudSyncManager, type SyncConflict, useSyncState } from '../../lib/cloud-sync';

interface SyncCenterProps {
  onBack: () => void;
}

function summarizeConflict(conflict: SyncConflict): string {
  const localPreview = JSON.stringify(conflict.data || {}).slice(0, 120);
  const remotePreview = JSON.stringify(conflict.remoteData || {}).slice(0, 120);
  return `Local: ${localPreview}${localPreview.length >= 120 ? '...' : ''}\nRemote: ${remotePreview}${remotePreview.length >= 120 ? '...' : ''}`;
}

export function SyncCenter({ onBack }: SyncCenterProps) {
  const syncState = useSyncState();
  const [syncingNow, setSyncingNow] = useState(false);
  const [pullingNow, setPullingNow] = useState(false);
  const [refreshingNow, setRefreshingNow] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [pullSummary, setPullSummary] = useState<string>('');

  const hasConflicts = syncState.conflicts.length > 0;

  const syncHealthLabel = useMemo(() => {
    if (!syncState.isOnline) return 'Offline mode';
    if (syncState.isSyncing || syncingNow) return 'Syncing now';
    if (hasConflicts) return 'Conflicts require action';
    return 'Cloud in sync';
  }, [hasConflicts, syncState.isOnline, syncState.isSyncing, syncingNow]);

  const accountLabel = syncState.accountEmail?.trim()
    ? syncState.accountEmail
    : 'Signed-in account';

  const handleRefreshDiagnostics = async () => {
    setRefreshingNow(true);
    try {
      await cloudSyncManager.refreshDiagnostics();
    } finally {
      setRefreshingNow(false);
    }
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    try {
      await cloudSyncManager.manualSync();
    } catch (error: any) {
      alert(error?.message || 'Unable to sync right now.');
    } finally {
      setSyncingNow(false);
    }
  };

  const handlePullSnapshot = async () => {
    setPullingNow(true);
    try {
      const snapshot = await cloudSyncManager.pullRemoteChanges();
      const total =
        (snapshot.babies?.length || 0) +
        (snapshot.sleepLogs?.length || 0) +
        (snapshot.feedLogs?.length || 0) +
        (snapshot.diaperLogs?.length || 0) +
        (snapshot.healthLogs?.length || 0) +
        (snapshot.growthMeasurements?.length || 0) +
        (snapshot.vaccinationRecords?.length || 0) +
        (snapshot.journalEntries?.length || 0);
      setPullSummary(`Pulled latest cloud snapshot (${total} records).`);
    } catch (error: any) {
      setPullSummary(error?.message || 'Unable to pull cloud snapshot.');
    } finally {
      setPullingNow(false);
    }
  };

  const handleResolve = async (conflict: SyncConflict, resolution: 'local' | 'remote' | 'merge') => {
    setResolvingId(conflict.id);
    try {
      await cloudSyncManager.resolveConflict(conflict, resolution);
    } catch (error: any) {
      alert(error?.message || 'Unable to resolve conflict.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/85 backdrop-blur-xl h-16 sm:h-20 px-3 sm:px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-1 sm:-ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Sync Center</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 sm:pt-24 px-3 sm:px-6 pb-28 sm:pb-24">
        <div className="max-w-md mx-auto w-full space-y-5 sm:space-y-4">
          <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Sync Health</p>
              {syncState.isOnline ? (
                <Cloud className="h-5 w-5 text-emerald-500" />
              ) : (
                <CloudOff className="h-5 w-5 text-rose-500" />
              )}
            </div>
            <p className="text-xl font-headline font-black text-foreground mt-1">{syncHealthLabel}</p>
            <p className="text-xs font-semibold text-text-dim mt-2">
              Pending changes: {syncState.pendingChanges} | Conflicts: {syncState.conflicts.length}
            </p>
            {syncState.lastSyncTime && (
              <p className="text-[11px] font-semibold text-text-dim mt-1">
                Last sync: {new Date(syncState.lastSyncTime).toLocaleString()}
              </p>
            )}
            {syncState.syncError && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-2">
                {syncState.syncError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-secondary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Account Scope</p>
              </div>
              <p className="text-sm font-black text-foreground mt-3 break-all">{accountLabel}</p>
              <p className="text-[11px] font-semibold text-text-dim mt-2">
                Data scope: Cloud account
              </p>
            </div>

            <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-secondary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Local Snapshot</p>
              </div>
              <p className="text-sm font-black text-foreground mt-3">
                Babies {syncState.localSummary.babyCount} | Records {syncState.localSummary.totalRecordCount}
              </p>
              <p className="text-[11px] font-semibold text-text-dim mt-2">
                Sleep {syncState.localSummary.sleepLogCount}, Feed {syncState.localSummary.feedLogCount}, Diaper{' '}
                {syncState.localSummary.diaperLogCount}, Health {syncState.localSummary.healthLogCount}, Journal{' '}
                {syncState.localSummary.journalEntryCount}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleManualSync}
              disabled={!syncState.isOnline || syncingNow}
              className="h-11 rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncingNow ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
              Sync Now
            </button>
            <button
              onClick={handlePullSnapshot}
              disabled={!syncState.isOnline || pullingNow}
              className="h-11 rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {pullingNow ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
              Pull Cloud
            </button>
          </div>

          <button
            onClick={handleRefreshDiagnostics}
            disabled={refreshingNow}
            className="h-11 w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {refreshingNow ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Device Status
          </button>

          {pullSummary && (
            <div className="rounded-xl border border-border-gray dark:border-zinc-800 bg-surface p-3 text-xs font-semibold text-text-dim whitespace-pre-wrap">
              {pullSummary}
            </div>
          )}

          <div className="pt-5 sm:pt-0">
            {!hasConflicts && (
              <div className="rounded-[2rem] border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                    No data conflicts detected. Cross-device changes will merge automatically.
                  </p>
                </div>
              </div>
            )}

            {hasConflicts && (
              <div className="space-y-3">
                {syncState.conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded-[1.6rem] border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          {conflict.dataset || 'record'} conflict
                        </p>
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                          Record: {conflict.recordId || conflict.id.slice(0, 8)}
                        </p>
                      </div>
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-1" />
                    </div>

                    <pre className="text-[10px] font-semibold whitespace-pre-wrap text-amber-900 dark:text-amber-100 max-h-32 overflow-y-auto bg-white/60 dark:bg-black/20 rounded-lg p-2 border border-amber-100 dark:border-amber-900/40">
                      {summarizeConflict(conflict)}
                    </pre>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleResolve(conflict, 'local')}
                        disabled={resolvingId === conflict.id}
                        className="h-9 rounded-lg bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider disabled:opacity-60"
                      >
                        Keep Local
                      </button>
                      <button
                        onClick={() => handleResolve(conflict, 'remote')}
                        disabled={resolvingId === conflict.id}
                        className="h-9 rounded-lg bg-surface-gray dark:bg-zinc-900 text-foreground border border-border-gray dark:border-zinc-700 text-[9px] font-black uppercase tracking-wider disabled:opacity-60"
                      >
                        Keep Cloud
                      </button>
                      <button
                        onClick={() => handleResolve(conflict, 'merge')}
                        disabled={resolvingId === conflict.id}
                        className="h-9 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider disabled:opacity-60"
                      >
                        Merge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-border-gray dark:border-zinc-800 bg-surface p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-secondary mt-0.5" />
              <p className="text-xs font-semibold text-text-dim leading-relaxed">
                Conflict resolver uses record timestamps and secure merge rules. Parent owners keep final control over
                medically sensitive edits through approval workflows.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
