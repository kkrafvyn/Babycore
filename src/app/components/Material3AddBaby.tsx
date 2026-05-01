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
        setFormData({
          ...formData,
          photo: file,
          photoPreview: reader.result as string,
        });
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
    setFormData({ ...formData, [name]: value });
  };

  const handleGenderSelect = (gender: 'male' | 'female' | 'other') => {
    setFormData({ ...formData, gender });
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

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] flex flex-col pb-20 font-['Manrope',sans-serif]">
      {/* Top Navigation */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)]">
        <div className="flex items-center px-6 md:px-8 py-5">
          <button className="mr-6 w-12 h-12 flex items-center justify-center bg-[#f3f3f7] dark:bg-zinc-800 hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 rounded-[1rem] transition-colors shadow-inner">
            <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-400">arrow_back</span>
          </button>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-2xl text-[#2f3337] dark:text-white tracking-tight">Add Baby Profile</h1>
        </div>
      </div>

      <main className="flex-1 pt-12 px-6 max-w-3xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Error Message */}
          {error && (
            <div className="bg-[#fff0f2] dark:bg-rose-900/20 text-[#d48c96] dark:text-rose-400 p-5 rounded-2xl flex gap-4 shadow-sm border border-[#fff0f2] dark:border-rose-900/30">
              <span className="material-symbols-outlined flex-shrink-0">error</span>
              <p className="text-sm font-bold font-['Manrope',sans-serif]">{error}</p>
            </div>
          )}

          {/* Photo Upload Section */}
          <section className="space-y-4">
            <label htmlFor="photo" className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 block px-2">
              Portrait (Optional)
            </label>
            <div className="relative w-48 h-48 mx-auto">
              <div className="w-full h-full bg-[#f3f3f7] dark:bg-[#1a1c1e] border-2 border-dashed border-[#e0e2e8] dark:border-zinc-700 rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-xl rounded-bl-xl overflow-hidden flex items-center justify-center relative shadow-inner group hover:border-[#45627d] dark:hover:border-blue-400 transition-colors">
                {formData.photoPreview ? (
                  <img
                    src={formData.photoPreview}
                    alt="Baby photo preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-center group-hover:-translate-y-1 transition-transform">
                    <span className="material-symbols-outlined text-4xl text-[#a0a4ae] dark:text-zinc-500 block mb-2">
                      photo_camera
                    </span>
                    <p className="text-[10px] text-[#787b80] dark:text-zinc-400 font-black uppercase tracking-widest">Select Image</p>
                  </div>
                )}
              </div>
              <input
                id="photo"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {formData.photoPreview && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, photo: undefined, photoPreview: undefined })
                  }
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-zinc-800 text-[#d48c96] dark:text-rose-400 flex items-center justify-center rounded-full shadow-lg hover:rotate-90 active:scale-95 transition-all border border-gray-100 dark:border-zinc-700"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {supportsNativeCamera && (
                <button
                  type="button"
                  onClick={handleNativeCapture}
                  disabled={isCapturing || isLoading}
                  className="rounded-full border border-[#e0e2e8] bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#45627d] shadow-sm transition-all hover:bg-[#f8fbff] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-300"
                >
                  {isCapturing ? 'Opening Camera...' : 'Take Photo'}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCapturing || isLoading}
                className="rounded-full border border-[#e0e2e8] bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#5e5f61] shadow-sm transition-all hover:bg-[#f3f3f7] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                Choose Image
              </button>
            </div>
          </section>

          {/* Name Input */}
          <section className="space-y-4">
            <label htmlFor="name" className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 block px-2">
              Formal Name *
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Maya June Smith"
              className="w-full px-6 py-5 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#1a1c1e] text-[#2f3337] dark:text-white placeholder:text-[#a0a4ae] dark:placeholder:text-zinc-600 focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 transition-all font-['Manrope',sans-serif] font-bold text-lg shadow-sm outline-none"
            />
          </section>

          {/* Date of Birth */}
          <section className="space-y-4">
            <label htmlFor="dateOfBirth" className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 block px-2">
              Birth Date *
            </label>
            <div className="relative">
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-6 py-5 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#1a1c1e] text-[#2f3337] dark:text-white focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 transition-all font-['Manrope',sans-serif] font-bold text-lg shadow-sm outline-none"
              />
            </div>
          </section>

          {/* Gender Selection */}
          <section className="space-y-4">
             <label className="text-[10px] uppercase tracking-[0.3em] font-black font-['Plus_Jakarta_Sans',sans-serif] text-[#afb2b8] dark:text-zinc-500 block px-2">
              Gender
            </label>
            <div className="bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-zinc-800 p-2 rounded-2xl flex gap-2 shadow-sm">
              {(['male', 'female', 'other'] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => handleGenderSelect(gender)}
                  className={`flex-1 py-4 px-2 rounded-xl transition-all flex flex-col items-center gap-2 font-['Plus_Jakarta_Sans',sans-serif] font-black text-[10px] uppercase tracking-[0.2em] ${
                    formData.gender === gender
                      ? 'bg-[#f3f3f7] dark:bg-zinc-800 text-[#45627d] dark:text-cyan-400 shadow-inner'
                      : 'text-[#787b80] dark:text-zinc-500 hover:text-[#2f3337] dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {gender === 'male' ? 'boy' : gender === 'female' ? 'girl' : 'child_care'}
                  </span>
                  <span>{gender}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <div className="bg-[#eefaff] dark:bg-cyan-900/10 rounded-2xl p-6 flex gap-4 border border-[#eefaff] dark:border-cyan-900/20">
            <div className="w-10 h-10 bg-white dark:bg-cyan-900/30 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-[#506267] dark:text-cyan-400 text-lg material-symbols-outlined">
              lock
            </div>
            <div>
               <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#506267] dark:text-cyan-300 text-sm mb-1 tracking-tight">Privacy Secured</h4>
               <p className="text-[11px] font-bold text-[#506267]/80 dark:text-cyan-300/80 font-['Manrope',sans-serif] leading-relaxed">
                This information helps provide personalized clinical milestones. Your sensitive health data is exclusively stored securely.
              </p>
            </div>
          </div>

          {/* spacer */}
          <div className="h-4"></div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#f3f3f7] dark:bg-zinc-800 border-2 border-transparent dark:border-zinc-700 text-[#2f3337] dark:text-white py-6 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-[#e0e2e8] dark:hover:bg-zinc-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Securing...
              </>
            ) : (
              <>
                 Complete Profile
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                   <span className="material-symbols-outlined text-[#45627d] dark:text-blue-400 text-sm">arrow_forward</span>
                </div>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default Material3AddBaby;
