/**
 * Material Design 3 Growth Chart
 * Tracks weight, height, and head circumference with percentile visualization
 * Connected to AppContext for growth metrics
 */

import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import BottomNavigation from './BottomNavigation';

type MetricType = 'weight' | 'height' | 'head';

interface GrowthEntry {
  date: Date;
  value: number;
  percentile: number;
}

export const Material3GrowthChart: React.FC = () => {
  const context = useAppContext();
  const { babies = [] } = context || {};
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');

  const baby = babies?.[0];

  // Mock growth data - will be replaced with real data from context
  const growthData: Record<MetricType, GrowthEntry[]> = {
    weight: [
      { date: new Date('2024-01-15'), value: 3.2, percentile: 50 },
      { date: new Date('2024-03-15'), value: 5.2, percentile: 50 },
      { date: new Date('2024-05-15'), value: 6.8, percentile: 50 },
      { date: new Date('2024-07-15'), value: 8.4, percentile: 50 },
    ],
    height: [
      { date: new Date('2024-01-15'), value: 50, percentile: 50 },
      { date: new Date('2024-03-15'), value: 57, percentile: 50 },
      { date: new Date('2024-05-15'), value: 62, percentile: 50 },
      { date: new Date('2024-07-15'), value: 66, percentile: 50 },
    ],
    head: [
      { date: new Date('2024-01-15'), value: 35, percentile: 50 },
      { date: new Date('2024-03-15'), value: 40, percentile: 50 },
      { date: new Date('2024-05-15'), value: 42, percentile: 50 },
      { date: new Date('2024-07-15'), value: 43, percentile: 50 },
    ],
  };

  const currentData = growthData[selectedMetric];
  const latestEntry = currentData[currentData.length - 1];
  const unitMap = { weight: 'kg', height: 'cm', head: 'cm' };

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

      <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Growth Tracker</h1>
          <p className="text-[#787b80] dark:text-zinc-400 text-sm md:text-base font-bold max-w-md leading-relaxed">
            Monitor developmental milestones and percentile trends with precision.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex p-2 bg-[#f3f3f7] dark:bg-zinc-800/80 rounded-full gap-2 font-['Plus_Jakarta_Sans',sans-serif]">
          {(['weight', 'height', 'head'] as MetricType[]).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`flex-1 py-3 px-2 rounded-full text-xs uppercase tracking-widest font-extrabold transition-all duration-200 ${
                selectedMetric === metric
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-[#45627d] dark:text-blue-300'
                  : 'text-[#787b80] dark:text-zinc-500 hover:text-[#5e5f61] dark:hover:text-zinc-300'
              }`}
            >
              {metric} {metric === 'head' && <span className="hidden sm:inline">Circumference</span>}
            </button>
          ))}
        </div>

        {/* Current Measurement Card */}
        <section className="bg-white dark:bg-[#1a1c1e] rounded-[3rem] p-8 md:p-10 relative overflow-hidden shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f3f3f7] to-[#e3f7fd] dark:from-zinc-900 dark:to-cyan-900/20"></div>
          </div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#cde5ff]/20 dark:bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <p className="text-[#a0a4ae] dark:text-zinc-500 font-['Plus_Jakarta_Sans',sans-serif] text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                  Current Measurement
                </p>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-7xl sm:text-8xl font-black text-[#2f3337] dark:text-white flex items-baseline gap-2 tracking-tighter">
                  {latestEntry.value}
                  <span className="text-2xl font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest pl-1">
                    {unitMap[selectedMetric]}
                  </span>
                </h2>
              </div>
              <div className="flex gap-4 items-center">
                <span className="inline-flex items-center px-6 py-3 bg-[#e3f7fd]/50 dark:bg-cyan-900/20 text-[#506267] dark:text-cyan-400 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase font-['Plus_Jakarta_Sans',sans-serif] border border-[#e3f7fd] dark:border-cyan-900/30">
                  {latestEntry.percentile}th Percentile
                </span>
                <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-800 text-[#45627d] dark:text-blue-300 shadow-sm border border-gray-100 dark:border-zinc-700 hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">share</span>
                </button>
              </div>
            </div>

            {/* Chart Container - SVG Placeholder */}
            <div className="relative h-64 w-full">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 200">
                {/* 95th Percentile */}
                <path
                  d="M0,180 Q100,140 200,90 T400,20"
                  fill="none"
                  stroke="#e0e2e8"
                  strokeDasharray="4"
                  strokeWidth="2"
                />
                {/* 50th Percentile (Target) */}
                <path
                  d="M0,195 Q100,165 200,120 T400,60"
                  fill="none"
                  opacity="0.3"
                  stroke="#5c5f64"
                  strokeWidth="1"
                />
                {/* 5th Percentile */}
                <path
                  d="M0,200 Q100,185 200,150 T400,110"
                  fill="none"
                  stroke="#e0e2e8"
                  strokeDasharray="4"
                  strokeWidth="2"
                />
                {/* Actual Data Line */}
                <path
                  d="M0,195 Q50,185 100,168 L150,155 L200,135 L250,115 L300,105"
                  fill="none"
                  stroke="#5e5f61"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                {/* Interactive Data Points */}
                <circle cx="100" cy="168" fill="#5e5f61" r="4" />
                <circle cx="200" cy="135" fill="#5e5f61" r="4" />
                <circle cx="300" cy="105" fill="#ffffff" r="6" stroke="#5e5f61" strokeWidth="3" />
              </svg>

              {/* Timeline Labels */}
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter pt-2 border-t border-surface-container-low">
                <span>Birth</span>
                <span>2m</span>
                <span>4m</span>
                <span>6m</span>
                <span>8m</span>
                <span>10m</span>
                <span>12m</span>
              </div>
            </div>
          </div>
        </section>

        {/* Insights Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-[#1a1c1e] p-10 rounded-tl-[3rem] rounded-br-2xl rounded-tr-2xl rounded-bl-2xl shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800">
            <div className="w-14 h-14 rounded-2xl bg-[#eefaff] dark:bg-cyan-900/20 flex items-center justify-center text-[#506267] dark:text-cyan-400 mb-6 shadow-inner">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl text-[#2f3337] dark:text-white leading-tight mb-3 tracking-tight">
              Steady Status
            </h3>
            <p className="text-sm text-[#787b80] dark:text-zinc-400 leading-relaxed font-bold font-['Manrope',sans-serif]">
              {selectedMetric === 'weight'
                ? 'Weight gain is consistent with WHO guidelines.'
                : selectedMetric === 'height'
                  ? 'Height development on track for age.'
                  : 'Head circumference growing normally.'}
            </p>
          </div>

          <div className="bg-[#45627d] dark:bg-[#1a1c1e] text-white p-10 rounded-br-[3rem] rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl shadow-[0_32px_64px_rgba(69,98,125,0.1)] border border-transparent dark:border-zinc-800 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-6 border border-white/20 backdrop-blur-md">
                <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              </div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl leading-tight mb-3 tracking-tight">
                Premium Insight
              </h3>
              <p className="text-sm text-white/70 dark:text-zinc-400 leading-relaxed font-bold font-['Manrope',sans-serif]">
                {selectedMetric === 'weight'
                  ? 'Transition to solids may initially impact velocity pattern.'
                  : selectedMetric === 'height'
                    ? 'Expected growth spurts may appear around 6 months.'
                    : 'Cortical development phases mapping well.'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em]">
              Recent Logs
            </h3>
            <button className="text-[10px] font-black text-[#5e5f61] dark:text-zinc-400 hover:text-[#45627d] dark:hover:text-blue-300 uppercase tracking-[0.2em] transition-colors">Complete History</button>
          </div>
          <div className="space-y-4">
            {currentData.slice().reverse().map((entry, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1a1c1e] rounded-2xl p-6 flex items-center justify-between shadow-sm border border-gray-100 dark:border-zinc-800/50 hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[#a0a4ae] dark:text-zinc-500">event</span>
                  </div>
                  <div>
                    <p className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white text-xl tracking-tight">
                      {entry.value} <span className="text-[#afb2b8] dark:text-zinc-500 uppercase text-xs tracking-widest ml-1">{unitMap[selectedMetric]}</span>
                    </p>
                    <p className="text-[11px] text-[#787b80] dark:text-zinc-500 font-bold mt-1 font-['Manrope',sans-serif]">
                      {entry.date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-[#506267] dark:text-cyan-400 uppercase tracking-[0.2em] bg-[#eefaff] dark:bg-cyan-900/20 border border-[#eefaff] dark:border-cyan-900/30 px-3 py-1.5 rounded-lg font-['Plus_Jakarta_Sans',sans-serif]">
                    {entry.percentile}p
                  </span>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f3f3f7] dark:hover:bg-zinc-800 text-[#afb2b8] transition-colors">
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Add Entry CTA */}
        <button className="w-full bg-[#5e5f61] text-white py-6 rounded-full font-extrabold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-[#4a4b4d] shadow-xl shadow-[#5e5f61]/20 font-['Plus_Jakarta_Sans',sans-serif]">
          <span className="material-symbols-outlined">add</span>
          Record New Entry
        </button>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Material3GrowthChart;
