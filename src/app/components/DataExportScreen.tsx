import React, { useState } from 'react';
import { ChevronLeft, Download, FileText, Check, Calendar, ArrowRight, Shield, Activity, X } from 'lucide-react';
import { useAppContext } from '../AppContext';
import {
  getSleepLogsByBaby,
  getFeedLogsByBaby,
  getDiaperLogsByBaby,
  getGrowthMeasurementsByBaby,
  getVaccinationRecordsByBaby,
  getMilestonesByBaby,
  getMemoryLogsByBaby,
} from '../../lib/supabase-storage';
import { generateCSV, downloadCSV, generatePDFHTML, openPDFInNewWindow } from '../../lib/export';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface DataExportProps {
  onBack: () => void;
}

export const DataExport: React.FC<DataExportProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  const handleExport = async () => {
    if (!currentBaby) return;

    setExporting(true);
    try {
      const [
        sleepLogs, 
        feedLogs, 
        diaperLogs, 
        growthMeasurements, 
        vaccinationRecords,
        milestones,
        memories
      ] = await Promise.all([
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
        logs.filter(log => {
          const logDate = new Date(log[dateKey]);
          return logDate >= start && logDate <= end;
        });

      const exportData = {
        baby: currentBaby,
        sleepLogs: filterByDate(sleepLogs, 'startTime'),
        feedLogs: filterByDate(feedLogs, 'timestamp'),
        diaperLogs: filterByDate(diaperLogs, 'timestamp'),
        growthMeasurements: filterByDate(growthMeasurements, 'date'),
        vaccinationRecords: vaccinationRecords, // All vaccines usually relevant
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

  return (
    <div className="fit-screen bg-background">
      {/* Header */}
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
              <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter leading-none">Share {currentBaby?.name}'s Journey</h2>
              <p className="text-[11px] font-bold text-text-dim uppercase tracking-widest leading-relaxed">
                 Generate reports for pediatricians or export raw data for personal records.
              </p>
           </div>

           {/* Export Cards */}
           <div className="space-y-4">
              <button 
                onClick={() => { setExportFormat('pdf'); setShowDateModal(true); }}
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
                onClick={() => { setExportFormat('csv'); setShowDateModal(true); }}
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
                 <input type="file" accept=".csv,.json" className="hidden" onChange={(e) => alert('Data imported successfully! (Mocked functionality)')} />
                 <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
                       <Download size={28} className="rotate-180" />
                    </div>
                    <ArrowRight size={20} className="text-text-light group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                 </div>
                 <h3 className="text-xl font-headline font-black text-foreground tracking-tight mb-2">Import Data</h3>
                 <p className="text-[11px] font-bold text-text-light uppercase tracking-widest leading-relaxed">
                    Import existing data from CSV or JSON from other tracking apps.
                 </p>
              </label>
           </div>

           {/* Security / Info */}
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
                 <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">6 Data Categories</span>
              </div>
           </div>
        </div>
      </main>

      {/* Date Range Modal */}
      <AnimatePresence>
        {showDateModal && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
             onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setShowDateModal(false); }}
          >
            <MotionDiv initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
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
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-onboarding" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">To</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-onboarding" />
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

               <button 
                 onClick={handleExport}
                 disabled={exporting}
                 className="btn-primary"
               >
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
