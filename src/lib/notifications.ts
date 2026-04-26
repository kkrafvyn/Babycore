/**
 * Notifications Module
 * Handles local and push notifications for Web/PWA and native mobile platforms.
 * Consolidates scheduling, permissions, and service worker integration.
 */

import { toast } from 'sonner';
import { Baby, SleepLog, FeedLog, DiaperLog, VaccinationRecord, UserSettings } from '../types/index';
import { supabase } from './supabase';
import { getApiBaseUrl } from './api-base-url';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_BASE_URL = getApiBaseUrl();
const hasSupabaseClientConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
);
const NATIVE_PUSH_ENDPOINT_KEY = 'babylog_native_push_endpoint';
const NATIVE_PUSH_TOKEN_KEY = 'babylog_native_push_token';
const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
  modulePath: string,
) => Promise<any>;

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

const NOTIFICATION_HISTORY_KEY = 'babylog_notification_history';
const NOTIFICATION_HISTORY_LIMIT = 60;
export const NOTIFICATION_HISTORY_EVENT = 'babylog:notifications-updated';

function getDefaultNotificationType(type?: NotificationType): NotificationType {
  return type || 'summary';
}

function readNotificationHistoryInternal(): BabyLogNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BabyLogNotification =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        typeof item.timestamp === 'string',
    );
  } catch {
    return [];
  }
}

function saveNotificationHistoryInternal(notifications: BabyLogNotification[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_HISTORY_EVENT, { detail: notifications }));
}

function isRecentDuplicate(
  notifications: BabyLogNotification[],
  payload: { title: string; body: string; type?: NotificationType },
): boolean {
  const type = getDefaultNotificationType(payload.type);
  const now = Date.now();
  return notifications.some((item) => {
    if (item.type !== type) return false;
    if (item.title !== payload.title || item.body !== payload.body) return false;
    return now - new Date(item.timestamp).getTime() < 5 * 60 * 1000;
  });
}

function persistNotification(payload: {
  title: string;
  body: string;
  data?: any;
  type?: NotificationType;
}): { notification: BabyLogNotification; isDuplicate: boolean } {
  const notifications = readNotificationHistoryInternal();
  const duplicate = isRecentDuplicate(notifications, payload);

  if (duplicate) {
    return { notification: notifications[0], isDuplicate: true };
  }

  const notification: BabyLogNotification = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: getDefaultNotificationType(payload.type),
    title: payload.title,
    body: payload.body,
    data: payload.data,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const next = [notification, ...notifications].slice(0, NOTIFICATION_HISTORY_LIMIT);
  saveNotificationHistoryInternal(next);
  return { notification, isDuplicate: false };
}

export function getNotificationHistory(): BabyLogNotification[] {
  return readNotificationHistoryInternal();
}

export function markNotificationRead(notificationId: string): void {
  const notifications = readNotificationHistoryInternal();
  const next = notifications.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item,
  );
  saveNotificationHistoryInternal(next);
}

export function markAllNotificationsRead(): void {
  const notifications = readNotificationHistoryInternal();
  const next = notifications.map((item) => ({ ...item, read: true }));
  saveNotificationHistoryInternal(next);
}

interface WebPushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

type PushPlatform = 'android' | 'ios' | 'web';

type NativePushTokenPayload = {
  token: string;
  platform: Extract<PushPlatform, 'android' | 'ios'>;
};

type NativePushBridge = {
  Capacitor: {
    isNativePlatform: () => boolean;
  };
  PushNotifications: {
    requestPermissions: () => Promise<{ receive: 'granted' | 'denied' | 'prompt' }>;
    register: () => Promise<void>;
    addListener: (eventName: string, listener: (event: any) => void) => Promise<any> | any;
  };
};

export class NotificationsManager {
  private static nativeBridgePromise: Promise<NativePushBridge | null> | null = null;

  private static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  private static async getNativePushBridge(): Promise<NativePushBridge | null> {
    if (typeof window === 'undefined') return null;

    if (!this.nativeBridgePromise) {
      this.nativeBridgePromise = (async () => {
        try {
          const [coreModule, pushModule] = await Promise.all([
            dynamicImport('@capacitor/core'),
            dynamicImport('@capacitor/push-notifications'),
          ]);

          const capacitor = coreModule?.Capacitor || coreModule?.default?.Capacitor;
          const pushNotifications =
            pushModule?.PushNotifications || pushModule?.default?.PushNotifications;

          if (!capacitor?.isNativePlatform || !pushNotifications) {
            return null;
          }

          if (!capacitor.isNativePlatform()) {
            return null;
          }

          return {
            Capacitor: capacitor,
            PushNotifications: pushNotifications,
          } as NativePushBridge;
        } catch {
          return null;
        }
      })();
    }

    return this.nativeBridgePromise;
  }

  private static isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  private static isStandaloneDisplayMode(): boolean {
    if (typeof window === 'undefined') return false;
    const navWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || navWithStandalone.standalone === true;
  }

  private static getPushPlatformLabel(): PushPlatform {
    if (typeof navigator === 'undefined') return 'web';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    return 'web';
  }

  private static async ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }

    try {
      return await navigator.serviceWorker.ready;
    } catch (error) {
      console.warn('Service worker not ready:', error);
      return null;
    }
  }

  private static getCachedNativeTokenPayload(): NativePushTokenPayload | null {
    if (typeof window === 'undefined') return null;

    const token = window.localStorage.getItem(NATIVE_PUSH_TOKEN_KEY);
    if (!token) return null;

    const platform = this.getPushPlatformLabel();
    const resolvedPlatform: Extract<PushPlatform, 'android' | 'ios'> =
      platform === 'ios' ? 'ios' : 'android';

    return {
      token,
      platform: resolvedPlatform,
    };
  }

  private static async registerNativePushToken(): Promise<NativePushTokenPayload | null> {
    const bridge = await this.getNativePushBridge();
    if (!bridge) {
      return null;
    }

    const cached = this.getCachedNativeTokenPayload();
    if (cached) {
      return cached;
    }

    try {
      const permission = await bridge.PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        return null;
      }

      const token = await new Promise<string>(async (resolve, reject) => {
        const listeners: Array<{ remove?: () => Promise<void> | void }> = [];

        const cleanupListeners = async () => {
          await Promise.all(
            listeners.map(async (listener) => {
              try {
                await listener?.remove?.();
              } catch {
                // Ignore listener cleanup failures.
              }
            }),
          );
        };

        const onRegistration = async (event: any) => {
          const value = String(event?.value || event?.token || '').trim();
          if (!value) {
            return;
          }
          window.clearTimeout(timeoutId);
          await cleanupListeners();
          resolve(value);
        };

        const onRegistrationError = async (event: any) => {
          window.clearTimeout(timeoutId);
          await cleanupListeners();
          reject(new Error(event?.error || event?.message || 'Native push registration failed'));
        };

        const timeoutId = window.setTimeout(async () => {
          await cleanupListeners();
          reject(new Error('Timed out while waiting for native push token'));
        }, 15000);

        try {
          const registrationListener = await Promise.resolve(
            bridge.PushNotifications.addListener('registration', onRegistration),
          );
          const errorListener = await Promise.resolve(
            bridge.PushNotifications.addListener('registrationError', onRegistrationError),
          );

          listeners.push(registrationListener, errorListener);
          await bridge.PushNotifications.register();
        } catch (error) {
          window.clearTimeout(timeoutId);
          await cleanupListeners();
          reject(error as Error);
        }
      });

      const platform = this.getPushPlatformLabel() === 'ios' ? 'ios' : 'android';
      const payload = { token, platform } as NativePushTokenPayload;
      window.localStorage.setItem(NATIVE_PUSH_TOKEN_KEY, token);
      window.localStorage.setItem(NATIVE_PUSH_ENDPOINT_KEY, `native://${platform}/${token}`);
      return payload;
    } catch (error) {
      console.warn('Native push registration failed:', error);
      return null;
    }
  }

  /**
   * Request permission from the user to show notifications
   */
  static async requestPermission(): Promise<boolean> {
    const nativeBridge = await this.getNativePushBridge();
    if (nativeBridge) {
      try {
        const permission = await nativeBridge.PushNotifications.requestPermissions();
        return permission.receive === 'granted';
      } catch (error) {
        console.warn('Native push permission request failed:', error);
        return false;
      }
    }

    if (
      typeof navigator === 'undefined' ||
      typeof window === 'undefined' ||
      !this.isSupported() ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return false;
    }

    // iOS web push requires the app to be installed to the home screen.
    if (this.isIOS() && !this.isStandaloneDisplayMode()) {
      toast('Install BabyLog on your home screen to enable iOS push notifications.');
      return false;
    }

    if (Notification.permission === 'granted') return true;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Get current permission status
   */
  static getPermissionStatus(): NotificationPermission {
    if (this.getCachedNativeTokenPayload()) {
      return 'granted';
    }
    return this.isSupported() ? Notification.permission : 'default';
  }

  /**
   * Subscribe to Push Notifications
   */
  static async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      const nativeBridge = await this.getNativePushBridge();
      if (nativeBridge) {
        const nativeToken = await this.registerNativePushToken();
        if (!nativeToken) {
          return null;
        }

        const saved = await this.persistNativeSubscription(nativeToken);
        if (!saved) {
          return null;
        }

        return {
          endpoint: `native://${nativeToken.platform}/${nativeToken.token}`,
        } as PushSubscription;
      }

      if (!this.isSupported() || !VAPID_PUBLIC_KEY) {
        console.warn('Push not supported or VAPID key missing');
        return null;
      }

      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const registration = await this.ensureServiceWorkerReady();
      if (!registration) {
        return null;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      await this.persistSubscription(subscription);
      console.log('Push subscription ready:', subscription.endpoint);
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
    try {
      const nativeBridge = await this.getNativePushBridge();
      if (nativeBridge) {
        const nativePayload = this.getCachedNativeTokenPayload();
        if (!nativePayload) {
          return false;
        }

        await this.removePersistedNativeSubscription(nativePayload);
        window.localStorage.removeItem(NATIVE_PUSH_TOKEN_KEY);
        window.localStorage.removeItem(NATIVE_PUSH_ENDPOINT_KEY);
        return true;
      }

      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;

      const registration = await this.ensureServiceWorkerReady();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await this.removePersistedSubscription(endpoint);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  private static async persistSubscription(subscription: PushSubscription): Promise<void> {
    const subscriptionJson = subscription.toJSON() as WebPushSubscriptionPayload;
    if (!subscriptionJson.endpoint) {
      return;
    }

    const savedInSupabase = await this.persistSubscriptionToSupabase(subscriptionJson);

    if (!savedInSupabase) {
      await this.persistSubscriptionToApi({
        subscription: subscriptionJson,
      });
    }
  }

  private static async persistNativeSubscription(payload: NativePushTokenPayload): Promise<boolean> {
    const endpoint = `native://${payload.platform}/${payload.token}`;
    let savedInSupabase = false;

    if (hasSupabaseClientConfig) {
      try {
        const authClient = supabase.auth as any;
        const {
          data: { user },
          error: userError,
        } = await authClient.getUser();

        if (!userError && user) {
          const upsertPayload = {
            user_id: user.id,
            endpoint,
            auth: '',
            p256dh: '',
            device_token: payload.token,
            platform: payload.platform,
            created_at: new Date().toISOString(),
          };

          const { error: upsertError } = await (supabase as any)
            .from('push_subscriptions')
            .upsert(upsertPayload, { onConflict: 'endpoint' });

          if (upsertError) {
            const { error: insertError } = await (supabase as any)
              .from('push_subscriptions')
              .insert(upsertPayload);
            if (insertError) throw insertError;
          }

          savedInSupabase = true;
        }
      } catch (error) {
        console.warn('Supabase native push subscription save failed:', error);
      }
    }

    if (!savedInSupabase) {
      const savedInApi = await this.persistSubscriptionToApi({
        nativeToken: payload.token,
        platform: payload.platform,
      });
      if (!savedInApi) {
        return false;
      }
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NATIVE_PUSH_TOKEN_KEY, payload.token);
      window.localStorage.setItem(NATIVE_PUSH_ENDPOINT_KEY, endpoint);
    }

    return true;
  }

  private static async persistSubscriptionToSupabase(
    subscription: WebPushSubscriptionPayload,
  ): Promise<boolean> {
    if (!hasSupabaseClientConfig) {
      return false;
    }

    try {
      const authClient = supabase.auth as any;
      const {
        data: { user },
        error: userError,
      } = await authClient.getUser();

      if (userError || !user) {
        return false;
      }

      const payload = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        auth: subscription.keys?.auth || '',
        p256dh: subscription.keys?.p256dh || '',
        device_token: null,
        platform: this.getPushPlatformLabel(),
        created_at: new Date().toISOString(),
      };

      const { error: upsertError } = await (supabase as any)
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'endpoint' });

      if (upsertError) {
        const { error: insertError } = await (supabase as any).from('push_subscriptions').insert(payload);
        if (insertError) throw insertError;
      }

      return true;
    } catch (error) {
      console.warn('Supabase push subscription save failed:', error);
      return false;
    }
  }

  private static async persistSubscriptionToApi(payload: {
    subscription?: WebPushSubscriptionPayload;
    nativeToken?: string;
    platform?: PushPlatform;
  }): Promise<boolean> {
    try {
      const authClient = supabase.auth as any;
      const {
        data: { session },
      } = await authClient.getSession();

      const accessToken: string | undefined = session?.access_token;
      if (!accessToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.warn('API push subscription save failed:', error);
      return false;
    }
  }

  private static async removePersistedNativeSubscription(
    payload: NativePushTokenPayload,
  ): Promise<void> {
    const endpoint = `native://${payload.platform}/${payload.token}`;

    if (hasSupabaseClientConfig) {
      try {
        await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      } catch (error) {
        console.warn('Supabase native push unsubscription cleanup failed:', error);
      }
    }

    try {
      const authClient = supabase.auth as any;
      const {
        data: { session },
      } = await authClient.getSession();
      const accessToken: string | undefined = session?.access_token;
      if (!accessToken) return;

      await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          endpoint,
          nativeToken: payload.token,
          platform: payload.platform,
        }),
      });
    } catch (error) {
      console.warn('API native push unsubscription cleanup failed:', error);
    }
  }

  private static async removePersistedSubscription(endpoint: string): Promise<void> {
    if (!endpoint) return;

    if (hasSupabaseClientConfig) {
      try {
        await (supabase as any).from('push_subscriptions').delete().eq('endpoint', endpoint);
      } catch (error) {
        console.warn('Supabase push unsubscription cleanup failed:', error);
      }
    }

    try {
      const authClient = supabase.auth as any;
      const {
        data: { session },
      } = await authClient.getSession();
      const accessToken: string | undefined = session?.access_token;
      if (!accessToken) return;

      await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ endpoint }),
      });
    } catch (error) {
      console.warn('API push unsubscription cleanup failed:', error);
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
    const { notification, isDuplicate } = persistNotification(payload);
    if (isDuplicate) return;

    // 1. Show In-App Toast (Always show if app is active)
    if (typeof window !== 'undefined') {
       const deepLink = notification.data?.deepLink;
       toast(notification.title, {
          description: notification.body,
          duration: 5000,
          action: deepLink ? {
             label: 'View',
             onClick: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { screen: deepLink } }))
          } : undefined
       });
    }

    // 2. Fallback to System Notification (if background or permission granted)
    if (Notification.permission === 'granted') {
       if ('serviceWorker' in navigator) {
         const registration = await navigator.serviceWorker.ready;
         if (registration) {
           registration.showNotification(notification.title, {
             body: notification.body,
             icon: '/logo.png',
             badge: '/logo.png',
             tag: notification.type || 'general',
             data: notification.data,
             vibrate: [200, 100, 200],
           } as any);
           return;
         }
       }

       try {
         new Notification(notification.title, {
           body: notification.body,
           icon: '/logo.png',
           tag: notification.type || 'general',
           data: notification.data,
         });
       } catch (e) {
          console.warn('System Notification API failed');
       }
    }
  }

  /**
   * Schedule a notification for later in the current app session.
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
