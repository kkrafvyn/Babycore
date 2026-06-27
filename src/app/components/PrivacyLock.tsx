import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

const canUsePlatformBiometrics = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (
    !('PublicKeyCredential' in window) ||
    typeof window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false;
  }

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const PrivacyLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useAppContext();
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);

  const lockEnabled = settings?.biometricLockEnabled;

  useEffect(() => {
    let cancelled = false;

    if (!lockEnabled) {
      setIsLocked(false);
      setBiometricsAvailable(null);
      return;
    }

    void (async () => {
      const available = await canUsePlatformBiometrics();
      if (cancelled) {
        return;
      }

      setBiometricsAvailable(available);
      setIsLocked(available);
    })();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lockEnabled) {
        void canUsePlatformBiometrics().then((available) => {
          if (available) {
            setIsLocked(true);
          }
        });
      }
    };

    const handleNativePause = () => {
      if (!lockEnabled) {
        return;
      }

      void canUsePlatformBiometrics().then((available) => {
        if (available) {
          setIsLocked(true);
        }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('babylog_native_pause', handleNativePause);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('babylog_native_pause', handleNativePause);
    };
  }, [lockEnabled]);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const available = await canUsePlatformBiometrics();
      if (!available) {
        setIsLocked(false);
        return;
      }

      setIsLocked(false);
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-background p-8">
      <div className="absolute top-[-10%] right-[-10%] h-96 w-96 rounded-full bg-secondary/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />

      <MotionDiv
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-xs space-y-8 text-center"
      >
        <div className="relative inline-block">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-border-gray bg-surface shadow-2xl dark:border-zinc-800">
            <Lock size={40} className="text-secondary" />
          </div>
          <MotionDiv
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-emerald-500 text-white"
          >
            <ShieldCheck size={14} />
          </MotionDiv>
        </div>

        <div className="space-y-2">
          <h2 className="font-headline text-3xl font-black tracking-tighter text-foreground">Vault Locked</h2>
          <p className="px-4 text-sm font-bold leading-relaxed text-text-dim">
            Biometric verification is required to access baby logs and private memories.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleUnlock}
            disabled={isAuthenticating}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-secondary text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-secondary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isAuthenticating ? (
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" />
            ) : (
              <>
                <Fingerprint size={20} />
                <span>Unlock with Biometrics</span>
              </>
            )}
          </button>

          {biometricsAvailable === false && (
            <button
              type="button"
              onClick={() => setIsLocked(false)}
              className="w-full rounded-2xl border border-border-gray px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim dark:border-zinc-700"
            >
              Continue on this device
            </button>
          )}

          {error && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 px-4 text-[10px] font-black uppercase tracking-widest text-rose-500"
            >
              <ShieldAlert size={14} />
              <span>{error}</span>
            </MotionDiv>
          )}

          <p className="pt-4 text-[10px] font-black uppercase tracking-widest text-text-light">
            Secured by Apple Face ID / Android Biometrics
          </p>
        </div>
      </MotionDiv>
    </div>
  );
};
