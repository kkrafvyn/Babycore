/**
 * Material Design 3 Onboarding Flow
 * Multi-step onboarding with country selection, baby profile, units, and preferences
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { COUNTRIES } from '../../lib/countries';
import { getDefaultAvatar } from '../../lib/baby-utils';

type OnboardingStep = 'welcome' | 'country' | 'baby' | 'units' | 'notifications' | 'complete';
type ProfileType = 'baby' | 'doctor';

interface CountryOption {
  code: string;
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
}

interface Material3OnboardingProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

const STEPS: OnboardingStep[] = ['welcome', 'country', 'baby', 'units', 'notifications', 'complete'];

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

export const Material3Onboarding: React.FC<Material3OnboardingProps> = ({ onComplete, onSkip }) => {
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
  });

  const countryOptions = useMemo<CountryOption[]>(() => {
    const parsed = (COUNTRIES as Array<{ code: string; name: string; info?: string }>).map((country) => ({
      code: country.code,
      name: decodeLegacyUtf8(country.name),
      info: country.info || 'Global',
    }));

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

  const activeStepIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((activeStepIndex / (STEPS.length - 1)) * 100);

  const selectedCountry = countryOptions.find((country) => country.code === formData.country);
  const avatarPreview =
    formData.profileType === 'doctor'
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          formData.doctorName.trim() || 'doctor',
        )}`
      : formData.babyPhotoUrl || getDefaultAvatar(formData.babyGender, formData.babyName || 'baby');

  const canProceed = (() => {
    if (currentStep === 'country') return Boolean(formData.country);
    if (currentStep === 'baby') {
      if (formData.profileType === 'doctor') {
        return Boolean(formData.doctorName.trim());
      }
      return Boolean(formData.babyName.trim()) && Boolean(formData.babyDateOfBirth);
    }
    return true;
  })();

  const handlePrevious = () => {
    if (activeStepIndex <= 0) return;
    setCurrentStep(STEPS[activeStepIndex - 1]);
  };

  const handleNext = () => {
    if (currentStep === 'complete') {
      onComplete(formData);
      return;
    }

    if (!canProceed) return;
    setCurrentStep(STEPS[activeStepIndex + 1]);
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
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] flex flex-col font-['Manrope',sans-serif]">
      <div className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)] h-16 sm:h-20 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-3 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[0.75rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center border border-white dark:border-zinc-700 shadow-inner shrink-0">
              <span className="material-symbols-outlined text-[#45627d] dark:text-blue-300 text-xl">
                auto_awesome
              </span>
            </div>
            <span className="text-lg sm:text-xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter truncate">
              BabyCore
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {currentStep !== 'welcome' && (
              <div className="hidden sm:flex items-center gap-4">
                <div className="w-44 h-1.5 bg-[#f3f3f7] dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="bg-[#45627d] dark:bg-blue-400 h-full transition-all duration-700 ease-out"
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8] dark:text-zinc-500">
                  Step {activeStepIndex + 1} of {STEPS.length}
                </span>
              </div>
            )}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="py-2.5 sm:py-3 px-3 sm:px-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#5e5f61] bg-[#f3f3f7] hover:bg-[#e0e2e8] transition-all dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Skip to Login
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 pt-24 sm:pt-32 pb-24 sm:pb-28 px-3 sm:px-6 max-w-6xl mx-auto w-full">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'welcome' && (
            <div className="max-w-3xl mx-auto text-center space-y-10 sm:space-y-12">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter leading-tight">
                  The Sanctuary for
                  <br />
                  <span className="text-[#45627d] dark:text-blue-300">Gentle Parenting</span>
                </h1>
                <p className="text-base sm:text-xl text-[#787b80] dark:text-zinc-400 font-bold max-w-xl mx-auto leading-relaxed">
                  Set up your profile once, then track feeding, sleep, health, and milestones with clarity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 my-8 sm:my-16">
                {[
                  { icon: 'bedtime', title: 'Sleep', desc: 'Track patterns and routines', color: 'bg-[#eefaff] dark:bg-cyan-900/20', text: 'text-[#506267] dark:text-cyan-400' },
                  { icon: 'child_care', title: 'Feeding', desc: 'Log every session quickly', color: 'bg-[#fff0f2] dark:bg-rose-900/20', text: 'text-[#d48c96] dark:text-rose-400' },
                  { icon: 'trending_up', title: 'Growth', desc: 'Follow baby development', color: 'bg-[#f3f3f7] dark:bg-zinc-800', text: 'text-[#45627d] dark:text-blue-300' },
                ].map((feature) => (
                  <div key={feature.icon} className="group bg-white dark:bg-[#1a1c1e] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-[0_32px_64px_rgba(47,51,55,0.03)] border border-gray-100 dark:border-zinc-800 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-500">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                      <span className={`material-symbols-outlined text-2xl sm:text-3xl ${feature.text}`}>
                        {feature.icon}
                      </span>
                    </div>
                    <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-lg text-[#2f3337] dark:text-white mb-2 sm:mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-xs sm:text-sm font-bold text-[#a0a4ae] dark:text-zinc-500 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'country' && (
            <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10">
              <div className="text-center space-y-3 sm:space-y-4">
                <h2 className="text-3xl sm:text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Select Your Country
                </h2>
                <p className="text-sm sm:text-base text-[#787b80] dark:text-zinc-400 font-bold leading-relaxed max-w-2xl mx-auto">
                  We use this for localized health guidance and regional schedules.
                </p>
              </div>

              <div className="bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-zinc-800 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#afb2b8] group-focus-within:text-[#45627d] transition-colors">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full pl-14 pr-4 py-4 bg-[#f8f8fb] dark:bg-zinc-900 border border-transparent rounded-2xl focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 text-[#2f3337] dark:text-white placeholder:text-[#afb2b8] dark:placeholder:text-zinc-600 font-bold transition-all outline-none"
                  />
                </div>

                <div className="max-h-[24rem] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => setFormData((prev) => ({ ...prev, country: country.code }))}
                        className={`p-4 rounded-2xl text-left transition-all border group relative overflow-hidden ${
                          formData.country === country.code
                            ? 'bg-white dark:bg-zinc-800 border-[#45627d] dark:border-blue-500 shadow-lg'
                            : 'bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`font-['Plus_Jakarta_Sans',sans-serif] font-black text-base leading-tight truncate ${
                              formData.country === country.code ? 'text-[#45627d] dark:text-white' : 'text-[#2f3337] dark:text-zinc-300'
                            }`}>
                              {country.name}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#afb2b8] truncate">
                              {country.code} - {country.info}
                            </p>
                          </div>
                          {formData.country === country.code && (
                            <div className="w-9 h-9 rounded-full bg-[#f3f3f7] dark:bg-blue-400/20 flex items-center justify-center text-[#45627d] dark:text-blue-300 shadow-inner shrink-0">
                              <span className="material-symbols-outlined text-lg">check</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'baby' && (
            <div className="max-w-2xl mx-auto space-y-8 sm:space-y-10">
              <div className="text-center space-y-3 sm:space-y-4">
                <h2 className="text-3xl sm:text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  {formData.profileType === 'doctor' ? 'Doctor Profile' : 'Baby Profile'}
                </h2>
                <p className="text-sm sm:text-base text-[#787b80] dark:text-zinc-400 font-bold leading-relaxed">
                  {formData.profileType === 'doctor'
                    ? 'Set up your doctor profile. You can add baby/patient profiles after login.'
                    : "Add your baby's photo or avatar and name."}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1a1c1e] rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-5 sm:p-8 shadow-sm space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500 block">
                    Profile Type
                  </label>
                  <div className="bg-[#f8f8fb] dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-1.5 rounded-2xl flex gap-1.5">
                    {[
                      { value: 'baby' as const, label: 'Parent & Baby', icon: 'child_care' },
                      { value: 'doctor' as const, label: 'Doctor', icon: 'stethoscope' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, profileType: option.value }))}
                        className={`flex-1 py-3 rounded-xl transition-all flex flex-col items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif] font-black text-[10px] uppercase tracking-[0.14em] ${
                          formData.profileType === option.value
                            ? 'bg-white dark:bg-zinc-800 text-[#45627d] dark:text-cyan-400 shadow-inner'
                            : 'text-[#787b80] dark:text-zinc-500 hover:text-[#2f3337] dark:hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.profileType === 'baby' ? (
                  <>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative w-36 h-36 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-zinc-700 bg-[#f3f3f7] dark:bg-zinc-800 shadow-inner shrink-0">
                        <img src={avatarPreview} alt="Baby preview" className="w-full h-full object-cover" />
                        {formData.babyPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, babyPhotoUrl: undefined }))}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 dark:bg-zinc-900/95 text-[#d48c96] dark:text-rose-400 flex items-center justify-center shadow"
                            title="Remove photo"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        )}
                      </div>

                      <div className="w-full space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500">
                          Picture or Avatar
                        </p>
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#f3f3f7] dark:bg-zinc-800 px-5 py-3 text-[10px] uppercase tracking-[0.2em] font-black text-[#2f3337] dark:text-zinc-300 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 transition-all">
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBabyPhotoSelect}
                          />
                        </label>
                        <p className="text-xs font-bold text-[#a0a4ae] dark:text-zinc-500">
                          No photo? We will use the generated avatar.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500 block">
                          Baby Name *
                        </label>
                        <input
                          type="text"
                          value={formData.babyName}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, babyName: event.target.value }))
                          }
                          placeholder="e.g. Maya"
                          className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-[#f8f8fb] dark:bg-zinc-900 text-[#2f3337] dark:text-white placeholder:text-[#a0a4ae] dark:placeholder:text-zinc-600 focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 transition-all font-bold outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500 block">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={formData.babyDateOfBirth}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, babyDateOfBirth: event.target.value }))
                          }
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-[#f8f8fb] dark:bg-zinc-900 text-[#2f3337] dark:text-white focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 transition-all font-bold outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500 block">
                          Gender
                        </label>
                        <div className="bg-[#f8f8fb] dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-1.5 rounded-2xl flex gap-1.5">
                          {[
                            { value: 'boy' as const, label: 'Boy', icon: 'boy' },
                            { value: 'girl' as const, label: 'Girl', icon: 'girl' },
                            { value: 'other' as const, label: 'Other', icon: 'child_care' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, babyGender: option.value }))
                              }
                              className={`flex-1 py-3 rounded-xl transition-all flex flex-col items-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif] font-black text-[10px] uppercase tracking-[0.2em] ${
                                formData.babyGender === option.value
                                  ? 'bg-white dark:bg-zinc-800 text-[#45627d] dark:text-cyan-400 shadow-inner'
                                  : 'text-[#787b80] dark:text-zinc-500 hover:text-[#2f3337] dark:hover:text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">{option.icon}</span>
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f8f8fb] dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                      <img
                        src={avatarPreview}
                        alt="Doctor avatar preview"
                        className="w-14 h-14 rounded-2xl object-cover border border-gray-100 dark:border-zinc-700"
                      />
                      <p className="text-sm font-bold text-[#787b80] dark:text-zinc-400 leading-relaxed">
                        Doctor accounts can monitor outbreaks and manage reports. Add patient profiles after
                        sign-in.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500 block">
                        Doctor Name *
                      </label>
                      <input
                        type="text"
                        value={formData.doctorName}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, doctorName: event.target.value }))
                        }
                        placeholder="e.g. Dr. Ava Johnson"
                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-[#f8f8fb] dark:bg-zinc-900 text-[#2f3337] dark:text-white placeholder:text-[#a0a4ae] dark:placeholder:text-zinc-600 focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 transition-all font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.25em] font-black text-[#afb2b8] dark:text-zinc-500 block">
                        Specialty
                      </label>
                      <input
                        type="text"
                        value={formData.doctorSpecialty}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, doctorSpecialty: event.target.value }))
                        }
                        placeholder="e.g. Pediatrics"
                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-[#f8f8fb] dark:bg-zinc-900 text-[#2f3337] dark:text-white placeholder:text-[#a0a4ae] dark:placeholder:text-zinc-600 focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 transition-all font-bold outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'units' && (
            <div className="max-w-3xl mx-auto text-center space-y-8 sm:space-y-12">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Measurement Units
                </h2>
                <p className="text-sm sm:text-base text-[#787b80] dark:text-zinc-400 font-bold max-w-xl mx-auto leading-relaxed">
                  Pick your preferred unit system for growth and logs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-2 sm:pt-6">
                {[
                  { type: 'metric' as const, label: 'Metric System', units: 'kg / cm', icon: 'straighten' },
                  { type: 'imperial' as const, label: 'Imperial System', units: 'lb / in', icon: 'square_foot' },
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setFormData((prev) => ({ ...prev, units: option.type }))}
                    className={`group relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] border p-6 sm:p-12 transition-all ${
                      formData.units === option.type
                        ? 'bg-white dark:bg-zinc-800 border-[#45627d] dark:border-blue-500 shadow-2xl sm:-translate-y-2'
                        : 'bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-4xl sm:text-5xl mb-4 sm:mb-6 transform transition-transform group-hover:scale-110 duration-500 block">
                      {option.icon}
                    </span>
                    <p className={`font-['Plus_Jakarta_Sans',sans-serif] font-black text-lg sm:text-xl mb-1 sm:mb-2 ${
                      formData.units === option.type ? 'text-[#2f3337] dark:text-white' : 'text-[#787b80] dark:text-zinc-400'
                    }`}>
                      {option.label}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#afb2b8]">{option.units}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-8 sm:space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl sm:text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Intelligent Alerts
                </h2>
                <p className="text-sm sm:text-base text-[#787b80] dark:text-zinc-400 font-bold leading-relaxed">
                  Enable reminders so you never miss key care moments.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] border border-gray-100 bg-white p-6 sm:p-10 shadow-[0_32px_64px_rgba(47,51,55,0.03)] dark:border-zinc-800 dark:bg-[#1a1c1e]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#eefaff]/50 dark:bg-cyan-900/10 blur-[80px] -z-10" />
                <div className="flex items-center justify-between pb-6 sm:pb-8 border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-[#45627d] dark:text-blue-300 text-2xl sm:text-3xl">
                        notifications_active
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-lg sm:text-xl text-[#2f3337] dark:text-white tracking-tight">
                        Smart Reminders
                      </h3>
                      <p className="text-[10px] sm:text-xs font-bold text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest mt-1">
                        Personalized and gentle
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))
                    }
                    className={`relative w-16 h-9 rounded-full transition-all duration-500 shadow-sm ${
                      formData.notificationsEnabled ? 'bg-[#45627d] dark:bg-blue-400' : 'bg-[#e0e2e8] dark:bg-zinc-700'
                    }`}
                    title="Toggle notifications"
                  >
                    <motion.div
                      layout
                      className="absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-md"
                      animate={{ x: formData.notificationsEnabled ? 28 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                <div className="pt-6 sm:pt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 sm:gap-y-6">
                  {[
                    { label: 'Feeding reminders', icon: 'child_care' },
                    { label: 'Sleep windows', icon: 'bedtime' },
                    { label: 'Health checks', icon: 'medical_services' },
                    { label: 'Growth milestones', icon: 'trending_up' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        formData.notificationsEnabled ? 'bg-[#eefaff] dark:bg-cyan-900/30 text-[#45627d] dark:text-cyan-400' : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-300 dark:text-zinc-700'
                      }`}>
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <span className={`text-sm font-bold transition-colors ${
                        formData.notificationsEnabled ? 'text-[#2f3337] dark:text-white' : 'text-[#afb2b8] dark:text-zinc-500'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="max-w-2xl mx-auto text-center space-y-8 sm:space-y-12">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2, duration: 0.8 }}
                className="mx-auto w-28 h-28 sm:w-32 sm:h-32 rounded-[2.5rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center border border-white dark:border-zinc-700 shadow-inner"
              >
                <span className="material-symbols-outlined text-5xl sm:text-6xl text-[#45627d] dark:text-blue-300">
                  celebration
                </span>
              </motion.div>

              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Setup Complete
                </h2>
                <p className="text-base sm:text-xl text-[#787b80] dark:text-zinc-400 font-bold max-w-md mx-auto leading-relaxed">
                  {formData.profileType === 'doctor'
                    ? 'Your doctor profile is ready. Continue to login and manage alerts and patients.'
                    : 'Your profile is ready. Continue to login and start tracking.'}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-zinc-800 rounded-[2rem] p-5 sm:p-6 shadow-sm text-left">
                <div className="flex items-center gap-4">
                  <img
                    src={avatarPreview}
                    alt={formData.profileType === 'doctor' ? 'Doctor avatar preview' : 'Baby avatar preview'}
                    className="w-14 h-14 rounded-2xl object-cover border border-gray-100 dark:border-zinc-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#afb2b8] uppercase tracking-widest">
                      {formData.profileType === 'doctor' ? 'Doctor' : 'Baby'}
                    </p>
                    <p className="text-xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white truncate">
                      {formData.profileType === 'doctor'
                        ? formData.doctorName.trim()
                        : formData.babyName.trim()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                  <div className="bg-[#f8f8fb] dark:bg-zinc-900 rounded-xl p-3">
                    <p className="text-[10px] font-black text-[#afb2b8] uppercase tracking-widest">Country</p>
                    <p className="text-sm font-black text-[#2f3337] dark:text-white mt-1 truncate">
                      {selectedCountry?.name || formData.country}
                    </p>
                  </div>
                  <div className="bg-[#f8f8fb] dark:bg-zinc-900 rounded-xl p-3">
                    <p className="text-[10px] font-black text-[#afb2b8] uppercase tracking-widest">
                      {formData.profileType === 'doctor' ? 'Specialty' : 'Units'}
                    </p>
                    <p className="text-sm font-black text-[#2f3337] dark:text-white mt-1 uppercase">
                      {formData.profileType === 'doctor'
                        ? formData.doctorSpecialty.trim() || 'General'
                        : formData.units}
                    </p>
                  </div>
                  <div className="bg-[#f8f8fb] dark:bg-zinc-900 rounded-xl p-3">
                    <p className="text-[10px] font-black text-[#afb2b8] uppercase tracking-widest">Alerts</p>
                    <p className="text-sm font-black text-[#2f3337] dark:text-white mt-1">
                      {formData.notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0d0e10]/80 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 px-3 sm:px-8 py-4 sm:py-6 z-50">
        <div className="max-w-6xl mx-auto flex justify-between gap-3 sm:gap-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 'welcome'}
            className="flex-1 max-w-[220px] py-4 sm:py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[9px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-[#afb2b8] bg-[#f3f3f7] hover:bg-[#e0e2e8] disabled:opacity-30 disabled:cursor-not-allowed transition-all dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep !== 'complete' && !canProceed}
            className="flex-1 max-w-[460px] py-4 sm:py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[9px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] bg-[#5e5f61] text-white shadow-xl shadow-[#5e5f61]/20 hover:bg-[#4a4b4d] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 sm:gap-3 group"
          >
            <span>{currentStep === 'complete' ? 'Continue to Login' : 'Next'}</span>
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Material3Onboarding;
