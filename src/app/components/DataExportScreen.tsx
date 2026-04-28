import React, { useState } from 'react';
import { ChevronLeft, Download, FileText, Check, Calendar, ArrowRight, Shield, Activity, X, Upload, RefreshCw } from 'lucide-react';
import { useAppContext } from '../AppContext';
import {
  addDiaperLog,
  addFeedLog,
  addGrowthMeasurement,
  addMemoryLog,
  addMilestone,
  addSleepLog,
  addVaccinationRecord,
  getDiaperLogsByBaby,
  getFeedLogsByBaby,
  getGrowthMeasurementsByBaby,
  getMemoryLogsByBaby,
  getMilestonesByBaby,
  getSleepLogsByBaby,
  getVaccinationRecordsByBaby,
} from '../../lib/supabase-storage';
import { generateCSV, downloadCSV, generatePDFHTML, openPDFInNewWindow } from '../../lib/export';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface DataExportProps {
  onBack: () => void;
}

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseDateMaybe = (value?: string): Date | null => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const mmdd = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddmm = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

  const matchSlash = value.match(mmdd);
  if (matchSlash) {
    const [, mm, dd, yyyy] = matchSlash;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const matchDash = value.match(ddmm);
  if (matchDash) {
    const [, dd, mm, yyyy] = matchDash;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const withIsoTime = (dateLabel?: string, timeLabel?: string): string => {
  const parsedDate = parseDateMaybe(dateLabel) || new Date();
  const [hours, minutes] = (timeLabel || '00:00').split(':');
  const safeHours = Number.isFinite(Number(hours)) ? Number(hours) : 0;
  const safeMinutes = Number.isFinite(Number(minutes)) ? Number(minutes) : 0;
  const combined = new Date(parsedDate);
  combined.setHours(safeHours, safeMinutes, 0, 0);
  return combined.toISOString();
};

export const DataExport: React.FC<DataExportProps> = ({ onBack }) => {
  const { currentBaby, refreshAllLogs } = useAppContext();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [importNotice, setImportNotice] = useState<string>('');

  const handleExport = async () => {
    if (!currentBaby) return;

    setExporting(true);
    try {
      const [sleepLogs, feedLogs, diaperLogs, growthMeasurements, vaccinationRecords, milestones, memories] =
        await Promise.all([
          getSleepLogsByBaby(currentBaby.id),
          getFeedLogsByBaby(currentBaby.id),
          getDiaperLogsByBaby(currentBaby.id),
          getGrowthMeasurementsByBaby(currentBaby.id),
          getVaccinationRecordsByBaby(currentBaby.id),
          getMilestonesByBaby(currentBaby.id),
          getMemoryLogsByBaby(currentBaby.id),
        ]);

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filterByDate = (logs: any[], dateKey: string) =>
        logs.filter((log) => {
          const logDate = new Date(log[dateKey]);
          return logDate >= start && logDate <= end;
        });

      const exportData = {
        baby: currentBaby,
        sleepLogs: filterByDate(sleepLogs, 'startTime'),
        feedLogs: filterByDate(feedLogs, 'timestamp'),
        diaperLogs: filterByDate(diaperLogs, 'timestamp'),
        growthMeasurements: filterByDate(growthMeasurements, 'date'),
        vaccinationRecords,
        milestones: filterByDate(milestones, 'date'),
        memories: filterByDate(memories, 'timestamp'),
        dateRange: { start, end },
      };

      if (exportFormat === 'csv') {
        const csv = generateCSV(exportData);
        const filename = `${currentBaby.name}-Log-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csv, filename);
      } else {
        const html = generatePDFHTML(exportData);
        openPDFInNewWindow(html);
      }

      setShowDateModal(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const importFromJson = async (payload: any): Promise<number> => {
    if (!currentBaby) return 0;

    const source = payload || {};
    const now = new Date().toISOString();
    let inserted = 0;

    for (const row of source.sleepLogs || []) {
      await addSleepLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        startTime: row.startTime || now,
        endTime: row.endTime || row.startTime || now,
        duration: Number(row.duration || 0),
        notes: row.notes || '',
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    for (const row of source.feedLogs || []) {
      await addFeedLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        timestamp: row.timestamp || now,
        type: row.type || 'bottle',
        duration: row.duration ? Number(row.duration) : undefined,
        breastLeft: Boolean(row.breastLeft),
        breastRight: Boolean(row.breastRight),
        bottleAmount: row.bottleAmount ? Number(row.bottleAmount) : undefined,
        bottleType: row.bottleType,
        solidDescription: row.solidDescription || '',
        notes: row.notes || '',
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    for (const row of source.diaperLogs || []) {
      await addDiaperLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        timestamp: row.timestamp || now,
        type: row.type || 'wet',
        notes: row.notes || '',
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    for (const row of source.growthMeasurements || []) {
      await addGrowthMeasurement({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        date: row.date || now,
        weight: row.weight ? Number(row.weight) : undefined,
        height: row.height ? Number(row.height) : undefined,
        headCircumference: row.headCircumference ? Number(row.headCircumference) : undefined,
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    for (const row of source.vaccinationRecords || []) {
      await addVaccinationRecord({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        name: row.name || 'Vaccine',
        dueDate: row.dueDate || now,
        status: row.status || 'scheduled',
        givenDate: row.givenDate || undefined,
        notes: row.notes || '',
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    for (const row of source.milestones || []) {
      await addMilestone({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        date: row.date || now,
        type: row.type || 'other',
        description: row.description || '',
        photoUrl: row.photoUrl || undefined,
        notes: row.notes || '',
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    for (const row of source.memories || []) {
      await addMemoryLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        timestamp: row.timestamp || now,
        text: row.text || '',
        photoUrl: row.photoUrl || undefined,
        isMilestone: Boolean(row.isMilestone),
        createdAt: row.createdAt || now,
      });
      inserted += 1;
    }

    return inserted;
  };

  const importFromCsv = async (csvText: string): Promise<number> => {
    if (!currentBaby) return 0;

    const lines = csvText
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);

    let section = '';
    let inserted = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (line === 'SLEEP LOGS') {
        section = 'sleep';
        i += 1;
        continue;
      }

      if (line === 'FEEDING LOGS') {
        section = 'feeding';
        i += 1;
        continue;
      }

      if (line === 'DIAPER LOGS') {
        section = 'diaper';
        i += 1;
        continue;
      }

      if (line === 'GROWTH MEASUREMENTS') {
        section = 'growth';
        i += 1;
        continue;
      }

      if (line === 'VACCINATION RECORDS') {
        section = 'vaccination';
        i += 1;
        continue;
      }

      if (line === 'MILESTONES') {
        section = 'milestone';
        i += 1;
        continue;
      }

      if (line === 'MEMORIES & JOURNAL') {
        section = 'memory';
        i += 1;
        continue;
      }

      if (!line.includes(',')) {
        continue;
      }

      const cols = parseCsvLine(line);
      if (cols.length < 2) continue;

      if (section === 'sleep') {
        const startTime = withIsoTime(cols[0], cols[1]);
        const endTime = withIsoTime(cols[0], cols[2]);
        await addSleepLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          startTime,
          endTime,
          duration: Number(cols[3] || 0),
          notes: cols[4] || '',
          createdAt: now,
        });
        inserted += 1;
        continue;
      }

      if (section === 'feeding') {
        const feedType = cols[2] as 'breast' | 'bottle' | 'solids';
        const details = cols[3] || '';
        const isBreast = feedType === 'breast';
        const isBottle = feedType === 'bottle';

        let bottleAmount: number | undefined;
        let bottleType: 'breast_milk' | 'formula' | 'other' | undefined;
        if (isBottle) {
          const amountMatch = details.match(/^([\d.]+)/);
          bottleAmount = amountMatch ? Number(amountMatch[1]) : undefined;
          if (/formula/i.test(details)) bottleType = 'formula';
          else if (/breast/i.test(details)) bottleType = 'breast_milk';
          else bottleType = 'other';
        }

        await addFeedLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          timestamp: withIsoTime(cols[0], cols[1]),
          type: feedType || 'bottle',
          duration: isBreast ? 10 : undefined,
          breastLeft: isBreast ? /left/i.test(details) : undefined,
          breastRight: isBreast ? /right/i.test(details) : undefined,
          bottleAmount,
          bottleType,
          solidDescription: feedType === 'solids' ? details : undefined,
          notes: cols[4] || '',
          createdAt: now,
        });
        inserted += 1;
        continue;
      }

      if (section === 'diaper') {
        await addDiaperLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          timestamp: withIsoTime(cols[0], cols[1]),
          type: (cols[2] as 'wet' | 'dirty' | 'both') || 'wet',
          notes: cols[3] || '',
          createdAt: now,
        });
        inserted += 1;
        continue;
      }

      if (section === 'growth') {
        await addGrowthMeasurement({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          date: parseDateMaybe(cols[0])?.toISOString() || now,
          weight: cols[1] ? Number(cols[1]) : undefined,
          height: cols[2] ? Number(cols[2]) : undefined,
          headCircumference: cols[3] ? Number(cols[3]) : undefined,
          createdAt: now,
        });
        inserted += 1;
        continue;
      }

      if (section === 'vaccination') {
        await addVaccinationRecord({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          name: cols[0] || 'Vaccine',
          dueDate: parseDateMaybe(cols[1])?.toISOString() || now,
          status: (cols[2] as 'scheduled' | 'given' | 'overdue' | 'skipped') || 'scheduled',
          givenDate: parseDateMaybe(cols[3])?.toISOString() || undefined,
          notes: cols[4] || '',
          createdAt: now,
        });
        inserted += 1;
        continue;
      }

      if (section === 'milestone') {
        await addMilestone({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          date: parseDateMaybe(cols[0])?.toISOString() || now,
          type: (cols[1] as any) || 'other',
          description: cols[2] || '',
          notes: cols[3] || '',
          createdAt: now,
        });
        inserted += 1;
        continue;
      }

      if (section === 'memory') {
        await addMemoryLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          timestamp: withIsoTime(cols[0], cols[1]),
          text: cols[2] || '',
          isMilestone: /yes/i.test(cols[3] || ''),
          createdAt: now,
        });
        inserted += 1;
      }
    }

    return inserted;
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentBaby) return;

    setImporting(true);
    setImportNotice('');

    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('{');
      const importedCount = isJson
        ? await importFromJson(JSON.parse(text))
        : await importFromCsv(text);

      await refreshAllLogs();
      setImportNotice(`Imported ${importedCount} records into ${currentBaby.name}'s profile.`);
    } catch (error) {
      console.error('Import failed:', error);
      setImportNotice('Import failed. Please check your file format and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-gray-50 dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Export Data</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-20">
        <div className="max-w-md mx-auto w-full space-y-10">
          <div className="text-center space-y-4 px-4">
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-none">Share {currentBaby?.name}&apos;s Journey</h2>
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-widest leading-relaxed">
              Generate reports for pediatricians or export raw data for personal records.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setExportFormat('pdf');
                setShowDateModal(true);
              }}
              className="w-full text-left bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-secondary transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-accent-blue/10 dark:bg-blue-900/20 text-secondary rounded-2xl flex items-center justify-center shadow-inner">
                  <FileText size={28} />
                </div>
                <ArrowRight size={20} className="text-text-light group-hover:text-secondary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-headline font-black text-foreground tracking-tight mb-2">Pediatric Report (PDF)</h3>
              <p className="text-[11px] font-bold text-text-light uppercase tracking-widest leading-relaxed">
                Formatted document with charts, summaries, and vaccination history.
              </p>
            </button>

            <button
              onClick={() => {
                setExportFormat('csv');
                setShowDateModal(true);
              }}
              className="w-full text-left bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-secondary transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-accent-pink/10 dark:bg-rose-900/20 text-text-dim rounded-2xl flex items-center justify-center shadow-inner">
                  <Download size={28} />
                </div>
                <ArrowRight size={20} className="text-text-light group-hover:text-secondary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-headline font-black text-foreground tracking-tight mb-2">Raw Data (CSV)</h3>
              <p className="text-[11px] font-bold text-text-light uppercase tracking-widest leading-relaxed">
                Spreadsheet compatible file with every single log entry ever recorded.
              </p>
            </button>

            <label className="block w-full text-left bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-secondary transition-all group cursor-pointer">
              <input type="file" accept=".csv,.json" className="hidden" onChange={handleImportFile} />
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
                  {importing ? <RefreshCw size={28} className="animate-spin" /> : <Upload size={28} />}
                </div>
                <ArrowRight size={20} className="text-text-light group-hover:text-secondary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-headline font-black text-foreground tracking-tight mb-2">Import Data</h3>
              <p className="text-[11px] font-bold text-text-light uppercase tracking-widest leading-relaxed">
                Import existing data from CSV or JSON from other tracking apps.
              </p>
            </label>

            {importNotice && (
              <div className="rounded-2xl border border-border-gray dark:border-zinc-800 bg-surface px-4 py-3 text-xs font-semibold text-text-dim">
                {importNotice}
              </div>
            )}
          </div>

          <div className="bg-surface-gray dark:bg-zinc-800/50 p-8 rounded-[3.5rem] border border-border-gray dark:border-zinc-800 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-emerald-500 shadow-sm">
                <Shield size={20} />
              </div>
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest">End-to-End Privacy</p>
            </div>
            <p className="text-[11px] font-bold text-text-dim leading-relaxed">
              Data is generated locally on your device. Only you have access to these files until you choose to share them.
            </p>
            <div className="h-px bg-border-gray dark:bg-zinc-700 w-full" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity size={14} className="text-text-light" />
                <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Inclusive Scope</span>
              </div>
              <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">7 Data Categories</span>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showDateModal && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={(e: React.MouseEvent) => {
              if (e.target === e.currentTarget) setShowDateModal(false);
            }}
          >
            <MotionDiv
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[3rem] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-headline font-black text-foreground tracking-tight">Report Scope</h3>
                <button onClick={() => setShowDateModal(false)} className="w-10 h-10 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center text-text-light">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">From</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-onboarding" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">To</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-onboarding" />
                  </div>
                </div>

                <div className="bg-surface-gray dark:bg-zinc-800 p-6 rounded-2xl border border-border-gray dark:border-zinc-700">
                  <div className="flex items-center gap-3 text-text-light mb-2">
                    <Calendar size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Selected Format</span>
                  </div>
                  <p className="text-sm font-black text-foreground uppercase tracking-widest">
                    {exportFormat === 'pdf' ? 'Pediatric PDF Report' : 'Raw CSV Export'}
                  </p>
                </div>
              </div>

              <button onClick={handleExport} disabled={exporting} className="btn-primary">
                {exporting ? (
                  <span className="animate-pulse">Generating…</span>
                ) : (
                  <>
                    <Check size={24} />
                    <span>Generate Export</span>
                  </>
                )}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
