# Google Sign-In on Android AAB (Cradlyn)

Cradlyn uses **Supabase OAuth in the system browser**, not the native Google Sign-In SDK. Play App Signing SHA-1 is **not** required for this browser flow, but Supabase + Google Cloud must be configured correctly.

## How the AAB flow works

1. User taps **Google** in the app
2. App opens Google/Supabase OAuth in the **system browser**
3. After login, Supabase redirects to `com.cradlyn.app://auth/callback?code=...`
4. Android opens Cradlyn and the app exchanges the code for a session

## 1. Supabase — Redirect URLs

**Authentication → URL Configuration → Redirect URLs**

Must include exactly:

```
com.cradlyn.app://auth/callback
https://cradlyn.com
https://www.cradlyn.com
```

Remove invalid entry: `com.cradlyn.app` (package name only).

## 2. Supabase — Google provider

**Authentication → Providers → Google**

- Enable Google
- Add **Client ID** and **Client Secret** from Google Cloud (Web client)
- Save

## 3. Google Cloud — Web OAuth client

**APIs & Services → Credentials → OAuth 2.0 Client IDs → Web client**

Authorized redirect URI **must** include Supabase callback:

```
https://mohragovqqyhssnkyigh.supabase.co/auth/v1/callback
```

Authorized JavaScript origins (optional for web):

```
https://cradlyn.com
https://www.cradlyn.com
```

Copy this Web client's **Client ID** and **Secret** into Supabase Google provider settings.

## 4. Android deep link (already in app)

`AndroidManifest.xml` intent filter:

- Scheme: `com.cradlyn.app`
- Host: `auth`
- Path: `/callback`

Code constant: `MOBILE_AUTH_CALLBACK_URL` in `src/lib/supabase.ts`

## 5. Rebuild AAB after auth code changes

```powershell
npm run cap:sync:android
cd android
.\gradlew.bat bundleRelease
```

Upload the new AAB to Play Console.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser opens, then nothing happens | Add `com.cradlyn.app://auth/callback` in Supabase redirect URLs |
| "redirect_uri_mismatch" in browser | Fix Google Cloud Web client redirect URI to Supabase `/auth/v1/callback` |
| "Sign in did not finish" toast | User closed browser early, or deep link not returning to app — reinstall latest AAB |
| Google button does nothing | Supabase env missing in build — rebuild with `.env.production.local` present |
| Works on web, fails on AAB | Almost always Supabase redirect URL or Google provider config |

## Optional: native Google Sign-In SDK (not used)

If you later switch to `@capacitor/google-auth` or Firebase Google Sign-In, register these SHA-1 values in Firebase / Google Cloud **Android** OAuth client:

- **Play app signing:** `DF:B8:47:33:FE:92:C6:8F:E4:04:23:15:D0:44:D9:11:6B:C8:DC:35`
- **Upload key:** `7C:62:23:BE:B9:D7:3A:3D:95:00:4B:1C:31:A8:6B:B5:BD:17:D5:98`

See `android/certificates/README.md`.
