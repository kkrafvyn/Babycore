# Health Connect Release Notes

## Requested Android Health Connect Reads

BabyLog currently requests read-only access to:

- heart rate
- steps
- sleep sessions
- exercise or activity duration
- body temperature

These match the permissions declared by the local native wearables plugin.

## In-App Permission Rationale Copy

Use this same meaning anywhere Health Connect is described in the app, the Play Console, or the privacy policy:

> BabyLog requests read-only access to heart rate, steps, sleep, exercise duration, and body temperature from Android Health Connect. We use these readings only to import caregiver-approved health trends into your baby's timeline, reminders, and summaries. You can stop using Health Connect at any time by disconnecting the source in Wearables.

## Privacy Policy Copy

Add a section to the production privacy policy that says:

> If you choose to connect Android Health Connect, BabyLog may read heart rate, steps, sleep sessions, exercise duration, and body temperature that you explicitly allow through Health Connect permissions. This data is used only to import health information into the baby's care records, display health trends, and support caregiver features inside the app. BabyLog does not request write access to Health Connect for this feature.

## Play Console Declaration Notes

- Declare that Health Connect access is optional and user initiated.
- Declare that the app reads health or fitness data for caregiving, history, and trend display.
- Match the exact data types listed above.
- Link the production privacy policy URL that contains matching Health Connect disclosure language.
- Keep store listing screenshots and app copy consistent with the in-app rationale.

## Manual Android Verification

Before release, verify on a physical Android device:

- Health Connect is installed and available on the device.
- Tapping `Sync Health Connect` shows the rationale language before permission grant.
- Granting access succeeds and imported readings appear in Wearables.
- Disconnecting the wearable source stops future imports until the user reconnects it.
- Denying permission leaves the app usable and shows a clear failure message.
