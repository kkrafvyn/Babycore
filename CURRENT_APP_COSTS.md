# Current App Costs

Last verified: 2026-05-03

This file lists the current public pricing for the services this app already uses or is clearly prepared to use.

Currency notes:
- USD unless stated otherwise
- Paystack card-processing fees below are listed in NGN because the official Nigeria pricing page is the one this project most closely matches

## 1. Required or Very Likely Costs

| Item | Current price | How it applies to this app | Source |
| --- | --- | --- | --- |
| Vercel Pro | $20/month + usage | Recommended paid hosting tier for the deployed web app and API on Vercel | https://vercel.com/pricing |
| Supabase Pro | $25/month organization fee | Main database, auth, storage, realtime, and sync backend | https://supabase.com/docs/guides/platform/billing-on-supabase |
| Supabase compute for one Micro project | ~$10/month list price, offset by $10 compute credits on the Pro plan, so the docs example totals $25/month for one project | Practical baseline for one production project | https://supabase.com/docs/guides/platform/manage-your-usage/compute |
| Apple Developer Program | $99/year | Required to distribute iOS builds through TestFlight or the App Store | https://developer.apple.com/programs/ |
| Google Play Console account | $25 one-time | Required to publish the Android app on Google Play | https://support.google.com/googleplay/android-developer/answer/6112435 |
| Paystack local transactions | 1.5% + NGN 100 per transaction | Current premium payment flow in the repo | https://paystack.com/pricing |
| Paystack local-fee rule | NGN 100 fee waived under NGN 2,500; local fees capped at NGN 2,000 | Important for estimating low-ticket and high-ticket subscription charges | https://paystack.com/pricing |
| Paystack international transactions | 3.9% + NGN 100 per transaction | Applies if customers pay with international cards | https://paystack.com/pricing |

## 2. Usage-Based Costs You May Hit as You Grow

### Vercel

| Item | Current price | Notes | Source |
| --- | --- | --- | --- |
| Functions active CPU | Starting at $0.128/hour | Relevant because the app uses server-side API routes on Vercel | https://vercel.com/pricing |
| Functions provisioned memory | Starting at $0.0106/GB-hour | Usage charge after included quota | https://vercel.com/pricing |
| Function invocations | Starting at $0.60 per 1M | Usage charge after included quota | https://vercel.com/pricing |
| Standard build minutes | $0.014/minute | Paid build usage | https://vercel.com/pricing |
| Web Analytics | $3 per 100,000 events | Optional analytics add-on usage | https://vercel.com/pricing |
| Speed Insights | $10/project/month, then $0.65 per 10,000 events | Optional performance monitoring | https://vercel.com/pricing |

### Supabase

| Item | Current price | Notes | Source |
| --- | --- | --- | --- |
| Egress overage | $0.09/GB | After included quota on Pro/Team | https://supabase.com/docs/guides/platform/billing-on-supabase |
| Database disk overage | $0.125/GB/month | Beyond 8 GB included per project | https://supabase.com/docs/guides/platform/manage-your-usage/disk-size |
| Storage overage | $0.021/GB/month | Beyond 100 GB included | https://supabase.com/docs/guides/storage/pricing |
| Monthly active users overage | $0.00325 per MAU | Beyond 100,000 MAU | https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users |
| Edge Function invocations | $2 per 1M | Beyond 2 million included | https://supabase.com/docs/guides/functions/pricing |
| Realtime messages | $2.50 per 1M | Beyond 5 million included | https://supabase.com/docs/guides/realtime/pricing |
| Realtime peak connections | $10 per 1,000 | Beyond 500 included | https://supabase.com/docs/guides/realtime/pricing |

## 3. Optional Costs If You Turn On More Features

### Email

| Item | Current price | When it matters | Source |
| --- | --- | --- | --- |
| Resend Free | $0/month for 3,000 emails/month | Cheapest clean option for low-volume transactional email | https://resend.com/pricing |
| Resend Pro | $20/month for 50,000 emails/month | Likely best first paid email tier | https://resend.com/pricing |
| Resend overage | $0.90 per 1,000 emails | If you exceed Pro or Scale quotas | https://resend.com/pricing |
| SendGrid free trial | $0/month for 60 days | Alternative email provider supported by the repo | https://sendgrid.com/en-us/pricing |
| SendGrid Essentials | Starting at $19.95/month | Alternative paid email option | https://sendgrid.com/en-us/pricing |
| SendGrid Pro | Starting at $89.95/month | Higher-volume email option | https://sendgrid.com/en-us/pricing |
| SMTP provider | Varies by provider | The repo can also send through any SMTP account you choose | N/A |

### AI

| Item | Current price | When it matters | Source |
| --- | --- | --- | --- |
| OpenAI GPT-5.4 mini | $0.75 per 1M input tokens, $4.50 per 1M output tokens | Low-cost AI copilot option | https://developers.openai.com/api/docs/pricing |
| OpenAI GPT-5.4 | $2.50 per 1M input tokens, $15.00 per 1M output tokens | Stronger general AI option | https://developers.openai.com/api/docs/pricing |
| OpenAI GPT-5.5 | $5.00 per 1M input tokens, $30.00 per 1M output tokens | Highest-end current text model option | https://developers.openai.com/api/docs/pricing |
| OpenAI web search tool | $10 per 1,000 calls | Only if you use built-in web search in AI features | https://developers.openai.com/api/docs/pricing |
| OpenAI transcription: gpt-4o-mini-transcribe | Estimated $0.003/minute | Useful if you move voice transcription to OpenAI | https://developers.openai.com/api/docs/pricing |
| OpenAI transcription: gpt-4o-transcribe | Estimated $0.006/minute | Higher-cost transcription option | https://developers.openai.com/api/docs/pricing |

### Voice and Cry Analysis

The repo currently expects custom endpoints for:
- `SPEECH_TRANSCRIBE_ENDPOINT`
- `CRY_ANALYSIS_ENDPOINT`

So there is no fixed price to list here yet. The cost depends entirely on which vendor or internal service you choose.

## 4. Free or No Direct Platform Fee

| Item | Current price | Notes | Source |
| --- | --- | --- | --- |
| Firebase Cloud Messaging (FCM) | $0 direct platform fee | Used for Android native push delivery | https://firebase.google.com/docs/cloud-messaging |
| Apple Push Notification service (APNs) | $0 direct platform fee | Used for iOS native push delivery | https://developer.apple.com/notifications/ |
| VAPID keys | $0 | Only needed for web push, not native push | https://developer.mozilla.org/docs/Web/API/Push_API |
| Paystack integration | $0 setup fee | Paystack says integration is free and there is zero maintenance fee | https://paystack.com/pricing |

## 5. Important Native App Billing Note

This project currently uses Paystack for premium payments, but native app-store billing rules can matter if you sell digital subscriptions inside the iPhone or Android apps.

### Apple

| Item | Current price | Notes | Source |
| --- | --- | --- | --- |
| Apple standard App Store commission | 30% | Standard commission on paid apps and in-app purchases | https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf |
| Apple auto-renewing subscriptions after 1 year | 15% | Subsequent renewals after more than one year of paid service in a subscription group | https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf |
| Apple Small Business Program | 15% | Reduced commission if you qualify and stay under the proceeds threshold | https://developer.apple.com/app-store/small-business-program/ |

### Google Play

| Item | Current price | Notes | Source |
| --- | --- | --- | --- |
| Google Play developer account | $25 one-time | Account registration fee | https://support.google.com/googleplay/android-developer/answer/6112435 |
| Google Play subscriptions | 15% | For automatically renewing subscription products | https://support.google.com/googleplay/android-developer/answer/112622 |
| Google Play digital purchases | 15% for the first $1M yearly revenue, then 30% above that if enrolled in the 15% tier | Applies to paid downloads and in-app purchases under Google Play billing rules | https://support.google.com/googleplay/android-developer/answer/112622 |

## 6. Fast Budget Summary

### Minimum realistic paid stack before transaction fees

- Vercel Pro: $20/month
- Supabase Pro: about $25/month for a simple one-project production setup according to Supabase's own billing example
- Apple Developer Program: $99/year
- Google Play Console: $25 one-time

### In plain English

- Your baseline recurring platform cost is roughly $45/month before email, AI, or heavy overages.
- Your first unavoidable mobile publishing fees are $99/year for Apple and $25 one-time for Google Play.
- Your payment cost is mostly `Paystack transaction fees`, not a flat monthly Paystack subscription.
- `FCM`, `APNs`, and `VAPID` are not the things that will make this app expensive.

## 7. Recommended Starting Budget

If you launch with:
- 1 Vercel Pro seat
- 1 Supabase Pro organization
- Paystack
- no paid email yet
- no paid AI yet

Then a good starter budget is:

- Platform baseline: about $45/month
- Apple Developer Program: $99/year
- Google Play Console: $25 one-time
- Payment processing: variable, based on revenue

If you also enable:
- Resend Pro, add $20/month
- OpenAI, add usage-based token costs

