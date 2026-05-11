// Temporary storage for onboarding data before authentication
import { Baby, UserSettings } from '../types/index';

export type OnboardingProfileType = 'baby' | 'doctor' | 'caregiver';

export interface OnboardingDoctorProfile {
  name: string;
  specialty?: string;
  photoUrl?: string;
}

export interface OnboardingCaregiverProfile {
  name: string;
  relationship: string;
  photoUrl?: string;
}

interface OnboardingCache {
  baby: Baby | null;
  settings: Partial<UserSettings> | null;
  profileType: OnboardingProfileType;
  doctorProfile: OnboardingDoctorProfile | null;
  caregiverProfile: OnboardingCaregiverProfile | null;
}

const STORAGE_KEY = 'babylog_onboarding';
const DEFAULT_CACHE: OnboardingCache = {
  baby: null,
  settings: null,
  profileType: 'baby',
  doctorProfile: null,
  caregiverProfile: null,
};

export const getOnboardingCache = (): OnboardingCache => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) {
      return DEFAULT_CACHE;
    }

    const parsed = JSON.parse(cached) as Partial<OnboardingCache>;

    return {
      ...DEFAULT_CACHE,
      ...parsed,
      profileType:
        parsed.profileType === 'doctor'
          ? 'doctor'
          : parsed.profileType === 'caregiver'
            ? 'caregiver'
            : 'baby',
      doctorProfile: parsed.doctorProfile || null,
      caregiverProfile: parsed.caregiverProfile || null,
    };
  } catch {
    return DEFAULT_CACHE;
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

export const saveProfileToOnboarding = (
  profileType: OnboardingProfileType,
  doctorProfile?: OnboardingDoctorProfile | null,
  caregiverProfile?: OnboardingCaregiverProfile | null,
): void => {
  try {
    const cache = getOnboardingCache();
    cache.profileType = profileType;
    cache.doctorProfile = profileType === 'doctor' ? doctorProfile || null : null;
    cache.caregiverProfile = profileType === 'caregiver' ? caregiverProfile || null : null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save onboarding profile mode:', error);
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
  return cache.baby !== null || cache.profileType === 'doctor' || cache.profileType === 'caregiver';
};
