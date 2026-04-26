/**
 * Push Notifications API Routes
 * Endpoints for managing PWA push subscriptions and notifications
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import * as webpush from 'web-push';

const router = Router();

const vapidSubject = process.env.VAPID_SUBJECT || 'support@babylog.app';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;

// Configure web-push with VAPID keys
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(`mailto:${vapidSubject}`, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('VAPID keys are missing. Push notifications sending is disabled.');
}

type PushPayload = {
  userId: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
  tag?: string;
};

async function sendPushToUser(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const { userId, title, body, data, tag } = payload;

  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (subError) throw subError;

  const messagePayload = JSON.stringify({
    title,
    body: body || '',
    data: data || {},
    tag: tag || 'default',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  });

  const results = await Promise.allSettled(
    (subscriptions || []).map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        messagePayload,
      ),
    ),
  );

  return {
    sent: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save subscription to database
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;

    return res.json({ success: true, message: 'Subscribed to notifications' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPushNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { endpoint } = req.body;

    if (!userId || !endpoint) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) throw error;

    return res.json({ success: true, message: 'Unsubscribed from notifications' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/notifications/send
 * Send push notification to user
 */
export async function sendPushNotification(req: Request, res: Response) {
  try {
    const { userId, title, body, data, tag } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { sent, failed } = await sendPushToUser({
      userId,
      title,
      body,
      data,
      tag,
    });

    return res.json({
      success: true,
      message: `Sent notification to ${sent} devices`,
      sent,
      failed,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/notifications/schedule
 * Schedule a notification for later
 */
export async function scheduleNotification(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { title, body, scheduledFor, data } = req.body;

    if (!userId || !title || !scheduledFor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: userId,
        title,
        body: body || '',
        scheduled_for: scheduledFor,
        data: data || {},
        status: 'pending',
      });

    if (error) throw error;

    return res.json({ success: true, message: 'Notification scheduled' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/notifications/health-alert
 * Send health alert notification
 */
export async function sendHealthAlertNotification(req: Request, res: Response) {
  try {
    const { userId, alertType, disease, region } = req.body;

    if (!userId || !alertType || !disease) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notification = {
      title: `Health Alert: ${disease}`,
      body: `${alertType} reported in ${region || 'your area'}. Check app for details.`,
      data: {
        type: 'health-alert',
        alertType,
        disease,
      },
      tag: 'health-alert',
    };

    const { sent, failed } = await sendPushToUser({
      userId,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      tag: notification.tag,
    });

    return res.json({
      success: true,
      message: `Sent health alert to ${sent} devices`,
      sent,
      failed,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/notifications/schedule-reminders
 * Schedule feeding/sleep reminders
 */
export async function scheduleReminders(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, reminderType, time } = req.body;

    if (!userId || !babyId || !reminderType || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reminderData = {
      user_id: userId,
      baby_id: babyId,
      reminder_type: reminderType, // 'feeding', 'sleep', 'medication'
      scheduled_time: time,
      enabled: true,
      timezone: req.body.timezone || 'UTC',
    };

    const { error } = await supabase
      .from('reminder_schedules')
      .upsert(reminderData, {
        onConflict: 'user_id,baby_id,reminder_type',
      });

    if (error) throw error;

    return res.json({ success: true, message: 'Reminders configured' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Cron job handler: Check and send scheduled notifications
 * Call this periodically (e.g., every 5 minutes)
 */
export async function processScheduledNotifications(req: Request, res: Response) {
  try {
    const now = new Date().toISOString();

    // Get due notifications
    const { data: scheduled, error: queryError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (queryError) throw queryError;

    let sent = 0;
    for (const notification of scheduled || []) {
      try {
        await sendPushToUser({
          userId: notification.user_id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          tag: notification.tag,
        });

        // Mark as sent
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'sent', sent_at: now })
          .eq('id', notification.id);

        sent++;
      } catch (err) {
        console.error('Failed to send notification:', err);
      }
    }

    return res.json({
      success: true,
      message: `Processed ${sent} notifications`,
      count: sent,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

router.post('/subscribe', subscribeToPushNotifications);
router.post('/unsubscribe', unsubscribeFromPushNotifications);
router.post('/send', sendPushNotification);
router.post('/schedule', scheduleNotification);
router.post('/health-alert', sendHealthAlertNotification);
router.post('/schedule-reminders', scheduleReminders);
router.post('/process', processScheduledNotifications);

export default router;
