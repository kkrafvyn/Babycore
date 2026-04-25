import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  Apple,
  Chrome,
  type LucideIcon,
} from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithSocialProvider,
  type SocialAuthProvider,
} from '../../lib/supabase';

interface AuthScreenProps {
  onSuccess: (newUserCreated?: boolean) => void;
  onGuestMode: () => void;
}

type AuthMode = 'signin' | 'signup';

const MotionDiv = motion.div as any;
const socialProviders: Array<{
  provider: SocialAuthProvider;
  label: string;
  Icon: LucideIcon;
}> = [
  { provider: 'google', label: 'Google', Icon: Chrome },
  { provider: 'apple', label: 'Apple', Icon: Apple },
];

export function AuthScreen({ onSuccess, onGuestMode }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAuthBusy = loading || socialLoadingProvider !== null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onSuccess(false);
      } else {
        await signUpWithEmail(email, password);
        onSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: SocialAuthProvider) => {
    if (isAuthBusy) {
      return;
    }

    setError(null);
    setSocialLoadingProvider(provider);

    try {
      await signInWithSocialProvider(provider);
    } catch (err: any) {
      setError(err?.message || 'Social authentication failed. Please try again.');
    } finally {
      setSocialLoadingProvider(null);
    }
  };

  return (
    <div className="fit-screen bg-background overflow-hidden">
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="fixed inset-0 pointer-events-none"
      >
        <div className="absolute top-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-accent-blue/10 blur-[120px] dark:bg-blue-900/10" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[60%] w-[60%] rounded-full bg-accent-pink/10 blur-[120px] dark:bg-rose-900/10" />
      </MotionDiv>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8">
        <MotionDiv
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-border-gray bg-white p-6 shadow-2xl shadow-primary/5 dark:border-zinc-700/50 dark:bg-zinc-800">
            <img src="/logo.png" alt="BabyLog" className="h-full w-full object-contain" />
          </div>
        </MotionDiv>

        <div className="mb-12 space-y-3 text-center">
          <h1 className="text-4xl font-headline font-black leading-none tracking-tighter text-foreground">
            {mode === 'signin' ? 'Welcome Back' : 'Join BabyLog'}
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-text-light">
            {mode === 'signin' ? 'Identity Verification' : 'Provision Access'}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <MotionDiv
              initial={{ y: 10, opacity: 0, height: 0 }}
              animate={{ y: 0, opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 w-full max-w-sm overflow-hidden"
            >
              <div className="rounded-3xl border border-error/20 bg-error/10 p-5 text-center text-[10px] font-black uppercase tracking-widest text-error">
                {error}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <span className="ml-4 text-[10px] font-black uppercase tracking-widest text-text-light">
              Registry Email
            </span>
            <div className="group relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="parent@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAuthBusy}
                className="h-20 w-full rounded-3xl border border-border-gray bg-surface-gray pl-16 pr-8 font-bold text-foreground outline-none transition-all placeholder:text-text-light/50 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:border-zinc-800 dark:bg-zinc-900"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <span className="ml-4 text-[10px] font-black uppercase tracking-widest text-text-light">
              Access Key
            </span>
            <div className="group relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isAuthBusy}
                className="h-20 w-full rounded-3xl border border-border-gray bg-surface-gray pl-16 pr-14 font-bold text-foreground outline-none transition-all placeholder:text-text-light/50 focus:border-primary focus:ring-4 focus:ring-primary/5 dark:border-zinc-800 dark:bg-zinc-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isAuthBusy}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-text-light transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAuthBusy}
            className="btn-primary mt-6 h-20 w-full shadow-2xl shadow-primary/20 active:scale-95 disabled:opacity-70"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <ShieldCheck className="animate-pulse" />
                <span>Authorizing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Fingerprint size={24} />
                <span>{mode === 'signin' ? 'Verify Identity' : 'Create Account'}</span>
              </div>
            )}
          </button>
        </form>

        <div className="mt-8 w-full max-w-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border-gray dark:bg-zinc-800" />
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-text-light">
              Or Continue With
            </span>
            <div className="h-px flex-1 bg-border-gray dark:bg-zinc-800" />
          </div>

          <div className="space-y-3">
            {socialProviders.map(({ provider, label, Icon }) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleSocialAuth(provider)}
                disabled={isAuthBusy}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border-gray bg-surface-gray px-5 font-bold text-foreground transition-all hover:border-primary/40 hover:bg-white active:scale-[0.99] disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {socialLoadingProvider === provider ? (
                  <>
                    <ShieldCheck size={18} className="animate-pulse" />
                    <span>Connecting {label}...</span>
                  </>
                ) : (
                  <>
                    <Icon size={18} />
                    <span>Continue with {label}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 w-full max-w-sm space-y-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            disabled={isAuthBusy}
            className="block w-full text-sm font-bold text-text-dim transition-colors hover:text-primary"
          >
            {mode === 'signin' ? 'Need to register? ' : 'Already recognized? '}
            <span className="ml-1 font-black uppercase tracking-widest text-primary underline">
              {mode === 'signin' ? 'Create Account' : 'Sign In Portal'}
            </span>
          </button>

          <button
            type="button"
            onClick={onGuestMode}
            disabled={isAuthBusy}
            className="block w-full text-sm font-bold text-text-dim transition-colors hover:text-secondary"
          >
            <span className="font-black uppercase tracking-widest text-secondary underline">
              Continue as Guest
            </span>
          </button>

          <div className="flex flex-col items-center gap-2 pt-6">
            <div className="h-1 w-8 rounded-full bg-border-gray dark:bg-zinc-800" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-light">
              BABYLOG BIOMETRIC ACCESS - V3.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
