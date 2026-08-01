# Test the release AAB on an Android emulator (no read-only terminal needed)

## Easiest way (double-click)

1. Open **File Explorer** → `E:\baby\Babycore`
2. Double-click **`run-emulator-test.bat`**
3. Wait for the Android emulator window to open (first run downloads ~1 GB)
4. The script installs **Cradlyn 1.0.8** from the AAB and launches it

## Or use Android Studio (Option C GUI)

1. Open **Android Studio**
2. **Tools → Device Manager**
3. Click **Create Device** → choose **Pixel 6** → **Android 34 (Google APIs)** → Finish
4. Click the **Play** button on the virtual device to start it
5. In a normal PowerShell or Command Prompt (Win+R → `cmd`):

```bat
cd /d E:\baby\Babycore
npm run run:aab
```

## What gets tested

- Same release AAB as Play Store (`cradlyn-1.0.8-v10.aab`)
- AI (Care Copilot), sign-in, and cloud data sync

## If download is slow or stuck

The first run installs the Android 34 system image. Keep the window open 10–20 minutes on first run.

If it fails, use Android Studio Device Manager to create the emulator manually, start it, then run `npm run run:aab`.

## One-liner commands (normal terminal)

```bat
npm run setup:emulator    REM create/start emulator only
npm run run:aab           REM install AAB when emulator is running
npm run run:aab:emulator  REM both steps
```
