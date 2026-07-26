import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react';
import { AppleIcon, GoogleIcon } from './SocialAuthIcons';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithSocialProvider,
  type SocialAuthProvider,
} from '../../lib/supabase';
import { getOnboardingCache, clearOnboardingCache } from '../../lib/onboarding-storage';
import { consumeAuthModeHint, markAuthModeHint } from '../../lib/auth-mode-hint';
import { i18nT } from '../../lib/i18n';
import { getClientAppName, getClientLogoSrc } from '../../lib/app-branding-client';

interface AuthScreenProps {
  onSuccess: (newUserCreated?: boolean) => void;
  onViewPolicies: () => void;
  postAuthDestinationLabel?: string | null;
}

type AuthMode = 'signin' | 'signup';

const readInitialAuthMode = (): AuthMode => consumeAuthModeHint() || 'signin';

const MotionDiv = motion.div as any;
const socialProviders: Array<{
  provider: SocialAuthProvider;
  label: string;
  Icon: React.FC<{ className?: string; size?: number }>;
  iconClassName?: string;
}> = [
  { provider: 'google', label: 'Google', Icon: GoogleIcon },
  { provider: 'apple', label: 'Apple', Icon: AppleIcon, iconClassName: 'text-[#242932]' },
];

export function AuthScreen({
  onSuccess,
  onViewPolicies,
  postAuthDestinationLabel,
}: AuthScreenProps) {
  const appName = getClientAppName();
  const logoSrc = getClientLogoSrc();
  const [mode, setMode] = useState<AuthMode>(() => readInitialAuthMode());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isAuthBusy = loading || socialLoadingProvider !== null;
  const continueAfterSignInLabel = i18nT(
    'auth.continueAfterSignIn',
    'Continue to {destination} after sign in',
  ).replace('{destination}', postAuthDestinationLabel || '');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthBusy) {
      return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        clearOnboardingCache();
        markAuthModeHint('signin');
        await signInWithEmail(email, password);
        onSuccess(false);
      } else {
        markAuthModeHint('signup');
        const onboarding = getOnboardingCache();
        const profileType = onboarding.profileType;
        const profileName =
          profileType === 'doctor'
            ? onboarding.doctorProfile?.name
            : profileType === 'caregiver'
              ? onboarding.caregiverProfile?.name
              : onboarding.baby?.name;
        const profilePhotoUrl =
          profileType === 'doctor'
            ? onboarding.doctorProfile?.photoUrl
            : profileType === 'caregiver'
              ? onboarding.caregiverProfile?.photoUrl
              : onboarding.baby?.photoUrl;

        const signUpResult: any = await signUpWithEmail(email, password, {
          onboarding_profile_type: profileType,
          name: profileName || undefined,
          full_name: profileName || undefined,
          doctor_name: onboarding.doctorProfile?.name || undefined,
          doctor_specialty: onboarding.doctorProfile?.specialty || undefined,
          caregiver_name: onboarding.caregiverProfile?.name || undefined,
          caregiver_relationship: onboarding.caregiverProfile?.relationship || undefined,
          avatar_url: profilePhotoUrl || undefined,
          profile_photo_url: profilePhotoUrl || undefined,
          picture: profilePhotoUrl || undefined,
        });

        // Supabase can require email confirmation and return no session on sign up.
        if (signUpResult?.session) {
          onSuccess(true);
          return;
        }

        setMode('signin');
        setPassword('');
        setNotice(i18nT('auth.accountCreated', 'Account created. Check your email to confirm, then sign in.'));
      }
    } catch (err: any) {
      setError(err?.message || i18nT('auth.authFailed', 'Authentication failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: SocialAuthProvider) => {
    if (isAuthBusy) {
      return;
    }

    setError(null);
    setNotice(null);
    setSocialLoadingProvider(provider);

    try {
      markAuthModeHint('signin');
      clearOnboardingCache();
      await signInWithSocialProvider(provider);
    } catch (err: any) {
      setError(err?.message || i18nT('auth.socialAuthFailed', 'Social authentication failed. Please try again.'));
    } finally {
      setSocialLoadingProvider(null);
    }
  };

  return (
    <div className="page-scroll min-h-[100dvh] overflow-x-hidden bg-[#f8f7fb] text-[#242932]">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5f8ff] text-[#45697d]">
              <Fingerprint size={18} />
            </div>
            <span className="text-xl font-black tracking-[-0.02em] text-[#55575c]">{appName}</span>
          </div>
          <button
            type="button"
            onClick={onViewPolicies}
            disabled={isAuthBusy}
            className="rounded-full bg-[#5f6062] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(33,37,41,0.16)] transition-transform active:scale-95 disabled:opacity-60"
          >
            Policies
          </button>
        </header>

        <main className="grid items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
          <section className="mx-auto w-full max-w-xl lg:max-w-none">
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[2.5rem] border border-[#ebeaf0] bg-[#eef0f5] px-7 py-10 text-center sm:rounded-[3.25rem] sm:px-10 sm:py-14"
            >
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2.25rem] bg-white shadow-[0_18px_44px_rgba(37,43,54,0.08)] sm:h-32 sm:w-32 sm:rounded-[2.75rem]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dff8ff] text-[#45697d] sm:h-20 sm:w-20">
                  <img src={logoSrc} alt={appName} className="h-9 w-9 object-contain sm:h-11 sm:w-11" />
                </div>
              </div>
              <p className="mt-8 text-[10px] font-black uppercase tracking-[0.24em] text-[#49697a] sm:text-[11px]">
                {mode === 'signin'
                  ? i18nT('auth.identityVerification', 'Identity Verification')
                  : i18nT('auth.provisionAccess', 'Provision Access')}
              </p>
              <h1 className="mx-auto mt-4 max-w-lg text-5xl font-black leading-[0.98] tracking-[0] text-[#242932] [text-shadow:0_3px_0_rgba(0,0,0,0.09)] sm:text-6xl">
                {mode === 'signin'
                  ? i18nT('auth.welcomeBack', 'Welcome Back')
                  : i18nT('auth.joinApp', 'Join Cradlyn')}
              </h1>
              <p className="mx-auto mt-6 max-w-md text-lg leading-8 text-[#5f646d]">
                A calm space for tracking every milestone, feeding, and nap with professional clarity.
              </p>
              {postAuthDestinationLabel && (
                <div className="mx-auto mt-7 max-w-sm rounded-[1.75rem] border border-[#dbeef6] bg-white/70 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[#45697d]">
                  {continueAfterSignInLabel}
                </div>
              )}
            </MotionDiv>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-[0_18px_48px_rgba(37,43,54,0.04)]">
                <ShieldCheck className="mb-5 text-[#45697d]" size={26} />
                <h2 className="text-xl font-black tracking-[0] text-[#242932]">Private by design</h2>
                <p className="mt-2 text-sm leading-6 text-[#686d76]">
                  Secure access for families, caregivers, and care teams.
                </p>
              </div>
              <div className="rounded-[2rem] bg-[#eef0f5] p-6">
                <Fingerprint className="mb-5 text-[#45697d]" size={26} />
                <h2 className="text-xl font-black tracking-[0] text-[#242932]">Quick return</h2>
                <p className="mt-2 text-sm leading-6 text-[#686d76]">
                  Sign in and continue exactly where care left off.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <MotionDiv
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="rounded-[2.5rem] border border-[#ebeaf0] bg-white p-6 shadow-[0_24px_64px_rgba(37,43,54,0.06)] sm:p-8"
            >
        <AnimatePresence>
          {error && (
            <MotionDiv
              initial={{ y: 10, opacity: 0, height: 0 }}
              animate={{ y: 0, opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 w-full overflow-hidden"
            >
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-center text-xs font-extrabold uppercase tracking-widest text-red-600">
                {error}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notice && (
            <MotionDiv
              initial={{ y: 10, opacity: 0, height: 0 }}
              animate={{ y: 0, opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 w-full overflow-hidden"
            >
              <div className="rounded-[1.5rem] border border-[#dbeef6] bg-[#e5f8ff] p-4 text-center text-xs font-extrabold uppercase tracking-widest text-[#45697d]">
                {notice}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="w-full space-y-5">
          <div className="space-y-2.5 sm:space-y-3">
            <span className="ml-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a909a]">
              {i18nT('auth.registryEmail', 'Registry Email')}
            </span>
            <div className="group relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#45697d] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder={i18nT('auth.emailPlaceholder', 'parent@domain.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAuthBusy}
                className="h-16 w-full rounded-[1.75rem] border border-[#e7e9ef] bg-[#f4f5f9] pl-16 pr-8 font-bold text-[#242932] outline-none transition-all placeholder:text-[#9aa3b2] focus:border-[#dbeef6] focus:bg-white focus:ring-4 focus:ring-[#dff8ff] sm:h-[4.5rem] sm:rounded-[2rem]"
                required
              />
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <span className="ml-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a909a]">
              {i18nT('auth.accessKey', 'Access Key')}
            </span>
            <div className="group relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#45697d] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={i18nT('auth.passwordPlaceholder', 'Enter your password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isAuthBusy}
                className="h-16 w-full rounded-[1.75rem] border border-[#e7e9ef] bg-[#f4f5f9] pl-16 pr-14 font-bold text-[#242932] outline-none transition-all placeholder:text-[#9aa3b2] focus:border-[#dbeef6] focus:bg-white focus:ring-4 focus:ring-[#dff8ff] sm:h-[4.5rem] sm:rounded-[2rem]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isAuthBusy}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-[#8a909a] transition-colors hover:text-[#242932]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAuthBusy}
            className="mt-5 flex h-16 w-full items-center justify-center rounded-full bg-[#5f6062] px-6 text-lg font-black text-white shadow-[0_18px_34px_rgba(33,37,41,0.18)] transition-transform active:scale-95 disabled:opacity-70 sm:h-[4.5rem]"
          >
            {loading ? (
                <div className="flex items-center gap-3">
                  <ShieldCheck className="animate-pulse" />
                  <span>{i18nT('auth.authorizing', 'Authorizing...')}</span>
                </div>
              ) : (
              <div className="flex items-center gap-3">
                <Fingerprint size={24} />
                <span>
                  {mode === 'signin'
                    ? i18nT('auth.signInAction', 'Sign In')
                    : i18nT('auth.createAccountAction', 'Create Account')}
                </span>
              </div>
            )}
          </button>
        </form>

        <div className="mt-5 w-full space-y-3 text-center sm:hidden">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            disabled={isAuthBusy}
            className="block w-full text-sm font-bold text-[#686d76] transition-colors hover:text-[#45697d]"
          >
            {mode === 'signin' ? 'Need to register? ' : 'Already recognized? '}
            <span className="ml-1 font-black uppercase tracking-widest text-[#45697d] underline">
              {mode === 'signin' ? 'Create Account' : 'Sign In Portal'}
            </span>
          </button>

          <button
            type="button"
            onClick={onViewPolicies}
            disabled={isAuthBusy}
            className="block w-full text-[11px] font-bold text-[#686d76] transition-colors hover:text-[#45697d]"
          >
            <span className="font-black uppercase tracking-[0.22em] text-[#45697d] underline">
              {i18nT('public.privacyTermsPolicies', 'Privacy, Terms & Policies')}
            </span>
          </button>
        </div>

        <div className="mt-7 w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e7e9ef]" />
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-[#9aa3b2]">
              {i18nT('auth.continueWith', 'Continue with {provider}').replace('{provider}', '').trim()}
            </span>
            <div className="h-px flex-1 bg-[#e7e9ef]" />
          </div>

          <div className="space-y-3">
            {socialProviders.map(({ provider, label, Icon, iconClassName }) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleSocialAuth(provider)}
                disabled={isAuthBusy}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-[1.5rem] border border-[#e7e9ef] bg-[#f4f5f9] px-5 font-bold text-[#242932] transition-all hover:border-[#dbeef6] hover:bg-white active:scale-[0.99] disabled:opacity-60"
              >
                {socialLoadingProvider === provider ? (
                  <>
                    <ShieldCheck size={18} className="animate-pulse" />
                    <span>{`${i18nT('auth.continueWith', 'Continue with {provider}').replace('{provider}', label)}...`}</span>
                  </>
                ) : (
                  <>
                    <Icon size={18} className={`shrink-0 ${iconClassName || ''}`} />
                    <span>{i18nT('auth.continueWith', 'Continue with {provider}').replace('{provider}', label)}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 hidden w-full space-y-3 text-center sm:block">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            disabled={isAuthBusy}
            className="block w-full text-sm font-bold text-[#686d76] transition-colors hover:text-[#45697d]"
          >
            {mode === 'signin' ? 'Need to register? ' : 'Already recognized? '}
            <span className="ml-1 font-black uppercase tracking-widest text-[#45697d] underline">
              {mode === 'signin' ? 'Create Account' : 'Sign In Portal'}
            </span>
          </button>

          <button
            type="button"
            onClick={onViewPolicies}
            disabled={isAuthBusy}
            className="block w-full text-[11px] font-bold text-[#686d76] transition-colors hover:text-[#45697d]"
          >
            <span className="font-black uppercase tracking-[0.22em] text-[#45697d] underline">
              {i18nT('public.privacyTermsPolicies', 'Privacy, Terms & Policies')}
            </span>
          </button>

          <div className="flex flex-col items-center gap-2 pt-4 sm:pt-6">
            <div className="h-1 w-8 rounded-full bg-[#e7e9ef]" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#9aa3b2]">
              CRADLYN SECURE ACCESS
            </p>
          </div>
        </div>
            </MotionDiv>
          </section>
        </main>
      </div>
    </div>
  );
}
