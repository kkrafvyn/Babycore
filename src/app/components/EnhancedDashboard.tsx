import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { AppLayout } from './AppLayout';
import { Moon, Utensils, Droplets, Syringe, Heart, TrendingUp, ChevronDown, CheckCircle, ChevronLeft, Play, Sparkles, BookOpen, Activity, Mic, FileText, Users, Zap, Lock, Shield, Stethoscope, AlertTriangle, RefreshCw } from 'lucide-react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { SerenityAI } from './SerenityAI';
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
import { resolveAppViewIntent, type AppView } from '../../lib/app-routing';

type ViewMode = AppView;

const MotionDiv = motion.div as any;

const lazyNamed = <TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) =>
  React.lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as React.ComponentType<any> };
  });

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
const HealthDashboard = lazyNamed(() => import('./HealthDashboard'), 'HealthDashboard');
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
const ActivityCenter = lazyNamed(() => import('./ActivityCenter'), 'ActivityCenter');
const EmergencyShareCard = lazyNamed(() => import('./EmergencyShareCard'), 'EmergencyShareCard');
const ClinicDoctorPanel = lazyNamed(() => import('./ClinicDoctorPanel'), 'ClinicDoctorPanel');
const SyncCenter = lazyNamed(() => import('./SyncCenter'), 'SyncCenter');
const PaymentScreen = lazyNamed(() => import('./PaymentScreen'), 'PaymentScreen');
const AdminPanel = lazyNamed(() => import('./AdminPanel'), 'AdminPanel');

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
  'wearable': 'wearableIntegration',
  'voice-logging': 'voiceLogging',
  'doctor-reports': 'doctorAccess',
  'clinic-panel': 'doctorAccess',
  'family-sharing': 'familySharing',
  'community': 'communityAccess',
  'content-library': 'contentLibrary',
  'handoff': 'caregiverHandoff',
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
    refreshAllLogs
  } = useAppContext();

  const [activeView, setActiveView] = useState<ViewMode>(requestedView);
  const [showBabySwitcher, setShowBabySwitcher] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | null>(null);
  const [pendingPremiumView, setPendingPremiumView] = useState<ViewMode | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const hasPremiumAccess = isPremiumSubscriptionActive(settings?.subscriptionStatus);
  const accountProfileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) ||
    'baby';
  const isCareTeamProfile = accountProfileType === 'doctor' || accountProfileType === 'caregiver';

  const sorted = (arr: any[], key: string) => [...arr].sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());
  
  const latestSleep = sorted(sleepLogs, 'startTime')[0] ?? null;
  const latestFeed = sorted(feedLogs, 'timestamp')[0] ?? null;
  const latestDiaper = sorted(diaperLogs, 'timestamp')[0] ?? null;
  
  const nextVaccine = vaccinationRecords
    .filter(v => v.status === 'scheduled' || v.status === 'overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;

  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepElapsed, setSleepElapsed] = useState(0);

  const navToView: Record<string, ViewMode> = {
    home: 'dashboard',
    journal: 'journal',
    logs: 'logs',
    growth: 'growth',
    settings: 'settings'
  };

  const viewToNav = Object.fromEntries(
    Object.entries(navToView).map(([k, v]) => [v, k]),
  ) as Partial<Record<ViewMode, 'home' | 'logs' | 'growth' | 'settings' | 'journal'>>;
  const viewsNeedingGlobalBack = new Set<ViewMode>([
    'handoff',
    'health-alerts',
    'photo-gallery',
    'advanced-analytics',
    'ai-insights',
    'subscriptions',
    'health-records',
    'community',
    'content-library',
    'wearable',
    'family-sharing',
    'patients',
    'voice-logging',
    'doctor-reports',
    'care-priority',
    'emergency-card',
    'clinic-panel',
    'sync-center',
  ]);
  const viewsWithEmbeddedHeader = new Set<ViewMode>([
    'journal',
    'growth',
    'settings',
    'logs',
    'partner-sync',
    'health',
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
    'activity-center',
    'sync-center',
    'admin',
  ]);
  const showShellHeader = !viewsWithEmbeddedHeader.has(activeView);

  const openView = (view: ViewMode, label?: string) => {
    const premiumFeature = PREMIUM_FEATURE_BY_VIEW[view];
    if (premiumFeature && !hasPremiumAccess) {
      setPendingPremiumView(view);
      setPaywallFeature(label || 'Premium Feature');
      return;
    }
    setActiveView(view);
  };

  const handleNavChange = (navId: string) => {
    openView(navToView[navId] || 'dashboard');
  };

  const backToDashboard = () => setActiveView('dashboard');

  useEffect(() => {
    if (requestedView !== activeView) {
      setActiveView(requestedView);
    }
  }, [requestedView]);

  useEffect(() => {
    onViewChange?.(activeView);
  }, [activeView, onViewChange]);

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
    } catch { setIsSleeping(false); }
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
      } catch { /* */ }
    }, 1000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  useEffect(() => {
    if (!babies.length || !settings || !latestFeed || !latestDiaper) return;
    
    // Initial sync
    syncNotifications(babies, settings, {
      feedLogs: [latestFeed],
      sleepLogs: [latestSleep],
      diaperLogs: [latestDiaper],
      vaccinationRecords,
    });

    // Periodic sync every 30 seconds
    const interval = setInterval(() => {
      syncNotifications(babies, settings, {
        feedLogs: [latestFeed],
        sleepLogs: [latestSleep],
        diaperLogs: [latestDiaper],
        vaccinationRecords,
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [babies, settings, latestFeed, latestSleep, latestDiaper, vaccinationRecords]);

  useEffect(() => {
    const handleDeepLink = (e: any) => {
      const requestedView = e?.detail?.view ?? e?.detail?.screen;
      const resolvedView =
        typeof requestedView === 'string' ? resolveAppViewIntent(requestedView) : null;

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
    setActiveView('patients');
  }, [isCareTeamProfile, babies.length, activeView]);

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
        <AdminPanel onBack={backToDashboard} />
      </React.Suspense>
    );
  }

  if (activeView === 'payment') {
    return (
      <React.Suspense fallback={<ViewLoader label="Loading checkout..." />}>
        <PaymentScreen
          onBack={() => setActiveView('dashboard')}
          onSuccess={() => {
            const destination = pendingPremiumView || 'dashboard';
            setPendingPremiumView(null);
            setActiveView(destination);
          }}
        />
      </React.Suspense>
    );
  }

  const ageStr = currentBaby?.dateOfBirth ? getBabyAge(currentBaby.dateOfBirth) : '? months old';

  const sleepLabel = isSleeping
    ? formatDuration(Math.floor(sleepElapsed / 60))
    : latestSleep ? formatDuration(latestSleep.duration) : '--';
  const sleepSub = isSleeping
    ? `Sleeping now - ${i18nT('dashboard.sleeping')}`
    : latestSleep ? timeAgo(latestSleep.startTime) : i18nT('dashboard.noSession');

  const feedLabel = latestFeed
    ? latestFeed.type === 'bottle' ? `${latestFeed.bottleAmount ?? '?'}${settings?.units === 'imperial' ? 'oz' : 'ml'}` : latestFeed.type === 'breast' ? `${latestFeed.duration ?? '?'}m` : 'Solids'
    : '--';
  const feedSub = latestFeed
    ? `${timeAgo(latestFeed.timestamp)} - ${latestFeed.type}`
    : i18nT('dashboard.noFeed');

  const diaperLabel = latestDiaper ? latestDiaper.type : '--';
  const diaperSub = latestDiaper ? timeAgo(latestDiaper.timestamp) : i18nT('dashboard.noChange');

  const vaccineDaysUntil = nextVaccine
    ? Math.ceil((new Date(nextVaccine.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Parent';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? i18nT('dashboard.greeting') : hour < 17 ? i18nT('dashboard.greetingAfternoon') : i18nT('dashboard.greetingEvening');

  const renderDashboard = () => {
    if (isCareTeamProfile && babies.length === 0) {
      return (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border-gray bg-surface p-6 sm:p-8 dark:border-zinc-800">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-light">Care Team</p>
            <h2 className="mt-3 text-2xl font-headline font-black tracking-tight text-foreground">Manage Shared Patients</h2>
            <p className="mt-2 text-sm font-semibold text-text-light">
              Parents can share baby profiles with you. Accept a pending share to add that baby to your list.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => openView('patients')}
                className="rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                Open My Patients
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
            <h2 className="text-2xl sm:text-3xl font-headline font-black text-foreground tracking-tighter leading-none truncate">{greeting},</h2>
            <p className="text-lg sm:text-xl font-headline font-black text-secondary tracking-tighter leading-none opacity-80 truncate">{displayName}</p>
         </div>
         <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-border-gray dark:border-zinc-800 p-1 shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden shadow-lg border border-border-gray dark:border-zinc-700">
               <img src={getUserAvatar(displayName)} alt="Profile" className="w-full h-full object-cover" />
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
              <span className="text-sm font-headline font-black text-foreground truncate">{currentBaby?.name || 'Select Baby'}</span>
            </div>
            <ChevronDown size={18} className={`text-text-light transition-transform ${showBabySwitcher ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showBabySwitcher && (
              <MotionDiv
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-[2.5rem] border border-border-gray dark:border-zinc-700 shadow-2xl z-50 overflow-hidden"
              >
                {babies.map(baby => (
                  <button
                    key={baby.id}
                    onClick={() => { setCurrentBaby(baby); setShowBabySwitcher(false); }}
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
                      <span className="text-sm sm:text-base font-headline font-black text-foreground truncate block">{baby.name}</span>
                      <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-widest truncate">{getBabyAge(baby.dateOfBirth)}</p>
                    </div>
                    {baby.id === currentBaby?.id && <CheckCircle size={20} className="text-secondary" />}
                  </button>
                ))}
              </MotionDiv>
            )}
          </AnimatePresence>
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
         <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 flex items-center gap-3 sm:gap-6">
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
            <div className="min-w-0">
               <h3 className="text-xl sm:text-3xl font-headline font-black text-white tracking-tighter leading-none mb-1 truncate">{currentBaby?.name || 'Your Baby'}</h3>
               <p className="text-[10px] sm:text-xs font-black text-white/60 tracking-[0.14em] sm:tracking-widest uppercase truncate">{ageStr}</p>
            </div>
         </div>
      </div>

      <SerenityAI feeds={feedLogs} sleeps={sleepLogs} />

      {/* Smart Features & Tools */}
      <div>
         <div className="flex justify-between items-center mb-4 sm:mb-6 px-1 sm:px-2 mt-3 sm:mt-4">
            <h3 className="text-[10px] sm:text-[11px] font-black text-text-light uppercase tracking-[0.22em] sm:tracking-[0.3em]">Smart Features & Tools</h3>
         </div>
         <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 no-scrollbar -mx-3 sm:-mx-6 px-3 sm:px-6 snap-x">
            {[
              { id: 'insights', label: 'Smart Insights', icon: <Sparkles size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
              { id: 'timeline', label: 'Daily Timeline', icon: <Utensils size={20} />, bg: 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' },
              { id: 'predictor', label: 'Routine Predictor', icon: <TrendingUp size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' },
              { id: 'tips', label: 'Age Tips', icon: <Heart size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' },
              { id: 'health-alerts', label: 'Health Alerts', icon: <Heart size={20} />, bg: 'bg-red-50 dark:bg-red-900/20 text-red-500' },
              { id: 'photo-gallery', label: 'Photos', icon: <Moon size={20} />, bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' },
              { id: 'advanced-analytics', label: 'Analytics', icon: <TrendingUp size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' },
              { id: 'ai-insights', label: 'AI Insights', icon: <Sparkles size={20} />, bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500' },
              { id: 'health-records', label: 'Health', icon: <Heart size={20} />, bg: 'bg-pink-50 dark:bg-pink-900/20 text-pink-500' },
              { id: 'wearable', label: 'Wearables', icon: <Activity size={20} />, bg: 'bg-violet-50 dark:bg-violet-900/20 text-violet-500' },
              { id: 'voice-logging', label: 'Voice Logs', icon: <Mic size={20} />, bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' },
              { id: 'doctor-reports', label: 'Doctor Reports', icon: <FileText size={20} />, bg: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500' },
              { id: 'care-priority', label: 'Priority Board', icon: <AlertTriangle size={20} />, bg: 'bg-red-50 dark:bg-red-900/20 text-red-500' },
              { id: 'activity-center', label: 'Activity Center', icon: <Activity size={20} />, bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600' },
              { id: 'emergency-card', label: 'Emergency Card', icon: <Shield size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
              ...(accountProfileType === 'doctor'
                ? [{ id: 'clinic-panel', label: 'Clinic Panel', icon: <Stethoscope size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' }]
                : []),
              { id: 'sync-center', label: 'Sync Center', icon: <RefreshCw size={20} />, bg: 'bg-slate-50 dark:bg-slate-900/20 text-slate-500' },
              ...(isCareTeamProfile
                ? [{ id: 'patients', label: 'My Patients', icon: <Users size={20} />, bg: 'bg-sky-50 dark:bg-sky-900/20 text-sky-500' }]
                : []),
              { id: 'family-sharing', label: 'Family', icon: <Users size={20} />, bg: 'bg-green-50 dark:bg-green-900/20 text-green-500' },
              { id: 'community', label: 'Community', icon: <Users size={20} />, bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-500' },
              { id: 'content-library', label: 'Content', icon: <BookOpen size={20} />, bg: 'bg-lime-50 dark:bg-lime-900/20 text-lime-600' },
              { id: 'payment', label: 'Premium', icon: <Zap size={20} />, bg: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' },
              ...(userRole === 'admin'
                ? [{ id: 'admin', label: 'Admin', icon: <Shield size={20} />, bg: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600' }]
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
                   <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner ${tool.bg}`}>
                       {tool.icon}
                       {isLocked && (
                         <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center">
                           <Lock size={10} />
                         </span>
                       )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black text-foreground uppercase tracking-[0.12em] sm:tracking-widest leading-tight">{tool.label}</span>
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
            <h3 className="text-[10px] sm:text-[11px] font-black text-text-light uppercase tracking-[0.22em] sm:tracking-[0.3em]">{i18nT('dashboard.latestVitals')}</h3>
         </div>
         <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button onClick={() => setActiveView('sleep')} className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className={`w-11 h-11 sm:w-14 sm:h-14 ${isSleeping ? 'bg-indigo-500 text-white animate-pulse' : 'bg-accent-blue text-secondary'} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                     <Moon size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">Sleep</span>
               </div>
               <div className="min-w-0">
                   <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">{sleepLabel}</p>
                   <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">{sleepSub}</p>
                </div>
            </button>
            
            <div onClick={() => setActiveView('feeding')} className="cursor-pointer bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                     <Droplets size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">Feed</span>
               </div>
               <div className="min-w-0">
                   <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">{feedLabel}</p>
                   <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">{feedSub}</p>
                </div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); setShowTimer(true); }}
                   className="mt-3 sm:mt-4 py-2.5 sm:py-3 bg-emerald-500/10 text-emerald-500 rounded-xl sm:rounded-2xl text-[8px] sm:text-[9px] font-black uppercase tracking-[0.12em] sm:tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1.5 sm:gap-2"
                 >
                    <Play size={12} fill="currentColor" />
                    <span>Start Timer</span>
                 </button>
            </div>

            <button onClick={() => setActiveView('diaper')} className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                     <Utensils size={22} className="sm:h-7 sm:w-7" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">Diaper</span>
               </div>
               <div className="min-w-0">
                   <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none capitalize break-words">{diaperLabel}</p>
                   <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">{diaperSub}</p>
                </div>
            </button>

            <button onClick={() => setActiveView('health')} className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                     <Heart size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">Health</span>
               </div>
               <div className="min-w-0">
                  <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">Healthy</p>
                  <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">Vitals & Meds</p>
               </div>
            </button>

            <button onClick={() => setActiveView('memories')} className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                     <Sparkles size={22} className="sm:h-7 sm:w-7" fill="currentColor" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">Memories</span>
               </div>
               <div className="min-w-0">
                  <p className="text-[clamp(1.1rem,6vw,1.875rem)] font-headline font-black text-foreground tracking-tight leading-none break-words">Gallery</p>
                  <p className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight break-words">Memories Vault</p>
               </div>
            </button>

            <button onClick={() => setActiveView('vaccination')} className="bg-surface p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-border-gray dark:border-zinc-800 flex flex-col justify-between min-h-[11rem] sm:min-h-[13rem] text-left hover:shadow-xl hover:border-secondary transition-all active:scale-[0.98] group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className={`w-11 h-11 sm:w-14 sm:h-14 ${nextVaccine?.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-500'} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                     <Syringe size={22} className="sm:h-7 sm:w-7" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-text-light uppercase tracking-[0.14em] sm:tracking-widest pt-1.5 sm:pt-2">Vaccine</span>
               </div>
               <div>
                   <p className="text-base sm:text-xl font-headline font-black text-foreground tracking-tight leading-tight truncate">
                     {nextVaccine ? nextVaccine.name.split('(')[0].trim() : 'All clear'}
                   </p>
                   <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest mt-2 leading-tight ${nextVaccine?.status === 'overdue' ? 'text-error' : 'text-text-light'}`}>
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
            <h3 className="text-lg sm:text-xl font-headline font-black text-foreground tracking-tighter">{i18nT('dashboard.quickLog')}</h3>
         </div>
         <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <button onClick={() => setActiveView('sleep')} className="aspect-square bg-primary rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 sm:gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all">
               <Moon size={24} className="sm:h-9 sm:w-9" fill="currentColor" />
               <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest">Sleep</span>
            </button>
            <button onClick={() => setActiveView('feeding')} className="aspect-square bg-secondary rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 sm:gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all">
               <Utensils size={24} className="sm:h-9 sm:w-9" />
               <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest">Feed</span>
            </button>
            <button onClick={() => setActiveView('diaper')} className="aspect-square bg-text-dim rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 sm:gap-3 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all">
               <Droplets size={24} className="sm:h-9 sm:w-9" />
               <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-widest">Diaper</span>
            </button>
         </div>
      </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'journal': return <JournalScreen />;
      case 'growth': return <GrowthChart onBack={backToDashboard} showBackButton={false} />;
      case 'settings':
        return (
          <SettingsScreen
            onBack={backToDashboard}
            showBackButton={false}
            onLogout={onSignOut || (() => window.location.reload())}
            isAdmin={userRole === 'admin'}
            onOpenAdminPanel={() => setActiveView('admin')}
          />
        );
      case 'logs': return <HistoryLogs onBack={backToDashboard} showBackButton={false} />;
      case 'export': return <ExportScreen onBack={backToDashboard} />;
      case 'partner-sync': return <PartnerSyncScreen onBack={backToDashboard} />;
      case 'health': return <HealthDashboard onBack={backToDashboard} />;
      case 'memories': return <MemoriesScreen onBack={backToDashboard} />;
      case 'timeline': return <DailyTimeline onBack={backToDashboard} />;
      case 'insights': return <SmartInsights onBack={backToDashboard} />;
      case 'predictor': return <RoutinePredictor onBack={backToDashboard} />;
      case 'tips': return <AgeTips onBack={backToDashboard} />;
      case 'photos': return <MonthlyPhotos onBack={backToDashboard} />;
      case 'report': return <PediatricianReport onBack={backToDashboard} />;
      case 'handoff': return currentBaby ? <CaregiverHandoff babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'baby-journal': return <BabyJournal onBack={backToDashboard} />;
      case 'sleep-training': return <SleepTraining onBack={backToDashboard} />;
      case 'white-noise': return <WhiteNoise onBack={backToDashboard} />;
      case 'achievements': return <Achievements onBack={backToDashboard} />;
      case 'reminders': return <SmartReminders onBack={backToDashboard} />;
      case 'compare': return <MultiBabyComparison onBack={backToDashboard} />;
      case 'scrapbook': return <AIScrapbook onBack={backToDashboard} />;
      case 'health-alerts': return currentBaby ? <HealthAlerts babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'photo-gallery': return currentBaby ? <PhotoGallery babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'advanced-analytics': return currentBaby ? <AnalyticsDashboard babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'ai-insights': return currentBaby ? <AIInsights babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'subscriptions': return <SubscriptionAddons />;
      case 'health-records': return currentBaby ? <HealthRecords babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'community': return currentBaby ? <CommunityForum ageGroup={currentBaby.ageGroup} /> : null;
      case 'content-library': return <ContentLibraryBrowser />;
      case 'wearable': return currentBaby ? <WearableDeviceManager babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'family-sharing': return currentBaby ? <FamilySharing babyId={currentBaby.id} babyName={currentBaby.name} /> : <PatientAssignments onBack={backToDashboard} />;
      case 'patients': return <PatientAssignments onBack={backToDashboard} />;
      case 'voice-logging': return currentBaby ? <VoiceLogging babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'doctor-reports': return currentBaby ? <DoctorReportGenerator babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'care-priority':
        return currentBaby ? (
          <CarePriorityBoard
            babyId={currentBaby.id}
            babyName={currentBaby.name}
            onBack={backToDashboard}
            onOpenVaccines={() => setActiveView('vaccination')}
            onOpenHealthRecords={() => setActiveView('health-records')}
          />
        ) : null;
      case 'activity-center':
        return currentBaby ? (
          <ActivityCenter
            babyId={currentBaby.id}
            babyName={currentBaby.name}
            onBack={backToDashboard}
          />
        ) : null;
      case 'emergency-card': return currentBaby ? <EmergencyShareCard babyId={currentBaby.id} babyName={currentBaby.name} /> : null;
      case 'clinic-panel': return accountProfileType === 'doctor' ? <ClinicDoctorPanel onBack={backToDashboard} /> : null;
      case 'sync-center': return <SyncCenter onBack={backToDashboard} />;
      default: return renderDashboard();
    }
  };

  return (
    <>
      <AppLayout
        activeNav={viewToNav[activeView] ?? 'home'}
        onNavChange={handleNavChange}
        showTopHeader={showShellHeader}
      >
        <React.Suspense fallback={<ViewLoader />}>{renderContent()}</React.Suspense>
      </AppLayout>
      {paywallFeature && (
        <Paywall
          feature={paywallFeature}
          onClose={() => setPaywallFeature(null)}
          onUpgrade={async () => {
            setPaywallFeature(null);
            setActiveView('payment');
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
         {showTimer && (
           <FeedingTimer 
             onComplete={handleTimerComplete}
             onCancel={() => setShowTimer(false)}
           />
         )}
      </AnimatePresence>
    </>
  );
}
