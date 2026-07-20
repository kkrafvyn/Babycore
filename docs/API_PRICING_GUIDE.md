# 💰 Cradlyn - API Services & Annual Pricing Guide

**Last Updated:** April 23, 2026
**Currency:** USD
**Assumptions:** Medium user base (10,000 DAU), 50,000 total users

---

## 📊 Executive Summary

| Category | Count | Avg Monthly Cost | Annual Cost |
|----------|-------|------------------|-------------|
| **Core Infrastructure** | 2 | $2,500 | $30,000 |
| **Database & Backend** | 2 | $1,500 | $18,000 |
| **Authentication** | 1 | $0 | $0 |
| **Communication** | 3 | $3,000 | $36,000 |
| **Storage** | 2 | $1,000 | $12,000 |
| **Payments** | 2 | $500 | $6,000 |
| **Analytics & Monitoring** | 3 | $800 | $9,600 |
| **AI/ML Services** | 2 | $2,000 | $24,000 |
| **Wearable Integration** | 2 | $0 | $0 |
| **Security & Compliance** | 2 | $400 | $4,800 |
| **Optional Premium** | 3 | $1,500 | $18,000 |
| | | | |
| **TOTAL (Core + Essential)** | | **$12,700/mo** | **$152,400/year** |
| **TOTAL (With Optional)** | | **$14,200/mo** | **$170,400/year** |

---

## 🏗️ Core Infrastructure

### 1. **Supabase (PostgreSQL Database + Auth)**
- **Type:** Paid (Free tier available)
- **Use:** PostgreSQL database, real-time subscriptions, built-in auth
- **Pricing:**
  - **Free Tier:** $0/month
    - 500 MB database
    - 2 GB bandwidth
    - 50,000 monthly active users
  - **Pro Plan:** $25/month
    - 8 GB database
    - 250 GB bandwidth
    - Up to 100,000 monthly active users
  - **Team Plan:** $599/month
    - 100 GB database
    - 5 TB bandwidth
    - Unlimited users
- **Our Recommendation:** Pro Plan ($25/month) → **$300/year**
- **Note:** As we scale beyond 10,000 DAU, upgrade to Team Plan ($599/month = $7,188/year)

### 2. **Vercel (Frontend Hosting)**
- **Type:** Paid (Free tier available)
- **Use:** Frontend deployment, CDN, automatic deployments
- **Pricing:**
  - **Hobby (Free):** $0/month
    - 100 GB bandwidth
    - Limited to 1 project
  - **Pro:** $20/month
    - 1 TB bandwidth
    - Unlimited projects
    - Advanced analytics
- **Our Recommendation:** Pro Plan ($20/month) → **$240/year**

### 3. **AWS CloudFront (Optional CDN)**
- **Type:** Paid (Pay-as-you-go)
- **Use:** Global content distribution
- **Pricing:** $0.085/GB for North America
- **Estimated Monthly:** ~$500 (50 TB/month)
- **Annual Cost:** **$6,000/year**
- **Note:** Included with Vercel Pro, add CloudFront only for massive scale

**Core Infrastructure Subtotal:** **$540-$6,540/year**

---

## 💾 Database & Backend

### 4. **AWS RDS (Optional Backup Database)**
- **Type:** Paid
- **Use:** Database backups, disaster recovery
- **Pricing (Multi-AZ):** $0.33/hour for db.t3.small
- **Estimated Monthly:** ~$250
- **Annual Cost:** **$3,000/year**
- **Note:** Optional if Supabase backups sufficient

### 5. **Redis Cache (AWS ElastiCache or Upstash)**
- **Type:** Paid
- **Use:** Session caching, real-time data caching
- **Pricing:**
  - **Upstash:** $0 (free tier), $0.30/100K commands for pro
  - **AWS ElastiCache:** $0.017/hour (cache.t3.micro)
- **Estimated Monthly:** $150
- **Annual Cost:** **$1,800/year**
- **Our Recommendation:** Upstash Pay-as-you-go (~$150/month average)

**Database & Backend Subtotal:** **$1,800-$4,800/year**

---

## 🔐 Authentication & Security

### 6. **Supabase Auth (Included)**
- **Type:** FREE (included with Supabase)
- **Use:** JWT authentication, OAuth providers
- **Annual Cost:** **$0/year**

### 7. **Auth0 (Alternative)**
- **Type:** Paid (Free tier available)
- **Free Tier:** $0/month (7,000 users)
- **Paid:** $290/month (25,000 users)
- **Annual Cost:** $0 (free tier) to **$3,480/year**
- **Note:** Not needed, Supabase Auth is superior

**Authentication Subtotal:** **$0/year**

---

## 📢 Communication Services

### 8. **SendGrid (Email)**
- **Type:** Paid (Free tier available)
- **Use:** Weekly digests, milestone emails, password resets, notifications
- **Pricing:**
  - **Free:** 100 emails/day
  - **Pro:** $29.95/month (unlimited sends, 10,000/month)
  - **Advanced:** $89.95/month (15K sends, advanced features)
- **Estimated Volume:** 5,000 emails/month for 10,000 users
- **Our Recommendation:** Pro Plan ($29.95/month) → **$359.40/year**
- **Alternative:** Resend ($20/month for first 3,000 emails, then $0.001 per email)

### 9. **Twilio (SMS Notifications - Optional)**
- **Type:** Paid
- **Use:** SMS notifications for critical alerts
- **Pricing:** $0.0075 per SMS
- **Estimated Volume:** 1,000 SMS/month
- **Estimated Monthly Cost:** $7.50
- **Annual Cost:** **$90/year**
- **Note:** Optional, not critical for MVP

### 10. **Web Push Notifications (Firebase Cloud Messaging)**
- **Type:** FREE
- **Use:** Push notifications for app
- **Annual Cost:** **$0/year**
- **Alternative:** OneSignal ($99/month for 50K+ users)

### 11. **Expo (Push Notifications)**
- **Type:** FREE (for development) or Paid
- **Use:** Mobile app push notifications (if using React Native)
- **Pricing:** Free (development) or $99/month (production)
- **Annual Cost:** **$0/year** (free) or **$1,188/year** (production)

**Communication Subtotal:** **$449.40-$1,637.40/year**

---

## 📸 File Storage & Media

### 12. **Supabase Storage (Included)**
- **Type:** FREE (included with Supabase)
- **Use:** Baby photos, documents, reports
- **Pricing:** Included in Supabase plan
- **Annual Cost:** **$0/year**

### 13. **AWS S3 (Backup Storage)**
- **Type:** Paid
- **Use:** Backup storage for photos
- **Pricing:** $0.023/GB
- **Estimated Usage:** 500 GB/month
- **Estimated Monthly Cost:** $11.50
- **Annual Cost:** **$138/year**
- **Note:** Optional, only if primary storage backup needed

### 14. **Cloudinary (Image Processing - Optional)**
- **Type:** Paid (Free tier available)
- **Free Tier:** 25 GB/month, 25,000 transformations/month
- **Paid:** $99/month (500 GB/month)
- **Annual Cost:** $0 (free tier) to **$1,188/year**

**Storage Subtotal:** **$0-$1,326/year**

---

## 💳 Payment Processing

### 15. **Paystack (Payment Gateway - Africa)**
- **Type:** Paid (Percentage-based)
- **Use:** Payment processing for subscriptions
- **Pricing:** 1.5% + ₦100 (~2.5% total)
- **Estimated Monthly Revenue:** $20,000
- **Estimated Monthly Fee:** $500
- **Annual Cost:** **$6,000/year**

### 16. **Flutterwave (Payment Gateway - Africa)**
- **Type:** Paid (Percentage-based)
- **Use:** Backup payment processor
- **Pricing:** 1.4% + local fees (~2.5% total)
- **Estimated Monthly Cost:** $500
- **Annual Cost:** **$6,000/year**
- **Note:** Use only one, not both (choose Paystack as primary)

### 17. **Stripe (Global Payments - Optional)**
- **Type:** Paid
- **Pricing:** 2.9% + $0.30 per transaction
- **Estimated Monthly Cost:** $600
- **Annual Cost:** **$7,200/year**
- **Note:** For international users

**Payment Processing Subtotal:** **$6,000-$12,000/year**
**(Recommended: Paystack only = $6,000/year)**

---

## 📊 Analytics & Monitoring

### 18. **Sentry (Error Tracking)**
- **Type:** Paid (Free tier available)
- **Use:** Error monitoring, bug tracking, performance monitoring
- **Pricing:**
  - **Free:** 100 events/hour
  - **Team:** $29/month (5,000 errors/month)
  - **Business:** $199/month (100,000 errors/month)
- **Our Recommendation:** Team Plan ($29/month) → **$348/year**

### 19. **LogRocket (Session Recording - Optional)**
- **Type:** Paid
- **Use:** Session replay, error replay, performance monitoring
- **Pricing:** $99/month (10,000 sessions)
- **Annual Cost:** **$1,188/year**
- **Note:** Premium feature, optional

### 20. **Google Analytics 4**
- **Type:** FREE
- **Use:** User behavior tracking, conversion tracking
- **Annual Cost:** **$0/year**

### 21. **PostHog (Analytics - Alternative)**
- **Type:** Paid (Free tier available)
- **Free Tier:** Up to 1M events/month
- **Pricing:** $450/month (10M events/month)
- **Annual Cost:** $0 (free tier) to **$5,400/year**

**Analytics Subtotal:** **$348-$6,936/year**

---

## 🧠 AI & Machine Learning Services

### 22. **OpenAI API (Voice Transcription + Analysis)**
- **Type:** Paid
- **Use:** Voice memo transcription, cry analysis, text generation
- **Pricing:**
  - **Whisper (Speech-to-Text):** $0.006 per minute
  - **GPT-4 (Analysis):** $0.03 per 1K input tokens
  - **GPT-3.5:** $0.0005 per 1K input tokens
- **Estimated Usage:** 500 transcriptions/month (3 min avg)
- **Estimated Monthly Cost:** $50 (transcription) + $100 (analysis)
- **Annual Cost:** **$1,800/year**

### 23. **TensorFlow/PyTorch (ML Models - Self-hosted)**
- **Type:** FREE (open source)
- **Use:** Sleep prediction, milestone prediction, growth analysis
- **Hosting Cost:** Included in backend hosting (AWS EC2 or Heroku)
- **Annual Cost:** **$0/year** (use existing backend)

### 24. **Replicate AI (Alternative ML API)**
- **Type:** Paid
- **Use:** AI predictions as a service
- **Pricing:** $0.000350 per second (compute)
- **Estimated Monthly Cost:** $200
- **Annual Cost:** **$2,400/year**

### 25. **Anthropic Claude API (Optional)**
- **Type:** Paid
- **Use:** Advanced analysis, parent wellness insights
- **Pricing:** $0.008 per 1K input tokens
- **Estimated Monthly Cost:** $100
- **Annual Cost:** **$1,200/year**

**AI/ML Subtotal:** **$0-$5,400/year**
**(Recommended: OpenAI only = $1,800/year)**

---

## ⌚ Wearable Device Integration

### 26. **Apple HealthKit**
- **Type:** FREE
- **Use:** Integration with Apple Health
- **API Cost:** $0/year
- **Annual Cost:** **$0/year**

### 27. **Fitbit API**
- **Type:** FREE (with app registration)
- **Use:** Integration with Fitbit devices
- **API Cost:** $0/year
- **Annual Cost:** **$0/year**

### 28. **Google Fit API**
- **Type:** FREE
- **Use:** Integration with Google Fit devices
- **API Cost:** $0/year
- **Annual Cost:** **$0/year**

**Wearable Integration Subtotal:** **$0/year**

---

## 🔐 Security & Compliance

### 29. **Auth0 Social Connections (Alternative)**
- **Type:** FREE
- **Use:** OAuth with Facebook, Google
- **Annual Cost:** **$0/year**

### 30. **Let's Encrypt SSL Certificates**
- **Type:** FREE
- **Use:** HTTPS/SSL encryption
- **Annual Cost:** **$0/year**

### 31. **Freshbooks/Stripe Billing (Invoicing)**
- **Type:** Included with Stripe/Paystack
- **Use:** Invoice generation
- **Annual Cost:** **$0/year**

**Security & Compliance Subtotal:** **$0/year**

---

## 🚀 Optional Premium Services

### 32. **Datadog (Premium Monitoring)**
- **Type:** Paid
- **Use:** Advanced monitoring, APM, security monitoring
- **Pricing:** $15/month (custom)
- **Annual Cost:** **$180/year**

### 33. **PagerDuty (Incident Management)**
- **Type:** Paid
- **Use:** On-call scheduling, incident alerts
- **Pricing:** $49/user/month
- **Annual Cost:** **$588/year** (for 1 user)

### 34. **Slack Integration (Notifications)**
- **Type:** FREE or Paid
- **Use:** Team notifications
- **Annual Cost:** **$0/year** (built-in) or **$8/user/month** if paid workspace

### 35. **GitHub Enterprise (CI/CD)**
- **Type:** Paid (Free tier available)
- **Use:** Version control, automated deployments
- **Pricing:** Free for public repos, $4/user/month for private
- **Annual Cost:** **$0/year** (free tier)

**Optional Premium Subtotal:** **$768/year**

---

## 📋 Summary by Scenario

### **Scenario 1: Lean MVP (Minimum)**
```
Supabase Pro:           $300/year
Vercel Pro:             $240/year
SendGrid Pro:           $359/year
OpenAI API:             $1,800/year
─────────────────────────────────
TOTAL:                  $2,699/year
```

### **Scenario 2: Recommended (Startup)**
```
Supabase Pro:           $300/year
Vercel Pro:             $240/year
SendGrid Pro:           $359/year
Paystack:               $6,000/year
OpenAI API:             $1,800/year
Sentry:                 $348/year
Redis (Upstash):        $1,800/year
─────────────────────────────────
TOTAL:                  $10,847/year
```

### **Scenario 3: Growth (Scale Ready)**
```
Supabase Team:          $7,188/year
Vercel Pro:             $240/year
AWS RDS Backup:         $3,000/year
SendGrid Advanced:      $1,079/year
Paystack:               $6,000/year
Stripe (Global):        $7,200/year
OpenAI API:             $1,800/year
Sentry Team:            $348/year
Redis (Upstash):        $1,800/year
CloudFront CDN:         $6,000/year
Datadog Monitoring:     $180/year
PostHog Analytics:      $5,400/year
Replicate AI:           $2,400/year
─────────────────────────────────
TOTAL:                  $42,635/year
```

### **Scenario 4: Enterprise (Premium)**
```
Supabase Team:          $7,188/year
Vercel Pro:             $240/year
AWS RDS Multi-AZ:       $3,000/year
Redis ElastiCache:      $2,000/year
SendGrid Advanced:      $1,079/year
Paystack:               $6,000/year
Stripe Global:          $7,200/year
OpenAI API:             $1,800/year
Sentry Business:        $2,388/year
LogRocket:              $1,188/year
Datadog:                $180/year
PostHog Premium:        $5,400/year
Replicate AI:           $2,400/year
CloudFront CDN:         $6,000/year
PagerDuty:              $588/year
─────────────────────────────────
TOTAL:                  $46,251/year
```

---

## 💡 Cost Optimization Tips

### 1. **Use Free Tiers Strategically**
- Start with free tiers for all services
- Upgrade only when hitting limits
- Supabase free tier supports 50,000 DAU

### 2. **Consolidate Services**
- Use Supabase for DB + Auth + Storage (saves money)
- Use Vercel for frontend + CDN (replaces separate CDN)
- Use Paystack only (not both Paystack + Flutterwave)

### 3. **Negotiate Volume Discounts**
- Contact Supabase/Paystack for custom pricing at scale
- Many services offer discounts for annual prepayment

### 4. **Self-Host Where Possible**
- ML models (TensorFlow) - host on backend
- Logging - use open-source ELK stack
- Monitoring - use Prometheus + Grafana

### 5. **Smart Caching**
- Redis reduces database costs
- CDN reduces bandwidth costs
- Browser caching reduces API calls

### 6. **Implement Rate Limiting**
- Prevents API abuse
- Reduces costs with pay-as-you-go services
- Protects against DDoS

### 7. **Asynchronous Processing**
- Email sending async (reduces timeout costs)
- Video processing background jobs
- Heavy computations off-peak

---

## 🎯 Recommended Stack (Best Value)

For a startup launching in 2026:

| Service | Cost/Year | Why |
|---------|-----------|-----|
| Supabase Pro | $300 | All-in-one (DB + Auth + Storage) |
| Vercel Pro | $240 | Automatic deployments + CDN |
| SendGrid Pro | $359 | Reliable email at scale |
| Paystack | $6,000 | Best for Africa (primary market) |
| OpenAI API | $1,800 | Voice + AI insights |
| Sentry | $348 | Error tracking |
| Upstash Redis | $1,800 | Caching + sessions |
| | | |
| **TOTAL** | **$10,847/year** | |
| **Per Month** | **$904** | |

---

## 📈 Cost Scaling Path

| Milestone | Monthly Cost | Annual Cost | Users |
|-----------|---|---|---|
| **MVP Launch** | $225 | $2,699 | 1,000 |
| **Early Growth** | $904 | $10,847 | 10,000 |
| **Growth Phase** | $3,553 | $42,635 | 100,000 |
| **Enterprise Scale** | $3,854 | $46,251 | 500,000+ |

---

## ⚠️ Assumptions & Disclaimers

1. **Pricing current as of April 2026** - verify actual current pricing
2. **Monthly estimates based on 10,000 DAU**
3. **Payment volumes assume $2/user/month subscription
4. **Doesn't include:**
   - Development team salaries
   - Infrastructure for mobile app stores
   - Legal/compliance consulting
   - Marketing & user acquisition
   - Support team costs
5. **Free tier limits may prevent free operation above certain scale**

---

## 📞 Free API Alternatives

If budget is critical, these alternatives are free:

| Service | Alternative | Annual Cost |
|---------|-----------|-------------|
| Supabase | Firebase | $0 (then paid) |
| SendGrid | Mailgun | $0 (35K emails free) |
| OpenAI | Hugging Face | $0 |
| Sentry | Rollbar | $0 (free tier) |
| Analytics | Fathom | $0 (free tier) |

---

## 🚀 Next Steps

1. **Choose scenario** that matches your budget
2. **Get free tier accounts** for all services
3. **Set up billing alerts** to monitor costs
4. **Review quarterly** and optimize expensive services
5. **Negotiate at scale** once hitting volume thresholds

---

**Last Updated:** April 23, 2026
**Review Frequency:** Quarterly
**Budget Owner:** Finance/Product Team

