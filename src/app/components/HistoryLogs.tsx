import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Bell, Search, Droplets, Utensils, Moon, TrendingUp, MoreHorizontal, History, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../AppContext';
import { getSleepLogsByBaby, getFeedLogsByBaby, getDiaperLogsByBaby, getGrowthMeasurementsByBaby } from '../../lib/supabase-storage';
import type { SleepLog, FeedLog, DiaperLog, GrowthMeasurement } from '../../types';
import { i18nT } from '../../lib/i18n';

type UnifiedLog = {
  id: string;
  type: 'Sleep' | 'Feeding' | 'Diaper' | 'Growth';
  time: Date;
  detail: string;
};

const FILTERS = ['All', 'Feeding', 'Sleep', 'Diaper', 'Growth'];

export const HistoryLogs: React.FC<{ onBack: () => void; showBackButton?: boolean }> = ({ onBack, showBackButton = true }) => {
  const { currentBaby, feedLogs, sleepLogs, diaperLogs, growthMeasurements } = useAppContext();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const allLogs = useMemo(() => {
    if (!currentBaby) return [];
    
    const unified: UnifiedLog[] = [
      ...sleepLogs.map((s: SleepLog): UnifiedLog => ({
        id: s.id,
        type: 'Sleep',
        time: new Date(s.startTime),
        detail: `${s.duration}m sleep session`,
      })),
      ...feedLogs.map((f: FeedLog): UnifiedLog => ({
        id: f.id,
        type: 'Feeding',
        time: new Date(f.timestamp),
        detail: f.type === 'breast'
          ? `${f.duration ?? '?'}m nursing • ${f.breastLeft ? 'Left' : 'Right'}`
          : f.type === 'bottle'
          ? `${f.bottleAmount ?? '?'}ml bottle`
          : f.solidDescription || 'Solids',
      })),
      ...diaperLogs.map((d: DiaperLog): UnifiedLog => ({
        id: d.id,
        type: 'Diaper',
        time: new Date(d.timestamp),
        detail: `${d.type.charAt(0).toUpperCase() + d.type.slice(1)} diaper`,
      })),
      ...growthMeasurements.map((g: GrowthMeasurement): UnifiedLog => ({
        id: g.id,
        type: 'Growth',
        time: new Date(g.date),
        detail: [
          g.weight !== undefined ? `${g.weight}kg` : null,
          g.height !== undefined ? `${g.height}cm` : null,
        ].filter(Boolean).join(' • ') || 'Measurement logged',
      })),
    ];

    return unified.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [currentBaby, sleepLogs, feedLogs, diaperLogs, growthMeasurements]);

  const filtered = useMemo(() => {
    return allLogs.filter(l => {
      const matchFilter = activeFilter === 'All' || l.type === activeFilter;
      const matchSearch = search === '' || l.detail.toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [allLogs, activeFilter, search]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, UnifiedLog[]>>((acc, log) => {
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const logDate = log.time.toDateString();
      const label = logDate === today.toDateString() ? 'Today'
        : logDate === yesterday.toDateString() ? 'Yesterday'
        : log.time.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
      if (!acc[label]) acc[label] = [];
      acc[label].push(log);
      return acc;
    }, {});
  }, [filtered]);

  const iconFor = (type: UnifiedLog['type']) => {
    switch (type) {
      case 'Sleep': return Moon;
      case 'Feeding': return Utensils;
      case 'Diaper': return Droplets;
      case 'Growth': return TrendingUp;
    }
  };
  const bgFor = (type: UnifiedLog['type']) => {
    switch (type) {
      case 'Sleep': return 'bg-primary/10 text-primary';
      case 'Feeding': return 'bg-accent-blue/10 text-secondary';
      case 'Diaper': return 'bg-secondary/10 text-secondary';
      case 'Growth': return 'bg-amber-500/10 text-amber-600';
    }
  };

  const handleExport = () => {
    const rows = [
      ['Type', 'Date', 'Time', 'Detail'],
      ...allLogs.map(l => [
        l.type,
        l.time.toLocaleDateString(),
        l.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        l.detail,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cradlyn-history-${currentBaby?.name || 'export'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-16 sm:h-20 px-3 sm:px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-3 sm:gap-4">
          {showBackButton ? (
            <button onClick={onBack} title="Go back" className="p-2 -ml-1 sm:-ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
              <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
            </button>
          ) : (
            <div className="w-2" />
          )}
          <span className="text-xl font-headline font-black text-foreground tracking-tight">{i18nT('screens.logs')}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 sm:pt-24 px-3 sm:px-6 pb-24">
        <div className="max-w-md mx-auto w-full space-y-10">

           <div className="space-y-6">
              <div className="relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors" size={20} />
                 <input
                   type="text"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder={i18nT('journal.search')}
                   className="w-full h-16 bg-surface border border-border-gray dark:border-zinc-800 rounded-full pl-16 pr-8 text-sm font-bold text-foreground outline-none shadow-sm focus:ring-2 focus:ring-primary/10"
                 />
              </div>

              <div className="overflow-x-auto no-scrollbar flex gap-3 px-1">
                 {FILTERS.map(f => (
                   <button key={f} onClick={() => setActiveFilter(f)} className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === f ? 'bg-secondary text-white shadow-lg' : 'bg-surface text-text-light border border-border-gray dark:border-zinc-800'}`}>
                     {f}
                   </button>
                 ))}
              </div>
           </div>

           {filtered.length === 0 ? (
             <div className="py-24 text-center space-y-3">
               <p className="text-[10px] font-black text-text-light uppercase tracking-widest">No records found</p>
               <p className="text-xs font-bold text-text-dim">Start tracking to build your archive</p>
             </div>
           ) : (
             <div className="space-y-12">
               {Object.entries(grouped).map(([date, items]) => (
                 <div key={date} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                       <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] whitespace-nowrap">{date}</span>
                       <div className="h-px w-full bg-border-gray dark:bg-zinc-800 opacity-50" />
                    </div>
                    <div className="space-y-4">
                       {items.map(item => {
                         const Icon = iconFor(item.type);
                         return (
                           <div key={item.id} className="group bg-surface rounded-[2.5rem] p-6 shadow-sm border border-border-gray dark:border-zinc-800 flex items-center justify-between transition-all hover:shadow-xl">
                              <div className="flex items-center gap-5">
                                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${bgFor(item.type)}`}>
                                    <Icon size={20} fill="currentColor" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-text-light uppercase tracking-widest mb-1">{item.type}</p>
                                    <h4 className="text-xl font-headline font-black text-foreground tracking-tight leading-none">{item.detail}</h4>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end gap-3">
                                 <span className="text-[10px] font-black text-text-dim tabular-nums bg-surface-gray dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                                   {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                 </div>
                ))}
             </div>
           )}

           <div className="bg-secondary p-10 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
              <div className="relative z-10">
                 <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 text-white border border-white/10">
                    <History size={24} />
                 </div>
                 <h3 className="text-2xl font-headline font-black text-white tracking-tighter mb-4 leading-none">{i18nT('settings.export')}</h3>
                 <p className="text-[12px] font-bold text-white/50 leading-relaxed mb-8 max-w-[240px] mx-auto">
                   Download a structured CSV of every log recorded since birth.
                 </p>
                 <button onClick={handleExport} className="w-full bg-white text-secondary py-5 rounded-full font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3">
                    <Download size={20} />
                    <span>Generate CSV Report</span>
                 </button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};
