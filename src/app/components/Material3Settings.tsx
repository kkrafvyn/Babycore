/**
 * Material Design 3 Settings Screen
 * Manages user preferences, notifications, and account settings
 * Connected to AppContext for persistent state
 */

import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import BottomNavigation from './BottomNavigation';

interface SettingItem {
  id: string;
  label: string;
  icon: string;
  description?: string;
  type: 'toggle' | 'select' | 'button';
  value?: any;
  action?: () => void;
}

export const Material3Settings: React.FC = () => {
  const context = useAppContext();
  const { settings, updateSettings } = context || {};
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = async (key: string, value: any) => {
    try {
      setIsLoading(true);
      await updateSettings?.({ [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const settingGroups = [
    {
      title: 'Preferences',
      items: [
        {
          id: 'units',
          label: 'Units',
          icon: 'straighten',
          description: settings?.units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lb, in)',
          type: 'select' as const,
          value: settings?.units || 'metric',
          action: () => {
            const newUnits = settings?.units === 'metric' ? 'imperial' : 'metric';
            handleSettingChange('units', newUnits);
          },
        },
        {
          id: 'language',
          label: 'Language',
          icon: 'language',
          description: settings?.language || 'English',
          type: 'select' as const,
          value: settings?.language || 'English',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notificationsEnabled',
          label: 'Feeding Reminders',
          icon: 'notifications_active',
          description: 'Get reminders for feeding times',
          type: 'toggle' as const,
          value: settings?.notificationsEnabled ?? true,
          action: () => handleSettingChange('notificationsEnabled', !settings?.notificationsEnabled),
        },
      ],
    },
    {
      title: 'Display',
      items: [
        {
          id: 'theme',
          label: 'Dark Mode',
          icon: 'dark_mode',
          description: 'Dark theme for easy viewing',
          type: 'toggle' as const,
          value: settings?.theme === 'dark',
          action: () => handleSettingChange('theme', settings?.theme === 'dark' ? 'light' : 'dark'),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'subscription',
          label: 'Subscription',
          icon: 'card_giftcard',
          description: 'Manage premium features',
          type: 'button' as const,
        },
        {
          id: 'dataSync',
          label: 'Cloud Sync',
          icon: 'cloud_sync',
          description: 'Sync data to cloud',
          type: 'button' as const,
        },
        {
          id: 'export',
          label: 'Export Data',
          icon: 'download',
          description: 'Download your data',
          type: 'button' as const,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          label: 'Help & Support',
          icon: 'help',
          description: 'FAQ and contact',
          type: 'button' as const,
        },
        {
          id: 'privacy',
          label: 'Privacy Policy',
          icon: 'privacy_tip',
          description: 'View our privacy policy',
          type: 'button' as const,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] pb-32 font-['Manrope',sans-serif]">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl flex justify-between items-center h-20 px-6 md:px-8 border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)]">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
            Bloom
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f3f3f7] dark:bg-zinc-800 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-colors shadow-inner">
            <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">notifications</span>
          </button>
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f3f3f7] dark:bg-zinc-800 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-colors shadow-inner">
            <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">account_circle</span>
          </button>
        </div>
      </header>

      {/* Settings Content */}
      <main className="pt-32 px-6 max-w-3xl mx-auto space-y-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Preferences</h1>
          <p className="text-[#787b80] dark:text-zinc-400 text-sm md:text-base font-bold max-w-md leading-relaxed">
            Tailor your Bloom experience for clinical precision and personalized comfort.
          </p>
        </div>

        {settingGroups.map((group) => (
          <div key={group.title} className="space-y-6">
            <h2 className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-[0.3em] font-['Plus_Jakarta_Sans',sans-serif] px-2">
              {group.title}
            </h2>

            <div className="space-y-4">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#1a1c1e] rounded-2xl p-6 flex items-center justify-between shadow-sm border border-gray-100 dark:border-zinc-800/50 hover:shadow-md transition-shadow group cursor-pointer active:scale-[0.99]"
                  onClick={item.type !== 'toggle' ? (item as SettingItem).action : undefined}
                >
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-14 h-14 bg-[#f3f3f7] dark:bg-zinc-800 rounded-[1rem] flex items-center justify-center flex-shrink-0 transition-colors shadow-inner group-hover:bg-[#e0e2e8] dark:group-hover:bg-zinc-700">
                      <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400 text-2xl">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white text-lg tracking-tight leading-tight">{item.label}</p>
                      {item.description && (
                        <p className="text-[11px] text-[#787b80] dark:text-zinc-500 font-bold font-['Manrope',sans-serif] mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>

                  {item.type === 'toggle' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); item.action?.(); }}
                      disabled={isLoading}
                      className={`w-14 h-8 rounded-full transition-all flex items-center p-1 outline-none ring-offset-2 focus:ring-2 focus:ring-[#45627d]/30 relative ${
                        item.value
                          ? 'bg-[#45627d] dark:bg-blue-600'
                          : 'bg-[#e0e2e8] dark:bg-zinc-800 border-2 border-transparent dark:border-zinc-700'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full shadow-lg transition-transform duration-300 ${
                          item.value ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white dark:bg-zinc-400'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-[#f3f3f7] dark:group-hover:bg-zinc-800 text-[#a0a4ae] transition-colors">
                      <span className="material-symbols-outlined text-xl">
                        chevron_right
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Version & Legal */}
        <div className="mt-16 pt-10 border-t border-[#f3f3f7] dark:border-zinc-800 text-center pb-12">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#a0a4ae] dark:text-zinc-500 mb-6 font-['Plus_Jakarta_Sans',sans-serif]">Cradlyn v2.4.0</p>
          <div className="flex justify-center gap-8 text-xs font-bold text-[#45627d] dark:text-blue-300 font-['Manrope',sans-serif]">
            <button className="hover:text-[#2f3337] dark:hover:text-white transition-colors">Terms of Care</button>
            <button className="hover:text-[#2f3337] dark:hover:text-white transition-colors">Privacy Sanctum</button>
            <button className="hover:text-[#2f3337] dark:hover:text-white transition-colors">Lullaby Center</button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Material3Settings;
