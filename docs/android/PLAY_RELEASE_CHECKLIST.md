# Android Play Release Checklist

## Current Release Identity

- Application ID: `com.cradlyn.app`
- Version code: `5`
- Version name: `1.0.3`
- Min SDK: `26`
- Target SDK: `36`
- Compile SDK: `36`

## Upload Key Fingerprints

These match the certificates in `android/certificates/` (from Google Play App Signing) and the local upload keystore.

### App signing certificate (production installs)

Register in Firebase / Google Cloud OAuth for release builds from Play:

- SHA-1: `DF:B8:47:33:FE:92:C6:8F:E4:04:23:15:D0:44:D9:11:6B:C8:DC:35`
- SHA-256: `45:F7:B3:AA:15:05:C2:BD:55:49:A1:93:16:8F:D7:8A:7E:C3:33:0B:5A:B5:89:17:C3:3C:82:3C:35:C5:3B:E6`
- File: `android/certificates/deployment_cert.der`

### Local upload keystore (AAB signing before Play upload)

- SHA-1: `7C:62:23:BE:B9:D7:3A:3D:95:00:4B:1C:31:A8:6B:B5:BD:17:D5:98`
- SHA-256: `5B:7E:16:8D:FA:D5:3D:41:FF:F0:41:D1:89:B8:80:2A:56:DE:69:E4:A1:6C:50:DF:1A:3D:E6:FD:3A:C2:F7:5C`

Also add the Play upload classical cert if Google Sign-In fails on internal test tracks:

- SHA-1: `9E:2F:06:6E:EF:77:A1:57:D2:E6:50:F7:28:6E:52:9D:34:19:59:D9`
- File: `android/certificates/hybrid_classical_cert.der`

Use these in Google Play Console, Firebase, Google Sign-In, or any provider that needs the Android signing fingerprints.

## Local Signing Files

Keep these backed up outside the repo:

- `android/babylog-upload-keystore.jks`
- `android/keystore.properties`

Play Console public certificates (safe to commit):

- `android/certificates/deployment_cert.der`
- `android/certificates/hybrid_classical_cert.der`
- `android/certificates/hybrid_pqc_cert.der`

See `android/certificates/README.md` for SHA-1/SHA-256 values to register in Firebase.

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
- `android/app/build/outputs/mapping/release/mapping.txt` (upload to Play as deobfuscation file)
- `android/app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip` (upload to Play as native debug symbols)

## Native App Config

- Set `VITE_NATIVE_API_BASE_URL` in the production build env to your hosted API root, for example `https://app.example.com/api`.
- Keep `VITE_API_BASE_URL` and `VITE_API_BASE_URL_PROD` for the web deployment if you still want same-origin `/api` there.

## Real Device Smoke Test

Run this on a physical Android device before upload:

- Local reminders: enable notifications, background the app, and confirm a scheduled reminder appears.
- App shortcuts: long-press the launcher icon and verify feed, sleep, diaper, and emergency shortcuts open the right screens.
- Home-screen widget: add the Cradlyn widget and verify each quick action opens the matching screen.
- Camera: take a photo from add-baby, monthly photos, and gallery flows.
- Health Connect: if shipping wearable sync, complete a permission grant and verify imported readings appear in Wearables.

See [HEALTH_CONNECT_PLAY_DECLARATION.md](./HEALTH_CONNECT_PLAY_DECLARATION.md) for the release disclosure and Play Console copy.

See [PLAY_PERSONAL_ACCOUNT_COMPLIANCE.md](./PLAY_PERSONAL_ACCOUNT_COMPLIANCE.md) for Personal-account Play Console category and health declaration guidance.

## Remaining Production Gaps

- Replace placeholder production secrets in `.env.production`.
- Set the native app production API base URL before the next Android/iOS release build.
- Add Firebase native config files only if Android/iOS remote push is required later.
- Register the upload key fingerprints with any Google/Firebase auth providers you use.
- Complete the physical Android smoke test above before Play upload.
