# BabyLog Material Design 3 Components

Complete React component library for BabyLog, following **Editorial Serenity Design System** specifications.

## 📦 Components

### Core Screens
- **Material3Dashboard** - Main home screen with activity status cards and quick actions
- **Material3Welcome** - Onboarding hero screen with feature highlights
- **Material3Settings** - User preferences, notifications, and account settings
- **Material3SplashScreen** - Animated loading/branding screen

### Tracking Features  
- **Material3SleepTracker** - Sleep duration timer and history logging
- **Material3FeedingTracker** - Breastfeeding timer, bottle intake, and solids tracking
- **Material3DiaperLog** - Quick diaper change logging with daily summary
- **Material3GrowthChart** - Weight, height, and head circumference tracking with percentile visualization
- **Material3VaccinationCalendar** - Vaccination schedule tracking and completion progress

### Onboarding & Setup
- **Material3AddBaby** - Baby profile creation form with photo upload
- **Material3Onboarding** - Multi-step onboarding (welcome → country → units → notifications)

## 🎨 Design System

All components follow the **Editorial Serenity** design specification:

### Typography
- **Headlines:** Plus Jakarta Sans (font-headline class) - bold, tight letter-spacing
- **Body:** Manrope (font-body/font-label classes) - geometric clarity

### Colors
- **Primary:** `#5e5f61` (charcoal grey)
- **Secondary:** `#45627d` (comfort blue)
- **Tertiary:** `#506267` (sage green)
- **Surface:** `#faf9fc` (off-white)

### Key Design Patterns
- **Asymmetric Cards:** `rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-md rounded-bl-md`
- **Ambient Shadows:** `shadow-[0_8px_32px_rgba(47,51,55,0.05)]`
- **Glassmorphism:** `bg-[#faf9fc]/80 backdrop-blur-xl`
- **Surface Layering:** Use `surface-container-lowest` to `surface` tiers (no 1px borders)

## 🔄 State Management

All components are **AppContext-ready** and prepared for Supabase integration:

```typescript
// AppContext provides:
const context = useAppContext();
const { 
  babies,           // Array<Baby>
  settings,         // UserSettings
  sleepLogs,        // Array<SleepLog>
  feedLogs,         // Array<FeedLog>
  diaperLogs,       // Array<DiaperLog>
  updateSettings,   // (settings: Partial<UserSettings>) => Promise<void>
  refreshBabies,    // () => Promise<void>
} = context || {};
```

## 📥 Usage

### Import Components
```tsx
import {
  Material3Dashboard,
  Material3FeedingTracker,
  Material3Onboarding,
} from '@/app/components';
```

### Integrate with Your App
```tsx
import { Material3Dashboard } from '@/app/components';
import { AppContextProvider } from '@/app/AppContext';

function App() {
  return (
    <AppContextProvider>
      <Material3Dashboard />
    </AppContextProvider>
  );
}
```

## 🚀 Features

### Data Integration
- ✅ Real data from AppContext (no dummy data)
- ✅ Supabase-ready structure
- ✅ Proper state management patterns
- ✅ Loading states and error handling

### Responsiveness
- ✅ Mobile-first design
- ✅ Tablet layouts (md: breakpoint)
- ✅ Web layouts with sidebar navigation
- ✅ Touch-friendly 48x48dp tap targets

### Accessibility
- ✅ Material Symbols icons (Outlined weight)
- ✅ Semantic HTML structure
- ✅ ARIA labels where needed
- ✅ Proper color contrast ratios

### Performance
- ✅ Component composition for reusability
- ✅ Memoization patterns
- ✅ Lazy loading ready
- ✅ Optimized animations (Framer Motion)

## 🔧 Development

### Adding New Features

1. **Follow the Design System:**
   - Use Editorial Serenity colors and typography
   - Apply asymmetric card styling
   - Maintain consistent spacing (use Tailwind scale)

2. **Connect to AppContext:**
   - Use `useAppContext()` hook
   - Handle loading and error states
   - Update state through context methods

3. **Mobile-First Responsive:**
   - Design for mobile first
   - Add `md:` breakpoint variants
   - Test on actual devices

### Example Pattern

```tsx
export const MyNewComponent: React.FC = () => {
  const context = useAppContext();
  const { myData, updateMyData } = context || {};
  
  const handleUpdate = async () => {
    try {
      await updateMyData?.({ /* ... */ });
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9fc] pb-32">
      {/* Your component */}
    </div>
  );
};
```

## 📚 Design Reference

For complete design specifications, see:
- `stitch_babylog_global_activity_tracker/serenity_log/DESIGN.md`

Key sections:
- Colors & Tonal Strategy
- Typography Hierarchy
- Elevation & Depth (Tonal Layering)
- Components (Buttons, Inputs, Cards)
- Do's and Don'ts
- Roundedness Scale

## 🎯 Next Steps

- [ ] Integrate with real Supabase backend
- [ ] Add unit tests for each component
- [ ] Implement dark mode variants
- [ ] Add accessibility audit
- [ ] Performance optimization
- [ ] E2E testing

## 📝 Notes

- All components use `pb-32` or `pb-20` for bottom nav safe area
- BottomNavigation component is used across mobile layouts
- Web layouts use sidebar navigation (md: breakpoint)
- All colors use hex codes for consistency with design tokens
- Animation framework: Framer Motion (motion/react)

---

**Design System:** Editorial Serenity | **Framework:** React 18 + TypeScript | **Styling:** Tailwind CSS + Material Design 3
