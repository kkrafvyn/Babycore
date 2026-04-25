import { motion } from 'motion/react';
import { Home, Activity, TrendingUp, Calendar, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800" />
      
      {/* Navigation items */}
      <div className="relative grid grid-cols-5 px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.85 }}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1.5 px-2"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-2 top-0 h-0.5 bg-teal-500 dark:bg-teal-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Icon
                  className={`w-6 h-6 mb-1 transition-colors ${
                    isActive
                      ? 'text-teal-500 dark:text-teal-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
              
              {/* Label */}
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-teal-500 dark:text-teal-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
