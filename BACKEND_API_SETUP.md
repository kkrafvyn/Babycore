# Backend API Setup Guide

## Overview

This guide covers setting up the backend API endpoints for all BabyLog premium features. The API includes:

- **Health Alerts** - Epidemic/outbreak tracking
- **Doctor Reports** - PDF generation with QR codes
- **ML/AI Insights** - Pattern analysis & predictions
- **Push Notifications** - PWA notification delivery
- **Payments** - Subscription & add-on processing

---

## Architecture Options

### Option 1: Express.js (Node.js)
Best for: Quick setup, JavaScript consistency

```bash
npm install express cors dotenv
npm install typescript @types/express @types/node --save-dev
```

### Option 2: Supabase Edge Functions
Best for: Serverless, automatic scaling, easy deployment

```bash
npm install -g supabase
supabase functions create health-alerts
supabase functions create doctor-reports
# ... etc
```

### Option 3: AWS Lambda + API Gateway
Best for: Enterprise, high volume, integrations

### Option 4: Vercel Functions
Best for: Tight Next.js integration, hosting

---

## Setup Instructions

### Step 1: Create Backend Project Structure

```powershell
# Create API directory
mkdir src/api
mkdir src/api/routes
mkdir src/api/middleware
mkdir src/api/utils
mkdir src/api/types

# Create files
touch src/api/server.ts
touch src/api/middleware/auth.ts
touch src/api/utils/supabase.ts
```

### Step 2: Install Dependencies

```bash
npm install \
  express \
  cors \
  dotenv \
  pdfkit \
  qrcode \
  web-push \
  axios \
  uuid \
  supabase \
  @supabase/supabase-js

npm install -D typescript @types/express @types/node @types/pdfkit
```

### Step 3: Create Express Server

Create `src/api/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authMiddleware from './middleware/auth';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use('/api/health-alerts', require('./routes/health-alerts'));
app.use('/api/reports', require('./routes/doctor-reports'));
app.use('/api/ml', require('./routes/ml-insights'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Step 4: Create Authentication Middleware

Create `src/api/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';

export interface AuthRequest extends Request {
  user?: any;
}

export default async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
```

### Step 5: Configure Environment Variables

Create `.env.local`:

```bash
# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Payments
PAYSTACK_SECRET_KEY=sk_live_xxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_xxxx
STRIPE_SECRET_KEY=sk_xxxx

# Notifications
VAPID_SUBJECT=mailto:notifications@example.com
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# External APIs
WHO_API_KEY=your_who_key
CDC_API_KEY=your_cdc_key
OPENWEATHER_API_KEY=your_weather_key

# Email Service
EMAIL_SERVICE=sendgrid # or resend
SENDGRID_API_KEY=your_sendgrid_key
RESEND_API_KEY=your_resend_key
```

### Step 6: Add API Routes to Frontend

Create `src/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('sb-auth-token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API error');
  }

  return response.json();
}

// Health Alerts
export const healthAlertsAPI = {
  getActive: () => fetchAPI('/health-alerts/active'),
  syncExternal: () => fetchAPI('/health-alerts/sync-external', { method: 'POST' }),
  dismiss: (alertId: string) => 
    fetchAPI('/health-alerts/dismiss', {
      method: 'POST',
      body: JSON.stringify({ alertId }),
    }),
};

// Doctor Reports
export const reportAPI = {
  generate: (babyId: string, reportType: string, includeData: string[]) =>
    fetchAPI('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ babyId, reportType, includeData }),
    }),
  getShared: (token: string) => fetchAPI(`/reports/shared/${token}`),
  email: (reportId: string, doctorEmail: string) =>
    fetchAPI('/reports/email', {
      method: 'POST',
      body: JSON.stringify({ reportId, doctorEmail }),
    }),
};

// ML Insights
export const mlAPI = {
  analyzeSleep: (babyId: string, daysBack?: number) =>
    fetchAPI('/ml/analyze-sleep-patterns', {
      method: 'POST',
      body: JSON.stringify({ babyId, daysBack }),
    }),
  predictNextSleep: (babyId: string) =>
    fetchAPI('/ml/predict-next-sleep', {
      method: 'POST',
      body: JSON.stringify({ babyId }),
    }),
  predictMilestone: (babyId: string, milestone: string) =>
    fetchAPI('/ml/predict-milestone', {
      method: 'POST',
      body: JSON.stringify({ babyId, milestone }),
    }),
};

// Notifications
export const notificationsAPI = {
  subscribe: (subscription: any) =>
    fetchAPI('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    }),
  schedule: (title: string, body: string, scheduledFor: string) =>
    fetchAPI('/notifications/schedule', {
      method: 'POST',
      body: JSON.stringify({ title, body, scheduledFor }),
    }),
};

// Payments
export const paymentsAPI = {
  processAddon: (addonId: string, paymentMethod: string, amount: number) =>
    fetchAPI('/payments/process-addon', {
      method: 'POST',
      body: JSON.stringify({ addonId, paymentMethod, amount }),
    }),
  cancelSubscription: (subscriptionId: string) =>
    fetchAPI('/payments/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    }),
};
```

### Step 7: Start Development Server

```bash
# Terminal 1: Start backend
npm run dev:api

# Terminal 2: Start frontend
npm run dev

# Or use the configured task:
npm run dev
```

---

## Deployment Options

### Option A: Deploy to Heroku

```bash
# Create Procfile
echo "web: node dist/api/server.js" > Procfile

# Deploy
heroku create baby-log-api
heroku config:set SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
git push heroku main
```

### Option B: Deploy to Railway

```bash
# Install Railway CLI
npm i -g railway

# Deploy
railway link
railway up
```

### Option C: Deploy to Render

1. Push to GitHub
2. Connect repository to Render
3. Set environment variables
4. Deploy

### Option D: Deploy to Vercel Functions

```bash
# Move API to API directory
mv src/api/routes vercel/functions/

# Deploy
vercel
```

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Health Alerts
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/health-alerts/active
```

### Generate Report
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "babyId": "baby-123",
    "reportType": "pediatrician",
    "includeData": ["vaccinations", "allergies"]
  }' \
  http://localhost:3000/api/reports/generate
```

---

## Cron Jobs & Scheduled Tasks

### Option 1: Using node-cron

```typescript
import cron from 'node-cron';

// Sync health alerts daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Syncing health alerts...');
  // Call syncExternalHealthAlerts
});

// Process scheduled notifications every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  // Call processScheduledNotifications
});
```

### Option 2: Using Supabase Functions

```bash
supabase functions deploy sync-alerts --no-verify
```

### Option 3: Using External Cron Service

- EasyCron.com
- Cronhub.io
- AWS EventBridge

---

## Monitoring & Logging

### Add Logging Middleware

```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
```

### Monitor in Production

- Use DataDog, New Relic, or Sentry
- Set up alerts for errors
- Track API performance metrics

---

## Security Checklist

- ✅ Use environment variables for secrets
- ✅ Validate all input
- ✅ Implement rate limiting
- ✅ Use HTTPS in production
- ✅ Set CORS properly
- ✅ Verify JWT tokens
- ✅ Log security events
- ✅ Monitor for suspicious activity

---

## Next Steps

1. ✅ Set up Express server
2. ✅ Configure Supabase connection
3. ✅ Implement authentication
4. ✅ Deploy to hosting platform
5. ✅ Configure payment webhooks
6. ✅ Set up cron jobs
7. ✅ Monitor and maintain

**Estimated time to full setup: 2-4 hours**
