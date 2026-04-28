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
    fcmServerKey: isTruthy(process.env.FCM_SERVER_KEY) && !isLikelyPlaceholder(process.env.FCM_SERVER_KEY),
  };

  const missingCritical = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  res.status(200).json({
    success: true,
    ready: missingCritical.length === 0,
    checks,
    missingCritical,
    urls: {
      appOrigin: process.env.VITE_SUPABASE_AUTH_REDIRECT_URL || null,
      paystackWebhookPrimary: '/api/payments/webhook/paystack',
      paystackWebhookCompat: '/api/webhooks/paystack',
      flutterwaveWebhookPrimary: '/api/payments/webhook/flutterwave',
      flutterwaveWebhookCompat: '/api/webhooks/flutterwave',
    },
  });
}
