# Android Play Release Checklist

## Current Release Identity

- Application ID: `com.babylog.app`
- Version code: `2`
- Version name: `1.0.1`
- Min SDK: `26`
- Target SDK: `36`
- Compile SDK: `36`

## Upload Key Fingerprints

- SHA-1: `23:46:1F:9F:89:6C:93:65:97:B9:58:90:16:B0:16:3D:48:2C:5C:9D`
- SHA-256: `F8:E6:5A:70:61:24:D7:01:60:E0:A2:62:37:19:62:92:4C:24:3E:24:9E:4C:B4:1C:12:28:F8:17:68:CB:BD:EE`

Use these in Google Play Console, Firebase, Google Sign-In, or any provider that needs the Android signing fingerprints.

## Local Signing Files

Keep these backed up outside the repo:

- `android/babylog-upload-keystore.jks`
- `android/keystore.properties`

If you lose them, future Play updates will be much harder.

## Native Push Files

These are not required for local notifications only.
Add them only if you later turn on native remote push in production:

- `android/app/google-services.json`

The iOS Capacitor push plugin does not require `GoogleService-Info.plist`; iPhone remote push uses APNs capability setup plus backend APNs credentials.

## Build Commands

Run Android release builds from an `NTFS` workspace, not the `F:` FAT32 drive.

```powershell
npm run cap:sync:android
cd android
./gradlew.bat --no-daemon clean assembleRelease bundleRelease
```

Expected outputs:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Native App Config

- Set `VITE_NATIVE_API_BASE_URL` in the production build env to your hosted API root, for example `https://babycore.vercel.app/api`.
- Keep `VITE_API_BASE_URL` and `VITE_API_BASE_URL_PROD` for the web deployment if you still want same-origin `/api` there.

## Real Device Smoke Test

Run this on a physical Android device before upload:

- Local reminders: enable notifications, background the app, and confirm a scheduled reminder appears.
- App shortcuts: long-press the launcher icon and verify feed, sleep, diaper, and emergency shortcuts open the right screens.
- Home-screen widget: add the BabyLog widget and verify each quick action opens the matching screen.
- Camera: take a photo from add-baby, monthly photos, and gallery flows.
- Health Connect: if shipping wearable sync, complete a permission grant and verify imported readings appear in Wearables.

See [HEALTH_CONNECT_PLAY_DECLARATION.md](/f:/3D%20Splash%20Screen%20Design/android/HEALTH_CONNECT_PLAY_DECLARATION.md:1) for the release disclosure and Play Console copy.

## Remaining Production Gaps

- Replace placeholder production secrets in `.env.production`.
- Set the native app production API base URL before the next Android/iOS release build.
- Add Firebase native config files only if Android/iOS remote push is required later.
- Register the upload key fingerprints with any Google/Firebase auth providers you use.
- Complete the physical Android smoke test above before Play upload.
