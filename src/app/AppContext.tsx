import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Baby, UserSettings, View, FeedLog, SleepLog, HealthLog, MemoryLog, DiaperLog, GrowthMeasurement, VaccinationRecord, Milestone } from '../types/index';
import {
  getBabies,
  getLocalBabiesForActiveScope,
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
import { requestWelcomeEmail } from '../lib/welcome-email';
import {
  getOnboardingCache,
  clearOnboardingCache,
} from '../lib/onboarding-storage';
import { consumeAuthModeHint } from '../lib/auth-mode-hint';
import { BabyLogNotification, NotificationsManager } from '../lib/notifications';
import { getApiBaseUrl } from '../lib/api-base-url';
import { readJsonResponse } from '../lib/http-json';
import { supabase } from '../lib/supabase';
import { subscriptionManager } from '../lib/premium';
import { i18nInstance, type SupportedLanguage, type Unit } from '../lib/i18n';
import { useTheme } from 'next-themes';
import { setupRealtimeSync, performFullSync, pullFromCloud } from '../lib/cloud-sync-service';
import {
  applyCareWorkspaceSyncData,
  applyCareWorkspaceSyncDataForBabies,
  buildCareWorkspaceSyncData,
} from '../lib/care-workspace-sync';
import { CARE_WORKSPACE_UPDATED_EVENT } from '../lib/care-workspace-events';
import {
  isCloudSyncPaused,
  isTransientFetchError,
  pauseCloudSync,
  resumeCloudSync,
} from '../lib/network-status';
import {
  getSharedCareWorkspaceSnapshot,
  saveSharedCareWorkspaceSnapshot,
} from '../lib/shared-care-workspace-service';

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

interface AppContextType {
  // Auth
  user: AuthUser;
  refreshUser: () => Promise<void>;
  
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
  retryProfileLoad: () => Promise<void>;
  
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
  const isApplyingRemoteSnapshotRef = useRef(false);
  const skipNextCloudPushRef = useRef(false);
  const syncLocalSnapshotPromiseRef = useRef<Promise<void> | null>(null);
  const syncLocalSnapshotRunIdRef = useRef(0);
  const isApplyingSharedWorkspaceRef = useRef(false);
  const skipNextSharedWorkspacePushRef = useRef(false);
  const initializedUserIdRef = useRef<string | null>(null);
  const initializePromiseRef = useRef<Promise<void> | null>(null);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  useEffect(() => {
    currentBabyRef.current = currentBaby;
  }, [currentBaby]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleWorkspaceUpdated = () => {
      setWorkspaceVersion((current) => current + 1);
    };

    window.addEventListener(CARE_WORKSPACE_UPDATED_EVENT, handleWorkspaceUpdated as EventListener);
    return () => {
      window.removeEventListener(CARE_WORKSPACE_UPDATED_EVENT, handleWorkspaceUpdated as EventListener);
    };
  }, []);

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

  const hydrateSharedWorkspaceForBaby = async (babyId: string) => {
    if (!babyId || !user?.id) {
      return;
    }

    isApplyingSharedWorkspaceRef.current = true;
    skipNextSharedWorkspacePushRef.current = true;

    try {
      const sharedWorkspace = await getSharedCareWorkspaceSnapshot(babyId);
      if (sharedWorkspace) {
        applyCareWorkspaceSyncDataForBabies(sharedWorkspace, [babyId]);
      }
    } catch (error) {
      console.warn('Shared care workspace hydration skipped:', error);
    } finally {
      isApplyingSharedWorkspaceRef.current = false;
    }
  };

  const pushSharedWorkspaceForBaby = async (babyId: string) => {
    if (!babyId || !user?.id || isApplyingSharedWorkspaceRef.current) {
      return;
    }

    if (skipNextSharedWorkspacePushRef.current) {
      skipNextSharedWorkspacePushRef.current = false;
      return;
    }

    const payload = buildCareWorkspaceSyncData([babyId]);
    await saveSharedCareWorkspaceSnapshot(babyId, payload);
  };

  const mergeRemoteSnapshotIntoLocal = async () => {
    if (isApplyingRemoteSnapshotRef.current) {
      return;
    }

    isApplyingRemoteSnapshotRef.current = true;
    skipNextCloudPushRef.current = true;

    try {
      const remoteSnapshot = await pullFromCloud();

      await Promise.all([
        ...(remoteSnapshot?.babies || []).map((baby: Baby) =>
          updateBaby(baby, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.sleepLogs || []).map((log: SleepLog) =>
          updateSleepLog(log, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.feedLogs || []).map((log: FeedLog) =>
          updateFeedLog(log, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.diaperLogs || []).map((log: DiaperLog) =>
          updateDiaperLog(log, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.healthLogs || []).map((log: HealthLog) =>
          updateHealthLog(log, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.growthMeasurements || []).map((measurement: GrowthMeasurement) =>
          updateGrowthMeasurement(measurement, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.vaccinationRecords || []).map((record: VaccinationRecord) =>
          updateVaccinationRecord(record, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.milestones || []).map((milestone: Milestone) =>
          updateMilestone(milestone, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.memories || []).map((memory: MemoryLog) =>
          updateMemoryLog(memory, { skipCloudSync: true }),
        ),
        ...(remoteSnapshot?.journalEntries || []).map((entry: any) =>
          updateJournalEntry(entry, { skipCloudSync: true }),
        ),
      ]);

      applyCareWorkspaceSyncData(
        remoteSnapshot?.careWorkspaceData || remoteSnapshot?.userSettings?.careWorkspaceData,
      );

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
      throw error;
    } finally {
      isApplyingRemoteSnapshotRef.current = false;
    }
  };

  const syncLocalSnapshotToCloud = async (userId: string) => {
    if (syncLocalSnapshotPromiseRef.current) {
      await syncLocalSnapshotPromiseRef.current;
      return;
    }

    if (!navigator.onLine || isCloudSyncPaused()) {
      return;
    }

    const syncRunId = syncLocalSnapshotRunIdRef.current + 1;
    syncLocalSnapshotRunIdRef.current = syncRunId;

    const syncOperation = (async () => {
      try {
        const localBabies = await getLocalBabiesForActiveScope();

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

        for (const baby of localBabies) {
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
        const careWorkspaceData = buildCareWorkspaceSyncData(localBabies.map((baby) => baby.id));

        await performFullSync({
          babies: localBabies,
          sleepLogs: aggregate.sleepLogs,
          feedLogs: aggregate.feedLogs,
          diaperLogs: aggregate.diaperLogs,
          healthLogs: aggregate.healthLogs,
          growthMeasurements: aggregate.growthMeasurements,
          vaccinationRecords: aggregate.vaccinationRecords,
          milestones: aggregate.milestones,
          memories: aggregate.memories,
          journalEntries: aggregate.journalEntries,
          careWorkspaceData,
          userSettings: latestSettings || null,
        });
        resumeCloudSync();
      } catch (error) {
        if (isTransientFetchError(error)) {
          pauseCloudSync();
        }
        console.warn('Cloud sync push failed:', error);
      } finally {
        if (syncLocalSnapshotRunIdRef.current === syncRunId) {
          syncLocalSnapshotPromiseRef.current = null;
        }
      }
    })();

    syncLocalSnapshotPromiseRef.current = syncOperation;
    await syncOperation;
  };

  // Resume cloud sync when connectivity returns
  useEffect(() => {
    const handleOnline = () => resumeCloudSync();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((authUser) => {
      setUser((previous) => {
        if (!authUser) {
          return null;
        }

        // Token refresh emits a new user object — keep the stable reference so we
        // do not re-run the expensive bootstrap when the tab regains focus.
        if (previous?.id === authUser.id) {
          return previous;
        }

        return authUser;
      });

      if (!authUser) {
        initializedUserIdRef.current = null;
        initializePromiseRef.current = null;
        // Clear app state on logout
        setBabies([]);
        setCurrentBaby(null);
        setSettings(null);
        setMilestones([]);
        setIsLoading(false);
        setError(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    const authUser = await getCurrentUser();
    setUser(authUser);
  };

  // Initialize app when user logs in (once per account — not on token refresh)
  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      return;
    }

    if (initializedUserIdRef.current === userId) {
      return;
    }

    if (initializePromiseRef.current) {
      return;
    }

    let syncInterval: ReturnType<typeof setInterval> | undefined;
    let realtimeUnsubscribe: (() => void) | null = null;
    let cancelled = false;

    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const authModeHint = consumeAuthModeHint();
        const shouldSyncOnboardingBaby = authModeHint === 'signup';
        
        // Check if there's onboarding data to sync
        const { baby: onboardingBaby, settings: onboardingSettings } = getOnboardingCache();
        
        if (shouldSyncOnboardingBaby && onboardingBaby) {
          try {
            await addBaby(onboardingBaby);
            clearOnboardingCache();
          } catch (err) {
            console.error('Failed to sync onboarding baby data:', err);
          }
        } else if (authModeHint === 'signin') {
          clearOnboardingCache();
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
        const userSettings = await getUserSettings(userId);

        if (userSettings) {
          applySettingsState(userSettings);
        } else {
          const defaultSettings: UserSettings = {
            userId,
            units: onboardingSettings?.units || 'metric',
            language: onboardingSettings?.language || i18nInstance.getLanguage(),
            careProfilePreferences: onboardingSettings?.careProfilePreferences,
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
              ...(onboardingSettings?.reminderPreferences || {}),
            },
            updatedAt: new Date().toISOString(),
          };
          await setUserSettings(userId, defaultSettings);
          applySettingsState(defaultSettings);
        }

        await subscriptionManager.initialize(userId);
        await syncSubscriptionStatusFromBackend(userId);

        // Setup Real-time Sync (Connectivity)
        realtimeUnsubscribe = setupRealtimeSync((change: any) => {
          console.log('Connectivity: Remote change detected', change);
          void (async () => {
            await mergeRemoteSnapshotIntoLocal();
            await refreshBabies();
            const selectedBabyId = currentBabyRef.current?.id;
            if (selectedBabyId) {
              await refreshLogsForBaby(selectedBabyId);
              await hydrateSharedWorkspaceForBaby(selectedBabyId);
            }
          })();
        });

        // Push latest local snapshot once on initialization.
        await syncLocalSnapshotToCloud(userId);

        // Background sync keeps cloud current for multi-device access.
        syncInterval = setInterval(async () => {
          if (!navigator.onLine || isCloudSyncPaused()) {
            return;
          }
          await syncLocalSnapshotToCloud(userId);
        }, 60000);

        void requestWelcomeEmail();
        
        if (!cancelled) {
          setError(null);
          initializedUserIdRef.current = userId;
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const bootstrap = initialize();
    initializePromiseRef.current = bootstrap;
    void bootstrap.finally(() => {
      if (initializePromiseRef.current === bootstrap) {
        initializePromiseRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      clearInterval(syncInterval);
      realtimeUnsubscribe?.();
      if (initializedUserIdRef.current !== userId) {
        initializePromiseRef.current = null;
      }
    };
  }, [user?.id]);

  const retryProfileLoad = async () => {
    if (!user?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await mergeRemoteSnapshotIntoLocal();
      await refreshBabies();
      setError(null);
    } catch (err) {
      console.error('Failed to reload profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load your profile');
    } finally {
      setIsLoading(false);
    }
  };

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
      const payload = await readJsonResponse<{
        success?: boolean;
        subscription?: {
          planId?: string;
          startDate?: string;
        } | null;
      }>(response);

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

    if (isApplyingRemoteSnapshotRef.current) {
      return;
    }

    if (skipNextCloudPushRef.current) {
      skipNextCloudPushRef.current = false;
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
    workspaceVersion,
  ]);

  useEffect(() => {
    if (!user?.id || !currentBaby?.id || !navigator.onLine) {
      return;
    }

    void hydrateSharedWorkspaceForBaby(currentBaby.id);
  }, [user?.id, currentBaby?.id]);

  useEffect(() => {
    if (!user?.id || !currentBaby?.id || !navigator.onLine) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void pushSharedWorkspaceForBaby(currentBaby.id);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [user?.id, currentBaby?.id, workspaceVersion]);

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
    refreshUser,
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
    retryProfileLoad,
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
