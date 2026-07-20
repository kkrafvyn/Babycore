# Complete API Inventory - Cradlyn Application

## Summary
- **Total APIs**: 60+
- **Payment Gateways**: 3 (Paystack, Flutterwave, Stripe)
- **Email Services**: 3 (SendGrid, Resend, SMTP)
- **Health Services**: 3 (WHO, CDC, OpenWeather)
- **Speech Services**: 3 (Google, Azure, AWS)
- **AI/ML Services**: 3 (OpenAI, Anthropic, Hugging Face)
- **Wearables**: 4 (Apple HealthKit, Fitbit, Garmin, Samsung)
- **Cloud Storage**: 2 (AWS S3, Google Cloud Storage)
- **Analytics**: 4 (Sentry, Mixpanel, Google Analytics, LogRocket)

---

## 1. BACKEND API ENDPOINTS (40+ endpoints)

### Health Alerts (4 endpoints)
- `GET /api/health-alerts/active` - Get active regional alerts
- `POST /api/health-alerts/sync-external` - Sync WHO/CDC alerts
- `POST /api/health-alerts/dismiss` - User dismisses alert
- `GET /api/health-alerts/by-region` - Get alerts by region

### Doctor Reports (4 endpoints)
- `POST /api/reports/generate` - Generate PDF report
- `GET /api/reports/shared/:token` - Access shared report
- `POST /api/reports/email` - Email report to doctor
- `GET /api/reports/my-reports` - Get user's reports

### ML/AI Insights (4 endpoints)
- `POST /api/ml/analyze-sleep-patterns` - Sleep analysis
- `POST /api/ml/predict-next-sleep` - Sleep prediction
- `POST /api/ml/predict-milestone` - Milestone prediction
- `POST /api/ml/growth-analysis` - Growth tracking

### Notifications (6 endpoints)
- `POST /api/notifications/subscribe` - Subscribe to push
- `POST /api/notifications/unsubscribe` - Unsubscribe from push
- `POST /api/notifications/send` - Send notification
- `POST /api/notifications/schedule` - Schedule notification
- `POST /api/notifications/health-alert` - Send health alert
- `POST /api/notifications/schedule-reminders` - Schedule reminders

### Payments (5 endpoints + 2 webhooks)
- `POST /api/payments/process-addon` - Process addon payment
- `POST /api/payments/cancel-subscription` - Cancel subscription
- `POST /webhooks/paystack` - Paystack webhook
- `POST /webhooks/flutterwave` - Flutterwave webhook
- `GET /api/payments/subscription-status` - Check subscription
- `POST /api/payments/retry-payment` - Retry failed payment

### Community (8 endpoints)
- `POST /api/community/forums` - Create forum
- `POST /api/community/posts` - Create post
- `GET /api/community/posts/:forumId` - Get posts
- `POST /api/community/playdates` - Create playdate
- `GET /api/community/playdates/nearby` - Find nearby playdates
- `POST /api/community/playdates/:id/join` - Join playdate
- `POST /api/community/follow` - Follow user
- `GET /api/community/feed` - Get community feed

### Email Reports (4 endpoints)
- `POST /api/email-reports/weekly-digest` - Send weekly digest
- `POST /api/email-reports/milestone-announcement` - Milestone email
- `POST /api/email-reports/vaccine-reminder` - Vaccine reminder
- `POST /api/email-reports/subscribe` - Subscribe to emails

### Wearables (6 endpoints)
- `POST /api/wearable/connect-apple-health` - Connect Apple Health
- `POST /api/wearable/connect-fitbit` - Connect Fitbit
- `GET /api/wearable/data` - Get wearable data
- `POST /api/wearable/sync` - Sync wearable data
- `GET /api/wearable/devices` - List connected devices
- `POST /api/wearable/disconnect` - Disconnect device

### Voice Transcription (6 endpoints)
- `POST /api/voice/upload` - Upload voice memo
- `GET /api/voice/logs` - Get voice logs
- `POST /api/voice/analyze-cry` - Analyze cry pattern
- `GET /api/voice/cry-patterns` - Get cry patterns
- `POST /api/voice/transcribe` - Transcribe voice
- `DELETE /api/voice/delete/:id` - Delete voice log

---

## 2. EXTERNAL PAYMENT APIs

### Paystack
```env
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_TEST_SECRET_KEY=sk_test_your_test_key
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret
```
- **Base URL**: https://api.paystack.co
- **Endpoints**:
  - POST /transaction/initialize
  - GET /transaction/verify/:reference
  - POST /subscription/create
  - GET /subscription/:id

### Flutterwave
```env
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_LIVE_your_live_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_LIVE_your_secret_key
FLUTTERWAVE_WEBHOOK_SECRET=your_flutterwave_webhook_secret
```
- **Base URL**: https://api.flutterwave.com/v3
- **Endpoints**:
  - POST /charges
  - GET /transactions/:id/verify
  - POST /subscriptions
  - GET /subscriptions/:id

### Stripe (Future)
```env
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```
- **Base URL**: https://api.stripe.com/v1
- **Endpoints**:
  - POST /payment_intents
  - POST /customers
  - POST /subscriptions

---

## 3. EMAIL SERVICES

### SendGrid
```env
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@babylog.app
```
- **Base URL**: https://api.sendgrid.com/v3
- **Endpoints**:
  - POST /mail/send
  - POST /contacts
  - POST /marketing/contacts

### Resend (Alternative)
```env
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=support@babylog.app
```
- **Base URL**: https://api.resend.com
- **Endpoints**:
  - POST /emails

### SMTP (Fallback)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@babylog.app
```

---

## 4. HEALTH & EPIDEMIC APIs

### WHO (World Health Organization)
```env
VITE_WHO_API_KEY=your_who_api_key
WHO_API_BASE_URL=https://www.who.int/api
WHO_OUTBREAK_ENDPOINT=/outbreak-news-feed
```
- **Endpoints**:
  - GET /outbreak-news-feed
  - GET /disease-statistics

### CDC (Centers for Disease Control)
```env
VITE_CDC_API_KEY=your_cdc_api_key
CDC_API_BASE_URL=https://www.cdc.gov/api/v1
CDC_ALERTS_ENDPOINT=/alerts
```
- **Endpoints**:
  - GET /alerts
  - GET /disease-tracking
  - GET /vaccination-schedules

### OpenWeather
```env
VITE_OPENWEATHER_API_KEY=your_openweather_api_key
OPENWEATHER_API_BASE_URL=https://api.openweathermap.org/data/3.0
```
- **Endpoints**:
  - GET /onecall (weather data)
  - GET /weather (current weather)

---

## 5. SPEECH-TO-TEXT SERVICES

### Google Cloud Speech-to-Text
```env
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_SPEECH_API_KEY=your_google_speech_key
```
- **Base URL**: https://speech.googleapis.com/v1p1beta1
- **Endpoints**:
  - POST /speech:recognize
  - POST /speech:longrunningrecognize

### Azure Speech Services
```env
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_ENDPOINT=https://eastus.tts.speech.microsoft.com
```
- **Endpoints**:
  - POST /speech/recognition/conversation/cognitiveservices/v1
  - POST /cognitiveservices/v1 (text-to-speech)

### AWS Transcribe
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```
- **Endpoints**:
  - POST /transcribe (start transcription)
  - GET /transcribe (get status)

---

## 6. AI/ML SERVICES

### OpenAI
```env
VITE_ML_SERVICE_API_KEY=sk-proj-your_full_key
OPENAI_API_KEY=sk-proj-your_full_key
OPENAI_MODEL=gpt-4
OPENAI_ORGANIZATION=your_org_id
```
- **Base URL**: https://api.openai.com/v1
- **Endpoints**:
  - POST /chat/completions (chat)
  - POST /embeddings (embeddings)
  - POST /images/generations (image generation)

### Anthropic Claude
```env
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
```
- **Base URL**: https://api.anthropic.com
- **Endpoints**:
  - POST /v1/messages

### Hugging Face
```env
HUGGINGFACE_API_KEY=hf_your_huggingface_token
```
- **Base URL**: https://api-inference.huggingface.co
- **Endpoints**:
  - POST /models/{model_id}

---

## 7. WEARABLES & HEALTH INTEGRATIONS

### Apple HealthKit
```env
APPLE_HEALTH_TEAM_ID=your_team_id
APPLE_HEALTH_BUNDLE_ID=com.cradlyn.app
```
- **Native iOS Framework**
- Data types: heart rate, steps, sleep, temperature

### Fitbit
```env
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_client_secret
FITBIT_REDIRECT_URI=https://babylog.app/auth/fitbit/callback
```
- **Base URL**: https://api.fitbit.com/1
- **Endpoints**:
  - GET /user/-/activities/date/[date].json
  - GET /user/-/sleep/date/[date].json
  - GET /user/-/profile.json

### Garmin
```env
GARMIN_CLIENT_ID=your_garmin_client_id
GARMIN_CLIENT_SECRET=your_garmin_client_secret
```
- **Base URL**: https://connectapi.garmin.com
- **Endpoints**:
  - GET /wellness-api/rest/dailySummaryData

### Samsung Health
```env
SAMSUNG_CLIENT_ID=your_samsung_client_id
SAMSUNG_CLIENT_SECRET=your_samsung_client_secret
```
- **Base URL**: https://api.samsunghealth.com
- **Endpoints**:
  - GET /v1/user/profile
  - GET /v1/user/stats

### Google Fit
```env
GOOGLE_FIT_CLIENT_ID=your_google_fit_client_id
GOOGLE_FIT_CLIENT_SECRET=your_google_fit_client_secret
```
- **Base URL**: https://www.googleapis.com/fitness/v1
- **Endpoints**:
  - POST /users/me/dataset:aggregate
  - GET /users/me/dataSources

---

## 8. CLOUD STORAGE

### AWS S3
```env
AWS_S3_BUCKET=babylog-storage
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```
- **Base URL**: https://s3.amazonaws.com

### Google Cloud Storage
```env
GCS_BUCKET=babylog-gcs-bucket
GCS_PROJECT_ID=your_gcp_project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```
- **Base URL**: https://storage.googleapis.com

---

## 9. ANALYTICS & MONITORING

### Sentry (Error Tracking)
```env
SENTRY_DSN=https://your_sentry_dsn@sentry.io/your_project_id
SENTRY_ENVIRONMENT=development
```
- **Base URL**: https://sentry.io
- **Endpoints**: Error/exception reporting

### Mixpanel (Analytics)
```env
MIXPANEL_TOKEN=your_mixpanel_token
```
- **Base URL**: https://api.mixpanel.com
- **Endpoints**: Event tracking

### Google Analytics
```env
GOOGLE_ANALYTICS_ID=GA-your-id
```
- **Base URL**: https://www.google-analytics.com
- **Endpoints**: Page view tracking

### LogRocket (Session Replay)
```env
LOGROCKET_ID=babylog/babylog
```
- **Base URL**: https://app.logrocket.com
- **Endpoints**: Session recording

---

## 10. DATABASE & BACKEND

### Supabase (PostgreSQL)
```env
VITE_SUPABASE_URL=https://mohragovqqyhssnkyigh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nVPQQ38IJ3C41r4YzAsRPA_ZVTikN9R
SUPABASE_URL=https://mohragovqqyhssnkyigh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```
- **Base URL**: https://mohragovqqyhssnkyigh.supabase.co
- **Services**:
  - PostgreSQL Database
  - Real-time subscriptions
  - Authentication
  - Edge Functions
  - Storage

---

## 11. PWA & NOTIFICATIONS

### Web Push Notifications (VAPID)
```env
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:support@babylog.app
```
- **Service**: Web Push API
- **Endpoints**: Service Worker push notifications

---

## Environment Variables Quick Reference

| Category | Count | Priority |
|----------|-------|----------|
| Database | 2 | HIGH |
| Authentication | 3 | HIGH |
| Payments | 9 | HIGH |
| Email | 6 | HIGH |
| Health APIs | 3 | MEDIUM |
| Speech Services | 7 | MEDIUM |
| AI/ML | 3 | MEDIUM |
| Wearables | 5 | LOW |
| Cloud Storage | 4 | MEDIUM |
| Analytics | 4 | LOW |
| Notifications | 3 | HIGH |
| Feature Flags | 9 | MEDIUM |
| **TOTAL** | **62** | |

---

## Setup Instructions

### Development Environment
1. Copy `.env.example` to `.env`
2. Fill in development API keys (test/sandbox keys)
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start development server

### Production Environment
1. Create production `.env` file
2. Use **LIVE** API keys (not test/sandbox)
3. Set `NODE_ENV=production`
4. Set `VITE_DEBUG=false`
5. Deploy with `npm run build`

---

## API Integration Status

| Service | Status | Priority |
|---------|--------|----------|
| Supabase | ✅ Integrated | HIGH |
| Paystack | ✅ Integrated | HIGH |
| Flutterwave | ✅ Integrated | HIGH |
| SendGrid | ✅ Integrated | HIGH |
| WHO | ✅ Integrated | MEDIUM |
| CDC | ✅ Integrated | MEDIUM |
| Google Speech | ✅ Implemented | MEDIUM |
| OpenAI | ✅ Implemented | MEDIUM |
| Fitbit | ✅ OAuth Ready | LOW |
| Stripe | 🔄 Ready for integration | FUTURE |
| Google Fit | 🔄 Ready for integration | FUTURE |
| Samsung Health | 🔄 Ready for integration | FUTURE |

---

**Last Updated**: April 23, 2026
**Total Endpoints**: 60+
**Total External Services**: 30+
