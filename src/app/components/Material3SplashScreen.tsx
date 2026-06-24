import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { getClientAppName, getClientLogoSrc } from '../../lib/app-branding-client';

interface SplashScreenProps {
  onSplashComplete?: () => void;
  duration?: number;
  logoSrc?: string;
}

export const Material3SplashScreen: React.FC<SplashScreenProps> = ({
  onSplashComplete,
  duration = 2200,
  logoSrc = getClientLogoSrc(),
}) => {
  const appName = getClientAppName();
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
      className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-[#e8f1f4] px-6"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 82% 8%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.16) 29%, rgba(255,255,255,0) 56%)',
            'radial-gradient(circle at 50% 54%, rgba(171,199,212,0.42) 0%, rgba(171,199,212,0.14) 24%, rgba(171,199,212,0) 52%)',
            'linear-gradient(180deg, #eef6fa 0%, #e7f1f5 48%, #dbe7e5 100%)',
          ].join(','),
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [0.94, 1.05, 0.94], opacity: [0.42, 0.72, 0.42] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-[39%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#cfe1e9]/75 blur-[88px]"
        />
        <motion.div
          animate={{ scale: [0.98, 1.03, 0.98], opacity: [0.16, 0.24, 0.16] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-18%] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#c7d9df]/50 blur-[120px]"
        />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-sm flex-col items-center pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-[max(4.5rem,calc(env(safe-area-inset-top)+2.75rem))] text-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full flex-1 flex-col items-center"
        >
          <motion.div
            animate={{ y: [0, -5, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mb-10 flex h-[13.75rem] w-[13.75rem] items-center justify-center rounded-full border border-white/60 bg-white/42 shadow-[0_30px_90px_rgba(121,149,160,0.22)] backdrop-blur-[8px] sm:h-[15rem] sm:w-[15rem]"
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0) 62%)',
              }}
            />

            <motion.img
              src={logoSrc}
              alt={`${appName} logo`}
              className="relative h-[5.5rem] w-[5.5rem] object-contain sm:h-[6.1rem] sm:w-[6.1rem]"
              animate={{ scale: [1, 1.018, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          <div className="space-y-3">
            <h1 className="font-headline text-[3.95rem] font-black tracking-[-0.075em] text-[#2a3034] sm:text-[4.35rem]">
              {appName}
            </h1>
            <p className="font-body text-[1.05rem] font-semibold tracking-[-0.02em] text-[#647c97] sm:text-[1.18rem]">
              Nurturing with intention.
            </p>
          </div>

          <div className="mt-[4.75rem] w-[58%] max-w-[13rem]">
            <div className="relative h-[0.34rem] overflow-hidden rounded-full bg-[#8ea3ac]/18">
              <motion.div
                animate={{
                  x: ['-8%', '72%', '-8%'],
                  width: ['34%', '22%', '34%'],
                  opacity: [0.72, 0.92, 0.72],
                }}
                transition={{ duration: 1.65, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-y-0 left-0 rounded-full bg-[#8ea3ac]/70"
              />
            </div>
          </div>
        </motion.div>

        <div className="flex w-full items-end justify-between text-[#7d8d92]/70">
          <Shield className="mb-1 h-5 w-5 shrink-0" strokeWidth={1.85} />
          <p className="flex-1 px-4 font-body text-[0.68rem] font-medium uppercase tracking-[0.42em] sm:text-[0.74rem]">
            Premium Nursery Intelligence
          </p>
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </motion.div>
  );
};

export default Material3SplashScreen;
