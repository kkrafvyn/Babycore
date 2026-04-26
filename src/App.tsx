import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
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
import { signOut } from './lib/supabase';

type PublicRoute = 'welcome' | 'onboarding' | 'login' | 'policies';

const GUEST_SESSION_KEY = 'babylog_guest_session';
const MOBILE_SPLASH_SESSION_KEY = 'babylog_mobile_splash_seen';

const routeHashes: Record<PublicRoute, string> = {
  welcome: '#welcome',
  onboarding: '#onboarding',
  login: '#login',
  policies: '#policies',
};

const getPublicRouteFromHash = (): PublicRoute => {
  const hash = window.location.hash.toLowerCase();

  switch (hash) {
    case '#onboarding':
      return 'onboarding';
    case '#login':
      return 'login';
    case '#policies':
      return 'policies';
    default:
      return 'welcome';
  }
};

const navigateToPublicRoute = (route: PublicRoute) => {
  const nextHash = routeHashes[route];

  if (window.location.hash === nextHash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }

  window.location.hash = nextHash;
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
  const [guestSession, setGuestSession] = React.useState(
    () => localStorage.getItem(GUEST_SESSION_KEY) === 'true',
  );
  const [publicRoute, setPublicRoute] = React.useState<PublicRoute>(() => getPublicRouteFromHash());
  const [isGuestHydrating, setIsGuestHydrating] = React.useState(guestSession);
  const [showMobileSplash, setShowMobileSplash] = React.useState(() => shouldShowMobileSplash());
  const [policyReturnRoute, setPolicyReturnRoute] = React.useState<PublicRoute>('welcome');

  const hasSession = Boolean(user) || guestSession;
  const cachedOnboardingProfileType = React.useMemo(
    () => getOnboardingCache().profileType,
    [publicRoute, user?.id, guestSession],
  );
  const accountProfileType =
    (user?.user_metadata?.onboarding_profile_type as 'baby' | 'doctor' | 'caregiver' | undefined) ||
    cachedOnboardingProfileType;

  React.useEffect(() => {
    const handleHashChange = () => setPublicRoute(getPublicRouteFromHash());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

    if (!view) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view } }));
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [hasSession, user, guestSession]);

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
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#app`);
  };

  const handleSignOut = async () => {
    if (guestSession) {
      localStorage.removeItem(GUEST_SESSION_KEY);
      setGuestSession(false);
      navigateToPublicRoute('login');
      return;
    }

    await signOut();
    navigateToPublicRoute('login');
  };

  const openPolicies = () => {
    const returnRoute = publicRoute === 'policies' ? 'welcome' : publicRoute;
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
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#app`);
            return;
          }
          navigateToPublicRoute(policyReturnRoute);
        }}
      />
    );
  }

  if (hasSession) {
    const shouldForceBabySetup =
      babies.length === 0 && accountProfileType !== 'doctor' && accountProfileType !== 'caregiver';

    if (shouldForceBabySetup) {
      return <Material3AddBaby onBabyAdded={() => window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#app`)} />;
    }

    return (
      <PrivacyLock>
        <EnhancedDashboard onSignOut={handleSignOut} />
      </PrivacyLock>
    );
  }

  if (publicRoute === 'onboarding') {
    return (
      <Material3Onboarding
        onComplete={handleOnboardingComplete}
        onSkip={() => navigateToPublicRoute('login')}
        onViewPolicies={openPolicies}
      />
    );
  }

  if (publicRoute === 'login') {
    return (
      <AuthScreen
        onSuccess={() => {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#app`);
        }}
        onGuestMode={handleGuestMode}
        onViewPolicies={openPolicies}
      />
    );
  }

  return (
    <Material3Welcome
      onGetStarted={() => navigateToPublicRoute('onboarding')}
      onLogIn={() => navigateToPublicRoute('login')}
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
