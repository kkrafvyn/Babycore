import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Baby, UserSettings, View, FeedLog, SleepLog, HealthLog, MemoryLog, DiaperLog, GrowthMeasurement, VaccinationRecord, Milestone } from '../types/index';
import {
  getBabies,
  getUserSettings,
  saveUserSettings,
  setUserSettings,
  addBaby,
  getMemoryLogsByBaby,
  getHealthLogsByBaby,
  getMilestonesByBaby,
  getFeedLogsByBaby,
  getSleepLogsByBaby,
  getDiaperLogsByBaby,
  getGrowthMeasurementsByBaby,
  getVaccinationRecordsByBaby,
} from '../lib/supabase-storage';
import { getCurrentUser, onAuthStateChange } from '../lib/supabase';
import {
  getOnboardingCache,
  clearOnboardingCache,
} from '../lib/onboarding-storage';
import { BabyLogNotification, NotificationsManager } from '../lib/notifications';
import { useTheme } from 'next-themes';
import { setupRealtimeSync, performFullSync } from '../lib/cloud-sync-service';

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

interface AppContextType {
  // Auth
  user: AuthUser;
  
  // Babies
  babies: Baby[];
  currentBaby: Baby | null;
  setCurrentBaby: (baby: Baby | null) => void;
  refreshBabies: () => Promise<void>;
  
  // Logs
  feedLogs: FeedLog[];
  sleepLogs: SleepLog[];
  healthLogs: HealthLog[];
  memories: MemoryLog[];
  diaperLogs: DiaperLog[];
  growthMeasurements: GrowthMeasurement[];
  vaccinationRecords: VaccinationRecord[];
  milestones: Milestone[];
  
  // Settings
  settings: UserSettings | null;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  
  // Notifications
  notifications: BabyLogNotification[];
  addNotification: (notification: BabyLogNotification) => void;
  dismissNotification: (id: string) => void;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Refreshers
  refreshHealth: () => Promise<void>;
  refreshMemories: () => Promise<void>;
  refreshAllLogs: () => Promise<void>;

  // App state
  currentView: View;
  setCurrentView: (view: View) => void;
  isLoading: boolean;
  error: string | null;
  
  // Navigation
  goToOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  const { setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser>(null);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [currentBaby, setCurrentBaby] = useState<Baby | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<BabyLogNotification[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [memories, setMemories] = useState<MemoryLog[]>([]);
  const [diaperLogs, setDiaperLogs] = useState<DiaperLog[]>([]);
  const [growthMeasurements, setGrowthMeasurements] = useState<GrowthMeasurement[]>([]);
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    const hydrateInitialUser = async () => {
      const authUser = await getCurrentUser();

      if (!isMounted) {
        return;
      }

      setUser(authUser);

      if (!authUser) {
        setIsLoading(false);
      }
    };

    hydrateInitialUser();

    const { data: { subscription } } = onAuthStateChange((authUser) => {
      setUser(authUser);
      if (!authUser) {
        // Clear app state on logout
        setBabies([]);
        setCurrentBaby(null);
        setSettings(null);
        setMilestones([]);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Initialize app when user logs in
  useEffect(() => {
    if (!user) return;

    let syncInterval: any;

    const initialize = async () => {
      try {
        setIsLoading(true);
        
        // Check if there's onboarding data to sync
        const { baby: onboardingBaby, settings: onboardingSettings } = getOnboardingCache();
        
        if (onboardingBaby) {
          try {
            await addBaby(onboardingBaby);
            clearOnboardingCache();
          } catch (err) {
            console.error('Failed to sync onboarding baby data:', err);
          }
        }
        
        // Load babies
        await refreshBabies();
        
        // Load settings
        const userSettings = await getUserSettings(user.id);
        if (userSettings) {
          setSettings(userSettings);
          setTheme(userSettings.theme || 'system');
        } else {
          const defaultSettings: UserSettings = {
            units: onboardingSettings?.units || 'metric',
            language: onboardingSettings?.language || 'en',
            notificationsEnabled: onboardingSettings?.notificationsEnabled !== false,
            feedingInterval: onboardingSettings?.feedingInterval || 3,
            theme: onboardingSettings?.theme || 'system',
            updatedAt: new Date().toISOString(),
          };
          await setUserSettings(user.id, defaultSettings);
          setSettings(defaultSettings);
          setTheme(defaultSettings.theme || 'system');
        }

        // Setup Real-time Sync (Connectivity)
        setupRealtimeSync((change: any) => {
          console.log('Connectivity: Remote change detected', change);
          refreshBabies();
        });

        // Background Sync Connection
        syncInterval = setInterval(async () => {
          if (navigator.onLine && user && currentBaby) {
             const [memories, milestones] = await Promise.all([
                getMemoryLogsByBaby(currentBaby.id),
                getMilestonesByBaby(currentBaby.id)
             ]);
             await performFullSync({
                babies,
                sleepLogs,
                feedLogs,
                diaperLogs: [],
                growthMeasurements: [],
                vaccinationRecords: [],
                milestones,
                memories,
                userSettings: settings
             });
          }
        }, 60000);
        
        setError(null);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
    return () => clearInterval(syncInterval);
  }, [user]);

  // Refresh all logs when current baby changes
  useEffect(() => {
    if (currentBaby) {
      refreshAllLogs();
    }
  }, [currentBaby?.id]);

  const refreshAllLogs = async () => {
    if (!currentBaby) return;
    try {
      const [feeds, sleeps, diapers, health, mems, growth, vaccines, nextMilestones] = await Promise.all([
        getFeedLogsByBaby(currentBaby.id),
        getSleepLogsByBaby(currentBaby.id),
        getDiaperLogsByBaby(currentBaby.id),
        getHealthLogsByBaby(currentBaby.id),
        getMemoryLogsByBaby(currentBaby.id),
        getGrowthMeasurementsByBaby(currentBaby.id),
        getVaccinationRecordsByBaby(currentBaby.id),
        getMilestonesByBaby(currentBaby.id),
      ]);
      setFeedLogs(feeds);
      setSleepLogs(sleeps);
      setDiaperLogs(diapers);
      setHealthLogs(health);
      setMemories(mems);
      setGrowthMeasurements(growth);
      setVaccinationRecords(vaccines);
      setMilestones(nextMilestones);
    } catch (err) {
      console.error('Failed to refresh all logs:', err);
    }
  };

  const refreshBabies = async () => {
    try {
      const loadedBabies = await getBabies();
      setBabies(loadedBabies);

      if (loadedBabies.length === 0) {
        setCurrentBaby(null);
        return;
      }

      if (!currentBaby) {
        setCurrentBaby(loadedBabies[0]);
      } else {
        const matchingCurrentBaby = loadedBabies.find((baby) => baby.id === currentBaby.id);
        setCurrentBaby(matchingCurrentBaby || loadedBabies[0]);
      }
    } catch (err) {
      console.error('Failed to load babies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load babies');
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      if (!settings || !user) return;
      
      const updated: UserSettings = {
        ...settings,
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      
      await setUserSettings(user.id, updated);
      setSettings(updated);

      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const goToOnboarding = () => {
    setCurrentBaby(null);
    setCurrentView('onboarding');
  };

  const addNotification = (notification: BabyLogNotification) => {
    setNotifications(prev => [...prev, notification]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const refreshHealth = async () => {
     if (!currentBaby) return;
     try {
        const logs = await getHealthLogsByBaby(currentBaby.id);
        setHealthLogs(logs);
     } catch (err) {
        console.error('Failed to load health logs:', err);
     }
  };

  const refreshMemories = async () => {
    if (!currentBaby) return;
    try {
       const logs = await getMemoryLogsByBaby(currentBaby.id);
       setMemories(logs);
    } catch (err) {
       console.error('Failed to load memories:', err);
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    return await NotificationsManager.requestPermission();
  };

  const value: AppContextType = {
    user,
    babies,
    currentBaby,
    setCurrentBaby,
    refreshBabies,
    feedLogs,
    sleepLogs,
    healthLogs,
    memories,
    diaperLogs,
    growthMeasurements,
    vaccinationRecords,
    milestones,
    settings,
    updateSettings,
    notifications,
    addNotification,
    dismissNotification,
    requestNotificationPermission,
    refreshHealth,
    refreshMemories,
    refreshAllLogs,
    currentView,
    setCurrentView,
    isLoading,
    error,
    goToOnboarding,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

// Alias for compatibility
export const useAuthStore = useAppContext;
