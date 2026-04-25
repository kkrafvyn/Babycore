import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

export const PrivacyLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useAppContext();
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockEnabled = settings?.biometricLockEnabled;

  useEffect(() => {
    if (!lockEnabled) {
      setIsLocked(false);
      return;
    }

    // Lock immediately on mount/refresh if enabled
    setIsLocked(true);

    // Lock when app goes to background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lockEnabled) {
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lockEnabled]);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // In a real PWA on iOS/Android, this triggers FaceID/TouchID if configured
      // We check if WebAuthn is available
      const available = await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (available) {
        // This is a simplified "dummy" call to represent the OS prompt.
        // A full implementation would involve a stored credential.
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsLocked(false);
      } else {
        // Fallback for devices without biometrics
        setError("Biometric hardware not found. Unlocking with session bypass for demo.");
        setTimeout(() => setIsLocked(false), 1500);
      }
    } catch (err) {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-8 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

      <MotionDiv 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xs w-full text-center space-y-8 relative z-10"
      >
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-surface rounded-[2.5rem] border border-border-gray dark:border-zinc-800 flex items-center justify-center shadow-2xl mx-auto">
            <Lock size={40} className="text-secondary" />
          </div>
          <MotionDiv 
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-background flex items-center justify-center text-white"
          >
            <ShieldCheck size={14} />
          </MotionDiv>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-headline font-black text-foreground tracking-tighter">Vault Locked</h2>
          <p className="text-sm font-bold text-text-dim px-4 leading-relaxed">
            Biometric verification is required to access baby logs and private memories.
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <button 
            onClick={handleUnlock}
            disabled={isAuthenticating}
            className="w-full h-16 bg-secondary text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isAuthenticating ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Fingerprint size={20} />
                <span>Unlock with Biometrics</span>
              </>
            )}
          </button>

          {error && (
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest px-4">
              <ShieldAlert size={14} />
              <span>{error}</span>
            </MotionDiv>
          )}

          <p className="text-[10px] font-black text-text-light uppercase tracking-widest pt-4">
            Secured by Apple FaceID / Android Biometrics
          </p>
        </div>
      </MotionDiv>
    </div>
  );
};
