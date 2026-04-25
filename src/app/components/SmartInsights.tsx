import React, { useMemo } from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Moon, Droplets, Utensils, Activity, Zap, Brain, BarChart3 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { formatDuration } from '../../lib/baby-utils';

const MotionDiv = motion.div as any;

interface SmartInsightsProps {
  onBack: () => void;
}

interface Insight {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  change?: { direction: 'up' | 'down' | 'same'; text: string };
  detail: string;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ onBack }) => {
  const { currentBaby, feedLogs, sleepLogs, diaperLogs } = useAppContext();

  const insights = useMemo<Insight[]>(() => {
    if (!currentBaby) return [];
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // This week vs last week
    const thisWeekSleeps = sleepLogs.filter(l => new Date(l.startTime) >= weekAgo);
    const lastWeekSleeps = sleepLogs.filter(l => { const d = new Date(l.startTime); return d >= twoWeeksAgo && d < weekAgo; });
    const thisWeekSleepTotal = thisWeekSleeps.reduce((s, l) => s + l.duration, 0);
    const lastWeekSleepTotal = lastWeekSleeps.reduce((s, l) => s + l.duration, 0);
    const sleepChange = lastWeekSleepTotal > 0 ? Math.round(((thisWeekSleepTotal - lastWeekSleepTotal) / lastWeekSleepTotal) * 100) : 0;

    const thisWeekFeeds = feedLogs.filter(l => new Date(l.timestamp) >= weekAgo);
    const lastWeekFeeds = feedLogs.filter(l => { const d = new Date(l.timestamp); return d >= twoWeeksAgo && d < weekAgo; });

    const thisWeekDiapers = diaperLogs.filter(l => new Date(l.timestamp) >= weekAgo);
    const lastWeekDiapers = diaperLogs.filter(l => { const d = new Date(l.timestamp); return d >= twoWeeksAgo && d < weekAgo; });

    const todaySleepMin = sleepLogs.filter(l => new Date(l.startTime).toDateString() === today).reduce((s, l) => s + l.duration, 0);
    const todayFeeds = feedLogs.filter(l => new Date(l.timestamp).toDateString() === today).length;
    const todayDiapers = diaperLogs.filter(l => new Date(l.timestamp).toDateString() === today).length;

    // Average daily feeds this week
    const avgDailyFeeds = thisWeekFeeds.length > 0 ? (thisWeekFeeds.length / 7).toFixed(1) : '0';
    const avgDailyFeedsLast = lastWeekFeeds.length > 0 ? (lastWeekFeeds.length / 7).toFixed(1) : '0';

    // Feeding pattern - most common time
    const feedHours = thisWeekFeeds.map(f => new Date(f.timestamp).getHours());
    const hourCounts: Record<number, number> = {};
    feedHours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
    const peakHour = Object.entries(hourCounts).sort(([,a],[,b]) => b - a)[0];
    const peakHourLabel = peakHour ? `${Number(peakHour[0]) === 0 ? 12 : Number(peakHour[0]) > 12 ? Number(peakHour[0])-12 : peakHour[0]}${Number(peakHour[0]) >= 12 ? 'PM' : 'AM'}` : 'N/A';

    // Longest sleep stretch
    const longestSleep = thisWeekSleeps.reduce((max, l) => l.duration > max ? l.duration : max, 0);

    // Age in days
    const ageDays = Math.floor((now.getTime() - new Date(currentBaby.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24));
    const ageWeeks = Math.floor(ageDays / 7);

    const result: Insight[] = [
      {
        id: 'today-summary',
        icon: <Zap size={20} />,
        iconBg: 'bg-amber-50 dark:bg-amber-900/20',
        iconColor: 'text-amber-500',
        title: 'Today So Far',
        value: `${todayFeeds} feeds · ${formatDuration(todaySleepMin)} sleep`,
        detail: `${todayDiapers} diaper changes recorded today.`,
      },
      {
        id: 'weekly-sleep',
        icon: <Moon size={20} fill="currentColor" />,
        iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
        iconColor: 'text-indigo-500',
        title: 'Weekly Sleep',
        value: formatDuration(Math.round(thisWeekSleepTotal / 7)) + '/day avg',
        change: sleepChange !== 0 ? {
          direction: sleepChange > 0 ? 'up' : 'down',
          text: `${Math.abs(sleepChange)}% vs last week`,
        } : { direction: 'same', text: 'Same as last week' },
        detail: longestSleep > 0 ? `Longest stretch: ${formatDuration(longestSleep)}` : 'No sleep data yet',
      },
      {
        id: 'feeding-pattern',
        icon: <Utensils size={20} />,
        iconBg: 'bg-rose-50 dark:bg-rose-900/20',
        iconColor: 'text-rose-500',
        title: 'Feeding Pattern',
        value: `${avgDailyFeeds} feeds/day`,
        change: parseFloat(avgDailyFeeds) !== parseFloat(avgDailyFeedsLast) ? {
          direction: parseFloat(avgDailyFeeds) > parseFloat(avgDailyFeedsLast) ? 'up' : 'down',
          text: `Was ${avgDailyFeedsLast}/day last week`,
        } : undefined,
        detail: `Peak feeding hour: ${peakHourLabel}`,
      },
      {
        id: 'diaper-trend',
        icon: <Droplets size={20} fill="currentColor" />,
        iconBg: 'bg-sky-50 dark:bg-sky-900/20',
        iconColor: 'text-sky-500',
        title: 'Diaper Trend',
        value: `${thisWeekDiapers.length} this week`,
        change: thisWeekDiapers.length !== lastWeekDiapers.length ? {
          direction: thisWeekDiapers.length > lastWeekDiapers.length ? 'up' : 'down',
          text: `${Math.abs(thisWeekDiapers.length - lastWeekDiapers.length)} ${thisWeekDiapers.length > lastWeekDiapers.length ? 'more' : 'fewer'} than last week`,
        } : { direction: 'same', text: 'Same as last week' },
        detail: `Wet: ${thisWeekDiapers.filter(d => d.type === 'wet' || d.type === 'both').length} · Dirty: ${thisWeekDiapers.filter(d => d.type === 'dirty' || d.type === 'both').length}`,
      },
      {
        id: 'age-info',
        icon: <Brain size={20} />,
        iconBg: 'bg-purple-50 dark:bg-purple-900/20',
        iconColor: 'text-purple-500',
        title: 'Baby Age',
        value: ageWeeks < 8 ? `${ageDays} days old` : `${ageWeeks} weeks old`,
        detail: `Born ${new Date(currentBaby.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      },
    ];

    return result;
  }, [currentBaby, feedLogs, sleepLogs, diaperLogs]);

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex items-center gap-4 border-b border-border-gray dark:border-zinc-800/50">
        <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xl font-headline font-black text-foreground tracking-tight">Smart Insights</span>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <BarChart3 size={14} />
              AI-Powered Analysis
            </div>
            <h2 className="text-2xl font-headline font-black text-foreground tracking-tight">
              {currentBaby?.name}'s Week
            </h2>
          </div>

          {insights.map((ins, idx) => (
            <MotionDiv
              key={ins.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-surface rounded-[2.5rem] p-8 shadow-sm border border-border-gray dark:border-zinc-800 transition-all hover:shadow-xl"
            >
              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 ${ins.iconBg} ${ins.iconColor} rounded-2xl flex items-center justify-center shadow-inner shrink-0`}>
                  {ins.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1">{ins.title}</p>
                  <p className="text-xl font-headline font-black text-foreground tracking-tight">{ins.value}</p>
                  {ins.change && (
                    <div className={`flex items-center gap-1 mt-2 text-[11px] font-black ${
                      ins.change.direction === 'up' ? 'text-emerald-500' :
                      ins.change.direction === 'down' ? 'text-rose-500' : 'text-text-dim'
                    }`}>
                      {ins.change.direction === 'up' ? <TrendingUp size={14} /> : 
                       ins.change.direction === 'down' ? <TrendingDown size={14} /> : 
                       <Minus size={14} />}
                      {ins.change.text}
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-text-dim mt-2">{ins.detail}</p>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      </main>
    </div>
  );
};
