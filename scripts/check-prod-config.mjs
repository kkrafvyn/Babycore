#!/usr/bin/env node

const APP_URL =
  process.env.VITE_APP_URL ||
  process.env.CLIENT_URL ||
  process.env.VITE_SUPABASE_AUTH_REDIRECT_URL ||
  'https://babycore.vercel.app';

const toStringValue = (value) => (typeof value === 'string' ? value.trim() : '');
const hasValue = (value) => toStringValue(value).length > 0;

const isPlaceholder = (value) => {
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return true;

  return (
    normalized.includes('your_') ||
    normalized.includes('example') ||
    normalized.includes('placeholder') ||
    normalized.includes('replace_me') ||
    normalized.includes('changeme')
  );
};

const isLocalUrl = (value) => {
  const raw = toStringValue(value);
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const checks = [
  {
    key: 'VITE_SUPABASE_URL',
    critical: true,
    valid: hasValue(process.env.VITE_SUPABASE_URL) && !isPlaceholder(process.env.VITE_SUPABASE_URL),
    help: 'Supabase project URL for frontend auth/data.',
  },
  {
    key: 'VITE_SUPABASE_PUBLISHABLE_KEY_OR_ANON',
    critical: true,
    valid:
      (hasValue(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) &&
        !isPlaceholder(process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
      (hasValue(process.env.VITE_SUPABASE_ANON_KEY) && !isPlaceholder(process.env.VITE_SUPABASE_ANON_KEY)),
    help: 'Set either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.',
  },
  {
    key: 'SUPABASE_URL',
    critical: true,
    valid: hasValue(process.env.SUPABASE_URL) && !isPlaceholder(process.env.SUPABASE_URL),
    help: 'Supabase project URL for server-side /api routes.',
  },
  {
    key: 'SUPABASE_SERVICE_KEY_OR_ROLE',
    critical: true,
    valid:
      (hasValue(process.env.SUPABASE_SERVICE_KEY) &&
        !isPlaceholder(process.env.SUPABASE_SERVICE_KEY)) ||
      (hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
        !isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)),
    help: 'Set SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).',
  },
  {
    key: 'VITE_SUPABASE_AUTH_REDIRECT_URL',
    critical: true,
    valid:
      hasValue(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL) &&
      !isPlaceholder(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL) &&
      !isLocalUrl(process.env.VITE_SUPABASE_AUTH_REDIRECT_URL),
    help: `Use ${APP_URL} for production; avoid localhost.`,
  },
  {
    key: 'VITE_PAYSTACK_PUBLIC_KEY',
    critical: true,
    valid:
      (hasValue(process.env.VITE_PAYSTACK_PUBLIC_KEY) &&
        !isPlaceholder(process.env.VITE_PAYSTACK_PUBLIC_KEY)) ||
      (hasValue(process.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY) &&
        !isPlaceholder(process.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY)),
    help: 'Public Paystack key used by checkout widget.',
  },
  {
    key: 'PAYSTACK_SECRET_KEY',
    critical: true,
    valid:
      (hasValue(process.env.PAYSTACK_SECRET_KEY) && !isPlaceholder(process.env.PAYSTACK_SECRET_KEY)) ||
      (hasValue(process.env.PAYSTACK_SERVICE_KEY) && !isPlaceholder(process.env.PAYSTACK_SERVICE_KEY)),
    help: 'Server-side Paystack secret for finalize + webhook verification.',
  },
  {
    key: 'VITE_VAPID_PUBLIC_KEY',
    critical: false,
    valid: hasValue(process.env.VITE_VAPID_PUBLIC_KEY) && !isPlaceholder(process.env.VITE_VAPID_PUBLIC_KEY),
    help: 'Required for browser push subscription.',
  },
  {
    key: 'VAPID_PRIVATE_KEY',
    critical: false,
    valid: hasValue(process.env.VAPID_PRIVATE_KEY) && !isPlaceholder(process.env.VAPID_PRIVATE_KEY),
    help: 'Required for server-side push sending.',
  },
  {
    key: 'FCM_SERVER_KEY',
    critical: false,
    valid: hasValue(process.env.FCM_SERVER_KEY) && !isPlaceholder(process.env.FCM_SERVER_KEY),
    help: 'Required for Android/iOS push delivery via Firebase.',
  },
];

const criticalFailures = checks.filter((check) => check.critical && !check.valid);
const optionalFailures = checks.filter((check) => !check.critical && !check.valid);

console.log('\nBabyCore Production Config Check\n');
for (const check of checks) {
  const symbol = check.valid ? 'PASS' : check.critical ? 'FAIL' : 'WARN';
  console.log(`${symbol.padEnd(5)} ${check.key}`);
}

console.log('\nExpected Provider URLs');
console.log(`- App URL: ${APP_URL}`);
console.log(`- Paystack Callback URL: ${APP_URL}`);
console.log(`- Paystack Webhook URL (primary): ${APP_URL}/api/payments/webhook/paystack`);
console.log(`- Paystack Webhook URL (compat): ${APP_URL}/api/webhooks/paystack`);
console.log(`- Flutterwave Webhook URL (primary): ${APP_URL}/api/payments/webhook/flutterwave`);
console.log(`- Flutterwave Webhook URL (compat): ${APP_URL}/api/webhooks/flutterwave`);

if (criticalFailures.length > 0) {
  console.log('\nCritical items to fix:');
  for (const item of criticalFailures) {
    console.log(`- ${item.key}: ${item.help}`);
  }
}

if (optionalFailures.length > 0) {
  console.log('\nOptional but recommended:');
  for (const item of optionalFailures) {
    console.log(`- ${item.key}: ${item.help}`);
  }
}

if (criticalFailures.length > 0) {
  process.exit(1);
}

console.log('\nAll critical production config checks passed.');
