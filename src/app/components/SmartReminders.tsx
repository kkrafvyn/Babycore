import React, { useMemo, useState } from 'react';
import { ChevronLeft, Bell, Syringe, TrendingUp, Droplets, Utensils, Moon, RotateCw, Pill } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { getReminderPreferences, NotificationsManager } from '../../lib/notifications';

const MotionDiv = motion.div as any;

interface SmartRemindersProps {
  onBack: () => void;
}

export const SmartReminders: React.FC<SmartRemindersProps> = ({ onBack }) => {
  const { currentBaby, settings, updateSettings } = useAppContext();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const reminderPreferences = useMemo(() => getReminderPreferences(settings), [settings]);

  const reminders = useMemo(
    () => [
      {
        id: 'feeding',
        enabled: reminderPreferences.feeding,
        title: 'Feeding Reminder',
        desc: 'Alert if feeding interval passes without a feed.',
        icon: Utensils,
        color: 'text-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
      },
      {
        id: 'sleep',
        enabled: reminderPreferences.sleep,
        title: 'Nap/Sleep Warning',
        desc: 'Alert if awake window looks too long.',
        icon: Moon,
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      },
      {
        id: 'diaper',
        enabled: reminderPreferences.diaper,
        title: 'Diaper Check',
        desc: 'Alert when diaper checks are overdue.',
        icon: Droplets,
        color: 'text-sky-500',
        bg: 'bg-sky-50 dark:bg-sky-900/20',
      },
      {
        id: 'medication',
        enabled: reminderPreferences.medication,
        title: 'Medication Reminder',
        desc: 'Trigger at schedule time and retry missed doses.',
        icon: Pill,
        color: 'text-violet-500',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
      },
      {
        id: 'vaccine',
        enabled: reminderPreferences.vaccine,
        title: 'Vaccination Due',
        desc: 'Push notification 3 days before or after due date.',
        icon: Syringe,
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
      },
      {
        id: 'growth',
        enabled: reminderPreferences.growth,
        title: 'Growth Measurement',
        desc: 'Alert when a new monthly measurement is due.',
        icon: TrendingUp,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      },
    ],
    [reminderPreferences],
  );

  const toggleReminder = async (
    id: 'feeding' | 'sleep' | 'diaper' | 'medication' | 'vaccine' | 'growth',
  ) => {
    setSavingKey(id);
    const next = { ...reminderPreferences, [id]: !reminderPreferences[id] };
    await updateSettings({ reminderPreferences: next });
    if (next[id]) {
      await NotificationsManager.requestPermission();
    }
    setSavingKey(null);
  };

  const updateMetaPreference = async (
    key: 'retryMissed' | 'snoozeMinutes' | 'quietHoursEnabled',
    value: boolean | number,
  ) => {
    setSavingMeta(true);
    const next = {
      ...reminderPreferences,
      [key]: value,
    };
    await updateSettings({ reminderPreferences: next });
    setSavingMeta(false);
  };

  const updateQuietWindow = async (start?: string, end?: string) => {
    setSavingMeta(true);
    await updateSettings({
      ...(start ? { quietHoursStart: start } : {}),
      ...(end ? { quietHoursEnd: end } : {}),
    });
    setSavingMeta(false);
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
               <Bell size={28} className={reminders.some((r) => r.enabled) ? 'animate-bounce' : ''} />
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
                  onClick={() =>
                    toggleReminder(
                      reminder.id as
                        | 'feeding'
                        | 'sleep'
                        | 'diaper'
                        | 'medication'
                        | 'vaccine'
                        | 'growth',
                    )
                  }
                  disabled={savingKey === reminder.id}
                  className={`w-12 h-6 rounded-full flex items-center transition-all p-1 ${
                    reminder.enabled ? 'bg-secondary justify-end' : 'bg-border-gray dark:bg-zinc-700 justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </MotionDiv>
            ))}
          </div>

          <div className="bg-surface rounded-[2rem] p-5 border border-border-gray dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-headline font-black text-foreground">Retry Missed Alerts</p>
                <p className="text-[11px] font-bold text-text-dim mt-0.5">
                  Re-attempt delivery when a reminder is missed.
                </p>
              </div>
              <button
                onClick={() => updateMetaPreference('retryMissed', !reminderPreferences.retryMissed)}
                disabled={savingMeta}
                className={`w-12 h-6 rounded-full flex items-center transition-all p-1 ${
                  reminderPreferences.retryMissed
                    ? 'bg-secondary justify-end'
                    : 'bg-border-gray dark:bg-zinc-700 justify-start'
                }`}
              >
                <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-headline font-black text-foreground">Default Snooze Time</p>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 60].map((minutes) => {
                  const active = reminderPreferences.snoozeMinutes === minutes;
                  return (
                    <button
                      key={minutes}
                      onClick={() => updateMetaPreference('snoozeMinutes', minutes)}
                      disabled={savingMeta}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border ${
                        active
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-surface-gray dark:bg-zinc-900 text-text-light border-border-gray dark:border-zinc-700'
                      }`}
                    >
                      {minutes}m
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-headline font-black text-foreground">Quiet Hours</p>
                  <p className="text-[11px] font-bold text-text-dim mt-0.5">
                    Delay reminders overnight and deliver when quiet hours end.
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateMetaPreference('quietHoursEnabled', !reminderPreferences.quietHoursEnabled)
                  }
                  disabled={savingMeta}
                  className={`w-12 h-6 rounded-full flex items-center transition-all p-1 ${
                    reminderPreferences.quietHoursEnabled
                      ? 'bg-secondary justify-end'
                      : 'bg-border-gray dark:bg-zinc-700 justify-start'
                  }`}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-light">
                    Start
                  </label>
                  <input
                    type="time"
                    value={settings?.quietHoursStart || '22:00'}
                    onChange={(event) => updateQuietWindow(event.target.value, undefined)}
                    className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 px-3 py-2 text-xs font-black text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-light">
                    End
                  </label>
                  <input
                    type="time"
                    value={settings?.quietHoursEnd || '07:00'}
                    onChange={(event) => updateQuietWindow(undefined, event.target.value)}
                    className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 px-3 py-2 text-xs font-black text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex gap-3 text-blue-800 dark:text-blue-300">
             <RotateCw size={20} className="shrink-0 mt-0.5" />
             <p className="text-[11px] font-bold leading-relaxed">
               Reminders include quiet-hour awareness, snooze actions, and manual retry from the notification drawer.
               Routine alerts adapt automatically as {currentBaby?.name || 'baby'} grows.
             </p>
          </div>
        </div>
      </main>
    </div>
  );
};
