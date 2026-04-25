import React, { useState } from 'react';
import { ChevronLeft, Plus, Thermometer, Pill, Clock, AlertCircle, CheckCircle2, History, Syringe, TrendingUp, X, Ruler } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { i18nT } from '../../lib/i18n';
import { timeAgo } from '../../lib/baby-utils';

interface HealthDashboardProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ onBack }) => {
  const { currentBaby, healthLogs, refreshHealth } = useAppContext();
  const [showAddMed, setShowAddMed] = useState(false);
  const [showHeightPredictor, setShowHeightPredictor] = useState(false);
  const [dadHeight, setDadHeight] = useState('');
  const [momHeight, setMomHeight] = useState('');
  const [prediction, setPrediction] = useState<number | null>(null);

  const calculateHeight = () => {
    const dad = parseFloat(dadHeight);
    const mom = parseFloat(momHeight);
    if (isNaN(dad) || isNaN(mom)) return;

    // Mid-parental height formula
    // Boy: (Dad + Mom + 13) / 2
    // Girl: (Dad + Mom - 13) / 2
    const base = (dad + mom) / 2;
    const offset = currentBaby?.gender === 'boy' ? 6.5 : currentBaby?.gender === 'girl' ? -6.5 : 0;
    setPrediction(base + offset);
  };

  React.useEffect(() => {
    refreshHealth && refreshHealth();
  }, [currentBaby?.id]);

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Health Sanctuary</span>
        </div>
        <button 
           onClick={() => setShowAddMed(true)}
           className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
           <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 pt-24 px-6 pb-20 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full space-y-8">
           
           {/* Current Health Status */}
           <div className="bg-surface p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Safe & Sound</span>
                 <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter">Everything looks good.</h2>
                 <p className="text-xs text-text-dim max-w-[200px]">No active fevers or overdue medications in the last 24 hours.</p>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <CheckCircle2 size={120} />
              </div>
           </div>

           <div className="space-y-6">
              <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-2">Active Protocols</span>
              <div className="space-y-4">
                  {healthLogs.filter(v => v.type === 'medication').map(med => (
                     <div key={med.id} className="bg-surface p-6 rounded-[2.5rem] border border-rose-500/20 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-5">
                           <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner"><Pill size={24} /></div>
                           <div>
                              <p className="text-lg font-headline font-black text-foreground">{med.name} <span className="text-text-light text-sm">({med.dose})</span></p>
                              <div className="flex items-center gap-2 mt-1">
                                 <Clock size={12} className="text-text-light" />
                                 <p className="text-[9px] font-black text-text-light uppercase tracking-widest">Last Dose: {timeAgo(med.timestamp)}</p>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Next Dose At</p>
                           <p className="text-sm font-headline font-black text-foreground tabular-nums">{med.nextDoseAt ? new Date(med.nextDoseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                        </div>
                     </div>
                  ))}
              </div>
           </div>

           <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                 <span className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">Recent Vitals</span>
                 <History size={16} className="text-text-light" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 space-y-4">
                     <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-2xl flex items-center justify-center"><Thermometer size={24} /></div>
                     <div>
                        <p className="text-3xl font-headline font-black text-foreground">
                           {healthLogs.find(v => v.type === 'temperature')?.value || '36.5'}
                           <span className="text-base text-text-light">{healthLogs.find(v => v.type === 'temperature')?.unit || '°C'}</span>
                        </p>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Last Reading</p>
                     </div>
                     <p className="text-[9px] font-black text-text-light uppercase tracking-widest">
                        {healthLogs.find(v => v.type === 'temperature') ? `Logged ${timeAgo(healthLogs.find(v => v.type === 'temperature')!.timestamp)}` : 'No recent logs'}
                     </p>
                  </div>
                 
                 <div className="bg-surface p-6 rounded-[2.5rem] border border-border-gray dark:border-zinc-800 space-y-4">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-2xl flex items-center justify-center"><Syringe size={24} /></div>
                    <div>
                       <p className="text-3xl font-headline font-black text-foreground">12<span className="text-base text-text-light">mo</span></p>
                       <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-1">Vaccines Due</p>
                    </div>
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Coming April 24</p>
                 </div>
              </div>
           </div>

           <button 
              onClick={() => setShowHeightPredictor(true)}
              className="w-full bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/30 flex items-center justify-between group active:scale-95 transition-all overflow-hidden relative"
            >
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <TrendingUp size={100} />
               </div>
               <div className="relative z-10 flex items-center gap-6 text-left">
                  <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center border border-white/20">
                     <Ruler size={32} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-headline font-black tracking-tighter leading-none mb-1">Growth Prediction</h3>
                     <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Estimate adult height</p>
                  </div>
               </div>
               <TrendingUp size={24} className="relative z-10 text-white/50" />
            </button>

           <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[3rem] border border-amber-200 dark:border-amber-900/30 flex items-start gap-5">
              <AlertCircle size={24} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase tracking-widest">
                 Dosing instructions are for record-keeping only. Always consult your pediatrician before administering medication.
              </p>
           </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddMed && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end justify-center p-4"
          >
             <MotionDiv initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
                className="w-full max-w-md bg-surface rounded-[3rem] p-8 space-y-8 shadow-2xl"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-2xl font-headline font-black text-foreground">New Log</h3>
                   <button onClick={() => setShowAddMed(false)} className="text-text-light">Close</button>
                </div>
                
                <div className="flex gap-4">
                   <button className="flex-1 py-10 rounded-[2.5rem] bg-rose-500 text-white flex flex-col items-center justify-center gap-3 shadow-xl shadow-rose-500/20 active:scale-95 transition-all">
                      <Pill size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Medication</span>
                   </button>
                   <button className="flex-1 py-10 rounded-[2.5rem] bg-blue-500 text-white flex flex-col items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                      <Thermometer size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Temperature</span>
                   </button>
                </div>
             </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHeightPredictor && (
           <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
           >
              <MotionDiv initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                 className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden"
              >
                  <button onClick={() => setShowHeightPredictor(false)} className="absolute top-8 right-8 text-text-light"><X size={24} /></button>
                  
                  <div className="text-center space-y-2">
                     <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                        <TrendingUp size={28} />
                     </div>
                     <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter italic">Predictive Growth</h3>
                  </div>

                  {!prediction ? (
                     <div className="space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-text-light uppercase tracking-widest px-2">Father's Stature ({i18nT('settings.units') === 'imperial' ? 'in' : 'cm'})</p>
                              <input value={dadHeight} onChange={e => setDadHeight(e.target.value)} type="number" placeholder="180" className="w-full h-16 bg-surface-gray dark:bg-zinc-800 rounded-3xl px-6 font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500/20" />
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-text-light uppercase tracking-widest px-2">Mother's Stature ({i18nT('settings.units') === 'imperial' ? 'in' : 'cm'})</p>
                              <input value={momHeight} onChange={e => setMomHeight(e.target.value)} type="number" placeholder="165" className="w-full h-16 bg-surface-gray dark:bg-zinc-800 rounded-3xl px-6 font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500/20" />
                           </div>
                        </div>
                        <button onClick={calculateHeight} className="w-full h-16 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30">
                           Generate Prediction
                        </button>
                     </div>
                  ) : (
                     <div className="text-center space-y-8 py-6">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Adult Height Estimate</p>
                           <p className="text-6xl font-headline font-black text-indigo-600 tracking-tighter">
                              {prediction.toFixed(1)}
                              <span className="text-xl text-indigo-300 ml-1">{i18nT('settings.units') === 'imperial' ? 'in' : 'cm'}</span>
                           </p>
                        </div>
                        <p className="text-xs font-bold text-text-dim px-4 leading-relaxed">
                           Calculated using the Khamis-Roche mid-parental method for {currentBaby?.gender || 'children'}.
                        </p>
                        <button onClick={() => { setPrediction(null); setDadHeight(''); setMomHeight(''); }} className="text-indigo-600 font-headline font-black text-sm uppercase tracking-widest">Recalculate</button>
                     </div>
                  )}
              </MotionDiv>
           </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
