import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, Droplets, List, RotateCcw, Activity, Bell, Edit2, X, Check, Clock } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { addDiaperLog, deleteDiaperLog, updateDiaperLog, getDiaperLogsByBaby } from '../../lib/supabase-storage';
import { DiaperLog as DiaperLogType } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { groupByDate } from '../../lib/baby-utils';
import { i18nT } from '../../lib/i18n';

interface DiaperLogScreenProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

export const DiaperLogScreen: React.FC<DiaperLogScreenProps> = ({ onBack }) => {
  const { currentBaby, diaperLogs: logs, refreshAllLogs } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DiaperLogType | null>(null);
  const [formType, setFormType] = useState<'wet' | 'dirty' | 'both'>('wet');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState('');

  useEffect(() => {
    refreshAllLogs();
  }, [currentBaby]);



  const handleQuickLog = async (type: 'wet' | 'dirty' | 'both') => {
    if (!currentBaby) return;
    try {
      await addDiaperLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        timestamp: new Date().toISOString(),
        type,
        notes: '',
        createdAt: new Date().toISOString(),
      });
      refreshAllLogs();
    } catch (err) {
      console.error('Failed to quick log diaper:', err);
    }
  };

  const openForm = (log?: DiaperLogType) => {
    if (log) {
      setEditingLog(log);
      setFormType(log.type);
      setFormNotes(log.notes || '');
      setFormDate(log.timestamp.slice(0, 16));
    } else {
      setEditingLog(null);
      setFormType('wet');
      setFormNotes('');
      setFormDate(new Date().toISOString().slice(0, 16));
    }
    setShowForm(true);
  };

  const handleSaveForm = async () => {
    if (!currentBaby) return;
    try {
      if (editingLog) {
        await updateDiaperLog({
          ...editingLog,
          type: formType,
          notes: formNotes,
          timestamp: new Date(formDate).toISOString(),
        });
      } else {
        await addDiaperLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          timestamp: new Date(formDate).toISOString(),
          type: formType,
          notes: formNotes,
          createdAt: new Date().toISOString(),
        });
      }
      setShowForm(false);
      setEditingLog(null);
      refreshAllLogs();
    } catch (err) {
      console.error('Failed to save diaper log:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(i18nT('common.confirm'))) {
      try {
        await deleteDiaperLog(id);
        await refreshAllLogs();
      } catch (error) {
        console.error('Failed to delete diaper log:', error);
      }
    }
  };

  const grouped = groupByDate(logs, 'timestamp');
  const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString());
  const wetCount = todayLogs.filter(l => l.type === 'wet' || l.type === 'both').length;
  const dirtyCount = todayLogs.filter(l => l.type === 'dirty' || l.type === 'both').length;

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">{i18nT('screens.diaper')}</span>
        </div>
        <button onClick={() => openForm()} className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-headline font-black text-foreground tracking-tighter">{i18nT('dashboard.quickLog')}</h3>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleQuickLog('wet')}
                className="bg-surface p-8 rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-700 flex flex-col items-center gap-6 active:scale-[0.98] transition-all hover:shadow-xl hover:border-secondary"
              >
                <div className="w-16 h-16 bg-accent-blue text-secondary rounded-[1.5rem] flex items-center justify-center shadow-inner">
                  <Droplets size={28} fill="currentColor" />
                </div>
                <div className="text-center">
                   <h3 className="text-2xl font-headline font-black text-foreground">Wet</h3>
                </div>
              </button>
              
              <button
                onClick={() => handleQuickLog('dirty')}
                className="bg-surface p-8 rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-700 flex flex-col items-center gap-6 active:scale-[0.98] transition-all hover:shadow-xl hover:border-secondary"
              >
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                  <Activity size={28} />
                </div>
                <div className="text-center">
                   <h3 className="text-2xl font-headline font-black text-foreground">Dirty</h3>
                </div>
              </button>
           </div>

           <button
             onClick={() => handleQuickLog('both')}
             className="w-full bg-secondary p-8 rounded-[3rem] shadow-2xl flex items-center justify-between px-10 active:scale-[0.99] transition-all"
           >
             <div className="flex items-center gap-6">
               <div className="w-14 h-14 bg-white/10 text-white rounded-[1.25rem] flex items-center justify-center border border-white/5">
                 <RotateCcw size={28} />
               </div>
               <div className="text-left text-white">
                 <h3 className="text-2xl font-headline font-black">Both</h3>
               </div>
             </div>
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
               <Plus size={24} />
             </div>
           </button>

           <div className="bg-surface-gray dark:bg-zinc-900/30 rounded-[3rem] p-8 flex justify-around items-center border border-border-gray dark:border-zinc-800 shadow-inner">
              <div className="text-center">
                <p className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1">TOTAL Today</p>
                <p className="text-3xl font-headline font-black text-foreground">{todayLogs.length}</p>
              </div>
              <div className="h-10 w-[1.5px] bg-border-gray dark:bg-zinc-700" />
              <div className="text-center">
                <p className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1">WET</p>
                <p className="text-3xl font-headline font-black text-secondary">{wetCount}</p>
              </div>
              <div className="h-10 w-[1.5px] bg-border-gray dark:bg-zinc-700" />
              <div className="text-center">
                <p className="text-[9px] font-black text-text-light uppercase tracking-widest mb-1">DIRTY</p>
                <p className="text-3xl font-headline font-black text-amber-500">{dirtyCount}</p>
              </div>
           </div>

           <div className="space-y-10 pt-4">
              <h2 className="text-xl font-headline font-black text-foreground tracking-tighter px-2">History</h2>
              
              {Object.entries(grouped).map(([dateLabel, dateLogs]) => (
                <div key={dateLabel} className="space-y-5">
                  <div className="flex items-center gap-4 px-2">
                     <span className="text-[10px] font-black text-text-dim uppercase tracking-widest whitespace-nowrap">{dateLabel}</span>
                     <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
                  </div>
                  <div className="space-y-4">
                    {(dateLogs as DiaperLogType[]).map((log) => (
                      <div key={log.id} className="group bg-surface rounded-[2.5rem] p-6 shadow-sm border border-border-gray dark:border-zinc-800 flex items-center justify-between transition-all hover:shadow-xl">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                            log.type === 'wet' ? 'bg-accent-blue text-secondary' : 
                            log.type === 'dirty' ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-500' : 
                            'bg-surface-gray text-text-dim dark:bg-zinc-800'
                          }`}>
                             {log.type === 'wet' ? <Droplets size={22} fill="currentColor" /> : 
                              log.type === 'dirty' ? <Activity size={22} /> : 
                              <RotateCcw size={22} />}
                          </div>
                          <div>
                            <p className="text-lg font-headline font-black text-foreground leading-tight capitalize">{log.type}</p>
                            {log.notes && <p className="text-[11px] font-bold text-text-light mt-0.5 truncate max-w-[150px]">"{log.notes}"</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className="text-sm font-black text-foreground">
                             {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                           <div className="flex gap-1">
                             <button onClick={() => openForm(log)} className="p-2 text-text-light hover:text-secondary hover:scale-110 transition-all">
                               <Edit2 size={14} />
                             </button>
                             <button onClick={() => handleDelete(log.id)} className="p-2 text-text-light hover:text-error hover:scale-110 transition-all">
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
           </div>
        </div>
      </main>

      <AnimatePresence>
        {showForm && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center p-4">
            <MotionDiv initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 25 }} className="w-full max-w-md bg-surface rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter">
                  {editingLog ? 'Edit' : 'Record'}
                </h3>
                <button onClick={() => setShowForm(false)} className="w-12 h-12 rounded-full bg-surface-gray flex items-center justify-center text-text-light"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {(['wet', 'dirty', 'both'] as const).map(t => (
                    <button key={t} onClick={() => setFormType(t)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formType === t ? 'bg-secondary text-white shadow-lg' : 'bg-surface-gray dark:bg-zinc-800 text-text-dim'}`}>{t}</button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4">Time</label>
                  <input type="datetime-local" value={formDate} onChange={e => setFormDate(e.target.value)} className="input-onboarding" />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4">Notes</label>
                   <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="..." className="w-full h-24 bg-surface-gray dark:bg-zinc-800 rounded-[2rem] p-6 text-sm font-bold text-foreground outline-none resize-none shadow-inner" />
                </div>
              </div>

              <button onClick={handleSaveForm} className="btn-primary">
                <Check size={28} />
                <span>{editingLog ? i18nT('common.update') : i18nT('common.save')}</span>
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
