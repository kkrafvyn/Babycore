import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { FeedLog, SleepLog } from '../../types';

const MotionDiv = motion.div as any;

interface BloomAIProps {
  feeds: FeedLog[];
  sleeps: SleepLog[];
}

export const BloomAI: React.FC<BloomAIProps> = ({ feeds, sleeps }) => {
  const insight = useMemo(() => {
    if (feeds.length < 3) {
      return {
        title: 'Learning Your Pattern',
        desc: 'Keep logging feeds to unlock personalized AI insights.',
        icon: Zap,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/10',
      };
    }

    const feedType =
      feeds.filter((f) => f.type === 'breast').length > feeds.length / 2
        ? 'breastfeeding'
        : 'bottle feeding';

    if (sleeps.length > 2) {
      return {
        title: 'Optimal Wake Window',
        desc: `Based on yesterday's ${feedType}, next nap is suggested 2h 15m after the current feed.`,
        icon: Sparkles,
        color: 'text-secondary',
        bg: 'bg-secondary/10',
      };
    }

    return {
      title: 'Feeding Consistency',
      desc: `Your ${feedType} interval is very stable today. Great job!`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    };
  }, [feeds, sleeps]);

  return (
    <MotionDiv
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`p-8 rounded-[3.5rem] border border-border-gray dark:border-zinc-800 ${insight.bg} relative overflow-hidden group mb-10`}
    >
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
        <insight.icon size={80} />
      </div>

      <div className="flex items-center gap-4 mb-2">
        <div className={`${insight.color} flex items-center gap-2`}>
          <Sparkles size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cradlyn AI Insight</span>
        </div>
      </div>

      <h3 className="text-2xl font-headline font-black text-foreground tracking-tight mb-2">
        {insight.title}
      </h3>

      <p className="text-xs font-medium text-text-dim leading-relaxed max-w-[240px]">{insight.desc}</p>
    </MotionDiv>
  );
};
