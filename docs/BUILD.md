# Cradlyn App - Build Summary

## Overview
Cradlyn is a cross-platform baby activity tracker following **Apple Human Interface Guidelines**. Built with React + Vite + TypeScript + Tailwind CSS.

## Architecture

### 1. **Data Layer** (`src/lib/`)
- **storage.ts**: IndexedDB-based persistent storage with CRUD operations for:
  - Babies
  - Sleep logs
  - Feed logs
  - Diaper logs
  - Growth measurements
  - Vaccination records
  - User settings
- **utils.ts**: Utility functions for:
  - Date/time formatting (locale-aware)
  - Duration calculations
  - Unit conversions (metric ↔ imperial)
  - Age calculations
  - Validation helpers

### 2. **Type Definitions** (`src/types/`)
- Baby profile
- All log types (Sleep, Feed, Diaper, Growth, Vaccination)
- User settings
- View types

### 3. **State Management** (`src/app/AppContext.tsx`)
- Global app state using React Context
- Manages current baby, settings, app view
- Handles initialization and data refresh
- Authentication-ready structure

### 4. **Onboarding Flow** (`src/app/components/Onboarding/`)
**5-Screen Flow** (following Apple's design principles):
1. **WelcomeScreen** - Introduction with icon and tagline
2. **AddBabyScreen** - Collect baby info (name, DOB, gender, photo)
3. **SelectCountryScreen** - Searchable country list (drives vaccination schedule)
4. **ChooseUnitsScreen** - Metric vs Imperial selection
5. **EnableNotificationsScreen** - Push notification opt-in with explanation

**Apple Design Features:**
- Large touch targets (44x44pt minimum)
- Clear typography hierarchy
- Smooth progress indicator
- Contextual help text
- Safe area respecting

### 5. **Dashboard** (`src/app/components/Dashboard.tsx`)
**Home screen showing:**
- Baby profile card with photo/emoji
- Today's activity summary (4 cards):
  - Sleep (total hours, naps logged)
  - Feeding (count, last time)
  - Diapers (count, last time)
  - Activity (total entries)
- Recent activity feed (5 most recent entries)
- Quick-add buttons (Sleep, Feed, Diaper) - bottom quick actions
- TabBar navigation

**Apple Design Features:**
- Gradient backgrounds for visual hierarchy
- Color-coded activity types
- Status bar with safe area
- Tab bar for main navigation
- Real-time data updates

### 6. **Sleep Tracker** (`src/app/components/SleepTracker.tsx`)
**Features:**
- Start/stop timer for active sleep sessions
- Manual log entry with date/time picker
- Edit/delete functionality
- Daily sleep totals
- Notes field (max 200 chars)
- Grouped by date view

**Apple Design Features:**
- Timer with live duration counter
- Intuitive form layout
- Edit and delete inline actions
- High-contrast action buttons

### 7. **TabBar Navigation** (`src/app/components/TabBar.tsx`)
- iOS-style tab bar
- Icons from lucide-react (SF Symbol alternatives)
- Current view highlighting
- Smooth transitions

### 8. **UI Components** (`src/app/components/ui/`)
- Using shadcn/ui built on Radix UI
- Tailwind CSS for styling
- Responsive design
- Dark mode support via CSS variables

## Key Features Implemented

### ✅ Completed
- [x] Complete data model and storage layer
- [x] Onboarding flow (5 screens)
- [x] Dashboard with activity summary
- [x] Sleep tracker with timer
- [x] Basic navigation
- [x] Dark mode support
- [x] Responsive design
- [x] App state management

### 🔄 In Progress
- [ ] Installing dependencies (npm install)
- [ ] Testing the app

### 📋 TODO
- [ ] Feeding tracker (breast, bottle, solids)
- [ ] Diaper log (quick entry, one-handed)
- [ ] Vaccination calendar (country-specific schedules)
- [ ] Growth chart (WHO percentiles)
- [ ] Settings screen (profile, units, notifications)
- [ ] Data export (PDF/CSV)
- [ ] Cloud sync (premium feature)
- [ ] Notification system
- [ ] Multi-baby support UI
- [ ] Testing and bug fixes

## Apple Design Principles Applied

### 1. **System Design**
- ✅ Safe areas for notches/Dynamic Island
- ✅ Status bar awareness
- ✅ iOS-style tab bar
- ✅ Proper spacing and margins

### 2. **Clarity**
- ✅ Clear typography hierarchy (SF Pro Display)
- ✅ Descriptive labels
- ✅ Helpful hints and instructions
- ✅ Visual feedback

### 3. **Deference**
- ✅ Content takes priority
- ✅ Minimal UI chrome
- ✅ Contextual information
- ✅ Smart defaults (locale-based)

### 4. **Depth**
- ✅ Layered backgrounds
- ✅ Gradient cards
- ✅ Shadow effects
- ✅ Visual hierarchy via color

### 5. **Accessibility**
- ✅ Large touch targets
- ✅ Color + icon combinations
- ✅ Semantic HTML
- ✅ ARIA labels ready

### 6. **Dark Mode**
- ✅ Full dark mode support
- ✅ Dynamic colors
- ✅ Proper contrast ratios
- ✅ System integration ready

## File Structure
```
src/
├── types/
│   └── index.ts
├── lib/
│   ├── storage.ts (IndexedDB)
│   ├── utils.ts (utilities)
│   └── supabase.ts (future cloud sync)
├── app/
│   ├── AppContext.tsx
│   ├── App.tsx (main entry)
│   └── components/
│       ├── Onboarding/
│       │   ├── OnboardingFlow.tsx
│       │   └── screens/
│       │       ├── WelcomeScreen.tsx
│       │       ├── AddBabyScreen.tsx
│       │       ├── SelectCountryScreen.tsx
│       │       ├── ChooseUnitsScreen.tsx
│       │       └── EnableNotificationsScreen.tsx
│       ├── Dashboard.tsx
│       ├── SleepTracker.tsx
│       ├── TabBar.tsx
│       ├── SplashScreen.tsx
│       ├── ThemeProvider.tsx
│       └── ui/ (shadcn/ui components)
└── styles/
    ├── index.css
    └── ...
```

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: lucide-react (SF Symbol style)
- **Storage**: IndexedDB
- **Date Utils**: date-fns
- **Development**: VS Code

## Getting Started

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## API Reference

### Storage Functions
All functions automatically handle errors and return Promises.

#### Babies
```typescript
addBaby(baby: Baby): Promise<void>
getBabies(): Promise<Baby[]>
getBaby(id: string): Promise<Baby | undefined>
updateBaby(baby: Baby): Promise<void>
deleteBaby(id: string): Promise<void>
```

#### Sleep Logs
```typescript
addSleepLog(log: SleepLog): Promise<void>
getSleepLogsByBaby(babyId: string): Promise<SleepLog[]>
updateSleepLog(log: SleepLog): Promise<void>
deleteSleepLog(id: string): Promise<void>
```

Similar API for FeedLogs, DiaperLogs, GrowthMeasurements, VaccinationRecords.

### Utility Functions
```typescript
formatBabyAge(dateOfBirth: string): string
formatDate(date: string | Date, locale: string): string
formatTime(date: string | Date, use24Hour: boolean): string
formatDuration(minutes: number): string
calculateDuration(startTime: string, endTime: string): number
convertWeight(value: number, fromUnit, toUnit): number
// ... and more
```

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Feeding tracker
- [ ] Diaper log
- [ ] Settings screen
- [ ] Vaccination calendar

### Phase 2 (Short-term)
- [ ] Premium features (growth chart, data export)
- [ ] Cloud sync with Supabase
- [ ] Multi-baby UI improvements
- [ ] Notifications system
- [ ] Data migration for free→premium

### Phase 3 (Long-term)
- [ ] iOS native app
- [ ] Android native app  
- [ ] Backend API
- [ ] Cloud backup
- [ ] Data sharing between parents
- [ ] Health provider integration

## Notes
- All timestamps are ISO 8601 format
- Locale detection is automatic from device settings
- Offline-first: all data stored locally on device
- No user authentication required yet (single user mode)
- Responsive design for all screen sizes
