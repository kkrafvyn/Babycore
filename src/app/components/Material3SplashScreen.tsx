import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { getClientAppName, getClientLogoSrc } from '../../lib/app-branding-client';

interface SplashScreenProps {
  onSplashComplete?: () => void;
  duration?: number;
  logoSrc?: string;
}

const SPLASH_DURATION = 3800;
const LOGO_SIZE = 220;
const RING_RADIUS = 108;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const easeSmooth: [number, number, number, number] = [0.45, 0, 0.55, 1];
const easeBloom: [number, number, number, number] = [0.22, 1, 0.36, 1];

const palette = {
  bg: '#e8f1f4',
  glow: '#b8d4e4',
  glowSoft: '#cfe1e9',
  mist: '#abc7d4',
  ring: '#8ea3ac',
  leaf: '#7d9a8f',
  leafLight: '#a8bdb2',
  title: '#2a3034',
  tagline: '#647c97',
  warmRadiance: '#c7d9c0',
};

const LeafIcon: React.FC<{ className?: string; flip?: boolean }> = ({ className, flip }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
    aria-hidden
  >
    <path
      d="M12 3C7 8 4 12 4 16c0 3.3 2.7 5 5 5 1.8 0 3.4-.8 4.5-2.1.3-.4.7-.4 1 0 1.1 1.3 2.7 2.1 4.5 2.1 3.3 0 5-2.2 5-5.5C24 11 17 5 12 3z"
      fill="currentColor"
    />
  </svg>
);

const seedParticles = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const distance = 52 + (index % 5) * 14;
    return {
      id: index,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: 0.08 + (index % 7) * 0.04,
      size: 10 + (index % 4) * 3,
      rotation: (angle * 180) / Math.PI + 18,
    };
  });

const dissolveParticles = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.4;
    const distance = 24 + (index % 6) * 18;
    return {
      id: index,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 12,
      delay: index * 0.025,
      size: 8 + (index % 3) * 4,
      rotation: (angle * 180) / Math.PI,
    };
  });

export const Material3SplashScreen: React.FC<SplashScreenProps> = ({
  onSplashComplete,
  duration = SPLASH_DURATION,
  logoSrc = getClientLogoSrc(),
}) => {
  const appName = getClientAppName();
  const [isExiting, setIsExiting] = useState(false);
  const orbitLeaves = useMemo(() => seedParticles(14), []);
  const burstLeaves = useMemo(() => dissolveParticles(18), []);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), duration - 900);
    const completeTimer = window.setTimeout(() => onSplashComplete?.(), duration);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [duration, onSplashComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: isExiting ? 0.85 : 0.35, ease: easeSmooth }}
      className="relative flex h-[100dvh] items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: palette.bg }}
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

      {/* Phase 0: center seed glow */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isExiting
            ? { scale: 1.35, opacity: 0 }
            : { scale: [0, 1.15, 1], opacity: [0, 0.85, 0.55] }
        }
        transition={
          isExiting
            ? { duration: 0.9, ease: easeSmooth }
            : { duration: 0.8, ease: easeBloom }
        }
        className="pointer-events-none absolute left-1/2 top-[38%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${palette.glow} 0%, ${palette.glowSoft} 45%, transparent 72%)`,
          boxShadow: `0 0 48px 20px ${palette.glowSoft}`,
        }}
      />

      {/* Phase 0: orbiting leaf particles */}
      {orbitLeaves.map((leaf) => (
        <motion.div
          key={`orbit-${leaf.id}`}
          initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: leaf.rotation - 40 }}
          animate={
            isExiting
              ? { scale: 0, opacity: 0 }
              : {
                  scale: [0, 1, 0.92],
                  opacity: [0, 0.7, 0.45],
                  x: leaf.x,
                  y: leaf.y,
                  rotate: leaf.rotation,
                }
          }
          transition={{
            duration: 0.75,
            delay: leaf.delay,
            ease: easeBloom,
          }}
          className="pointer-events-none absolute left-1/2 top-[38%] text-[#8ea3ac]"
          style={{
            width: leaf.size,
            height: leaf.size,
            marginLeft: -leaf.size / 2,
            marginTop: -leaf.size / 2,
          }}
        >
          <LeafIcon className="h-full w-full" />
        </motion.div>
      ))}

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))] text-center">
        <motion.div
          animate={
            isExiting
              ? { scale: 1.1, opacity: 0, y: -8 }
              : { scale: [1, 1, 1.03, 1], y: 0 }
          }
          transition={
            isExiting
              ? { duration: 0.9, ease: easeSmooth }
              : {
                  scale: {
                    duration: 2.4,
                    repeat: Infinity,
                    ease: easeSmooth,
                    delay: 2.3,
                  },
                  y: { duration: 0.6 },
                }
          }
          className="relative mb-9 flex items-center justify-center"
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
        >
          {/* Phase 1.5: radiance behind logo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={
              isExiting
                ? { scale: 1.4, opacity: 0 }
                : { scale: [0.6, 1.15, 1], opacity: [0, 0.5, 0.32] }
            }
            transition={{ duration: 0.75, delay: 1.45, ease: easeSmooth }}
            className="pointer-events-none absolute inset-[-1.5rem] rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, ${palette.warmRadiance}99 0%, ${palette.glowSoft}66 42%, transparent 70%)`,
            }}
          />

          {/* Phase 1: circle stroke draw */}
          <svg
            className="pointer-events-none absolute inset-0"
            viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}
            aria-hidden
          >
            <motion.circle
              cx={LOGO_SIZE / 2}
              cy={LOGO_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={palette.ring}
              strokeWidth="2.25"
              strokeLinecap="round"
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE, opacity: 0 }}
              animate={{
                strokeDashoffset: isExiting ? 0 : 0,
                opacity: isExiting ? 0 : 0.55,
              }}
              transition={{
                strokeDashoffset: { duration: 0.7, delay: 0.8, ease: easeSmooth },
                opacity: { duration: 0.35, delay: 0.8 },
              }}
              style={{
                strokeDasharray: RING_CIRCUMFERENCE,
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
              }}
            />
          </svg>

          {/* Frosted emblem plate */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: isExiting ? 0 : 1 }}
            transition={{ duration: 0.65, delay: 0.95, ease: easeBloom }}
            className="relative flex h-full w-full items-center justify-center rounded-full border border-white/55 bg-white/40 shadow-[0_28px_80px_rgba(121,149,160,0.2)] backdrop-blur-[6px]"
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.1) 42%, rgba(255,255,255,0) 62%)',
              }}
            />

            {/* Phase 1: logo sketch reveal */}
            <motion.div
              initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0, scale: 0.92 }}
              animate={
                isExiting
                  ? { clipPath: 'circle(0% at 50% 50%)', opacity: 0, scale: 1.05 }
                  : {
                      clipPath: 'circle(75% at 50% 50%)',
                      opacity: 1,
                      scale: 1,
                    }
              }
              transition={{
                clipPath: { duration: 0.85, delay: 0.88, ease: easeSmooth },
                opacity: { duration: 0.7, delay: 0.9, ease: easeSmooth },
                scale: { duration: 0.85, delay: 0.88, ease: easeBloom },
              }}
              className="relative flex h-[5.4rem] w-[5.4rem] items-center justify-center sm:h-[6rem] sm:w-[6rem]"
            >
              <motion.img
                src={logoSrc}
                alt={`${appName} logo`}
                className="h-full w-full object-contain"
                initial={{ filter: 'blur(6px)' }}
                animate={{ filter: isExiting ? 'blur(8px)' : 'blur(0px)' }}
                transition={{ duration: 0.75, delay: 0.95, ease: easeSmooth }}
              />
            </motion.div>
          </motion.div>

          {/* Phase 1.5: heart pulse */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={
              isExiting
                ? { scale: 0, opacity: 0 }
                : { scale: [0, 1.22, 1], opacity: [0, 0.55, 0] }
            }
            transition={{ duration: 0.85, delay: 1.48, ease: easeSmooth }}
            className="pointer-events-none absolute left-[58%] top-[22%] text-[#8ea3ac]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                d="M12 20.5c-.2 0-.4-.1-.6-.2C8.5 18.3 3 13.6 3 9.5 3 6.5 5.5 4 8.5 4c1.7 0 3.3.8 4.3 2.1.3.4.9.4 1.2 0C15 4.8 16.6 4 18.3 4 21.3 4 23.8 6.5 23.8 9.5c0 4.1-5.5 8.8-8.4 10.8-.2.1-.4.2-.6.2z"
                fill="currentColor"
              />
            </svg>
          </motion.div>

          {/* Phase 1.5: side leaves bloom */}
          <motion.div
            initial={{ scale: 0, opacity: 0, x: 12 }}
            animate={
              isExiting
                ? { scale: 0, opacity: 0 }
                : { scale: [0, 1.12, 1], opacity: [0, 0.75, 0.55] }
            }
            transition={{ duration: 0.7, delay: 1.55, ease: easeBloom }}
            className="pointer-events-none absolute bottom-[18%] left-[-6%] text-[#7d9a8f]"
          >
            <LeafIcon className="h-7 w-7" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0, x: -12 }}
            animate={
              isExiting
                ? { scale: 0, opacity: 0 }
                : { scale: [0, 1.12, 1], opacity: [0, 0.75, 0.55] }
            }
            transition={{ duration: 0.7, delay: 1.62, ease: easeBloom }}
            className="pointer-events-none absolute bottom-[16%] right-[-4%] text-[#7d9a8f]"
          >
            <LeafIcon className="h-8 w-8" flip />
          </motion.div>

          {/* Phase 3: dissolve burst */}
          {burstLeaves.map((leaf) => (
            <motion.div
              key={`burst-${leaf.id}`}
              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              animate={
                isExiting
                  ? {
                      scale: [0.4, 1],
                      opacity: [0.6, 0],
                      x: leaf.x,
                      y: leaf.y - 28,
                      rotate: leaf.rotation,
                    }
                  : { scale: 0, opacity: 0 }
              }
              transition={{
                duration: 0.85,
                delay: isExiting ? 0.12 + leaf.delay : 0,
                ease: easeSmooth,
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 text-[#8ea3ac]"
              style={{
                width: leaf.size,
                height: leaf.size,
                marginLeft: -leaf.size / 2,
                marginTop: -leaf.size / 2,
              }}
            >
              <LeafIcon className="h-full w-full" />
            </motion.div>
          ))}
        </motion.div>

        {/* Phase 2.3: title + tagline */}
        <motion.div
          className="space-y-2.5 px-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -6 : 0 }}
          transition={{ duration: 0.65, delay: isExiting ? 0 : 2.25, ease: easeSmooth }}
        >
          <motion.h1
            className="font-headline text-[3.5rem] font-black tracking-[-0.075em] sm:text-[4rem]"
            style={{ color: palette.title }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -4 : 0 }}
            transition={{ duration: 0.6, delay: isExiting ? 0 : 2.32, ease: easeSmooth }}
          >
            {appName}
          </motion.h1>
          <motion.p
            className="font-body text-[1rem] font-semibold tracking-[-0.015em] sm:text-[1.12rem]"
            style={{ color: palette.tagline }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isExiting ? 0 : 1, y: 0 }}
            transition={{ duration: 0.55, delay: isExiting ? 0 : 2.48, ease: easeSmooth }}
          >
            Growing Together, Every Step of the Way
          </motion.p>
        </motion.div>
      </div>

      {/* Ambient mist */}
      <motion.div
        animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: easeSmooth }}
        className="pointer-events-none absolute left-1/2 top-[36%] h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
        style={{ backgroundColor: `${palette.mist}66` }}
      />
    </motion.div>
  );
};

export default Material3SplashScreen;
