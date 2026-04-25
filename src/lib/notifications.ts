/**
 * Notifications Module
 * Handles local and push notifications for Web/PWA platforms.
 * Consolidates scheduling, permissions, and service worker integration.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

import { toast } from 'sonner';
import { Baby, SleepLog, FeedLog, DiaperLog, VaccinationRecord, UserSettings } from '../types/index';

export type NotificationType = 
  | 'feeding' 
  | 'diaper' 
  | 'vaccine' 
  | 'sleep' 
  | 'summary'
  | 'milestone'
  | 'growth';

export interface BabyLogNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    babyId?: string;
    deepLink?: string;
    [key: string]: any;
  };
  timestamp: string;
  read: boolean;
}

export class NotificationsManager {
  private static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Request permission from the user to show notifications
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Get current permission status
   */
  static getPermissionStatus(): NotificationPermission {
    return this.isSupported() ? Notification.permission : 'default';
  }

  /**
   * Subscribe to Push Notifications
   */
  static async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported() || !('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
      console.warn('Push not supported or VAPID key missing');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('Push Subscription successful:', subscription);
      // In a real app, you would send this subscription to your backend (Supabase)
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from Push Notifications
   */
  static async unsubscribeFromPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  private static urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Send a local notification (immediate)
   * This handles both in-app toasts and OS-level notifications
   */
  static async sendLocalNotification(payload: { title: string; body: string; data?: any; type?: NotificationType }): Promise<void> {
    if (!this.isSupported()) return;

    // 1. Show In-App Toast (Always show if app is active)
    if (typeof window !== 'undefined') {
       toast(payload.title, {
          description: payload.body,
          duration: 5000,
          action: payload.data?.deepLink ? {
             label: 'View',
             onClick: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { screen: payload.data.deepLink } }))
          } : undefined
       });
    }

    // 2. Fallback to System Notification (if background or permission granted)
    if (Notification.permission === 'granted') {
       if ('serviceWorker' in navigator) {
         const registration = await navigator.serviceWorker.ready;
         if (registration) {
           registration.showNotification(payload.title, {
             body: payload.body,
             icon: '/logo.png',
             badge: '/logo.png',
             tag: payload.type || 'general',
             data: payload.data,
             vibrate: [200, 100, 200],
           } as any);
           return;
         }
       }

       try {
         new Notification(payload.title, {
           body: payload.body,
           icon: '/logo.png',
           tag: payload.type || 'general',
           data: payload.data,
         });
       } catch (e) {
         console.warn('System Notification API failed');
       }
    }
  }

  /**
   * Schedule a notification (Mock - for real background scheduling you need a push server)
   */
  static scheduleLocalNotification(payload: { title: string; body: string; delayMs: number; type?: NotificationType }): number {
    return window.setTimeout(() => {
      this.sendLocalNotification(payload);
    }, payload.delayMs);
  }

  /**
   * Check if we are in quiet hours
   */
  static isQuietHours(settings: UserSettings): boolean {
    if (!settings.notificationsEnabled || !settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    
    const [sH, sM] = settings.quietHoursStart.split(':').map(Number);
    const [eH, eM] = settings.quietHoursEnd.split(':').map(Number);
    
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (startMin > endMin) { // Crosses midnight
      return currentMin >= startMin || currentMin < endMin;
    }
    return currentMin >= startMin && currentMin < endMin;
  }

  // Factory methods for specific notification types
  static createFeedingAlert(babyName: string): { title: string; body: string; type: NotificationType } {
    return {
      title: `Feeding Time for ${babyName}`,
      body: `It's been a while since the last feeding. Time for some nourishment!`,
      type: 'feeding',
    };
  }

  static createDiaperAlert(babyName: string): { title: string; body: string; type: NotificationType } {
    return {
      title: `Check ${babyName}'s Diaper`,
      body: `Frequent checks keep baby comfortable and happy!`,
      type: 'diaper',
    };
  }

  static createVaccineAlert(babyName: string, vaccine: string): { title: string; body: string; type: NotificationType } {
    return {
      title: `Vaccine Reminder: ${babyName}`,
      body: `${vaccine} is due soon. Check the calendar to schedule an appointment.`,
      type: 'vaccine',
    };
  }
}

/**
 * Global function to sync and trigger notifications based on state
 */
export const syncNotifications = async (
  babies: Baby[],
  settings: UserSettings,
  logs: { feedLogs: FeedLog[]; diaperLogs: DiaperLog[] }
) => {
  if (!settings.notificationsEnabled || NotificationsManager.isQuietHours(settings)) {
    return;
  }

  const currentBaby = babies[0]; // Logic for primary baby
  if (!currentBaby) return;

  // Example: notify if last feed was > 4 hours ago and interval is set
  const lastFeed = logs.feedLogs[0];
  if (lastFeed && settings.feedingInterval) {
    const hoursSince = (Date.now() - new Date(lastFeed.timestamp).getTime()) / 3600000;
    if (hoursSince >= settings.feedingInterval) {
      await NotificationsManager.sendLocalNotification(NotificationsManager.createFeedingAlert(currentBaby.name));
    }
  }
};
