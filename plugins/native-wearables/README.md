# Native Wearables Plugin

Local Capacitor plugin for:

- iOS `HealthKit`
- Android `Health Connect`

Exposed JS plugin name:

- `NativeWearables`

Methods:

- `isAvailable()`
- `requestPermissions()`
- `syncSince({ since })`

What this plugin reads:

- heart rate
- steps
- sleep sessions
- exercise/activity duration
- temperature

No vendor API keys are required for this bridge.

Setup notes:

- iOS:
  - `Info.plist` usage strings are already present in the app shell.
  - `App.entitlements` enables the HealthKit capability in the Xcode project.
  - You still need to archive/sign the app from Xcode on macOS.
- Android:
  - The plugin library includes Health Connect permissions and a native bridge.
  - Before Play Store release, declare the matching health-data access in Play Console and provide a privacy policy/permission rationale activity that matches your production app copy.
  - The Android app shell files are not fully present in this repo snapshot, so the final Gradle wiring happens after the native Android project is restored or regenerated.

Recommended next sync step once native tooling is installed:

- `npx cap sync ios`
- `npx cap sync android`
