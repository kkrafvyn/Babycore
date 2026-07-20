# Cradlyn - Apple Design System Implementation

## Overview
Cradlyn is a modern, clean, and intuitive baby tracking application built following Apple's design principles. The app combines functionality with simplicity, allowing parents to easily track their baby's development and activities.

## Design Principles

### 1. **Clarity**
- Clear hierarchy of information
- Readable typography with consistent sizing
- Generous use of whitespace

### 2. **Deference**
- Content and functionality in focus
- Subtle, non-distracting UI elements
- Clean, minimal design language

### 3. **Depth**
- Smooth animations and transitions
- Layered visual hierarchy
- Focus on key information at each screen

## Color Palette

### Primary Colors
- **Blue**: `#007AFF` (iOS Blue) - Primary actions, highlights
- **White**: `#FFFFFF` - Light mode background
- **Black**: `#000000` - Dark mode background

### Color System
- **Semantic Colors:**
  - Success: `#34C759` (Green)
  - Warning: `#FF9500` (Orange)
  - Destructive: `#EF4444` (Red)
  - Informational: `#00B0FF` (Light Blue)

- **Feature Colors:**
  - Feeding: Blue (`#007AFF`)
  - Sleep: Purple (`#5856D6`)
  - Diaper: Yellow (`#FFCC00`)
  - Health: Green (`#34C759`)
  - Growth: Teal (`#00C7BE`)
  - Vaccines: Red (`#FF3B30`)

### Light Mode
- Background: `#FFFFFF`
- Secondary Background: `#F5F5F7`
- Tertiary Background: `#EFEFEF`
- Text Primary: `#030213`
- Text Secondary: `#666666`
- Borders: `#E4E4E7`

### Dark Mode
- Background: `#000000`
- Secondary Background: `#1C1C1E`
- Tertiary Background: `#2C2C2E`
- Text Primary: `#FFFFFF`
- Text Secondary: `#A1A1A6`
- Borders: `rgba(255, 255, 255, 0.1)`

## Typography

### Font Family
- **Primary**: System fonts (San Francisco on iOS, -apple-system fallback)
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`

### Type Scale
- **Display**: 34px, Bold (Welcome/Hero sections)
- **Large Title**: 28px, Semibold (Page titles)
- **Title**: 20px, Semibold (Section headers)
- **Body**: 16px, Regular (Body text)
- **Callout**: 16px, Semibold (Important text)
- **Subheadline**: 15px, Regular (Secondary text)
- **Caption 1**: 12px, Regular (Tertiary text)
- **Caption 2**: 11px, Regular (Smallest text)

## Components

### Navigation
- **Bottom Tab Navigation**: 8 tabs with icons and labels
  - Home, Feeding, Sleep, Diaper, Growth, Vaccines, Profile, Settings
- **Sticky Header**: Logo, app name, notifications, theme toggle, menu
- **Floating Action Button (FAB)**: Quick entry for common actions

### Cards & Containers
- **Rounded Corners**: `16px` (2xl) for cards, `12px` (lg) for buttons
- **Shadows**: 
  - Small: `0 1px 2px rgba(0,0,0,0.05)`
  - Medium: `0 4px 6px rgba(0,0,0,0.1)`
  - Large: `0 10px 15px rgba(0,0,0,0.1)`
- **Padding**: 16px - 24px depending on context
- **Spacing**: 16px grid system

### Buttons
- **Primary Button**: 
  - Blue background with white text
  - Rounded corners (12px)
  - Padding: 12px 24px
  - Hover: Darker blue background
- **Secondary Button**: 
  - Border with text color
  - Transparent background
  - Same sizing as primary

### Forms
- **Input Fields**: 
  - Light gray background with subtle border
  - Rounded corners (10px)
  - Padding: 12px 16px
  - Focus state: Blue ring

### Animations
- **Transitions**: 200ms ease-out (default)
- **Stagger**: 50-100ms between child elements
- **Page Transitions**: Slide up with fade (200ms)
- **Interactive States**: Scale (1.02x on hover), 0.95x on tap

## Spacing System

```
4px   = xs
8px   = sm
12px  = md
16px  = lg
20px  = xl
24px  = 2xl
32px  = 3xl
```

## Feature Sections

### 1. **Home / Dashboard**
- Hero greeting with personalized message
- Quick stats cards (Feedings, Sleep, Diaper, Health)
- Today's activity timeline
- Growth & milestones section
- Reminders & schedule

### 2. **Feeding Tracker**
- Log feeding times and duration
- Track bottle vs. breast feeding
- View feeding history
- Nutrition insights

### 3. **Sleep Tracker**
- Log sleep and nap times
- Track sleep duration
- Sleep quality notes
- Sleep patterns over time

### 4. **Diaper Log**
- Quick diaper change logging
- Track wet and soiled diapers
- Patterns and frequency
- Health observations

### 5. **Growth Chart**
- Track weight and height
- Compare against growth standards
- Visual growth trajectory
- Development milestones

### 6. **Vaccination Calendar**
- Schedule management
- Upcoming vaccines
- Vaccination history
- Doctor appointment reminders

### 7. **Profile**
- Baby information
- Parent details
- Account settings
- Preferences

### 8. **Settings**
- Notification preferences
- Theme (Light/Dark)
- Units (Metric/Imperial)
- Data management
- Privacy & security

## Responsive Design

### Breakpoints
- **Mobile**: < 640px (default)
- **Tablet**: 640px - 1024px (sm)
- **Desktop**: > 1024px (lg)

### Mobile-First Approach
- Touch-friendly targets: 48px minimum
- Bottom navigation for lower thumb accessibility
- Single-column layouts

### Tablet/Desktop
- Multi-column grids
- Horizontal navigation support
- Larger cards with more information density

## Icons
- **Icon Set**: Lucide React
- **Size**: 20px-24px for UI elements
- **Weight**: Regular (consistent with system icons)

## Dark Mode
- Automatic based on system preference
- Smooth transitions between modes
- Optimized contrast ratios for accessibility

## Accessibility

### WCAG 2.1 AA Compliance
- Minimum contrast ratio: 4.5:1 for text
- Link and focus indicators clearly visible
- Keyboard navigation supported
- ARIA labels where necessary

### Touch Considerations
- Minimum 48x48px touch targets
- 8px minimum spacing between interactive elements
- Large, legible text

## Example Component Structure

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.95 }}
  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
>
  Action
</motion.button>
```

## Future Enhancements
- Customizable color themes
- Widgets for home screen
- Advanced analytics and reports
- Integration with health apps
- Family sharing features
- AI-powered insights

## Resources
- Apple Human Interface Guidelines
- iOS Design Language
- Tailwind CSS Documentation
- Framer Motion Documentation
