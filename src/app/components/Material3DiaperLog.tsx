/**
 * Material Design 3 Diaper Log
 * Quick logging for diaper changes (wet, dirty, both)
 * Connected to AppContext for persistent diaper logs
 */

import React from 'react';
import { useAppContext } from '../AppContext';
import BottomNavigation from './BottomNavigation';
import { addDiaperLog } from '../../lib/supabase-storage';

type DiaperType = 'wet' | 'dirty' | 'both';

interface DiaperLogEntry {
  type: DiaperType;
  timestamp: string;
}

export const Material3DiaperLog: React.FC = () => {
  const context = useAppContext();
  const { babies = [], currentBaby, diaperLogs = [], refreshAllLogs } = context || {};
  const recentLogs: DiaperLogEntry[] = diaperLogs.slice(0, 10).map((log) => ({
    type: log.type,
    timestamp: log.timestamp,
  }));

  const baby = currentBaby || babies?.[0];

  // Calculate today's stats
  const today = new Date().toDateString();
  const todaysLogs = diaperLogs.filter(
    (log: DiaperLogEntry) => new Date(log.timestamp).toDateString() === today
  );

  const wetCount = todaysLogs.filter((log: DiaperLogEntry) => log.type === 'wet' || log.type === 'both').length;
  const dirtyCount = todaysLogs.filter((log: DiaperLogEntry) => log.type === 'dirty' || log.type === 'both').length;
  const totalCount = todaysLogs.length;

  const handleLogDiaper = async (type: DiaperType) => {
    if (!currentBaby) return;

    try {
      await addDiaperLog({
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        babyId: currentBaby.id,
        timestamp: new Date().toISOString(),
        type,
        createdAt: new Date().toISOString(),
      });

      await refreshAllLogs();
    } catch (error) {
      console.error('Failed to save diaper log entry:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] pb-32 font-['Manrope',sans-serif]">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl flex justify-between items-center h-20 px-6 md:px-8 border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)]">
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
      </header>

      <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Diaper Log</h1>
          <p className="text-[#787b80] dark:text-zinc-400 text-sm md:text-base font-bold max-w-md leading-relaxed">
            Quick tracking for daily hygiene and healthy digestive progress.
          </p>
        </div>

        {/* Quick Log Bento Grid */}
        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Wet Button */}
            <button
              onClick={() => handleLogDiaper('wet')}
              className="col-span-1 bg-white dark:bg-[#1a1c1e] text-[#45627d] dark:text-blue-300 p-10 rounded-tl-[4rem] rounded-br-2xl rounded-tr-2xl rounded-bl-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black flex flex-col items-center justify-center gap-6 min-h-[220px] active:scale-[0.98] transition-all shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800 group"
            >
              <div className="w-16 h-16 rounded-full bg-[#f3f7ff] dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">water_drop</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em]">Purely Wet</span>
            </button>

            {/* Dirty Button */}
            <button
              onClick={() => handleLogDiaper('dirty')}
              className="col-span-1 bg-white dark:bg-[#1a1c1e] text-[#5e5f61] dark:text-zinc-300 p-10 rounded-tr-[4rem] rounded-bl-2xl rounded-tl-2xl rounded-br-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black flex flex-col items-center justify-center gap-6 min-h-[220px] active:scale-[0.98] transition-all shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800 group"
            >
              <div className="w-16 h-16 rounded-full bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">article</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em]">Dirty Only</span>
            </button>

            {/* Both Button - spans 2 cols */}
            <button
              onClick={() => handleLogDiaper('both')}
              className="col-span-2 bg-[#45627d] text-white p-10 rounded-br-[4rem] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black flex flex-col items-center justify-center gap-6 min-h-[180px] active:scale-[0.98] transition-all shadow-2xl shadow-[#45627d]/20 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-5xl">check_circle</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.4em] relative z-10">Integrated Status</span>
            </button>
          </div>
        </section>

        {/* Daily Summary */}
        <section className="bg-white dark:bg-[#1a1c1e] rounded-[3rem] p-10 space-y-10 shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800">
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white text-2xl tracking-tight">Daily Summary</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-8 bg-[#f3f7ff] dark:bg-blue-900/20 rounded-[2rem] border border-white dark:border-zinc-800 shadow-sm transition-transform hover:scale-105">
              <p className="text-[9px] text-[#45627d] dark:text-blue-400 font-black uppercase tracking-[0.3em] mb-4 font-['Plus_Jakarta_Sans',sans-serif]">Wet</p>
              <p className="text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#45627d] dark:text-blue-200 tracking-tighter">{wetCount}</p>
            </div>
            <div className="text-center p-8 bg-[#eefaff] dark:bg-cyan-900/20 rounded-[2rem] border border-white dark:border-zinc-800 shadow-sm transition-transform hover:scale-105">
              <p className="text-[9px] text-[#506267] dark:text-cyan-400 font-black uppercase tracking-[0.3em] mb-4 font-['Plus_Jakarta_Sans',sans-serif]">Dirty</p>
              <p className="text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#506267] dark:text-cyan-200 tracking-tighter">{dirtyCount}</p>
            </div>
            <div className="text-center p-8 bg-[#f3f3f7] dark:bg-zinc-800/40 rounded-[2rem] border border-white dark:border-zinc-800 shadow-sm transition-transform hover:scale-105">
              <p className="text-[9px] text-[#5e5f61] dark:text-zinc-500 font-black uppercase tracking-[0.3em] mb-4 font-['Plus_Jakarta_Sans',sans-serif]">Total</p>
              <p className="text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#5e5f61] dark:text-white tracking-tighter">{totalCount}</p>
            </div>
          </div>
        </section>

        {/* Recent History */}
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em]">
              Recent Cycles
            </h3>
            <button className="text-[10px] font-black text-[#5e5f61] dark:text-zinc-400 hover:text-[#45627d] dark:hover:text-blue-300 uppercase tracking-[0.2em] transition-colors">Historical Logs</button>
          </div>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <div className="bg-white dark:bg-[#1a1c1e] rounded-[2rem] p-10 text-center border border-gray-100 dark:border-zinc-800 border-dashed">
                <p className="text-[#a0a4ae] font-bold">No logs for this cycle</p>
              </div>
            ) : (
              recentLogs.map((log: DiaperLogEntry, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#1a1c1e] rounded-2xl p-5 flex items-center justify-between shadow-sm border border-gray-100 dark:border-zinc-800/50 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner ${
                        log.type === 'wet'
                          ? 'bg-[#f3f7ff] dark:bg-blue-900/20 text-[#45627d] dark:text-blue-400'
                          : log.type === 'dirty'
                            ? 'bg-[#eefaff] dark:bg-cyan-900/20 text-[#506267] dark:text-cyan-400'
                            : 'bg-[#f3f3f7] dark:bg-zinc-800 text-[#5e5f61] dark:text-zinc-300'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform"
                      >
                        {log.type === 'wet'
                          ? 'water_drop'
                          : log.type === 'dirty'
                            ? 'article'
                            : 'check_circle'}
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-sm tracking-tight text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] capitalize">
                        {log.type === 'both' ? 'Unified Change' : `${log.type} Change`}
                      </p>
                      <p className="text-[11px] text-[#787b80] dark:text-zinc-500 font-bold font-['Manrope',sans-serif] mt-1">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Completed
                      </p>
                    </div>
                  </div>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f3f3f7] dark:hover:bg-zinc-800 text-[#afb2b8] transition-colors">
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Health Insight */}
        <section className="bg-[#45627d] dark:bg-[#1a1c1e] text-white p-10 rounded-[3rem] border border-transparent dark:border-zinc-800 shadow-2xl shadow-[#45627d]/20 relative overflow-hidden group">
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-6 relative z-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:rotate-12 transition-transform">
              <span className="material-symbols-outlined text-white text-2xl">info</span>
            </div>
            <div>
              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xl mb-3 tracking-tight">Biological Insight</p>
              <p className="text-sm text-white/70 dark:text-zinc-400 font-bold leading-relaxed font-['Manrope',sans-serif] max-w-sm">
                {totalCount >= 6
                  ? `Great! ${baby?.name || 'Baby'} is maintaining optimal cycle frequency, indicating excellent metabolic hydration.`
                  : `Monitor metabolic patterns closely. Optimal development typical requires 6+ wet cycles daily.`}
              </p>
            </div>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Material3DiaperLog;
