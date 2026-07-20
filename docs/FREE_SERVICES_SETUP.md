# Cradlyn - Free & Cheap Services Setup

**Last Updated**: April 25, 2026  
**Status**: ✅ Optimized for Startups - $0/month to $50/month

---

## 📊 Cost Breakdown (Monthly)

| Service | Free Tier | Cost | Notes |
|---------|-----------|------|-------|
| **Supabase (Database)** | 500MB Storage, 2 Projects | FREE | Perfect for dev & production |
| **Resend (Email)** | 100 emails/day | FREE | Best free email service |
| **Paystack (Payments)** | 0% commission | FREE | Nigerian friendly, free tier perfect |
| **Flutterwave (Payments)** | 0% commission | FREE | West African friendly |
| **OpenAI (AI)** | $5 credit/3 months | ~$5 | gpt-4o-mini is cheapest |
| **Sentry (Error Tracking)** | 5,000 events/month | FREE | Enough for small app |
| **Google Analytics** | Unlimited | FREE | Standard analytics |
| **Gmail SMTP** | Unlimited | FREE | Using your own Gmail |
| **Hosting Platform** | Often free or low-cost tiers | Varies | Pick the host that fits your stack |
| **GitHub (Git/CI)** | Unlimited public repos | FREE | Standard setup |
| **---** | | | |
| **TOTAL** | | **FREE** | Perfect startup budget! |

---

## 🚀 Setup Instructions by Service

### 1. Database - Supabase (FREE)
```
✅ Status: Already configured
VITE_SUPABASE_URL=https://mohragovqqyhssnkyigh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nVPQQ38IJ3C41r4YzAsRPA_ZVTikN9R

Steps:
1. Already in .env
2. Database schema ready
3. Ready to run migrations
```

### 2. Email - Resend (FREE - 100 emails/day)
```
✅ Recommended: Use Resend
RESEND_API_KEY=re_your_test_key_here
RESEND_FROM_EMAIL=noreply@babylog.app

Setup:
1. Go to https://resend.com
2. Sign up (FREE)
3. Create API key
4. Verify sender domain (optional)
5. Paste key in .env
```

### 3. Payments - Paystack (FREE tier!)
```
✅ Use Paystack for Nigeria/West Africa
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key
VITE_PAYSTACK_LIVE_SECRET_KEY=sk_test_your_test_key

Setup:
1. Go to https://paystack.com
2. Sign up (FREE)
3. Go to Dashboard → Settings → Developers
4. Copy Test Keys (use these first!)
5. Paste in .env
6. Later: Upgrade to Live Keys when launching
```

### 4. Payments - Flutterwave (FREE tier + 0% commission)
```
✅ Use Flutterwave for Africa
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_your_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_your_key

Setup:
1. Go to https://flutterwave.com
2. Sign up (FREE)
3. Dashboard → Settings → API
4. Copy Test Keys
5. Paste in .env
6. Later: Upgrade to Live Keys
```

### 5. Email - Gmail SMTP (FREE Alternative)
```
✅ If you don't want Resend
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASSWORD=your_app_specific_password

Setup:
1. Go to Gmail → Settings
2. Enable 2-Factor Authentication
3. Create App Password: https://myaccount.google.com/apppasswords
4. Copy 16-digit password
5. Paste in SMTP_PASSWORD
```

### 6. AI/ML - OpenAI (FREE trial then cheap)
```
✅ Use gpt-4o-mini for cost efficiency
OPENAI_API_KEY=sk_test_your_key
OPENAI_MODEL=gpt-4o-mini

Setup:
1. Go to https://platform.openai.com
2. Sign up (FREE - $5 credit)
3. API keys → Create new
4. Paste in .env
5. Set model to gpt-4o-mini (cheapest)

Pricing:
- gpt-4o-mini: $0.15 per 1M input tokens
- gpt-4: $3 per 1M input tokens
- Use mini for most tasks!
```

### 7. Error Tracking - Sentry (FREE)
```
✅ Sentry free tier included
SENTRY_DSN=https://your_key@sentry.io/your_project

Setup:
1. Go to https://sentry.io
2. Sign up (FREE - 5,000 events/month)
3. Create project → React + Node.js
4. Copy DSN
5. Paste in .env

Free tier includes:
- 5,000 errors/month
- Full stack traces
- Release tracking
```

### 8. Hosting - Choose Your Platform
```
✅ Perfect for Next.js/Vite
Already configured in vercel.json

Setup:
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import repository
4. Add environment variables (from .env)
5. Deploy! (automatic on git push)

Free tier includes:
- Unlimited deployments
- Automatic SSL
- CDN included
- Serverless functions
```

### 9. Analytics - Google Analytics (FREE)
```
✅ Standard analytics
GOOGLE_ANALYTICS_ID=G-your_id

Setup:
1. Go to https://analytics.google.com
2. Create account
3. Create property
4. Get G-ID
5. Paste in .env
```

### 10. Storage - Supabase Storage (FREE - 1GB)
```
✅ Built into Supabase - no extra setup!

Features:
- 1GB free storage
- Perfect for baby photos
- Automatic backups
- Integrated with auth
```

---

## 💳 When to Upgrade

### Upgrade to Paid When:
```
✅ Email Service
  → When: Exceed 100 emails/day
  → Upgrade to: Resend ($20/month)
  
✅ AI Service
  → When: Exceed $5/month in tokens
  → Upgrade to: OpenAI pay-as-you-go
  
✅ Payments
  → When: Getting real transactions
  → Upgrade to: Live keys (NEVER paid)
  
✅ Storage
  → When: Exceed 1GB
  → Upgrade to: Supabase Pro ($25/month)
  
✅ Error Tracking
  → When: Exceed 5,000 errors/month
  → Upgrade to: Sentry Pro ($29/month)
```

---

## 🔒 Security Notes

### Test Keys First
```
✅ Always use TEST/SANDBOX keys initially
✅ Test full workflow
✅ Verify payments work
✅ Then upgrade to LIVE keys
```

### Environment Variables
```
✅ Keep .env local (NEVER commit)
✅ .env.production.example for templates
✅ Add production keys to your hosting platform settings
✅ Never share keys in code/GitHub
```

### Hashing Keys (Future)
When you have budget:
```
Paid Services to Add:
✅ HashiCorp Vault - Encrypt keys
✅ AWS Secrets Manager - Manage secrets
✅ 1Password - Team secrets management
```

---

## 📝 Current .env Configuration

### What's Active (FREE)
```
✅ Supabase (Database)
✅ Paystack (Test mode)
✅ Flutterwave (Test mode)
✅ Resend OR Gmail (Email)
✅ OpenAI (gpt-4o-mini)
✅ Google Analytics
✅ Sentry
```

### What's Commented Out (Pay Later)
```
✅ Stripe (upgrade when profitable)
✅ AWS S3 (upgrade when lots of photos)
✅ Azure Speech (upgrade when needed)
✅ Twilio SMS (upgrade when needed)
✅ AWS Transcribe (upgrade when needed)
```

---

## 🎯 Recommended Setup (Day 1)

### Minimum Setup (30 minutes)
```
1. ✅ Supabase - Already done
2. ✅ Resend - Create account, get key
3. ✅ Paystack Test - Get test keys
4. ✅ OpenAI - Sign up for free $5 credit
5. ✅ Connect GitHub to your hosting platform and deploy
```

### Cost: $0

### Features Available:
```
✅ Database - unlimited
✅ Email - 100/day
✅ Payments - test mode
✅ AI - $5 credit (lasts ~2 weeks)
✅ Hosting - unlimited
✅ Error tracking - 5,000/month
✅ Analytics - unlimited
```

---

## 📈 Scaling Plan

### Phase 1: MVP ($0/month)
- Supabase free
- Resend free (100 emails/day)
- OpenAI free trial
- Hosting free tier
- Paystack/Flutterwave test mode

### Phase 2: Beta ($25/month)
- Supabase Pro ($25)
- Resend free still
- OpenAI pay-as-you-go (~$10)
- Hosting free tier still
- Paystack/Flutterwave live mode

### Phase 3: Production ($100+/month)
- Supabase Pro or Business
- Resend paid ($20)
- OpenAI usage-based
- Paid hosting tier (if needed)
- Full payment processing
- Email service scaled
- Error tracking Pro ($29)

---

## ✅ Checklist

- [ ] Supabase configured (done)
- [ ] Resend account created
- [ ] Paystack test keys added
- [ ] OpenAI account created
- [ ] Gmail app password generated (if using SMTP)
- [ ] App deployed on chosen host
- [ ] All test keys in .env
- [ ] Backup .env file
- [ ] .env added to .gitignore

---

## 🆘 Troubleshooting

### Email not sending?
```
Try: Resend first (easiest)
If SSL error: Use Gmail SMTP
Check: SMTP_PORT = 587
```

### Payment test failing?
```
Use Test Keys (pk_test_*, sk_test_*)
Log in to Paystack/Flutterwave dashboard
Check webhook configuration
```

### AI responses slow?
```
Switch to: gpt-4o-mini (faster)
Check: OPENAI_API_KEY is set
Verify: Account has credit
```

---

## 💰 Total Startup Cost

```
SETUP COST:
- Domain: ~$12/year (optional)
- Server: FREE or low-cost depending on host
- Database: FREE (Supabase)
- Email: FREE (Resend/Gmail)
- AI: FREE ($5 credit)

MONTHLY COST:
Month 1-3: $0 (using free tiers)
Month 4+: ~$25-50 (Supabase Pro + OpenAI)

TOTAL FOR YEAR 1:
~$100-150 (essentially free to start!)
```

---

**Status**: ✅ Optimized for Startups  
**Next**: Run database migrations!

