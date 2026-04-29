import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Baby, UserSettings, View, FeedLog, SleepLog, HealthLog, MemoryLog, DiaperLog, GrowthMeasurement, VaccinationRecord, Milestone } from '../types/index';
import {
  getBabies,
  getUserSettings,
  migrateGuestBabiesToCurrentUser,
  saveUserSettings,
  setUserSettings,
  addBaby,
  updateBaby,
  getMemoryLogsByBaby,
  updateMemoryLog,
  getHealthLogsByBaby,
  updateHealthLog,
  getMilestonesByBaby,
  updateMilestone,
  getFeedLogsByBaby,
  updateFeedLog,
  getSleepLogsByBaby,
  updateSleepLog,
  getDiaperLogsByBaby,
  updateDiaperLog,
  getGrowthMeasurementsByBaby,
  updateGrowthMeasurement,
  getVaccinationRecordsByBaby,
  updateVaccinationRecord,
  getJournalEntriesByBaby,
  updateJournalEntry,
} from '../lib/supabase-storage';
import { getCurrentUser, onAuthStateChange } from '../lib/supabase';
import {
  getOnboardingCache,
  clearOnboardingCache,
} from '../lib/onboarding-storage';
import { BabyLogNotification, NotificationsManager } from '../lib/notifications';
import { getApiBaseUrl } from '../lib/api-base-url';
import { supabase } from '../lib/supabase';
import { subscriptionManager } from '../lib/premium';
import { i18nInstance, type SupportedLanguage, type Unit } from '../lib/i18n';
import { useTheme } from 'next-themes';
import { setupRealtimeSync, performFullSync, pullFromCloud } from '../lib/cloud-sync-service';

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
  const currentBabyRef = useRef<Baby | null>(null);

  useEffect(() => {
    currentBabyRef.current = currentBaby;
  }, [currentBaby]);

  const applySettingsState = (nextSettings: UserSettings | null) => {
    if (!nextSettings) {
      return;
    }

    const defaultReminderPreferences = {
      feeding: true,
      sleep: true,
      diaper: false,
      medication: true,
      vaccine: true,
      growth: true,
      retryMissed: true,
      snoozeMinutes: 30,
      quietHoursEnabled: true,
    };

    const normalizedSettings: UserSettings = {
      ...nextSettings,
      subscriptionPlan: nextSettings.subscriptionPlan || 'free',
      subscriptionStatus: nextSettings.subscriptionStatus || 'free',
      reminderPreferences: {
        ...defaultReminderPreferences,
        ...(nextSettings.reminderPreferences || {}),
      },
    };

    if (normalizedSettings.language) {
      i18nInstance.setLanguage(normalizedSettings.language as SupportedLanguage);
    }
    if (normalizedSettings.units) {
      i18nInstance.setUnit(normalizedSettings.units as Unit);
    }

    setSettings(normalizedSettings);
    setTheme(normalizedSettings.theme || 'system');
  };

  const mergeRemoteSnapshotIntoLocal = async () => {
    try {
      const remoteSnapshot = await pullFromCloud();

      await Promise.all([
        ...(remoteSnapshot?.babies || []).map((baby: Baby) =>
          updateBaby(baby, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.sleepLogs || []).map((log: SleepLog) => updateSleepLog(log)),
        ...(remoteSnapshot?.feedLogs || []).map((log: FeedLog) => updateFeedLog(log)),
        ...(remoteSnapshot?.diaperLogs || []).map((log: DiaperLog) => updateDiaperLog(log)),
        ...(remoteSnapshot?.healthLogs || []).map((log: HealthLog) =>
          updateHealthLog(log, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.growthMeasurements || []).map((measurement: GrowthMeasurement) =>
          updateGrowthMeasurement(measurement),
        ),
        ...(remoteSnapshot?.vaccinationRecords || []).map((record: VaccinationRecord) =>
          updateVaccinationRecord(record),
        ),
        ...(remoteSnapshot?.milestones || []).map((milestone: Milestone) => updateMilestone(milestone)),
        ...(remoteSnapshot?.memories || []).map((memory: MemoryLog) =>
          updateMemoryLog(memory, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.journalEntries || []).map((entry: any) =>
          updateJournalEntry(entry, { skipCloudSync: true }),
        ),
      ]);

      if (remoteSnapshot?.userSettings && user?.id) {
        const remoteSettings = {
          ...remoteSnapshot.userSettings,
          userId: user.id,
        };
        await saveUserSettings(remoteSettings, { skipCloudSync: true });
        applySettingsState(remoteSettings);
      }
    } catch (error) {
      console.warn('Remote hydration skipped due to sync error:', error);
    }
  };

  const syncLocalSnapshotToCloud = async (userId: string) => {
    if (!navigator.onLine) {
      return;
    }

    try {
      const localBabies = await getBabies();

      const normalizedEmail = (user?.email || '').trim().toLowerCase();
      const [sharedByUser, sharedByEmail, doctorAssignments] = await Promise.all([
        supabase
          .from('family_sharing_invites')
          .select('baby_id')
          .eq('accepted_by', userId)
          .not('accepted_at', 'is', null),
        normalizedEmail
          ? supabase
              .from('family_sharing_invites')
              .select('baby_id')
              .ilike('invited_email', normalizedEmail)
              .not('accepted_at', 'is', null)
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from('doctor_baby_assignments')
          .select('baby_id,status')
          .eq('doctor_id', userId),
      ]);

      const sharedBabyIds = new Set<string>();
      for (const row of sharedByUser.data || []) {
        if (row?.baby_id) sharedBabyIds.add(row.baby_id);
      }
      for (const row of sharedByEmail.data || []) {
        if (row?.baby_id) sharedBabyIds.add(row.baby_id);
      }
      for (const row of doctorAssignments.data || []) {
        if (row?.baby_id && (!row?.status || row.status === 'active')) {
          sharedBabyIds.add(row.baby_id);
        }
      }

      const ownedLocalBabies = localBabies.filter((baby) => !sharedBabyIds.has(baby.id));

      const aggregate = {
        sleepLogs: [] as SleepLog[],
        feedLogs: [] as FeedLog[],
        diaperLogs: [] as DiaperLog[],
        healthLogs: [] as HealthLog[],
        growthMeasurements: [] as GrowthMeasurement[],
        vaccinationRecords: [] as VaccinationRecord[],
        milestones: [] as Milestone[],
        memories: [] as MemoryLog[],
        journalEntries: [] as any[],
      };

      for (const baby of ownedLocalBabies) {
        const [
          sleepEntries,
          feedEntries,
          diaperEntries,
          healthEntries,
          growthEntries,
          vaccineEntries,
          milestoneEntries,
          memoryEntries,
          journalEntries,
        ] =
          await Promise.all([
            getSleepLogsByBaby(baby.id),
            getFeedLogsByBaby(baby.id),
            getDiaperLogsByBaby(baby.id),
            getHealthLogsByBaby(baby.id),
            getGrowthMeasurementsByBaby(baby.id),
            getVaccinationRecordsByBaby(baby.id),
            getMilestonesByBaby(baby.id),
            getMemoryLogsByBaby(baby.id),
            getJournalEntriesByBaby(baby.id),
          ]);

        aggregate.sleepLogs.push(...sleepEntries);
        aggregate.feedLogs.push(...feedEntries);
        aggregate.diaperLogs.push(...diaperEntries);
        aggregate.healthLogs.push(...healthEntries);
        aggregate.growthMeasurements.push(...growthEntries);
        aggregate.vaccinationRecords.push(...vaccineEntries);
        aggregate.milestones.push(...milestoneEntries);
        aggregate.memories.push(...memoryEntries);
        aggregate.journalEntries.push(...journalEntries);
      }

      const latestSettings = await getUserSettings(userId);

      await performFullSync({
        babies: ownedLocalBabies,
        sleepLogs: aggregate.sleepLogs,
        feedLogs: aggregate.feedLogs,
        diaperLogs: aggregate.diaperLogs,
        healthLogs: aggregate.healthLogs,
        growthMeasurements: aggregate.growthMeasurements,
        vaccinationRecords: aggregate.vaccinationRecords,
        milestones: aggregate.milestones,
        memories: aggregate.memories,
        journalEntries: aggregate.journalEntries,
        userSettings: latestSettings || null,
      });
    } catch (error) {
      console.warn('Cloud sync push failed:', error);
    }
  };

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
    let realtimeUnsubscribe: (() => void) | null = null;

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

        try {
          const migratedGuestBabies = await migrateGuestBabiesToCurrentUser();
          if (migratedGuestBabies > 0) {
            console.info(`Migrated ${migratedGuestBabies} guest baby profile(s) into the signed-in account.`);
          }
        } catch (err) {
          console.error('Failed to migrate guest baby profiles:', err);
        }

        // Pull latest cloud snapshot for this account on every login/device.
        await mergeRemoteSnapshotIntoLocal();
        
        // Load babies
        await refreshBabies();
        
        // Load settings
        const userSettings = await getUserSettings(user.id);

        if (userSettings) {
          applySettingsState(userSettings);
        } else {
          const defaultSettings: UserSettings = {
            userId: user.id,
            units: onboardingSettings?.units || 'metric',
            language: onboardingSettings?.language || 'en',
            notificationsEnabled: onboardingSettings?.notificationsEnabled !== false,
            feedingInterval: onboardingSettings?.feedingInterval || 3,
            theme: onboardingSettings?.theme || 'system',
            subscriptionPlan: 'free',
            subscriptionStatus: 'free',
            reminderPreferences: {
              feeding: true,
              sleep: true,
              diaper: false,
              medication: true,
              vaccine: true,
              growth: true,
              retryMissed: true,
              snoozeMinutes: 30,
              quietHoursEnabled: true,
            },
            updatedAt: new Date().toISOString(),
          };
          await setUserSettings(user.id, defaultSettings);
          applySettingsState(defaultSettings);
        }

        await subscriptionManager.initialize(user.id);
        await syncSubscriptionStatusFromBackend(user.id);

        // Setup Real-time Sync (Connectivity)
        realtimeUnsubscribe = setupRealtimeSync((change: any) => {
          console.log('Connectivity: Remote change detected', change);
          void (async () => {
            await mergeRemoteSnapshotIntoLocal();
            await refreshBabies();
            const selectedBabyId = currentBabyRef.current?.id;
            if (selectedBabyId) {
              await refreshLogsForBaby(selectedBabyId);
            }
          })();
        });

        // Push latest local snapshot once on initialization.
        await syncLocalSnapshotToCloud(user.id);

        // Background sync keeps cloud current for multi-device access.
        syncInterval = setInterval(async () => {
          await syncLocalSnapshotToCloud(user.id);
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
    return () => {
      clearInterval(syncInterval);
      realtimeUnsubscribe?.();
    };
  }, [user]);

  const syncSubscriptionStatusFromBackend = async (userId: string) => {
    try {
      const baseSettings = await getUserSettings(userId);
      if (!baseSettings) {
        return;
      }

      const auth = supabase.auth as any;
      const {
        data: { session },
      } = await auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/payments/subscription-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) return;
      const payload = await response.json();

      if (!payload?.success) return;

      if (!payload.subscription) {
        const updatedSettings: UserSettings = {
          ...baseSettings,
          userId,
          subscriptionPlan: 'free',
          subscriptionStatus: 'free',
          subscriptionEndDate: undefined,
          subscriptionCurrency: undefined,
          updatedAt: new Date().toISOString(),
        };
        await setUserSettings(userId, updatedSettings);
        applySettingsState(updatedSettings);
        return;
      }

      const updatedSettings: UserSettings = {
        ...baseSettings,
        userId,
        subscriptionPlan: String(payload.subscription.planId || 'premium'),
        subscriptionStatus: 'active',
        subscriptionStartDate: payload.subscription.startDate,
        updatedAt: new Date().toISOString(),
      };
      await setUserSettings(userId, updatedSettings);
      applySettingsState(updatedSettings);
    } catch (error) {
      console.warn('Failed to sync subscription status from backend:', error);
    }
  };

  // Refresh all logs when current baby changes
  useEffect(() => {
    if (currentBaby?.id) {
      void refreshLogsForBaby(currentBaby.id);
    }
  }, [currentBaby?.id]);

  // Near-real-time cloud push so other devices see changes quickly.
  useEffect(() => {
    if (!user?.id || !navigator.onLine) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void syncLocalSnapshotToCloud(user.id);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [
    user?.id,
    babies,
    feedLogs,
    sleepLogs,
    diaperLogs,
    healthLogs,
    growthMeasurements,
    vaccinationRecords,
    milestones,
    memories,
    settings?.updatedAt,
  ]);

  const refreshLogsForBaby = async (babyId: string) => {
    try {
      const [feeds, sleeps, diapers, health, mems, growth, vaccines, nextMilestones] = await Promise.all([
        getFeedLogsByBaby(babyId),
        getSleepLogsByBaby(babyId),
        getDiaperLogsByBaby(babyId),
        getHealthLogsByBaby(babyId),
        getMemoryLogsByBaby(babyId),
        getGrowthMeasurementsByBaby(babyId),
        getVaccinationRecordsByBaby(babyId),
        getMilestonesByBaby(babyId),
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

  const refreshAllLogs = async () => {
    const babyId = currentBabyRef.current?.id;
    if (!babyId) return;
    await refreshLogsForBaby(babyId);
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
        userId: user.id,
        updatedAt: new Date().toISOString(),
      };
      
      await setUserSettings(user.id, updated);
      applySettingsState(updated);
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
