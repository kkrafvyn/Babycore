import React from 'react';
import { ArrowRight, HeartHandshake, MoonStar, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogIn?: () => void;
  onViewPolicies?: () => void;
  logoUrl?: string;
  heroImageUrl?: string;
}

const highlights = [
  { label: 'Sleep', value: 'Synced', icon: MoonStar },
  { label: 'Feed', value: 'Ready', icon: HeartHandshake },
  { label: 'Secure', value: 'Private', icon: ShieldCheck },
];

export const Material3Welcome: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogIn,
  onViewPolicies,
  logoUrl = '/logo.png',
  heroImageUrl = '/logo.png',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-[100dvh] overflow-hidden bg-background"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-secondary-fixed/30 blur-[120px]" />
        <div className="absolute -left-24 top-1/3 h-[22rem] w-[22rem] rounded-full bg-[#ffe7ed] opacity-75 blur-[120px] dark:bg-rose-900/20" />
        <div className="absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-tertiary-fixed/35 blur-[120px]" />
      </div>

      <main className="relative mx-auto grid min-h-[100dvh] w-full max-w-7xl grid-cols-1 gap-8 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:gap-x-16 lg:gap-y-10 lg:px-10">
        <section className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1 lg:justify-center">
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/70 bg-white/85 p-3 shadow-[0_18px_40px_rgba(69,98,125,0.12)] backdrop-blur">
              <img
                alt="BabyLog logo"
                className="h-full w-full object-contain logo-theme-fix"
                src={logoUrl}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-secondary">
                BabyLog
              </p>
              <p className="text-sm font-semibold text-text-dim">
                Gentle baby care tracking for feeding, sleep, and milestones.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-secondary shadow-[0_10px_30px_rgba(69,98,125,0.08)] backdrop-blur">
              <Sparkles size={14} />
              <span>Calm Daily Care</span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-[9ch] text-5xl font-black tracking-[-0.06em] text-[#2f3337] sm:text-6xl lg:text-7xl">
                BabyLog
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-text-dim sm:text-xl">
                Stay close to every feeding, nap, and milestone with a softer,
                more nurturing start screen built around nursing and baby care.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 lg:hidden"
          >
            <button
              onClick={onGetStarted}
              className="group flex w-full items-center justify-between rounded-full bg-primary px-6 py-5 text-left text-white shadow-[0_24px_44px_rgba(94,95,97,0.28)] transition-all hover:bg-primary-hover hover:shadow-[0_28px_54px_rgba(94,95,97,0.32)] active:scale-[0.99]"
            >
              <span className="text-sm font-black uppercase tracking-[0.22em] sm:text-base">
                Begin the Journey
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/14 transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-text-dim">
              <span>Already tracking?</span>
              <button
                onClick={onLogIn}
                className="text-secondary transition-colors hover:text-foreground"
              >
                Sign In
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-text-dim">
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

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center py-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:py-8"
        >
          <div className="relative w-full max-w-[28rem] sm:max-w-[34rem]">
            <div className="absolute inset-[4%] rounded-[3rem] border border-white/70 bg-white/55 shadow-[0_40px_80px_rgba(47,51,55,0.06)] backdrop-blur-sm [transform:rotate(-7deg)]" />
            <div className="absolute inset-[6%] rounded-[3rem] border border-white/75 bg-white/70 shadow-[0_28px_60px_rgba(47,51,55,0.08)] backdrop-blur [transform:rotate(5deg)]" />

            <div className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-[linear-gradient(145deg,#f7fbff_0%,#eef7ff_42%,#fff8fa_100%)] p-5 shadow-[0_40px_100px_rgba(47,51,55,0.14)] sm:p-7">
              <div className="absolute left-[-10%] top-[-8%] h-40 w-40 rounded-full bg-secondary-fixed/50 blur-3xl" />
              <div className="absolute bottom-[-10%] right-[-4%] h-44 w-44 rounded-full bg-[#ffd7e3] blur-3xl dark:bg-rose-900/20" />

              <div className="relative space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-secondary shadow-lg">
                    <HeartHandshake size={14} />
                    <span>Nursing Moments</span>
                  </div>

                  <div className="rounded-full border border-secondary/10 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-text-dim">
                    BabyLog
                  </div>
                </div>

                <div className="rounded-[2.8rem] border border-white/80 bg-white/88 p-5 shadow-[0_22px_50px_rgba(47,51,55,0.08)] backdrop-blur sm:p-7">
                  <div className="relative mx-auto aspect-square w-full max-w-[21rem] overflow-hidden rounded-[2.5rem] bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fb_100%)] p-5">
                    <div className="absolute inset-x-[16%] top-[10%] h-[35%] rounded-full bg-secondary-fixed/25 blur-3xl" />
                    <div className="absolute bottom-[8%] left-[12%] h-[26%] w-[76%] rounded-full bg-[#ffe5ec] blur-3xl dark:bg-rose-900/20" />
                    <img
                      alt="Nursing mother holding baby"
                      className="relative z-10 h-full w-full object-contain"
                      src={heroImageUrl}
                    />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_40px_rgba(47,51,55,0.08)] backdrop-blur">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-secondary">
                    Nurture Comes First
                  </p>
                  <p className="mt-2 text-base font-semibold leading-relaxed text-text-dim">
                    A more personal welcome built around the nursing mother artwork
                    instead of a generic device preview.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2 lg:justify-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-3 gap-3"
          >
            {highlights.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-[1.6rem] border border-white/70 bg-white/75 px-3 py-3 shadow-[0_16px_36px_rgba(47,51,55,0.08)] backdrop-blur sm:rounded-[1.8rem] sm:px-4 sm:py-4"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary sm:mb-3 sm:h-11 sm:w-11">
                  <Icon size={18} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light sm:text-[10px] sm:tracking-[0.24em]">
                  {label}
                </p>
                <p className="mt-1 text-base font-black tracking-tight text-foreground sm:text-lg">
                  {value}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="hidden space-y-4 lg:block"
          >
            <button
              onClick={onGetStarted}
              className="group flex w-full items-center justify-between rounded-full bg-primary px-6 py-5 text-left text-white shadow-[0_24px_44px_rgba(94,95,97,0.28)] transition-all hover:bg-primary-hover hover:shadow-[0_28px_54px_rgba(94,95,97,0.32)] active:scale-[0.99] sm:max-w-[24rem]"
            >
              <span className="text-sm font-black uppercase tracking-[0.22em] sm:text-base">
                Begin the Journey
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/14 transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-text-dim">
              <span>Already tracking?</span>
              <button
                onClick={onLogIn}
                className="text-secondary transition-colors hover:text-foreground"
              >
                Sign In
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-text-dim">
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
      </main>
    </motion.div>
  );
};

export default Material3Welcome;
