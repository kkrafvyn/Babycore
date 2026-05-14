# Production Deployment Checklist

## Pre-Deployment Verification (1-2 days before)

### Code Quality
- [ ] Run TypeScript compiler (`tsc --noEmit`)
- [ ] Run linter (`eslint src/`)
- [ ] All tests passing (`npm test`)
- [ ] No console.log() statements left in production code
- [ ] Git repository clean (commit all changes)
- [ ] Secrets not committed (check .gitignore)

### Environment Setup
- [ ] `.env.example` updated with all required variables
- [ ] `.env.local` created with all secrets
- [ ] No hardcoded URLs or API keys
- [ ] Different configs for dev/staging/prod

### Database
- [ ] All migrations tested locally
- [ ] Database backup created
- [ ] RLS policies reviewed and tested
- [ ] Indexes created for all frequently queried fields
- [ ] Test data cleaned up

### Frontend
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in browser
- [ ] Responsive design tested on multiple devices
- [ ] Performance acceptable (Lighthouse > 80)
- [ ] All features tested manually
- [ ] PWA manifest verified

### Backend API
- [ ] All endpoints tested with real data
- [ ] Error handling in place
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Authentication middleware tested
- [ ] Logging enabled

### External Services
- [ ] Supabase project ready
- [ ] Payment gateway configured (Paystack/Flutterwave)
- [ ] Email service credentials obtained
- [ ] VAPID keys generated for notifications
- [ ] External API keys obtained (WHO, CDC, etc.)

---

## Deployment Day Checklist

### 1. Database Setup (30 min)

```bash
# Backup existing data (if upgrading)
supabase db dump --db-url $SUPABASE_URL > backup.sql

# Execute migrations
supabase db push

# Verify all tables created
supabase db list

# Test data access
npm run test:db-connection
```

- [ ] Database migrations completed
- [ ] All tables created
- [ ] Indexes created
- [ ] RLS policies enabled
- [ ] Storage buckets created

### 2. Environment Configuration (15 min)

Create production `.env` file with:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=<prod_anon_key>

# API
VITE_API_BASE_URL=https://app.example.com/api
NODE_ENV=production

# Payments
PAYSTACK_SECRET_KEY=<live_key>
FLUTTERWAVE_SECRET_KEY=<live_key>

# Notifications
VITE_VAPID_PUBLIC_KEY=<public_key>
VITE_VAPID_PRIVATE_KEY=<private_key>

# Email
SENDGRID_API_KEY=<live_key>

# External APIs
WHO_API_KEY=<key>
CDC_API_KEY=<key>

# Feature Flags
VITE_ENABLE_HEALTH_ALERTS=true
VITE_ENABLE_PREMIUM_FEATURES=true
```

- [ ] All environment variables set
- [ ] API base URL correct
- [ ] Payment keys live (not test)
- [ ] No hardcoded localhost URLs

### 3. Frontend Deployment (10 min)

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Deploy to hosting (your platform of choice)
# or
npm run deploy
```

- [ ] Build succeeds
- [ ] Production build tested locally
- [ ] CDN cache cleared
- [ ] SSL certificate valid
- [ ] Domain DNS updated (if needed)

### 4. Backend Deployment (20 min)

```bash
# Build backend
npm run build:api

# Deploy to hosting platform
# Heroku: git push heroku main
# Railway: railway up
# Or use your host's CLI / dashboard deploy flow

# Verify deployment
curl https://app.example.com/api/health
```

- [ ] API deployed
- [ ] All endpoints accessible
- [ ] Health check passing
- [ ] Logs visible in dashboard

### 5. Payment Webhooks Setup (15 min)

**Paystack:**
- [ ] Go to Paystack Dashboard
- [ ] Settings → API Keys & Webhooks
- [ ] Add Webhook URL: `https://app.example.com/api/payments/webhook/paystack`
- [ ] Optional compatibility URL: `https://app.example.com/api/webhooks/paystack`
- [ ] Events: charge.success, charge.failed

**Flutterwave:**
- [ ] Go to Flutterwave Dashboard
- [ ] Settings → Webhooks
- [ ] Add URL: `https://app.example.com/api/payments/webhook/flutterwave`
- [ ] Optional compatibility URL: `https://app.example.com/api/webhooks/flutterwave`
- [ ] Select all events

### 6. Notification Service Setup (15 min)

```bash
# Test push notification subscription
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {...}
    }
  }' \
  https://app.example.com/api/notifications/subscribe
```

- [ ] VAPID keys loaded
- [ ] Service Worker registered
- [ ] Subscription API working
- [ ] Test notification sent

### 7. Email Service Setup (10 min)

**SendGrid:**
- [ ] Create API key
- [ ] Add to environment variables
- [ ] Test email sending
- [ ] Set reply-to address

**Resend:**
- [ ] Create API key
- [ ] Verify domain
- [ ] Test email sending

- [ ] Email service working
- [ ] Confirmation emails sending
- [ ] Report PDFs emailing

### 8. Monitoring Setup (20 min)

```bash
# Enable error tracking
# Sentry: npm install @sentry/nextjs
# or DataDog, New Relic, etc.

# Set up alerting
# - Database connection errors
# - API errors (5xx)
# - Payment failures
# - Email failures
```

- [ ] Error tracking enabled
- [ ] Alerts configured
- [ ] Log aggregation set up
- [ ] Performance monitoring active

### 9. Security Verification (30 min)

```bash
# Check CORS headers
curl -i -H "Origin: https://app.example.com" \
  https://app.example.com/api/health

# Test authentication
curl -H "Authorization: Bearer invalid" \
  https://app.example.com/api/health-alerts/active
# Should return 401

# Check HTTPS redirect
curl -i http://app.example.com
# Should redirect to https
```

- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Authentication working
- [ ] Rate limiting active
- [ ] Security headers set
- [ ] CSRF protection enabled

### 10. Smoke Tests (30 min)

Test critical user journeys:

```bash
# Test health alert retrieval
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://app.example.com/api/health-alerts/active

# Test report generation
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"babyId":"...", "reportType":"pediatrician"}' \
  https://app.example.com/api/reports/generate

# Test notification subscription
# (Use browser dev tools or automated tool)
```

In-app testing:
- [ ] Login works
- [ ] Dashboard loads
- [ ] Health alerts display
- [ ] Can generate report
- [ ] Can subscribe to add-on
- [ ] Notifications received
- [ ] Can log activities
- [ ] Photos upload

### 11. Performance Check (15 min)

```bash
# Run Lighthouse
npm run lighthouse

# Check API response times
npm run test:performance

# Monitor database queries
# Check Supabase dashboard for slow queries
```

- [ ] Lighthouse score > 80
- [ ] API response < 500ms
- [ ] Database queries optimized
- [ ] No N+1 queries

---

## Post-Deployment (24-48 hours)

### Monitor
- [ ] Check error logs daily
- [ ] Review performance metrics
- [ ] Monitor payment processing
- [ ] Track API usage

### User Communication
- [ ] Send deployment announcement (if needed)
- [ ] Monitor support tickets
- [ ] Document any issues
- [ ] Get user feedback

### Follow-up Tasks
- [ ] Update documentation
- [ ] Plan next features
- [ ] Schedule retrospective
- [ ] Prepare rollback plan (just in case)

---

## Rollback Plan (if needed)

```bash
# Revert database (if migrations failed)
supabase db reset

# Revert frontend (rollback deployment)
# Use your host's rollback flow or redeploy the previous version
# or redeploy previous version

# Revert API
# Heroku: heroku releases:rollback
# Railway: Re-deploy previous commit

# Restore from backup
supabase db restore --backup-id <backup_id>
```

---

## Post-Deployment Monitoring

### Critical Alerts Setup

1. **API Errors**: If error rate > 1% for 5 min → Alert
2. **Database**: If connection fails → Alert
3. **Payment**: If transaction fails → Alert
4. **Notifications**: If service down → Alert

### Daily Checks (First Week)

- Check error logs
- Review new user signups
- Monitor payment processing
- Test critical flows
- Check database performance

### Weekly Checks (Ongoing)

- Review analytics
- Check performance metrics
- Audit security logs
- Plan feature releases
- Update documentation

---

## Success Criteria

- ✅ All features working
- ✅ No critical errors
- ✅ Page load < 3s
- ✅ API response < 500ms
- ✅ 99%+ uptime
- ✅ Users can create accounts
- ✅ Payments processing
- ✅ Notifications delivering

**Deployment estimated time: 3-4 hours**

**Total implementation time: 5-7 business days**
