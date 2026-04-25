import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertCircle, Heart, Droplet, Moon, TrendingUp, Syringe, BarChart3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationPreference {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
}

export const NotificationSettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      type: 'feeding_interval',
      name: 'Feeding Reminders',
      description: 'Get reminded when it\'s time for the next feeding',
      icon: <Heart size={20} className="text-pink-500" />,
      enabled: true,
      frequency: 'immediate',
    },
    {
      type: 'breastfeed_side',
      name: 'Breast Side Reminder',
      description: 'Remind which breast to feed from next',
      icon: <Heart size={20} className="text-rose-500" />,
      enabled: true,
      frequency: 'immediate',
    },
    {
      type: 'diaper_overdue',
      name: 'Diaper Check Reminders',
      description: 'Alert when diaper hasn\'t been changed recently',
      icon: <Droplet size={20} className="text-yellow-500" />,
      enabled: true,
      frequency: 'immediate',
    },
    {
      type: 'sleep_reminder',
      name: 'Sleep Reminders',
      description: 'Suggest nap or bedtime based on activity patterns',
      icon: <Moon size={20} className="text-indigo-500" />,
      enabled: true,
      frequency: 'daily',
    },
    {
      type: 'vaccine_due',
      name: 'Vaccination Alerts',
      description: 'Reminder when vaccines are due according to schedule',
      icon: <Syringe size={20} className="text-cyan-500" />,
      enabled: true,
      frequency: 'weekly',
    },
    {
      type: 'growth_reminder',
      name: 'Growth Tracking Prompts',
      description: 'Monthly reminder to log weight and length measurements',
      icon: <TrendingUp size={20} className="text-green-500" />,
      enabled: true,
      frequency: 'weekly',
    },
    {
      type: 'daily_summary',
      name: 'Daily Summary',
      description: 'End-of-day recap of feeding, sleep, and diaper activity',
      icon: <BarChart3 size={20} className="text-blue-500" />,
      enabled: false,
      frequency: 'daily',
    },
    {
      type: 'milestone_reached',
      name: 'Milestone Celebrations',
      description: 'Celebratory notification when baby reaches milestones',
      icon: <AlertCircle size={20} className="text-purple-500" />,
      enabled: true,
      frequency: 'immediate',
    },
  ]);

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPreferences((prev) =>
        prev.map((pref) => ({
          ...pref,
          enabled: parsed[pref.type]?.enabled ?? pref.enabled,
          frequency: parsed[pref.type]?.frequency ?? pref.frequency,
        }))
      );
    }

    const quietHours = localStorage.getItem('quietHours');
    if (quietHours) {
      const { enabled, start, end } = JSON.parse(quietHours);
      setQuietHoursEnabled(enabled);
      setQuietStart(start);
      setQuietEnd(end);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = () => {
    const prefs: Record<string, any> = {};
    preferences.forEach((pref) => {
      prefs[pref.type] = {
        enabled: pref.enabled,
        frequency: pref.frequency,
      };
    });
    localStorage.setItem('notificationPreferences', JSON.stringify(prefs));

    localStorage.setItem(
      'quietHours',
      JSON.stringify({
        enabled: quietHoursEnabled,
        start: quietStart,
        end: quietEnd,
      })
    );

    // Dispatch event to notify other components
    window.dispatchEvent(
      new CustomEvent('notificationPreferencesUpdated', {
        detail: { preferences: prefs, quietHours: { enabled: quietHoursEnabled, start: quietStart, end: quietEnd } },
      })
    );
  };

  const togglePreference = (type: string) => {
    setPreferences((prev) =>
      prev.map((pref) => (pref.type === type ? { ...pref, enabled: !pref.enabled } : pref))
    );
  };

  const updateFrequency = (type: string, frequency: 'immediate' | 'daily' | 'weekly') => {
    setPreferences((prev) =>
      prev.map((pref) => (pref.type === type ? { ...pref, frequency } : pref))
    );
  };

  const enabledCount = preferences.filter((p) => p.enabled).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-black/50"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-700 text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={20} />
              Notification Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {enabledCount} of {preferences.length} enabled
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Notification Preferences */}
          <div className="space-y-3">
            <h3 className="font-600 text-gray-900 dark:text-white text-sm uppercase tracking-wide">
              Notification Types
            </h3>

            <div className="space-y-3">
              {preferences.map((pref) => (
                <motion.div
                  key={pref.type}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3"
                >
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 text-gray-600 dark:text-gray-400">{pref.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-600 text-gray-900 dark:text-white">{pref.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{pref.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        togglePreference(pref.type);
                        savePreferences();
                      }}
                      className={`ml-2 relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        pref.enabled
                          ? 'bg-green-500 dark:bg-green-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <motion.div
                        animate={{ x: pref.enabled ? 22 : 2 }}
                        className="inline-block h-5 w-5 transform rounded-full bg-white"
                      />
                    </button>
                  </div>

                  {/* Frequency Selector */}
                  {pref.enabled && pref.frequency && (
                    <div className="ml-8 flex gap-2">
                      {(['immediate', 'daily', 'weekly'] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => {
                            updateFrequency(pref.type, freq);
                            savePreferences();
                          }}
                          className={`px-3 py-1 rounded text-xs font-500 transition-colors ${
                            pref.frequency === freq
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {freq === 'immediate' ? 'Instant' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-600 text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} />
                  Quiet Hours
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No notifications during these times
                </p>
              </div>
              <button
                onClick={() => {
                  setQuietHoursEnabled(!quietHoursEnabled);
                  savePreferences();
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  quietHoursEnabled
                    ? 'bg-green-500 dark:bg-green-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <motion.div
                  animate={{ x: quietHoursEnabled ? 22 : 2 }}
                  className="inline-block h-5 w-5 transform rounded-full bg-white"
                />
              </button>
            </div>

            {quietHoursEnabled && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-500 text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => {
                      setQuietStart(e.target.value);
                      savePreferences();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-500 text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => {
                      setQuietEnd(e.target.value);
                      savePreferences();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300 flex gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-500">Settings saved automatically</p>
              <p className="text-xs opacity-80">Any changes you make are automatically saved to your device</p>
            </div>
          </div>

          {/* Footer Padding */}
          <div className="h-8" />
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Hook to use notification preferences
 */
export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<Record<string, any>>({});

  useEffect(() => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }

    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setPreferences(customEvent.detail.preferences);
    };

    window.addEventListener('notificationPreferencesUpdated', handleUpdate);
    return () => window.removeEventListener('notificationPreferencesUpdated', handleUpdate);
  }, []);

  return preferences;
};
