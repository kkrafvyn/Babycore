import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export type SocialAuthProvider = 'google' | 'apple';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_AUTH_REDIRECT_URL = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL || '';
const CANONICAL_VERCEL_ORIGIN = 'https://babycore.vercel.app';

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiYWJ5bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE1MTYyMzkwMjJ9.signature';

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!hasSupabaseConfig) {
  console.warn(
    'Supabase environment variables not set. Guest mode will still work, but email auth is disabled until VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY are configured.',
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
  if (SUPABASE_AUTH_REDIRECT_URL) {
    const safeConfiguredUrl = sanitizeConfiguredRedirectUrl(SUPABASE_AUTH_REDIRECT_URL);
    if (safeConfiguredUrl) {
      return safeConfiguredUrl;
    }
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  // For Vercel preview URLs, always return the canonical production origin.
  if (window.location.hostname.endsWith('.vercel.app')) {
    return new URL(window.location.pathname + window.location.search, CANONICAL_VERCEL_ORIGIN).toString();
  }

  const redirectUrl = new URL(window.location.origin + window.location.pathname + window.location.search);
  return redirectUrl.toString();
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
  const { data, error } = await auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return data.user;
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!hasSupabaseConfig) {
    throw missingSupabaseConfigError();
  }

  const auth = supabase.auth as any;
  const { data, error } = await auth.signUp({
    email,
    password,
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

export const signInWithSocialProvider = async (provider: SocialAuthProvider) => {
  if (!hasSupabaseConfig) {
    throw missingSupabaseConfigError();
  }

  const auth = supabase.auth as any;
  const redirectTo = getOAuthRedirectUrl();
  const providerOptions = getProviderOAuthOptions(provider);
  const { data, error } = await auth.signInWithOAuth({
    provider,
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      ...providerOptions,
    },
  });

  if (error) throw error;
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
