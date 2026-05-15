# Material Design 3 - BabyLog Implementation Guide

## Color System

### Primary Colors
- **Primary**: `#5e5f61` (Gray) - Main brand color
- **On Primary**: `#f9f9fb` (Off-white) - Text/content on primary
- **Primary Container**: `#e2e2e5` (Light Gray) - Contained actions background

### Secondary Colors  
- **Secondary**: `#45627d` (Blue-Gray) - Secondary actions
- **On Secondary**: `#f6f9ff` (Light Blue) - Text on secondary
- **Secondary Container**: `#cde5ff` (Light Blue) - Secondary container background

### Tertiary Colors
- **Tertiary**: `#506267` (Teal) - Accent color
- **On Tertiary**: `#effbff` (Cyan) - Text on tertiary
- **Tertiary Container**: `#e3f7fd` (Light Cyan) - Tertiary container background

### Surface Colors
- **Surface**: `#faf9fc` (Almost white) - Main background
- **On Surface**: `#2f3337` (Dark) - Main text color
- **Surface Container**: `#edeef2` - Container backgrounds
- **Surface Container Low**: `#f3f3f7` - Light containers
- **Surface Container Lowest**: `#ffffff` - Lightest containers (cards)
- **Surface Variant**: `#e0e2e8` - Borders, dividers

### Error Colors
- **Error**: `#a83836` - Error state
- **Error Container**: `#fa746f` - Error container
- **On Error**: `#fff7f6` - Text on error

## Typography

### Font Families
- **Headline Font**: Plus Jakarta Sans (font-headline)
  - Weights: 700, 800
  - Use for: Headings, titles, labels
  
- **Body Font**: Manrope (font-body)
  - Weights: 400, 500, 600
  - Use for: Body text, descriptions

- **Label Font**: Manrope (font-label)
  - Weights: 400, 500, 600
  - Use for: Small text, captions, labels

### Text Styles
```
H1: font-headline text-4xl font-extrabold
H2: font-headline text-2xl font-bold
H3: font-headline text-xl font-bold
H4: font-headline text-lg font-semibold
Body Large: font-body text-base
Body: font-body text-sm
Label: font-label text-xs
```

## Border Radius

- **Default**: `1rem` (16px) - Standard radius
- **lg**: `2rem` (32px) - Large radius for cards
- **xl**: `3rem` (48px) - Extra large radius
- **full**: `9999px` - Fully rounded (circles, pills)

## Components

### Buttons
- **Contained Button**: `bg-secondary text-on-secondary p-4 rounded-xl font-headline font-bold`
- **Tonal Button**: `bg-secondary-container text-on-secondary-container p-4 rounded-xl font-headline`
- **Outlined Button**: `border border-outline text-on-surface p-4 rounded-xl`

### Cards
- **Card**: `bg-surface-container-lowest border border-surface-variant p-6 rounded-xl shadow-sm`
- **Elevated Card**: `bg-surface-container-lowest shadow-editorial rounded-xl`

### Input Fields
```tsx
<input
  className="w-full px-4 py-3 bg-surface-container border border-surface-variant rounded-lg text-on-surface focus:outline-none focus:border-secondary"
/>
```

### Navigation
- **Bottom Navigation**: Fixed bottom, 4 tabs
- **Top App Bar**: 56px height, elevation shadow
- **Tab Item**: Icon + Label below

### Status Cards (Bento Grid)
```tsx
<div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-variant">
  <div className="flex items-center gap-2 mb-4">
    <div className="p-2 bg-secondary-container rounded-lg">
      <Icon />
    </div>
  </div>
  <p className="text-2xl font-bold">Value</p>
  <p className="text-xs text-on-surface-variant">Subtitle</p>
</div>
```

## Layout Patterns

### Mobile-First Layout
- **Width**: `max-w-2xl mx-auto` for content
- **Padding**: `px-6 py-8` standard padding
- **Bottom Spacing**: `pb-32` to account for nav bar

### Grid Layouts
- **2-Column Bento**: `grid grid-cols-2 gap-4` for status cards
- **3-Column Actions**: `grid grid-cols-3 gap-4` for quick actions
- **Full-Width**: `w-full` for full-screen cards

## Usage Examples

### Dashboard Hero Section
```tsx
<div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
    <img src={baby.photo} alt={baby.name} />
  </div>
  <div>
    <h2 className="text-sm font-headline font-bold">{baby.name}</h2>
    <p className="text-xs text-on-surface-variant">{ageText}</p>
  </div>
</div>
```

### Activity Status Grid
```tsx
<section className="grid grid-cols-2 gap-4">
  {activities.map(activity => (
    <div key={activity.id} className="bg-surface-container-lowest p-6 rounded-xl">
      <div className="p-2 bg-{activity.color}-container rounded-lg">
        <Icon />
      </div>
      <p className="text-2xl font-bold mt-4">{activity.value}</p>
      <p className="text-xs text-on-surface-variant">{activity.time}</p>
    </div>
  ))}
</section>
```

### Quick Action Buttons
```tsx
<div className="grid grid-cols-3 gap-4">
  <button className="bg-primary text-on-primary p-6 rounded-xl font-bold">
    <Icon className="text-3xl mb-2" />
    Sleep
  </button>
  <button className="bg-secondary text-on-secondary p-6 rounded-xl font-bold">
    <Icon className="text-3xl mb-2" />
    Feed
  </button>
  <button className="bg-tertiary text-on-tertiary p-6 rounded-xl font-bold">
    <Icon className="text-3xl mb-2" />
    Diaper
  </button>
</div>
```

## Icons

All icons use Material Symbols Outlined:
```tsx
<span className="material-symbols-outlined">{iconName}</span>
```

### Common Icons
- `home` - Home/Dashboard
- `history` - Logs/History
- `trending_up` - Growth/Analytics
- `settings` - Settings
- `bedtime` - Sleep
- `child_care` - Feeding/Care
- `water_drop` - Diaper/Water
- `health_and_safety` - Health
- `notifications` - Notifications
- `menu` - Menu

## Dark Mode

Dark mode is enabled via `dark:` classes:

```tsx
<div className="bg-surface dark:bg-slate-900">
  <p className="text-on-surface dark:text-slate-200">Text</p>
</div>
```

## Responsive Design

### Breakpoints
- **Mobile**: < 640px (default)
- **Tablet**: md (768px)
- **Desktop**: lg (1024px)

### Mobile-First Approach
```tsx
// Hidden on mobile, shown on desktop
<nav className="hidden md:flex" />

// Full width on mobile, constrained on desktop
<div className="w-full md:max-w-2xl" />
```

## Shadows

- **sm**: `shadow-sm` - Subtle elevation
- **md**: `shadow-md` - Medium elevation
- **lg**: `shadow-lg` - High elevation
- **editorial**: `shadow-editorial` - Special shadow for hero elements

## Animation

Use `motion/react` for smooth animations:

```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

## Implementation Checklist

- [x] Dashboard screen with bento grid layout
- [x] Welcome/Onboarding screen
- [x] Bottom navigation with 4 tabs
- [x] Sleep tracker with timer
- [x] Settings screen with preferences
- [x] Tailwind config with Material Design 3 colors
- [ ] Feeding tracker
- [ ] Growth chart with metrics
- [ ] Vaccination calendar
- [ ] Family sharing
- [ ] Analytics dashboard
- [ ] Payment/Subscription flow

## Files Created

- `tailwind.config.ts` - Updated with new color system
- `src/app/components/BottomNavigation.tsx` - Tab navigation
- `src/app/components/Material3Dashboard.tsx` - Main dashboard
- `src/app/components/Material3Welcome.tsx` - Welcome screen
- `src/app/components/Material3SleepTracker.tsx` - Sleep tracking
- `src/app/components/Material3Settings.tsx` - Settings & preferences
- `DESIGN_SYSTEM.md` - This guide

## Next Steps

1. Export Material3Dashboard and Material3Welcome in App.tsx
2. Create remaining screens (Feeding, Growth, Vaccination)
3. Add Material Symbols font to index.html
4. Test responsive design on mobile devices
5. Implement dark mode theming
6. Add animations and transitions
7. Test accessibility (WCAG 2.1)
