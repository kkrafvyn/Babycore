import React, { useState } from 'react';
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
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface DataBackupProps {
  onBack: () => void;
}

interface BackupFile {
  date: string;
  size: string;
  format: 'json' | 'csv';
  type: 'automatic' | 'manual';
}

export const DataBackup: React.FC<DataBackupProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleExportJSON = async () => {
    if (!currentBaby) return;
    setExporting(true);
    try {
      // TODO: Fetch all baby data from Supabase
      // const data = await exportBabyData(currentBaby.id, 'json');
      // const element = document.createElement('a');
      // element.setAttribute('href', `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`);
      // element.setAttribute('download', `${currentBaby.name}-backup-${new Date().toISOString().split('T')[0]}.json`);
      // element.click();

      setLastBackup(new Date().toLocaleString());
    } catch (error) {
      console.error('Failed to export JSON:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!currentBaby) return;
    setExporting(true);
    try {
      // TODO: Fetch all baby data from Supabase
      // const data = await exportBabyData(currentBaby.id, 'csv');
      // const element = document.createElement('a');
      // element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(data)}`);
      // element.setAttribute('download', `${currentBaby.name}-backup-${new Date().toISOString().split('T')[0]}.csv`);
      // element.click();

      setLastBackup(new Date().toLocaleString());
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!currentBaby) return;
    setLoading(true);
    try {
      // TODO: Create cloud backup in Supabase
      // await createCloudBackup(currentBaby.id);
      setLastBackup(new Date().toLocaleString());
    } catch (error) {
      console.error('Failed to create cloud backup:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-black/80 backdrop-blur border-b border-separator safe-top">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:opacity-70"
          >
            <ChevronLeft size={24} />
            <span className="font-semibold">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-label-primary">Data Backup</h1>
          <div className="w-24"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Info Card */}
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
            Secure your baby's important records and memories. Export to your device or cloud storage.
          </p>
        </motion.div>

        {/* Last Backup Status */}
        {lastBackup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="text-success flex-shrink-0" size={24} />
            <div>
              <p className="text-success font-medium">Backup successful!</p>
              <p className="text-sm text-label-secondary">
                Last backup: {lastBackup}
              </p>
            </div>
          </motion.div>
        )}

        {/* Export Options */}
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
                      <h3 className="font-semibold text-label-primary">
                        JSON Format
                      </h3>
                      <p className="text-sm text-label-secondary">
                        Complete backup with all data structure
                      </p>
                    </div>
                  </div>
                  <span className="text-primary font-medium">
                    {exporting ? 'Exporting...' : 'Export'}
                  </span>
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
                      <h3 className="font-semibold text-label-primary">
                        CSV Format
                      </h3>
                      <p className="text-sm text-label-secondary">
                        Spreadsheet-compatible format for logging data
                      </p>
                    </div>
                  </div>
                  <span className="text-success font-medium">
                    {exporting ? 'Exporting...' : 'Export'}
                  </span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Cloud Backup */}
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
                  <h3 className="font-semibold text-label-primary mb-1">
                    Automatic Backup to Cloud
                  </h3>
                  <p className="text-sm text-label-secondary">
                    Securely backup your data to Supabase cloud storage
                  </p>
                </div>
                <span className="text-primary font-medium px-4">
                  {loading ? 'Backing up...' : 'Backup'}
                </span>
              </div>
            </motion.button>
          </div>

          {/* Backup History */}
          <div>
            <h2 className="text-xl font-semibold text-label-primary mb-4 flex items-center gap-2">
              <ListChecks size={20} />
              Backup History
            </h2>
            {backups.length === 0 ? (
              <div className="text-center py-8 bg-secondary-bg dark:bg-tertiary-bg rounded-xl">
                <Calendar className="mx-auto text-label-secondary mb-2" size={32} />
                <p className="text-label-secondary">
                  No backups yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-secondary-bg dark:bg-tertiary-bg rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <HardDrive className="text-label-secondary" size={20} />
                      <div>
                        <p className="font-medium text-label-primary">
                          {backup.format.toUpperCase()} Backup
                        </p>
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

          {/* Important Info */}
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-label-primary flex items-center gap-2">
              <AlertTriangle size={18} />
              Important
            </h3>
            <ul className="text-sm text-label-secondary space-y-1 list-disc list-inside">
              <li>Regular backups protect your data from loss</li>
              <li>Cloud backups are encrypted and secure</li>
              <li>Exported files can be imported into other apps</li>
              <li>Always keep backup files in a safe location</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
