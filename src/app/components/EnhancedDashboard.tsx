import React, { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { AppLayout } from './AppLayout';
import {
  Moon,
  Utensils,
  Droplets,
  Syringe,
  Heart,
  TrendingUp,
  ChevronDown,
  CheckCircle,
  ChevronLeft,
  Play,
  Sparkles,
  BookOpen,
  Activity,
  Mic,
  FileText,
  Users,
  Zap,
  Lock,
  Shield,
  Stethoscope,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { BloomAI } from './BloomAI';
import { CareCopilotChat } from './CareCopilotChat';
import { FeedingTimer } from './FeedingTimer';
import { Paywall } from './Paywall';
import { addFeedLog } from '../../lib/supabase-storage';
import { getBabyAge, timeAgo, getDefaultAvatar, getUserAvatar, formatDuration } from '../../lib/baby-utils';
import { i18nT } from '../../lib/i18n';
import type { FeedLog } from '../../types';
import { syncNotifications } from '../../lib/notifications';
import { AnimatePresence, motion } from 'framer-motion';
import { isPremiumSubscriptionActive, type PremiumFeatures } from '../../lib/premium';
import { getCurrentUserRole } from '../../lib/admin-api';
import { getAdminAccountMode, isPrimaryAdminEmail } from '../../lib/admin-account-mode';
import { resolveAppViewIntent, type AppView } from '../../lib/app-routing';
import { getCareProfileBadges, getCareProfileSummary } from '../../lib/care-profile';
import { fetchPaymentFeatureConfig } from '../../lib/payment-config';
import { canOpenAppViewForRole, isReadOnlyViewerRole, isViewerAllowedView } from '../../lib/role-access';
import { lazyNamed } from '../../lib/lazy-named';

type ViewMode = AppView;

const MotionDiv = motion.div as any;

const FeedingTracker = lazyNamed(() => import('./FeedingTracker'), 'FeedingTracker');
const SleepTracker = lazyNamed(() => import('./SleepTracker'), 'SleepTracker');
const DiaperLog = lazyNamed(() => import('./DiaperLog'), 'DiaperLogScreen');
const GrowthChart = lazyNamed(() => import('./GrowthChart'), 'GrowthChart');
const VaccinationCalendar = lazyNamed(() => import('./VaccinationCalendar'), 'VaccinationCalendar');
const SettingsScreen = lazyNamed(() => import('./SettingsScreen'), 'SettingsScreen');
const JournalScreen = lazyNamed(() => import('./JournalScreen'), 'JournalScreen');
const HistoryLogs = lazyNamed(() => import('./HistoryLogs'), 'HistoryLogs');
const ExportScreen = lazyNamed(() => import('./ExportScreen'), 'ExportScreen');
const PartnerSyncScreen = lazyNamed(() => import('./PartnerSyncScreen'), 'PartnerSyncScreen');
const MemoriesScreen = lazyNamed(() => import('./MemoriesScreen'), 'MemoriesScreen');
const DailyTimeline = lazyNamed(() => import('./DailyTimeline'), 'DailyTimeline');
const SmartInsights = lazyNamed(() => import('./SmartInsights'), 'SmartInsights');
const RoutinePredictor = lazyNamed(() => import('./RoutinePredictor'), 'RoutinePredictor');
const AgeTips = lazyNamed(() => import('./AgeTips'), 'AgeTips');
const MonthlyPhotos = lazyNamed(() => import('./MonthlyPhotos'), 'MonthlyPhotos');
const CaregiverHandoff = lazyNamed(() => import('./CaregiverHandoff'), 'CaregiverHandoff');
const BabyJournal = lazyNamed(() => import('./BabyJournal'), 'BabyJournal');
const PediatricianReport = lazyNamed(() => import('./PediatricianReport'), 'PediatricianReport');
const SleepTraining = lazyNamed(() => import('./SleepTraining'), 'SleepTraining');
const WhiteNoise = lazyNamed(() => import('./WhiteNoise'), 'WhiteNoise');
const Achievements = lazyNamed(() => import('./Achievements'), 'Achievements');
const SmartReminders = lazyNamed(() => import('./SmartReminders'), 'SmartReminders');
const MultiBabyComparison = lazyNamed(() => import('./MultiBabyComparison'), 'MultiBabyComparison');
const AIScrapbook = lazyNamed(() => import('./AIScrapbook'), 'AIScrapbook');
const HealthAlerts = lazyNamed(() => import('./HealthAlerts'), 'HealthAlerts');
const PhotoGallery = lazyNamed(() => import('./PhotoGallery'), 'PhotoGallery');
const AnalyticsDashboard = lazyNamed(() => import('./AnalyticsDashboard'), 'AnalyticsDashboard');
const AIInsights = lazyNamed(() => import('./AIInsights'), 'AIInsights');
const SubscriptionAddons = lazyNamed(() => import('./SubscriptionAddons'), 'SubscriptionAddons');
const HealthRecords = lazyNamed(() => import('./HealthRecords'), 'HealthRecords');
const CommunityForum = lazyNamed(() => import('./CommunityForum'), 'CommunityForum');
const ContentLibraryBrowser = lazyNamed(() => import('./ContentLibraryBrowser'), 'ContentLibraryBrowser');
const WearableDeviceManager = lazyNamed(() => import('./WearableDeviceManager'), 'WearableDeviceManager');
const FamilySharing = lazyNamed(() => import('./FamilySharing'), 'FamilySharing');
const PatientAssignments = lazyNamed(() => import('./PatientAssignments'), 'PatientAssignments');
const VoiceLogging = lazyNamed(() => import('./VoiceLogging'), 'VoiceLogging');
const DoctorReportGenerator = lazyNamed(() => import('./DoctorReportGenerator'), 'DoctorReportGenerator');
const CarePriorityBoard = lazyNamed(() => import('./CarePriorityBoard'), 'CarePriorityBoard');
const ParentWellness = lazyNamed(() => import('./ParentWellness'), 'ParentWellness');
const ActivityCenter = lazyNamed(() => import('./ActivityCenter'), 'ActivityCenter');
const ExpenseTracker = lazyNamed(() => import('./ExpenseTracker'), 'ExpenseTracker');
const NutritionTracker = lazyNamed(() => import('./NutritionTracker'), 'NutritionTracker');
const CareExpansionHub = lazyNamed(() => import('./CareExpansionHub'), 'CareExpansionHub');
const EmergencyShareCard = lazyNamed(() => import('./EmergencyShareCard'), 'EmergencyShareCard');
const ClinicDoctorPanel = lazyNamed(() => import('./ClinicDoctorPanel'), 'ClinicDoctorPanel');
const SyncCenter = lazyNamed(() => import('./SyncCenter'), 'SyncCenter');
const PaymentScreen = lazyNamed(() => import('./PaymentScreen'), 'PaymentScreen');
const AdminPanel = lazyNamed(() => import('./AdminPanel'), 'AdminPanel');
const ManagerPanel = lazyNamed(() => import('./ManagerPanel'), 'ManagerPanel');

const ViewLoader = ({ label = 'Loading view...' }: { label?: string }) => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-xs font-black uppercase tracking-wider text-text-light">{label}</p>
    </div>
  </div>
);

const PREMIUM_FEATURE_BY_VIEW: Partial<Record<ViewMode, keyof PremiumFeatures>> = {
  'health-alerts': 'healthAlerts',
  'advanced-analytics': 'advancedAnalytics',
  'ai-insights': 'aiInsights',
  wearable: 'wearableIntegration',
  'voice-logging': 'voiceLogging',
  'doctor-reports': 'doctorAccess',
  'clinic-panel': 'doctorAccess',
  'family-sharing': 'familySharing',
  community: 'communityAccess',
  'content-library': 'contentLibrary',
  handoff: 'caregiverHandoff',
};

interface EnhancedDashboardProps {
  onSignOut?: () => void;
  requestedView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
}

export function EnhancedDashboard({ onSignOut, requestedView = 'dashboard', onViewChange }: EnhancedDashboardProps) {
  const {
    currentBaby,
    setCurrentBaby,
    babies,
    user,
    settings,
    feedLogs,
    sleepLogs,
    diaperLogs,
    vaccinationRecords,
    refreshAllLogs,
  } = useAppContext();

  const [activeView, setActiveView] = useState<ViewMode>(requestedView);
  const [showBabySwitcher, setShowBabySwitcher] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);
  const [pendingPremiumView, setPendingPremiumView] = useState<ViewMode | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [premiumTestingAccessOpen, setPremiumTestingAccessOpen] = useState(false);
  const [readonlyNotice, setReadonlyNotice] = useState<string | null>(null);
  const hasPremiumAccess = premiumTestingAccessOpen || isPremiumSubscriptionActive(settings?.subscriptionStatus);
  const accountProfileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) || 'baby';
  const isCareTeamProfile = accountProfileType === 'doctor' || accountProfileType === 'caregiver';
  const primaryAdminModeActive =
    isPrimaryAdminEmail(user?.email) && getAdminAccountMode(user?.user_metadata) === 'admin';
  const effectiveUserRole = primaryAdminModeActive ? 'admin' : userRole;
  const isViewerReadOnly = isReadOnlyViewerRole(effectiveUserRole);

  const sorted = (arr: any[], key: string) =>
    [...arr].sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());

  const latestSleep = sorted(sleepLogs, 'startTime')[0] ?? null;
  const latestFeed = sorted(feedLogs, 'timestamp')[0] ?? null;
  const latestDiaper = sorted(diaperLogs, 'timestamp')[0] ?? null;

  const nextVaccine =
    vaccinationRecords
      .filter((v) => v.status === 'scheduled' || v.status === 'overdue')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;

  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepElapsed, setSleepElapsed] = useState(0);

  const navToView: Record<string, ViewMode> = {
    home: 'dashboard',
    journal: 'journal',
    logs: 'logs',
    growth: 'growth',
    settings: 'settings',
  };

  const viewToNav = Object.fromEntries(Object.entries(navToView).map(([k, v]) => [v, k])) as Partial<
    Record<ViewMode, 'home' | 'logs' | 'growth' | 'settings' | 'journal'>
  >;
  const viewsNeedingGlobalBack = new Set<ViewMode>([
    'health-alerts',
    'photo-gallery',
    'advanced-analytics',
    'ai-insights',
    'subscriptions',
    'health-records',
    'community',
    'content-library',
    'wearable',
    'patients',
    'voice-logging',
    'doctor-reports',
    'care-priority',
    'emergency-card',
    'clinic-panel',
  ]);
  const viewsWithEmbeddedHeader = new Set<ViewMode>([
    'journal',
    'growth',
    'settings',
    'logs',
    'partner-sync',
    'memories',
    'timeline',
    'insights',
    'predictor',
    'tips',
    'photos',
    'baby-journal',
    'report',
    'sleep-training',
    'white-noise',
    'achievements',
    'reminders',
    'compare',
    'scrapbook',
    'payment',
    'parent-wellness',
    'activity-center',
    'expenses',
    'nutrition',
    'care-expansion',
    'sync-center',
    'admin',
    'manager',
  ]);
  const viewsWithEmbeddedBottomNav = new Set<ViewMode>([
    'admin',
    'manager',
    'family-sharing',
    'handoff',
    'sync-center',
  ]);
  const showShellHeader = !viewsWithEmbeddedHeader.has(activeView);
  const showShellBottomNav = !viewsWithEmbeddedBottomNav.has(activeView);

  const changeView = React.useCallback(
    (view: ViewMode) => {
      if (view === activeView) {
        return;
      }

      setActiveView(view);
      onViewChange?.(view);
    },
    [activeView, onViewChange],
  );

  const openView = (view: ViewMode, label?: string) => {
    const premiumFeature = PREMIUM_FEATURE_BY_VIEW[view];
    const accessDecision = canOpenAppViewForRole({
      role: effectiveUserRole,
      view,
      hasPremiumAccess,
      premiumFeature,
    });

    if (!accessDecision.allowed && accessDecision.reason === 'read_only') {
      setReadonlyNotice(`${label || 'This area'} is locked in viewer mode. Viewer access can review records but cannot edit care data or billing.`);
      return;
    }

    if (!accessDecision.allowed && accessDecision.reason === 'premium') {
      setPendingPremiumView(view);
      setPaywallFeature(label || 'Premium Feature');
      return;
    }

    setReadonlyNotice(null);
    changeView(view);
  };

  const handleNavChange = (navId: string) => {
    openView(navToView[navId] || 'dashboard');
  };

  const backToDashboard = () => changeView('dashboard');

  useEffect(() => {
    let cancelled = false;

    const loadPremiumTestingAccess = async () => {
      const config = await fetchPaymentFeatureConfig();
      if (!cancelled) {
        const premiumOpen =
          config.premiumAccess.source !== 'fallback' && !config.premiumAccess.enabled;
        const paymentsPaused =
          config.paymentCollection.source !== 'fallback' && !config.paymentCollection.enabled;
        setPremiumTestingAccessOpen(premiumOpen || paymentsPaused);
      }
    };

    void loadPremiumTestingAccess();
    window.addEventListener('focus', loadPremiumTestingAccess);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadPremiumTestingAccess);
    };
  }, []);

  useEffect(() => {
    if (!premiumTestingAccessOpen || !pendingPremiumView) return;

    setPaywallFeature(null);
    changeView(pendingPremiumView);
    setPendingPremiumView(null);
  }, [changeView, pendingPremiumView, premiumTestingAccessOpen]);

  useEffect(() => {
    if (requestedView !== activeView) {
      setActiveView(requestedView);
    }
  }, [requestedView, activeView]);

  useEffect(() => {
    if (!isViewerReadOnly || isViewerAllowedView(activeView)) return;

    setReadonlyNotice('Viewer mode is read-only, so we moved you back to the dashboard.');
    changeView('dashboard');
  }, [activeView, changeView, isViewerReadOnly]);

  useEffect(() => {
    if (!currentBaby) return;

    try {
      const raw = localStorage.getItem('babylog_sleep_timer');
      if (raw) {
        const timer = JSON.parse(raw);
        if (timer.babyId === currentBaby.id) setIsSleeping(true);
        else setIsSleeping(false);
      } else {
        setIsSleeping(false);
      }
    } catch {
      setIsSleeping(false);
    }
  }, [currentBaby, activeView]);

  useEffect(() => {
    if (!isSleeping) return;
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem('babylog_sleep_timer');
        if (raw) {
          const timer = JSON.parse(raw);
          const elapsed = Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000);
          setSleepElapsed(elapsed);
        }
      } catch {
        /* */
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  useEffect(() => {
    if (!babies.length || !settings) return;

    const notificationPayload = {
      feedLogs: latestFeed ? [latestFeed] : [],
      sleepLogs: latestSleep ? [latestSleep] : [],
      diaperLogs: latestDiaper ? [latestDiaper] : [],
      vaccinationRecords,
    };

    // Initial sync
    syncNotifications(babies, settings, notificationPayload);

    // Periodic sync every 30 seconds
    const interval = setInterval(() => {
      syncNotifications(babies, settings, notificationPayload);
    }, 30000);

    return () => clearInterval(interval);
  }, [babies, settings, latestFeed, latestSleep, latestDiaper, vaccinationRecords]);

  useEffect(() => {
    const handleDeepLink = (e: any) => {
      const requestedView = e?.detail?.view ?? e?.detail?.screen;
      const resolvedView = typeof requestedView === 'string' ? resolveAppViewIntent(requestedView) : null;

      if (resolvedView) {
        openView(resolvedView);
      }
    };

    window.addEventListener('nav_deep_link', handleDeepLink);
    window.addEventListener('navigate', handleDeepLink);

    return () => {
      window.removeEventListener('nav_deep_link', handleDeepLink);
      window.removeEventListener('navigate', handleDeepLink);
    };
  }, [hasPremiumAccess]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const role = await getCurrentUserRole();
      if (mounted) setUserRole(role);
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isCareTeamProfile) return;
    if (babies.length > 0) return;
    if (activeView !== 'dashboard') return;
    changeView('patients');
  }, [isCareTeamProfile, babies.length, activeView, changeView]);

  const handleTimerComplete = async (side: 'left' | 'right' | 'both', duration: number) => {
    if (!currentBaby) return;
    const newLog: FeedLog = {
      id: crypto.randomUUID(),
      babyId: currentBaby.id,
      timestamp: new Date().toISOString(),
      type: 'breast',
      duration: duration,
      breastLeft: side === 'left',
      breastRight: side === 'right',
      createdAt: new Date().toISOString(),
    };
    await addFeedLog(newLog);
    setShowTimer(false);
    refreshAllLogs();
  };

  if (activeView === 'feeding') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading feeding tracker..." />}>
        <FeedingTracker onBack={backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'sleep') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading sleep tracker..." />}>
        <SleepTracker onBack={backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'diaper') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading diaper log..." />}>
        <DiaperLog onBack={backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'vaccination') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading vaccinations..." />}>
        <VaccinationCalendar onBack={backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'admin') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading admin panel..." />}>
        <AdminPanel onBack={primaryAdminModeActive ? () => changeView('settings') : backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'manager') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading manager workspace..." />}>
        <ManagerPanel onBack={backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'payment') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading checkout..." />}>
        <PaymentScreen
          onBack={() => changeView('dashboard')}
          onSuccess={() => {
            const destination = pendingPremiumView || 'dashboard';
            setPendingPremiumView(null);
            changeView(destination);
          }}
        />
      </React.Suspense>
    );
  }

  const ageStr = currentBaby?.dateOfBirth ? getBabyAge(currentBaby.dateOfBirth) : '? months old';

  const sleepLabel = isSleeping
    ? formatDuration(Math.floor(sleepElapsed / 60))
    : latestSleep
      ? formatDuration(latestSleep.duration)
      : '--';
  const sleepSub = isSleeping
    ? `Sleeping now - ${i18nT('dashboard.sleeping')}`
    : latestSleep
      ? timeAgo(latestSleep.startTime)
      : i18nT('dashboard.noSession');

  const feedLabel = latestFeed
    ? latestFeed.type === 'bottle'
      ? `${latestFeed.bottleAmount ?? '?'}${settings?.units === 'imperial' ? 'oz' : 'ml'}`
      : latestFeed.type === 'breast'
        ? `${latestFeed.duration ?? '?'}m`
        : 'Solids'
    : '--';
  const feedSub = latestFeed ? `${timeAgo(latestFeed.timestamp)} - ${latestFeed.type}` : i18nT('dashboard.noFeed');

  const diaperLabel = latestDiaper ? latestDiaper.type : '--';
  const diaperSub = latestDiaper ? timeAgo(latestDiaper.timestamp) : i18nT('dashboard.noChange');

  const vaccineDaysUntil = nextVaccine
    ? Math.ceil((new Date(nextVaccine.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.doctor_name ||
    user?.user_metadata?.caregiver_name ||
    user?.email?.split('@')[0] ||
    'Parent';
  const profilePhotoUrl =
    user?.user_metadata?.profile_photo_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? i18nT('dashboard.greeting')
      : hour < 17
        ? i18nT('dashboard.greetingAfternoon')
        : i18nT('dashboard.greetingEvening');
  const carePlanSummary = getCareProfileSummary(accountProfileType, settings?.careProfilePreferences);
  const carePlanBadges = getCareProfileBadges(accountProfileType, settings?.careProfilePreferences);
  const isToday = (value?: string | null) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.toDateString() === new Date().toDateString();
  };
  const nextCareFocus = nextVaccine
    ? nextVaccine.status === 'overdue'
      ? {
          label: 'Overdue vaccine',
          title: nextVaccine.name.split('(')[0].trim(),
          detail:
            vaccineDaysUntil !== null
              ? `${Math.abs(vaccineDaysUntil)} day${Math.abs(vaccineDaysUntil) === 1 ? '' : 's'} overdue`
              : 'Needs review',
          tone: 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-400/20 dark:bg-rose-950/20 dark:text-rose-300',
          action: 'Review vaccines',
          view: 'vaccination' as ViewMode,
          icon: <AlertTriangle size={18} />,
        }
      : {
          label: 'Next vaccine',
          title: nextVaccine.name.split('(')[0].trim(),
          detail:
            vaccineDaysUntil !== null
              ? vaccineDaysUntil <= 0
                ? 'Due today'
                : `Due in ${vaccineDaysUntil} day${vaccineDaysUntil === 1 ? '' : 's'}`
              : 'Scheduled',
          tone: 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-300',
          action: 'Plan visit',
          view: 'vaccination' as ViewMode,
          icon: <Syringe size={18} />,
        }
    : latestFeed
      ? {
          label: 'Latest feed',
          title: feedLabel,
          detail: feedSub,
          tone: 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:text-emerald-300',
          action: 'Log feeding',
          view: 'feeding' as ViewMode,
          icon: <Droplets size={18} />,
        }
      : {
          label: 'Start today',
          title: 'Log the first care moment',
          detail: 'Track feeding, sleep, or diaper changes as they happen.',
          tone: 'border-sky-200 bg-sky-50/80 text-sky-700 dark:border-sky-400/20 dark:bg-sky-950/20 dark:text-sky-300',
          action: 'Log feeding',
          view: 'feeding' as ViewMode,
          icon: <Sparkles size={18} />,
        };
  const careTeamHomeCopy =
    accountProfileType === 'doctor'
      ? {
          eyebrow: 'Doctor Home',
          title: 'Start with your patient list',
          description:
            'Accept shared profiles, complete your doctor record, and open the clinic panel when patients are assigned.',
          primary: 'Open My Patients',
          secondary: 'Clinic Panel',
          secondaryView: 'clinic-panel' as ViewMode,
        }
      : {
          eyebrow: 'Caregiver Home',
          title: 'Your daily care handoff starts here',
          description:
            'Accept shared babies, choose an active profile, then use handoff tasks to coordinate the next care block.',
          primary: 'Open Assigned Babies',
          secondary: 'Settings',
          secondaryView: 'settings' as ViewMode,
        };
  const todayPlanItems = [
    {
      label: 'Feeding',
      detail: latestFeed ? feedSub : 'Log the first feed when baby eats.',
      completed: isToday(latestFeed?.timestamp),
      view: 'feeding' as ViewMode,
      Icon: Droplets,
    },
    {
      label: 'Sleep',
      detail: isSleeping ? `Sleeping now for ${sleepLabel}` : latestSleep ? sleepSub : 'Start or log the first nap.',
      completed: isSleeping || isToday(latestSleep?.startTime),
      view: 'sleep' as ViewMode,
      Icon: Moon,
    },
    {
      label: 'Diaper',
      detail: latestDiaper ? diaperSub : 'Capture the next diaper change.',
      completed: isToday(latestDiaper?.timestamp),
      view: 'diaper' as ViewMode,
      Icon: Droplets,
    },
    {
      label: 'Medication',
      detail: 'Review health records and reminders.',
      completed: false,
      view: 'health-records' as ViewMode,
      Icon: Heart,
    },
    {
      label: 'Vaccines',
      detail: nextVaccine
        ? nextVaccine.status === 'overdue'
          ? `${nextVaccine.name.split('(')[0].trim()} is overdue.`
          : `${nextVaccine.name.split('(')[0].trim()} is coming up.`
        : 'No upcoming vaccines found.',
      completed: !nextVaccine,
      view: 'vaccination' as ViewMode,
      Icon: Syringe,
    },
    {
      label: 'Growth',
      detail: 'Add measurements when you have a new weight or height.',
      completed: false,
      view: 'growth' as ViewMode,
      Icon: TrendingUp,
    },
  ];

  const renderDashboard = () => {
    if (isCareTeamProfile && babies.length === 0) {
      return (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75 sm:p-8">
            <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-sky-200/70 blur-3xl dark:bg-sky-500/10" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-zinc-950">
                <Users size={13} />
                {careTeamHomeCopy.eyebrow}
              </div>
              <h2 className="max-w-xl text-3xl font-headline font-black tracking-[-0.05em] text-foreground sm:text-4xl">
                {careTeamHomeCopy.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-text-dim">
                {careTeamHomeCopy.description}
              </p>
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Step 1', value: 'Accept invite', helper: 'Parents share access to your email.' },
                { label: 'Step 2', value: 'Select profile', helper: 'Make the baby active for care tools.' },
                {
                  label: 'Step 3',
                  value: accountProfileType === 'doctor' ? 'Review care' : 'Coordinate handoff',
                  helper: accountProfileType === 'doctor' ? 'Open clinic and follow-ups.' : 'Track tasks and sessions.',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.65rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">{item.label}</p>
                  <p className="mt-2 text-sm font-headline font-black text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-text-dim">{item.helper}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => openView('patients')}
                className="rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                {careTeamHomeCopy.primary}
              </button>
              <button
                onClick={() => openView(careTeamHomeCopy.secondaryView)}
                className="rounded-2xl border border-border-gray bg-white/70 px-5 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-sm transition-all hover:border-secondary dark:border-white/10 dark:bg-white/5"
              >
                {careTeamHomeCopy.secondary}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 sm:space-y-10">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-headline font-black text-foreground tracking-tighter leading-none truncate">
              {greeting},
            </h2>
            <p className="text-lg sm:text-xl font-headline font-black text-secondary tracking-tighter leading-none opacity-80 truncate">
              {displayName}
            </p>
          </div>
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-border-gray dark:border-zinc-800 p-1 shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden shadow-lg border border-border-gray dark:border-zinc-700">
              <img
                src={profilePhotoUrl || getUserAvatar(displayName)}
                alt="Profile"
                onError={(event) => {
                  event.currentTarget.src = getUserAvatar(displayName);
                }}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {babies.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowBabySwitcher(!showBabySwitcher)}
              className="w-full bg-surface p-3 sm:p-4 sm:px-6 rounded-[1.6rem] sm:rounded-[2rem] flex items-center justify-between border border-border-gray dark:border-zinc-800 shadow-sm transition-all hover:bg-surface-gray dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-border-gray dark:border-zinc-700 shrink-0">
                  <img
                    src={currentBaby?.photoUrl || getDefaultAvatar(currentBaby?.gender, currentBaby?.name)}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = getDefaultAvatar(currentBaby?.gender, currentBaby?.name);
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-headline font-black text-foreground truncate">
                  {currentBaby?.name || 'Select Baby'}
                </span>
              </div>
              <ChevronDown
                size={18}
                className={`text-text-light transition-transform ${showBabySwitcher ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showBabySwitcher && (
                <MotionDiv
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-[2.5rem] border border-border-gray dark:border-zinc-700 shadow-2xl z-50 overflow-hidden"
                >
                  {babies.map((baby) => (
                    <button
                      key={baby.id}
                      onClick={() => {
                        setCurrentBaby(baby);
                        setShowBabySwitcher(false);
                      }}
                      className={`w-full p-4 sm:p-5 sm:px-8 flex items-center gap-3 sm:gap-5 hover:bg-surface-gray dark:hover:bg-zinc-800 transition-all border-b border-border-gray dark:border-zinc-800 last:border-0 ${baby.id === currentBaby?.id ? 'bg-secondary/5' : ''}`}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border border-border-gray dark:border-zinc-700 shadow-sm shrink-0">
                        <img
                          src={baby.photoUrl || getDefaultAvatar(baby.gender, baby.name)}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.src = getDefaultAvatar(baby.gender, baby.name);
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm sm:text-base font-headline font-black text-foreground truncate block">
                          {baby.name}
                        </span>
                        <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-widest truncate">
                          {getBabyAge(baby.dateOfBirth)}
                        </p>
                      </div>
                      {baby.id === currentBaby?.id && <CheckCircle size={20} className="text-secondary" />}
                    </button>
                  ))}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {premiumTestingAccessOpen && (
          <div className="rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  Premium testing is open
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-emerald-950 dark:text-emerald-50">
                  Premium tools are available while payments or package enforcement are paused for QA.
                </p>
              </div>
            </div>
          </div>
        )}

        {isViewerReadOnly && (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Lock size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-400">
                  Viewer read-only mode
                </p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-900 dark:text-zinc-100">
                  You can review logs, growth, memories, health records, family sharing, and emergency details. Editing care data,
                  payments, and admin tools stays locked.
                </p>
                {readonlyNotice && (
                  <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300">
                    {readonlyNotice}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}


        {!isCareTeamProfile && (
          <div className={`overflow-hidden rounded-[2.4rem] border p-5 shadow-sm sm:p-6 ${nextCareFocus.tone}`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-inner dark:bg-white/10">
                  {nextCareFocus.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                    Today's focus
                  </p>
                  <h3 className="mt-1 text-2xl font-headline font-black tracking-[-0.04em] text-foreground">
                    {nextCareFocus.title}
                  </h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-text-dim">{nextCareFocus.detail}</p>
                </div>
              </div>
              <button
                onClick={() => openView(nextCareFocus.view, nextCareFocus.action)}
                className="rounded-2xl bg-foreground px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-background shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                {nextCareFocus.action}
              </button>
            </div>
          </div>
        )}

        {!isCareTeamProfile && (
          <div className="rounded-[2.35rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-light">
                  Today plan
                </p>
                <h3 className="mt-1 text-2xl font-headline font-black tracking-[-0.04em] text-foreground">
                  A calmer checklist for {currentBaby?.name || 'baby'}
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary">
                {todayPlanItems.filter((item) => item.completed).length}/{todayPlanItems.length} clear
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {todayPlanItems.map(({ Icon, ...item }) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openView(item.view, item.label)}
                  className="flex items-center gap-3 rounded-[1.45rem] border border-border-gray bg-surface-gray p-3 text-left transition-all hover:border-secondary hover:bg-surface dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      item.completed
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-white text-text-light dark:bg-white/10'
                    }`}
                  >
                    {item.completed ? <CheckCircle size={18} /> : <Icon size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-headline font-black text-foreground">{item.label}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-text-light">{item.detail}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative h-52 sm:h-64 w-full rounded-[2.2rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl group cursor-pointer bg-surface-gray dark:bg-zinc-900 border border-border-gray dark:border-zinc-800">
          <img
            src={currentBaby?.photoUrl || getDefaultAvatar(currentBaby?.gender, currentBaby?.name)}
            alt="Baby"
            onError={(event) => {
              event.currentTarget.src = getDefaultAvatar(currentBaby?.gender, currentBaby?.name);
            }}
            className="w-full h-full object-contain p-7 sm:p-12 transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3 sm:bottom-10 sm:left-10 sm:right-10 sm:gap-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl border-2 border-white/50 p-1 backdrop-blur-md shrink-0">
              <img
                src={currentBaby?.photoUrl || getDefaultAvatar(currentBaby?.gender, currentBaby?.name)}
                alt="Baby Avatar"
                onError={(event) => {
                  event.currentTarget.src = getDefaultAvatar(currentBaby?.gender, currentBaby?.name);
                }}
                className="w-full h-full rounded-2xl bg-white/20 object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl sm:text-3xl font-headline font-black text-white tracking-tighter leading-none mb-1 truncate">
                {currentBaby?.name || 'Your Baby'}
              </h3>
              <p className="text-[10px] sm:text-xs font-black text-white/60 tracking-[0.14em] sm:tracking-widest uppercase truncate">
                {ageStr}
              </p>
            </div>
          </div>
        </div>

        <BloomAI feeds={feedLogs} sleeps={sleepLogs} />

        {currentBaby && (
          <CareCopilotChat babyId={currentBaby.id} babyName={currentBaby.name} variant="compact" />
        )}

        {settings?.careProfilePreferences && (
          <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 sm:rounded-[2.5rem] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-light">Starter Care Plan</p>
                <h3 className="text-xl font-headline font-black tracking-tight text-foreground sm:text-2xl">
                  {accountProfileType === 'baby'
                    ? `${currentBaby?.name || 'Your baby'} is set up for a gentler rhythm`
                    : accountProfileType === 'doctor'
                      ? 'Your doctor workflow is tuned for follow-up care'
                      : 'Your caregiver workflow is tuned for daily support'}
                </h3>
                <p className="max-w-2xl text-sm font-semibold leading-relaxed text-text-dim">{carePlanSummary}</p>
              </div>
              {accountProfileType === 'baby' && (
                <button
                  onClick={() => openView('settings')}
                  className="rounded-full bg-surface-gray px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-secondary transition-all hover:bg-secondary hover:text-white dark:bg-zinc-800 dark:hover:bg-blue-500"
                >
                  Adjust in Settings
                </button>
              )}
            </div>

            {carePlanBadges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {carePlanBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-surface-gray px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-text-dim dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-1 sm:px-2">
            <h3 className="text-[10px] sm:text-[11px] font-black text-text-light uppercase tracking-[0.22em] sm:tracking-[0.3em]">
              {i18nT('dashboard.quickActionsTitle', 'Quick Actions')}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                id: 'feeding' as ViewMode,
                label: i18nT('dashboard.quickActionFeed', 'Feed Now'),
                icon: <Droplets size={18} />,
                bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500',
              },
              {
                id: 'sleep' as ViewMode,
                label: i18nT('dashboard.quickActionSleep', 'Sleep Timer'),
                icon: <Moon size={18} />,
                bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500',
              },
              {
                id: 'doctor-reports' as ViewMode,
                label: i18nT('dashboard.quickActionDoctor', 'Doctor Packet'),
                icon: <FileText size={18} />,
                bg: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500',
              },
              {
                id: 'emergency-card' as ViewMode,
                label: i18nT('dashboard.quickActionEmergency', 'Emergency'),
                icon: <Shield size={18} />,
                bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
              },
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => openView(action.id, action.label)}
                className="rounded-[1.4rem] border border-border-gray bg-surface p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-secondary active:scale-[0.98] dark:border-zinc-800"
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${action.bg}`}>
                  {action.icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-foreground sm:text-[11px]">
                  {action.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Smart Features & Tools */}
        <div>
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-1 sm:px-2 mt-3 sm:mt-4">
            <h3 className="text-[10px] sm:text-[11px] font-black text-text-light uppercase tracking-[0.22em] sm:tracking-[0.3em]">
              Smart Features & Tools
            </h3>
          </div>
          <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 no-scrollbar -mx-3 sm:-mx-6 px-3 sm:px-6 snap-x">
            {[
              {
                id: 'insights',
                label: 'Smart Insights',
                icon: <Sparkles size={20} />,
                bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
              },
              {
                id: 'timeline',
                label: 'Daily Timeline',
                icon: <Utensils size={20} />,
                bg: 'bg-rose-50 dark:bg-rose-900/20 text-rose-500',
              },
              {
                id: 'predictor',
                label: 'Routine Predictor',
                icon: <TrendingUp size={20} />,
                bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500',
              },
              {
                id: 'tips',
                label: 'Age Tips',
                icon: <Heart size={20} />,
                bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
              },
              {
                id: 'health-alerts',
                label: 'Health Updates',
                icon: <Heart size={20} />,
                bg: 'bg-red-50 dark:bg-red-900/20 text-red-500',
              },
              {
                id: 'photo-gallery',
                label: 'Photos',
                icon: <Moon size={20} />,
                bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500',
              },
              {
                id: 'advanced-analytics',
                label: 'Analytics',
                icon: <TrendingUp size={20} />,
                bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
              },
              {
                id: 'ai-insights',
                label: 'Ask AI',
                icon: <Sparkles size={20} />,
                bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500',
              },
              {
                id: 'health-records',
                label: 'Health',
                icon: <Heart size={20} />,
                bg: 'bg-pink-50 dark:bg-pink-900/20 text-pink-500',
              },
              {
                id: 'wearable',
                label: 'Wearables',
                icon: <Activity size={20} />,
                bg: 'bg-violet-50 dark:bg-violet-900/20 text-violet-500',
              },
              {
                id: 'voice-logging',
                label: 'Voice Logs',
                icon: <Mic size={20} />,
                bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500',
              },
              {
                id: 'doctor-reports',
                label: 'Doctor Reports',
                icon: <FileText size={20} />,
                bg: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500',
              },
              {
                id: 'care-priority',
                label: 'Priority Board',
                icon: <AlertTriangle size={20} />,
                bg: 'bg-red-50 dark:bg-red-900/20 text-red-500',
              },
              {
                id: 'parent-wellness',
                label: 'Wellness',
                icon: <Heart size={20} />,
                bg: 'bg-rose-50 dark:bg-rose-900/20 text-rose-500',
              },
              {
                id: 'activity-center',
                label: 'Activity Center',
                icon: <Activity size={20} />,
                bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600',
              },
              {
                id: 'expenses',
                label: 'Expenses',
                icon: <FileText size={20} />,
                bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
              },
              {
                id: 'nutrition',
                label: 'Nutrition',
                icon: <Utensils size={20} />,
                bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
              },
              {
                id: 'care-expansion',
                label: 'Care Expansion',
                icon: <Sparkles size={20} />,
                bg: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600',
              },
              {
                id: 'emergency-card',
                label: 'Emergency Card',
                icon: <Shield size={20} />,
                bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
              },
              ...(accountProfileType === 'doctor'
                ? [
                    {
                      id: 'clinic-panel',
                      label: 'Clinic Panel',
                      icon: <Stethoscope size={20} />,
                      bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500',
                    },
                  ]
                : []),
              {
                id: 'sync-center',
                label: 'Sync Center',
                icon: <RefreshCw size={20} />,
                bg: 'bg-slate-50 dark:bg-slate-900/20 text-slate-500',
              },
              ...(isCareTeamProfile
                ? [
                    {
                      id: 'patients',
                      label: 'My Patients',
                      icon: <Users size={20} />,
                      bg: 'bg-sky-50 dark:bg-sky-900/20 text-sky-500',
                    },
                  ]
                : []),
              {
                id: 'family-sharing',
                label: 'Family',
                icon: <Users size={20} />,
                bg: 'bg-green-50 dark:bg-green-900/20 text-green-500',
              },
              {
                id: 'community',
                label: 'Community',
                icon: <Users size={20} />,
                bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-500',
              },
              {
                id: 'content-library',
                label: 'Content',
                icon: <BookOpen size={20} />,
                bg: 'bg-lime-50 dark:bg-lime-900/20 text-lime-600',
              },
              {
                id: 'payment',
                label: 'Premium',
                icon: <Zap size={20} />,
                bg: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
              },
              ...(effectiveUserRole === 'admin'
                ? [
                    {
                      id: 'admin',
                      label: 'Admin',
                      icon: <Shield size={20} />,
                      bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600',
                    },
                  ]
                : []),
              ...(effectiveUserRole === 'manager'
                ? [
                    {
                      id: 'manager',
                      label: 'Manager',
                      icon: <Shield size={20} />,
                      bg: 'bg-slate-50 dark:bg-slate-900/30 text-slate-600',
                    },
                  ]
                : []),
            ].map((tool) => {
              const view = tool.id as ViewMode;
              const isPremiumTool = Boolean(PREMIUM_FEATURE_BY_VIEW[view]);
              const isLocked = isPremiumTool && !hasPremiumAccess;

              return (
                <button
                  key={tool.id}
                  onClick={() => openView(view, tool.label)}
                  className="snap-start shrink-0 w-28 sm:w-32 bg-surface p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-border-gray dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-2 sm:gap-3 active:scale-95 transition-all text-center hover:shadow-md"
                >
                  <div
                    className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner ${tool.bg}`}
                  >
                    {tool.icon}
                    {isLocked && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center">
                        <Lock size={10} />
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-foreground uppercase tracking-[0.12em] sm:tracking-widest leading-tight">
                    {tool.label}
                  </span>
                  {isLocked && (
                    <span className="text-[8px] font-black uppercase tracking-wider text-secondary">Premium</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-1 sm:px-2">
            <h3 className="text-[10px] sm:text-[11px] font-black text-text-light uppercase tracking-[0.22em] sm:tracking-[0.3em]">
              {i18nT('dashboard.latestVitals')}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => openView('sleep', 'Sleep')}
              className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div
                  className={`w-11 h-11 sm:w-14 sm:h-14 ${isSleeping ? 'bg-indigo-500 text-white animate-pulse' : 'bg-accent-blue text-secondary'} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}
                >
                  <Moon size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">
                  Sleep
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">
                  {sleepLabel}
                </p>
                <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">
                  {sleepSub}
                </p>
              </div>
            </button>

            <div
              onClick={() => openView('feeding', 'Feeding')}
              className="cursor-pointer bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Droplets size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">
                  Feed
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">
                  {feedLabel}
                </p>
                <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">
                  {feedSub}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isViewerReadOnly) {
                    setReadonlyNotice('Feeding timers are locked in viewer mode.');
                    return;
                  }

                  setShowTimer(true);
                }}
                className="mt-3 sm:mt-4 py-2.5 sm:py-3 bg-emerald-500/10 text-emerald-500 rounded-xl sm:rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-[0.12em] sm:tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <Play size={12} fill="currentColor" />
                <span>Start Timer</span>
              </button>
            </div>

            <button
              onClick={() => openView('diaper', 'Diaper')}
              className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Utensils size={22} className="sm:h-7 sm:w-7" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">
                  Diaper
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none capitalize break-words">
                  {diaperLabel}
                </p>
                <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">
                  {diaperSub}
                </p>
              </div>
            </button>

            <button
              onClick={() => openView('health-records', 'Health records')}
              className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Heart size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">
                  Health
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">
                  Records
                </p>
                <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">
                  Visits & Meds
                </p>
              </div>
            </button>

            <button
              onClick={() => openView('memories', 'Memories')}
              className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Sparkles size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">
                  Memories
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">
                  Gallery
                </p>
                <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">
                  Memories Vault
                </p>
              </div>
            </button>

            <button
              onClick={() => openView('vaccination', 'Vaccines')}
              className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div
                  className={`w-11 h-11 sm:w-14 sm:h-14 ${nextVaccine?.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-500'} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}
                >
                  <Syringe size={22} className="sm:h-7 sm:w-7" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">
                  Vaccine
                </span>
              </div>
              <div>
                <p className="text-base sm:text-xl font-headline font-black text-foreground tracking-tight leading-tight truncate">
                  {nextVaccine ? nextVaccine.name.split('(')[0].trim() : 'All clear'}
                </p>
                <p
                  className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight ${nextVaccine?.status === 'overdue' ? 'text-error' : 'text-text-light'}`}
                >
                  {nextVaccine
                    ? vaccineDaysUntil !== null && vaccineDaysUntil < 0
                      ? `${Math.abs(vaccineDaysUntil)}d overdue`
                      : vaccineDaysUntil !== null
                        ? `In ${vaccineDaysUntil} days`
                        : 'Scheduled'
                    : 'No upcoming'}
                </p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-4 sm:mb-6 px-1 sm:px-2">
            <h3 className="text-lg sm:text-xl font-headline font-black text-foreground tracking-tighter">
              {i18nT('dashboard.quickLog')}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <button
              onClick={() => openView('sleep', 'Sleep')}
              className="aspect-square bg-primary rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 sm:gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Moon size={24} className="sm:h-9 sm:w-9" fill="currentColor" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest">
                Sleep
              </span>
            </button>
            <button
              onClick={() => openView('feeding', 'Feeding')}
              className="aspect-square bg-secondary rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 sm:gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Utensils size={24} className="sm:h-9 sm:w-9" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest">
                Feed
              </span>
            </button>
            <button
              onClick={() => openView('diaper', 'Diaper')}
              className="aspect-square bg-text-dim rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 sm:gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Droplets size={24} className="sm:h-9 sm:w-9" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest">
                Diaper
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isViewerReadOnly && !isViewerAllowedView(activeView)) {
      return renderDashboard();
    }

    switch (activeView) {
      case 'journal':
        return <JournalScreen />;
      case 'growth':
        return <GrowthChart onBack={backToDashboard} showBackButton={false} />;
      case 'settings':
        return (
          <SettingsScreen
            onBack={backToDashboard}
            showBackButton={false}
            onLogout={onSignOut || (() => window.location.reload())}
            isAdmin={effectiveUserRole === 'admin'}
            isManager={effectiveUserRole === 'manager'}
            onOpenAdminPanel={() => openView('admin', 'Admin')}
            onOpenManagerPanel={() => openView('manager', 'Manager')}
          />
        );
      case 'logs':
        return <HistoryLogs onBack={backToDashboard} showBackButton={false} />;
      case 'export':
        return <ExportScreen onBack={backToDashboard} />;
      case 'partner-sync':
        return <PartnerSyncScreen onBack={backToDashboard} />;
      case 'health':
        return currentBaby ? <HealthRecords babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'memories':
        return <MemoriesScreen onBack={backToDashboard} />;
      case 'timeline':
        return <DailyTimeline onBack={backToDashboard} />;
      case 'insights':
        return <SmartInsights onBack={backToDashboard} />;
      case 'predictor':
        return <RoutinePredictor onBack={backToDashboard} />;
      case 'tips':
        return <AgeTips onBack={backToDashboard} />;
      case 'photos':
        return <MonthlyPhotos onBack={backToDashboard} />;
      case 'report':
        return <PediatricianReport onBack={backToDashboard} />;
      case 'handoff':
        return currentBaby ? (
          <CaregiverHandoff babyId={currentBaby.id} babyName={currentBaby.name} onBack={backToDashboard} />
        ) : null;
      case 'baby-journal':
        return <BabyJournal onBack={backToDashboard} />;
      case 'sleep-training':
        return <SleepTraining onBack={backToDashboard} />;
      case 'white-noise':
        return <WhiteNoise onBack={backToDashboard} />;
      case 'achievements':
        return <Achievements onBack={backToDashboard} />;
      case 'reminders':
        return <SmartReminders onBack={backToDashboard} />;
      case 'compare':
        return <MultiBabyComparison onBack={backToDashboard} />;
      case 'scrapbook':
        return <AIScrapbook onBack={backToDashboard} />;
      case 'health-alerts':
        return currentBaby ? (
          <HealthAlerts babyId={currentBaby.id} babyName={currentBaby.name} countryCode={currentBaby.country} />
        ) : null;
      case 'photo-gallery':
        return currentBaby ? <PhotoGallery babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'advanced-analytics':
        return currentBaby ? <AnalyticsDashboard babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'ai-insights':
        return currentBaby ? <AIInsights babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'subscriptions':
        return <SubscriptionAddons />;
      case 'health-records':
        return currentBaby ? <HealthRecords babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'community':
        return currentBaby ? <CommunityForum ageGroup={currentBaby.ageGroup} /> : null;
      case 'content-library':
        return <ContentLibraryBrowser />;
      case 'wearable':
        return currentBaby ? <WearableDeviceManager babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'family-sharing':
        return currentBaby ? (
          <FamilySharing babyId={currentBaby.id} babyName={currentBaby.name} onBack={backToDashboard} />
        ) : (
          <PatientAssignments onBack={backToDashboard} />
        );
      case 'patients':
        return <PatientAssignments onBack={backToDashboard} />;
      case 'voice-logging':
        return currentBaby ? <VoiceLogging babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'doctor-reports':
        return currentBaby ? <DoctorReportGenerator babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'care-priority':
        return currentBaby ? (
          <CarePriorityBoard
            babyId={currentBaby.id}
            babyName={currentBaby.name}
            onBack={backToDashboard}
            onOpenVaccines={() => openView('vaccination', 'Vaccines')}
            onOpenHealthRecords={() => openView('health-records', 'Health records')}
          />
        ) : null;
      case 'parent-wellness':
        return currentBaby ? (
          <ParentWellness babyId={currentBaby.id} babyName={currentBaby.name} onBack={backToDashboard} />
        ) : null;
      case 'activity-center':
        return currentBaby ? (
          <ActivityCenter babyId={currentBaby.id} babyName={currentBaby.name} onBack={backToDashboard} />
        ) : null;
      case 'expenses':
        return currentBaby ? (
          <ExpenseTracker babyId={currentBaby.id} babyName={currentBaby.name} onBack={backToDashboard} />
        ) : null;
      case 'nutrition':
        return currentBaby ? (
          <NutritionTracker babyId={currentBaby.id} babyName={currentBaby.name} onBack={backToDashboard} />
        ) : null;
      case 'care-expansion':
        return currentBaby ? (
          <CareExpansionHub
            babyId={currentBaby.id}
            babyName={currentBaby.name}
            onBack={backToDashboard}
            onRecordsSaved={refreshAllLogs}
          />
        ) : null;
      case 'emergency-card':
        return currentBaby ? <EmergencyShareCard babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'clinic-panel':
        return accountProfileType === 'doctor' ? <ClinicDoctorPanel onBack={backToDashboard} /> : null;
      case 'sync-center':
        return <SyncCenter onBack={backToDashboard} />;
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      <AppLayout
        activeNav={viewToNav[activeView] ?? 'home'}
        onNavChange={handleNavChange}
        showTopHeader={showShellHeader}
        showBottomNav={showShellBottomNav}
      >
        <React.Suspense fallback={<ViewLoader />}>{renderContent()}</React.Suspense>
      </AppLayout>
      {paywallFeature && (
        <Paywall
          feature={paywallFeature}
          onClose={() => setPaywallFeature(null)}
          onUpgrade={async () => {
            setPaywallFeature(null);
            openView('payment', 'Premium');
          }}
        />
      )}
      {viewsNeedingGlobalBack.has(activeView) && (
        <button
          onClick={backToDashboard}
          title="Back to dashboard"
          className="fixed top-[4.4rem] sm:top-24 left-3 z-[70] h-10 w-10 rounded-full bg-background/95 border border-border-gray dark:border-zinc-700 shadow-lg backdrop-blur flex items-center justify-center text-primary dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <PWAInstallPrompt />
      <AnimatePresence>
        {showTimer && <FeedingTimer onComplete={handleTimerComplete} onCancel={() => setShowTimer(false)} />}
      </AnimatePresence>
    </>
  );
}
