/**
 * Material Design 3 Onboarding Flow
 * Multi-step onboarding with country selection, profile setup, units, and preferences
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { COUNTRIES } from '../../lib/countries';
import { getDefaultAvatar, getUserAvatar } from '../../lib/baby-utils';
import { getVaccinationRegionForCountry } from '../../lib/vaccination-schedule-resolver';

type OnboardingStep = 'welcome' | 'country' | 'baby' | 'units' | 'notifications' | 'complete';
type ProfileType = 'baby' | 'doctor' | 'caregiver';

interface CountryOption {
  code: string;
  flagUrl: string | null;
  name: string;
  info: string;
}

interface OnboardingData {
  profileType: ProfileType;
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
}

interface Material3OnboardingProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
  onViewPolicies?: () => void;
}

const STEPS: OnboardingStep[] = ['welcome', 'country', 'baby', 'units', 'notifications', 'complete'];
const CARE_TEAM_STEPS: OnboardingStep[] = ['welcome', 'country', 'baby', 'notifications', 'complete'];
const ROLE_OPTIONS: Array<{
  value: ProfileType;
  label: string;
  shortLabel: string;
  icon: string;
}> = [
  { value: 'baby', label: 'Baby', shortLabel: 'Baby', icon: 'child_care' },
  { value: 'doctor', label: 'Doctor', shortLabel: 'Doctor', icon: 'stethoscope' },
  { value: 'caregiver', label: 'Caregiver', shortLabel: 'Caregiver', icon: 'groups' },
];

const FEATURE_CARDS = [
  {
    icon: 'bedtime',
    title: 'Sleep',
    desc: 'Wake windows and naps',
    color: 'bg-[#eefaff] text-[#506267] dark:bg-cyan-900/20 dark:text-cyan-300',
  },
  {
    icon: 'child_care',
    title: 'Feeding',
    desc: 'Bottle, breast, and notes',
    color: 'bg-[#fff0f2] text-[#d48c96] dark:bg-rose-900/20 dark:text-rose-300',
  },
  {
    icon: 'trending_up',
    title: 'Growth',
    desc: 'Milestones and progress',
    color: 'bg-[#f3f3f7] text-[#45627d] dark:bg-zinc-800 dark:text-blue-300',
  },
];

const CAREGIVER_RELATIONSHIPS = ['Family', 'Nanny', 'Relative', 'Daycare', 'Night Nurse', 'Other'];

const decodeLegacyUtf8 = (value: string): string => {
  if (!/[\u00C3\u00E2]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
};

const getCountryFlagUrl = (countryCode: string): string | null => {
  const normalizedCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return null;
  }

  return `https://flagcdn.com/${normalizedCode.toLowerCase()}.svg`;
};

export const Material3Onboarding: React.FC<Material3OnboardingProps> = ({
  onComplete,
  onSkip,
  onViewPolicies,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<OnboardingData>({
    profileType: 'baby',
    country: 'US',
    units: 'metric',
    notificationsEnabled: true,
    babyName: '',
    babyDateOfBirth: '',
    babyGender: 'other',
    babyPhotoUrl: undefined,
    doctorName: '',
    doctorSpecialty: '',
    caregiverName: '',
    caregiverRelationship: 'Family',
  });

  const countryOptions = useMemo<CountryOption[]>(() => {
    const parsed = (COUNTRIES as Array<{ code: string; name: string; info?: string }>).map((country) => {
      const { regionName } = getVaccinationRegionForCountry(country.code);
      return {
        code: country.code,
        flagUrl: getCountryFlagUrl(country.code),
        name: decodeLegacyUtf8(country.name),
        info: `${regionName} region`,
      };
    });

    return parsed.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredCountries = countryOptions.filter((country) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.info.toLowerCase().includes(query)
    );
  });

  const activeSteps = formData.profileType === 'baby' ? STEPS : CARE_TEAM_STEPS;
  const activeStepIndex = activeSteps.indexOf(currentStep);
  const safeActiveStepIndex = activeStepIndex < 0 ? 0 : activeStepIndex;
  const progress = Math.round((safeActiveStepIndex / (activeSteps.length - 1)) * 100);

  const selectedCountry = countryOptions.find((country) => country.code === formData.country);
  const avatarPreview =
    formData.profileType === 'doctor'
      ? getUserAvatar(formData.doctorName.trim() || 'doctor')
      : formData.profileType === 'caregiver'
        ? getUserAvatar(formData.caregiverName.trim() || 'caregiver')
        : formData.babyPhotoUrl || getDefaultAvatar(formData.babyGender, formData.babyName || 'baby');

  const profileCopy = {
    baby: {
      title: 'Add Your Baby',
      description: "Let's start by creating a profile for your little one so you can begin tracking the journey with clarity.",
      helper: 'Photo is optional. We can keep the generated avatar if you prefer.',
      note: 'Required fields help us personalize growth tracking, routines, and reminders.',
      accent: 'auto_awesome',
    },
    doctor: {
      title: 'Add Your Doctor Profile',
      description: 'Create your clinician profile first, then connect babies or patients after sign-in.',
      helper: 'We generate a clean avatar preview from the name you enter below.',
      note: 'Doctor accounts can review assigned babies, health updates, and care summaries.',
      accent: 'stethoscope',
    },
    caregiver: {
      title: 'Add Your Caregiver Profile',
      description: 'Set up the caregiver account so daily logs and handoff updates stay organized for the family.',
      helper: 'Choose the relationship that best matches how this caregiver supports the child.',
      note: 'Caregivers can help with shared updates while the parent remains the primary owner.',
      accent: 'groups',
    },
  } as const;
  const currentProfileCopy = profileCopy[formData.profileType];

  const canProceed = (() => {
    if (currentStep === 'country') return Boolean(formData.country);
    if (currentStep === 'baby') {
      if (formData.profileType === 'doctor') {
        return Boolean(formData.doctorName.trim());
      }
      if (formData.profileType === 'caregiver') {
        return Boolean(formData.caregiverName.trim()) && Boolean(formData.caregiverRelationship.trim());
      }
      return Boolean(formData.babyName.trim()) && Boolean(formData.babyDateOfBirth);
    }
    return true;
  })();

  const handlePrevious = () => {
    if (safeActiveStepIndex <= 0) return;
    setCurrentStep(activeSteps[safeActiveStepIndex - 1]);
  };

  const handleNext = () => {
    if (currentStep === 'complete') {
      onComplete(formData);
      return;
    }

    if (!canProceed) return;
    setCurrentStep(activeSteps[safeActiveStepIndex + 1]);
  };

  const handleBabyPhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        babyPhotoUrl: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#faf9fc] font-['Manrope',sans-serif] dark:bg-[#0d0e10]">
      <header className="border-b border-gray-100 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#121315]/85">
        {currentStep === 'baby' ? (
          <>
            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center px-4 py-2.5 sm:hidden">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/90 bg-[#f5f6fa] text-[#5e5f61] shadow-[0_10px_24px_rgba(47,51,55,0.06)] transition-all hover:bg-[#eceef5] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                title="Go back"
              >
                <span className="material-symbols-outlined text-[1.25rem]">arrow_back</span>
              </button>
              <p className="truncate text-center font-['Plus_Jakarta_Sans',sans-serif] text-[1.08rem] font-black tracking-tight text-[#2f3337] dark:text-white">
                BabyLog
              </p>
              <div aria-hidden="true" />
            </div>

            <div className="mx-auto hidden max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:flex sm:px-8 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white bg-[#f3f3f7] shadow-inner dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="material-symbols-outlined text-xl text-[#45627d] dark:text-blue-300">
                    auto_awesome
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black tracking-tight text-[#2f3337] dark:text-white sm:text-xl">
                    BabyLog
                  </p>
                  <p className="hidden text-[11px] font-black uppercase tracking-[0.22em] text-[#afb2b8] sm:block">
                    Gentle care onboarding
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-4 sm:flex">
                  <div className="h-1.5 w-44 overflow-hidden rounded-full bg-[#edf0f5] shadow-inner dark:bg-zinc-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-[#45627d] transition-all duration-700 ease-out dark:bg-blue-400"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8] dark:text-zinc-500">
                    Step {safeActiveStepIndex + 1} of {activeSteps.length}
                  </span>
                </div>
                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="rounded-full bg-[#f3f3f7] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#5e5f61] transition-all hover:bg-[#e0e2e8] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 sm:px-5 sm:py-3 sm:text-[10px]"
                  >
                    Skip to Login
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-8 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white bg-[#f3f3f7] shadow-inner dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="material-symbols-outlined text-xl text-[#45627d] dark:text-blue-300">
                    auto_awesome
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black tracking-tight text-[#2f3337] dark:text-white sm:text-xl">
                    BabyLog
                  </p>
                  <p className="hidden text-[11px] font-black uppercase tracking-[0.22em] text-[#afb2b8] sm:block">
                    Gentle care onboarding
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentStep !== 'welcome' && (
                  <div className="hidden items-center gap-4 sm:flex">
                    <div className="h-1.5 w-44 overflow-hidden rounded-full bg-[#edf0f5] shadow-inner dark:bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-[#45627d] transition-all duration-700 ease-out dark:bg-blue-400"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8] dark:text-zinc-500">
                      Step {safeActiveStepIndex + 1} of {activeSteps.length}
                    </span>
                  </div>
                )}
                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="rounded-full bg-[#f3f3f7] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#5e5f61] transition-all hover:bg-[#e0e2e8] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 sm:px-5 sm:py-3 sm:text-[10px]"
                  >
                    Skip to Login
                  </button>
                )}
              </div>
            </div>

            {currentStep !== 'welcome' && (
              <div className="px-3 pb-2 text-right text-[9px] font-black uppercase tracking-[0.18em] text-[#afb2b8] dark:text-zinc-500 sm:hidden">
                Step {safeActiveStepIndex + 1} of {activeSteps.length}
              </div>
            )}
          </>
        )}
      </header>

      <main
        className={`${currentStep === 'baby' ? 'overflow-y-auto sm:overflow-hidden' : 'overflow-hidden'} min-h-0 px-3 py-4 sm:px-6 sm:py-4`}
      >
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.28 }}
          className={`mx-auto max-w-6xl ${currentStep === 'baby' ? 'h-auto sm:h-full' : 'h-full'}`}
        >
          {currentStep === 'welcome' && (
            <div className="mx-auto flex h-full max-w-4xl flex-col justify-between gap-3 py-1 text-center sm:gap-5 sm:py-1.5">
              <div className="space-y-2 sm:space-y-3">
                <h1 className="mx-auto max-w-[10.5ch] font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(1.85rem,6.6vw,3.65rem)] font-black leading-[0.9] tracking-[-0.06em] text-[#2f3337] dark:text-white">
                  The Sanctuary for
                  <span className="mt-0.5 block text-[#45627d] dark:text-blue-300">Gentle Parenting</span>
                </h1>
                <p className="mx-auto max-w-xl text-[13px] font-bold leading-snug text-[#787b80] dark:text-zinc-400 sm:max-w-2xl sm:text-[14px] sm:leading-snug">
                  Set up your profile once, then track feeding, sleep, health, and milestones with clarity.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
                {FEATURE_CARDS.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex min-h-[8.5rem] flex-col justify-center rounded-[1.75rem] border border-white/70 bg-white/78 px-4 py-3.5 shadow-[0_18px_40px_rgba(47,51,55,0.05)] backdrop-blur dark:border-zinc-800 dark:bg-[#17181b] sm:min-h-[8.75rem] sm:rounded-[2rem] sm:px-5 sm:py-4"
                  >
                    <div
                      className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl shadow-inner sm:mb-2.5 sm:h-11 sm:w-11 ${feature.color}`}
                    >
                      <span className="material-symbols-outlined text-[1.15rem] sm:text-[1.35rem]">
                        {feature.icon}
                      </span>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8d9299] sm:text-[11px] sm:tracking-[0.22em]">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-snug text-[#4d535b] dark:text-zinc-300 sm:text-[12px] sm:leading-snug">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'country' && (
            <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 sm:gap-6">
              <div className="text-center">
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(1.95rem,6vw,3rem)] font-black tracking-[-0.05em] text-[#2f3337] dark:text-white">
                  Select Your Country
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-relaxed text-[#787b80] dark:text-zinc-400 sm:text-base">
                  We use this for localized health guidance, vaccine schedules, and regional defaults.
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#17181b] sm:rounded-[2.5rem] sm:p-6">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#afb2b8]">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search for your country"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-2xl border border-transparent bg-[#f8f8fb] py-3 pl-12 pr-4 font-bold text-[#2f3337] outline-none transition-all placeholder:text-[#afb2b8] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-blue-500 sm:mt-4"
                  />
                </div>

                {selectedCountry && (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f8fbff] px-4 py-3 dark:bg-zinc-900">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-inner dark:bg-zinc-800">
                      {selectedCountry.flagUrl ? (
                        <img
                          src={selectedCountry.flagUrl}
                          alt={`${selectedCountry.name} flag`}
                          className="h-5 w-7 rounded-[0.3rem] object-cover shadow-sm"
                        />
                      ) : (
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#787b80] dark:text-zinc-400">
                          {selectedCountry.code}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-sm font-black text-[#2f3337] dark:text-white">
                        {selectedCountry.name}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#afb2b8]">
                        {selectedCountry.code} - {selectedCountry.info}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, country: country.code }))}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          formData.country === country.code
                            ? 'border-[#45627d] bg-[#f8fbff] shadow-md dark:border-blue-500 dark:bg-zinc-900'
                            : 'border-gray-100 bg-white shadow-sm hover:border-gray-200 dark:border-zinc-800 dark:bg-[#17181b] dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f3f7] shadow-inner dark:bg-zinc-900">
                              {country.flagUrl ? (
                                <img
                                  src={country.flagUrl}
                                  alt={`${country.name} flag`}
                                  className="h-5 w-7 rounded-[0.3rem] object-cover shadow-sm"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#787b80] dark:text-zinc-400">
                                  {country.code}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`truncate font-['Plus_Jakarta_Sans',sans-serif] text-base font-black leading-tight ${
                                  formData.country === country.code
                                    ? 'text-[#45627d] dark:text-white'
                                    : 'text-[#2f3337] dark:text-zinc-300'
                                }`}
                              >
                                {country.name}
                              </p>
                              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#afb2b8]">
                                {country.code} - {country.info}
                              </p>
                            </div>
                          </div>
                          {formData.country === country.code && (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#45627d] shadow-inner dark:bg-blue-400/15 dark:text-blue-300">
                              <span className="material-symbols-outlined text-lg">check</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredCountries.length === 0 && (
                    <div className="flex h-full min-h-[12rem] items-center justify-center rounded-[1.5rem] border border-dashed border-gray-200 bg-[#fafbff] px-6 text-center dark:border-zinc-700 dark:bg-zinc-900/60">
                      <div>
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black text-[#2f3337] dark:text-white">
                          No matches yet
                        </p>
                        <p className="mt-2 text-sm font-bold text-[#787b80] dark:text-zinc-400">
                          Try a country name, code, or region keyword.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'baby' && (
            <>
              <div className="mx-auto flex h-full w-full max-w-[34rem] flex-col gap-3 sm:hidden">
                <div className="px-2 text-center">
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[2.05rem] font-black tracking-[-0.06em] text-[#2f3337] dark:text-white">
                    {currentProfileCopy.title}
                  </h2>
                  <p className="mx-auto mt-2 max-w-[19rem] text-[13px] font-semibold leading-relaxed text-[#6f747c] dark:text-zinc-400">
                    {currentProfileCopy.description}
                  </p>
                </div>

                <div className="rounded-[2.1rem] border border-gray-100 bg-white px-4 py-4 shadow-[0_24px_60px_rgba(47,51,55,0.05)] dark:border-zinc-800 dark:bg-[#17181b]">
                  <div className="grid grid-cols-3 gap-1 rounded-[1.5rem] bg-[#f5f6fa] p-1 dark:bg-zinc-900">
                    {ROLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, profileType: option.value }))}
                        className={`rounded-[1.25rem] px-2 py-2.5 text-center transition-all ${
                          formData.profileType === option.value
                            ? 'bg-white text-[#45627d] shadow-sm dark:bg-zinc-800 dark:text-blue-300'
                            : 'text-[#7d8289] dark:text-zinc-500'
                        }`}
                      >
                        <span className="material-symbols-outlined block text-[1.15rem]">{option.icon}</span>
                        <span className="mt-1 block font-['Plus_Jakarta_Sans',sans-serif] text-[9px] font-black uppercase tracking-[0.12em]">
                          {option.shortLabel}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col items-center text-center">
                    <div className="relative">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[5px] border-[#dfe4f0] bg-[#dff3ff] shadow-inner dark:border-zinc-700 dark:bg-zinc-900">
                        <img src={avatarPreview} alt={`${formData.profileType} preview`} className="h-full w-full object-cover" />
                      </div>
                      {formData.profileType === 'baby' ? (
                        <label className="absolute bottom-1 right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#5e5f61] text-white shadow-lg">
                          <span className="material-symbols-outlined text-lg">edit</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBabyPhotoSelect}
                          />
                        </label>
                      ) : (
                        <div className="absolute bottom-1 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-[#5e5f61] text-white shadow-lg">
                          <span className="material-symbols-outlined text-lg">{currentProfileCopy.accent}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-4 font-['Plus_Jakarta_Sans',sans-serif] text-[10px] font-black uppercase tracking-[0.18em] text-[#45627d] dark:text-blue-300">
                      {formData.profileType === 'baby' ? 'Tap to add photo' : 'Profile preview'}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {formData.profileType === 'baby' ? (
                      <>
                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Baby&apos;s Name *
                          </label>
                          <input
                            type="text"
                            value={formData.babyName}
                            onChange={(event) =>
                              setFormData((prev) => ({ ...prev, babyName: event.target.value }))
                            }
                            placeholder="Enter name"
                            className="w-full rounded-[1.55rem] border border-transparent bg-[#f3f4f8] px-5 py-3.5 text-[15px] font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Date of Birth *
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              value={formData.babyDateOfBirth}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  babyDateOfBirth: event.target.value,
                                }))
                              }
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full rounded-[1.55rem] border border-transparent bg-[#f3f4f8] px-5 py-3.5 text-[15px] font-semibold text-[#2f3337] outline-none transition-all focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:focus:border-blue-500"
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5e5f61] dark:text-zinc-400">
                              calendar_month
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Gender (Optional)
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'girl' as const, label: 'Girl', icon: 'female' },
                              { value: 'boy' as const, label: 'Boy', icon: 'male' },
                              { value: 'other' as const, label: 'Surprise', icon: 'question_mark' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({ ...prev, babyGender: option.value }))
                                }
                                className={`rounded-[1.15rem] border px-2 py-3 text-center transition-all ${
                                  formData.babyGender === option.value
                                    ? 'border-[#45627d] bg-[#dff1ff] text-[#345575] shadow-sm dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300'
                                    : 'border-gray-200 bg-white text-[#5d6167] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                }`}
                              >
                                <span className="material-symbols-outlined block text-[1.2rem]">
                                  {option.icon}
                                </span>
                                <span className="mt-1.5 block text-[12px] font-semibold">{option.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : formData.profileType === 'doctor' ? (
                      <>
                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Doctor&apos;s Name *
                          </label>
                          <input
                            type="text"
                            value={formData.doctorName}
                            onChange={(event) =>
                              setFormData((prev) => ({ ...prev, doctorName: event.target.value }))
                            }
                            placeholder="Enter full name"
                            className="w-full rounded-[1.55rem] border border-transparent bg-[#f3f4f8] px-5 py-3.5 text-[15px] font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Specialty
                          </label>
                          <input
                            type="text"
                            value={formData.doctorSpecialty}
                            onChange={(event) =>
                              setFormData((prev) => ({ ...prev, doctorSpecialty: event.target.value }))
                            }
                            placeholder="Pediatrics, Neonatal care, Family medicine..."
                            className="w-full rounded-[1.55rem] border border-transparent bg-[#f3f4f8] px-5 py-3.5 text-[15px] font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Caregiver&apos;s Name *
                          </label>
                          <input
                            type="text"
                            value={formData.caregiverName}
                            onChange={(event) =>
                              setFormData((prev) => ({ ...prev, caregiverName: event.target.value }))
                            }
                            placeholder="Enter full name"
                            className="w-full rounded-[1.55rem] border border-transparent bg-[#f3f4f8] px-5 py-3.5 text-[15px] font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300">
                            Relationship *
                          </label>
                          <select
                            value={formData.caregiverRelationship}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                caregiverRelationship: event.target.value,
                              }))
                            }
                            className="w-full rounded-[1.55rem] border border-transparent bg-[#f3f4f8] px-5 py-3.5 text-[15px] font-semibold text-[#2f3337] outline-none transition-all focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:focus:border-blue-500"
                          >
                            {CAREGIVER_RELATIONSHIPS.map((relationship) => (
                              <option key={relationship} value={relationship}>
                                {relationship}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-[#5e5f61] py-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-[#5e5f61]/20 transition-all hover:bg-[#4a4b4d] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{formData.profileType === 'baby' ? 'Create Profile' : 'Continue'}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>

                  <p className="mt-3 text-center text-[11px] italic leading-relaxed text-[#a1a5ad] dark:text-zinc-500">
                    {formData.profileType === 'baby'
                      ? '*Required fields for growth tracking'
                      : currentProfileCopy.note}
                  </p>
                </div>
              </div>

              <div className="mx-auto hidden h-full max-w-4xl flex-col justify-center gap-2.5 sm:flex sm:gap-4">
                <div className="text-center">
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(1.7rem,5.6vw,2.7rem)] font-black tracking-[-0.05em] text-[#2f3337] dark:text-white">
                    {currentProfileCopy.title}
                  </h2>
                  <p className="mx-auto mt-1 max-w-xl text-[13px] font-bold leading-snug text-[#787b80] dark:text-zinc-400 sm:mt-1.5 sm:max-w-2xl sm:text-[15px]">
                    {currentProfileCopy.description}
                  </p>
                </div>

                <div className="rounded-[1.85rem] border border-gray-100 bg-white p-3.5 shadow-[0_24px_60px_rgba(47,51,55,0.05)] dark:border-zinc-800 dark:bg-[#17181b] sm:rounded-[2.5rem] sm:p-5 lg:p-6">
                  <div className="grid grid-cols-3 gap-1.5 rounded-[1.35rem] bg-[#f5f6fa] p-1 dark:bg-zinc-900 sm:gap-2 sm:rounded-[1.55rem] sm:p-1.5">
                    {ROLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, profileType: option.value }))}
                        className={`rounded-[1rem] px-2 py-2 text-center transition-all sm:rounded-[1.1rem] sm:py-2.5 ${
                          formData.profileType === option.value
                            ? 'bg-white text-[#45627d] shadow-sm dark:bg-zinc-800 dark:text-blue-300'
                            : 'text-[#7d8289] hover:text-[#2f3337] dark:text-zinc-500 dark:hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined block text-[1rem] sm:text-[1.1rem]">{option.icon}</span>
                        <span className="mt-1 block font-['Plus_Jakarta_Sans',sans-serif] text-[9px] font-black uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.14em]">
                          {option.shortLabel}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-[5.75rem_minmax(0,1fr)] items-start gap-3 md:grid-cols-[minmax(0,8.25rem)_minmax(0,1fr)] md:gap-4 sm:mt-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[4px] border-[#dfe4f0] bg-[#dff3ff] shadow-inner dark:border-zinc-700 dark:bg-zinc-900 sm:h-28 sm:w-28 sm:border-[5px]">
                          <img src={avatarPreview} alt={`${formData.profileType} preview`} className="h-full w-full object-cover" />
                        </div>
                        {formData.profileType === 'baby' ? (
                          <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#5e5f61] text-white shadow-lg transition-transform hover:scale-105 sm:h-10 sm:w-10">
                            <span className="material-symbols-outlined text-base sm:text-[17px]">edit</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleBabyPhotoSelect}
                            />
                          </label>
                        ) : (
                          <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#5e5f61] text-white shadow-lg sm:h-10 sm:w-10">
                            <span className="material-symbols-outlined text-base sm:text-[17px]">{currentProfileCopy.accent}</span>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 font-['Plus_Jakarta_Sans',sans-serif] text-[9px] font-black uppercase tracking-[0.12em] text-[#45627d] dark:text-blue-300 sm:mt-3 sm:text-[10px] sm:tracking-[0.18em]">
                        {formData.profileType === 'baby' ? 'Tap photo' : 'Preview'}
                      </p>
                      <p className="mt-1 hidden max-w-[11rem] text-[11px] font-semibold leading-snug text-[#8d9299] dark:text-zinc-400 lg:inline lg:text-[11px]">
                        <span className="sm:hidden">
                          {formData.profileType === 'baby'
                            ? 'Photo is optional.'
                            : formData.profileType === 'doctor'
                              ? 'Auto avatar preview.'
                              : 'Choose the relationship below.'}
                        </span>
                        <span className="hidden sm:inline">{currentProfileCopy.helper}</span>
                      </p>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3.5">
                      {formData.profileType === 'baby' ? (
                        <>
                          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300 sm:text-sm">
                                Baby&apos;s Name *
                              </label>
                              <input
                                type="text"
                                value={formData.babyName}
                                onChange={(event) =>
                                  setFormData((prev) => ({ ...prev, babyName: event.target.value }))
                                }
                                placeholder="Enter name"
                                className="w-full rounded-[1.1rem] border border-transparent bg-[#f3f4f8] px-4 py-3 text-[15px] font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500 sm:rounded-[1.25rem] sm:px-4 sm:py-3 sm:text-base"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300 sm:text-sm">
                                Date of Birth *
                              </label>
                              <div className="relative">
                                <input
                                  type="date"
                                  value={formData.babyDateOfBirth}
                                  onChange={(event) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      babyDateOfBirth: event.target.value,
                                    }))
                                  }
                                  max={new Date().toISOString().split('T')[0]}
                                  className="w-full rounded-[1.1rem] border border-transparent bg-[#f3f4f8] px-4 py-3 text-[15px] font-semibold text-[#2f3337] outline-none transition-all focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:focus:border-blue-500 sm:rounded-[1.25rem] sm:px-4 sm:py-3 sm:text-base"
                                />
                                <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5e5f61] dark:text-zinc-400">
                                  calendar_month
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[13px] font-black text-[#5d6167] dark:text-zinc-300 sm:text-sm">
                              Gender (Optional)
                            </label>
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                              {[
                                { value: 'girl' as const, label: 'Girl', icon: 'female' },
                                { value: 'boy' as const, label: 'Boy', icon: 'male' },
                                { value: 'other' as const, label: 'Surprise', icon: 'question_mark' },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({ ...prev, babyGender: option.value }))
                                  }
                                  className={`rounded-[0.95rem] border px-1.5 py-2.5 text-center transition-all sm:rounded-[1.1rem] sm:px-3 sm:py-3 ${
                                    formData.babyGender === option.value
                                      ? 'border-[#45627d] bg-[#dff1ff] text-[#345575] shadow-sm dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300'
                                      : 'border-gray-200 bg-white text-[#5d6167] hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                                  }`}
                                >
                                  <span className="material-symbols-outlined block text-[1.05rem] sm:text-[1.2rem]">
                                    {option.icon}
                                  </span>
                                  <span className="mt-1 block text-[11px] font-semibold sm:mt-1.5 sm:text-[13px]">{option.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : formData.profileType === 'doctor' ? (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                              Doctor&apos;s Name *
                            </label>
                            <input
                              type="text"
                              value={formData.doctorName}
                              onChange={(event) =>
                                setFormData((prev) => ({ ...prev, doctorName: event.target.value }))
                              }
                              placeholder="Enter full name"
                              className="w-full rounded-[1.2rem] border border-transparent bg-[#f3f4f8] px-4 py-3.5 text-base font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500 sm:rounded-[1.25rem] sm:px-4 sm:py-3 sm:text-base"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                              Specialty
                            </label>
                            <input
                              type="text"
                              value={formData.doctorSpecialty}
                              onChange={(event) =>
                                setFormData((prev) => ({ ...prev, doctorSpecialty: event.target.value }))
                              }
                              placeholder="Pediatrics, Neonatal care, Family medicine..."
                              className="w-full rounded-[1.2rem] border border-transparent bg-[#f3f4f8] px-4 py-3.5 text-base font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500 sm:rounded-[1.25rem] sm:px-4 sm:py-3 sm:text-base"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                              Caregiver&apos;s Name *
                            </label>
                            <input
                              type="text"
                              value={formData.caregiverName}
                              onChange={(event) =>
                                setFormData((prev) => ({ ...prev, caregiverName: event.target.value }))
                              }
                              placeholder="Enter full name"
                              className="w-full rounded-[1.2rem] border border-transparent bg-[#f3f4f8] px-4 py-3.5 text-base font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500 sm:rounded-[1.25rem] sm:px-4 sm:py-3 sm:text-base"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                              Relationship *
                            </label>
                            <select
                              value={formData.caregiverRelationship}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  caregiverRelationship: event.target.value,
                                }))
                              }
                              className="w-full rounded-[1.2rem] border border-transparent bg-[#f3f4f8] px-4 py-3.5 text-base font-semibold text-[#2f3337] outline-none transition-all focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:focus:border-blue-500 sm:rounded-[1.25rem] sm:px-4 sm:py-3 sm:text-base"
                            >
                              {CAREGIVER_RELATIONSHIPS.map((relationship) => (
                                <option key={relationship} value={relationship}>
                                  {relationship}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      <div className="hidden rounded-[1.35rem] bg-[#f8faff] px-4 py-2.5 dark:bg-zinc-900/80 xl:block">
                        <p className="text-sm font-semibold leading-relaxed text-[#6b7280] dark:text-zinc-400">
                          {currentProfileCopy.note}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 'units' && (
            <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-5 text-center sm:gap-8">
              <div className="space-y-3">
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(2rem,6vw,3.25rem)] font-black tracking-[-0.05em] text-[#2f3337] dark:text-white">
                  Measurement Units
                </h2>
                <p className="mx-auto max-w-xl text-sm font-bold leading-relaxed text-[#787b80] dark:text-zinc-400 sm:text-base">
                  Pick your preferred unit system for growth tracking and daily logs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                {[
                  { type: 'metric' as const, label: 'Metric', units: 'kg / cm', icon: 'straighten' },
                  { type: 'imperial' as const, label: 'Imperial', units: 'lb / in', icon: 'square_foot' },
                ].map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, units: option.type }))}
                    className={`rounded-[2rem] border px-4 py-6 transition-all sm:rounded-[2.5rem] sm:px-6 sm:py-10 ${
                      formData.units === option.type
                        ? 'border-[#45627d] bg-white shadow-xl dark:border-blue-500 dark:bg-zinc-800'
                        : 'border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#17181b]'
                    }`}
                  >
                    <span className="material-symbols-outlined mb-3 block text-[2rem] sm:mb-4 sm:text-[2.6rem]">
                      {option.icon}
                    </span>
                    <p className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black text-[#2f3337] dark:text-white sm:text-xl">
                      {option.label}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#afb2b8]">
                      {option.units}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'notifications' && (
            <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-5 sm:gap-8">
              <div className="text-center">
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(2rem,6vw,3.25rem)] font-black tracking-[-0.05em] text-[#2f3337] dark:text-white">
                  Intelligent Alerts
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-relaxed text-[#787b80] dark:text-zinc-400 sm:text-base">
                  Enable reminders so you never miss key care moments.
                </p>
              </div>

              <div className="overflow-hidden rounded-[2.2rem] border border-gray-100 bg-white p-5 shadow-[0_24px_60px_rgba(47,51,55,0.05)] dark:border-zinc-800 dark:bg-[#17181b] sm:rounded-[2.8rem] sm:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-zinc-800 sm:pb-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#f3f3f7] shadow-inner dark:bg-zinc-800">
                      <span className="material-symbols-outlined text-[1.8rem] text-[#45627d] dark:text-blue-300">
                        notifications_active
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black tracking-tight text-[#2f3337] dark:text-white sm:text-xl">
                        Smart Reminders
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#afb2b8]">
                        Personalized and gentle
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        notificationsEnabled: !prev.notificationsEnabled,
                      }))
                    }
                    className={`relative h-9 w-16 rounded-full transition-all ${
                      formData.notificationsEnabled
                        ? 'bg-[#45627d] dark:bg-blue-400'
                        : 'bg-[#e0e2e8] dark:bg-zinc-700'
                    }`}
                    title="Toggle notifications"
                  >
                    <motion.div
                      layout
                      className="absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow-md"
                      animate={{ x: formData.notificationsEnabled ? 28 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
                  {[
                    { label: 'Feeding reminders', icon: 'child_care' },
                    { label: 'Sleep windows', icon: 'bedtime' },
                    { label: 'Health checks', icon: 'medical_services' },
                    { label: 'Growth milestones', icon: 'trending_up' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-[#f8f8fb] px-4 py-3 dark:bg-zinc-900">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          formData.notificationsEnabled
                            ? 'bg-[#eefaff] text-[#45627d] dark:bg-cyan-900/30 dark:text-cyan-300'
                            : 'bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          formData.notificationsEnabled
                            ? 'text-[#2f3337] dark:text-white'
                            : 'text-[#afb2b8] dark:text-zinc-500'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-5 text-center sm:gap-8">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.15, duration: 0.7 }}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white bg-[#f3f3f7] shadow-inner dark:border-zinc-700 dark:bg-zinc-800 sm:h-28 sm:w-28"
              >
                <span className="material-symbols-outlined text-[2.6rem] text-[#45627d] dark:text-blue-300">
                  celebration
                </span>
              </motion.div>

              <div className="space-y-3">
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(2rem,6vw,3.5rem)] font-black tracking-[-0.05em] text-[#2f3337] dark:text-white">
                  Setup Complete
                </h2>
                <p className="mx-auto max-w-md text-sm font-bold leading-relaxed text-[#787b80] dark:text-zinc-400 sm:text-base">
                  {formData.profileType === 'doctor'
                    ? 'Your doctor profile is ready. Continue to login and manage patients and reports.'
                    : formData.profileType === 'caregiver'
                      ? 'Your caregiver profile is ready. Continue to login and support daily care updates.'
                      : 'Your baby profile is ready. Continue to login and start tracking the journey.'}
                </p>
              </div>

              <div className="rounded-[2rem] border border-gray-100 bg-white p-5 text-left shadow-sm dark:border-zinc-800 dark:bg-[#17181b] sm:p-6">
                <div className="flex items-center gap-4">
                  <img
                    src={avatarPreview}
                    alt={`${formData.profileType} preview`}
                    className="h-14 w-14 rounded-2xl object-cover border border-gray-100 dark:border-zinc-700"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#afb2b8]">
                      {formData.profileType === 'doctor'
                        ? 'Doctor'
                        : formData.profileType === 'caregiver'
                          ? 'Caregiver'
                          : 'Baby'}
                    </p>
                    <p className="truncate font-['Plus_Jakarta_Sans',sans-serif] text-xl font-black tracking-tight text-[#2f3337] dark:text-white">
                      {formData.profileType === 'doctor'
                        ? formData.doctorName.trim()
                        : formData.profileType === 'caregiver'
                          ? formData.caregiverName.trim()
                          : formData.babyName.trim()}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f8f8fb] p-3 dark:bg-zinc-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8]">Country</p>
                    <p className="mt-1 flex items-center gap-2 truncate text-sm font-black text-[#2f3337] dark:text-white">
                      <span className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[0.3rem] bg-[#f3f3f7] shadow-sm dark:bg-zinc-800">
                        {(selectedCountry?.flagUrl || getCountryFlagUrl(formData.country)) ? (
                          <img
                            src={selectedCountry?.flagUrl || getCountryFlagUrl(formData.country) || ''}
                            alt={`${selectedCountry?.name || formData.country} flag`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#787b80] dark:text-zinc-400">
                            {formData.country}
                          </span>
                        )}
                      </span>
                      <span className="truncate">{selectedCountry?.name || formData.country}</span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f8f8fb] p-3 dark:bg-zinc-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8]">
                      {formData.profileType === 'doctor'
                        ? 'Specialty'
                        : formData.profileType === 'caregiver'
                          ? 'Relationship'
                          : 'Units'}
                    </p>
                    <p className="mt-1 text-sm font-black uppercase text-[#2f3337] dark:text-white">
                      {formData.profileType === 'doctor'
                        ? formData.doctorSpecialty.trim() || 'General'
                        : formData.profileType === 'caregiver'
                          ? formData.caregiverRelationship
                          : formData.units}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f8f8fb] p-3 dark:bg-zinc-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8]">Alerts</p>
                    <p className="mt-1 text-sm font-black text-[#2f3337] dark:text-white">
                      {formData.notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <footer className={`${currentStep === 'baby' ? 'hidden sm:block ' : ''}border-t border-gray-100 bg-white/88 px-3 py-2 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#121315]/88 sm:px-8 sm:py-3`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-2.5 sm:grid sm:grid-cols-[220px_minmax(0,1fr)_220px] sm:items-center sm:gap-4">
          <div className="hidden sm:block">
            {currentStep !== 'welcome' && (
              <button
                type="button"
                onClick={handlePrevious}
                className="w-full rounded-full bg-[#f3f3f7] py-3 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-black uppercase tracking-[0.18em] text-[#afb2b8] transition-all hover:bg-[#e0e2e8] dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700 sm:h-10 sm:py-0"
              >
                Previous
              </button>
            )}
          </div>

          {onViewPolicies && currentStep !== 'welcome' ? (
            <div className="hidden text-center sm:block">
              <button
                type="button"
                onClick={onViewPolicies}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5e5f61] underline transition-colors hover:text-[#2f3337] dark:text-zinc-400 dark:hover:text-white"
              >
                Privacy, Terms & Policies
              </button>
            </div>
          ) : (
            <div aria-hidden="true" className="hidden sm:block" />
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              disabled={currentStep !== 'complete' && !canProceed}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5e5f61] py-2.5 font-['Plus_Jakarta_Sans',sans-serif] text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-[#5e5f61]/20 transition-all hover:bg-[#4a4b4d] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-full sm:gap-3 sm:py-0 sm:text-[11px]"
            >
              <span>{currentStep === 'complete' ? 'Continue to Login' : 'Next'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Material3Onboarding;
