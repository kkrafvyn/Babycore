import React from 'react';
import { Home, ClipboardList, TrendingUp, Settings, Bell, Book, Sun, Moon, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getReminderPreferences,
  getNotificationHistory,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_HISTORY_EVENT,
  retryNotificationNow,
  snoozeNotification,
  type BabyLogNotification,
} from '../../lib/notifications';
import { useAuthStore } from '@/app/AppContext';

interface AppLayoutProps {
  children: React.ReactNode;
  activeNav?: 'home' | 'logs' | 'growth' | 'settings' | 'journal';
  onNavChange?: (navId: string) => void;
  showTopHeader?: boolean;
  showBottomNav?: boolean;
}

const MotionDiv = motion.div as any;

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeNav = 'home',
  onNavChange,
  showTopHeader = true,
  showBottomNav = true,
}) => {
  const { settings } = useAuthStore();
  const reminderPreferences = React.useMemo(() => getReminderPreferences(settings), [settings]);
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<BabyLogNotification[]>(
    () => getNotificationHistory(),
  );

  React.useEffect(() => {
    const handleNotificationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<BabyLogNotification[]>;
      if (Array.isArray(customEvent.detail)) {
        setNotifications(customEvent.detail);
        return;
      }
      setNotifications(getNotificationHistory());
    };

    window.addEventListener(NOTIFICATION_HISTORY_EVENT, handleNotificationUpdate as EventListener);
    return () =>
      window.removeEventListener(NOTIFICATION_HISTORY_EVENT, handleNotificationUpdate as EventListener);
  }, []);

  const navItems = [
    { id: 'home' as const, label: 'HOME', icon: Home },
    { id: 'journal' as const, label: 'JOURNAL', icon: Book },
    { id: 'logs' as const, label: 'LOGS', icon: ClipboardList },
    { id: 'growth' as const, label: 'GROWTH', icon: TrendingUp },
    { id: 'settings' as const, label: 'SETTINGS', icon: Settings },
  ];

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';
  const unreadCount = React.useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const relativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleNotificationClick = (notification: BabyLogNotification) => {
    markNotificationRead(notification.id);
    const deepLink = notification.data?.deepLink;
    if (deepLink) {
      window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: deepLink } }));
    }
  };

  const handleNotificationSnooze = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const snoozed = snoozeNotification(notificationId, reminderPreferences.snoozeMinutes);
    if (!snoozed) return;
    setNotifications(getNotificationHistory());
  };

  const handleNotificationRetry = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    retryNotificationNow(notificationId);
  };

  return (
    <div className="fit-screen bg-background">
      {/* Top Header */}
      {showTopHeader && (
        <header className="fixed top-0 w-full z-50 h-16 sm:h-20 border-b border-border-gray bg-background/85 backdrop-blur-xl dark:border-zinc-800/50">
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-3 sm:px-6 md:px-12 lg:px-16 lg:pl-28">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border-gray bg-surface-gray shadow-inner dark:border-zinc-700 dark:bg-zinc-800 sm:h-10 sm:w-10">
                <img src="/logo.png" alt="BabyLog" className="h-full w-full object-contain" />
              </div>
              <span className="truncate text-lg font-headline font-black tracking-tight text-foreground sm:text-xl">BabyLog</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-5">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="h-9 w-9 rounded-full border border-border-gray bg-surface-gray shadow-sm transition-all hover:scale-105 active:scale-90 dark:border-zinc-700 dark:bg-zinc-800 sm:h-10 sm:w-10"
              >
                <span className="flex h-full w-full items-center justify-center">
                  {isDark
                    ? <Sun size={16} className="text-amber-400 sm:h-[18px] sm:w-[18px]" />
                    : <Moon size={16} className="text-secondary sm:h-[18px] sm:w-[18px]" />
                  }
                </span>
              </button>

              {/* Notification Bell */}
              <button
                onClick={handleOpenNotifications}
                className="group relative p-1.5 transition-all hover:scale-105 active:scale-90 sm:-mr-1 sm:p-2"
              >
                <Bell size={20} className="text-foreground group-hover:text-secondary sm:h-6 sm:w-6" />
                {unreadCount > 0 && (
                  <div className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full border-2 border-white bg-error px-1 dark:border-background">
                    <span className="text-[8px] font-black leading-none text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Notification Drawer */}
      <AnimatePresence>
         {showNotifications && (
           <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end"
              onClick={() => setShowNotifications(false)}
           >
              <MotionDiv initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-[320px] bg-surface h-full shadow-2xl flex flex-col"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                 <div className="p-8 border-b border-border-gray dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="text-xl font-headline font-black text-foreground">Activity</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-text-light"><X size={20} /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                    {notifications.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm font-semibold text-text-light">No notifications yet.</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left p-5 rounded-3xl border transition-all flex gap-4 ${
                            notification.read
                              ? 'border-border-gray dark:border-zinc-800 bg-surface-gray dark:bg-zinc-900/50'
                              : 'border-secondary/20 bg-secondary/10'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                              notification.read ? 'bg-zinc-500' : 'bg-secondary'
                            }`}
                          >
                            <Bell size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground uppercase tracking-tight truncate">
                              {notification.title}
                            </p>
                            <p className="text-[11px] text-text-dim mt-1 line-clamp-2">{notification.body}</p>
                            <p className="text-[10px] text-text-light mt-2 uppercase tracking-widest">
                              {relativeTime(notification.timestamp)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                onClick={(event) => handleNotificationSnooze(notification.id, event)}
                                className="rounded-full bg-surface px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-text-light border border-border-gray dark:border-zinc-700"
                              >
                                Snooze {reminderPreferences.snoozeMinutes}m
                              </button>
                              <button
                                onClick={(event) => handleNotificationRetry(notification.id, event)}
                                className="rounded-full bg-secondary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-secondary border border-secondary/30"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                 </div>
                 <div className="p-8 border-t border-border-gray dark:border-zinc-800">
                    <button
                      onClick={() => {
                        markAllNotificationsRead();
                        setShowNotifications(false);
                      }}
                      className="w-full py-4 bg-surface-gray dark:bg-zinc-800 text-text-light rounded-2xl text-[9px] font-black uppercase tracking-widest"
                    >
                      Mark all as Read
                    </button>
                 </div>
              </MotionDiv>
           </MotionDiv>
         )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={`min-h-0 flex-1 overflow-y-auto no-scrollbar pb-8 sm:pb-10 lg:pb-10 ${
          showBottomNav
            ? 'mb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:mb-[calc(6rem+env(safe-area-inset-bottom))] lg:mb-0'
            : 'mb-0'
        } ${
          showTopHeader ? 'pt-16 sm:pt-20' : 'pt-0'
        }`}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 md:px-12 lg:px-16 py-5 sm:py-8 lg:py-10 lg:pl-28">
           {children}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[max(0.6rem,env(safe-area-inset-bottom))] px-2 sm:px-4 flex justify-center lg:hidden">
           <nav className="pointer-events-auto h-16 sm:h-20 bg-[#1a1a1a]/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[1.9rem] sm:rounded-[2.5rem] flex items-center justify-between gap-1 px-2 sm:px-3 shadow-2xl border border-white/10 max-w-lg w-full">
             {navItems.map((item) => (
               <button
                 key={item.id}
                 onClick={() => onNavChange?.(item.id)}
                 className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 min-w-0 ${
                   activeNav === item.id ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                 }`}
               >
                 <item.icon size={18} className="text-white sm:h-5 sm:w-5" strokeWidth={activeNav === item.id ? 2.5 : 2} />
                 <span className={`text-[0.58rem] sm:text-[7px] font-black text-white tracking-[0.12em] sm:tracking-[0.2em] transition-all truncate ${activeNav === item.id ? 'opacity-100 scale-100 h-auto' : 'opacity-0 scale-75 h-0 overflow-hidden'}`}>
                   {item.label}
                 </span>
               </button>
             ))}
           </nav>
        </div>
      )}

      {/* Desktop Side Navigation */}
      <aside className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <nav className="w-20 rounded-[2rem] border border-border-gray bg-surface/90 p-2 backdrop-blur-xl shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavChange?.(item.id)}
                className={`group flex h-14 w-full flex-col items-center justify-center rounded-2xl transition-all ${
                  activeNav === item.id
                    ? 'bg-secondary text-white shadow-lg shadow-secondary/25'
                    : 'text-text-dim hover:bg-surface-gray dark:hover:bg-zinc-800'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                <item.icon size={18} strokeWidth={activeNav === item.id ? 2.5 : 2} />
                <span
                  className={`mt-1 text-[9px] font-black tracking-[0.14em] ${
                    activeNav === item.id ? 'text-white' : 'text-text-light group-hover:text-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </div>
  );
};
