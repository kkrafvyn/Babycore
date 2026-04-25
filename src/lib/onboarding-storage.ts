// Temporary storage for onboarding data before authentication
import { Baby, UserSettings } from '../types/index';

interface OnboardingCache {
  baby: Baby | null;
  settings: Partial<UserSettings> | null;
}

const STORAGE_KEY = 'babylog_onboarding';

export const getOnboardingCache = (): OnboardingCache => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : { baby: null, settings: null };
  } catch {
    return { baby: null, settings: null };
  }
};

export const saveBabyToOnboarding = (baby: Baby): void => {
  try {
    const cache = getOnboardingCache();
    cache.baby = baby;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save baby to onboarding cache:', error);
  }
};

export const saveSettingsToOnboarding = (settings: Partial<UserSettings>): void => {
  try {
    const cache = getOnboardingCache();
    cache.settings = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save settings to onboarding cache:', error);
  }
};

export const clearOnboardingCache = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear onboarding cache:', error);
  }
};

export const hasOnboardingData = (): boolean => {
  const cache = getOnboardingCache();
  return cache.baby !== null;
};
