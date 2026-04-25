import React, { useState, useEffect } from 'react';
import { X, Bell, AlertCircle, Check } from 'lucide-react';
import { BabyLogNotification } from '../../lib/notifications';

interface NotificationToastProps {
  notifications: BabyLogNotification[];
  onDismiss: (id: string) => void;
  onNavigate?: (deepLink: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
  onNavigate,
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<BabyLogNotification[]>([]);

  useEffect(() => {
    // Add new notifications to visible list
    const newNotifications = notifications.filter(
      n => !visibleNotifications.find(v => v.id === n.id)
    );

    if (newNotifications.length > 0) {
      setVisibleNotifications(prev => [...prev, ...newNotifications]);

      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        setVisibleNotifications(prev => prev.slice(1));
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [notifications, visibleNotifications]);

  if (visibleNotifications.length === 0) {
    return null;
  }

  const notification = visibleNotifications[0];

  const getIcon = () => {
    switch (notification.type) {
      case 'feeding':
        return <Bell className="w-5 h-5 text-orange-500" />;
      case 'diaper':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'vaccine':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'sleep':
        return <Bell className="w-5 h-5 text-purple-500" />;
      case 'summary':
        return <Bell className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleDismiss = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
    onDismiss(id);
  };

  const handleNavigate = (deepLink?: string) => {
    if (deepLink && onNavigate) {
      onNavigate(deepLink);
    }
    handleDismiss(notification.id);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3"
        onClick={() => handleNavigate(notification.data?.deepLink)}
      >
        <div className="flex-shrink-0 pt-1">{getIcon()}</div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {notification.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
            {notification.body}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss(notification.id);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
