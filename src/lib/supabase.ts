import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export type SocialAuthProvider = 'google' | 'apple';
export type SignUpMetadata = Record<string, any>;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_AUTH_REDIRECT_URL = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL || '';
const MOBILE_AUTH_CALLBACK_SCHEME = 'com.cradlyn.app';
const MOBILE_AUTH_CALLBACK_HOST = 'auth';
const MOBILE_AUTH_CALLBACK_PATH = '/callback';
export const MOBILE_AUTH_CALLBACK_URL = `${MOBILE_AUTH_CALLBACK_SCHEME}://${MOBILE_AUTH_CALLBACK_HOST}${MOBILE_AUTH_CALLBACK_PATH}`;

// Avoid navigator.locks contention from React Strict Mode double-mount and parallel getSession calls.
const supabaseAuthLock = async <T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>,
): Promise<T> => fn();

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiYWJ5bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE1MTYyMzkwMjJ9.signature';

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!hasSupabaseConfig) {
  console.warn(
    'Supabase environment variables not set. Sign-in is disabled until VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY are configured.',
  );
}

export const supabase = createClient(
  hasSupabaseConfig ? SUPABASE_URL : FALLBACK_SUPABASE_URL,
  hasSupabaseConfig ? SUPABASE_PUBLISHABLE_KEY : FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: typeof window !== 'undefined' && Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
      lock: supabaseAuthLock,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

const missingSupabaseConfigError = () =>
  new Error(
    'Supabase auth is not configured. Add VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY to enable authentication.',
  );

const isLocalHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const isNativeMobileApp = () => typeof window !== 'undefined' && Capacitor.isNativePlatform();

const getUrlParameters = (url: URL) => {
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);

  hashParams.forEach((value, key) => {
    params.set(key, value);
  });

  return params;
};

const getAuthRedirectError = (params: URLSearchParams) =>
  params.get('error_description') || params.get('error') || params.get('error_code');

export const isMobileAuthCallbackUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === `${MOBILE_AUTH_CALLBACK_SCHEME}:` &&
      parsed.host === MOBILE_AUTH_CALLBACK_HOST &&
      parsed.pathname === MOBILE_AUTH_CALLBACK_PATH
    );
  } catch {
    return false;
  }
};

const sanitizeConfiguredRedirectUrl = (url: string): string | undefined => {
  try {
    const parsed = new URL(url);

    if (typeof window !== 'undefined') {
      const appIsLocal = isLocalHost(window.location.hostname);
      const redirectIsLocal = isLocalHost(parsed.hostname);

      // Guard against production builds accidentally shipping localhost callback URLs.
      if (!appIsLocal && redirectIsLocal) {
        console.warn(
          `Ignoring local OAuth redirect URL "${url}" because app is running on "${window.location.origin}".`,
        );
        return undefined;
      }
    }

    return parsed.toString();
  } catch {
    console.warn(`Invalid VITE_SUPABASE_AUTH_REDIRECT_URL value ignored: "${url}"`);
    return undefined;
  }
};

const getOAuthRedirectUrl = () => {
  if (isNativeMobileApp()) {
    return MOBILE_AUTH_CALLBACK_URL;
  }

  if (SUPABASE_AUTH_REDIRECT_URL) {
    const safeConfiguredUrl = sanitizeConfiguredRedirectUrl(SUPABASE_AUTH_REDIRECT_URL);
    if (safeConfiguredUrl) {
      return safeConfiguredUrl;
    }
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const redirectUrl = new URL(window.location.origin + window.location.pathname + window.location.search);
  return redirectUrl.toString();
};

export const completeMobileAuthSession = async (url: string) => {
  if (!hasSupabaseConfig || !isMobileAuthCallbackUrl(url)) {
    return false;
  }

  const parsedUrl = new URL(url);
  const params = getUrlParameters(parsedUrl);
  const redirectError = getAuthRedirectError(params);

  if (redirectError) {
    throw new Error(redirectError);
  }

  const auth = supabase.auth as any;
  const code = params.get('code');

  if (code) {
    const { data, error } = await auth.exchangeCodeForSession(code);
    if (error) throw error;
    return Boolean(data?.session);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return false;
  }

  const { data, error } = await auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw error;
  return Boolean(data?.session);
};

const getProviderOAuthOptions = (provider: SocialAuthProvider) => {
  switch (provider) {
    case 'google':
      return {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      };
    case 'apple':
      return {
        scopes: 'name email',
      };
    default:
      return {};
  }
};

// Auth helpers
export const getCurrentUser = async (): Promise<AuthenticatedUser | null> => {
  if (!hasSupabaseConfig) {
    return null;
  }

  const auth = supabase.auth as any;
  const {
    data: { session },
    error,
  } = await auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session?.user || null;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  metadata?: SignUpMetadata,
) => {
  if (!hasSupabaseConfig) {
    throw missingSupabaseConfigError();
  }

  const auth = supabase.auth as any;
  const { data, error } = await auth.signUp({
    email,
    password,
    options: metadata
      ? {
          data: metadata,
        }
      : undefined,
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!hasSupabaseConfig) {
    throw missingSupabaseConfigError();
  }

  const auth = supabase.auth as any;
  const { data, error } = await auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const updateCurrentUserMetadata = async (metadata: SignUpMetadata) => {
  if (!hasSupabaseConfig) {
    throw missingSupabaseConfigError();
  }

  const currentUser = await getCurrentUser();
  const auth = supabase.auth as any;
  const { data, error } = await auth.updateUser({
    data: {
      ...(currentUser?.user_metadata || {}),
      ...metadata,
    },
  });

  if (error) throw error;
  return data?.user || null;
};

export const signInWithSocialProvider = async (provider: SocialAuthProvider) => {
  if (!hasSupabaseConfig) {
    throw missingSupabaseConfigError();
  }

  const auth = supabase.auth as any;
  const redirectTo = getOAuthRedirectUrl();
  const providerOptions = getProviderOAuthOptions(provider);
  const isNative = isNativeMobileApp();
  const { data, error } = await auth.signInWithOAuth({
    provider,
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      ...(isNative ? { skipBrowserRedirect: true } : {}),
      ...providerOptions,
    },
  });

  if (error) throw error;

  if (isNative) {
    if (!data?.url) {
      throw new Error('Unable to start mobile sign-in because Supabase did not return an auth URL.');
    }

    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url });
  }

  return data;
};

export const signOut = async () => {
  if (!hasSupabaseConfig) {
    return;
  }

  const auth = supabase.auth as any;
  const { error } = await auth.signOut();
  if (error) throw error;
};

export const onAuthStateChange = (callback: (user: AuthenticatedUser | null) => void) => {
  if (!hasSupabaseConfig) {
    return {
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
    };
  }

  const auth = supabase.auth as any;

  return auth.onAuthStateChange((_event: unknown, session: { user?: AuthenticatedUser | null } | null) => {
    callback(session?.user || null);
  });
};
