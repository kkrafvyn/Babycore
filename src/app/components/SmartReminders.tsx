import React, { useState } from 'react';
import { ChevronLeft, Bell, BellOff, Clock, Syringe, TrendingUp, Droplets, Utensils, Moon } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface SmartRemindersProps {
  onBack: () => void;
}

export const SmartReminders: React.FC<SmartRemindersProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  
  const [reminders, setReminders] = useState([
    { id: 'feed', enabled: true, title: 'Feeding Reminder', desc: 'Alert if 3.5h passes without a feed.', icon: Utensils, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'sleep', enabled: true, title: 'Nap/Sleep Warning', desc: 'Alert if awake window exceeds 2.5h.', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'diaper', enabled: false, title: 'Diaper Check', desc: 'Alert every 3h during the day.', icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { id: 'vax', enabled: true, title: 'Vaccination Due', desc: 'Push notification 3 days before due date.', icon: Syringe, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'growth', enabled: true, title: 'Growth Measurement', desc: 'Alert when a new monthly measurement is due.', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ]);

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    // Implementation would also request Notification permissions from the browser/OS here
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
       Notification.requestPermission();
    }
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Smart Reminders</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-surface-gray dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-secondary mb-4 border border-border-gray dark:border-zinc-800">
               <Bell size={28} className={reminders.some(r => r.enabled) ? 'animate-bounce' : ''} />
            </div>
            <h2 className="text-2xl font-headline font-black text-foreground tracking-tight">Contextual Alerts</h2>
            <p className="text-sm font-bold text-text-dim mt-2">
              Get notified based on {currentBaby?.name || 'baby'}'s personalized routines and schedule.
            </p>
          </div>

          <div className="space-y-4">
            {reminders.map((reminder, idx) => (
              <MotionDiv
                key={reminder.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-surface rounded-[2rem] p-5 border border-border-gray dark:border-zinc-800 shadow-sm flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 ${reminder.enabled ? reminder.bg : 'bg-surface-gray dark:bg-zinc-900'} ${reminder.enabled ? reminder.color : 'text-text-dim'}`}>
                  <reminder.icon size={20} />
                </div>
                <div className="flex-1 pr-2">
                  <p className="text-base font-headline font-black text-foreground">{reminder.title}</p>
                  <p className="text-[11px] font-bold text-text-dim leading-snug mt-0.5">{reminder.desc}</p>
                </div>
                <button
                  onClick={() => toggleReminder(reminder.id)}
                  className={`w-12 h-6 rounded-full flex items-center transition-all p-1 ${
                    reminder.enabled ? 'bg-secondary justify-end' : 'bg-border-gray dark:bg-zinc-700 justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </MotionDiv>
            ))}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex gap-3 text-blue-800 dark:text-blue-300">
             <Clock size={20} className="shrink-0 mt-0.5" />
             <p className="text-[11px] font-bold leading-relaxed">
               Routine alerts (feeding/sleep) adapt automatically as {currentBaby?.name || 'baby'} grows and patterns change in the Smart Insights dashboard.
             </p>
          </div>
        </div>
      </main>
    </div>
  );
};
