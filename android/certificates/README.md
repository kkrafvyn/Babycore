# Google Play signing certificates

These `.der` files come from **Google Play Console → App → Setup → App signing → App signing key certificate / Upload key certificate**.

They are public certificates only (safe to commit). Do **not** put your `.jks` keystore or passwords here.

| File | Purpose |
| --- | --- |
| `deployment_cert.der` | **App signing key** — Google re-signs release builds with this before users install. Register this SHA-1 in Firebase / Google Cloud for production Google Sign-In and FCM. |
| `hybrid_classical_cert.der` | **Upload key (classical RSA)** — used with Play App Signing hybrid keys. |
| `hybrid_pqc_cert.der` | **Upload key (post-quantum hybrid)** — future-facing Play signing identity. |

## Fingerprints to register

Add these in [Firebase Console](https://console.firebase.google.com) → Project settings → Your apps → Android `com.cradlyn.app` → **Add fingerprint**, and in [Google Cloud Console](https://console.cloud.google.com) OAuth client for Android if you use Google Sign-In.

### App signing certificate (`deployment_cert.der`)

- SHA-1: `DF:B8:47:33:FE:92:C6:8F:E4:04:23:15:D0:44:D9:11:6B:C8:DC:35`
- SHA-256: `45:F7:B3:AA:15:05:C2:BD:55:49:A1:93:16:8F:D7:8A:7E:C3:33:0B:5A:B5:89:17:C3:3C:82:3C:35:C5:3B:E6`

### Upload key — classical (`hybrid_classical_cert.der`)

- SHA-1: `9E:2F:06:6E:EF:77:A1:57:D2:E6:50:F7:28:6E:52:9D:34:19:59:D9`
- SHA-256: `A3:D3:BF:9C:05:E2:1B:66:0D:6C:32:7E:6B:DF:B2:34:65:38:7E:29:43:77:D4:C2:B4:5D:62:C4:18:02:7E:43`

### Local upload keystore (`android/babylog-upload-keystore.jks`)

Used by Gradle to sign the AAB/APK before upload. Keep the `.jks` and `keystore.properties` backed up locally (both are gitignored).

- SHA-1: `7C:62:23:BE:B9:D7:3A:3D:95:00:4B:1C:31:A8:6B:B5:BD:17:D5:98`
- SHA-256: `5B:7E:16:8D:FA:D5:3D:41:FF:F0:41:D1:89:B8:80:2A:56:DE:69:E4:A1:6C:50:DF:1A:3D:E6:FD:3A:C2:F7:5C`

After adding fingerprints in Firebase, download a fresh `google-services.json` into `android/app/`.
