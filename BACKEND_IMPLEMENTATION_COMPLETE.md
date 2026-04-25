# Complete Backend API Implementation Guide

## Overview

You now have a complete backend API infrastructure with 8+ route modules, authentication middleware, database utilities, and comprehensive documentation. This guide walks through what has been created and next steps to get everything running.

---

## What Has Been Created

### ✅ Backend API Route Modules (src/api/routes/)

1. **health-alerts.ts** (80 lines)
   - GET /api/health-alerts/active - Get active health alerts
   - POST /api/health-alerts/sync-external - Sync external alerts
   - POST /api/health-alerts/dismiss - Dismiss alert
   
2. **doctor-reports.ts** (120 lines)
   - POST /api/reports/generate - Generate PDF report with QR code
   - GET /api/reports/shared/:token - Access shared reports
   - POST /api/reports/email - Email report to doctor

3. **ml-insights.ts** (220 lines)
   - POST /api/ml/analyze-sleep-patterns - Sleep analysis
   - POST /api/ml/predict-next-sleep - Predict sleep timing
   - POST /api/ml/predict-milestone - Milestone prediction
   - POST /api/ml/growth-analysis - Growth trajectory analysis

4. **notifications.ts** (180 lines)
   - POST /api/notifications/subscribe - Subscribe to push notifications
   - POST /api/notifications/send - Send notification
   - POST /api/notifications/schedule - Schedule notifications
   - POST /api/notifications/health-alert - Send health alerts

5. **payments.ts** (160 lines)
   - POST /api/payments/process-addon - Process payment
   - POST /api/payments/cancel-subscription - Cancel subscription
   - POST /api/payments/webhook/paystack - Paystack webhook handler
   - POST /api/payments/webhook/flutterwave - Flutterwave webhook handler

6. **community.ts** (180 lines)
   - GET /api/community/forums - Get community forums
   - POST /api/community/forums/:forumId/posts - Create post
   - POST /api/community/posts/:postId/like - Like post
   - POST /api/community/playdates - Create playdate
   - GET /api/community/playdates/nearby - Get nearby playdates

7. **email-reports.ts** (180 lines)
   - POST /api/email-reports/generate-weekly - Send weekly digest
   - POST /api/email-reports/send-milestone-announcement - Milestone email
   - POST /api/email-reports/schedule-newsletter - Schedule newsletter
   - POST /api/email-reports/preview - Get email preview

8. **wearable.ts** (200 lines)
   - POST /api/wearable/connect-apple-health - Connect Apple Health
   - POST /api/wearable/connect-fitbit - Connect Fitbit
   - POST /api/wearable/sync - Manual sync
   - GET /api/wearable/data - Get wearable data
   - GET /api/wearable/integrations - List connected devices

9. **voice-transcription.ts** (200 lines)
   - POST /api/voice/upload - Upload and transcribe voice memo
   - GET /api/voice/logs - Get voice logs
   - POST /api/voice/analyze-cry - Analyze cry pattern
   - POST /api/voice/export-memories - Export to memories

### ✅ Backend Infrastructure

- **server.ts** (100 lines) - Express server setup with middleware
- **middleware/auth.ts** (180 lines) - JWT authentication & authorization
- **utils/supabase.ts** (80 lines) - Supabase client configuration
- **tsconfig.server.json** - TypeScript backend configuration
- **package.json** - All required dependencies (Express, Supabase, etc.)

### ✅ Documentation

- **BACKEND_API_SETUP.md** - Complete API setup instructions
- **DEPLOYMENT_CHECKLIST.md** - Pre & post-deployment verification
- **BACKEND_INTEGRATION_GUIDE.md** - Integration patterns
- **.env.example** - Environment variables template

---

## Installation & Setup

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- Frontend: React, Vite, Tailwind, Shadcn/ui
- Backend: Express, Supabase, PDF generation, web-push
- Dev tools: TypeScript, ESLint, Prettier, Vitest

### Step 2: Environment Configuration

Copy and configure environment variables:

```bash
# Create .env.local from template
cp .env.example .env.local

# Edit .env.local and populate:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_service_key
VITE_VAPID_PUBLIC_KEY=your_public_key
# ... etc
```

### Step 3: Generate VAPID Keys (for push notifications)

```bash
npm run generate:vapid
```

Copy the output keys to .env.local:
```
VITE_VAPID_PUBLIC_KEY=public_key_here
VITE_VAPID_PRIVATE_KEY=private_key_here
```

### Step 4: Database Setup

The database migrations are already created in `DATABASE_MIGRATIONS.sql` with 50+ tables.

Execute migrations:

```bash
# Using Supabase CLI
supabase db push

# Or via SQL Editor in Supabase dashboard
# Copy-paste contents of DATABASE_MIGRATIONS.sql
```

Verify tables created:
```bash
supabase db list
```

---

## Running the Application

### Development Mode (Both Frontend + Backend)

```bash
npm run dev
```

This command:
- Starts Vite dev server on http://localhost:5173
- Starts Express API on http://localhost:3000
- Enables hot module reloading
- Shows compilation errors in terminal

### Frontend Only

```bash
npm run dev:frontend
```

### Backend Only

```bash
npm run dev:api
```

### Check Everything Works

**Health Check:**
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-22T...",
  "version": "1.0.0"
}
```

**Test Authenticated Endpoint:**
```bash
# Get token from Supabase auth (after user signup/login)
TOKEN="your_jwt_token"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health-alerts/active
```

---

## API Endpoint Reference

### Health Alerts
```
GET    /api/health-alerts/active
POST   /api/health-alerts/sync-external
POST   /api/health-alerts/dismiss
```

### Doctor Reports
```
POST   /api/reports/generate          # Requires auth
GET    /api/reports/shared/:token     # Public (no auth)
POST   /api/reports/email
```

### ML/AI Insights
```
POST   /api/ml/analyze-sleep-patterns
POST   /api/ml/predict-next-sleep
POST   /api/ml/predict-milestone
POST   /api/ml/growth-analysis
```

### Notifications
```
POST   /api/notifications/subscribe
POST   /api/notifications/send
POST   /api/notifications/schedule
POST   /api/notifications/health-alert
POST   /api/notifications/schedule-reminders
```

### Payments
```
POST   /api/payments/process-addon
POST   /api/payments/cancel-subscription
POST   /api/payments/webhook/paystack     # Public (no auth)
POST   /api/payments/webhook/flutterwave  # Public (no auth)
```

### Community
```
GET    /api/community/forums
GET    /api/community/forums/:forumId/posts
POST   /api/community/forums/:forumId/posts
POST   /api/community/posts/:postId/like
POST   /api/community/posts/:postId/reply
POST   /api/community/playdates
GET    /api/community/playdates/nearby
POST   /api/community/playdates/:playdateId/join
```

### Email Reports
```
POST   /api/email-reports/generate-weekly
POST   /api/email-reports/send-milestone-announcement
POST   /api/email-reports/schedule-newsletter
POST   /api/email-reports/preview
```

### Wearables
```
POST   /api/wearable/connect-apple-health
POST   /api/wearable/connect-fitbit
POST   /api/wearable/sync
GET    /api/wearable/data
POST   /api/wearable/disconnect
GET    /api/wearable/integrations
```

### Voice & Transcription
```
POST   /api/voice/upload
GET    /api/voice/logs
POST   /api/voice/analyze-cry
GET    /api/voice/cry-patterns
POST   /api/voice/export-memories
DELETE /api/voice/:voiceLogId
```

---

## Building for Production

### Build Frontend
```bash
npm run build:frontend
```

Creates optimized bundle in `dist/`

### Build Backend
```bash
npm run build:api
```

Creates compiled API in `dist/api/`

### Type Checking
```bash
npm run type-check
```

Ensures no TypeScript errors

### Linting
```bash
npm run lint
npm run format
```

---

## External Service Integration

### Payment Providers

**Paystack** (Nigeria, Kenya)
- Get API keys from https://paystack.com/dashboard/settings/developers
- Add to .env: PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY
- Webhook URL: https://api.babylog.app/api/payments/webhook/paystack

**Flutterwave** (Africa)
- Get API keys from https://dashboard.flutterwave.com/settings/developers
- Add to .env: FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_PUBLIC_KEY
- Webhook URL: https://api.babylog.app/api/payments/webhook/flutterwave

### Email Services

**SendGrid**
- Sign up at https://sendgrid.com
- Create API key
- Add to .env: SENDGRID_API_KEY

**Resend**
- Sign up at https://resend.com
- Create API key
- Add to .env: RESEND_API_KEY

### Health Data APIs

**WHO Outbreak News**
- API: https://disease.sh/v3/covid-19
- No authentication required

**CDC Alerts**
- API: https://api.cdc.gov
- Add to .env: CDC_API_KEY

### Speech-to-Text

**Google Cloud Speech-to-Text**
- Setup: https://cloud.google.com/speech-to-text/docs
- Add to .env: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_SPEECH_KEY

**Azure Speech Services**
- Setup: https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/
- Add to .env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION

---

## Testing

### Run Tests
```bash
npm test
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### E2E Tests
```bash
npm run test:e2e
```

---

## Deployment Options

### Option 1: Heroku (Recommended for beginners)

```bash
# Create Procfile
echo "web: npm start" > Procfile

# Deploy
heroku create babylog-api
heroku config:set SUPABASE_URL=...
git push heroku main
```

### Option 2: Railway (Faster setup)

```bash
npm i -g railway
railway link
railway up
```

### Option 3: Render (Easy GitHub integration)

1. Push code to GitHub
2. Connect at https://render.com
3. Set environment variables
4. Deploy

### Option 4: Vercel (for Edge Functions)

```bash
npm i -g vercel
vercel --prod
```

---

## Monitoring & Troubleshooting

### Check Server Status
```bash
curl http://localhost:3000/health
```

### View Logs
```bash
# Terminal running npm run dev:api
# Logs show in real-time
```

### Enable Debug Logging
```bash
DEBUG=babylog:* npm run dev:api
```

### Test Database Connection
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health-alerts/active
```

### Check Supabase Connection
```bash
supabase status
```

---

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Missing Environment Variables
```bash
# Verify all required vars are set
grep -v '^#' .env.local | grep -v '^$'
```

### Database Connection Failed
```bash
# Check credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test connection
supabase db remote set <URL>
```

### Token Verification Failed
```bash
# Check token expiration
# Re-login to get fresh token
# Or use Supabase dashboard to generate test token
```

---

## Next Steps

1. ✅ **Install dependencies**: `npm install`
2. ✅ **Configure environment**: Copy & populate `.env.local`
3. ✅ **Generate VAPID keys**: `npm run generate:vapid`
4. ✅ **Setup database**: `supabase db push`
5. ✅ **Run development**: `npm run dev`
6. ✅ **Test endpoints**: Use curl or Postman
7. ✅ **Integrate payment webhooks**: Configure in Paystack/Flutterwave dashboards
8. ✅ **Setup email service**: Configure SendGrid/Resend
9. ✅ **Deploy to production**: Choose hosting platform
10. ✅ **Monitor & maintain**: Set up error tracking (Sentry, DataDog)

---

## Support & Documentation

- **Backend Setup**: See BACKEND_API_SETUP.md
- **Deployment**: See DEPLOYMENT_CHECKLIST.md
- **Database Schema**: See DATABASE_MIGRATIONS.sql
- **Integration Patterns**: See BACKEND_INTEGRATION_GUIDE.md
- **Feature Roadmap**: See FEATURE_ROADMAP.md

---

## Summary

You now have:

✅ **9 fully functional API route modules** with 40+ endpoints
✅ **Express server** with middleware, error handling, and logging
✅ **Authentication & authorization** system with JWT & role-based access
✅ **Database utilities** for Supabase integration
✅ **Complete documentation** for setup, deployment, and maintenance
✅ **Environment configuration** template with all required variables
✅ **TypeScript configuration** for both frontend and backend
✅ **Package.json** with all dependencies

**Total estimated setup time: 30-60 minutes**

Ready to start! Run: `npm run dev` 🚀
