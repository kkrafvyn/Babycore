/**
 * Navigation Bar - Bottom Tab Navigation
 * Following Material Design 3 principles
 */

import React from 'react';

interface NavTabItem {
  id: string;
  label: string;
  icon: string;
}

interface BottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const navTabs: NavTabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'logs', label: 'Logs', icon: 'history' },
  { id: 'growth', label: 'Growth', icon: 'trending_up' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab = 'home',
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-variant shadow-lg z-40 md:hidden">
      <div className="flex justify-around">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-4 gap-1 transition-colors ${
              activeTab === tab.id
                ? 'text-secondary bg-secondary-container/30'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">{tab.icon}</span>
            <span className="text-xs font-label font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
