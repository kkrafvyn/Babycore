# BabyLog Material Design 3 Components

This folder contains the BabyLog UI components used across onboarding, tracking, sharing, and settings flows.

## Core Components
- `Material3Dashboard`
- `Material3Welcome`
- `Material3Settings`
- `Material3SplashScreen`

## Tracking Components
- `Material3SleepTracker`
- `Material3FeedingTracker`
- `Material3DiaperLog`
- `Material3GrowthChart`
- `Material3VaccinationCalendar`

## Integration Notes
- Components are wired to `AppContext`.
- Data operations are Supabase-backed.
- Mobile-first layouts are used throughout.
- Bottom navigation safe-area padding is applied where needed.

## Engineering Status
- Uses real app data from context and backend services.
- Designed for responsive behavior across mobile and desktop breakpoints.
- Ready for incremental feature additions and testing.
