# Quick Reference Guide

## 🚀 Getting Started (5 minutes)

```bash
# 1. Install everything
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Add your API keys to .env.local
# (See BACKEND_API_SETUP.md for which keys to get)

# 4. Generate VAPID keys for notifications
npm run generate:vapid
# Copy output to .env.local

# 5. Run development server
npm run dev
```

**Result**: Frontend at http://localhost:5173, Backend at http://localhost:3000

---

## 📚 Common Commands

```bash
# Development
npm run dev              # Frontend + Backend together
npm run dev:frontend    # Frontend only (Vite)
npm run dev:api        # Backend only (Express)

# Building
npm run build           # Build everything for production
npm run build:frontend # Just frontend
npm run build:api      # Just backend

# Quality
npm run type-check     # Check TypeScript errors
npm run lint           # Check code style
npm run format         # Auto-format code
npm test              # Run tests

# Utilities
npm run generate:vapid  # Generate push notification keys
npm run start          # Run production build
npm run lighthouse     # Performance audit

# Database
npm run db:migrate     # Push migrations to Supabase
npm run db:seed        # Populate test data
npm run db:reset       # Reset database (dev only)
```

---

## 🔌 Testing Endpoints with cURL

```bash
# Health check (no auth needed)
curl http://localhost:3000/health

# Get auth token
# 1. Login via Supabase (frontend)
# 2. Copy token from browser localStorage: 
#    localStorage.getItem('sb-auth-token')
# Store in variable:
TOKEN="your_token_here"

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/health-alerts/active

# Test POST endpoint
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"babyId":"123","daysBack":30}' \
  http://localhost:3000/api/ml/analyze-sleep-patterns
```

---

## 📖 Where to Find Things

| What | Where |
|------|-------|
| API Setup Instructions | BACKEND_API_SETUP.md |
| Deployment Guide | DEPLOYMENT_CHECKLIST.md |
| Complete Overview | BACKEND_IMPLEMENTATION_COMPLETE.md |
| API Endpoints List | This file (below) |
| Database Schema | DATABASE_MIGRATIONS.sql |
| Environment Variables | .env.example |
| React Components | src/app/components/ |
| Business Logic | src/lib/*.ts |
| API Routes | src/api/routes/ |
| Auth Middleware | src/api/middleware/auth.ts |
| Backend Config | tsconfig.server.json |

---

## 🔑 Environment Variables Needed

### Essential (Required for function)
```
VITE_SUPABASE_URL=             # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=        # Supabase anonymous key
SUPABASE_SERVICE_KEY=          # Supabase service role (for backend)
VITE_API_BASE_URL=             # Backend API URL (http://localhost:3000/api)
```

### Push Notifications
```
VITE_VAPID_PUBLIC_KEY=         # Generate with: npm run generate:vapid
VITE_VAPID_PRIVATE_KEY=        # Generate with: npm run generate:vapid
```

### Payments (Choose one or both)
```
PAYSTACK_SECRET_KEY=           # From https://paystack.com/dashboard
FLUTTERWAVE_SECRET_KEY=        # From https://dashboard.flutterwave.com
```

### Email Service (Choose one)
```
SENDGRID_API_KEY=              # From https://sendgrid.com
RESEND_API_KEY=                # From https://resend.com
```

### External APIs
```
WHO_API_KEY=                   # WHO Outbreak News (if needed)
CDC_API_KEY=                   # CDC Alerts (if needed)
OPENWEATHER_API_KEY=           # Weather data (if needed)
```

---

## 🗄️ Database

### Quick Database Tasks

```bash
# Check tables were created
supabase db list

# View table data
supabase db pull

# Run a SQL query
psql -U postgres -d postgres -c "SELECT * FROM babies LIMIT 5;"

# Reset database (dev only!)
supabase db reset

# Backup database
supabase db dump --db-url $SUPABASE_URL > backup.sql

# Restore from backup
supabase db restore < backup.sql
```

### Table Groups

| Category | Tables |
|----------|--------|
| Babies & Users | babies, users, user_roles |
| Activity Logs | feeding_logs, sleep_analytics, diaper_logs, vaccinations |
| Premium Features | health_alerts, voice_logs, ai_scrapbook, community_posts |
| Family & Sharing | family_sharing_invites, caregiver_sessions |
| Payments & Subscriptions | subscription_addons, user_addon_subscriptions |
| Wearables & Integration | wearable_integrations, wearable_data |

---

## 🎯 API Endpoints by Feature

### Health & Wellness
```
GET    /api/health-alerts/active
POST   /api/health-alerts/sync-external
POST   /api/ml/analyze-sleep-patterns
POST   /api/ml/predict-next-sleep
POST   /api/ml/predict-milestone
```

### Reporting & Sharing
```
POST   /api/reports/generate
GET    /api/reports/shared/:token
POST   /api/reports/email
POST   /api/voice/upload
GET    /api/voice/logs
```

### Communication
```
POST   /api/notifications/subscribe
POST   /api/notifications/schedule
POST   /api/email-reports/generate-weekly
POST   /api/community/forums/:forumId/posts
```

### Payments
```
POST   /api/payments/process-addon
POST   /api/payments/cancel-subscription
POST   /webhooks/paystack
POST   /webhooks/flutterwave
```

### Integrations
```
POST   /api/wearable/connect-apple-health
POST   /api/wearable/connect-fitbit
POST   /api/wearable/sync
POST   /api/voice/analyze-cry
```

---

## 🚨 Troubleshooting

### "Port 3000 already in use"
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev:api
```

### "Cannot find module '@supabase/supabase-js'"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "No token provided" error
```bash
# You need to:
# 1. Login via frontend (signup/login page)
# 2. Copy token from browser: localStorage.getItem('sb-auth-token')
# 3. Include in API calls: -H "Authorization: Bearer $TOKEN"
```

### "Database connection failed"
```bash
# Check credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test connection
supabase status

# Verify in .env.local
cat .env.local | grep SUPABASE
```

### "TypeScript errors"
```bash
# Run type checker
npm run type-check

# Check specific file
npx tsc --noEmit src/api/server.ts
```

---

## 📱 Frontend Features Available

### Dashboard Views (25+)
- Home Dashboard
- Health Alerts
- Photo Gallery
- Advanced Analytics
- AI Insights
- Subscriptions
- Health Records
- Community Forum
- Content Library
- Wearable Manager
- Family Sharing
- Voice Logging
- Doctor Reports
- Achievements
- Activity Tracker
- And 10+ more...

### Components
- Real-time charts (Recharts)
- Photo upload & gallery
- 3D visualizations
- Voice memo recording
- Community forum interface
- Family invite system
- Doctor report generator
- And more...

---

## 🔐 Security Best Practices

✅ Do:
- Store sensitive keys in .env files
- Use environment variables for secrets
- Rotate API keys regularly
- Enable 2FA on external services
- Use HTTPS in production
- Verify webhook signatures
- Keep dependencies updated

❌ Don't:
- Commit .env files to Git
- Share API keys in code
- Disable SSL verification
- Use weak passwords
- Skip authentication
- Log sensitive data
- Deploy without testing

---

## 📊 Performance Tips

- Use CDN for static assets
- Enable database indexing
- Cache frequent queries
- Compress images before upload
- Use pagination for lists
- Monitor API response times
- Setup error alerting

---

## 📞 Support Resources

- **Express.js Docs**: https://expressjs.com
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs

---

## 🎓 Learning Path

1. **Start Here**: BACKEND_IMPLEMENTATION_COMPLETE.md
2. **Then Read**: BACKEND_API_SETUP.md
3. **For Deployment**: DEPLOYMENT_CHECKLIST.md
4. **For Troubleshooting**: This file

---

## 📋 Pre-Production Checklist

- [ ] All environment variables populated
- [ ] Database migrations executed
- [ ] Payment webhooks configured
- [ ] Email service tested
- [ ] Push notifications working
- [ ] External APIs responding
- [ ] TypeScript no errors (`npm run type-check`)
- [ ] All tests passing (`npm test`)
- [ ] Lighthouse score > 80
- [ ] Performance acceptable
- [ ] Security headers set
- [ ] HTTPS enabled
- [ ] Error tracking setup (Sentry)
- [ ] Monitoring configured
- [ ] Backup plan in place

---

## 🎉 You're Ready!

Everything is set up and ready to go. Start with:

```bash
npm run dev
```

Then visit:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

Happy coding! 🚀
