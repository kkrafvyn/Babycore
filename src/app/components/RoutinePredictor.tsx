import React, { useMemo } from 'react';
import { ChevronLeft, Clock, Utensils, Moon, Droplets, AlertCircle } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface RoutinePredictorProps {
  onBack: () => void;
}

interface Prediction {
  type: 'feed' | 'sleep' | 'diaper';
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  nextTime: Date | null;
  avgInterval: number; // minutes
  lastTime: Date | null;
  confidence: 'high' | 'medium' | 'low';
}

export const RoutinePredictor: React.FC<RoutinePredictorProps> = ({ onBack }) => {
  const { currentBaby, feedLogs, sleepLogs, diaperLogs } = useAppContext();

  const predictions = useMemo<Prediction[]>(() => {
    if (!currentBaby) return [];
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

    // Calculate average intervals from last 7 days
    const calcAvgInterval = (timestamps: Date[]): number => {
      if (timestamps.length < 2) return 0;
      const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
      let totalGap = 0;
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const gap = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60);
        if (gap < 1440) { // ignore gaps > 24h
          totalGap += gap;
          count++;
        }
      }
      return count > 0 ? Math.round(totalGap / count) : 0;
    };

    // Feed prediction
    const recentFeeds = feedLogs
      .filter(l => new Date(l.timestamp) >= weekAgo)
      .map(l => new Date(l.timestamp));
    const feedInterval = calcAvgInterval(recentFeeds);
    const lastFeed = recentFeeds.length > 0 ? new Date(Math.max(...recentFeeds.map(d => d.getTime()))) : null;
    const nextFeed = lastFeed && feedInterval > 0 ? new Date(lastFeed.getTime() + feedInterval * 60 * 1000) : null;

    // Sleep prediction
    const recentSleeps = sleepLogs
      .filter(l => new Date(l.startTime) >= weekAgo)
      .map(l => new Date(l.startTime));
    const sleepInterval = calcAvgInterval(recentSleeps);
    const lastSleep = recentSleeps.length > 0 ? new Date(Math.max(...recentSleeps.map(d => d.getTime()))) : null;
    const nextSleep = lastSleep && sleepInterval > 0 ? new Date(lastSleep.getTime() + sleepInterval * 60 * 1000) : null;

    // Diaper prediction
    const recentDiapers = diaperLogs
      .filter(l => new Date(l.timestamp) >= weekAgo)
      .map(l => new Date(l.timestamp));
    const diaperInterval = calcAvgInterval(recentDiapers);
    const lastDiaper = recentDiapers.length > 0 ? new Date(Math.max(...recentDiapers.map(d => d.getTime()))) : null;
    const nextDiaper = lastDiaper && diaperInterval > 0 ? new Date(lastDiaper.getTime() + diaperInterval * 60 * 1000) : null;

    const getConfidence = (count: number): 'high' | 'medium' | 'low' => {
      if (count >= 20) return 'high';
      if (count >= 8) return 'medium';
      return 'low';
    };

    return [
      {
        type: 'feed', label: 'Next Feed', icon: <Utensils size={24} />,
        color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20',
        nextTime: nextFeed, avgInterval: feedInterval, lastTime: lastFeed,
        confidence: getConfidence(recentFeeds.length),
      },
      {
        type: 'sleep', label: 'Next Sleep', icon: <Moon size={24} fill="currentColor" />,
        color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        nextTime: nextSleep, avgInterval: sleepInterval, lastTime: lastSleep,
        confidence: getConfidence(recentSleeps.length),
      },
      {
        type: 'diaper', label: 'Next Diaper', icon: <Droplets size={24} fill="currentColor" />,
        color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-900/20',
        nextTime: nextDiaper, avgInterval: diaperInterval, lastTime: lastDiaper,
        confidence: getConfidence(recentDiapers.length),
      },
    ];
  }, [currentBaby, feedLogs, sleepLogs, diaperLogs]);

  const formatCountdown = (target: Date): string => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return 'Due now!';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `in ${hrs}h ${remMins}m`;
  };

  const formatMins = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const isPastDue = (d: Date) => d.getTime() <= Date.now();

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex items-center gap-4 border-b border-border-gray dark:border-zinc-800/50">
        <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xl font-headline font-black text-foreground tracking-tight">Routine Predictor</span>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Clock size={14} />
              Based on 7-Day Patterns
            </div>
          </div>

          {predictions.map((pred, idx) => (
            <MotionDiv
              key={pred.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className="bg-surface rounded-[3rem] p-8 shadow-sm border border-border-gray dark:border-zinc-800 transition-all hover:shadow-xl"
            >
              <div className="flex items-start gap-6">
                <div className={`w-16 h-16 ${pred.bgColor} ${pred.color} rounded-[1.5rem] flex items-center justify-center shadow-inner shrink-0`}>
                  {pred.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1">{pred.label}</p>
                  {pred.nextTime ? (
                    <>
                      <p className={`text-3xl font-headline font-black tracking-tight ${isPastDue(pred.nextTime) ? 'text-rose-500' : 'text-foreground'}`}>
                        {formatCountdown(pred.nextTime)}
                      </p>
                      {isPastDue(pred.nextTime) && (
                        <div className="flex items-center gap-1 mt-2 text-[11px] font-black text-rose-500">
                          <AlertCircle size={12} />
                          Past due — baby might need attention
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-text-dim mt-2">
                        Estimated: {pred.nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-headline font-black text-text-dim">Not enough data</p>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-6 pt-6 border-t border-border-gray dark:border-zinc-800">
                <div className="flex-1 text-center">
                  <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Avg Interval</p>
                  <p className="text-sm font-headline font-black text-foreground">{pred.avgInterval > 0 ? formatMins(pred.avgInterval) : '—'}</p>
                </div>
                <div className="w-px bg-border-gray dark:bg-zinc-800" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Last Event</p>
                  <p className="text-sm font-headline font-black text-foreground">
                    {pred.lastTime ? pred.lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div className="w-px bg-border-gray dark:bg-zinc-800" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">Confidence</p>
                  <p className={`text-sm font-headline font-black ${
                    pred.confidence === 'high' ? 'text-emerald-500' : pred.confidence === 'medium' ? 'text-amber-500' : 'text-text-dim'
                  }`}>
                    {pred.confidence.charAt(0).toUpperCase() + pred.confidence.slice(1)}
                  </p>
                </div>
              </div>
            </MotionDiv>
          ))}

          <div className="bg-surface-gray dark:bg-zinc-900/30 rounded-[2.5rem] p-6 text-center border border-border-gray dark:border-zinc-800">
            <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">
              Predictions improve with more logged data. Keep tracking!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
