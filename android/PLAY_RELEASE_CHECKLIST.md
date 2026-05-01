# Android Play Release Checklist

## Current Release Identity

- Application ID: `com.babylog.app`
- Version code: `1`
- Version name: `1.0`
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

Add these before turning on native Firebase push in production:

- `android/app/google-services.json`
- `ios/App/App/GoogleService-Info.plist`

Both are ignored by git in this repo.

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

## Remaining Production Gaps

- Replace placeholder production secrets in `.env.production`.
- Add Firebase native config files if Android/iOS push is required.
- Register the upload key fingerprints with any Google/Firebase auth providers you use.
- Increment `versionCode` before every Play Store update after the first upload.
