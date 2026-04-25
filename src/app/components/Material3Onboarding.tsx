/**
 * Material Design 3 Onboarding Flow
 * Multi-step onboarding with country selection, units, and preferences
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';

type OnboardingStep = 'welcome' | 'country' | 'units' | 'notifications' | 'complete';

interface Country {
  code: string;
  name: string;
  region: string;
}

const countries: Country[] = [
  { code: 'US', name: 'United States', region: 'North America' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  { code: 'CA', name: 'Canada', region: 'North America' },
  { code: 'AU', name: 'Australia', region: 'Oceania' },
  { code: 'DE', name: 'Germany', region: 'Europe' },
  { code: 'FR', name: 'France', region: 'Europe' },
  { code: 'SG', name: 'Singapore', region: 'Asia' },
  { code: 'JP', name: 'Japan', region: 'Asia' },
];

interface OnboardingData {
  country: string;
  units: 'metric' | 'imperial';
  notificationsEnabled: boolean;
}

interface Material3OnboardingProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

export const Material3Onboarding: React.FC<Material3OnboardingProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [formData, setFormData] = useState<OnboardingData>({
    country: 'US',
    units: 'metric',
    notificationsEnabled: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const progress = {
    welcome: 0,
    country: 25,
    units: 50,
    notifications: 75,
    complete: 100,
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    const steps: OnboardingStep[] = ['welcome', 'country', 'units', 'notifications', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    const steps: OnboardingStep[] = ['welcome', 'country', 'units', 'notifications', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] flex flex-col font-['Manrope',sans-serif]">
      {/* Top Navigation */}
      <div className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 shadow-[0_8px_32px_rgba(47,51,55,0.02)] h-20 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-[0.75rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center border border-white dark:border-zinc-700 shadow-inner">
                <span className="material-symbols-outlined text-[#45627d] dark:text-blue-300 text-xl">auto_awesome</span>
             </div>
             <span className="text-xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                Serenity
             </span>
          </div>
          <div className="flex items-center gap-4">
            {currentStep !== 'welcome' && (
              <div className="flex items-center gap-6">
                <div className="w-48 h-1.5 bg-[#f3f3f7] dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress[currentStep]}%` }}
                    className="bg-[#45627d] dark:bg-blue-400 h-full transition-all duration-700 ease-out"
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8] dark:text-zinc-500">
                  Phase {Math.floor(progress[currentStep]/25) + 1} • {progress[currentStep]}%
                </span>
              </div>
            )}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="py-3 px-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[10px] uppercase tracking-[0.2em] text-[#5e5f61] bg-[#f3f3f7] hover:bg-[#e0e2e8] transition-all dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Skip to Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-32 pb-20 px-6 max-w-6xl mx-auto w-full">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="max-w-3xl mx-auto text-center space-y-12">
              <div className="space-y-4">
                <h1 className="text-6xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter leading-tight">
                  The Sanctuary for <br/><span className="text-[#45627d] dark:text-blue-300">Gentle Parenting.</span>
                </h1>
                <p className="text-xl text-[#787b80] dark:text-zinc-400 font-bold max-w-xl mx-auto leading-relaxed">
                  Every milestone is a masterpiece. Let's personalize your developmental sanctuary.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-8 my-16">
                {[
                  { icon: 'bedtime', title: 'Rhythmic Sleep', desc: 'Monitor seasonal sleep patterns', color: 'bg-[#eefaff] dark:bg-cyan-900/20', text: 'text-[#506267] dark:text-cyan-400' },
                  { icon: 'child_care', title: 'Soulful Feed', desc: 'Record every nutritional bond', color: 'bg-[#fff0f2] dark:bg-rose-900/20', text: 'text-[#d48c96] dark:text-rose-400' },
                  { icon: 'trending_up', title: 'Growth Arc', desc: 'Trace physical developments', color: 'bg-[#f3f3f7] dark:bg-zinc-800', text: 'text-[#45627d] dark:text-blue-300' },
                ].map((feature) => (
                  <div key={feature.icon} className="group bg-white dark:bg-[#1a1c1e] rounded-[2.5rem] p-10 shadow-[0_32px_64px_rgba(47,51,55,0.03)] border border-gray-100 dark:border-zinc-800 hover:-translate-y-2 transition-all duration-500">
                    <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                      <span className={`material-symbols-outlined text-3xl ${feature.text}`}>
                        {feature.icon}
                      </span>
                    </div>
                    <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-lg text-[#2f3337] dark:text-white mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-sm font-bold text-[#a0a4ae] dark:text-zinc-500 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Country Selection Step */}
          {currentStep === 'country' && (
            <div className="max-w-2xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Global Context
                </h2>
                <p className="text-[#787b80] dark:text-zinc-400 font-bold leading-relaxed">
                  Localization allows us to provide clinical health guidance specific to your regional healthcare system.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-[#afb2b8] group-focus-within:text-[#45627d] transition-colors">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-8 py-5 bg-white dark:bg-[#1a1c1e] border border-gray-100 dark:border-zinc-800 rounded-2xl focus:ring-0 focus:border-[#45627d] dark:focus:border-blue-500 text-[#2f3337] dark:text-white placeholder:text-[#afb2b8] dark:placeholder:text-zinc-600 font-bold shadow-sm transition-all outline-none"
                />
              </div>

              {/* Country Grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setFormData({ ...formData, country: country.code })}
                    className={`p-6 rounded-2xl text-left transition-all border group relative overflow-hidden ${
                      formData.country === country.code
                        ? 'bg-white dark:bg-zinc-800 border-[#45627d] dark:border-blue-500 shadow-lg -translate-y-1'
                        : 'bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className={`font-['Plus_Jakarta_Sans',sans-serif] font-black text-lg ${
                          formData.country === country.code ? 'text-[#45627d] dark:text-white' : 'text-[#2f3337] dark:text-zinc-300'
                        }`}>{country.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#afb2b8]">{country.region}</p>
                      </div>
                      {formData.country === country.code && (
                        <div className="w-10 h-10 rounded-full bg-[#f3f3f7] dark:bg-blue-400/20 flex items-center justify-center text-[#45627d] dark:text-blue-300 shadow-inner">
                           <span className="material-symbols-outlined text-xl">check</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Units Selection */}
          {currentStep === 'units' && (
            <div className="max-w-3xl mx-auto text-center space-y-12">
              <div className="space-y-4">
                <h2 className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Measurement Metrology
                </h2>
                <p className="text-[#787b80] dark:text-zinc-400 font-bold max-w-xl mx-auto leading-relaxed">
                  Choose your preferred system for meticulously tracking physiological developments.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6">
                {[
                  { type: 'metric' as const, label: 'Metric System', units: 'kg / cm', icon: 'straighten' },
                  { type: 'imperial' as const, label: 'Imperial System', units: 'lb / in', icon: 'square_foot' },
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setFormData({ ...formData, units: option.type })}
                    className={`group relative overflow-hidden rounded-[3rem] border p-12 transition-all ${
                      formData.units === option.type
                        ? 'bg-white dark:bg-zinc-800 border-[#45627d] dark:border-blue-500 shadow-2xl -translate-y-2'
                        : 'bg-white dark:bg-[#1a1c1e] border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-5xl mb-6 transform transition-transform group-hover:scale-110 duration-500 block">
                      {option.icon}
                    </span>
                    <p className={`font-['Plus_Jakarta_Sans',sans-serif] font-black text-xl mb-2 ${
                      formData.units === option.type ? 'text-[#2f3337] dark:text-white' : 'text-[#787b80] dark:text-zinc-400'
                    }`}>{option.label}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#afb2b8]">{option.units}</p>
                    
                    {formData.units === option.type && (
                      <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#f3f3f7] dark:bg-blue-400/20 flex items-center justify-center text-[#45627d] dark:text-blue-300 shadow-inner">
                        <span className="material-symbols-outlined text-xl">check</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}              {/* Notifications */}
          {currentStep === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Intelligent Alerts
                </h2>
                <p className="text-[#787b80] dark:text-zinc-400 font-bold leading-relaxed">
                  Grant permission for gentle neural reminders ensuring you never miss a vital developmental beat.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[3rem] border border-gray-100 bg-white p-10 shadow-[0_32px_64px_rgba(47,51,55,0.03)] dark:border-zinc-800 dark:bg-[#1a1c1e]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#eefaff]/50 dark:bg-cyan-900/10 blur-[80px] -z-10" />
                <div className="flex items-center justify-between pb-8 border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-[#45627d] dark:text-blue-300 text-3xl">
                        auto_awesome
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-xl text-[#2f3337] dark:text-white tracking-tight">
                        Smart Sanctuary Sync
                      </h3>
                      <p className="text-xs font-bold text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest mt-1">
                        Predictive developmental updates
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, notificationsEnabled: !formData.notificationsEnabled })
                    }
                    className={`relative w-16 h-9 rounded-full transition-all duration-500 shadow-sm ${
                      formData.notificationsEnabled ? 'bg-[#45627d] dark:bg-blue-400' : 'bg-[#e0e2e8] dark:bg-zinc-700'
                    }`}
                  >
                    <motion.div
                      layout
                      className="absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-md"
                      animate={{ x: formData.notificationsEnabled ? 28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                   {[
                     { label: 'Circadian Windows', icon: 'bedtime' },
                     { label: 'Nutritional Ties', icon: 'child_care' },
                     { label: 'Clinical Milestones', icon: 'medical_services' },
                     { label: 'Growth Projections', icon: 'trending_up' }
                   ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4 group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        formData.notificationsEnabled ? 'bg-[#eefaff] dark:bg-cyan-900/30 text-[#45627d] dark:text-cyan-400' : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-300 dark:text-zinc-700'
                      }`}>
                         <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <span className={`text-sm font-bold transition-colors ${
                        formData.notificationsEnabled ? 'text-[#2f3337] dark:text-white' : 'text-[#afb2b8] dark:text-zinc-500'
                      }`}>{item.label}</span>
                    </div>
                   ))}
                </div>
              </div>
            </div>
          )}              {/* Complete */}
          {currentStep === 'complete' && (
            <div className="max-w-2xl mx-auto text-center space-y-12">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, duration: 0.8 }}
                className="mx-auto w-32 h-32 rounded-[2.5rem] bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center border border-white dark:border-zinc-700 shadow-inner"
              >
                <span className="material-symbols-outlined text-6xl text-[#45627d] dark:text-blue-300">celebration</span>
              </motion.div>
              <div className="space-y-4">
                <h2 className="text-5xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
                  Sanctuary Prepared.
                </h2>
                <p className="text-xl text-[#787b80] dark:text-zinc-400 font-bold max-w-md mx-auto leading-relaxed">
                  Your personalized Serenity profile is encrypted and ready for your first entry.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0d0e10]/80 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 px-8 py-6 z-50">
        <div className="max-w-6xl mx-auto flex justify-between gap-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 'welcome'}
            className="flex-1 max-w-[200px] py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[11px] uppercase tracking-[0.2em] text-[#afb2b8] bg-[#f3f3f7] hover:bg-[#e0e2e8] disabled:opacity-30 disabled:cursor-not-allowed transition-all dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700"
          >
            Previous Phase
          </button>
          <button
            onClick={handleNext}
            className="flex-1 max-w-[400px] py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[11px] uppercase tracking-[0.2em] bg-[#5e5f61] text-white shadow-xl shadow-[#5e5f61]/20 hover:bg-[#4a4b4d] transition-all flex items-center justify-center gap-3 group"
          >
            <span>{currentStep === 'complete' ? 'Enter Sanctuary' : 'Next Phase'}</span>
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Material3Onboarding;
