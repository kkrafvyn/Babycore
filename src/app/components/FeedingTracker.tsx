import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Clock3,
  Droplets,
  Milk,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Soup,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from '../AppContext';
import { addFeedLog, deleteFeedLog, updateFeedLog } from '../../lib/supabase-storage';
import { formatDuration, formatTimerSeconds, groupByDate, timeAgo } from '../../lib/baby-utils';
import type { FeedLog } from '../../types';

interface FeedingTrackerProps {
  babyId?: string;
  babyName?: string;
  onBack?: () => void;
}

type BreastSide = 'left' | 'right' | 'both';
type FeedType = FeedLog['type'];

interface FeedingTimerState {
  babyId: string;
  side: BreastSide;
  baseSeconds: number;
  running: boolean;
  startedAt?: string;
}

const TIMER_KEY = 'babylog_feeding_timer';
const MotionDiv = motion.div as any;

function loadTimerState(): FeedingTimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    return raw ? (JSON.parse(raw) as FeedingTimerState) : null;
  } catch {
    return null;
  }
}

function saveTimerState(state: FeedingTimerState | null): void {
  if (!state) {
    localStorage.removeItem(TIMER_KEY);
    return;
  }
  localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

function toDateTimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function computeTimerSeconds(timer: Pick<FeedingTimerState, 'baseSeconds' | 'running' | 'startedAt'>): number {
  if (!timer.running || !timer.startedAt) {
    return Math.max(0, timer.baseSeconds);
  }

  const elapsed = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
  return Math.max(0, timer.baseSeconds + elapsed);
}

function getFeedTitle(log: FeedLog): string {
  if (log.type === 'bottle') return 'Bottle Feed';
  if (log.type === 'solids') return 'Solids';
  return 'Breastfeeding';
}

function getBreastSide(log: FeedLog): string {
  if (log.breastLeft && log.breastRight) return 'Both sides';
  if (log.breastLeft) return 'Left side';
  if (log.breastRight) return 'Right side';
  return 'Side not set';
}

export const FeedingTracker: React.FC<FeedingTrackerProps> = ({ onBack }) => {
  const { currentBaby, feedLogs, settings, refreshAllLogs } = useAppContext();
  const [timerState, setTimerState] = useState<FeedingTimerState | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLog, setEditingLog] = useState<FeedLog | null>(null);
  const [entryType, setEntryType] = useState<FeedType>('breast');
  const [entryTimestamp, setEntryTimestamp] = useState(toDateTimeLocalValue(new Date()));
  const [entryNotes, setEntryNotes] = useState('');
  const [entryBreastDuration, setEntryBreastDuration] = useState('20');
  const [entryBreastSide, setEntryBreastSide] = useState<BreastSide>('both');
  const [entryBottleAmount, setEntryBottleAmount] = useState('');
  const [entryBottleType, setEntryBottleType] = useState<'breast_milk' | 'formula' | 'other'>('breast_milk');
  const [entrySolidsDescription, setEntrySolidsDescription] = useState('');

  useEffect(() => {
    if (!currentBaby) {
      setTimerState(null);
      setTimerSeconds(0);
      return;
    }

    const saved = loadTimerState();
    if (!saved || saved.babyId !== currentBaby.id) {
      setTimerState({
        babyId: currentBaby.id,
        side: 'both',
        baseSeconds: 0,
        running: false,
      });
      setTimerSeconds(0);
      return;
    }

    setTimerState(saved);
    setTimerSeconds(computeTimerSeconds(saved));
  }, [currentBaby]);

  useEffect(() => {
    if (!timerState) return;

    if (!timerState.running) {
      setTimerSeconds(Math.max(0, timerState.baseSeconds));
      return;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds(computeTimerSeconds(timerState));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    if (!currentBaby || !timerState || timerState.babyId !== currentBaby.id) return;
    saveTimerState(timerState);
  }, [timerState, currentBaby]);

  const sortedLogs = useMemo(
    () => [...feedLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [feedLogs],
  );

  const groupedLogs = useMemo(() => groupByDate(sortedLogs, 'timestamp'), [sortedLogs]);

  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return sortedLogs.filter((log) => new Date(log.timestamp).toDateString() === today);
  }, [sortedLogs]);

  const todayFeedCount = todayLogs.length;
  const todayBreastMinutes = todayLogs.reduce(
    (sum, log) => sum + (log.type === 'breast' ? log.duration || 0 : 0),
    0,
  );
  const todayBottleTotal = todayLogs.reduce(
    (sum, log) => sum + (log.type === 'bottle' ? log.bottleAmount || 0 : 0),
    0,
  );
  const bottleUnit = settings?.units === 'imperial' ? 'oz' : 'ml';
  const latestFeed = sortedLogs[0] || null;

  const startTimer = () => {
    if (!timerState || !currentBaby) return;
    setTimerState({
      ...timerState,
      running: true,
      startedAt: new Date().toISOString(),
    });
  };

  const pauseTimer = () => {
    if (!timerState) return;
    const nextSeconds = computeTimerSeconds(timerState);
    setTimerState({
      ...timerState,
      running: false,
      baseSeconds: nextSeconds,
      startedAt: undefined,
    });
  };

  const resetTimer = () => {
    if (!timerState || !currentBaby) return;
    const nextState: FeedingTimerState = {
      babyId: currentBaby.id,
      side: timerState.side,
      baseSeconds: 0,
      running: false,
      startedAt: undefined,
    };
    setTimerState(nextState);
    setTimerSeconds(0);
  };

  const finishTimerAsFeed = async () => {
    if (!currentBaby || !timerState) return;

    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));
    const isLeft = timerState.side === 'left' || timerState.side === 'both';
    const isRight = timerState.side === 'right' || timerState.side === 'both';

    setSaving(true);
    try {
      await addFeedLog({
        id: crypto.randomUUID(),
        babyId: currentBaby.id,
        timestamp: new Date().toISOString(),
        type: 'breast',
        duration: durationMinutes,
        breastLeft: isLeft,
        breastRight: isRight,
        notes: `Timer session (${timerState.side})`,
        createdAt: new Date().toISOString(),
      });

      resetTimer();
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to save feeding timer log:', error);
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingLog(null);
    setEntryType('breast');
    setEntryTimestamp(toDateTimeLocalValue(new Date()));
    setEntryBreastDuration('20');
    setEntryBreastSide('both');
    setEntryBottleAmount('');
    setEntryBottleType('breast_milk');
    setEntrySolidsDescription('');
    setEntryNotes('');
    setShowEntryModal(true);
  };

  const openEditModal = (log: FeedLog) => {
    setEditingLog(log);
    setEntryType(log.type);
    setEntryTimestamp(toDateTimeLocalValue(new Date(log.timestamp)));
    setEntryBreastDuration(String(log.duration || 20));

    const side: BreastSide =
      log.breastLeft && log.breastRight ? 'both' : log.breastLeft ? 'left' : log.breastRight ? 'right' : 'both';
    setEntryBreastSide(side);

    setEntryBottleAmount(log.bottleAmount ? String(log.bottleAmount) : '');
    setEntryBottleType(log.bottleType || 'breast_milk');
    setEntrySolidsDescription(log.solidDescription || '');
    setEntryNotes(log.notes || '');
    setShowEntryModal(true);
  };

  const closeModal = () => {
    setShowEntryModal(false);
    setEditingLog(null);
  };

  const saveEntry = async () => {
    if (!currentBaby) return;

    const timestampDate = new Date(entryTimestamp);
    if (Number.isNaN(timestampDate.getTime())) {
      alert('Please enter a valid date and time.');
      return;
    }

    const duration = Number(entryBreastDuration);
    const bottleAmount = Number(entryBottleAmount);

    if (entryType === 'breast' && (!Number.isFinite(duration) || duration <= 0)) {
      alert('Please enter a valid breastfeeding duration in minutes.');
      return;
    }

    if (entryType === 'bottle' && (!Number.isFinite(bottleAmount) || bottleAmount <= 0)) {
      alert(`Please enter a valid bottle amount in ${bottleUnit}.`);
      return;
    }

    if (entryType === 'solids' && !entrySolidsDescription.trim()) {
      alert('Please add what your baby ate.');
      return;
    }

    const isLeft = entryBreastSide === 'left' || entryBreastSide === 'both';
    const isRight = entryBreastSide === 'right' || entryBreastSide === 'both';
    const commonFields = {
      timestamp: timestampDate.toISOString(),
      type: entryType,
      notes: entryNotes.trim() || undefined,
      duration: entryType === 'breast' ? Math.round(duration) : undefined,
      breastLeft: entryType === 'breast' ? isLeft : undefined,
      breastRight: entryType === 'breast' ? isRight : undefined,
      bottleAmount: entryType === 'bottle' ? bottleAmount : undefined,
      bottleType: entryType === 'bottle' ? entryBottleType : undefined,
      solidDescription: entryType === 'solids' ? entrySolidsDescription.trim() : undefined,
    };

    setSaving(true);
    try {
      if (editingLog) {
        await updateFeedLog({
          ...editingLog,
          ...commonFields,
        });
      } else {
        await addFeedLog({
          id: crypto.randomUUID(),
          babyId: currentBaby.id,
          createdAt: new Date().toISOString(),
          ...commonFields,
        });
      }

      closeModal();
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to save feeding log:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeLog = async (id: string) => {
    if (!window.confirm('Delete this feeding log?')) return;
    try {
      await deleteFeedLog(id);
      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to delete feeding log:', error);
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Feeding</span>
        </div>

        <button
          onClick={openAddModal}
          className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-14">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="bg-surface rounded-[3rem] p-8 border border-border-gray dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Feeding Timer</p>
                <h2 className="text-5xl font-headline font-black text-foreground tracking-tighter tabular-nums mt-2">
                  {formatTimerSeconds(timerSeconds)}
                </h2>
              </div>
              <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center shadow-inner">
                <Clock3 size={24} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-surface-gray dark:bg-zinc-900 rounded-[1.5rem] p-1.5">
              {(['left', 'both', 'right'] as const).map((side) => (
                <button
                  key={side}
                  onClick={() =>
                    timerState &&
                    setTimerState({
                      ...timerState,
                      side,
                    })
                  }
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    timerState?.side === side
                      ? 'bg-secondary text-white shadow-md'
                      : 'text-text-light hover:text-foreground'
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {timerState?.running ? (
                <button
                  onClick={pauseTimer}
                  className="col-span-2 h-14 rounded-[1.4rem] bg-secondary text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg"
                >
                  <Pause size={16} />
                  Pause
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  className="col-span-2 h-14 rounded-[1.4rem] bg-secondary text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play size={16} />
                  {timerSeconds > 0 ? 'Resume' : 'Start'}
                </button>
              )}

              <button
                onClick={resetTimer}
                disabled={timerSeconds === 0}
                className="h-14 rounded-[1.4rem] bg-surface-gray dark:bg-zinc-900 text-text-light disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <button
              onClick={finishTimerAsFeed}
              disabled={timerSeconds === 0 || saving}
              className="w-full h-14 rounded-[1.6rem] bg-emerald-500 text-white disabled:opacity-50 text-[10px] font-black uppercase tracking-[0.24em] flex items-center justify-center gap-2 shadow-lg"
            >
              <Square size={15} fill="currentColor" />
              Save Timer Feed
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-gray dark:bg-zinc-900/30 p-6 rounded-[2rem] border border-border-gray dark:border-zinc-800 shadow-inner">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Today Feeds</p>
              <p className="text-3xl font-headline font-black text-foreground tracking-tighter mt-2">{todayFeedCount}</p>
            </div>
            <div className="bg-surface-gray dark:bg-zinc-900/30 p-6 rounded-[2rem] border border-border-gray dark:border-zinc-800 shadow-inner">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Breast Time</p>
              <p className="text-3xl font-headline font-black text-secondary tracking-tighter mt-2">
                {formatDuration(todayBreastMinutes)}
              </p>
            </div>
            <div className="col-span-2 bg-surface-gray dark:bg-zinc-900/30 p-6 rounded-[2rem] border border-border-gray dark:border-zinc-800 shadow-inner">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Bottle Total Today</p>
              <p className="text-3xl font-headline font-black text-foreground tracking-tighter mt-2">
                {todayBottleTotal} {bottleUnit}
              </p>
              <p className="text-[10px] font-bold text-text-dim mt-1">
                {latestFeed ? `Last log: ${timeAgo(latestFeed.timestamp)}` : 'No feed logs yet'}
              </p>
            </div>
          </div>

          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-headline font-black text-foreground tracking-tighter">History</h2>
              <button
                onClick={openAddModal}
                className="text-[10px] font-black uppercase tracking-widest text-secondary"
              >
                Add Entry
              </button>
            </div>

            {Object.keys(groupedLogs).length === 0 ? (
              <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-8 text-center">
                <p className="text-sm font-bold text-text-light">No feed logs yet.</p>
              </div>
            ) : (
              Object.entries(groupedLogs).map(([dateLabel, logs]) => (
                <div key={dateLabel} className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest whitespace-nowrap">
                      {dateLabel}
                    </span>
                    <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
                  </div>

                  <div className="space-y-3">
                    {logs.map((log) => {
                      const Icon = log.type === 'bottle' ? Milk : log.type === 'solids' ? Soup : Droplets;

                      return (
                        <div
                          key={log.id}
                          className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                                <Icon size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-headline font-black text-foreground truncate">
                                  {getFeedTitle(log)}
                                </p>
                                <p className="text-[10px] font-black text-text-light uppercase tracking-widest truncate">
                                  {new Date(log.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditModal(log)}
                                className="p-2 text-text-light hover:text-secondary transition-all"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => removeLog(log.id)}
                                className="p-2 text-text-light hover:text-error transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 text-[11px] font-bold text-text-dim leading-relaxed">
                            {log.type === 'breast' && (
                              <p>
                                {log.duration || 0} min • {getBreastSide(log)}
                              </p>
                            )}
                            {log.type === 'bottle' && (
                              <p>
                                {log.bottleAmount || 0} {bottleUnit} • {(log.bottleType || 'other').replace('_', ' ')}
                              </p>
                            )}
                            {log.type === 'solids' && <p>{log.solidDescription || 'Solids logged'}</p>}
                            {log.notes && <p className="mt-1 italic">{log.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showEntryModal && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 90 }}
              animate={{ y: 0 }}
              exit={{ y: 90 }}
              transition={{ type: 'spring', damping: 28 }}
              className="w-full max-w-md bg-surface rounded-[2.6rem] border border-border-gray dark:border-zinc-800 p-7 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-headline font-black text-foreground tracking-tight">
                  {editingLog ? 'Edit Feed' : 'New Feed'}
                </h3>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full bg-surface-gray dark:bg-zinc-900 text-text-light flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-surface-gray dark:bg-zinc-900 rounded-[1.4rem] p-1.5">
                {(['breast', 'bottle', 'solids'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEntryType(type)}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      entryType === type
                        ? 'bg-secondary text-white shadow-md'
                        : 'text-text-light hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                    Time
                  </label>
                  <input
                    type="datetime-local"
                    value={entryTimestamp}
                    onChange={(event) => setEntryTimestamp(event.target.value)}
                    className="input-onboarding"
                  />
                </div>

                {entryType === 'breast' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={entryBreastDuration}
                        onChange={(event) => setEntryBreastDuration(event.target.value)}
                        className="input-onboarding"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                        Side
                      </label>
                      <select
                        value={entryBreastSide}
                        onChange={(event) => setEntryBreastSide(event.target.value as BreastSide)}
                        className="input-onboarding"
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                )}

                {entryType === 'bottle' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                        Amount ({bottleUnit})
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={entryBottleAmount}
                        onChange={(event) => setEntryBottleAmount(event.target.value)}
                        className="input-onboarding"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                        Bottle Type
                      </label>
                      <select
                        value={entryBottleType}
                        onChange={(event) =>
                          setEntryBottleType(event.target.value as 'breast_milk' | 'formula' | 'other')
                        }
                        className="input-onboarding"
                      >
                        <option value="breast_milk">Breast milk</option>
                        <option value="formula">Formula</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {entryType === 'solids' && (
                  <div>
                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                      Food
                    </label>
                    <input
                      type="text"
                      value={entrySolidsDescription}
                      onChange={(event) => setEntrySolidsDescription(event.target.value)}
                      placeholder="Example: Mashed banana"
                      className="input-onboarding"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-3 block mb-2">
                    Notes
                  </label>
                  <textarea
                    value={entryNotes}
                    onChange={(event) => setEntryNotes(event.target.value)}
                    placeholder="Optional notes"
                    className="w-full h-24 bg-surface-gray dark:bg-zinc-900 rounded-[1.4rem] p-4 text-sm font-bold text-foreground outline-none resize-none border border-border-gray dark:border-zinc-800"
                  />
                </div>
              </div>

              <button
                onClick={saveEntry}
                disabled={saving}
                className="w-full h-14 rounded-[1.6rem] bg-secondary text-white disabled:opacity-50 text-[10px] font-black uppercase tracking-[0.24em] flex items-center justify-center gap-2 shadow-lg"
              >
                <Square size={14} fill="currentColor" />
                {saving ? 'Saving...' : editingLog ? 'Update Feed' : 'Save Feed'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
