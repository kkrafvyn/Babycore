/**
 * Material Design 3 Vaccination Calendar
 * Tracks vaccination schedule and completed vaccinations
 * Connected to AppContext for vaccine records
 */

import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import BottomNavigation from './BottomNavigation';

interface VaccineSchedule {
  id: string;
  name: string;
  ageInMonths: number;
  completed: boolean;
  date?: Date;
  nextDue?: Date;
}

export const Material3VaccinationCalendar: React.FC = () => {
  const context = useAppContext();
  const { babies = [] } = context || {};

  const baby = babies?.[0];

  // Standard vaccination schedule (mock data)
  const vaccineSchedule: VaccineSchedule[] = [
    { id: '1', name: 'BCG', ageInMonths: 0, completed: true, date: new Date('2024-01-15') },
    { id: '2', name: 'Hepatitis B', ageInMonths: 0, completed: true, date: new Date('2024-01-15') },
    { id: '3', name: 'Polio (OPV)', ageInMonths: 0, completed: true, date: new Date('2024-01-15') },
    { id: '4', name: 'Pentavalent 1', ageInMonths: 0, completed: true, date: new Date('2024-01-15') },
    { id: '5', name: 'Rotavirus 1', ageInMonths: 0, completed: true, date: new Date('2024-01-15') },
    { id: '6', name: 'PCV 1', ageInMonths: 0, completed: true, date: new Date('2024-01-15') },
    { id: '7', name: 'Pentavalent 2', ageInMonths: 1, completed: false, nextDue: new Date('2024-02-15') },
    { id: '8', name: 'Rotavirus 2', ageInMonths: 1, completed: false, nextDue: new Date('2024-02-15') },
    { id: '9', name: 'PCV 2', ageInMonths: 1, completed: false, nextDue: new Date('2024-02-15') },
    { id: '10', name: 'Pentavalent 3', ageInMonths: 2, completed: false, nextDue: new Date('2024-03-15') },
  ];

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedCount = vaccineSchedule.filter((v) => v.completed).length;
  const pendingCount = vaccineSchedule.filter((v) => !v.completed).length;

  const completionPercentage = Math.round((completedCount / vaccineSchedule.length) * 100);

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
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Immunization</h1>
          <p className="text-[#787b80] dark:text-zinc-400 text-sm md:text-base font-bold max-w-md leading-relaxed">
            Protecting your baby with a safe, pediatrician-approved schedule.
          </p>
        </div>

        {/* Progress Card */}
        <section className="bg-white dark:bg-[#1a1c1e] text-[#2f3337] dark:text-white p-10 rounded-[3rem] shadow-[0_32px_64px_rgba(47,51,55,0.04)] border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] dark:opacity-[0.05] group-hover:opacity-[0.04] transition-opacity pointer-events-none">
            <span className="material-symbols-outlined text-[180px] text-[#2f3337] dark:text-white">health_and_safety</span>
          </div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#f3f7ff]/50 dark:bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[#afb2b8] dark:text-zinc-500 font-['Plus_Jakarta_Sans',sans-serif] mb-4">Vaccination Progress</p>
                <h2 className="text-6xl sm:text-7xl font-['Plus_Jakarta_Sans',sans-serif] font-black tracking-tighter text-[#45627d] dark:text-blue-300">{completionPercentage}%</h2>
              </div>
              <div className="w-20 h-20 rounded-[2rem] bg-[#f3f7ff] dark:bg-blue-900/20 flex items-center justify-center border border-white dark:border-zinc-800 shadow-sm transition-transform hover:scale-105">
                <span className="text-3xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#45627d] dark:text-blue-200">{completedCount}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-4 bg-[#f3f3f7] dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-zinc-700/50">
              <div
                className="h-full bg-[#45627d] dark:bg-blue-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${completionPercentage}%` }}
              >
                  <div className="absolute inset-0 bg-white/20 dark:bg-white/10 w-full rounded-full animate-pulse"></div>
              </div>
            </div>

            <p className="text-sm font-bold text-[#787b80] dark:text-zinc-400 font-['Manrope',sans-serif] leading-relaxed">
              {completedCount} out of {vaccineSchedule.length} recommended vaccinations completed successfully.
            </p>
          </div>
        </section>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-[#eefaff] dark:bg-cyan-900/20 rounded-tl-[3rem] rounded-br-2xl rounded-tr-2xl rounded-bl-2xl p-8 text-center border border-white dark:border-zinc-800 shadow-sm transition-transform hover:scale-105">
            <p className="text-[9px] text-[#506267] dark:text-cyan-400 uppercase tracking-[0.3em] font-black mb-4 font-['Plus_Jakarta_Sans',sans-serif]">Completed Status</p>
            <p className="text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#506267] dark:text-cyan-200 tracking-tighter">{completedCount}</p>
          </div>
          <div className="bg-[#f3f3f7] dark:bg-zinc-800/40 rounded-tr-[3rem] rounded-bl-2xl rounded-tl-2xl rounded-br-2xl p-8 text-center border border-white dark:border-zinc-800 shadow-sm transition-transform hover:scale-105">
            <p className="text-[9px] text-[#787b80] dark:text-zinc-400 uppercase tracking-[0.3em] font-black mb-4 font-['Plus_Jakarta_Sans',sans-serif]">Pending Reminders</p>
            <p className="text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#5e5f61] dark:text-zinc-300 tracking-tighter">{pendingCount}</p>
          </div>
        </div>

        {/* Vaccine Schedule */}
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <h3 className="text-[10px] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em] px-2">
            Schedule Timeline
          </h3>
          <div className="space-y-4">
            {vaccineSchedule.map((vaccine) => (
              <div
                key={vaccine.id}
                className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                  expandedId === vaccine.id ? 'shadow-lg border-gray-200 dark:border-zinc-700' : 'shadow-sm border-transparent'
                } border ${
                  vaccine.completed
                    ? 'bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-zinc-800/50'
                    : 'bg-[#faf9fc] dark:bg-[#151618] border-l-4 border-l-[#506267] dark:border-l-cyan-500'
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedId(expandedId === vaccine.id ? null : vaccine.id)
                  }
                  className="w-full p-6 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-5 flex-1 text-left">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-inner ${
                        vaccine.completed
                          ? 'bg-[#eefaff] dark:bg-cyan-900/20 text-[#45627d] dark:text-cyan-400'
                          : 'bg-white dark:bg-[#1a1c1e] text-[#506267] dark:text-zinc-300 border border-gray-100 dark:border-zinc-800'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[28px]`}
                      >
                        {vaccine.completed ? 'task_alt' : 'schedule'}
                      </span>
                    </div>
                    <div>
                      <p
                        className={`font-['Plus_Jakarta_Sans',sans-serif] font-black text-xl tracking-tight leading-tight mb-1 ${
                          vaccine.completed
                            ? 'text-[#2f3337] dark:text-white opacity-40'
                            : 'text-[#2f3337] dark:text-white'
                        }`}
                      >
                        {vaccine.name}
                      </p>
                      <p className={`text-[11px] font-bold font-['Manrope',sans-serif] uppercase tracking-wider ${
                          vaccine.completed ? 'text-[#a0a4ae] dark:text-zinc-500' : 'text-[#506267] dark:text-cyan-500'
                        }`}>
                        {vaccine.completed
                          ? `Completed - ${vaccine.date?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : `Due - ${vaccine.nextDue?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center transition-transform ${expandedId === vaccine.id ? 'rotate-180 bg-[#e0e2e8] dark:bg-zinc-700' : 'group-hover:bg-[#e0e2e8] dark:group-hover:bg-zinc-700'}`}>
                    <span className="material-symbols-outlined text-[#787b80] dark:text-zinc-400 text-lg">
                      expand_more
                    </span>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedId === vaccine.id && (
                  <div className="px-6 pb-6 pt-0 border-t border-gray-100 dark:border-zinc-800/50 space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4 pt-6">
                      <div className="bg-[#f3f3f7] dark:bg-zinc-800/80 rounded-[1.5rem] p-5 border border-white dark:border-zinc-700/50">
                        <p className="text-[9px] text-[#787b80] dark:text-zinc-400 uppercase tracking-[0.3em] font-black mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Immunization Type</p>
                        <p className="font-extrabold text-[#2f3337] dark:text-white text-sm font-['Manrope',sans-serif]">{vaccine.name}</p>
                      </div>
                      <div className="bg-[#f3f3f7] dark:bg-zinc-800/80 rounded-[1.5rem] p-5 border border-white dark:border-zinc-700/50">
                        <p className="text-[9px] text-[#787b80] dark:text-zinc-400 uppercase tracking-[0.3em] font-black mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                          {vaccine.completed ? 'Administered' : 'Scheduled Due'}
                        </p>
                        <p className="font-extrabold text-[#2f3337] dark:text-white text-sm font-['Manrope',sans-serif]">
                          {vaccine.completed
                            ? vaccine.date?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                            : vaccine.nextDue?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {!vaccine.completed && (
                      <button className="w-full bg-[#45627d] dark:bg-blue-600 text-white py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-[#45627d]/20 mt-4 hover:bg-[#324b61] dark:hover:bg-blue-500">
                        <span className="material-symbols-outlined text-xl">check_circle</span>
                        Confirm Administration
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Health Tip */}
        <section className="bg-[#45627d] dark:bg-[#1a1c1e] text-white p-10 rounded-[3rem] border border-transparent dark:border-zinc-800 shadow-2xl shadow-[#45627d]/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700" />
          <div className="flex items-start gap-6 relative z-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:-rotate-12 transition-transform">
              <span className="material-symbols-outlined text-white text-2xl">lightbulb</span>
            </div>
            <div>
              <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xl mb-3 tracking-tight">Clinical Importance</h4>
              <p className="text-sm font-bold font-['Manrope',sans-serif] text-white/70 dark:text-zinc-400 leading-relaxed max-w-sm">
                Maintain these secure records across pediatric visits. They form the foundational health history required for educational enrollment and global travel.
              </p>
            </div>
          </div>
        </section>

        {/* Export Records */}
        <button className="w-full border-2 border-[#e0e2e8] dark:border-zinc-700 text-[#5e5f61] dark:text-zinc-300 py-6 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#f3f3f7] dark:hover:bg-zinc-800 active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-xl">download</span>
          Generate PDF Record
        </button>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Material3VaccinationCalendar;
