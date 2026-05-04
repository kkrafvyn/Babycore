/**
 * Push Notifications API Routes
 * Endpoints for managing PWA push subscriptions and notifications
 */

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { connect as connectHttp2 } from 'node:http2';
import { Router, Request, Response } from 'express';
import webpush from 'web-push';
import { supabase } from '../lib/supabase.js';

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

type NotificationPlatform = 'web' | 'android' | 'ios';
type NativePushTarget =
  | {
      token: string;
      platform: 'android';
    }
  | {
      token: string;
      platform: 'ios';
    };
type FcmServiceAccountCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};
type FcmAccessTokenCache = {
  token: string;
  expiresAt: number;
};
type ApnsCredentials = {
  teamId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  host: string;
};
type ApnsAuthTokenCache = {
  token: string;
  expiresAt: number;
};

let fcmAccessTokenCache: FcmAccessTokenCache | null = null;
let apnsAuthTokenCache: ApnsAuthTokenCache | null = null;

const normalizePlatform = (platform?: string): NotificationPlatform => {
  const normalized = (platform || '').toLowerCase();
  if (normalized === 'android') return 'android';
  if (normalized === 'ios') return 'ios';
  return 'web';
};

const buildNativeEndpoint = (platform: NotificationPlatform, token: string): string =>
  `native://${platform}/${token}`;

const isNativeSubscriptionRow = (row: any): boolean =>
  row?.platform === 'android' ||
  row?.platform === 'ios' ||
  String(row?.endpoint || '').startsWith('native://');

const parseNativeTokenFromEndpoint = (endpoint?: string): string | null => {
  if (!endpoint || !endpoint.startsWith('native://')) return null;
  const token = endpoint.split('/').slice(3).join('/');
  return token || null;
};

const readFirstAvailableFile = (filePaths: Array<string | undefined>, label: string): string => {
  for (const filePath of filePaths) {
    if (!filePath || !filePath.trim()) {
      continue;
    }

    try {
      const fileContents = readFileSync(filePath.trim(), 'utf8');
      if (fileContents.trim()) {
        return fileContents;
      }
    } catch (error) {
      console.warn(`Unable to read ${label} file at ${filePath}:`, error);
    }
  }

  return '';
};

const readServiceAccountJsonFromEnv = (): string => {
  const fromFile = readFirstAvailableFile(
    [process.env.FCM_SERVICE_ACCOUNT_JSON_FILE, process.env.GOOGLE_APPLICATION_CREDENTIALS],
    'FCM service account',
  );
  if (fromFile) {
    return fromFile;
  }

  const candidates = [
    process.env.FCM_SERVICE_ACCOUNT_JSON,
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
};

const parseServiceAccountJson = (rawValue: string): Record<string, any> | null => {
  if (!rawValue) {
    return null;
  }

  const attempts = [rawValue];

  try {
    attempts.push(Buffer.from(rawValue, 'base64').toString('utf8'));
  } catch {
    // Ignore invalid base64 input and fall back to raw JSON parsing only.
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Try the next input form.
    }
  }

  return null;
};

const normalizePrivateKey = (value?: string): string => String(value || '').replace(/\\n/g, '\n').trim();

const readApnsAuthKeyFromEnv = (): string => {
  const fromFile = readFirstAvailableFile(
    [process.env.APNS_AUTH_KEY_P8_FILE, process.env.APNS_AUTH_KEY_FILE],
    'APNs auth key',
  );
  if (fromFile) {
    return fromFile;
  }

  const candidates = [process.env.APNS_AUTH_KEY_P8, process.env.APNS_AUTH_KEY];
  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
};

const resolveFcmCredentials = (): FcmServiceAccountCredentials | null => {
  const serviceAccount = parseServiceAccountJson(readServiceAccountJsonFromEnv());
  const projectId = String(
    serviceAccount?.project_id ||
      process.env.FCM_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      '',
  ).trim();
  const clientEmail = String(
    serviceAccount?.client_email ||
      process.env.FCM_CLIENT_EMAIL ||
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.GOOGLE_CLIENT_EMAIL ||
      '',
  ).trim();
  const privateKey = normalizePrivateKey(
    serviceAccount?.private_key ||
      process.env.FCM_PRIVATE_KEY ||
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.GOOGLE_PRIVATE_KEY,
  );

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const resolveApnsCredentials = (): ApnsCredentials | null => {
  const teamId = String(process.env.APNS_TEAM_ID || process.env.APPLE_TEAM_ID || '').trim();
  const keyId = String(process.env.APNS_KEY_ID || process.env.APPLE_KEY_ID || '').trim();
  const privateKey = normalizePrivateKey(readApnsAuthKeyFromEnv());
  const bundleId = String(
    process.env.APNS_BUNDLE_ID || process.env.IOS_BUNDLE_ID || process.env.APP_BUNDLE_ID || 'com.babylog.app',
  ).trim();
  const useSandbox = String(process.env.APNS_USE_SANDBOX || '').trim().toLowerCase();
  const host =
    String(process.env.APNS_HOST || '').trim() ||
    (['1', 'true', 'yes', 'on'].includes(useSandbox)
      ? 'https://api.sandbox.push.apple.com'
      : 'https://api.push.apple.com');

  if (!teamId || !keyId || !privateKey || !bundleId || !host) {
    return null;
  }

  return {
    teamId,
    keyId,
    privateKey,
    bundleId,
    host,
  };
};

const base64UrlEncode = (value: string | Buffer): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const createGoogleOAuthAssertion = (credentials: FcmServiceAccountCredentials): string => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: credentials.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signer = createSign('RSA-SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(credentials.privateKey);
  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
};

async function getFcmAccessToken(credentials: FcmServiceAccountCredentials): Promise<string> {
  if (fcmAccessTokenCache && Date.now() < fcmAccessTokenCache.expiresAt) {
    return fcmAccessTokenCache.token;
  }

  const assertion = createGoogleOAuthAssertion(credentials);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`FCM OAuth token request failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const accessToken = String(body.access_token || '').trim();
  const expiresInSeconds = Number(body.expires_in || 3600);

  if (!accessToken) {
    throw new Error('FCM OAuth token response did not include an access token');
  }

  fcmAccessTokenCache = {
    token: accessToken,
    expiresAt: Date.now() + Math.max(60, expiresInSeconds - 60) * 1000,
  };

  return accessToken;
}

function getApnsAuthToken(credentials: ApnsCredentials): string {
  if (apnsAuthTokenCache && Date.now() < apnsAuthTokenCache.expiresAt) {
    return apnsAuthTokenCache.token;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'ES256',
    kid: credentials.keyId,
  };
  const payload = {
    iss: credentials.teamId,
    iat: issuedAt,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signer = createSign('SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(credentials.privateKey);
  const token = `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;

  apnsAuthTokenCache = {
    token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return token;
}

const serializeFcmData = (data?: Record<string, any>): Record<string, string> | undefined => {
  if (!data) {
    return undefined;
  }

  const entries = Object.entries(data).flatMap(([key, value]) => {
    if (value === undefined) {
      return [];
    }

    const normalizedValue =
      value === null
        ? 'null'
        : typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);

    return [[key, normalizedValue] as const];
  });

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

async function sendSingleNativePushViaFcm(
  target: Extract<NativePushTarget, { platform: 'android' }>,
  payload: { title: string; body?: string; data?: Record<string, any> },
  credentials: FcmServiceAccountCredentials,
  accessToken: string,
): Promise<boolean> {
  const data = serializeFcmData(payload.data);
  const message: Record<string, any> = {
    token: target.token,
    notification: {
      title: payload.title,
      body: payload.body || '',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
      },
    },
  };

  if (data) {
    message.data = data;
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    },
  );

  if (response.ok) {
    return true;
  }

  const errorBody = await response.text().catch(() => '');
  console.error('FCM HTTP v1 send failed', {
    status: response.status,
    platform: target.platform,
    tokenPreview: `${target.token.slice(0, 12)}...`,
    body: errorBody.slice(0, 500),
  });
  return false;
}

async function sendSingleNativePushViaApns(
  target: Extract<NativePushTarget, { platform: 'ios' }>,
  payload: { title: string; body?: string; data?: Record<string, any> },
  credentials: ApnsCredentials,
  authToken: string,
  client: ReturnType<typeof connectHttp2>,
): Promise<boolean> {
  const apnsPayload: Record<string, any> = {
    aps: {
      alert: {
        title: payload.title,
        body: payload.body || '',
      },
      sound: 'default',
    },
  };

  if (payload.data && Object.keys(payload.data).length > 0) {
    Object.assign(apnsPayload, payload.data);
  }

  return await new Promise<boolean>((resolve) => {
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${target.token}`,
      authorization: `bearer ${authToken}`,
      'apns-topic': credentials.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    });
    let responseStatus = 0;
    let responseBody = '';

    request.setEncoding('utf8');
    request.on('response', (headers) => {
      responseStatus = Number(headers[':status'] || 0);
    });
    request.on('data', (chunk) => {
      responseBody += chunk;
    });
    request.on('end', () => {
      if (responseStatus === 200) {
        resolve(true);
        return;
      }

      console.error('APNs send failed', {
        status: responseStatus,
        tokenPreview: `${target.token.slice(0, 12)}...`,
        body: responseBody.slice(0, 500),
      });
      resolve(false);
    });
    request.on('error', (error) => {
      console.error('APNs request error', {
        tokenPreview: `${target.token.slice(0, 12)}...`,
        error: error.message,
      });
      resolve(false);
    });
    request.end(JSON.stringify(apnsPayload));
  });
}

async function sendNativePushViaFcm(
  targets: Array<Extract<NativePushTarget, { platform: 'android' }>>,
  payload: { title: string; body?: string; data?: Record<string, any> },
): Promise<{ sent: number; failed: number }> {
  if (!targets.length) {
    return { sent: 0, failed: 0 };
  }

  const credentials = resolveFcmCredentials();
  if (!credentials) {
    console.warn('FCM HTTP v1 credentials are missing. Native push delivery is disabled.');
    return { sent: 0, failed: targets.length };
  }

  const accessToken = await getFcmAccessToken(credentials);
  const results = await Promise.allSettled(
    targets.map((target) => sendSingleNativePushViaFcm(target, payload, credentials, accessToken)),
  );
  const sent = results.filter((result) => result.status === 'fulfilled' && result.value).length;
  const failed = results.length - sent;

  return {
    sent,
    failed,
  };
}

async function sendNativePushViaApns(
  targets: Array<Extract<NativePushTarget, { platform: 'ios' }>>,
  payload: { title: string; body?: string; data?: Record<string, any> },
): Promise<{ sent: number; failed: number }> {
  if (!targets.length) {
    return { sent: 0, failed: 0 };
  }

  const credentials = resolveApnsCredentials();
  if (!credentials) {
    console.warn('APNs credentials are missing. iOS native push delivery is disabled.');
    return { sent: 0, failed: targets.length };
  }

  const authToken = getApnsAuthToken(credentials);
  const client = connectHttp2(credentials.host);
  const results = await Promise.allSettled(
    targets.map((target) => sendSingleNativePushViaApns(target, payload, credentials, authToken, client)),
  );
  client.close();

  const sent = results.filter((result) => result.status === 'fulfilled' && result.value).length;
  const failed = results.length - sent;

  return {
    sent,
    failed,
  };
}

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

  const webSubscriptions = (subscriptions || []).filter((row) => !isNativeSubscriptionRow(row));
  const nativeTargets = Object.values(
    (subscriptions || []).reduce<Record<string, NativePushTarget>>((accumulator, row) => {
      if (!isNativeSubscriptionRow(row)) {
        return accumulator;
      }

      const token = row.device_token || parseNativeTokenFromEndpoint(row.endpoint);
      const platform = normalizePlatform(row.platform);

      if (!token || platform === 'web') {
        return accumulator;
      }

      accumulator[`${platform}:${token}`] = {
        token,
        platform,
      } as NativePushTarget;
      return accumulator;
    }, {}),
  );

  const webResults = await Promise.allSettled(
    webSubscriptions.map((sub) =>
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

  const webSent = webResults.filter((result) => result.status === 'fulfilled').length;
  const webFailed = webResults.filter((result) => result.status === 'rejected').length;
  const androidTargets = nativeTargets.filter(
    (target): target is Extract<NativePushTarget, { platform: 'android' }> => target.platform === 'android',
  );
  const iosTargets = nativeTargets.filter(
    (target): target is Extract<NativePushTarget, { platform: 'ios' }> => target.platform === 'ios',
  );
  const [androidResult, iosResult] = await Promise.all([
    sendNativePushViaFcm(androidTargets, { title, body, data }),
    sendNativePushViaApns(iosTargets, { title, body, data }),
  ]);

  return {
    sent: webSent + androidResult.sent + iosResult.sent,
    failed: webFailed + androidResult.failed + iosResult.failed,
  };
}

export async function processDueScheduledNotifications(limit = 200): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date().toISOString();
  const { data: scheduled, error: queryError } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(Math.max(1, Math.min(500, limit)));

  if (queryError) {
    throw queryError;
  }

  let sent = 0;
  let failed = 0;

  for (const notification of scheduled || []) {
    try {
      await sendPushToUser({
        userId: notification.user_id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        tag: notification.tag,
      });

      await supabase
        .from('scheduled_notifications')
        .update({ status: 'sent', sent_at: now })
        .eq('id', notification.id);

      sent += 1;
    } catch (err) {
      failed += 1;
      console.error('Failed to send notification:', err);
    }
  }

  return {
    processed: (scheduled || []).length,
    sent,
    failed,
  };
}

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { subscription, nativeToken, platform } = req.body;

    if (!userId || (!subscription && !nativeToken)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let endpoint = '';
    let auth = '';
    let p256dh = '';
    let deviceToken: string | null = null;
    const normalizedPlatform = normalizePlatform(platform);

    if (nativeToken) {
      const token = String(nativeToken).trim();
      if (!token) {
        return res.status(400).json({ error: 'Invalid native token' });
      }
      endpoint = buildNativeEndpoint(normalizedPlatform, token);
      deviceToken = token;
    } else {
      endpoint = String(subscription?.endpoint || '').trim();
      auth = String(subscription?.keys?.auth || '');
      p256dh = String(subscription?.keys?.p256dh || '');
      if (!endpoint) {
        return res.status(400).json({ error: 'Invalid web push subscription payload' });
      }
    }

    // Save subscription to database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        auth,
        p256dh,
        device_token: deviceToken,
        platform: normalizedPlatform,
        created_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

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
    const { endpoint, nativeToken, platform } = req.body;

    const resolvedEndpoint = endpoint
      ? String(endpoint)
      : nativeToken
        ? buildNativeEndpoint(normalizePlatform(platform), String(nativeToken))
        : '';

    if (!userId || !resolvedEndpoint) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', resolvedEndpoint);

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
    const result = await processDueScheduledNotifications();

    return res.json({
      success: true,
      message: `Processed ${result.sent} notifications`,
      count: result.sent,
      processed: result.processed,
      failed: result.failed,
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
