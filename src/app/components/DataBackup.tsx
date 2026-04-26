import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Download,
  Cloud,
  HardDrive,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Database,
  ListChecks,
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'motion/react';
import { performFullSync } from '../../lib/cloud-sync-service';

interface DataBackupProps {
  onBack: () => void;
}

interface BackupFile {
  id: string;
  date: string;
  size: string;
  format: 'json' | 'csv';
  type: 'automatic' | 'manual' | 'cloud';
}

const BACKUP_HISTORY_KEY = 'babylog_backup_history';
const MAX_BACKUP_HISTORY = 25;

export const DataBackup: React.FC<DataBackupProps> = ({ onBack }) => {
  const {
    user,
    currentBaby,
    babies,
    settings,
    feedLogs,
    sleepLogs,
    diaperLogs,
    growthMeasurements,
    vaccinationRecords,
    healthLogs,
    memories,
    milestones,
  } = useAppContext();

  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStamp = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setBackups(parsed);
      if (parsed[0]?.date) {
        setLastBackup(parsed[0].date);
      }
    } catch (error) {
      console.warn('Unable to load backup history:', error);
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const saveBackupHistory = (next: BackupFile[]) => {
    setBackups(next);
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(next));
  };

  const appendBackupHistory = (format: 'json' | 'csv', type: BackupFile['type'], sizeBytes: number) => {
    const createdAt = new Date().toLocaleString();
    const nextEntry: BackupFile = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: createdAt,
      size: formatBytes(sizeBytes),
      format,
      type,
    };

    const next = [nextEntry, ...backups].slice(0, MAX_BACKUP_HISTORY);
    saveBackupHistory(next);
    setLastBackup(createdAt);
  };

  const buildBackupPayload = () => {
    return {
      exportedAt: new Date().toISOString(),
      user: user ? { id: user.id, email: user.email } : null,
      baby: currentBaby,
      babies,
      settings,
      records: {
        feedLogs,
        sleepLogs,
        diaperLogs,
        growthMeasurements,
        vaccinationRecords,
        healthLogs,
        memories,
        milestones,
      },
    };
  };

  const downloadFile = (filename: string, mimeType: string, content: string): number => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return blob.size;
  };

  const toCsv = (payload: ReturnType<typeof buildBackupPayload>): string => {
    const rows: string[] = [];
    rows.push('Section,Field,Value');
    rows.push(`Meta,Exported At,${payload.exportedAt}`);
    rows.push(`User,ID,${payload.user?.id || ''}`);
    rows.push(`User,Email,${payload.user?.email || ''}`);
    rows.push(`Baby,Name,${payload.baby?.name || ''}`);
    rows.push(`Baby,Date Of Birth,${payload.baby?.dateOfBirth || ''}`);
    rows.push(`Baby,Country,${payload.baby?.country || ''}`);
    rows.push(`Settings,Units,${payload.settings?.units || ''}`);
    rows.push(`Settings,Language,${payload.settings?.language || ''}`);
    rows.push(`Settings,Theme,${payload.settings?.theme || ''}`);
    rows.push(`Summary,Feed Logs,${payload.records.feedLogs.length}`);
    rows.push(`Summary,Sleep Logs,${payload.records.sleepLogs.length}`);
    rows.push(`Summary,Diaper Logs,${payload.records.diaperLogs.length}`);
    rows.push(`Summary,Growth Measurements,${payload.records.growthMeasurements.length}`);
    rows.push(`Summary,Vaccination Records,${payload.records.vaccinationRecords.length}`);
    rows.push(`Summary,Health Logs,${payload.records.healthLogs.length}`);
    rows.push(`Summary,Memories,${payload.records.memories.length}`);
    rows.push(`Summary,Milestones,${payload.records.milestones.length}`);
    return rows.join('\n');
  };

  const handleExportJSON = async () => {
    if (!currentBaby) return;
    setExporting(true);
    setErrorMessage(null);
    try {
      const payload = buildBackupPayload();
      const content = JSON.stringify(payload, null, 2);
      const size = downloadFile(
        `${currentBaby.name}-backup-${todayStamp}.json`,
        'application/json;charset=utf-8',
        content,
      );
      appendBackupHistory('json', 'manual', size);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      setErrorMessage('Failed to export JSON backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!currentBaby) return;
    setExporting(true);
    setErrorMessage(null);
    try {
      const payload = buildBackupPayload();
      const csv = toCsv(payload);
      const size = downloadFile(
        `${currentBaby.name}-backup-${todayStamp}.csv`,
        'text/csv;charset=utf-8',
        csv,
      );
      appendBackupHistory('csv', 'manual', size);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      setErrorMessage('Failed to export CSV backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!currentBaby) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const synced = await performFullSync({
        babies,
        sleepLogs,
        feedLogs,
        diaperLogs,
        growthMeasurements,
        vaccinationRecords,
        milestones,
        memories,
        userSettings: settings,
      });

      if (!synced) {
        throw new Error('Cloud sync failed');
      }

      const payloadSize = new Blob([JSON.stringify(buildBackupPayload())]).size;
      appendBackupHistory('json', 'cloud', payloadSize);
    } catch (error) {
      console.error('Failed to create cloud backup:', error);
      setErrorMessage(
        'Cloud backup failed. You can still export locally and retry after API keys are configured.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-black">
      <div className="sticky top-0 z-30 bg-white dark:bg-black/80 backdrop-blur border-b border-separator safe-top">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-primary hover:opacity-70">
            <ChevronLeft size={24} />
            <span className="font-semibold">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-label-primary">Data Backup</h1>
          <div className="w-24"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-info/10 border border-info/20 rounded-xl p-4 mb-6"
        >
          <h3 className="font-semibold text-label-primary mb-2 flex items-center gap-2">
            <Database size={18} />
            Backup Your Data
          </h3>
          <p className="text-sm text-label-secondary">
            Export real logs, growth, vaccines, memories, and milestones for this account.
          </p>
        </motion.div>

        {lastBackup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="text-success flex-shrink-0" size={24} />
            <div>
              <p className="text-success font-medium">Backup successful!</p>
              <p className="text-sm text-label-secondary">Last backup: {lastBackup}</p>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6"
          >
            <p className="text-sm text-danger font-medium">{errorMessage}</p>
          </motion.div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-label-primary mb-4">Export to Device</h2>
            <div className="grid gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportJSON}
                disabled={exporting}
                className="bg-secondary-bg dark:bg-tertiary-bg rounded-xl p-4 text-left hover:bg-white/20 dark:hover:bg-black/40 transition disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Download className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-label-primary">JSON Format</h3>
                      <p className="text-sm text-label-secondary">Complete structured backup</p>
                    </div>
                  </div>
                  <span className="text-primary font-medium">{exporting ? 'Exporting...' : 'Export'}</span>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportCSV}
                disabled={exporting}
                className="bg-secondary-bg dark:bg-tertiary-bg rounded-xl p-4 text-left hover:bg-white/20 dark:hover:bg-black/40 transition disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-success/10 rounded-lg">
                      <Download className="text-success" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-label-primary">CSV Format</h3>
                      <p className="text-sm text-label-secondary">Spreadsheet-ready summary</p>
                    </div>
                  </div>
                  <span className="text-success font-medium">{exporting ? 'Exporting...' : 'Export'}</span>
                </div>
              </motion.button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-label-primary mb-4">Cloud Storage</h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCloudBackup}
              disabled={loading}
              className="w-full bg-primary/10 border-2 border-primary rounded-xl p-4 text-left hover:bg-primary/20 transition disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Cloud className="text-primary" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-label-primary mb-1">Backup to Supabase Cloud</h3>
                  <p className="text-sm text-label-secondary">Sends current records to your connected backend.</p>
                </div>
                <span className="text-primary font-medium px-4">{loading ? 'Backing up...' : 'Backup'}</span>
              </div>
            </motion.button>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-label-primary mb-4 flex items-center gap-2">
              <ListChecks size={20} />
              Backup History
            </h2>
            {backups.length === 0 ? (
              <div className="text-center py-8 bg-secondary-bg dark:bg-tertiary-bg rounded-xl">
                <Calendar className="mx-auto text-label-secondary mb-2" size={32} />
                <p className="text-label-secondary">No backups yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup, idx) => (
                  <motion.div
                    key={backup.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-secondary-bg dark:bg-tertiary-bg rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <HardDrive className="text-label-secondary" size={20} />
                      <div>
                        <p className="font-medium text-label-primary">{backup.format.toUpperCase()} Backup</p>
                        <p className="text-sm text-label-secondary">
                          {backup.date} - {backup.size}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                      {backup.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-label-primary flex items-center gap-2">
              <AlertTriangle size={18} />
              Important
            </h3>
            <ul className="text-sm text-label-secondary space-y-1 list-disc list-inside">
              <li>Regular backups protect your data from loss.</li>
              <li>Cloud backups require working Supabase credentials.</li>
              <li>Exported files can be archived or shared with your care team.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
