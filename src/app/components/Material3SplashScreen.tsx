import React, { useEffect, useState } from 'react';
import { HeartHandshake, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onSplashComplete?: () => void;
  duration?: number;
  logoSrc?: string;
}

export const Material3SplashScreen: React.FC<SplashScreenProps> = ({
  onSplashComplete,
  duration = 2200,
  logoSrc = '/logo.png',
}) => {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsComplete(true);
      onSplashComplete?.();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onSplashComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isComplete ? 0 : 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fffafc_0%,#f6fbff_52%,#eef6ff_100%)] px-5 py-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.14, 1], opacity: [0.22, 0.36, 0.22] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute left-[-6rem] top-[-5rem] h-[18rem] w-[18rem] rounded-full bg-[#ffd9e6] blur-[95px]"
        />
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 7.4, repeat: Infinity, delay: 0.5 }}
          className="absolute bottom-[-7rem] right-[-5rem] h-[20rem] w-[20rem] rounded-full bg-secondary-fixed/40 blur-[100px]"
        />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-sm flex-col items-center justify-between gap-4 py-3 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
        >
          <div className="absolute inset-[8%] rounded-[2.8rem] bg-white/55 blur-2xl" />

          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/78 p-4 shadow-[0_28px_60px_rgba(78,87,99,0.14)] backdrop-blur sm:p-5">
            <div className="absolute inset-x-[15%] top-[2%] h-24 rounded-full bg-secondary-fixed/25 blur-3xl" />
            <div className="absolute bottom-[5%] left-[18%] h-20 w-[64%] rounded-full bg-[#ffe4ec] blur-3xl" />

            <div className="relative flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-secondary shadow-[0_10px_24px_rgba(78,87,99,0.08)]">
                <Sparkles size={14} />
                <span>BabyLog</span>
              </div>

              <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f9fc_100%)] p-3 shadow-[0_18px_40px_rgba(78,87,99,0.1)]">
                <motion.img
                  src={logoSrc}
                  alt="BabyLog nursing mother logo"
                  className="mx-auto aspect-square w-full max-w-[9.5rem] object-contain sm:max-w-[11rem]"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <div className="space-y-2 px-2">
                <h1 className="text-[2.4rem] font-black tracking-[-0.06em] text-[#2f3337] sm:text-4xl">
                  BabyLog
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary sm:text-[11px]">
                  Mobile Welcome Splash
                </p>
                <p className="text-[0.95rem] leading-relaxed text-text-dim sm:text-sm">
                  Opening a calm space for nursing, feeds, sleep, and the little
                  moments you want to remember.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/78 px-4 py-2.5 text-xs font-semibold text-text-dim shadow-[0_14px_30px_rgba(78,87,99,0.08)] backdrop-blur"
        >
          <HeartHandshake size={16} className="text-secondary" />
          <span>Preparing your care dashboard</span>
        </motion.div>

        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              animate={{ opacity: [0.28, 1, 0.28], scale: [0.88, 1, 0.88] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.18 }}
              className="h-2.5 w-2.5 rounded-full bg-secondary"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Material3SplashScreen;
