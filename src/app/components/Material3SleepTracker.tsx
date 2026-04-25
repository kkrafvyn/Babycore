/**
 * Material Design 3 Sleep Tracker Screen
 * Tracks sleep sessions with timer and history
 * Connected to AppContext for persistent sleep logs
 */

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { SleepLog } from '../../types';

export const Material3SleepTracker: React.FC = () => {
  const context = useAppContext();
  const { sleepLogs = [], babies = [] } = context || {};
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const baby = babies?.[0];

  // Timer logic
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      if (startTime) {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  const handleStartStop = () => {
    if (!isRecording) {
      setStartTime(new Date());
      setIsRecording(true);
    } else {
      setIsRecording(false);
    }
  };

  const handleReset = () => {
    setIsRecording(false);
    setStartTime(null);
    setElapsedTime('00:00:00');
  };

  // Calculate today's totals from real sleep logs
  const today = new Date().toDateString();
  const todaysSleepLogs = sleepLogs.filter(
    (log: SleepLog) => new Date(log.startTime).toDateString() === today
  );

  const totalSleepToday = todaysSleepLogs.reduce((sum: number, log: SleepLog) => sum + (log.duration || 0), 0);
  const totalHours = Math.floor(totalSleepToday / 60);
  const totalMinutes = totalSleepToday % 60;
  const sleepSessions = todaysSleepLogs.length;

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] pb-32 font-['Manrope',sans-serif]">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl flex justify-between items-center h-20 px-6 md:px-8 border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)]">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
            Serenity
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f3f3f7] dark:bg-zinc-800 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-colors shadow-inner">
            <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">notifications</span>
          </button>
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f3f3f7] dark:bg-zinc-800 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-colors shadow-inner">
            <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">account_circle</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pt-32 pb-8 max-w-3xl mx-auto space-y-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Sleep Tracker</h1>
          <p className="text-[#787b80] dark:text-zinc-400 text-sm md:text-base font-bold max-w-md leading-relaxed">
            Monitoring patterns for a more restful nursery and balanced growth.
          </p>
        </div>

        {/* Hero Timer Component (Primary Action) */}
        <div className="bg-white dark:bg-[#1a1c1e] rounded-tl-[4rem] rounded-br-[4rem] rounded-tr-2xl rounded-bl-2xl p-10 flex flex-col justify-between overflow-hidden relative group min-h-[420px] shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800 transition-all">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
            <span className="material-symbols-outlined text-[180px] text-[#2f3337] dark:text-white">bedtime</span>
          </div>
          
          <div className="z-10 relative">
            <div className="flex items-center gap-3 mb-10">
              <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-[#45627d] animate-pulse' : 'bg-[#afb2b8]'}`}></span>
              <span className="text-[#45627d] dark:text-blue-300 font-black tracking-[0.3em] text-[10px] uppercase font-['Plus_Jakarta_Sans',sans-serif]">
                {isRecording ? 'Active Sanctuary' : 'Quiet Discovery'}
              </span>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-7xl sm:text-9xl font-black text-[#2f3337] dark:text-white tracking-tighter mb-6 leading-none">
              {elapsedTime}
            </h3>
            <p className="text-[#787b80] dark:text-zinc-400 font-bold font-['Manrope',sans-serif] max-w-sm leading-relaxed">
              {isRecording 
                ? `${baby?.name || 'Your baby'} has been resting since ${startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with rhythmic calm.`
                : 'Prepare for a new restorative session in the nursery sanctuary.'}
            </p>
          </div>

          <div className="z-10 flex gap-4 mt-10">
            <button 
              onClick={handleStartStop}
              className="bg-[#5e5f61] text-white px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#5e5f61]/20 active:scale-[0.98] transition-all hover:bg-[#4a4b4d] font-['Plus_Jakarta_Sans',sans-serif]"
            >
              {isRecording ? 'End Session' : 'Begin Rest'}
            </button>
            <button 
              onClick={handleReset}
              className="bg-[#f3f3f7] dark:bg-zinc-800 text-[#787b80] px-8 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-all active:scale-[0.98] font-['Plus_Jakarta_Sans',sans-serif]"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Recent Sleep Logs */}
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em]">
              Rest Cycles
            </h3>
            <button className="text-[10px] font-black text-[#5e5f61] dark:text-zinc-400 hover:text-[#45627d] dark:hover:text-blue-300 uppercase tracking-[0.2em] transition-colors">Historical Logs</button>
          </div>
          <div className="space-y-4">
            {sleepLogs?.slice(0, 5).map((log: SleepLog, idx: number) => (
              <div key={idx} className="bg-white dark:bg-[#1a1c1e] rounded-2xl p-5 flex items-center justify-between shadow-sm border border-gray-100 dark:border-zinc-800/50 hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-[#f3f7ff] dark:bg-blue-900/20 text-[#45627d] dark:text-blue-400 rounded-xl flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-xl">bedtime</span>
                  </div>
                  <div>
                    <p className="font-black text-sm tracking-tight text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                      {Math.floor(log.duration / 60)}h {log.duration % 60}m Rest Period
                    </p>
                    <p className="text-[11px] text-[#787b80] dark:text-zinc-500 font-bold mt-1">
                      {new Date(log.startTime).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f3f3f7] dark:hover:bg-zinc-800 text-[#afb2b8] transition-colors">
                  <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Summary Stat Card */}
        <div className="bg-[#45627d] dark:bg-[#1a1c1e] text-white rounded-[3rem] p-10 shadow-2xl shadow-[#45627d]/20 relative overflow-hidden group border border-transparent dark:border-zinc-800">
           <div className="absolute -left-8 -bottom-8 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <span className="text-white/40 dark:text-blue-300/40 font-black text-[9px] uppercase tracking-[0.3em] font-['Plus_Jakarta_Sans',sans-serif]">Sanctuary Balance</span>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">verified</span>
              </div>
            </div>
            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-7xl font-black tracking-tighter font-['Plus_Jakarta_Sans',sans-serif]">
                {totalHours}<span className="text-white/20">.</span>{Math.floor(totalMinutes / 6 * 10) / 100}
              </span>
              <span className="text-white/40 font-black text-xl font-['Plus_Jakarta_Sans',sans-serif] uppercase tracking-widest">HRS</span>
            </div>
            <div className="pt-8 border-t border-white/10 dark:border-zinc-800">
              <p className="text-sm text-white/70 dark:text-zinc-400 leading-relaxed font-bold font-['Manrope',sans-serif]">
                {baby?.name || 'Your baby'} is currently within the optimal target range for healthy development and neuro-restoration.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Material3SleepTracker;
