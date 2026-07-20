# HealthKit App Store Declaration

## Requested Apple Health Reads

Cradlyn currently requests read-only access to:

- heart rate
- step count
- sleep analysis
- workouts and exercise duration
- body temperature

The current native plugin does not request HealthKit write access.

## In-App Disclosure Copy

Use this same meaning anywhere Apple Health access is described in the app, App Review notes, or the privacy policy:

> Cradlyn requests read-only access to heart rate, steps, sleep sessions, exercise duration, and body temperature from Apple Health so you can import caregiver-approved health trends into your baby's timeline, reminders, and summaries. You can stop using Apple Health at any time by disconnecting the source in Wearables.

## App Review Notes

Suggested reviewer note:

> Apple Health access is optional and user initiated. A caregiver opens Wearables, taps Sync Apple Health, reviews the in-app disclosure, and then approves HealthKit read permissions. Cradlyn uses the imported readings only inside the baby's care records, summaries, reminders, and timeline.

## Privacy Policy Notes

Make sure the production privacy policy states:

- Apple Health access is optional.
- Cradlyn reads only the categories listed above.
- Data is imported only after the caregiver grants permission.
- The app currently uses Apple Health as a read-only source for wearable import.

## Manual Validation Before Upload

- Apple Health is available on the test iPhone.
- Tapping `Sync Apple Health` shows the in-app rationale before the iOS permission sheet.
- Denying permissions fails gracefully.
- Granting permissions imports wearable samples into the correct baby timeline.
