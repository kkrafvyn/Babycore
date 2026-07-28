# Supabase Auth Redirect URLs (Cradlyn)

Configure in **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**.

## Remove this (invalid)

| URL | Why |
|---|---|
| `com.cradlyn.app` | Package name only — **not** a valid redirect URI. OAuth will fail or behave unpredictably. |

## Keep / add these

### Production web

```
https://cradlyn.com
https://www.cradlyn.com
https://cradlyn.com/
https://www.cradlyn.com/
```

Web sign-in uses the current page origin, or `VITE_SUPABASE_AUTH_REDIRECT_URL` when set in Vercel.

### Native Android / iOS app

```
com.cradlyn.app://auth/callback
```

Required for Google/Apple OAuth when the app is installed from Play Store / App Store. Matches `MOBILE_AUTH_CALLBACK_URL` in `src/lib/supabase.ts` and the Android intent filter in `AndroidManifest.xml`.

### Local development (optional)

```
http://localhost:5173
http://localhost:5173/
http://localhost:3000
http://localhost:3000/
```

## Site URL (Supabase)

Set **Site URL** to:

```
https://www.cradlyn.com
```

(or `https://cradlyn.com` if that is your canonical domain — use the same one everywhere)

## Vercel env

```
VITE_SUPABASE_AUTH_REDIRECT_URL=https://www.cradlyn.com
```

## Google Cloud OAuth (separate from this list)

In **Google Cloud Console → APIs & Services → Credentials → Web client**, authorized redirect URI must include Supabase’s callback, e.g.:

```
https://mohragovqqyhssnkyigh.supabase.co/auth/v1/callback
```

Android OAuth client uses package `com.cradlyn.app` + SHA-1 fingerprints — **not** the bare string `com.cradlyn.app` in Supabase redirect URLs.

## Quick checklist

- [ ] Deleted `com.cradlyn.app` from Supabase redirect URLs
- [ ] Added `com.cradlyn.app://auth/callback`
- [ ] Added both `cradlyn.com` and `www.cradlyn.com` (with and without trailing `/`)
- [ ] Site URL set to production domain
- [ ] `VITE_SUPABASE_AUTH_REDIRECT_URL` set on Vercel
