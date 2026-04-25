import React, { useState, useEffect } from 'react';
import { ChevronLeft, Moon, Trash2, Play, Square, TrendingUp, Sun, Cloud, AlarmClock, Edit2, X, Check, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { SleepLog } from '../../types/index';
import { getSleepLogsByBaby, addSleepLog, updateSleepLog, deleteSleepLog } from '../../lib/supabase-storage';
import { AnimatePresence, motion } from 'framer-motion';
import { groupByDate, formatDuration, formatTimerSeconds } from '../../lib/baby-utils';
import { i18nT } from '../../lib/i18n';

interface SleepTrackerProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

const TIMER_KEY = 'babylog_sleep_timer';

interface TimerState {
  startTime: string;
  babyId: string;
}

function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveTimerState(state: TimerState | null) {
  if (state) localStorage.setItem(TIMER_KEY, JSON.stringify(state));
  else localStorage.removeItem(TIMER_KEY);
}

export const SleepTracker: React.FC<SleepTrackerProps> = ({ onBack }) => {
  const { currentBaby, sleepLogs: logs, refreshAllLogs } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [show24hAlert, setShow24hAlert] = useState(false);

  useEffect(() => {
    const saved = loadTimerState();
    if (saved && currentBaby && saved.babyId === currentBaby.id) {
      const start = new Date(saved.startTime);
      setStartTime(start);
      setIsTimerRunning(true);
      setTimerSeconds(Math.floor((Date.now() - start.getTime()) / 1000));
    }
  }, [currentBaby]);

  useEffect(() => {
    refreshAllLogs();
  }, [currentBaby]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setTimerSeconds(elapsed);
        if (elapsed > 86400 && !show24hAlert) {
          setShow24hAlert(true);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, startTime, show24hAlert]);



  const handleStartTimer = () => {
    const now = new Date();
    setStartTime(now);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    if (currentBaby) {
      saveTimerState({ startTime: now.toISOString(), babyId: currentBaby.id });
    }
  };

  const handleFinishSleep = async () => {
    if (!currentBaby || !startTime) return;
    try {
      const endTime = new Date();
      await addSleepLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
        notes: '',
        createdAt: new Date().toISOString(),
      });
      saveTimerState(null);
      setIsTimerRunning(false);
      setStartTime(null);
      setTimerSeconds(0);
      refreshAllLogs();
    } catch (err) {
      console.error('Failed to add sleep log:', err);
    }
  };

  const handleCancelTimer = () => {
    setIsTimerRunning(false);
    setStartTime(null);
    setTimerSeconds(0);
    saveTimerState(null);
    setShow24hAlert(false);
  };

  const handleManualSave = async () => {
    if (!currentBaby || !manualStart || !manualEnd) return;
    const start = new Date(manualStart);
    const end = new Date(manualEnd);
    if (end <= start) { alert('End time must be after start time.'); return; }

    try {
      const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      if (editingLog) {
        await updateSleepLog({
          ...editingLog,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration,
          notes: manualNotes,
        });
      } else {
        await addSleepLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration,
          notes: manualNotes,
          createdAt: new Date().toISOString(),
        });
      }
      setShowManualEntry(false);
      setEditingLog(null);
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to save sleep log:', error);
    }
  };

  const handleEdit = (log: SleepLog) => {
    setEditingLog(log);
    setManualStart(log.startTime.slice(0, 16));
    setManualEnd(log.endTime.slice(0, 16));
    setManualNotes(log.notes || '');
    setShowManualEntry(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(i18nT('common.confirm'))) return;
    try {
      await deleteSleepLog(id);
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to delete sleep log:', error);
    }
  };

  const grouped = groupByDate(logs, 'startTime');
  const getDayTotal = (dayLogs: SleepLog[]) => dayLogs.reduce((sum, l) => sum + l.duration, 0);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const dayLogs = logs.filter(l => new Date(l.startTime).toDateString() === dateStr);
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      total: dayLogs.reduce((sum, l) => sum + l.duration, 0),
    };
  });
  const maxWeek = Math.max(...weekData.map(d => d.total), 1);

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">{i18nT('screens.sleep')}</span>
        </div>
        <button onClick={() => { setEditingLog(null); setManualStart(''); setManualEnd(''); setManualNotes(''); setShowManualEntry(true); }} className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
           <div className="card-onboarding text-center bg-surface">
              <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-4">
                {isTimerRunning ? i18nT('dashboard.sleeping') : 'Sleep Timer'}
              </p>
              <h2 className="text-7xl font-headline font-black text-foreground tracking-tighter mb-10 tabular-nums">
                {formatTimerSeconds(timerSeconds)}
              </h2>
              
              {isTimerRunning ? (
                <div className="space-y-4">
                  <button onClick={handleFinishSleep} className="btn-primary bg-secondary">
                     <Square size={24} fill="currentColor" />
                     <span>Wake Up</span>
                  </button>
                  <button onClick={handleCancelTimer} className="text-[10px] font-black text-error uppercase tracking-widest">
                    Cancel Timer
                  </button>
                </div>
              ) : (
                <button onClick={handleStartTimer} className="btn-primary">
                   <Play size={24} fill="currentColor" />
                   <span>Start Sleep</span>
                </button>
              )}
           </div>

           <div className="card-onboarding bg-surface">
              <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-6 text-left">Weekly Overview</p>
              <div className="flex items-end justify-between gap-2 h-32">
                {weekData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-surface-gray dark:bg-zinc-800 rounded-xl overflow-hidden" style={{ height: '100px' }}>
                      <div className="w-full bg-secondary/20 rounded-xl transition-all duration-500 mt-auto" style={{ height: `${(d.total / maxWeek) * 100}%`, marginTop: `${100 - (d.total / maxWeek) * 100}%` }}>
                        <div className="w-full h-full bg-secondary rounded-xl opacity-60" />
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-text-light uppercase">{d.label}</span>
                  </div>
                ))}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-gray dark:bg-zinc-900/30 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-inner">
                 <div className="flex items-center gap-3 text-secondary mb-4">
                   <AlarmClock size={20} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-text-light">Today</span>
                 </div>
                 <p className="text-2xl font-headline font-black text-foreground tracking-tighter">
                   {formatDuration(logs.filter(l => new Date(l.startTime).toDateString() === new Date().toDateString()).reduce((s, l) => s + l.duration, 0))}
                 </p>
              </div>
              <div className="bg-surface-gray dark:bg-zinc-900/30 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-inner">
                 <div className="flex items-center gap-3 text-secondary mb-4">
                   <TrendingUp size={20} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-text-light">Sessions</span>
                 </div>
                 <p className="text-2xl font-headline font-black text-secondary tracking-tighter">
                   {logs.filter(l => new Date(l.startTime).toDateString() === new Date().toDateString()).length}
                 </p>
              </div>
           </div>

           <div className="space-y-10 pt-4">
              <div className="flex justify-between items-center px-2">
                 <h2 className="text-xl font-headline font-black text-foreground tracking-tighter">History</h2>
              </div>

              {Object.entries(grouped).map(([dateLabel, dayLogs]) => (
                <div key={dateLabel} className="space-y-4">
                   <div className="flex items-center gap-4 px-2">
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-widest whitespace-nowrap">{dateLabel}</span>
                      <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
                      <span className="text-[10px] font-black text-secondary uppercase tracking-widest whitespace-nowrap">
                        {formatDuration(getDayTotal(dayLogs as SleepLog[]))}
                      </span>
                   </div>
                   
                   <div className="space-y-4">
                      {(dayLogs as SleepLog[]).map((log) => {
                        const startH = new Date(log.startTime).getHours();
                        const isNight = startH >= 19 || startH < 6;
                        const Icon = isNight ? Moon : (startH < 12 ? Sun : Cloud);
                        const iconBg = isNight ? 'bg-accent-blue text-secondary' : startH < 12 ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500';
                        const label = isNight ? 'Night Sleep' : startH < 12 ? 'Morning Nap' : 'Afternoon Nap';

                        return (
                          <div key={log.id} className="group bg-surface rounded-[2.5rem] p-8 shadow-sm border border-border-gray dark:border-zinc-800 transition-all hover:shadow-xl">
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-5">
                                   <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center shadow-inner`}>
                                      <Icon size={24} fill="currentColor" />
                                   </div>
                                   <div>
                                      <h4 className="text-xl font-headline font-black text-foreground leading-tight">{label}</h4>
                                      <p className="text-[11px] font-bold text-text-light mt-0.5 whitespace-nowrap overflow-hidden">
                                        {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                   </div>
                                </div>
                                <p className="text-sm font-headline font-black text-foreground">{formatDuration(log.duration)}</p>
                             </div>
                             <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => handleEdit(log)} className="p-2 text-text-light hover:text-secondary hover:scale-110 transition-all"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(log.id)} className="p-2 text-text-light hover:text-error hover:scale-110 transition-all"><Trash2 size={16} /></button>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </main>

      <AnimatePresence>
        {showManualEntry && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center p-4">
            <MotionDiv initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 25 }} className="w-full max-w-md bg-surface rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter">
                  {editingLog ? 'Edit' : 'Log Sleep'}
                </h3>
                <button onClick={() => { setShowManualEntry(false); setEditingLog(null); }} className="w-12 h-12 rounded-full bg-surface-gray flex items-center justify-center text-text-light"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4 block mb-2">Start Time</label>
                  <input type="datetime-local" value={manualStart} onChange={e => setManualStart(e.target.value)} className="input-onboarding" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4 block mb-2">End Time</label>
                  <input type="datetime-local" value={manualEnd} onChange={e => setManualEnd(e.target.value)} className="input-onboarding" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4 block mb-2">Notes</label>
                  <textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="..." className="w-full h-24 bg-surface-gray dark:bg-zinc-800 rounded-[2rem] p-6 text-sm font-bold text-foreground outline-none resize-none shadow-inner" />
                </div>
              </div>

              <button onClick={handleManualSave} className="btn-primary">
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
