# BabyCore Production Checklist

## 1) Required Environment Variables

Set these in Vercel Project Settings before production deployment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `VITE_SUPABASE_AUTH_REDIRECT_URL`
- `VITE_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `VITE_API_BASE_URL` (or keep relative `/api`)

Optional but recommended:

- `VITE_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SENDGRID_API_KEY` / `RESEND_API_KEY`

## 2) Database Migrations (Production)

Run in order from `database/sql/README.md`:

1. `00-doctor-profiles.sql`
2. `01` through `26` in sequence

CLI option:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
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

## 4) Deployment Validation Commands

```bash
npm run build:full
```

If build passes, deploy and smoke test routes:

- `GET /health`
- `GET /api/payments/subscription-status` (authenticated)
- `POST /api/payments/finalize` (authenticated)
