import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';

const isTruthy = (value: string | undefined): boolean => Boolean(value && value.trim().length > 0);

const isLikelyPlaceholder = (value: string | undefined): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes('your_') ||
    normalized.includes('example') ||
    normalized.includes('changeme') ||
    normalized.includes('replace_me') ||
    normalized.includes('placeholder')
  );
};

const isLocalUrl = (value: string | undefined): boolean => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const hasSupabasePublishableKey = (): boolean =>
  isTruthy(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || isTruthy(process.env.VITE_SUPABASE_ANON_KEY);

const hasFcmHttpV1Config = (): boolean => {
  const serviceAccountFile =
    process.env.FCM_SERVICE_ACCOUNT_JSON_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (isTruthy(serviceAccountFile) && !isLikelyPlaceholder(serviceAccountFile)) {
    return true;
  }

  const serviceAccountJson =
    process.env.FCM_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (isTruthy(serviceAccountJson) && !isLikelyPlaceholder(serviceAccountJson)) {
    return true;
  }

  const projectId =
    process.env.FCM_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail =
    process.env.FCM_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey =
    process.env.FCM_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY;

  return (
    isTruthy(projectId) &&
    !isLikelyPlaceholder(projectId) &&
    isTruthy(clientEmail) &&
    !isLikelyPlaceholder(clientEmail) &&
    isTruthy(privateKey) &&
    !isLikelyPlaceholder(privateKey)
  );
};

const hasApnsAuthConfig = (): boolean => {
  const authKeyFile = process.env.APNS_AUTH_KEY_P8_FILE || process.env.APNS_AUTH_KEY_FILE;

  if (isTruthy(authKeyFile) && !isLikelyPlaceholder(authKeyFile)) {
    return true;
  }

  const authKey = process.env.APNS_AUTH_KEY_P8 || process.env.APNS_AUTH_KEY;
  const teamId = process.env.APNS_TEAM_ID || process.env.APPLE_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID || process.env.APPLE_KEY_ID;

  return (
    isTruthy(authKey) &&
    !isLikelyPlaceholder(authKey) &&
    isTruthy(teamId) &&
    !isLikelyPlaceholder(teamId) &&
    isTruthy(keyId) &&
    !isLikelyPlaceholder(keyId)
  );
};

export default function handler(req: VercelRequest, res: VercelResponse): void {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const checks = {
    supabaseFrontendUrl: isTruthy(process.env.VITE_SUPABASE_URL) && !isLikelyPlaceholder(process.env.VITE_SUPABASE_URL),
    supabaseFrontendKey: hasSupabasePublishableKey(),
    supabaseServerUrl: isTruthy(process.env.SUPABASE_URL) && !isLikelyPlaceholder(process.env.SUPABASE_URL),
    supabaseServiceKey:
      (isTruthy(process.env.SUPABASE_SERVICE_KEY) || isTruthy(process.env.SUPABASE_SERVICE_ROLE_KEY)) &&
      !isLikelyPlaceholder(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    paystackPublicKey:
      isTruthy(process.env.VITE_PAYSTACK_PUBLIC_KEY) &&
      !isLikelyPlaceholder(process.env.VITE_PAYSTACK_PUBLIC_KEY),
    paystackSecretKey:
      (isTruthy(process.env.PAYSTACK_SECRET_KEY) || isTruthy(process.env.PAYSTACK_SERVICE_KEY)) &&
      !isLikelyPlaceholder(process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SERVICE_KEY),
    oauthRedirectConfigured:
      isTruthy(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL) &&
      !isLocalUrl(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL),
    vapidPublicKey:
      isTruthy(process.env.VITE_VAPID_PUBLIC_KEY) &&
      !isLikelyPlaceholder(process.env.VITE_VAPID_PUBLIC_KEY),
    vapidPrivateKey:
      isTruthy(process.env.VAPID_PRIVATE_KEY) &&
      !isLikelyPlaceholder(process.env.VAPID_PRIVATE_KEY),
    fcmHttpV1: hasFcmHttpV1Config(),
    apnsAuth: hasApnsAuthConfig(),
  };

  const criticalCheckKeys = [
    'supabaseFrontendUrl',
    'supabaseFrontendKey',
    'supabaseServerUrl',
    'supabaseServiceKey',
    'paystackPublicKey',
    'paystackSecretKey',
    'oauthRedirectConfigured',
  ] as const;

  const recommendedCheckKeys = ['vapidPublicKey', 'vapidPrivateKey', 'fcmHttpV1', 'apnsAuth'] as const;

  const missingCritical = criticalCheckKeys.filter((key) => !checks[key]);
  const missingRecommended = recommendedCheckKeys.filter((key) => !checks[key]);

  res.status(200).json({
    success: true,
    ready: missingCritical.length === 0,
    checks,
    missingCritical,
    missingRecommended,
    urls: {
      appOrigin: process.env.VITE_SUPABASE_AUTH_REDIRECT_URL || null,
      paystackWebhookPrimary: '/api/payments/webhook/paystack',
      paystackWebhookCompat: '/api/webhooks/paystack',
      flutterwaveWebhookPrimary: '/api/payments/webhook/flutterwave',
      flutterwaveWebhookCompat: '/api/webhooks/flutterwave',
    },
  });
}
