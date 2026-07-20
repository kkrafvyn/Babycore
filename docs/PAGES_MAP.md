# Cradlyn Pages Map

## Entry Flow

`src/App.tsx` is the real top-level router. It currently uses hash-based public routes plus session state:

| State | Screen | File |
| --- | --- | --- |
| `#welcome` or default | Welcome | `src/app/components/Material3Welcome.tsx` |
| `#onboarding` | Onboarding | `src/app/components/Material3Onboarding.tsx` |
| `#login` | Auth / sign in | `src/app/components/AuthScreen.tsx` |
| signed in or guest, no baby | Add baby | `src/app/components/Material3AddBaby.tsx` |
| signed in or guest, baby exists | Main app shell | `src/app/components/EnhancedDashboard.tsx` |

## Main App Views

`EnhancedDashboard.tsx` is the primary in-app page switcher. It supports these views:

| View Key | Screen |
| --- | --- |
| `dashboard` | Dashboard home |
| `feeding` | `FeedingTracker.tsx` |
| `sleep` | `SleepTracker.tsx` |
| `diaper` | `DiaperLog.tsx` |
| `vaccination` | `VaccinationCalendar.tsx` |
| `journal` | `JournalScreen.tsx` |
| `growth` | `GrowthChart.tsx` |
| `settings` | `SettingsScreen.tsx` |
| `logs` | `HistoryLogs.tsx` |
| `export` | `ExportScreen.tsx` |
| `partner-sync` | `PartnerSyncScreen.tsx` |
| `health` | `HealthDashboard.tsx` |
| `memories` | `MemoriesScreen.tsx` |
| `timeline` | `DailyTimeline.tsx` |
| `insights` | `SmartInsights.tsx` |
| `predictor` | `RoutinePredictor.tsx` |
| `tips` | `AgeTips.tsx` |
| `photos` | `MonthlyPhotos.tsx` |
| `report` | `PediatricianReport.tsx` |
| `handoff` | `CaregiverHandoff.tsx` |
| `baby-journal` | `BabyJournal.tsx` |
| `sleep-training` | `SleepTraining.tsx` |
| `white-noise` | `WhiteNoise.tsx` |
| `achievements` | `Achievements.tsx` |
| `reminders` | `SmartReminders.tsx` |
| `compare` | `MultiBabyComparison.tsx` |
| `scrapbook` | `AIScrapbook.tsx` |
| `health-alerts` | `HealthAlerts.tsx` |
| `photo-gallery` | `PhotoGallery.tsx` |
| `advanced-analytics` | `AnalyticsDashboard.tsx` |
| `ai-insights` | `AIInsights.tsx` |
| `subscriptions` | `SubscriptionAddons.tsx` |
| `health-records` | `HealthRecords.tsx` |
| `community` | `CommunityForum.tsx` |
| `content-library` | `ContentLibraryBrowser.tsx` |
| `wearable` | `WearableDeviceManager.tsx` |
| `family-sharing` | `FamilySharing.tsx` |
| `voice-logging` | `VoiceLogging.tsx` |
| `doctor-reports` | `DoctorReportGenerator.tsx` |

## Alternate Dashboard Shells

These are in the repo but are not the current production root:

| File | Purpose |
| --- | --- |
| `src/app/components/AppleDashboard.tsx` | Apple-style dashboard shell |
| `src/app/components/Dashboard.tsx` | Older dashboard shell |
| `src/app/components/Material3Dashboard.tsx` | Material 3 dashboard variant |
| `src/app/components/DashboardPage.tsx` | Design-focused dashboard page |

## Supporting Screens

Additional pages/components that are navigated from the main views or alternate shells:

- `ActivityTracker.tsx`
- `MedicalRecords.tsx`
- `MilestonesTracker.tsx`
- `DataBackup.tsx`
- `DataExportScreen.tsx`
- `PaymentScreen.tsx`
- `Paywall.tsx`
- `PWAInstallPrompt.tsx`
- `PrivacyLock.tsx`

## Navigation Notes

- Public onboarding/auth uses URL hash routing.
- Logged-in deep links can use `?view=<view-key>`, which `App.tsx` forwards to `EnhancedDashboard.tsx` through the `nav_deep_link` event.
- Guest mode follows the same in-app routing once the guest session flag is set.

Last updated: April 24, 2026
