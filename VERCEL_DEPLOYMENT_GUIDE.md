# BabyLog Vercel Deployment Guide

**Status**: ✅ Ready for Production Deployment  
**Last Updated**: April 25, 2026  
**Framework**: Vite + Express.js + React

---

## 📋 Pre-Deployment Checklist

- [ ] All SQL migrations executed in Supabase
- [ ] Docker image built and tested locally
- [ ] Environment variables prepared for production
- [ ] Payment gateways configured (Paystack/Flutterwave/Stripe)
- [ ] Email service configured (SendGrid/Resend/SMTP)
- [ ] Database backups completed
- [ ] SSL certificates ready
- [ ] Custom domain configured
- [ ] CORS settings updated
- [ ] Sentry/monitoring configured

---

## 🚀 Step 1: Prepare Vercel Account

### 1.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Create a new organization (optional)
4. Authorize Vercel to access your GitHub repositories

### 1.2 Import BabyLog Repository
1. In Vercel dashboard, click "Add New" → "Project"
2. Select your GitHub repository
3. Vercel will auto-detect Vite configuration
4. Click "Import"

---

## 🔧 Step 2: Configure Environment Variables in Vercel

### 2.1 Add Environment Variables
In Vercel project dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add all variables from `.env.production.example`

**Critical Variables** (REQUIRED):
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_key
VITE_PAYSTACK_LIVE_SECRET_KEY=your_paystack_secret
SENDGRID_API_KEY=your_sendgrid_key
OPENAI_API_KEY=your_openai_key
```

### 2.2 Set Different Environments
In Vercel, configure variables for different environments:
- **Production**: Live API keys
- **Preview**: Test/staging keys (optional)
- **Development**: Local dev keys (optional)

Example:
```
Environment: Production
VITE_SUPABASE_URL: https://your-prod-project.supabase.co
OPENAI_API_KEY: sk_prod_your_key

Environment: Preview
VITE_SUPABASE_URL: https://your-staging-project.supabase.co
OPENAI_API_KEY: sk_test_your_key
```

---

## 📦 Step 3: Deployment Optimization

### 3.1 Build Configuration
Vercel will automatically:
- Run `npm run build` command from package.json
- Build frontend with Vite
- Build backend with TypeScript
- Generate output in `dist/` folder

### 3.2 Monorepo Structure (if needed)
If using monorepo pattern, configure `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps"
}
```

### 3.3 API Routes Setup
The `vercel.json` file already configured for:
- Express.js API routes at `/api/*`
- Static frontend at `/`
- Serverless functions deployment
- Environment variable support

---

## 🗄️ Step 4: Database Deployment

### 4.1 Supabase Production Setup
1. Create production Supabase project
2. In Supabase dashboard → SQL Editor
3. Run all migrations from:
   - `DATABASE_SCHEMA.sql`
   - `SUBSCRIPTION_TABLES.sql`
   - `DATABASE_MIGRATIONS.sql`
   - `DOCTOR_ROLE_SCHEMA.sql`

### 4.2 Enable Security Features
In Supabase dashboard:
1. **Authentication** → Configure OAuth providers
2. **Database** → Enable Row Level Security (RLS)
3. **Storage** → Configure bucket policies
4. **Realtime** → Enable for specific tables

---

## 💳 Step 5: Payment Gateway Setup

### 5.1 Paystack Configuration
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Settings → API Keys & Webhooks
3. Copy live public and secret keys
4. Add to Vercel environment variables
5. Configure webhook URL: `https://babylog.app/api/payments/paystack/webhook`

### 5.2 Flutterwave Configuration
1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Settings → API → Copy live keys
3. Add to Vercel environment variables
4. Configure webhook URL: `https://babylog.app/api/payments/flutterwave/webhook`

### 5.3 Stripe Configuration (Future)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Developers → API Keys
3. Copy live keys
4. Add to Vercel environment variables

---

## 📧 Step 6: Email Service Configuration

### 6.1 SendGrid Setup
1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Settings → API Keys
3. Create new API key with full access
4. Copy and add to Vercel environment variables

**Sender Authentication**:
1. Settings → Sender Authentication
2. Create domain CNAME records
3. Verify domain ownership

### 6.2 Alternative: Resend Setup
1. Go to [Resend Dashboard](https://resend.com/)
2. API Keys section
3. Create new API key
4. Add to Vercel environment variables

---

## 🔔 Step 7: Notifications & Monitoring

### 7.1 Sentry Setup (Error Tracking)
1. Go to [Sentry.io](https://sentry.io/)
2. Create new project
3. Select React + Node.js
4. Copy DSN
5. Add to Vercel: `SENTRY_DSN=your_dsn`

### 7.2 Vercel Analytics
1. In Vercel dashboard → Analytics tab
2. Enable Web Analytics
3. View performance metrics automatically

### 7.3 Custom Domain Setup
1. In Vercel dashboard → Settings → Domains
2. Add custom domain: `babylog.app`
3. Configure DNS records:
   - A Record: `76.76.19.163`
   - CNAME Record: `cname.vercel.com.`

---

## 🚢 Step 8: Deploy to Production

### 8.1 Automatic Deployment
Once repository is linked, Vercel will:
- Auto-deploy on `main` branch push
- Create preview deployments for pull requests
- Run deployment checks

### 8.2 Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy production
vercel --prod

# Deploy preview
vercel
```

### 8.3 Monitor Deployment
1. Go to Vercel project dashboard
2. Check **Deployments** tab
3. View build logs and status
4. Monitor **Functions** for API usage

---

## ✅ Post-Deployment Verification

### 9.1 Test Frontend
- [ ] Navigate to https://babylog.app
- [ ] Check page loads correctly
- [ ] Verify responsive design (mobile/tablet/desktop)
- [ ] Test user authentication
- [ ] Verify no console errors

### 9.2 Test Backend APIs
```bash
# Test API endpoint
curl https://babylog.app/api/health

# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" https://babylog.app/api/babies

# Test payment webhook
curl -X POST https://babylog.app/api/payments/paystack/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.success"}'
```

### 9.3 Test Payment Processing
- [ ] Create test subscription
- [ ] Process test payment (use Paystack test keys)
- [ ] Verify webhook received
- [ ] Check database records

### 9.4 Test Email Notifications
- [ ] Trigger welcome email
- [ ] Verify email delivery
- [ ] Check SendGrid dashboard for stats

### 9.5 Monitor Performance
1. Vercel Analytics → View Core Web Vitals
2. Lighthouse → Run performance audit
3. Check API response times
4. Monitor database query performance

---

## 🔒 Security Configuration

### 10.1 HTTPS & SSL
- ✅ Automatically configured by Vercel
- Custom domain SSL certificate auto-provisioned

### 10.2 CORS Configuration
```env
CORS_ORIGIN=https://babylog.app,https://www.babylog.app
```

### 10.3 Rate Limiting
Configure in Express middleware:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 10.4 Environment Variable Security
- ✅ Vercel encrypts all environment variables
- No secrets visible in logs
- Use different keys for different environments

---

## 📊 Production Monitoring

### 11.1 Health Check Endpoint
```bash
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-25T10:30:00Z",
  "version": "1.0.0"
}
```

### 11.2 Key Metrics to Monitor
- API response time (should be < 200ms)
- Database query time (should be < 100ms)
- Error rate (should be < 0.1%)
- Payment success rate (should be > 99%)

### 11.3 Logging
- All logs sent to Sentry
- Access logs to Vercel analytics
- Database logs in Supabase dashboard

---

## 🐛 Troubleshooting

### Issue: Build fails on Vercel
**Solution:**
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Run `npm run build` locally to test
4. Check `package.json` build script

### Issue: API routes not working
**Solution:**
1. Verify `vercel.json` routes configuration
2. Check environment variables in Vercel
3. Test API endpoint directly: `curl https://babylog.app/api/babies`
4. Check Vercel function logs

### Issue: Database connection failing
**Solution:**
1. Verify `VITE_SUPABASE_URL` is correct
2. Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is correct
3. Check Supabase project status
4. Verify RLS policies allow access

### Issue: Payments not processing
**Solution:**
1. Verify Paystack/Flutterwave keys are correct
2. Check webhook URL is accessible
3. Verify webhook secret is set
4. Test webhook manually

---

## 🔄 Continuous Integration/Deployment

### 12.1 GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: vercel/action@master
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### 12.2 Preview Deployments
- Every pull request gets automatic preview deployment
- Share preview URL with team for testing
- Automatic cleanup after PR merge

---

## 📈 Scaling Recommendations

For handling 100K+ users:

1. **Database**: Enable Supabase read replicas
2. **CDN**: Vercel CDN automatically caches assets
3. **API**: Scale by distributing requests across edge nodes
4. **Background Jobs**: Use Vercel Cron Jobs or external service
5. **Storage**: Use Supabase Storage or AWS S3

---

## 📞 Support & Rollback

### Quick Rollback
If deployment has issues:
1. Vercel dashboard → Deployments
2. Click previous successful deployment
3. Click "Redeploy"

### Database Rollback
If migration fails:
1. Supabase dashboard → SQL Editor
2. Run rollback migration
3. Verify data integrity

---

## ✨ Final Deployment Command

Once everything is configured:

```bash
# Deploy to production
npm run build && git add . && git commit -m "Ready for production" && git push origin main
```

Vercel will automatically deploy! 🎉

