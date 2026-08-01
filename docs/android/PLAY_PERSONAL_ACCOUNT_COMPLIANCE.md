# Play Console — Personal Account Compliance (Cradlyn)

Google rejected Cradlyn on a **Personal** developer account because declarations matched **Medical / healthcare services** apps, which require an **Organization** account per [Play Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890).

Cradlyn is a **parenting / wellness tracker**, not a clinical medical product. Align Play Console settings and in-app copy with that positioning.

## 1. Store category

**Grow → Store presence → Store settings → App category → Edit**

| Setting | Value |
|---|---|
| Category | **Parenting** or **Lifestyle** |
| Avoid | **Medical** |

## 2. Health apps declaration

**Policy → App content → Health apps → Manage**

**Select (if applicable):**

- Activity and fitness
- Nutrition and weight management
- Sleep management

**Do not select:**

- Healthcare services / management
- Medication / treatment management
- Regulated medical device / SaMD
- Clinical decision support tool
- Human subjects research
- Government-affiliated health app

## 3. Other App content (confirm)

| Declaration | Answer |
|---|---|
| Advertising ID | **No** |
| Financial features | **No** (expense logs only; Paystack is external) |
| Target audience | **18+** caregivers; not child-directed |
| Government app | **No** |
| Sign-in | Yes — provide reviewer test account |

## 4. Store listing disclaimer

Paste copy from `store-listing/android/store-copy.md` into **Main store listing** (short + full description). Both must include the wellness disclaimer sentence.

## 5. In-app disclaimer (removed)

Wellness disclaimer banners were removed from the app UI per product direction. Legal policies remain available under Settings → Legal Policies.

## 6. Resubmit

1. Save all App content changes
2. **Testing → Closed testing** → release with AAB
3. **Send for review**
4. If rejected again, **Policy status → Appeal** and note corrected category + health declaration + wellness-only positioning

## 7. When you need an Organization account

Only if Cradlyn becomes a **medical provider app** (EHR, telehealth, regulated SaMD, clinical treatment delivery). That requires D-U-N-S, business verification, and app transfer to an Organization account.
