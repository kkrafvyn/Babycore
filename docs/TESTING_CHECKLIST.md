# 🧪 Cradlyn Testing Checklist

## Pre-Testing Setup
- [ ] Dev server running (`npm run dev`)
- [ ] Browser console open (F12)
- [ ] No TypeScript errors in terminal
- [ ] All dependencies installed

---

## Phase 1: Onboarding Flow ✅

### Splash Screen
- [ ] App loads with splash screen showing "BEAUTIFULLY TRACKED"
- [ ] Splash screen displays for ~3.8 seconds
- [ ] "Get Started" button appears after splash timer
- [ ] Clicking "Get Started" advances to onboarding

### Welcome Screen  
- [ ] Welcome message displays correctly
- [ ] "Get Started" button is clickable
- [ ] "Already have an account? Log in" link visible
- [ ] Transitions smoothly to Add Baby screen

### Add Baby Screen (Step 1 of 4)
- [ ] Photo upload works (can select image)
- [ ] Name input accepts text and updates
- [ ] Date of Birth picker works
- [ ] Gender selection buttons toggle properly
- [ ] Next button is **ONLY enabled when name + DOB are filled**
- [ ] Can navigate back using chevron

### Select Country Screen (Step 2 of 4)
- [ ] Country list displays with search
- [ ] Search filters countries
- [ ] Selected country is highlighted
- [ ] Clicking country advances to Units screen
- [ ] Back button returns to Add Baby

### Choose Units Screen (Step 3 of 4)
- [ ] Metric/Imperial toggle buttons work
- [ ] Selected unit is highlighted
- [ ] Default unit matches device locale
- [ ] Choosing units advances to Notifications

### Enable Notifications Screen (Step 4 of 4)
- [ ] Toggle button for notifications works
- [ ] "Complete Onboarding" button visible
- [ ] Clicking complete saves data to localStorage
- [ ] Redirects to dashboard

---

## Phase 2: Dashboard & Navigation ✅

### Main Dashboard View
- [ ] Baby profile card displays (name, photo, age)
- [ ] Today's totals show (Sleep, Feeding, Diapers, Activity)
- [ ] Recent activity feed shows last 5 entries
- [ ] Quick-add buttons present (Sleep, Feeding, Diaper)
- [ ] TabBar shows all 5 tabs (Home, Feeding, Sleep, Diaper, Settings)
- [ ] All tabs clickable and functional

### Navigation Between Screens
- [ ] Sleep Tracker tab opens sleep logging
- [ ] Feeding Tracker tab opens feeding logging
- [ ] Diaper Log tab opens diaper entry
- [ ] Back to dashboard doesn't reset state
- [ ] Settings accessible from tab bar

---

## Phase 3: Core Tracker Testing 🔄

### Sleep Tracker
- [ ] Timer starts and counts up
- [ ] Manual entry form accepts date/time
- [ ] Notes field accepts text (max 200 chars)
- [ ] Can save sleep entry
- [ ] Dashboard sleep total updates after logging
- [ ] Can edit existing entry
- [ ] Can delete entry
- [ ] Deleted entry removes from totals
- [ ] Entries group by date

### Feeding Tracker
- [ ] Can log bottle feeding (type, amount, duration)
- [ ] Can log breast feeding (left/right, duration)
- [ ] Can log solids with food item
- [ ] Notes field works
- [ ] Dashboard feeding count updates
- [ ] Can edit/delete entries
- [ ] Time predictions work (if implemented)

### Diaper Log
- [ ] Quick log buttons (Wet, Soiled, Mixed)
- [ ] Notes field optional
- [ ] Time stamps automatically
- [ ] Dashboard diaper count updates
- [ ] Can edit/delete
- [ ] Color coding by type displays correctly

### Growth Chart
- [ ] Can log weight, height, head circumference
- [ ] Date picker works
- [ ] Can edit previous measurements
- [ ] Chart displays data points
- [ ] WHO percentile curves show
- [ ] Trend indicators show (up/down/stable)

### Vaccination Calendar
- [ ] Lists vaccinations for baby's age
- [ ] Calendar format shows due dates
- [ ] Can mark as completed
- [ ] Can change country and schedule updates
- [ ] Reminders appear on dashboard
- [ ] Can view pediatrician recommendations

---

## Phase 4: Settings & Personalization ⚙️

### Settings Screen
- [ ] Baby info editable (name, DOB, gender)
- [ ] Can change baby photo
- [ ] Units can be changed (metric ↔ imperial)
- [ ] Conversions work after unit change
- [ ] Notifications can be toggled
- [ ] Language selector works
- [ ] Dark mode toggle functional

### Notifications
- [ ] Notification permission dialog shows
- [ ] Can grant/deny permission
- [ ] Scheduled notifications appear
- [ ] Quiet hours respected
- [ ] Notification types correct (feeding, sleep, etc.)

### Multi-Baby (if enabled)
- [ ] Can add additional baby
- [ ] Can switch between babies
- [ ] Data doesn't mix between babies
- [ ] Settings per baby work

---

## Phase 5: Advanced Features 🎯

### Data Export
- [ ] PDF export generates correctly
- [ ] CSV export downloads
- [ ] Can select date range
- [ ] Export includes all relevant data
- [ ] PDF is readable on mobile

### Cloud Sync
- [ ] Offline mode shows indicator
- [ ] Can log data while offline
- [ ] Data syncs when online
- [ ] No data loss on sync
- [ ] Sync indicator shows status

### Premium/Paywall
- [ ] Paywall shows for premium features
- [ ] Payment button links to Paystack
- [ ] Can initiate payment flow
- [ ] Subscription status displays

### Serenity AI
- [ ] AI suggestions show on dashboard
- [ ] Tips are relevant to baby's age
- [ ] Can dismiss suggestions
- [ ] New suggestions daily

---

## Phase 6: Data Persistence 💾

### IndexedDB Storage
- [ ] Data persists after page reload
- [ ] localStorage state preserved
- [ ] Can open DevTools and view IndexedDB
- [ ] Database has correct tables
- [ ] Old data not lost after update

### Offline Functionality
- [ ] Disconnect internet (DevTools > Network)
- [ ] Can still log data
- [ ] Dashboard shows all historical data
- [ ] UI remains fully functional
- [ ] No errors in console
- [ ] Reconnect and data syncs

---

## Phase 7: Performance & PWA ⚡

### Performance
- [ ] Page loads in < 2 seconds
- [ ] Navigation is snappy (no lag)
- [ ] No console errors
- [ ] Memory usage stable (DevTools)
- [ ] Smooth animations (60fps target)

### PWA Features
- [ ] Service Worker registers (DevTools > Application)
- [ ] Can install app to home screen
- [ ] App icon displays correctly
- [ ] Works offline from home screen
- [ ] Update prompt shows when new version ready

### Mobile Responsiveness
- [ ] All UI elements fit on mobile screens
- [ ] Touch targets are 44pt minimum
- [ ] No horizontal scroll
- [ ] Safe area (notch) respected
- [ ] Text is readable at all sizes

---

## Phase 8: Accessibility ♿

### Color & Contrast
- [ ] Text has sufficient contrast
- [ ] Not dependent on color alone
- [ ] Dark mode provides same contrast

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus visible on all buttons
- [ ] Enter/Space triggers buttons

### Screen Reader
- [ ] Images have alt text
- [ ] Buttons have descriptive labels
- [ ] Form inputs have labels
- [ ] ARIA labels where needed

---

## Phase 9: Payment & Monetization 💳

### Paystack Integration
- [ ] Paystack keys loaded from env
- [ ] Payment button initiates Paystack form
- [ ] Test payment succeeds (use test card)
- [ ] Subscription activates after payment
- [ ] Confirmation email sends
- [ ] User cannot access premium without subscription

### Flutterwave Integration (Optional)
- [ ] Flutterwave form loads
- [ ] Test payment processes
- [ ] Fallback to Paystack if needed

---

## Phase 10: Browser Compatibility 🌐

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS & iOS)
- [ ] Edge (latest)
- [ ] Mobile browsers (Chrome, Safari)

---

## Known Issues & Workarounds

### Issue: Form not advancing from Add Baby
**Symptom**: Next button stays disabled even after filling fields
**Status**: Under investigation
**Workaround**: Check React state in DevTools Components tab

### Issue: Notifications not firing
**Symptom**: No notifications appear even when enabled
**Status**: Verify browser permissions
**Workaround**: Check browser notification settings

---

## Build Verification

### Development Build
```bash
npm run dev
# ✅ Starts without errors
# ✅ All screens load
# ✅ Can navigate through all screens
```

### Production Build
```bash
npm run build
# ✅ Build completes successfully
# ✅ No build errors
# ✅ dist/ folder generated

npm run preview
# ✅ Preview matches dev behavior
# ✅ All features work
```

---

## Final Checklist Before Deploy

- [ ] All tests pass (manual)
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Production build succeeds
- [ ] PWA installable
- [ ] Offline mode works
- [ ] Payment flow tested
- [ ] Mobile responsive confirmed
- [ ] Database exports/imports work
- [ ] All features documented

---

## Sign-Off

- **Last Tested**: [Date]
- **Tester**: [Name]
- **Status**: ✅ Ready for Production / ⏳ In Progress / ❌ Blocker Found

