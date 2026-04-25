import React from 'react';
import { Home, ClipboardList, TrendingUp, Settings, Bell, Book, Sun, Moon, X, Sparkles, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

interface AppLayoutProps {
  children: React.ReactNode;
  activeNav?: 'home' | 'logs' | 'growth' | 'settings' | 'journal';
  onNavChange?: (navId: string) => void;
}

const MotionDiv = motion.div as any;

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeNav = 'home',
  onNavChange,
}) => {
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = React.useState(false);

  const navItems = [
    { id: 'home' as const, label: 'HOME', icon: Home },
    { id: 'journal' as const, label: 'JOURNAL', icon: Book },
    { id: 'logs' as const, label: 'LOGS', icon: ClipboardList },
    { id: 'growth' as const, label: 'GROWTH', icon: TrendingUp },
    { id: 'settings' as const, label: 'SETTINGS', icon: Settings },
  ];

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';

  return (
    <div className="fit-screen bg-background">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-background/85 backdrop-blur-xl h-16 sm:h-20 px-3 sm:px-6 md:px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-border-gray dark:border-zinc-700 shadow-inner shrink-0">
             <img src="/logo.png" alt="BabyLog" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg sm:text-xl font-headline font-black text-foreground tracking-tight truncate">BabyLog</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-5">
           {/* Theme Toggle */}
           <button
             onClick={toggleTheme}
             aria-label="Toggle theme"
             className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-gray dark:bg-zinc-800 flex items-center justify-center border border-border-gray dark:border-zinc-700 hover:scale-105 active:scale-90 transition-all shadow-sm"
           >
             {isDark
               ? <Sun size={16} className="text-amber-400 sm:h-[18px] sm:w-[18px]" />
               : <Moon size={16} className="text-secondary sm:h-[18px] sm:w-[18px]" />
             }
           </button>

           {/* Notification Bell */}
           <button 
             onClick={() => setShowNotifications(true)}
             className="relative p-1.5 sm:p-2 sm:-mr-1 hover:scale-105 active:scale-90 transition-all group"
           >
              <Bell size={20} className="text-foreground group-hover:text-secondary sm:h-6 sm:w-6" />
              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-error rounded-full border-2 border-white dark:border-background flex items-center justify-center">
                 <span className="text-[8px] font-black text-white">2</span>
              </div>
           </button>
        </div>
      </header>

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
                    <div className="bg-secondary/10 p-5 rounded-3xl border border-secondary/20 flex gap-4">
                       <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shrink-0"><Sparkles size={18} /></div>
                       <div>
                          <p className="text-xs font-black text-foreground uppercase tracking-tight">AI Insight</p>
                          <p className="text-[11px] text-text-dim mt-1">Baby's nap routine is stabilizing. suggested wake window: 2.5h.</p>
                       </div>
                    </div>
                    <div className="p-5 rounded-3xl border border-border-gray dark:border-zinc-800 flex gap-4 bg-surface-gray dark:bg-zinc-900/50">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0"><Check size={18} /></div>
                       <div>
                          <p className="text-xs font-black text-foreground uppercase tracking-tight">Partner Sync</p>
                          <p className="text-[11px] text-text-dim mt-1">Your sanctuary is now shared with 1 caregiver.</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-8 border-t border-border-gray dark:border-zinc-800">
                    <button onClick={() => setShowNotifications(false)} className="w-full py-4 bg-surface-gray dark:bg-zinc-800 text-text-light rounded-2xl text-[9px] font-black uppercase tracking-widest">Mark all as Read</button>
                 </div>
              </MotionDiv>
           </MotionDiv>
         )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-16 sm:pt-20 pb-24 sm:pb-28">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 md:px-12 py-5 sm:py-8">
           {children}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[max(0.6rem,env(safe-area-inset-bottom))] px-2 sm:px-4 flex justify-center">
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
    </div>
  );
};
