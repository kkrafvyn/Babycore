import React from 'react';
import { ArrowRight, HeartHandshake, MoonStar, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { i18nT } from '../../lib/i18n';
import { getClientAppName, getClientLogoSrc } from '../../lib/app-branding-client';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogIn?: () => void;
  onViewPolicies?: () => void;
  logoUrl?: string;
  heroImageUrl?: string;
}

export const Material3Welcome: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogIn,
  onViewPolicies,
  logoUrl = getClientLogoSrc(),
  heroImageUrl = getClientLogoSrc(),
}) => {
  const appName = getClientAppName();
  const highlights = [
    { label: i18nT('public.highlightSleep', 'Sleep'), value: i18nT('public.highlightSynced', 'Synced'), icon: MoonStar },
    { label: i18nT('public.highlightFeed', 'Feed'), value: i18nT('public.highlightReady', 'Ready'), icon: HeartHandshake },
    { label: i18nT('public.highlightSecure', 'Secure'), value: i18nT('public.highlightPrivate', 'Private'), icon: ShieldCheck },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-background"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-secondary-fixed/30 blur-[120px]" />
        <div className="absolute -left-24 top-1/3 h-[22rem] w-[22rem] rounded-full bg-[#ffe7ed] opacity-75 blur-[120px] dark:bg-rose-900/20" />
        <div className="absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-tertiary-fixed/35 blur-[120px]" />
      </div>

      <main className="relative h-full">
        <section className="flex h-full flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/70 bg-white/85 p-2.5 shadow-[0_18px_40px_rgba(69,98,125,0.12)] backdrop-blur">
              <img alt={`${appName} logo`} className="h-full w-full object-contain logo-theme-fix" src={logoUrl} />
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-secondary">
                {appName}
              </p>
              <p className="text-sm font-semibold text-text-dim">
                {i18nT('public.tagline', 'Gentle baby care tracking for feeding, sleep, and milestones.')}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 py-4">
            <div className="inline-flex w-fit self-center items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-secondary shadow-[0_10px_30px_rgba(69,98,125,0.08)] backdrop-blur">
              <Sparkles size={13} />
              <span>{i18nT('public.badge', 'Calm Daily Care')}</span>
            </div>

            <div className="space-y-3 text-center">
              <h1 className="mx-auto max-w-[8ch] text-[clamp(2.8rem,16vw,4.5rem)] font-black leading-[0.9] tracking-[-0.07em] text-[#2f3337]">
                {appName}
              </h1>
              <p className="mx-auto max-w-[20rem] text-[0.98rem] font-semibold leading-[1.55] text-text-dim">
                {i18nT(
                  'public.heroBody',
                  'Stay close to every feeding, nap, and milestone with a softer, more nurturing start screen.',
                )}
              </p>
            </div>

            <div className="mx-auto w-full max-w-[18rem]">
              <div className="relative overflow-hidden rounded-[2.3rem] border border-white/75 bg-[linear-gradient(145deg,#f7fbff_0%,#eef7ff_42%,#fff8fa_100%)] p-4 shadow-[0_26px_70px_rgba(47,51,55,0.12)]">
                <div className="absolute left-[-12%] top-[-8%] h-24 w-24 rounded-full bg-secondary-fixed/50 blur-3xl" />
                <div className="absolute bottom-[-12%] right-[-5%] h-24 w-24 rounded-full bg-[#ffd7e3] blur-3xl dark:bg-rose-900/20" />

                <div className="rounded-[2rem] border border-white/80 bg-white/88 p-3 shadow-[0_18px_44px_rgba(47,51,55,0.08)] backdrop-blur">
                  <div className="relative mx-auto aspect-square w-full max-w-[12rem] overflow-hidden rounded-[1.8rem] bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fb_100%)] p-3">
                    <div className="absolute inset-x-[18%] top-[10%] h-[32%] rounded-full bg-secondary-fixed/25 blur-3xl" />
                    <div className="absolute bottom-[10%] left-[14%] h-[24%] w-[72%] rounded-full bg-[#ffe5ec] blur-3xl dark:bg-rose-900/20" />
                    <img
                      alt="Nursing mother holding baby"
                      className="relative z-10 h-full w-full object-contain"
                      src={heroImageUrl}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {highlights.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-[1.45rem] border border-white/70 bg-white/78 px-3 py-3 text-center shadow-[0_14px_34px_rgba(47,51,55,0.08)] backdrop-blur"
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[1rem] bg-secondary/10 text-secondary">
                    <Icon size={16} />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">
                    {label}
                  </p>
                  <p className="mt-1 text-[0.98rem] font-black tracking-tight text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onGetStarted}
              className="group flex w-full items-center justify-between rounded-full bg-primary px-6 py-4 text-left text-white shadow-[0_24px_44px_rgba(94,95,97,0.28)] transition-all hover:bg-primary-hover hover:shadow-[0_28px_54px_rgba(94,95,97,0.32)] active:scale-[0.99]"
            >
              <span className="text-sm font-black uppercase tracking-[0.2em]">
                {i18nT('public.beginJourney', 'Begin the Journey')}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/14 transition-transform group-hover:translate-x-1">
                <ArrowRight size={18} />
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold text-text-dim">
              <span>{i18nT('public.alreadyTracking', 'Already tracking?')}</span>
              <button onClick={onLogIn} className="text-secondary transition-colors hover:text-foreground">
                {i18nT('public.signIn', 'Sign In')}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold text-text-dim">
              <span>{i18nT('public.beforeYouStart', 'Before you start:')}</span>
              <button
                onClick={onViewPolicies}
                className="text-primary transition-colors hover:text-foreground"
              >
                {i18nT('public.privacyTermsPolicies', 'Privacy, Terms & Policies')}
              </button>
            </div>
          </div>
        </section>

        <section className="hidden h-full lg:block">
          <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-[minmax(0,29rem)_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-12 gap-y-5 px-8 py-6 xl:grid-cols-[minmax(0,31rem)_minmax(0,1fr)] xl:gap-x-14 xl:px-10">
            <section className="flex flex-col gap-5 justify-end">
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/70 bg-white/85 p-3 shadow-[0_18px_40px_rgba(69,98,125,0.12)] backdrop-blur">
                  <img alt={`${appName} logo`} className="h-full w-full object-contain logo-theme-fix" src={logoUrl} />
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-secondary">
                    {appName}
                  </p>
                  <p className="text-[0.95rem] font-semibold text-text-dim">
                    {i18nT('public.tagline', 'Gentle baby care tracking for feeding, sleep, and milestones.')}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-secondary shadow-[0_10px_30px_rgba(69,98,125,0.08)] backdrop-blur">
                  <Sparkles size={14} />
                  <span>{i18nT('public.badge', 'Calm Daily Care')}</span>
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-[9ch] text-[5.4rem] font-black tracking-[-0.06em] text-[#2f3337] xl:text-[5.8rem]">
                    {appName}
                  </h1>
                  <p className="max-w-[25rem] text-[1.02rem] leading-[1.55] text-text-dim xl:text-[1.12rem]">
                    {i18nT(
                      'public.heroBody',
                      'Stay close to every feeding, nap, and milestone with a softer, more nurturing start screen.',
                    )}
                  </p>
                </div>
              </motion.div>
            </section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center py-1 row-span-2 row-start-1"
            >
              <div className="relative w-full max-w-[27.5rem] xl:max-w-[29.5rem]">
                <div className="absolute inset-[4.5%] rounded-[3rem] border border-white/70 bg-white/55 shadow-[0_34px_72px_rgba(47,51,55,0.05)] backdrop-blur-sm [transform:rotate(-6deg)]" />
                <div className="absolute inset-[6.2%] rounded-[3rem] border border-white/75 bg-white/70 shadow-[0_22px_48px_rgba(47,51,55,0.07)] backdrop-blur [transform:rotate(4.5deg)]" />

                <div className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-[linear-gradient(145deg,#f7fbff_0%,#eef7ff_42%,#fff8fa_100%)] p-5 shadow-[0_34px_90px_rgba(47,51,55,0.12)]">
                  <div className="absolute left-[-10%] top-[-8%] h-28 w-28 rounded-full bg-secondary-fixed/50 blur-3xl" />
                  <div className="absolute bottom-[-10%] right-[-4%] h-32 w-32 rounded-full bg-[#ffd7e3] blur-3xl dark:bg-rose-900/20" />

                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-secondary shadow-lg">
                        <HeartHandshake size={14} />
                        <span>{i18nT('public.nursingMoments', 'Nursing Moments')}</span>
                      </div>

                      <div className="rounded-full border border-secondary/10 bg-white/80 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-text-dim">
                        {appName}
                      </div>
                    </div>

                    <div className="rounded-[2.8rem] border border-white/80 bg-white/88 p-4 shadow-[0_18px_44px_rgba(47,51,55,0.08)] backdrop-blur">
                      <div className="relative mx-auto aspect-square w-full max-w-[16.5rem] overflow-hidden rounded-[2.2rem] bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fb_100%)] p-4 xl:max-w-[18rem]">
                        <div className="absolute inset-x-[16%] top-[10%] h-[35%] rounded-full bg-secondary-fixed/25 blur-3xl" />
                        <div className="absolute bottom-[8%] left-[12%] h-[26%] w-[76%] rounded-full bg-[#ffe5ec] blur-3xl dark:bg-rose-900/20" />
                        <img
                          alt="Nursing mother holding baby"
                          className="relative z-10 h-full w-full object-contain"
                          src={heroImageUrl}
                        />
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_16px_36px_rgba(47,51,55,0.08)] backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-secondary">
                        {i18nT('public.nurtureFirst', 'Nurture Comes First')}
                      </p>
                      <p className="mt-2 text-[0.95rem] font-semibold leading-relaxed text-text-dim">
                        {i18nT(
                          'public.nurtureFirstBody',
                          'A more personal welcome built around the nursing mother artwork instead of a generic device preview.',
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <section className="flex flex-col gap-4 justify-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-3 gap-2.5"
              >
                {highlights.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-[1.6rem] border border-white/70 bg-white/75 px-3 py-3 shadow-[0_16px_36px_rgba(47,51,55,0.08)] backdrop-blur"
                  >
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[1rem] bg-secondary/10 text-secondary">
                      <Icon size={17} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">
                      {label}
                    </p>
                    <p className="mt-1 text-[1.05rem] font-black tracking-tight text-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3"
              >
                <button
                  onClick={onGetStarted}
                  className="group flex w-full max-w-[22rem] items-center justify-between rounded-full bg-primary px-5 py-4 text-left text-white shadow-[0_24px_44px_rgba(94,95,97,0.28)] transition-all hover:bg-primary-hover hover:shadow-[0_28px_54px_rgba(94,95,97,0.32)] active:scale-[0.99]"
                >
                  <span className="text-[0.95rem] font-black uppercase tracking-[0.22em]">
                    Begin the Journey
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/14 transition-transform group-hover:translate-x-1">
                    <ArrowRight size={20} />
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem] font-semibold text-text-dim">
                  <span>Already tracking?</span>
                  <button onClick={onLogIn} className="text-secondary transition-colors hover:text-foreground">
                    Sign In
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem] font-semibold text-text-dim">
                  <span>Before you start:</span>
                  <button
                    onClick={onViewPolicies}
                    className="text-primary transition-colors hover:text-foreground"
                  >
                    Privacy, Terms & Policies
                  </button>
                </div>
              </motion.div>
            </section>
          </div>
        </section>
      </main>
    </motion.div>
  );
};

export default Material3Welcome;
