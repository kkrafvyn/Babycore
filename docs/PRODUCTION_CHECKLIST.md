# Cradlyn Production Checklist

## 1) Required Environment Variables

Set these in your production deployment environment before launch:

- `VITE_APP_URL` (`https://app.example.com`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `VITE_SUPABASE_AUTH_REDIRECT_URL`
- Supabase Auth redirect URLs — see [SUPABASE_AUTH_REDIRECT_URLS.md](./SUPABASE_AUTH_REDIRECT_URLS.md). Required native entry: `com.cradlyn.app://auth/callback` (**not** bare `com.cradlyn.app`)
- `VITE_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `VITE_API_BASE_URL` (or keep relative `/api`)
- `PAYSTACK_CALLBACK_URL` (`https://app.example.com`)
- `PAYSTACK_WEBHOOK_URL` (`https://app.example.com/api/payments/webhook/paystack`)

Optional but recommended:

- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SENDGRID_API_KEY` / `RESEND_API_KEY`
- Android native push: `FCM_SERVICE_ACCOUNT_JSON` or the `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` trio
- iOS native push: `APNS_TEAM_ID`, `APNS_KEY_ID`, and `APNS_AUTH_KEY_P8` (or `APNS_AUTH_KEY_P8_FILE`)

## 2) Database Migrations (Production)

Run in order from `database/sql/README.md`:

1. `00-doctor-profiles.sql`
2. Continue every numbered file in sequence through `33-health-logs-and-user-settings.sql`

CLI option:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

After migrations, verify the cross-device sync tables:

```bash
npm run check:schema
```

## 3) End-to-End Verification

Run these checks on production URL:

1. Sign up / login with email.
2. Login with Google and Apple.
3. Onboarding role selection:
   - `baby` path
   - `doctor` path (skip measurement, continue notifications)
   - `caregiver` path
4. Add baby profile and upload avatar/photo.
5. Invite caregiver/doctor by link and by search.
6. Accept invite and verify baby appears in patient list.
7. Create diaper, feeding, sleep, vaccine logs and verify persistence.
8. Trigger push permission + test notification delivery.
9. Complete Paystack premium checkout and verify:
   - `/api/payments/finalize` success
   - `/api/payments/subscription-status` returns active
   - premium-gated features unlock
10. Verify health alerts sync endpoint:
    - `/api/health-alerts/sync-external`
    - `/api/health-alerts/active`
11. Verify webhook endpoints are reachable from provider dashboards:
    - `/api/payments/webhook/paystack` (primary)
    - `/api/webhooks/paystack` (compat)
    - `/api/payments/webhook/flutterwave` (primary)
    - `/api/webhooks/flutterwave` (compat)

## 4) Deployment Validation Commands

```bash
npm run check:prod-config
npm run check:schema
npm run build:full
npm run smoke:prod https://app.example.com
```

If build passes, deploy and smoke test routes:

- `GET /health`
- `GET /api/payments/subscription-status` (authenticated)
- `POST /api/payments/finalize` (authenticated)
