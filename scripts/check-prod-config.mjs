#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const repoRoot = process.cwd();

const readEnvFile = (filename) => {
  const filePath = path.join(repoRoot, filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return dotenv.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
};

const readJsonFile = (filename) => {
  const filePath = path.join(repoRoot, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const fileEnv = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...readEnvFile('.env.production'),
  ...readEnvFile('.env.production.local'),
};
const capacitorConfig = readJsonFile('capacitor.config.json');

const getEnv = (key) => process.env[key] ?? fileEnv[key];

const APP_URL =
  getEnv('VITE_APP_URL') ||
  getEnv('CLIENT_URL') ||
  getEnv('VITE_SUPABASE_AUTH_REDIRECT_URL') ||
  'https://app.example.com';

const toStringValue = (value) => (typeof value === 'string' ? value.trim() : '');
const hasValue = (value) => toStringValue(value).length > 0;
const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(toStringValue(value).toLowerCase());
const nativeRemotePushEnabled =
  isTruthy(getEnv('VITE_NATIVE_REMOTE_PUSH_ENABLED')) || isTruthy(getEnv('NATIVE_REMOTE_PUSH_ENABLED'));

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

const isHostedUrl = (value) => {
  const raw = toStringValue(value);
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    return !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const readTextFile = (filename) => {
  const filePath = path.join(repoRoot, filename);
  if (!fs.existsSync(filePath)) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

const hasFcmHttpV1Config = () => {
  const serviceAccountFile =
    getEnv('FCM_SERVICE_ACCOUNT_JSON_FILE') || getEnv('GOOGLE_APPLICATION_CREDENTIALS');

  if (hasValue(serviceAccountFile) && !isPlaceholder(serviceAccountFile)) {
    return true;
  }

  const serviceAccountJson =
    getEnv('FCM_SERVICE_ACCOUNT_JSON') ||
    getEnv('FIREBASE_SERVICE_ACCOUNT_JSON') ||
    getEnv('GOOGLE_SERVICE_ACCOUNT_JSON') ||
    getEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON');

  if (hasValue(serviceAccountJson) && !isPlaceholder(serviceAccountJson)) {
    return true;
  }

  const projectId =
    getEnv('FCM_PROJECT_ID') ||
    getEnv('FIREBASE_PROJECT_ID') ||
    getEnv('GOOGLE_CLOUD_PROJECT_ID') ||
    getEnv('GOOGLE_CLOUD_PROJECT');
  const clientEmail =
    getEnv('FCM_CLIENT_EMAIL') ||
    getEnv('FIREBASE_CLIENT_EMAIL') ||
    getEnv('GOOGLE_CLIENT_EMAIL');
  const privateKey =
    getEnv('FCM_PRIVATE_KEY') ||
    getEnv('FIREBASE_PRIVATE_KEY') ||
    getEnv('GOOGLE_PRIVATE_KEY');

  return (
    hasValue(projectId) &&
    !isPlaceholder(projectId) &&
    hasValue(clientEmail) &&
    !isPlaceholder(clientEmail) &&
    hasValue(privateKey) &&
    !isPlaceholder(privateKey)
  );
};

const hasApnsAuthConfig = () => {
  const authKeyFile = getEnv('APNS_AUTH_KEY_P8_FILE') || getEnv('APNS_AUTH_KEY_FILE');

  if (hasValue(authKeyFile) && !isPlaceholder(authKeyFile)) {
    return true;
  }

  const authKey = getEnv('APNS_AUTH_KEY_P8') || getEnv('APNS_AUTH_KEY');
  const teamId = getEnv('APNS_TEAM_ID') || getEnv('APPLE_TEAM_ID');
  const keyId = getEnv('APNS_KEY_ID') || getEnv('APPLE_KEY_ID');

  return (
    hasValue(authKey) &&
    !isPlaceholder(authKey) &&
    hasValue(teamId) &&
    !isPlaceholder(teamId) &&
    hasValue(keyId) &&
    !isPlaceholder(keyId)
  );
};

const iosPushAppDelegateConfigured = () => {
  const content = readTextFile(path.join('ios', 'App', 'App', 'AppDelegate.swift'));
  return (
    content.includes('didRegisterForRemoteNotificationsWithDeviceToken') &&
    content.includes('capacitorDidRegisterForRemoteNotifications') &&
    content.includes('didFailToRegisterForRemoteNotificationsWithError') &&
    content.includes('capacitorDidFailToRegisterForRemoteNotifications')
  );
};

const iosPushEntitlementConfigured = () => {
  const content = readTextFile(path.join('ios', 'App', 'App', 'App.entitlements'));
  return content.includes('<key>aps-environment</key>');
};

const fileExists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

const readPropertiesFile = (relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {};
  }

  try {
    return dotenv.parse(fs.readFileSync(absolutePath));
  } catch {
    return {};
  }
};

const androidKeystoreProperties = readPropertiesFile(path.join('android', 'keystore.properties'));
const androidStoreFileSetting =
  androidKeystoreProperties.storeFile ||
  getEnv('ANDROID_SIGNING_STORE_FILE') ||
  getEnv('ANDROID_KEYSTORE_PATH');
const androidStoreFileExists = Boolean(
  androidStoreFileSetting &&
    fs.existsSync(path.resolve(repoRoot, 'android', androidStoreFileSetting)),
);
const nativeBundledShell = !toStringValue(capacitorConfig?.server?.url);

const checks = [
  {
    key: 'VITE_SUPABASE_URL',
    critical: true,
    valid: hasValue(getEnv('VITE_SUPABASE_URL')) && !isPlaceholder(getEnv('VITE_SUPABASE_URL')),
    help: 'Supabase project URL for frontend auth/data.',
  },
  {
    key: 'VITE_SUPABASE_PUBLISHABLE_KEY_OR_ANON',
    critical: true,
    valid:
      (hasValue(getEnv('VITE_SUPABASE_PUBLISHABLE_KEY')) &&
        !isPlaceholder(getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'))) ||
      (hasValue(getEnv('VITE_SUPABASE_ANON_KEY')) && !isPlaceholder(getEnv('VITE_SUPABASE_ANON_KEY'))),
    help: 'Set either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY.',
  },
  {
    key: 'SUPABASE_URL',
    critical: true,
    valid: hasValue(getEnv('SUPABASE_URL')) && !isPlaceholder(getEnv('SUPABASE_URL')),
    help: 'Supabase project URL for server-side /api routes.',
  },
  {
    key: 'SUPABASE_SERVICE_KEY_OR_ROLE',
    critical: true,
    valid:
      (hasValue(getEnv('SUPABASE_SERVICE_KEY')) &&
        !isPlaceholder(getEnv('SUPABASE_SERVICE_KEY'))) ||
      (hasValue(getEnv('SUPABASE_SERVICE_ROLE_KEY')) &&
        !isPlaceholder(getEnv('SUPABASE_SERVICE_ROLE_KEY'))),
    help: 'Set SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).',
  },
  {
    key: 'VITE_SUPABASE_AUTH_REDIRECT_URL',
    critical: true,
    valid:
      hasValue(getEnv('VITE_SUPABASE_AUTH_REDIRECT_URL')) &&
      !isPlaceholder(getEnv('VITE_SUPABASE_AUTH_REDIRECT_URL')) &&
      !isLocalUrl(getEnv('VITE_SUPABASE_AUTH_REDIRECT_URL')),
    help: `Use ${APP_URL} for production; avoid localhost.`,
  },
  {
    key: 'VITE_PAYSTACK_PUBLIC_KEY',
    critical: true,
    valid:
      (hasValue(getEnv('VITE_PAYSTACK_PUBLIC_KEY')) &&
        !isPlaceholder(getEnv('VITE_PAYSTACK_PUBLIC_KEY'))) ||
      (hasValue(getEnv('VITE_PAYSTACK_LIVE_PUBLIC_KEY')) &&
        !isPlaceholder(getEnv('VITE_PAYSTACK_LIVE_PUBLIC_KEY'))),
    help: 'Public Paystack key used by checkout widget.',
  },
  {
    key: 'PAYSTACK_SECRET_KEY',
    critical: true,
    valid:
      (hasValue(getEnv('PAYSTACK_SECRET_KEY')) && !isPlaceholder(getEnv('PAYSTACK_SECRET_KEY'))) ||
      (hasValue(getEnv('PAYSTACK_SERVICE_KEY')) && !isPlaceholder(getEnv('PAYSTACK_SERVICE_KEY'))),
    help: 'Server-side Paystack secret for finalize + webhook verification.',
  },
  {
    key: 'VITE_VAPID_PUBLIC_KEY',
    critical: false,
    valid: hasValue(getEnv('VITE_VAPID_PUBLIC_KEY')) && !isPlaceholder(getEnv('VITE_VAPID_PUBLIC_KEY')),
    help: 'Required for browser push subscription.',
  },
  {
    key: 'VAPID_PRIVATE_KEY',
    critical: false,
    valid: hasValue(getEnv('VAPID_PRIVATE_KEY')) && !isPlaceholder(getEnv('VAPID_PRIVATE_KEY')),
    help: 'Required for server-side push sending.',
  },
];

if (nativeRemotePushEnabled) {
  checks.push({
    key: 'FCM_HTTP_V1_CREDENTIALS',
    critical: false,
    valid: hasFcmHttpV1Config(),
    help:
      'Required for Android remote push delivery when native remote push is enabled. Set FCM_SERVICE_ACCOUNT_JSON or the FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY trio.',
  });
  checks.push({
    key: 'APNS_AUTH_CREDENTIALS',
    critical: false,
    valid: hasApnsAuthConfig(),
    help:
      'Required for iOS remote push delivery when native remote push is enabled. Set APNS_TEAM_ID, APNS_KEY_ID, and APNS_AUTH_KEY_P8 (or APNS_AUTH_KEY_P8_FILE).',
  });
}

const nativeChecks = [
  {
    key: 'NATIVE_API_BASE_URL',
    valid:
      !nativeBundledShell ||
      (hasValue(getEnv('VITE_NATIVE_API_BASE_URL')) &&
        !isPlaceholder(getEnv('VITE_NATIVE_API_BASE_URL')) &&
        isHostedUrl(getEnv('VITE_NATIVE_API_BASE_URL'))),
    help:
      'Set VITE_NATIVE_API_BASE_URL to a hosted API root such as https://app.example.com/api because this Capacitor app bundles local web assets.',
  },
  {
    key: 'ANDROID_RELEASE_SIGNING',
    valid:
      (fileExists(path.join('android', 'keystore.properties')) && androidStoreFileExists) ||
      (hasValue(getEnv('ANDROID_SIGNING_STORE_FILE')) &&
        hasValue(getEnv('ANDROID_SIGNING_STORE_PASSWORD')) &&
        hasValue(getEnv('ANDROID_SIGNING_KEY_ALIAS')) &&
        hasValue(getEnv('ANDROID_SIGNING_KEY_PASSWORD'))),
    help:
      'Provide android/keystore.properties plus the keystore file, or set ANDROID_SIGNING_* env vars for signed Play uploads.',
  },
];

if (nativeRemotePushEnabled) {
  nativeChecks.unshift(
    {
      key: 'ANDROID_GOOGLE_SERVICES_JSON',
      valid: fileExists(path.join('android', 'app', 'google-services.json')),
      help: 'Place Firebase google-services.json in android/app before enabling native Android remote push.',
    },
    {
      key: 'IOS_PUSH_PROJECT_SETUP',
      valid: iosPushAppDelegateConfigured() && iosPushEntitlementConfigured(),
      help:
        'Enable the iOS Push Notifications capability and keep the Capacitor AppDelegate remote notification hooks in place for APNs registration.',
    },
  );
}

const criticalFailures = checks.filter((check) => check.critical && !check.valid);
const optionalFailures = checks.filter((check) => !check.critical && !check.valid);
const nativeWarnings = nativeChecks.filter((check) => !check.valid);

console.log('\nBabyCore Production Config Check\n');
for (const check of checks) {
  const symbol = check.valid ? 'PASS' : check.critical ? 'FAIL' : 'WARN';
  console.log(`${symbol.padEnd(5)} ${check.key}`);
}

if (nativeChecks.length > 0) {
  console.log('\nNative Mobile Readiness');
  for (const check of nativeChecks) {
    const symbol = check.valid ? 'PASS' : 'WARN';
    console.log(`${symbol.padEnd(5)} ${check.key}`);
  }
  if (!nativeRemotePushEnabled) {
    console.log('INFO  NATIVE_REMOTE_PUSH_DISABLED (local notifications only)');
  }
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

if (nativeWarnings.length > 0) {
  console.log('\nNative release follow-up:');
  for (const item of nativeWarnings) {
    console.log(`- ${item.key}: ${item.help}`);
  }
}

if (criticalFailures.length > 0) {
  process.exit(1);
}

console.log('\nAll critical production config checks passed.');
