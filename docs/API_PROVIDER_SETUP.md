# API Provider Setup

This file lists the real external providers that BabyCore can use, which ones are required today, and how to get access to each one.

## Required For Current Production

### Supabase

Used for auth, storage, sync, and database access.

You need:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Get them from:

- Supabase Dashboard -> `Settings` -> `API Keys`

Notes:

- Use the publishable key in the browser.
- Use the secret/service key only on the server or in your deployment platform's protected server env vars.

### Paystack

Used for payments in the current app.

You need:

- `VITE_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`

Get them from:

- Paystack Dashboard -> `Settings` -> `API Keys & Webhooks`

Also configure:

- Callback URL: `https://app.example.com`
- Webhook URL: `https://app.example.com/api/payments/webhook/paystack`

### Web Push

Used for browser push notifications.

You need:

- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Generate them with:

```bash
npm run generate:vapid
```

Optional for native/mobile push:

- Android:
- `FCM_SERVICE_ACCOUNT_JSON`
- or `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY`
- iOS:
- `APNS_TEAM_ID`
- `APNS_KEY_ID`
- `APNS_AUTH_KEY_P8`

Get it from:

- Android: Firebase Console / Google Cloud service account with Firebase Cloud Messaging API access
- iOS: Apple Developer APNs auth key (`.p8`) plus your Apple team ID and key ID

### Email Delivery

Pick one provider:

- SMTP
- Resend
- SendGrid

Current code supports:

- `SMTP_*`
- `RESEND_API_KEY`
- `SENDGRID_API_KEY`

## Optional But Useful

### OpenAI

Used only for model-backed Care Copilot responses.

You need:

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

Get it from:

- OpenAI Platform -> API keys

If omitted:

- the app still works with the built-in rules engine

## Wearables: What Actually Needs A Provider

### Current Web App

The current wearable screen does **not** require vendor APIs.

It already supports:

- manual metric entry
- CSV import
- JSON import

That means you can use wearable tracking now without any Fitbit, Apple, or Google integration.

### Apple Health / HealthKit

Important:

- there is no browser API key for Apple Health
- this requires a native iOS app
- this also requires Apple Developer enrollment

You need:

- Apple Developer account
- native iOS app entitlements
- HealthKit capability in Xcode

Official docs:

- https://developer.apple.com/documentation/healthkit/setting-up-healthkit

### Android Health Connect

Important:

- this is the modern Android path
- it is not a browser API key
- it requires an Android app integration

Official docs:

- https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started

### Fitbit

Fitbit is the wearable provider here that does map cleanly to an OAuth-style web/server integration.

You need:

- `FITBIT_CLIENT_ID`
- `FITBIT_CLIENT_SECRET`

Get them from:

- Fitbit developer apps dashboard

Official docs:

- https://dev.fitbit.com/apps

### Google Fit

Do not build new work on Google Fit for this app.

Use Health Connect instead for Android.

Reference:

- https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started

### Oura / Garmin

These are optional future integrations.

You would need:

- partner developer account
- OAuth client credentials

They are not required for the app to function today.

## Recommended Setup Order

1. Supabase
2. Paystack
3. VAPID keys
4. Email provider
5. OpenAI
6. Fitbit only if you want real wearable OAuth
7. Native Apple Health / Health Connect only if you decide to ship iOS/Android health syncing
