import React, { useMemo } from 'react';
import { ChevronLeft, Scale, Ruler, Brain, Heart, ArrowRight } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface MultiBabyComparisonProps {
  onBack: () => void;
}

export const MultiBabyComparison: React.FC<MultiBabyComparisonProps> = ({ onBack }) => {
  const { babies = [], growthMeasurements, milestones, feedLogs, sleepLogs } = useAppContext();

  // Sort babies by age (oldest first)
  const sortedBabies = useMemo(() => {
    return [...babies].sort((a, b) => new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime());
  }, [babies]);

  if (sortedBabies.length < 2) {
    return (
      <div className="fit-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-surface-gray dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center text-text-dim mb-6">
          <Scale size={32} />
        </div>
        <h2 className="text-2xl font-headline font-black text-foreground mb-2">Compare Siblings</h2>
        <p className="text-sm text-text-dim max-w-sm">You need at least two babies added to your account to use the comparison view. Add another baby from the settings menu.</p>
        <button onClick={onBack} className="mt-8 px-6 py-3 bg-secondary text-white rounded-full font-bold text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const [baby1, baby2] = sortedBabies;

  // Comparison Logic - comparing them AT THE SAME AGE (e.g. at 6 months)
  // For simplicity here, we just compare their latest known stats or age achievements
  
  const getStats = (babyId: string) => {
    const bHeight = [...growthMeasurements].filter(g => g.babyId === babyId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.height || '-';
    const bWeight = [...growthMeasurements].filter(g => g.babyId === babyId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.weight || '-';
    const bMilestones = milestones.filter(m => m.babyId === babyId).length;
    
    return { height: bHeight, weight: bWeight, milestones: bMilestones };
  };

  const stats1 = getStats(baby1.id);
  const stats2 = getStats(baby2.id);

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Sibling Compare</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
          
          <div className="flex justify-between items-center pb-6 border-b border-border-gray dark:border-zinc-800">
             <div className="text-center flex-1">
               <div className="w-16 h-16 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 mx-auto flex items-center justify-center font-black text-2xl mb-3 shadow-inner">
                 {baby1.name[0]}
               </div>
               <h3 className="text-lg font-headline font-black text-foreground truncate px-2">{baby1.name}</h3>
             </div>
             
             <div className="px-4 text-border-gray dark:text-zinc-700">
               <Scale size={24} />
             </div>
             
             <div className="text-center flex-1">
               <div className="w-16 h-16 rounded-[2rem] bg-rose-50 dark:bg-rose-900/20 text-rose-500 mx-auto flex items-center justify-center font-black text-2xl mb-3 shadow-inner">
                 {baby2.name[0]}
               </div>
               <h3 className="text-lg font-headline font-black text-foreground truncate px-2">{baby2.name}</h3>
             </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-text-light px-2">Latest Measurements</h4>
             
             <MotionDiv initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="bg-surface rounded-[2.5rem] p-6 border border-border-gray dark:border-zinc-800 flex justify-between items-center text-center shadow-sm">
                <div className="flex-1 text-indigo-500 font-headline font-black text-xl">{stats1.weight} kg</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-text-dim flex flex-col items-center gap-1">
                   <TargetIcon /> Weight
                </div>
                <div className="flex-1 text-rose-500 font-headline font-black text-xl">{stats2.weight} kg</div>
             </MotionDiv>

             <MotionDiv initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="bg-surface rounded-[2.5rem] p-6 border border-border-gray dark:border-zinc-800 flex justify-between items-center text-center shadow-sm">
                <div className="flex-1 text-indigo-500 font-headline font-black text-xl">{stats1.height} cm</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-text-dim flex flex-col items-center gap-1">
                   <Ruler size={16} /> Height
                </div>
                <div className="flex-1 text-rose-500 font-headline font-black text-xl">{stats2.height} cm</div>
             </MotionDiv>

             <MotionDiv initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.3}} className="bg-surface rounded-[2.5rem] p-6 border border-border-gray dark:border-zinc-800 flex justify-between items-center text-center shadow-sm">
                <div className="flex-1 text-indigo-500 font-headline font-black text-xl">{stats1.milestones}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-text-dim flex flex-col items-center gap-1">
                   <Brain size={16} /> Milestones
                </div>
                <div className="flex-1 text-rose-500 font-headline font-black text-xl">{stats2.milestones}</div>
             </MotionDiv>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300">
             <p className="text-xs font-bold leading-relaxed text-center">
               Every child develops at their own unique pace. This view is for fun memories, not medical comparison! ❤️
             </p>
          </div>

        </div>
      </main>
    </div>
  );
};

// Dumb Target icon rendering function
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
