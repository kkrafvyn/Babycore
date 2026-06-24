/**
 * Material Design 3 Feeding Tracker
 * Tracks breastfeeding sessions, bottle feeding, and solids intake
 * Connected to AppContext for persistent feed logs
 */

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { FeedLog } from '../../types';
import BottomNavigation from './BottomNavigation';

type FeedingMode = 'breast' | 'bottle' | 'solids';

interface FeedingSession {
  mode: FeedingMode;
  duration?: number;
  amount?: number;
  notes?: string;
  startTime: Date;
}

export const Material3FeedingTracker: React.FC = () => {
  const context = useAppContext();
  const { feedLogs = [], babies = [] } = context || {};

  const [activeMode, setActiveMode] = useState<FeedingMode>('breast');
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [bottleAmount, setBottleAmount] = useState('');
  const [solidsInput, setSolidsInput] = useState('');

  const baby = babies?.[0];

  // Timer for breastfeeding
  useEffect(() => {
    if (!isRecording || activeMode !== 'breast') return;

    const interval = setInterval(() => {
      if (startTime) {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(
          `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startTime, activeMode]);

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
    setElapsedTime('00:00');
  };

  // Calculate today's feeding totals
  const today = new Date().toDateString();
  const todaysFeedLogs = feedLogs.filter(
    (log: FeedLog) => new Date(log.timestamp).toDateString() === today
  );

  const breastSessions = todaysFeedLogs.filter((log: FeedLog) => log.type === 'breast').length;
  const totalBreastTime = todaysFeedLogs
    .filter((log: FeedLog) => log.type === 'breast')
    .reduce((sum: number, log: FeedLog) => sum + (log.bottleAmount || 0), 0);

  const bottleSessions = todaysFeedLogs.filter((log: FeedLog) => log.type === 'bottle').length;
  const totalBottleAmount = todaysFeedLogs
    .filter((log: FeedLog) => log.type === 'bottle')
    .reduce((sum: number, log: FeedLog) => sum + (log.bottleAmount || 0), 0);

  const solidsSessions = todaysFeedLogs.filter((log: FeedLog) => log.type === 'solids').length;

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] pb-32 font-['Manrope',sans-serif]">
      {/* Top App Bar */}
      <div className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(47,51,55,0.02)] border-b border-gray-100 dark:border-zinc-800">
        <div className="flex justify-between items-center w-full px-6 md:px-8 h-20">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
              Bloom
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
        </div>
      </div>

      <main className="pt-32 px-6 max-w-3xl mx-auto">
        <div className="mb-12 flex flex-col gap-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Feeding Tracker</h1>
          <p className="text-[#787b80] dark:text-zinc-400 text-sm md:text-base font-bold max-w-md leading-relaxed">
            Maintain a gentle record of your baby's nutrition with serene simplicity.
          </p>
        </div>

        {/* Mode Selection Chips */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2 no-scrollbar font-['Plus_Jakarta_Sans',sans-serif]">
          <button
            onClick={() => {
              setActiveMode('breast');
              handleReset();
            }}
            className={`px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap ${
              activeMode === 'breast'
                ? 'bg-[#45627d] text-white shadow-lg shadow-[#45627d]/20'
                : 'bg-[#f3f3f7] dark:bg-zinc-800 text-[#787b80] dark:text-zinc-500 hover:bg-[#e0e2e8]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">water_drop</span>
            Breast
          </button>
          <button
            onClick={() => {
              setActiveMode('bottle');
              handleReset();
            }}
            className={`px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap ${
              activeMode === 'bottle'
                ? 'bg-[#45627d] text-white shadow-lg shadow-[#45627d]/20'
                : 'bg-[#f3f3f7] dark:bg-zinc-800 text-[#787b80] dark:text-zinc-500 hover:bg-[#e0e2e8]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">water_bottle</span>
            Bottle
          </button>
          <button
            onClick={() => {
              setActiveMode('solids');
              handleReset();
            }}
            className={`px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap ${
              activeMode === 'solids'
                ? 'bg-[#45627d] text-white shadow-lg shadow-[#45627d]/20'
                : 'bg-[#f3f3f7] dark:bg-zinc-800 text-[#787b80] dark:text-zinc-500 hover:bg-[#e0e2e8]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">restaurant</span>
            Solids
          </button>
        </div>

        {/* Breastfeeding Timer Card - Asymmetric Design */}
        {activeMode === 'breast' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl rounded-tl-[4rem] rounded-br-[4rem] p-10 mb-10 shadow-[0_8px_32px_rgba(47,51,55,0.03)] border border-gray-100/50 dark:border-zinc-800/50 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#cde5ff]/20 dark:bg-blue-900/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="font-['Plus_Jakarta_Sans',sans-serif]">
                  <h2 className="text-xl font-extrabold text-[#2f3337] dark:text-white">Nursing Timer</h2>
                  <p className="text-xs text-[#787b80] font-bold uppercase tracking-widest mt-1">Nurturing Momentum</p>
                </div>
                <div className="bg-[#e3f7fd] dark:bg-cyan-900/30 px-4 py-1.5 rounded-full">
                  <span className="text-[10px] font-black text-[#506267] dark:text-cyan-300 uppercase tracking-widest leading-none">
                    {isRecording ? 'Active Session' : 'Ready'}
                  </span>
                </div>
              </div>

              <div className="text-7xl sm:text-8xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tighter text-[#2f3337] dark:text-white mb-10 text-center">
                {elapsedTime}
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                <button className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 border-[#45627d] bg-[#cde5ff]/40 text-[#45627d] transition-all font-['Plus_Jakarta_Sans',sans-serif]">
                  <span className="material-symbols-outlined text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>left_panel_close</span>
                  <span className="font-extrabold text-xs uppercase tracking-widest">Left Side</span>
                </button>
                <button className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 border-transparent bg-[#f3f3f7] dark:bg-zinc-800 text-[#787b80] transition-all hover:bg-[#e0e2e8] font-['Plus_Jakarta_Sans',sans-serif]">
                  <span className="material-symbols-outlined text-3xl mb-2">right_panel_close</span>
                  <span className="font-extrabold text-xs uppercase tracking-widest">Right Side</span>
                </button>
              </div>

              <div className="flex gap-4 max-w-md mx-auto">
                <button
                  onClick={handleStartStop}
                  className={`flex-1 py-4 rounded-full font-extrabold text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl font-['Plus_Jakarta_Sans',sans-serif] ${
                    isRecording
                      ? 'bg-white text-[#2f3337] border border-gray-100 shadow-lg shadow-black/5'
                      : 'bg-[#5e5f61] text-white shadow-[#5e5f61]/20'
                  }`}
                >
                  {isRecording ? 'Pause Flow' : 'Start Nourishing'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-4 bg-[#f3f3f7] dark:bg-zinc-800 text-[#787b80] rounded-full font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-[#e0e2e8] transition-all active:scale-95 font-['Plus_Jakarta_Sans',sans-serif]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottle Intake Card */}
        {activeMode === 'bottle' && (
          <div className="bg-white dark:bg-[#1a1c1e] rounded-[3rem] p-10 mb-12 shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800">
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl tracking-tight mb-8 text-[#2f3337] dark:text-white">
              Bottle Intake
            </h3>
            <div className="flex items-end gap-4 mb-10">
              <input
                type="number"
                value={bottleAmount}
                onChange={(e) => setBottleAmount(e.target.value)}
                placeholder="120"
                className="w-40 bg-[#f3f3f7] dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-2xl p-6 text-4xl font-black focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-400 text-[#2f3337] dark:text-white text-center shadow-inner"
              />
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#afb2b8] dark:text-zinc-500 mb-6 text-xl">ml</span>
            </div>
            <button className="w-full bg-[#5e5f61] text-white py-6 rounded-full font-extrabold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-[#4a4b4d] shadow-xl shadow-[#5e5f61]/20 font-['Plus_Jakarta_Sans',sans-serif]">
              <span className="material-symbols-outlined">water_bottle</span>
              Log Bottle Feed
            </button>
          </div>
        )}

        {/* Solids Card */}
        {activeMode === 'solids' && (
          <div className="bg-[#45627d] dark:bg-[#1a1c1e] rounded-[3rem] p-10 mb-12 shadow-2xl shadow-[#45627d]/20 relative overflow-hidden group border border-transparent dark:border-zinc-800 text-white">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl tracking-tight mb-8">
                Solids Exploration
              </h3>
              <input
                type="text"
                value={solidsInput}
                onChange={(e) => setSolidsInput(e.target.value)}
                placeholder="Ex: Mashed Avocado..."
                className="w-full bg-white/10 dark:bg-zinc-800 border border-white/20 dark:border-zinc-700 rounded-2xl p-6 mb-8 focus:ring-0 focus:border-white/50 text-white placeholder:text-white/50 font-bold text-lg backdrop-blur-sm"
              />
              <button className="w-full bg-white text-[#45627d] dark:bg-zinc-700 dark:text-white py-6 rounded-full font-extrabold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-[#f3f3f7] dark:hover:bg-zinc-600 shadow-xl shadow-black/10 font-['Plus_Jakarta_Sans',sans-serif]">
                <span className="material-symbols-outlined">restaurant</span>
                Log Solids Menu
              </button>
            </div>
          </div>
        )}

        {/* Today's Logs */}
        {/* Today's Logs */}
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em]">
              Daily Digest
            </h3>
            <button className="text-[10px] font-black text-[#5e5f61] dark:text-zinc-400 hover:text-[#45627d] dark:hover:text-blue-300 uppercase tracking-[0.2em] transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {todaysFeedLogs.length === 0 ? (
              <div className="bg-white dark:bg-[#1a1c1e] rounded-3xl p-10 text-center border border-gray-100 dark:border-zinc-800 border-dashed">
                <p className="text-[#a0a4ae] font-bold">No nourishment logged today</p>
              </div>
            ) : (
              todaysFeedLogs.map((log: FeedLog, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#1a1c1e] rounded-2xl p-5 flex items-center justify-between shadow-sm border border-gray-100 dark:border-zinc-800/50 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                        log.type === 'breast'
                          ? 'bg-[#f3f7ff] dark:bg-blue-900/20 text-[#45627d] dark:text-blue-400'
                          : log.type === 'bottle'
                            ? 'bg-[#eefaff] dark:bg-cyan-900/20 text-[#506267] dark:text-cyan-400'
                            : 'bg-[#f3f3f7] dark:bg-zinc-800 text-[#5e5f61] dark:text-zinc-300'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                      >
                        {log.type === 'breast'
                          ? 'water_drop'
                          : log.type === 'bottle'
                            ? 'water_bottle'
                            : 'restaurant'}
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-sm tracking-tight text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                        {log.type === 'breast'
                          ? `Nursing - ${log.notes || 'Routine Session'}`
                          : log.type === 'bottle'
                            ? `Bottle Match - ${log.bottleAmount || 0}ml`
                            : `Solid Menu - ${log.solidDescription || 'Unknown dish'}`}
                      </p>
                      <p className="text-[11px] text-[#787b80] dark:text-zinc-500 font-bold mt-1">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined transition-transform group-hover:translate-x-1 ${
                    log.type === 'breast'
                      ? 'text-[#45627d] dark:text-blue-400'
                      : log.type === 'bottle'
                        ? 'text-[#506267] dark:text-cyan-400'
                        : 'text-[#afb2b8] dark:text-zinc-500'
                  }`}>
                    chevron_right
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Summary Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4 pb-12">
          <div className="bg-[#f3f7ff] dark:bg-blue-900/20 rounded-[2rem] p-6 text-center border border-white dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/40 dark:bg-blue-500/10 rounded-full blur-2xl"></div>
            <p className="text-[10px] text-[#45627d] dark:text-blue-400 font-black uppercase tracking-[0.2em] mb-4 font-['Plus_Jakarta_Sans',sans-serif] relative z-10">Nursing</p>
            <p className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter relative z-10">{breastSessions}</p>
          </div>
          <div className="bg-[#eefaff] dark:bg-cyan-900/20 rounded-[2rem] p-6 text-center border border-white dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-white/40 dark:bg-cyan-500/10 rounded-full blur-2xl"></div>
            <p className="text-[10px] text-[#506267] dark:text-cyan-400 font-black uppercase tracking-[0.2em] mb-4 font-['Plus_Jakarta_Sans',sans-serif] relative z-10">Bottle</p>
            <p className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter relative z-10">{totalBottleAmount}</p>
          </div>
          <div className="bg-[#f3f3f7] dark:bg-zinc-800/40 rounded-[2rem] p-6 text-center border border-white dark:border-zinc-800 shadow-sm relative overflow-hidden">
             <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/60 dark:bg-zinc-700/20 rounded-full blur-2xl"></div>
            <p className="text-[10px] text-[#5e5f61] dark:text-zinc-500 font-black uppercase tracking-[0.2em] mb-4 font-['Plus_Jakarta_Sans',sans-serif] relative z-10">Solids</p>
            <p className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter relative z-10">{solidsSessions}</p>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Material3FeedingTracker;
