/**
 * Material Design 3 Dashboard Screen
 * Bento grid layout with activity status, quick actions, and milestones
 */

import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import BottomNavigation from './BottomNavigation';

export const Material3Dashboard: React.FC = () => {
  const context = useAppContext();
  const { babies, sleepLogs, feedLogs } = context || {};
  const diaperLogs: { type: string; timestamp: string }[] = [];
  const [selectedBaby, setSelectedBaby] = useState(babies ? babies[0] : null);

  if (!selectedBaby || !babies?.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-on-surface-variant font-label">No babies added yet</p>
        </div>
      </div>
    );
  }

  // Calculate age
  const ageInMonths = Math.floor(
    (new Date().getTime() - new Date(selectedBaby.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const ageInDays = Math.floor(
    (new Date().getTime() - new Date(selectedBaby.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24)
  ) % 30;

  // Get last activity times
  const lastSleep = sleepLogs?.length ? sleepLogs[0] : null;
  const lastFeed = feedLogs?.length ? feedLogs[0] : null;
  const lastDiaper = diaperLogs?.length ? diaperLogs[0] : null;

  // Calculate next milestone based on age
  const nextMilestones = [
    { age: 1, name: 'First Smile' },
    { age: 2, name: 'Cooing' },
    { age: 3, name: 'Rolling Over' },
    { age: 6, name: 'Sitting Up' },
    { age: 9, name: 'Crawling' },
    { age: 12, name: 'First Steps' },
  ];

  const nextMilestone = nextMilestones.find((m) => m.age > ageInMonths) || nextMilestones[0];

  const formatTimeAgo = (date: string) => {
    const ms = new Date().getTime() - new Date(date).getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    if (hours > 0) return `${hours}h ${minutes}m ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] pb-32 font-['Manrope',sans-serif]">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl flex justify-between items-center h-20 px-6 md:px-8 border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-white dark:border-zinc-700 shadow-inner">
            {selectedBaby.photoUrl ? (
              <img src={selectedBaby.photoUrl} alt={selectedBaby.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">child_care</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tight leading-tight">{selectedBaby.name}</h2>
            <p className="text-xs font-bold text-[#a0a4ae] dark:text-zinc-500 uppercase tracking-widest">{ageInMonths}m {ageInDays}d</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f3f3f7] dark:bg-zinc-800 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-colors shadow-inner">
            <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">notifications</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12">
        {/* Status Bento Grid */}
        <section className="grid grid-cols-2 gap-6">
          {/* Last Sleep Card */}
          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-tl-[3rem] rounded-br-2xl rounded-tr-2xl rounded-bl-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between min-h-[200px] group hover:shadow-md transition-all">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-[#f3f3f7] dark:bg-zinc-800 rounded-[1rem] flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400 text-xl" style={{ fontSize: '24px' }}>
                  bedtime
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500">Sleep</span>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tighter text-[#2f3337] dark:text-white">
                {lastSleep ? `${Math.round(lastSleep.duration / 60)}h` : '--'}
              </p>
              <p className="text-xs text-[#787b80] dark:text-zinc-400 font-bold mt-1">
                {lastSleep ? formatTimeAgo(lastSleep.startTime) : 'no data'}
              </p>
            </div>
          </div>

          {/* Last Feed Card */}
          <div className="bg-white dark:bg-[#1a1c1e] p-8 rounded-tr-[3rem] rounded-bl-2xl rounded-tl-2xl rounded-br-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between min-h-[200px] group hover:shadow-md transition-all">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-[#ffebee] dark:bg-rose-900/20 rounded-[1rem] flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner border border-[#fff0f2] dark:border-rose-900/30">
                <span className="material-symbols-outlined text-[#d48c96] dark:text-rose-400 text-xl" style={{ fontSize: '24px' }}>
                  child_care
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#d48c96]/80 dark:text-rose-500">Feed</span>
            </div>
            <div className="mt-6">
              <p className="text-3xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tighter text-[#2f3337] dark:text-white lowercase">
                {lastFeed ? lastFeed.type : '--'}
              </p>
              <p className="text-xs text-[#787b80] dark:text-zinc-400 font-bold mt-1">
                {lastFeed ? formatTimeAgo(lastFeed.timestamp) : 'no data'}
              </p>
            </div>
          </div>

          {/* Last Diaper Card */}
          <div className="bg-[#eefaff] dark:bg-cyan-900/20 p-8 rounded-bl-[3rem] rounded-tr-2xl rounded-tl-2xl rounded-br-2xl shadow-sm border border-white dark:border-zinc-800 flex flex-col justify-between min-h-[200px] group hover:shadow-md transition-all">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-white dark:bg-[#1a1c1e] rounded-[1rem] flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-[#506267] dark:text-cyan-400 text-xl" style={{ fontSize: '24px' }}>
                  water_drop
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#506267]/70 dark:text-cyan-500">Diaper</span>
            </div>
            <div className="mt-6">
              <p className="text-3xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tighter text-[#506267] dark:text-cyan-300 lowercase">
                {lastDiaper ? lastDiaper.type : '--'}
              </p>
              <p className="text-xs text-[#506267]/70 dark:text-cyan-500/80 font-bold mt-1">
                {lastDiaper ? formatTimeAgo(lastDiaper.timestamp) : 'no data'}
              </p>
            </div>
          </div>

          {/* Health Status Card */}
          <div className="bg-[#45627d] dark:bg-[#1a1c1e] text-white p-8 rounded-br-[3rem] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl shadow-[0_32px_64px_rgba(69,98,125,0.1)] border border-transparent dark:border-zinc-800 flex flex-col justify-between min-h-[200px] group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-[1rem] flex items-center justify-center group-hover:-rotate-6 transition-transform backdrop-blur-md border border-white/20">
                <span className="material-symbols-outlined text-white text-xl" style={{ fontSize: '24px' }}>
                  health_and_safety
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-white/50 dark:text-zinc-500">Health</span>
            </div>
            <div className="relative z-10 mt-6">
              <p className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tighter text-white">Good</p>
              <p className="text-xs text-white/70 dark:text-zinc-400 font-bold mt-1">all milestones on track</p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <h3 className="text-[10px] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em] px-2 text-center">Quick Log</h3>
          <div className="grid grid-cols-3 gap-6">
            <button className="bg-[#f3f3f7] dark:bg-[#1a1c1e] p-6 rounded-2xl text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] font-black flex flex-col items-center justify-center min-h-[140px] gap-4 hover:shadow-lg hover:-translate-y-1 transition-all border border-gray-50 dark:border-zinc-800 shadow-sm active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-3xl text-[#5e5f61] dark:text-zinc-400">bedtime</span>
              </div>
              <span className="text-sm tracking-wide">Sleep</span>
            </button>
            <button className="bg-[#f3f3f7] dark:bg-[#1a1c1e] p-6 rounded-2xl text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] font-black flex flex-col items-center justify-center min-h-[140px] gap-4 hover:shadow-lg hover:-translate-y-1 transition-all border border-gray-50 dark:border-zinc-800 shadow-sm active:scale-[0.98]">
               <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-3xl text-[#5e5f61] dark:text-zinc-400">child_care</span>
              </div>
              <span className="text-sm tracking-wide">Feed</span>
            </button>
            <button className="bg-[#f3f3f7] dark:bg-[#1a1c1e] p-6 rounded-2xl text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] font-black flex flex-col items-center justify-center min-h-[140px] gap-4 hover:shadow-lg hover:-translate-y-1 transition-all border border-gray-50 dark:border-zinc-800 shadow-sm active:scale-[0.98]">
               <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-3xl text-[#5e5f61] dark:text-zinc-400">water_drop</span>
              </div>
              <span className="text-sm tracking-wide">Diaper</span>
            </button>
          </div>
        </section>

        {/* Upcoming Milestones */}
        <section className="bg-white dark:bg-[#1a1c1e] p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#f3f3f7]/50 dark:to-zinc-800/10 pointer-events-none" />
          <div className="relative z-10 w-full flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#afb2b8] dark:text-zinc-500 font-['Plus_Jakarta_Sans',sans-serif] mb-2 block">Growth Milestone</span>
              <h3 className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tight text-[#2f3337] dark:text-white leading-tight">Next: {nextMilestone.name}</h3>
              <p className="text-sm mt-1 font-bold text-[#787b80] dark:text-zinc-400">Expected around {nextMilestone.age} months old</p>
            </div>
            <div className="w-16 h-16 rounded-[1.5rem] bg-[#f3f3f7] dark:bg-zinc-900 flex items-center justify-center shadow-inner border border-white dark:border-zinc-800 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-3xl text-[#45627d] dark:text-cyan-500">celebration</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Material3Dashboard;
