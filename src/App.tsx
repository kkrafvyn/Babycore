import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { AppContextProvider, useAppContext } from './app/AppContext';
import { AuthScreen } from './app/components/AuthScreen';
import { EnhancedDashboard } from './app/components/EnhancedDashboard';
import { Material3AddBaby } from './app/components/Material3AddBaby';
import { Material3Onboarding } from './app/components/Material3Onboarding';
import { Material3SplashScreen } from './app/components/Material3SplashScreen';
import { Material3Welcome } from './app/components/Material3Welcome';
import { LegalPolicies } from './app/components/LegalPolicies';
import { AppErrorBoundary } from './app/components/AppErrorBoundary';
import { PrivacyLock } from './app/components/PrivacyLock';
import {
  getOnboardingCache,
  saveBabyToOnboarding,
  saveProfileToOnboarding,
  saveSettingsToOnboarding,
} from './lib/onboarding-storage';
import { acceptFamilySharingInvite } from './lib/family-sharing-service';
import { signOut } from './lib/supabase';
import {
  type AppView,
  type PublicRoute,
  getAppViewFromPathname,
  getAppViewPath,
  getPublicRouteFromPathname,
  getPublicRoutePath,
  isAppView,
  normalizePathname,
} from './lib/app-routing';

type LocationRoute =
  | {
      kind: 'public';
      publicRoute: PublicRoute;
    }
  | {
      kind: 'app';
      appView: AppView;
    };

const GUEST_SESSION_KEY = 'babylog_guest_session';
const MOBILE_SPLASH_SESSION_KEY = 'babylog_mobile_splash_seen';
const AUTH_MODE_HINT_KEY = 'babylog_auth_mode';

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
    if (queryView && isAppView(queryView)) {
      return { kind: 'app', appView: queryView };
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

const getCanonicalPathForRoute = (route: LocationRoute): string =>
  route.kind === 'app' ? getAppViewPath(route.appView) : getPublicRoutePath(route.publicRoute);

const setAuthModeHint = (mode: 'signin' | 'signup') => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_MODE_HINT_KEY, mode);
};

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

function AppShell() {
  const { user, babies, isLoading, refreshBabies } = useAppContext();
  const handledInviteTokenRef = React.useRef<string | null>(null);
  const [locationRoute, setLocationRoute] = React.useState<LocationRoute>(() => getLocationRoute());
  const [guestSession, setGuestSession] = React.useState(
    () => localStorage.getItem(GUEST_SESSION_KEY) === 'true',
  );
  const [isGuestHydrating, setIsGuestHydrating] = React.useState(guestSession);
  const [showMobileSplash, setShowMobileSplash] = React.useState(() => shouldShowMobileSplash());
  const [policyReturnRoute, setPolicyReturnRoute] = React.useState<PublicRoute>('welcome');

  const hasSession = Boolean(user) || guestSession;
  const publicRoute = locationRoute.kind === 'public' ? locationRoute.publicRoute : 'welcome';
  const appRouteView = locationRoute.kind === 'app' ? locationRoute.appView : 'dashboard';
  const effectivePublicRoute = !hasSession && locationRoute.kind === 'app' ? 'login' : publicRoute;

  const cachedOnboardingProfileType = React.useMemo(
    () => getOnboardingCache().profileType,
    [effectivePublicRoute, user?.id, guestSession, appRouteView],
  );
  const accountProfileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) ||
    cachedOnboardingProfileType;

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

  React.useEffect(() => {
    const handlePopState = () => setLocationRoute(getLocationRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    if (!hasSession) {
      return;
    }

    if (locationRoute.kind === 'public' && locationRoute.publicRoute !== 'policies') {
      navigateToAppView('dashboard', { replace: true, preserveSearch: true });
    }
  }, [hasSession, locationRoute.kind, locationRoute.kind === 'public' ? locationRoute.publicRoute : null]);

  React.useEffect(() => {
    if (!guestSession) {
      setIsGuestHydrating(false);
      return;
    }

    let isMounted = true;

    setIsGuestHydrating(true);
    Promise.resolve(refreshBabies()).finally(() => {
      if (isMounted) {
        setIsGuestHydrating(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [guestSession]);

  React.useEffect(() => {
    if (!hasSession) {
      return;
    }

    const view = new URLSearchParams(window.location.search).get('view');
    if (!view || !isAppView(view)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view } }));
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [hasSession, user?.id, guestSession]);

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
        if (nextView && isAppView(nextView)) {
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: nextView } }));
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

  const handleGuestMode = () => {
    localStorage.setItem(GUEST_SESSION_KEY, 'true');
    setGuestSession(true);
    navigateToAppView(appRouteView, { replace: true, preserveSearch: true });
  };

  const handleSignOut = async () => {
    if (guestSession) {
      localStorage.removeItem(GUEST_SESSION_KEY);
      setGuestSession(false);
      navigateToPublicRoute('login', { replace: true });
      return;
    }

    await signOut();
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
    babyName: string;
    babyDateOfBirth: string;
    babyGender: 'boy' | 'girl' | 'other';
    babyPhotoUrl?: string;
    doctorName: string;
    doctorSpecialty: string;
    caregiverName: string;
    caregiverRelationship: string;
  }) => {
    const isDoctorProfile = data.profileType === 'doctor';
    const isCaregiverProfile = data.profileType === 'caregiver';

    saveProfileToOnboarding(
      data.profileType,
      isDoctorProfile
        ? {
            name: data.doctorName.trim(),
            specialty: data.doctorSpecialty.trim() || undefined,
          }
        : undefined,
      isCaregiverProfile
        ? {
            name: data.caregiverName.trim(),
            relationship: data.caregiverRelationship,
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
        createdAt: new Date().toISOString(),
      });
    }

    saveSettingsToOnboarding({
      language: 'en',
      notificationsEnabled: data.notificationsEnabled,
      theme: 'system',
      units: data.units,
    });

    setAuthModeHint('signup');
    navigateToPublicRoute('login');
  };

  const handleSplashComplete = () => {
    window.sessionStorage.setItem(MOBILE_SPLASH_SESSION_KEY, 'true');
    setShowMobileSplash(false);
  };

  if (showMobileSplash) {
    return <Material3SplashScreen logoSrc="/logo.png" onSplashComplete={handleSplashComplete} />;
  }

  if ((isLoading && !hasSession) || (guestSession && isGuestHydrating) || (Boolean(user) && isLoading)) {
    return <FullScreenLoader label="Loading BabyLog..." />;
  }

  if (publicRoute === 'policies') {
    return (
      <LegalPolicies
        onBack={() => {
          if (hasSession) {
            navigateToAppView(appRouteView, { replace: true, preserveSearch: true });
            return;
          }
          navigateToPublicRoute(policyReturnRoute, { replace: true });
        }}
      />
    );
  }

  if (hasSession) {
    const shouldForceBabySetup =
      babies.length === 0 && accountProfileType !== 'doctor' && accountProfileType !== 'caregiver';

    if (shouldForceBabySetup) {
      return (
        <Material3AddBaby
          onBabyAdded={() => navigateToAppView(appRouteView, { replace: true, preserveSearch: true })}
        />
      );
    }

    return (
      <PrivacyLock>
        <EnhancedDashboard
          requestedView={appRouteView}
          onViewChange={(view) => navigateToAppView(view, { preserveSearch: true })}
          onSignOut={handleSignOut}
        />
      </PrivacyLock>
    );
  }

  if (effectivePublicRoute === 'onboarding') {
    return (
      <Material3Onboarding
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          setAuthModeHint('signin');
          navigateToPublicRoute('login');
        }}
        onViewPolicies={openPolicies}
      />
    );
  }

  if (effectivePublicRoute === 'login') {
    return (
      <AuthScreen
        onSuccess={() => {
          const nextView = locationRoute.kind === 'app' ? locationRoute.appView : 'dashboard';
          navigateToAppView(nextView, { replace: true, preserveSearch: true });
        }}
        onGuestMode={handleGuestMode}
        onViewPolicies={openPolicies}
      />
    );
  }

  return (
    <Material3Welcome
      onGetStarted={() => navigateToPublicRoute('onboarding')}
      onLogIn={() => {
        setAuthModeHint('signin');
        navigateToPublicRoute('login');
      }}
      onViewPolicies={openPolicies}
    />
  );
}

function App() {
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
