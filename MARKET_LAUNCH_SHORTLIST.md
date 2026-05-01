# Market Launch Shortlist

Current status:

- Web production is live at `https://babycore.vercel.app`.
- Android signed release artifacts are ready.
- iOS project is prepared, but the final archive must be created on a Mac in Xcode.
- Notifications are set to local notifications only.

## What We Still Need To Do

1. Rotate any production secrets that were pasted during setup, then update the live envs and local `.env.production`.
2. Run final real-device smoke tests on Android and iPhone:
   - sign in / guest flow
   - add baby flow
   - camera and photo upload
   - local reminders
   - wearable import
   - payment flow
3. Upload the Android AAB to Google Play internal testing and complete the Health Connect declaration.
4. Install the Android build from Play internal testing and verify the production flow on a real device.
5. On a Mac, run `npm ci`, `npm run cap:sync:ios`, open Xcode, set signing, archive the app, and upload it to TestFlight.
6. Complete App Store Connect and Google Play listing items:
   - screenshots
   - description
   - support URL
   - privacy policy URL
7. Fix anything found in TestFlight or Play internal testing, then submit/release.

## Supporting Docs

- [Android release checklist](./android/PLAY_RELEASE_CHECKLIST.md)
- [Android Health Connect declaration](./android/HEALTH_CONNECT_PLAY_DECLARATION.md)
- [iOS release checklist](./ios/IOS_RELEASE_CHECKLIST.md)
- [iOS HealthKit declaration](./ios/HEALTHKIT_APP_STORE_DECLARATION.md)
