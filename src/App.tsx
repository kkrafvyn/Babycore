import React from 'react';
import { Capacitor } from '@capacitor/core';
import { ThemeProvider } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { AppContextProvider, useAppContext } from './app/AppContext';
import { AppErrorBoundary } from './app/components/AppErrorBoundary';
import { PrivacyLock } from './app/components/PrivacyLock';
import {
  getOnboardingCache,
  saveBabyToOnboarding,
  saveProfileToOnboarding,
  saveSettingsToOnboarding,
} from './lib/onboarding-storage';
import { deriveSettingsFromCareProfile } from './lib/care-profile';
import type { CareProfilePreferences } from './types';
import { acceptFamilySharingInvite } from './lib/family-sharing-service';
import { completeMobileAuthSession, isMobileAuthCallbackUrl, signOut } from './lib/supabase';
import { getCurrentUserRole } from './lib/admin-api';
import { getAdminAccountMode, isPrimaryAdminEmail } from './lib/admin-account-mode';
import {
  type AppView,
  type PublicRoute,
  getEmergencyShareTokenFromPathname,
  getAppViewFromPathname,
  getAppViewPath,
  getPublicRouteFromPathname,
  getPublicRoutePath,
  normalizePathname,
  resolveAppViewIntent,
} from './lib/app-routing';
import { isNativeAppUrl, parseNativeAppUrl } from './lib/native-app-links';
import { importNativeWearableData, getConnectedWearables, syncWearableData } from './lib/wearable-service';
import { NotificationsManager } from './lib/notifications';
import { i18nInstance } from './lib/i18n';

type LocationRoute =
  | {
      kind: 'public';
      publicRoute: PublicRoute;
    }
  | {
      kind: 'app';
      appView: AppView;
    }
  | {
      kind: 'public-emergency-card';
      token: string;
    };

const MOBILE_SPLASH_SESSION_KEY = 'babylog_mobile_splash_seen';
const AUTH_MODE_HINT_KEY = 'babylog_auth_mode';
const LEGACY_GUEST_SESSION_KEY = 'babylog_guest_session';

const getLegacyRouteFromHash = (): LocationRoute | null => {
  const hash = window.location.hash.toLowerCase();

  if (hash === '#onboarding') {
    return { kind: 'public', publicRoute: 'onboarding' };
  }

  if (hash === '#login') {
    return { kind: 'public', publicRoute: 'login' };
  }

  if (hash === '#policies') {
    return { kind: 'public', publicRoute: 'policies' };
  }

  if (hash === '#app') {
    const queryView = new URLSearchParams(window.location.search).get('view');
    const resolvedQueryView = queryView ? resolveAppViewIntent(queryView) : null;
    if (resolvedQueryView) {
      return { kind: 'app', appView: resolvedQueryView };
    }
    return { kind: 'app', appView: 'dashboard' };
  }

  return null;
};

const getLocationRoute = (): LocationRoute => {
  const appView = getAppViewFromPathname(window.location.pathname);
  if (appView) {
    return { kind: 'app', appView };
  }

  const emergencyShareToken = getEmergencyShareTokenFromPathname(window.location.pathname);
  if (emergencyShareToken) {
    return { kind: 'public-emergency-card', token: emergencyShareToken };
  }

  const publicRoute = getPublicRouteFromPathname(window.location.pathname);
  if (publicRoute) {
    return { kind: 'public', publicRoute };
  }

  const legacyRoute = getLegacyRouteFromHash();
  if (legacyRoute) {
    return legacyRoute;
  }

  return { kind: 'public', publicRoute: 'welcome' };
};

const getCanonicalPathForRoute = (route: LocationRoute): string => {
  if (route.kind === 'app') {
    return getAppViewPath(route.appView);
  }

  if (route.kind === 'public-emergency-card') {
    return `/emergency-card/${encodeURIComponent(route.token)}`;
  }

  return getPublicRoutePath(route.publicRoute);
};

const setAuthModeHint = (mode: 'signin' | 'signup') => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_MODE_HINT_KEY, mode);
};

const formatAppViewLabel = (view: AppView): string =>
  view
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const shouldShowMobileSplash = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(max-width: 767px)').matches &&
    window.sessionStorage.getItem(MOBILE_SPLASH_SESSION_KEY) !== 'true'
  );
};

const FullScreenLoader = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-sm font-bold text-text-dim">{label}</p>
    </div>
  </div>
);

const AuthScreen = React.lazy(() =>
  import('./app/components/AuthScreen').then((module) => ({ default: module.AuthScreen })),
);
const EnhancedDashboard = React.lazy(() =>
  import('./app/components/EnhancedDashboard').then((module) => ({ default: module.EnhancedDashboard })),
);
const Material3AddBaby = React.lazy(() =>
  import('./app/components/Material3AddBaby').then((module) => ({ default: module.Material3AddBaby })),
);
const Material3Onboarding = React.lazy(() =>
  import('./app/components/Material3Onboarding').then((module) => ({ default: module.Material3Onboarding })),
);
const Material3SplashScreen = React.lazy(() =>
  import('./app/components/Material3SplashScreen').then((module) => ({ default: module.Material3SplashScreen })),
);
const Material3Welcome = React.lazy(() =>
  import('./app/components/Material3Welcome').then((module) => ({ default: module.Material3Welcome })),
);
const LegalPolicies = React.lazy(() =>
  import('./app/components/LegalPolicies').then((module) => ({ default: module.LegalPolicies })),
);
const PublicEmergencyShareCard = React.lazy(() =>
  import('./app/components/PublicEmergencyShareCard').then((module) => ({
    default: module.PublicEmergencyShareCard,
  })),
);

const renderWithSuspense = (node: React.ReactNode, label: string) => (
  <React.Suspense fallback={<FullScreenLoader label={label} />}>{node}</React.Suspense>
);

function AppShell() {
  const { user, babies, currentBaby, isLoading, refreshBabies, refreshAllLogs } = useAppContext();
  const handledInviteTokenRef = React.useRef<string | null>(null);
  const lastNativeWearableSyncAtRef = React.useRef(0);
  const [locationRoute, setLocationRoute] = React.useState<LocationRoute>(() => getLocationRoute());
  const [showMobileSplash, setShowMobileSplash] = React.useState(() => shouldShowMobileSplash());
  const [policyReturnRoute, setPolicyReturnRoute] = React.useState<PublicRoute>('welcome');
  const [accountRole, setAccountRole] = React.useState('user');
  const [isAccountRoleLoading, setIsAccountRoleLoading] = React.useState(false);

  const hasSession = Boolean(user);
  const publicRoute = locationRoute.kind === 'public' ? locationRoute.publicRoute : 'welcome';
  const appRouteView = locationRoute.kind === 'app' ? locationRoute.appView : 'dashboard';
  const currentAppRouteView = locationRoute.kind === 'app' ? locationRoute.appView : null;
  const effectivePublicRoute = !hasSession && locationRoute.kind === 'app' ? 'login' : publicRoute;

  const cachedOnboardingProfileType = React.useMemo(
    () => getOnboardingCache().profileType,
    [effectivePublicRoute, user?.id, appRouteView],
  );
  const accountProfileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) ||
    cachedOnboardingProfileType;
  const isPrimaryAdminAccount = isPrimaryAdminEmail(user?.email);
  const adminAccountMode = getAdminAccountMode(user?.user_metadata);
  const primaryAdminModeActive = isPrimaryAdminAccount && adminAccountMode === 'admin';
  const isAdminAccount = accountRole === 'admin' || primaryAdminModeActive;
  const shouldUseAdminHome =
    Boolean(user) && primaryAdminModeActive;

  React.useEffect(() => {
    let mounted = true;

    if (!user?.id) {
      setAccountRole('user');
      setIsAccountRoleLoading(false);
      return () => {
        mounted = false;
      };
    }

    setIsAccountRoleLoading(true);
    (async () => {
      const role = await getCurrentUserRole();
      if (!mounted) return;
      setAccountRole(role);
      setIsAccountRoleLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const navigateToPath = React.useCallback(
    (path: string, options?: { replace?: boolean; preserveSearch?: boolean }) => {
      const normalizedPath = normalizePathname(path);
      const nextSearch = options?.preserveSearch ? window.location.search : '';
      const nextUrl = `${normalizedPath}${nextSearch}`;
      const currentUrl = `${normalizePathname(window.location.pathname)}${window.location.search}`;

      if (nextUrl !== currentUrl) {
        if (options?.replace) {
          window.history.replaceState(null, '', nextUrl);
        } else {
          window.history.pushState(null, '', nextUrl);
        }
      }

      setLocationRoute(getLocationRoute());
    },
    [],
  );

  const navigateToPublicRoute = React.useCallback(
    (route: PublicRoute, options?: { replace?: boolean; preserveSearch?: boolean }) => {
      navigateToPath(getPublicRoutePath(route), options);
    },
    [navigateToPath],
  );

  const navigateToAppView = React.useCallback(
    (view: AppView, options?: { replace?: boolean; preserveSearch?: boolean }) => {
      navigateToPath(getAppViewPath(view), options);
    },
    [navigateToPath],
  );

  const handleDashboardViewChange = React.useCallback(
    (view: AppView) => {
      navigateToAppView(view, { preserveSearch: true });
    },
    [navigateToAppView],
  );

  React.useEffect(() => {
    if (!shouldUseAdminHome || currentAppRouteView !== 'dashboard') {
      return;
    }

    navigateToAppView('admin', { replace: true, preserveSearch: true });
  }, [currentAppRouteView, navigateToAppView, shouldUseAdminHome]);

  React.useEffect(() => {
    const handlePopState = () => setLocationRoute(getLocationRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    const handleNativeUrl = (event: Event) => {
      const customEvent = event as CustomEvent<{ url?: string | null }>;
      const parsed = parseNativeAppUrl(customEvent.detail?.url);
      if (!parsed) {
        return;
      }

      if (parsed.appView) {
        navigateToAppView(parsed.appView, { replace: true });
        return;
      }

      if (parsed.publicRoute) {
        navigateToPublicRoute(parsed.publicRoute, { replace: true });
      }
    };

    window.addEventListener('babylog_native_url', handleNativeUrl as EventListener);
    return () => window.removeEventListener('babylog_native_url', handleNativeUrl as EventListener);
  }, [navigateToAppView, navigateToPublicRoute]);

  React.useEffect(() => {
    const syncNativeWearablesOnResume = async () => {
      if (!user?.id || !currentBaby?.id) {
        return;
      }

      const now = Date.now();
      if (now - lastNativeWearableSyncAtRef.current < 5 * 60 * 1000) {
        return;
      }

      lastNativeWearableSyncAtRef.current = now;

      try {
        const wearables = await getConnectedWearables(user.id);
        const nativeIntegration = wearables.find(
          (integration) =>
            integration.is_active &&
            (integration.device_type === 'apple_health' || integration.device_type === 'health_connect'),
        );

        if (!nativeIntegration) {
          return;
        }

        const { source, imported } = await importNativeWearableData(
          currentBaby.id,
          nativeIntegration.last_synced || null,
        );

        if (source) {
          await syncWearableData(user.id, source);
        }

        if (imported.length > 0) {
          await refreshAllLogs();
          toast.success(`Imported ${imported.length} wearable reading${imported.length === 1 ? '' : 's'}.`);
        }
      } catch (error) {
        console.warn('Native wearable resume sync failed:', error);
      }
    };

    const handleNativeResume = () => {
      void refreshBabies();
      void refreshAllLogs();
      void syncNativeWearablesOnResume();
    };

    window.addEventListener('babylog_native_resume', handleNativeResume);
    return () => window.removeEventListener('babylog_native_resume', handleNativeResume);
  }, [currentBaby?.id, refreshAllLogs, refreshBabies, user?.id]);

  React.useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const canonicalPath = getCanonicalPathForRoute(getLocationRoute());
    const nextUrl = `${canonicalPath}${window.location.search}`;
    window.history.replaceState(null, '', nextUrl);
    setLocationRoute(getLocationRoute());
  }, []);

  React.useEffect(() => {
    localStorage.removeItem(LEGACY_GUEST_SESSION_KEY);
  }, []);

  React.useEffect(() => {
    if (!hasSession) {
      return;
    }

    if (locationRoute.kind === 'public' && locationRoute.publicRoute !== 'policies') {
      navigateToAppView('dashboard', { replace: true, preserveSearch: true });
    }
  }, [hasSession, locationRoute.kind, locationRoute.kind === 'public' ? locationRoute.publicRoute : null]);

  React.useEffect(() => {
    if (!hasSession) {
      return;
    }

    const requestedView = new URLSearchParams(window.location.search).get('view');
    const resolvedView = requestedView ? resolveAppViewIntent(requestedView) : null;
    if (!resolvedView) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: resolvedView } }));
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [hasSession, user?.id]);

  React.useEffect(() => {
    if (!user?.id) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');

    if (!inviteToken || handledInviteTokenRef.current === inviteToken) {
      return;
    }

    handledInviteTokenRef.current = inviteToken;

    const completeInviteAcceptance = async () => {
      const invite = await acceptFamilySharingInvite(inviteToken, user.id);

      if (invite) {
        toast.success('Invite accepted. Baby profile added to your list.');
        await refreshBabies();

        const nextView = params.get('view');
        const resolvedNextView = nextView ? resolveAppViewIntent(nextView) : null;
        if (resolvedNextView) {
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: resolvedNextView } }));
          }, 140);
        }
      } else {
        toast.error('This invite link is invalid, expired, or already used.');
      }

      params.delete('invite');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
      window.history.replaceState(null, '', nextUrl);
      setLocationRoute(getLocationRoute());
    };

    completeInviteAcceptance();
  }, [user?.id]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setShowMobileSplash(false);
      }
    };

    mediaQuery.addEventListener('change', handleViewportChange);

    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  const handleSignOut = async () => {
    if (user) {
      await signOut();
    }
    navigateToPublicRoute('login', { replace: true });
  };

  const openPolicies = () => {
    const returnRoute = effectivePublicRoute === 'policies' ? 'welcome' : effectivePublicRoute;
    setPolicyReturnRoute(returnRoute);
    navigateToPublicRoute('policies');
  };

  const handleOnboardingComplete = (data: {
    profileType: 'baby' | 'doctor' | 'caregiver';
    country: string;
    units: 'metric' | 'imperial';
    notificationsEnabled: boolean;
    careProfilePreferences: CareProfilePreferences;
    babyName: string;
    babyDateOfBirth: string;
    babyGender: 'boy' | 'girl' | 'other';
    babyPhotoUrl?: string;
    profilePhotoUrl?: string;
    doctorName: string;
    doctorSpecialty: string;
    caregiverName: string;
    caregiverRelationship: string;
  }) => {
    const isDoctorProfile = data.profileType === 'doctor';
    const isCaregiverProfile = data.profileType === 'caregiver';
    const personalizedDefaults = deriveSettingsFromCareProfile(data.profileType, data.careProfilePreferences);

    saveProfileToOnboarding(
      data.profileType,
      isDoctorProfile
        ? {
            name: data.doctorName.trim(),
            specialty: data.doctorSpecialty.trim() || undefined,
            photoUrl: data.profilePhotoUrl || undefined,
          }
        : undefined,
      isCaregiverProfile
        ? {
            name: data.caregiverName.trim(),
            relationship: data.caregiverRelationship,
            photoUrl: data.profilePhotoUrl || undefined,
          }
        : undefined,
    );

    if (!isDoctorProfile && !isCaregiverProfile) {
      saveBabyToOnboarding({
        id: crypto.randomUUID(),
        name: data.babyName.trim(),
        dateOfBirth: data.babyDateOfBirth,
        gender: data.babyGender,
        photoUrl: data.babyPhotoUrl || undefined,
        country: data.country,
        ageGroup: data.careProfilePreferences.childStage,
        createdAt: new Date().toISOString(),
      });
    }

    saveSettingsToOnboarding({
      language: i18nInstance.getLanguage(),
      notificationsEnabled: data.notificationsEnabled,
      theme: 'system',
      units: data.units,
      feedingInterval: personalizedDefaults.feedingInterval,
      reminderPreferences: personalizedDefaults.reminderPreferences,
      careProfilePreferences: personalizedDefaults.careProfilePreferences,
    });

    setAuthModeHint('signup');
    navigateToPublicRoute('login');
  };

  const handleSplashComplete = () => {
    window.sessionStorage.setItem(MOBILE_SPLASH_SESSION_KEY, 'true');
    setShowMobileSplash(false);
  };

  if (showMobileSplash) {
    return renderWithSuspense(
      <Material3SplashScreen logoSrc="/logo.svg" onSplashComplete={handleSplashComplete} />,
      'Loading splash...',
    );
  }

  if (isLoading) {
    return <FullScreenLoader label="Loading BabyLog..." />;
  }

  if (publicRoute === 'policies') {
    return renderWithSuspense(
      <LegalPolicies
        onBack={() => {
          if (hasSession) {
            navigateToAppView(appRouteView, { replace: true, preserveSearch: true });
            return;
          }
          navigateToPublicRoute(policyReturnRoute, { replace: true });
        }}
      />,
      'Loading policies...',
    );
  }

  if (locationRoute.kind === 'public-emergency-card') {
    return renderWithSuspense(
      <PublicEmergencyShareCard token={locationRoute.token} />,
      'Loading emergency card...',
    );
  }

  if (hasSession) {
    if (Boolean(user) && primaryAdminModeActive && appRouteView === 'dashboard') {
      return <FullScreenLoader label="Opening admin panel..." />;
    }

    if (
      Boolean(user) &&
      babies.length === 0 &&
      accountProfileType !== 'doctor' &&
      accountProfileType !== 'caregiver' &&
      isAccountRoleLoading
    ) {
      return <FullScreenLoader label="Checking account role..." />;
    }

    const shouldForceBabySetup =
      babies.length === 0 &&
      accountProfileType !== 'doctor' &&
      accountProfileType !== 'caregiver' &&
      !isAdminAccount;

    if (shouldForceBabySetup) {
      return renderWithSuspense(
        <Material3AddBaby
          onBabyAdded={() => navigateToAppView(appRouteView, { replace: true, preserveSearch: true })}
        />,
        'Loading baby setup...',
      );
    }

    return renderWithSuspense(
      <PrivacyLock>
        <EnhancedDashboard
          requestedView={appRouteView}
          onViewChange={handleDashboardViewChange}
          onSignOut={handleSignOut}
        />
      </PrivacyLock>,
      'Loading dashboard...',
    );
  }

  if (effectivePublicRoute === 'onboarding') {
    return renderWithSuspense(
      <Material3Onboarding
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          setAuthModeHint('signin');
          navigateToPublicRoute('login');
        }}
        onViewPolicies={openPolicies}
      />,
      'Loading onboarding...',
    );
  }

  if (effectivePublicRoute === 'login') {
    return renderWithSuspense(
      <AuthScreen
        onSuccess={() => {
          const nextView = locationRoute.kind === 'app' ? locationRoute.appView : 'dashboard';
          navigateToAppView(nextView, { replace: true, preserveSearch: true });
        }}
        onViewPolicies={openPolicies}
        postAuthDestinationLabel={locationRoute.kind === 'app' ? formatAppViewLabel(locationRoute.appView) : null}
      />,
      'Loading sign-in...',
    );
  }

  return renderWithSuspense(
    <Material3Welcome
      onGetStarted={() => navigateToPublicRoute('onboarding')}
      onLogIn={() => {
        setAuthModeHint('signin');
        navigateToPublicRoute('login');
      }}
      onViewPolicies={openPolicies}
    />,
    'Loading welcome...',
  );
}

function App() {
  React.useEffect(() => {
    let isDisposed = false;
    let appUrlListener: { remove: () => Promise<void> } | null = null;
    let resumeListener: { remove: () => Promise<void> } | null = null;
    let pauseListener: { remove: () => Promise<void> } | null = null;

    const setupMobileAuth = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      const [{ App: CapacitorApp }, { Browser }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/browser'),
      ]);
      await NotificationsManager.initializeNativeNotifications();

      const handleNativeLaunch = async (url?: string | null) => {
        if (!url) {
          return;
        }

        if (isMobileAuthCallbackUrl(url)) {
          try {
            await completeMobileAuthSession(url);
          } catch (error) {
            console.error('Failed to complete mobile auth session:', error);
            toast.error(error instanceof Error ? error.message : 'Unable to complete sign in.');
          } finally {
            await Browser.close().catch(() => undefined);
          }
          return;
        }

        if (isNativeAppUrl(url)) {
          window.dispatchEvent(new CustomEvent('babylog_native_url', { detail: { url } }));
        }
      };

      const launchUrl = await CapacitorApp.getLaunchUrl();
      if (!isDisposed) {
        await handleNativeLaunch(launchUrl?.url);
        appUrlListener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
          void handleNativeLaunch(url);
        });
        resumeListener = await CapacitorApp.addListener('resume', () => {
          window.dispatchEvent(new CustomEvent('babylog_native_resume'));
        });
        pauseListener = await CapacitorApp.addListener('pause', () => {
          window.dispatchEvent(new CustomEvent('babylog_native_pause'));
        });
      }
    };

    void setupMobileAuth();

    return () => {
      isDisposed = true;
      if (appUrlListener) {
        void appUrlListener.remove();
      }
      if (resumeListener) {
        void resumeListener.remove();
      }
      if (pauseListener) {
        void pauseListener.remove();
      }
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableColorScheme enableSystem>
      <AppErrorBoundary>
        <AppContextProvider>
          <AppShell />
        </AppContextProvider>
      </AppErrorBoundary>
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

export default App;
