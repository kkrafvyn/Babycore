import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Square, Settings2, Moon, Clock, Search, ListChecks } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ensureSleepCoachingProgram,
  logSleepCoachingSession,
  type SleepTrainingMethod,
} from '../../lib/sleep-coaching-api';

const MotionDiv = motion.div as any;

interface SleepTrainingProps {
  onBack: () => void;
}

type Method = 'ferber' | 'camp_out' | 'gentle';

const METHODS = {
  ferber: {
    name: 'Ferber Method (Check & Console)',
    description: 'Progressive waiting before checking on your baby. Helps baby learn to self-soothe.',
    intervals: [3, 5, 10, 10, 10] // minutes
  },
  camp_out: {
    name: 'Camping Out',
    description: 'Sit by baby\'s crib and gradually move the chair further away over several nights.',
    intervals: [0] 
  },
  gentle: {
    name: 'Pick Up, Put Down',
    description: 'Pick up when crying, put down when calm. Very gentle, takes more time.',
    intervals: [0]
  }
};

export const SleepTraining: React.FC<SleepTrainingProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [activeMethod, setActiveMethod] = useState<Method>('ferber');
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [programId, setProgramId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  
  // Ferber specific
  const [currentIntervalIdx, setCurrentIntervalIdx] = useState(0);
  const [intervalSecondsRemaining, setIntervalSecondsRemaining] = useState(0);
  const [isCheckInTime, setIsCheckInTime] = useState(false);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTotalSeconds(prev => prev + 1);
        
        if (activeMethod === 'ferber' && !isCheckInTime) {
          setIntervalSecondsRemaining(prev => {
            if (prev <= 1) {
              setIsCheckInTime(true);
              // In a real app, play a notification sound here
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, activeMethod, isCheckInTime]);

  const handleStart = async () => {
    setIsRunning(true);
    setStartTime(new Date());
    setSyncMessage(null);
    if (activeMethod === 'ferber') {
      setIntervalSecondsRemaining(METHODS.ferber.intervals[0] * 60);
      setCurrentIntervalIdx(0);
      setIsCheckInTime(false);
    }

    if (!currentBaby?.id) return;

    try {
      const program = await ensureSleepCoachingProgram(
        currentBaby.id,
        activeMethod as SleepTrainingMethod,
      );
      setProgramId(program.id);
    } catch (error) {
      console.warn('Unable to prepare sleep coaching cloud program:', error);
      setSyncMessage('Timer started. Cloud coaching history is unavailable right now.');
    }
  };

  const handleStop = async () => {
    const elapsedSeconds = totalSeconds;
    const method = activeMethod;
    const startedAt = startTime;

    if (currentBaby?.id && elapsedSeconds > 0) {
      setSavingSession(true);
      try {
        const session = await logSleepCoachingSession({
          babyId: currentBaby.id,
          programId,
          method: method as SleepTrainingMethod,
          totalSleepMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
          notes: startedAt
            ? `${METHODS[method].name} timer started ${startedAt.toLocaleString()}`
            : `${METHODS[method].name} timer session`,
        });
        setProgramId(session.program_id);
        setSyncMessage('Sleep coaching session saved to your cloud history.');
      } catch (error) {
        console.warn('Unable to save sleep coaching session:', error);
        setSyncMessage('Session ended, but cloud coaching history could not be saved.');
      } finally {
        setSavingSession(false);
      }
    }

    setIsRunning(false);
    setStartTime(null);
    setTotalSeconds(0);
    setIsCheckInTime(false);
  };

  const handlePraiseCheckIn = () => {
    // Parent finished checking in, start next waiting interval
    setIsCheckInTime(false);
    const nextIdx = Math.min(currentIntervalIdx + 1, METHODS.ferber.intervals.length - 1);
    setCurrentIntervalIdx(nextIdx);
    setIntervalSecondsRemaining(METHODS.ferber.intervals[nextIdx] * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Sleep Training</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
          
          {/* Method Selector */}
          {!isRunning && (
             <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-text-light px-2">Choose Method</h3>
               {syncMessage && (
                 <div className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                   {syncMessage}
                 </div>
               )}
               <div className="space-y-3">
                 {(Object.keys(METHODS) as Method[]).map(method => (
                   <button
                     key={method}
                     onClick={() => setActiveMethod(method)}
                     className={`w-full text-left p-6 rounded-[2rem] border transition-all ${
                       activeMethod === method 
                       ? 'bg-secondary/10 border-secondary' 
                       : 'bg-surface border-border-gray dark:border-zinc-800 hover:border-text-light/30'
                     }`}
                   >
                     <p className={`text-lg font-headline font-black ${activeMethod === method ? 'text-secondary' : 'text-foreground'}`}>
                       {METHODS[method].name}
                     </p>
                     <p className="text-xs font-bold text-text-dim mt-2 leading-relaxed">
                       {METHODS[method].description}
                     </p>
                   </button>
                 ))}
               </div>
             </div>
          )}

          {/* Active Timer View */}
          {isRunning ? (
            <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
               <div className={`p-10 rounded-[3rem] text-center border shadow-xl ${
                 isCheckInTime 
                 ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-amber-400/20' 
                 : 'bg-surface border-border-gray dark:border-zinc-800'
               }`}>
                 <Moon size={32} className={`mx-auto mb-4 ${isCheckInTime ? 'text-amber-900' : 'text-secondary'}`} />
                 
                 {activeMethod === 'ferber' ? (
                   <>
                     <h2 className={`text-xl font-headline font-black mb-2 ${isCheckInTime ? 'text-amber-900' : 'text-foreground'}`}>
                       {isCheckInTime ? "Check-In Time!" : `Wait before checking (${METHODS.ferber.intervals[currentIntervalIdx]}m)`}
                     </h2>
                     <p className={`text-7xl font-headline font-black tabular-nums tracking-tighter ${isCheckInTime ? 'text-amber-900' : 'text-secondary'}`}>
                       {isCheckInTime ? "GO" : formatTime(intervalSecondsRemaining)}
                     </p>
                     
                     {isCheckInTime ? (
                       <p className="text-sm font-bold mt-6">Go soothe your baby without picking them up. Keep it brief.</p>
                     ) : (
                       <p className="text-sm font-bold text-text-dim mt-6">Total Training Time: {formatTime(totalSeconds)}</p>
                     )}
                   </>
                 ) : (
                   <>
                     <h2 className="text-xl font-headline font-black text-foreground mb-2">Training in Progress</h2>
                     <p className="text-7xl font-headline font-black text-secondary tabular-nums tracking-tighter">
                       {formatTime(totalSeconds)}
                     </p>
                   </>
                 )}
               </div>

               <div className="flex gap-4">
                 {isCheckInTime && activeMethod === 'ferber' ? (
                    <button onClick={handlePraiseCheckIn} className="flex-1 py-5 rounded-[2rem] bg-amber-900 text-amber-400 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                      Done Checking In
                    </button>
                 ) : (
                    <button
                      onClick={() => void handleStop()}
                      disabled={savingSession}
                      className="flex-1 py-5 rounded-[2rem] bg-rose-50 text-rose-500 dark:bg-rose-900/20 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Square size={16} fill="currentColor" /> {savingSession ? 'Saving...' : 'Stop Training'}
                    </button>
                 )}
               </div>
            </MotionDiv>
          ) : (
            <button 
              onClick={() => void handleStart()}
              className="w-full py-6 rounded-[2.5rem] bg-secondary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-secondary/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
            >
              <Play size={20} fill="currentColor" /> Start {METHODS[activeMethod].name}
            </button>
          )}
          
          {!isRunning && activeMethod === 'ferber' && (
            <div className="bg-surface-gray dark:bg-zinc-900 p-6 rounded-[2rem]">
              <div className="flex items-center gap-2 text-text-dim mb-3">
                <ListChecks size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Ferber Intervals Today</span>
              </div>
              <div className="flex gap-2 text-sm font-bold text-foreground">
                {METHODS.ferber.intervals.map((m, i) => (
                  <span key={i} className="bg-background px-3 py-1 rounded-full border border-border-gray dark:border-zinc-800">
                    {m}m
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
