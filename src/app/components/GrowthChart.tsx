import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Plus, TrendingUp, Award, Ruler, Scale, BrainCircuit, X, Check, Info } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getGrowthMeasurementsByBaby, addGrowthMeasurement, updateGrowthMeasurement, deleteGrowthMeasurement } from '../../lib/supabase-storage';
import type { GrowthMeasurement } from '../../types';
import { getWHOData, getPercentile, getAgeInMonths, convertWeight, convertLength } from '../../lib/baby-utils';
import { i18nT } from '../../lib/i18n';

const MotionDiv = motion.div as any;

interface GrowthChartProps {
  onBack: () => void;
  showBackButton?: boolean;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({ onBack, showBackButton = true }) => {
  const { currentBaby, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'weight' | 'height' | 'head'>('weight');
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<GrowthMeasurement | null>(null);
  const [newWeight, setNewWeight] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newHead, setNewHead] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPoint, setSelectedPoint] = useState<GrowthMeasurement | null>(null);
  const [useImperial, setUseImperial] = useState(settings?.units === 'imperial');

  const isImperial = useImperial;
  const weightUnit = isImperial ? 'lbs' : 'kg';
  const lengthUnit = isImperial ? 'in' : 'cm';
  const gender = currentBaby?.gender;

  useEffect(() => {
    loadMeasurements();
  }, [currentBaby]);

  const loadMeasurements = async () => {
    if (!currentBaby) return;
    setLoading(true);
    try {
      const data = await getGrowthMeasurementsByBaby(currentBaby.id);
      setMeasurements(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (err) {
      console.error('Failed to load growth measurements', err);
    }
    setLoading(false);
  };

  const openAddModal = (m?: GrowthMeasurement) => {
    if (m) {
      setEditingMeasurement(m);
      setNewWeight(m.weight?.toString() || '');
      setNewHeight(m.height?.toString() || '');
      setNewHead(m.headCircumference?.toString() || '');
      setNewDate(m.date.split('T')[0]);
    } else {
      setEditingMeasurement(null);
      setNewWeight(''); setNewHeight(''); setNewHead('');
      setNewDate(new Date().toISOString().split('T')[0]);
    }
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!currentBaby) return;
    try {
      const data: GrowthMeasurement = {
        id: editingMeasurement?.id || crypto.randomUUID(),
        babyId: currentBaby.id,
        date: newDate,
        weight: newWeight ? parseFloat(newWeight) : undefined,
        height: newHeight ? parseFloat(newHeight) : undefined,
        headCircumference: newHead ? parseFloat(newHead) : undefined,
        createdAt: editingMeasurement?.createdAt || new Date().toISOString(),
      };
      if (editingMeasurement) {
        await updateGrowthMeasurement(data);
      } else {
        await addGrowthMeasurement(data);
      }
      setShowAddModal(false);
      setEditingMeasurement(null);
      await loadMeasurements();
    } catch (err) {
      console.error('Failed to save measurement', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(i18nT('common.confirm'))) return;
    try {
      await deleteGrowthMeasurement(id);
      await loadMeasurements();
    } catch (err) {
      console.error('Failed to delete measurement', err);
    }
  };

  const whoData = useMemo(() => getWHOData(activeTab, gender || undefined), [activeTab, gender]);

  const chartW = 400;
  const chartH = 200;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 25;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxAge = 24;
  const scaleX = (age: number) => padL + (age / maxAge) * plotW;

  const allValues = whoData.flatMap(d => [d.p3, d.p97]);
  const minY = Math.min(...allValues) * 0.9;
  const maxY = Math.max(...allValues) * 1.1;
  const scaleY = (val: number) => padT + plotH - ((val - minY) / (maxY - minY)) * plotH;

  const buildPath = (key: 'p3' | 'p15' | 'p50' | 'p85' | 'p97') =>
    whoData.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(d.ageMonths)} ${scaleY(d[key])}`).join(' ');

  const babyPoints = measurements
    .map(m => {
      const age = currentBaby?.dateOfBirth ? getAgeInMonths(currentBaby.dateOfBirth, m.date) : 0;
      let val = activeTab === 'weight' ? m.weight : activeTab === 'height' ? m.height : m.headCircumference;
      if (val === undefined) return null;
      if (isImperial && activeTab === 'weight') val = convertWeight(val, 'metric', 'imperial');
      if (isImperial && (activeTab === 'height' || activeTab === 'head')) val = convertLength(val, 'metric', 'imperial');
      return { age, val, measurement: m };
    })
    .filter(Boolean) as { age: number; val: number; measurement: GrowthMeasurement }[];

  const babyPath = babyPoints.length > 1
    ? babyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.age)} ${scaleY(p.val)}`).join(' ')
    : '';

  const latestPoint = babyPoints[babyPoints.length - 1];
  const currentValue = latestPoint?.val ?? '—';
  const currentPercentile = latestPoint && currentBaby?.dateOfBirth
    ? getPercentile(latestPoint.val, latestPoint.age, activeTab, gender || undefined)
    : '—';

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-10 bg-background/80 backdrop-blur-xl h-16 sm:h-20 px-3 sm:px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-3 sm:gap-4">
          {showBackButton ? (
            <button onClick={onBack} className="p-2 -ml-1 sm:-ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
              <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
            </button>
          ) : (
            <div className="w-2" />
          )}
          <span className="text-xl font-headline font-black text-foreground tracking-tight">{i18nT('screens.growth')}</span>
        </div>
        <button onClick={() => openAddModal()} className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 sm:pt-24 px-3 sm:px-6 pb-24 sm:pb-28">
        <div className="max-w-md mx-auto w-full space-y-8">
           <div className="bg-surface-gray dark:bg-zinc-900 border border-border-gray dark:border-zinc-800 rounded-[2.5rem] p-1.5 flex gap-1 shadow-inner">
             {(['Weight', 'Height', 'Head'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase() as any)}
                  className={`flex-1 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all ${
                    activeTab === tab.toLowerCase()
                      ? 'bg-surface text-foreground shadow-md'
                      : 'text-text-light hover:text-text-dim'
                  }`}
                >
                  {tab}
                </button>
              ))}
           </div>

           <div className="flex justify-end px-2">
             <div className="bg-surface-gray dark:bg-zinc-800 p-1 rounded-[1.5rem] flex gap-1 shadow-inner">
               <button onClick={() => setUseImperial(false)} className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${!isImperial ? 'bg-secondary text-white shadow-xl' : 'text-text-light'}`}>Metric</button>
               <button onClick={() => setUseImperial(true)} className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${isImperial ? 'bg-secondary text-white shadow-xl' : 'text-text-light'}`}>Imperial</button>
             </div>
           </div>

           <div className="card-onboarding bg-surface overflow-hidden relative">
             <div className="flex justify-between items-start mb-8">
               <div>
                 <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mb-2 text-left">Current {activeTab}</p>
                 <div className="flex items-baseline gap-2">
                   <h2 className="text-5xl font-headline font-black text-foreground tracking-tighter">
                     {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue}
                   </h2>
                   <span className="text-xl font-black text-text-light lowercase">{activeTab === 'weight' ? weightUnit : lengthUnit}</span>
                 </div>
               </div>
               <div className="bg-secondary/10 dark:bg-zinc-800 text-secondary px-6 py-4 rounded-[2rem] text-center shadow-inner">
                  <p className="text-[11px] font-black uppercase tracking-widest leading-none">{currentPercentile}</p>
                  <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mt-1">Percentile</p>
               </div>
             </div>

             <div className="relative">
               <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-48 drop-shadow-sm">
                 <path d={buildPath('p97')} fill="none" stroke="currentColor" className="text-border-gray/30 dark:text-zinc-700/30" strokeWidth="1" strokeDasharray="4 3" />
                 <path d={buildPath('p50')} fill="none" stroke="currentColor" className="text-secondary/20" strokeWidth="2" strokeDasharray="6 4" />
                 <path d={buildPath('p3')} fill="none" stroke="currentColor" className="text-border-gray/30 dark:text-zinc-700/30" strokeWidth="1" strokeDasharray="4 3" />

                 {babyPath && (
                   <motion.path
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 1.5 }}
                     d={babyPath}
                     fill="none"
                     stroke="currentColor"
                     className="text-secondary"
                     strokeWidth="3"
                     strokeLinecap="round"
                   />
                 )}

                 {babyPoints.map((p, i) => (
                   <circle
                     key={i}
                     cx={scaleX(p.age)}
                     cy={scaleY(p.val)}
                     r={selectedPoint?.id === p.measurement.id ? 7 : 5}
                     fill="var(--bg-surface)"
                     stroke="currentColor"
                     className="text-secondary cursor-pointer"
                     strokeWidth="2.5"
                     onClick={() => setSelectedPoint(selectedPoint?.id === p.measurement.id ? null : p.measurement)}
                   />
                 ))}
               </svg>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-gray dark:bg-zinc-900/30 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-inner">
                 <div className="w-12 h-12 bg-secondary/10 dark:bg-zinc-800 text-secondary rounded-2xl flex items-center justify-center mb-6">
                   <TrendingUp size={22} />
                 </div>
                 <h4 className="text-lg font-headline font-black text-foreground leading-tight mb-2">Track</h4>
                 <p className="text-[11px] font-bold text-text-dim leading-relaxed">{currentPercentile} percentile.</p>
              </div>
              <div className="bg-surface-gray dark:bg-zinc-900/30 p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 shadow-inner">
                 <div className="w-12 h-12 bg-secondary/10 dark:bg-zinc-800 text-secondary rounded-2xl flex items-center justify-center mb-6">
                   <Award size={22} />
                 </div>
                 <h4 className="text-lg font-headline font-black text-foreground leading-tight mb-2">{measurements.length} Logged</h4>
                 <p className="text-[11px] font-bold text-text-dim leading-relaxed">Total growth records.</p>
              </div>
           </div>

           <div className="space-y-6 pt-4">
              <h2 className="text-xl font-headline font-black text-foreground tracking-tighter">History</h2>
              <div className="space-y-4">
                 {[...measurements].reverse().map((m) => {
                    const val = activeTab === 'weight' ? m.weight : activeTab === 'height' ? m.height : m.headCircumference;
                    const displayVal = val !== undefined && isImperial
                       ? (activeTab === 'weight' ? convertWeight(val, 'metric', 'imperial') : convertLength(val, 'metric', 'imperial'))
                       : val;
                    if (displayVal === undefined) return null;
                    const age = currentBaby?.dateOfBirth ? getAgeInMonths(currentBaby.dateOfBirth, m.date) : 0;
                    return (
                       <div key={m.id} className="group bg-surface rounded-[2.5rem] p-6 shadow-sm border border-border-gray dark:border-zinc-800 flex items-center justify-between transition-all hover:shadow-xl">
                          <div className="flex items-center gap-5">
                             <div className="w-14 h-14 bg-surface-gray dark:bg-zinc-800 text-text-light rounded-2xl flex items-center justify-center shadow-inner">
                               {activeTab === 'weight' ? <Scale size={20} /> : activeTab === 'height' ? <Ruler size={20} /> : <BrainCircuit size={20} />}
                             </div>
                             <div>
                                <p className="text-lg font-headline font-black text-foreground leading-tight">{age}m</p>
                                <p className="text-[10px] font-black text-text-light uppercase tracking-widest mt-1">{new Date(m.date).toLocaleDateString()}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <p className="text-xl font-headline font-black text-foreground tracking-tighter">{displayVal.toFixed(1)}{activeTab === 'weight' ? weightUnit : lengthUnit}</p>
                             <div className="flex gap-2">
                                <button onClick={() => openAddModal(m)} className="p-2 text-text-light hover:text-secondary"><Check size={16} /></button>
                                <button onClick={() => handleDelete(m.id)} className="p-2 text-text-light hover:text-error"><X size={16} /></button>
                             </div>
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddModal && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end justify-center p-4">
            <MotionDiv initial={{ y: 100 }} animate={{ y: 0 }} className="w-full max-w-md bg-surface rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-headline font-black text-foreground tracking-tighter">{editingMeasurement ? 'Update' : 'Log'}</h3>
                <button onClick={() => setShowAddModal(false)} className="w-12 h-12 rounded-full bg-surface-gray flex items-center justify-center text-text-light"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-4 block mb-2">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-onboarding" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-2">Weight</label>
                    <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="input-onboarding text-center" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-2">Height</label>
                    <input type="number" step="0.1" value={newHeight} onChange={e => setNewHeight(e.target.value)} className="input-onboarding text-center" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest block mb-2">Head</label>
                    <input type="number" step="0.1" value={newHead} onChange={e => setNewHead(e.target.value)} className="input-onboarding text-center" />
                  </div>
                </div>
              </div>

              <button onClick={handleSave} className="btn-primary"><Check size={28} /><span>Confirm</span></button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};
