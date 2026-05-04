# iOS Release Checklist

Current shell metadata in this repo:

- Bundle identifier: `com.babylog.app`
- Marketing version: `1.0.1`
- Build number: `2`
- Minimum iOS version: `15.0`
- Notifications mode: APNs-ready native push via Capacitor + backend APNs auth
- Wearables source: Apple Health read-only import

## Before Opening Xcode

1. Clone the repo onto the Mac.
2. Make sure `.env.production` contains the production values used for web and native builds.
3. Run `npm ci`.
4. Run `npm run build:frontend`.
5. Run `npm run cap:sync:ios`.
6. Open `ios/App/App.xcodeproj` in Xcode.

## Xcode Setup

In the `App` target, confirm these settings before archiving:

- `Signing & Capabilities`
- Select your Apple Developer team.
- Keep `Automatically manage signing` enabled unless your release process requires manual provisioning.
- Confirm the bundle identifier is the App Store identifier you want to ship.
- Confirm `HealthKit` capability is present.
- Confirm `Push Notifications` capability is present.
- Confirm the `App.entitlements` file contains the APNs entitlement.

- `General`
- Confirm `Version` is `1.0.1`.
- Confirm `Build` is `2`.
- Confirm deployment target is `iOS 15.0` or later.

## Real Device Smoke Test

Run these on a physical iPhone before uploading:

- Launch, onboarding, sign in, and guest flow.
- Add/edit baby profile.
- Camera capture and photo-library attach flow.
- Local reminder scheduling and notification delivery.
- Remote push permission, token registration, and delivery while the app is backgrounded.
- Home-screen quick actions from the app icon.
- Apple Health permission prompt, sync, and imported readings in Wearables.

## Archive Flow

1. Choose `Any iOS Device (arm64)` or a connected release device.
2. Use `Product > Archive`.
3. In Organizer, run `Validate App`.
4. Use `Distribute App > App Store Connect`.

## App Store Notes

- Apple Health access is optional and user initiated from the Wearables screen.
- The current plugin only requests read access, not write access.
- Backend iPhone push delivery uses APNs auth credentials; no `GoogleService-Info.plist` is required for this Capacitor plugin setup.
- If App Store Connect or App Review asks for health-data explanation, use [HEALTHKIT_APP_STORE_DECLARATION.md](./HEALTHKIT_APP_STORE_DECLARATION.md).
