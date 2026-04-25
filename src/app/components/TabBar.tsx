import React from 'react';
import { Home, Moon, Droplets, Wind, Calendar } from 'lucide-react';
import { View } from '../../types/index';

interface TabBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentView, onNavigate }) => {
  const tabs: Array<{ label: string; view: View; icon: React.ReactNode }> = [
    { label: 'Home', view: 'dashboard', icon: <Home size={24} /> },
    { label: 'Sleep', view: 'sleep', icon: <Moon size={24} /> },
    { label: 'Feeding', view: 'feeding', icon: <Droplets size={24} /> },
    { label: 'Diaper', view: 'diaper', icon: <Wind size={24} /> },
    { label: 'Vaccine', view: 'vaccination', icon: <Calendar size={24} /> },
  ];

  return (
    <div className="flex justify-around items-end bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 safe-bottom">
      {tabs.map(tab => (
        <button
          key={tab.view}
          onClick={() => onNavigate(tab.view)}
          className={`flex-1 flex flex-col items-center justify-center py-4 px-0 transition-colors ${
            currentView === tab.view
              ? 'text-blue-500'
              : 'text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          {tab.icon}
          <span className="text-xs font-500 mt-1">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
