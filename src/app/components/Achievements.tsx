import React, { useMemo } from 'react';
import { ChevronLeft, Trophy, Star, Target, Zap, Shield, Crown, Heart, Moon } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface AchievementsProps {
  onBack: () => void;
}

// In a real app, these definitions would be matched against the user's unlocked achievements from DB
const ALL_ACHIEVEMENTS = [
  { id: 'first_log', title: 'First Steps', description: 'Logged your very first event.', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'diaper_100', title: 'Diaper Master', description: 'Logged 100 diaper changes. Wow.', icon: Shield, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { id: 'feed_500', title: 'Nourisher', description: 'Recorded 500 feeding sessions.', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'streak_7', title: 'Consistency', description: 'Logged an event 7 days in a row.', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'sleep_100h', title: 'Dream Weaver', description: 'Tracked over 100 hours of sleep.', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'milestone_5', title: 'Growing Up', description: 'Checked off 5 developmental milestones.', icon: Star, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
];

export const Achievements: React.FC<AchievementsProps> = ({ onBack }) => {
  const { feedLogs, diaperLogs, sleepLogs } = useAppContext();

  // Simple dynamic unlock logic based on local data (for demo purposes)
  const unlockedIds = useMemo(() => {
    const unlocked = new Set<string>();
    
    if (feedLogs.length > 0 || diaperLogs.length > 0 || sleepLogs.length > 0) unlocked.add('first_log');
    if (diaperLogs.length >= 100) unlocked.add('diaper_100');
    if (feedLogs.length >= 500) unlocked.add('feed_500');
    
    const totalSleepHrs = sleepLogs.reduce((s, l) => s + l.duration, 0) / 60;
    if (totalSleepHrs >= 100) unlocked.add('sleep_100h');
    
    // Hardcode streak and milestone for demo unless complex logic is added
    unlocked.add('streak_7'); 
    
    return unlocked;
  }, [feedLogs, diaperLogs, sleepLogs]);

  const stats = useMemo(() => {
    return [
      { label: 'Total Logs', value: feedLogs.length + diaperLogs.length + sleepLogs.length },
      { label: 'Achievements', value: unlockedIds.size },
      { label: 'Current Streak', value: '12 Days' }, // Mocked
    ];
  }, [feedLogs, diaperLogs, sleepLogs, unlockedIds]);


  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Parenting Streaks</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
          
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 mb-6 border-4 border-white dark:border-zinc-900">
               <Trophy size={48} className="text-amber-700" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tight mb-2">
              Hall of Fame
            </h2>
            <p className="text-sm font-bold text-text-dim">
              Parenting is hard. You're doing great.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
             {stats.map(s => (
                <div key={s.label} className="bg-surface rounded-2xl p-4 text-center border border-border-gray dark:border-zinc-800 shadow-sm">
                   <p className="text-xl font-headline font-black text-secondary">{s.value}</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-light mt-1">{s.label}</p>
                </div>
             ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-text-dim uppercase tracking-widest px-2 mb-2">Unlocked Badges</h3>
            <div className="grid gap-4">
              {ALL_ACHIEVEMENTS.map((badge, i) => {
                const isUnlocked = unlockedIds.has(badge.id);
                return (
                  <MotionDiv
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center gap-5 p-5 rounded-[2rem] border transition-all ${
                      isUnlocked 
                      ? 'bg-surface border-border-gray dark:border-zinc-800 shadow-sm' 
                      : 'bg-background border-dashed border-border-gray dark:border-zinc-800 opacity-60 grayscale'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isUnlocked ? badge.bg : 'bg-surface-gray dark:bg-zinc-900'} ${isUnlocked ? badge.color : 'text-text-dim'}`}>
                      <badge.icon size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-lg font-headline font-black text-foreground">{badge.title}</p>
                        {isUnlocked && <Crown size={14} className="text-amber-500" />}
                      </div>
                      <p className="text-[11px] font-bold text-text-dim leading-relaxed">{badge.description}</p>
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};
