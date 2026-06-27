import React, { useMemo, useState } from 'react';
import {
  buildCountryPickerOptions,
  guessUserCountryCode,
  POPULAR_COUNTRY_CODES,
  sortCountriesForDisplay,
  type CountryPickerOption,
} from '../../lib/country-picker';
import { getClientAppName } from '../../lib/app-branding-client';
import { APP_SUPPORT_EMAIL } from '../../lib/app-domain';
import { i18nT } from '../../lib/i18n';

interface OnboardingCountryStepProps {
  selectedCountryCode: string;
  stepNumber: number;
  totalSteps: number;
  onSelectCountry: (countryCode: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onViewPolicies?: () => void;
}

const SUPPORT_EMAIL =
  String(import.meta.env.VITE_SUPPORT_EMAIL || APP_SUPPORT_EMAIL).trim() || APP_SUPPORT_EMAIL;

const CountryFlag: React.FC<{ country: Pick<CountryPickerOption, 'code' | 'flagUrl' | 'name'> }> = ({ country }) => (
  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
    {country.flagUrl ? (
      <img
        src={country.flagUrl}
        alt={`${country.name} flag`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#787b80]">{country.code}</span>
    )}
  </div>
);

export const OnboardingCountryStep: React.FC<OnboardingCountryStepProps> = ({
  selectedCountryCode,
  stepNumber,
  totalSteps,
  onSelectCountry,
  onBack,
  onContinue,
  onViewPolicies,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const appName = getClientAppName();
  const countryOptions = useMemo(() => buildCountryPickerOptions(), []);
  const detectedCountryCode = useMemo(() => guessUserCountryCode(), []);

  const prioritizeCodes = useMemo(() => {
    if (detectedCountryCode && !(POPULAR_COUNTRY_CODES as readonly string[]).includes(detectedCountryCode)) {
      return [detectedCountryCode, ...POPULAR_COUNTRY_CODES];
    }
    return POPULAR_COUNTRY_CODES;
  }, [detectedCountryCode]);

  const visibleCountries = useMemo(
    () => sortCountriesForDisplay(countryOptions, { searchQuery, prioritizeCodes }),
    [countryOptions, prioritizeCodes, searchQuery],
  );

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto bg-[#f7f8fb] font-['Manrope',sans-serif] text-[#2f3337] dark:bg-[#0d0e10] dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#dfeaf7]/70 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute -right-20 top-32 h-80 w-80 rounded-full bg-[#ece8f7]/80 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#e7f1fb]/60 blur-3xl dark:bg-cyan-500/10" />
      </div>

      <header className="relative z-10 px-5 pb-2 pt-5 sm:px-8">
        <div className="mx-auto flex max-w-[30rem] items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
              <span className="material-symbols-outlined text-[1.1rem] text-[#45627d] dark:text-blue-300">
                child_care
              </span>
            </div>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[1.05rem] font-black tracking-tight">
              {appName}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5e5f61] transition-colors hover:text-[#2f3337] dark:text-zinc-400 dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-[1.1rem]">arrow_back</span>
            {i18nT('onboarding.back', 'Back')}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-[30rem] min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(47,51,55,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-[#17181b]/95 sm:rounded-[2.25rem] sm:p-7">
            <p className="text-center text-[11px] font-black uppercase tracking-[0.28em] text-[#8fa0b3] dark:text-zinc-500">
              {i18nT('onboarding.stepCounter', 'Step {current} of {total}')
                .replace('{current}', String(stepNumber))
                .replace('{total}', String(totalSteps))}
            </p>

            <div className="mt-5 text-center">
              <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[clamp(1.85rem,5.5vw,2.35rem)] font-black leading-tight tracking-[-0.04em] text-[#2f3337] dark:text-white">
                {i18nT('onboarding.countryTitle', 'Where are you based?')}
              </h1>
              <p className="mx-auto mt-3 max-w-[18rem] text-sm font-medium leading-relaxed text-[#8b9098] dark:text-zinc-400">
                {i18nT(
                  'onboarding.countrySubtitle',
                  'This helps us tailor feeding guidelines and support schedules to your local time.',
                )}
              </p>
            </div>

            <div className="relative mt-6 shrink-0">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#b4b8bf]">
                <span className="material-symbols-outlined text-[1.15rem]">search</span>
              </div>
              <input
                type="text"
                placeholder={i18nT('onboarding.countrySearch', 'Search your country...')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-full border border-transparent bg-[#f3f4f7] py-3.5 pl-11 pr-4 text-sm font-semibold text-[#2f3337] outline-none transition-all placeholder:text-[#b4b8bf] focus:border-[#d7dee8] focus:bg-white dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-zinc-700"
              />
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[1.35rem] bg-[#f7f8fb] p-2 dark:bg-zinc-900/70">
              <div className="h-full max-h-[16.5rem] overflow-y-auto sm:max-h-[18rem]">
                {visibleCountries.length > 0 ? (
                  <div className="space-y-1">
                    {visibleCountries.map((country) => {
                      const isSelected = country.code === selectedCountryCode;

                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => onSelectCountry(country.code)}
                          className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left transition-all ${
                            isSelected
                              ? 'bg-[#e8f1fb] shadow-sm dark:bg-blue-500/10'
                              : 'hover:bg-white/80 dark:hover:bg-zinc-800/80'
                          }`}
                        >
                          <CountryFlag country={country} />
                          <span
                            className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${
                              isSelected ? 'text-[#2f3337] dark:text-white' : 'text-[#4d535b] dark:text-zinc-200'
                            }`}
                          >
                            {country.name}
                          </span>
                          {isSelected ? (
                            <span className="material-symbols-outlined shrink-0 text-[1.35rem] text-[#4f86c6] dark:text-blue-300">
                              check_circle
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[10rem] items-center justify-center px-4 text-center">
                    <div>
                      <p className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-black text-[#2f3337] dark:text-white">
                        {i18nT('onboarding.countryNoMatchTitle', 'No matches yet')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[#8b9098] dark:text-zinc-400">
                        {i18nT('onboarding.countryNoMatchBody', 'Try a country name or code.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onContinue}
              disabled={!selectedCountryCode}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5e5f61] py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_40px_rgba(94,95,97,0.28)] transition-all hover:bg-[#4a4b4d] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
            >
              <span>{i18nT('onboarding.continue', 'Continue')}</span>
              <span className="material-symbols-outlined text-[1.1rem]">arrow_forward</span>
            </button>

            <p className="mt-4 text-center text-sm text-[#8b9098] dark:text-zinc-500">
              {i18nT('onboarding.countryDontSee', "Don't see your country?")}{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-bold text-[#2f3337] underline decoration-[#d7dee8] underline-offset-4 transition-colors hover:text-[#45627d] dark:text-white dark:decoration-zinc-700 dark:hover:text-blue-300"
              >
                {i18nT('onboarding.countryContactSupport', 'Contact Support')}
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-6 pt-2 sm:px-8">
        <div className="mx-auto max-w-[30rem] text-center">
          <div className="flex items-center justify-center gap-3 text-[#c2c7cf] dark:text-zinc-600">
            <span className="h-px w-10 bg-current" />
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-sm italic text-[#9aa0a8] dark:text-zinc-500">
              {i18nT('onboarding.editorialTagline', 'Crafting serenity for parents worldwide')}
            </p>
            <span className="h-px w-10 bg-current" />
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#b4b8bf] dark:text-zinc-600">
            {i18nT('onboarding.editorialCopyright', '© {year} {appName} EDITORIAL. ALL RIGHTS RESERVED.')
              .replace('{year}', String(new Date().getFullYear()))
              .replace('{appName}', appName.toUpperCase())}
          </p>

          {onViewPolicies ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#b4b8bf] dark:text-zinc-600">
              <button
                type="button"
                onClick={onViewPolicies}
                className="transition-colors hover:text-[#5e5f61] dark:hover:text-zinc-400"
              >
                {i18nT('public.privacyPolicy', 'Privacy Policy')}
              </button>
              <button
                type="button"
                onClick={onViewPolicies}
                className="transition-colors hover:text-[#5e5f61] dark:hover:text-zinc-400"
              >
                {i18nT('public.termsOfService', 'Terms of Service')}
              </button>
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
};

export default OnboardingCountryStep;
