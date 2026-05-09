/**
 * Material Design 3 Add Baby Screen
 * Form for adding a new baby with photo upload and details
 * Connected to AppContext for saving baby profile
 */

import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { addBaby } from '../../lib/supabase-storage';
import { getOnboardingCache } from '../../lib/onboarding-storage';
import type { Baby } from '../../types';
import { captureNativePhoto, isNativeAppRuntime } from '../../lib/native-media';

interface AddBabyFormData {
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  photo?: File;
  photoPreview?: string;
}

interface AddBabyScreenProps {
  onBabyAdded: () => void;
}

export const Material3AddBaby: React.FC<AddBabyScreenProps> = ({ onBabyAdded }) => {
  const context = useAppContext();
  const { refreshBabies } = context || {};

  const [formData, setFormData] = useState<AddBabyFormData>({
    name: '',
    dateOfBirth: '',
    gender: 'male',
    photo: undefined,
    photoPreview: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const supportsNativeCamera = isNativeAppRuntime();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          photo: file,
          photoPreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNativeCapture = async () => {
    setError(null);
    setIsCapturing(true);

    try {
      const captured = await captureNativePhoto('baby-profile');
      if (!captured) {
        return;
      }

      setFormData((prev) => ({
        ...prev,
        photo: captured.file,
        photoPreview: captured.previewUrl,
      }));
    } catch (err) {
      console.error('Failed to capture baby profile photo:', err);
      setError('Could not open the camera right now.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderSelect = (gender: 'male' | 'female' | 'other') => {
    setFormData((prev) => ({ ...prev, gender }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Baby name is required');
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Date of birth is required');
      return;
    }

    try {
      setIsLoading(true);

      const onboardingCache = getOnboardingCache();
      const baby: Baby = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender:
          formData.gender === 'male'
            ? 'boy'
            : formData.gender === 'female'
              ? 'girl'
              : 'other',
        photoUrl: formData.photoPreview,
        country: onboardingCache.baby?.country || 'US',
        createdAt: new Date().toISOString(),
      };

      await addBaby(baby);
      await refreshBabies?.();
      onBabyAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add baby');
    } finally {
      setIsLoading(false);
    }
  };

  const genderOptions = [
    { value: 'female' as const, label: 'Girl', icon: 'female' },
    { value: 'male' as const, label: 'Boy', icon: 'male' },
    { value: 'other' as const, label: 'Surprise', icon: 'question_mark' },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#faf9fc] font-['Manrope',sans-serif] dark:bg-[#0d0e10]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#e8f5ff] opacity-90 blur-[120px] dark:bg-blue-900/20" />
        <div className="absolute -left-24 bottom-24 h-[18rem] w-[18rem] rounded-full bg-[#ffe9ef] opacity-80 blur-[120px] dark:bg-rose-900/20" />
        <div className="absolute -right-20 top-1/3 h-[18rem] w-[18rem] rounded-full bg-[#eefaff] opacity-90 blur-[120px] dark:bg-cyan-900/20" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-3 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/70 bg-white/90 p-2.5 shadow-[0_18px_40px_rgba(69,98,125,0.12)] backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/85">
              <img
                src="/logo.svg"
                alt="BabyLog logo"
                className="h-full w-full object-contain logo-theme-fix"
              />
            </div>
            <div className="space-y-0.5">
              <p className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl font-black tracking-tight text-[#2f3337] dark:text-white">
                BabyLog
              </p>
              <p className="hidden text-[11px] font-black uppercase tracking-[0.22em] text-[#afb2b8] sm:block">
                Editorial serenity
              </p>
            </div>
          </div>

          <span className="hidden text-base font-semibold text-[#5e5f61] dark:text-zinc-400 sm:block">
            Support
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center py-2 sm:py-4">
          <form onSubmit={handleSubmit} className="w-full max-w-[40rem]">
            <div className="rounded-[2.2rem] border border-white/75 bg-white/88 p-5 shadow-[0_28px_80px_rgba(47,51,55,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-[#17181b]/92 sm:rounded-[2.8rem] sm:p-8">
              <div className="space-y-3 text-center">
                <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(2.45rem,7vw,4.5rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#2f3337] dark:text-white">
                  Add Your Baby
                </h1>
                <p className="mx-auto max-w-[32rem] text-base font-semibold leading-relaxed text-[#5d6167] dark:text-zinc-400 sm:text-[1.1rem]">
                  Every journey begins with a name. Start capturing the moments that matter most in your baby&apos;s story.
                </p>
              </div>

              {error && (
                <div className="mt-5 rounded-[1.45rem] border border-[#ffdce5] bg-[#fff3f6] px-4 py-3 text-sm font-bold text-[#c35f78] dark:border-rose-900/30 dark:bg-rose-900/15 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:items-start">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[5px] border-[#dfe4f0] bg-[#dff3ff] shadow-inner dark:border-zinc-700 dark:bg-zinc-900 sm:h-40 sm:w-40">
                      {formData.photoPreview ? (
                        <img
                          src={formData.photoPreview}
                          alt="Baby photo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-[#5b6973] dark:text-zinc-400">
                          <span className="material-symbols-outlined text-[2.2rem] sm:text-[2.6rem]">
                            add_a_photo
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (supportsNativeCamera) {
                          void handleNativeCapture();
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      disabled={isCapturing || isLoading}
                      className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-[#5e5f61] text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {formData.photoPreview ? 'edit' : 'add'}
                      </span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>

                  <p className="mt-4 font-['Plus_Jakarta_Sans',sans-serif] text-[11px] font-black uppercase tracking-[0.2em] text-[#45627d] dark:text-blue-300">
                    Tap to add photo
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {supportsNativeCamera && (
                      <button
                        type="button"
                        onClick={() => void handleNativeCapture()}
                        disabled={isCapturing || isLoading}
                        className="rounded-full border border-[#dde2ea] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#45627d] shadow-sm transition-all hover:bg-[#f8fbff] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-300"
                      >
                        {isCapturing ? 'Opening Camera...' : 'Use Camera'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCapturing || isLoading}
                      className="rounded-full border border-[#dde2ea] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5e5f61] shadow-sm transition-all hover:bg-[#f3f3f7] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      Choose Image
                    </button>
                    {formData.photoPreview && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, photo: undefined, photoPreview: undefined }))}
                        disabled={isLoading}
                        className="rounded-full border border-[#ffe1e9] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#d48c96] shadow-sm transition-all hover:bg-[#fff5f7] disabled:opacity-50 dark:border-rose-900/30 dark:bg-zinc-900 dark:text-rose-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                        Baby&apos;s Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter name"
                        className="w-full rounded-[1.35rem] border border-transparent bg-[#f3f4f8] px-5 py-4 text-lg font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#9da2ab] focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="dateOfBirth" className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                        Date of Birth *
                      </label>
                      <div className="relative">
                        <input
                          id="dateOfBirth"
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full rounded-[1.35rem] border border-transparent bg-[#f3f4f8] px-5 py-4 text-lg font-semibold text-[#2f3337] outline-none transition-all focus:border-[#45627d] dark:bg-zinc-900 dark:text-white dark:focus:border-blue-500"
                        />
                        <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5e5f61] dark:text-zinc-400">
                          calendar_month
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[#5d6167] dark:text-zinc-300">
                      Gender (Optional)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {genderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleGenderSelect(option.value)}
                          className={`rounded-[1.2rem] border px-3 py-4 text-center transition-all ${
                            formData.gender === option.value
                              ? 'border-[#45627d] bg-[#dff1ff] text-[#345575] shadow-sm dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300'
                              : 'border-gray-200 bg-white text-[#5d6167] hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                          }`}
                        >
                          <span className="material-symbols-outlined block text-[1.45rem]">
                            {option.icon}
                          </span>
                          <span className="mt-2 block text-sm font-semibold">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || isCapturing}
                    className="group mt-2 flex w-full items-center justify-center gap-3 rounded-full bg-[#5e5f61] px-6 py-4 text-white shadow-[0_24px_44px_rgba(94,95,97,0.28)] transition-all hover:bg-[#4a4b4d] hover:shadow-[0_28px_54px_rgba(94,95,97,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black tracking-tight">
                          Creating Profile...
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-black tracking-tight">
                          Create Profile
                        </span>
                        <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-sm font-semibold italic text-[#a0a4ae] dark:text-zinc-500">
                    * Required fields for growth tracking
                  </p>
                </div>
              </div>
            </div>
          </form>
        </main>

        <footer className="pt-5 text-center">
          <div className="hidden items-center justify-between gap-6 border-t border-white/70 px-2 pt-5 text-[#5e5f61] dark:border-zinc-800 dark:text-zinc-400 lg:flex">
            <div className="flex items-center gap-2 text-xl font-semibold">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white">
                BabyLog
              </span>
              <span>Editorial Serenity</span>
            </div>
            <div className="flex items-center gap-10 text-[1.05rem] font-semibold">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Support</span>
              <span>Our Mission</span>
            </div>
            <span className="text-[1.05rem] font-semibold">
              © 2024 BabyLog Editorial. All rights reserved.
            </span>
          </div>

          <p className="mx-auto max-w-md px-4 text-lg font-medium italic leading-relaxed text-[#9aa3aa] dark:text-zinc-500 lg:hidden">
            &quot;Every baby is a new beginning, a star that&apos;s born in the universe.&quot;
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Material3AddBaby;
