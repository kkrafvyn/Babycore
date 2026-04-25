import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, Droplets, Utensils, Activity, Heart, Thermometer, Camera, Sparkles } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface TimelineEvent {
  id: string;
  time: Date;
  type: 'sleep' | 'feed' | 'diaper' | 'health' | 'memory' | 'milestone';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface DailyTimelineProps {
  onBack: () => void;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ onBack }) => {
  const { currentBaby, feedLogs, sleepLogs, diaperLogs, healthLogs, memories } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateStr = selectedDate.toDateString();

  const events = useMemo<TimelineEvent[]>(() => {
    if (!currentBaby) return [];
    const items: TimelineEvent[] = [];

    // Sleep logs
    sleepLogs
      .filter(l => new Date(l.startTime).toDateString() === dateStr)
      .forEach(l => {
        const dur = l.duration;
        const h = Math.floor(dur / 60);
        const m = dur % 60;
        items.push({
          id: l.id,
          time: new Date(l.startTime),
          type: 'sleep',
          title: 'Sleep Session',
          subtitle: `${h > 0 ? h + 'h ' : ''}${m}m`,
          icon: <Moon size={18} fill="currentColor" />,
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
        });
      });

    // Feed logs
    feedLogs
      .filter(l => new Date(l.timestamp).toDateString() === dateStr)
      .forEach(l => {
        const sub = l.type === 'breast' ? `${l.duration || 0} min nursing` :
                    l.type === 'bottle' ? `${l.bottleAmount || '?'}ml bottle` :
                    l.solidDescription || 'Solids';
        items.push({
          id: l.id,
          time: new Date(l.timestamp),
          type: 'feed',
          title: `${l.type.charAt(0).toUpperCase() + l.type.slice(1)} Feed`,
          subtitle: sub,
          icon: <Utensils size={18} />,
          color: 'text-rose-500',
          bgColor: 'bg-rose-50 dark:bg-rose-900/20',
        });
      });

    // Diaper logs
    diaperLogs
      .filter(l => new Date(l.timestamp).toDateString() === dateStr)
      .forEach(l => {
        items.push({
          id: l.id,
          time: new Date(l.timestamp),
          type: 'diaper',
          title: 'Diaper Change',
          subtitle: l.type.charAt(0).toUpperCase() + l.type.slice(1),
          icon: <Droplets size={18} fill="currentColor" />,
          color: 'text-sky-500',
          bgColor: 'bg-sky-50 dark:bg-sky-900/20',
        });
      });

    // Health logs
    healthLogs
      .filter(l => new Date(l.timestamp).toDateString() === dateStr)
      .forEach(l => {
        items.push({
          id: l.id,
          time: new Date(l.timestamp),
          type: 'health',
          title: l.type === 'temperature' ? 'Temperature' : 'Medication',
          subtitle: l.type === 'temperature' ? `${l.value}${l.unit}` : `${l.name} ${l.dose || ''}`,
          icon: <Thermometer size={18} />,
          color: 'text-amber-500',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        });
      });

    // Memories
    memories
      .filter(l => new Date(l.timestamp).toDateString() === dateStr)
      .forEach(l => {
        items.push({
          id: l.id,
          time: new Date(l.timestamp),
          type: 'memory',
          title: l.isMilestone ? 'Milestone Memory' : 'Memory',
          subtitle: l.text.slice(0, 60),
          icon: l.isMilestone ? <Sparkles size={18} /> : <Camera size={18} />,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        });
      });

    return items.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [currentBaby, feedLogs, sleepLogs, diaperLogs, healthLogs, memories, dateStr]);

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Group events by hour
  const hourGroups = useMemo(() => {
    const groups: Record<number, TimelineEvent[]> = {};
    events.forEach(e => {
      const h = e.time.getHours();
      if (!groups[h]) groups[h] = [];
      groups[h].push(e);
    });
    return groups;
  }, [events]);

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Daily Timeline</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-surface rounded-[2.5rem] p-4 px-6 shadow-sm border border-border-gray dark:border-zinc-800">
            <button onClick={() => navigateDate(-1)} className="w-10 h-10 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center text-text-dim hover:scale-110 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="text-[9px] font-black text-text-light uppercase tracking-widest">
                {isToday ? 'TODAY' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
              </p>
              <p className="text-lg font-headline font-black text-foreground tracking-tight">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button 
              onClick={() => navigateDate(1)} 
              disabled={isToday}
              className="w-10 h-10 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center text-text-dim hover:scale-110 transition-all disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Feeds', count: events.filter(e => e.type === 'feed').length, color: 'text-rose-500' },
              { label: 'Sleeps', count: events.filter(e => e.type === 'sleep').length, color: 'text-indigo-500' },
              { label: 'Diapers', count: events.filter(e => e.type === 'diaper').length, color: 'text-sky-500' },
              { label: 'Other', count: events.filter(e => !['feed','sleep','diaper'].includes(e.type)).length, color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="bg-surface-gray dark:bg-zinc-900/30 rounded-[2rem] p-4 text-center border border-border-gray dark:border-zinc-800">
                <p className={`text-2xl font-headline font-black ${s.color}`}>{s.count}</p>
                <p className="text-[8px] font-black text-text-light uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          {events.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-surface-gray dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-text-light border border-dashed border-border-gray">
                <Activity size={32} />
              </div>
              <h3 className="text-xl font-headline font-black text-foreground mb-2">No Events</h3>
              <p className="text-sm text-text-dim">Nothing recorded for this day yet.</p>
            </div>
          ) : (
            <div className="relative space-y-1">
              {/* Vertical line */}
              <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border-gray dark:bg-zinc-800" />
              
              {Object.entries(hourGroups).sort(([a],[b]) => Number(a) - Number(b)).map(([hour, hourEvents]) => (
                <div key={hour} className="space-y-1">
                  <div className="flex items-center gap-4 py-2">
                    <span className="w-[54px] text-right text-[10px] font-black text-text-light uppercase tracking-widest">
                      {Number(hour) === 0 ? '12 AM' : Number(hour) < 12 ? `${hour} AM` : Number(hour) === 12 ? '12 PM' : `${Number(hour)-12} PM`}
                    </span>
                    <div className="h-px flex-1 bg-border-gray dark:bg-zinc-800 opacity-50" />
                  </div>
                  
                  {hourEvents.map((event, idx) => (
                    <MotionDiv
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-4 pl-[14px] py-1"
                    >
                      <div className={`w-7 h-7 rounded-full ${event.bgColor} ${event.color} flex items-center justify-center shrink-0 z-10 ring-4 ring-background`}>
                        {event.icon}
                      </div>
                      <div className="flex-1 bg-surface rounded-[1.5rem] p-5 shadow-sm border border-border-gray dark:border-zinc-800 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-headline font-black text-foreground leading-tight">{event.title}</p>
                            <p className="text-[11px] font-bold text-text-dim mt-1">{event.subtitle}</p>
                          </div>
                          <span className="text-[10px] font-black text-text-light">
                            {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
