/**
 * Push Notifications Service
 * PWA push notifications with VAPID keys
 */

import { supabase } from './supabase';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();
  const accessToken: string | undefined = session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

const toUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push messaging not supported');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error('VITE_VAPID_PUBLIC_KEY is not configured');
    }

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidPublicKey),
      });

      // Send subscription to backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) throw new Error('Failed to subscribe');
    }

    return subscription;
  } catch (err) {
    console.error('Error subscribing to push notifications:', err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Notify backend
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      return true;
    }

    return false;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

/**
 * Send local notification
 */
export async function sendLocalNotification(options: NotificationOptions): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) {
      // Fallback to web notification API
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
      });

      notification.onclick = () => {
        window.focus();
      };

      return;
    }

    const registration = await navigator.serviceWorker.ready;
    interface ExtendedNotificationOptions extends Omit<NotificationOptions, 'title'> {
      actions?: NotificationAction[];
    }
    const notificationOptions: ExtendedNotificationOptions = {
      body: options.body,
      icon: options.icon || '/icon-192x192.png',
      badge: options.badge || '/badge-72x72.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
    };
    if ('actions' in options && options.actions) {
      notificationOptions.actions = options.actions as NotificationAction[];
    }
    await registration.showNotification(options.title, notificationOptions);
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

/**
 * Schedule notification for later
 */
export async function scheduleNotification(
  options: NotificationOptions,
  delaySeconds: number
): Promise<NodeJS.Timeout> {
  const timeout = setTimeout(() => {
    sendLocalNotification(options);
  }, delaySeconds * 1000);

  return timeout;
}

/**
 * Request feeding reminder notification
 */
export async function scheduleFeeedingReminder(
  babyName: string,
  minutesFromNow: number
): Promise<NodeJS.Timeout> {
  return scheduleNotification(
    {
      title: `${babyName} might be hungry soon!`,
      body: 'Time for a feeding based on past patterns',
      icon: '/icon-baby-feed.png',
      tag: 'feeding-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'log-feed',
          title: 'Log Feeding',
        },
      ],
    },
    minutesFromNow * 60
  );
}

/**
 * Request sleep time reminder
 */
export async function scheduleSleepReminder(
  babyName: string,
  minutesFromNow: number
): Promise<NodeJS.Timeout> {
  return scheduleNotification(
    {
      title: `Looks like ${babyName} might be getting tired`,
      body: 'Consider starting a sleep routine',
      icon: '/icon-baby-sleep.png',
      tag: 'sleep-reminder',
      requireInteraction: false,
    },
    minutesFromNow * 60
  );
}

/**
 * Notification for health alert
 */
export async function sendHealthAlertNotification(
  diseaseName: string,
  severity: string
): Promise<void> {
  await sendLocalNotification({
    title: `⚠️ Health Alert: ${diseaseName}`,
    body: `${severity.toUpperCase()} level alert in your region. See details for preventive measures.`,
    icon: '/icon-health-alert.png',
    badge: '/badge-health.png',
    tag: `health-alert-${diseaseName}`,
    requireInteraction: severity === 'critical',
  });
}

/**
 * Notification for vaccination reminder
 */
export async function sendVaccinationReminder(
  babyName: string,
  vaccine: string
): Promise<void> {
  await sendLocalNotification({
    title: `💉 Vaccination Reminder`,
    body: `${babyName} is due for ${vaccine}. Schedule an appointment.`,
    icon: '/icon-vaccine.png',
    tag: 'vaccination-reminder',
    requireInteraction: true,
  });
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<{
  enabled: boolean;
  subscription: PushSubscription | null;
}> {
  try {
    if (!('serviceWorker' in navigator)) {
      return { enabled: false, subscription: null };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return {
      enabled: Notification.permission === 'granted',
      subscription,
    };
  } catch (err) {
    console.error('Error getting notification settings:', err);
    return { enabled: false, subscription: null };
  }
}

/**
 * Handle notification click in service worker
 */
export function setupNotificationClickHandler(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'NOTIFICATION_CLICK') {
      const { action, data } = event.data;

      if (action === 'log-feed') {
        window.location.href = '/logs?type=feeding';
      } else if (action === 'log-sleep') {
        window.location.href = '/logs?type=sleep';
      } else if (action === 'view-alert') {
        window.location.href = '/health-alerts';
      }
    }
  });
}
