import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getClientAppName } from '../../lib/app-branding-client';

interface SplashScreenProps {
  onSplashComplete?: () => void;
  duration?: number;
  logoSrc?: string;
}

const SPLASH_DURATION = 3400;
const SPLASH_LOGO_SRC = '/splash-logo.png';

const palette = {
  bg: '#f8f7fb',
  bgSoft: '#eef0f5',
  accent: '#45697d',
  accentSoft: '#dbeef6',
  title: '#242932',
  tagline: '#686d76',
  footer: '#8a909a',
  line: '#45697d',
};

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const Material3SplashScreen: React.FC<SplashScreenProps> = ({
  onSplashComplete,
  duration = SPLASH_DURATION,
  logoSrc = SPLASH_LOGO_SRC,
}) => {
  const appName = getClientAppName();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), duration - 700);
    const completeTimer = window.setTimeout(() => onSplashComplete?.(), duration);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [duration, onSplashComplete]);

  const handleSkipSplash = () => {
    setIsExiting(true);
    window.setTimeout(() => onSplashComplete?.(), 260);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: isExiting ? 0.65 : 0.4, ease: easeOut }}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      onClick={handleSkipSplash}
      role="presentation"
      style={{
        backgroundColor: palette.bg,
        backgroundImage:
          'radial-gradient(circle at 50% 38%, rgba(223, 248, 255, 0.55) 0%, rgba(248, 247, 251, 0) 58%), linear-gradient(180deg, #f8f7fb 0%, #eef0f5 100%)',
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: `${palette.accentSoft}88` }}
        animate={
          isExiting
            ? { opacity: 0, scale: 1.08 }
            : { opacity: [0.35, 0.55, 0.35], scale: [0.92, 1.04, 0.92] }
        }
        transition={
          isExiting
            ? { duration: 0.6 }
            : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -12 : 0 }}
          transition={{ duration: 0.75, ease: easeOut }}
        >
          <motion.div
            className="relative mb-8 flex h-44 w-44 items-center justify-center sm:h-48 sm:w-48"
            initial={{ opacity: 0, scale: 0.82, rotate: -4 }}
            animate={{
              opacity: isExiting ? 0 : 1,
              scale: isExiting ? 0.96 : 1,
              rotate: 0,
            }}
            transition={{ duration: 0.9, delay: 0.08, ease: easeOut }}
          >
            <motion.div
              className="absolute inset-3 rounded-full border border-white/70 bg-white/55 shadow-[0_24px_60px_rgba(69,105,125,0.12)]"
              animate={isExiting ? { scale: 1.04 } : { scale: [1, 1.03, 1] }}
              transition={
                isExiting
                  ? { duration: 0.55 }
                  : { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }
              }
            />
            <motion.img
              src={logoSrc}
              alt={`${appName} logo`}
              className="relative z-10 h-32 w-32 object-contain sm:h-36 sm:w-36"
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{
                opacity: isExiting ? 0 : 1,
                filter: isExiting ? 'blur(6px)' : 'blur(0px)',
              }}
              transition={{ duration: 0.85, delay: 0.22, ease: easeOut }}
            />
          </motion.div>

          <motion.h1
            className="font-headline text-[2.75rem] font-black tracking-[-0.05em] sm:text-[3.25rem]"
            style={{ color: palette.accent }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -6 : 0 }}
            transition={{ duration: 0.65, delay: 0.42, ease: easeOut }}
          >
            {appName}
          </motion.h1>

          <motion.p
            className="mt-3 max-w-xs text-[0.72rem] font-bold uppercase tracking-[0.34em] sm:text-xs"
            style={{ color: palette.tagline }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isExiting ? 0 : 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.58, ease: easeOut }}
          >
            Nurturing with intention
          </motion.p>
        </motion.div>
      </div>

      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 px-8 pb-[max(2rem,env(safe-area-inset-bottom))]"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? 10 : 0 }}
        transition={{ duration: 0.55, delay: 0.72, ease: easeOut }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-px max-w-[12rem] overflow-hidden rounded-full bg-[#dbeef6]">
          <motion.div
            className="h-full origin-left rounded-full"
            style={{ backgroundColor: palette.line }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isExiting ? 1 : [0, 0.45, 0.72, 1] }}
            transition={
              isExiting
                ? { duration: 0.35 }
                : { duration: 2.1, delay: 0.85, ease: easeOut }
            }
          />
        </div>

        <motion.p
          className="text-center text-[0.68rem] font-bold uppercase tracking-[0.28em] sm:text-[0.72rem]"
          style={{ color: palette.footer }}
          animate={isExiting ? { opacity: 0 } : { opacity: [0.45, 1, 0.45] }}
          transition={
            isExiting
              ? { duration: 0.35 }
              : { duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }
          }
        >
          Preparing your sanctuary
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default Material3SplashScreen;
