import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export const getActiveSessionAccessToken = async (): Promise<string | null> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  return session?.access_token || null;
};

/**
 * Waits for Supabase to persist the OAuth/PKCE session before API bootstrap.
 * Native sign-in can return from the system browser before tokens are ready.
 */
export const waitForAuthSession = async (
  maxAttempts?: number,
  delayMs?: number,
): Promise<string | null> => {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const attempts = maxAttempts ?? (isNative ? 25 : 8);
  const baseDelay = delayMs ?? (isNative ? 300 : 200);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const accessToken = await getActiveSessionAccessToken();
    if (accessToken) {
      return accessToken;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, baseDelay * (attempt + 1)));
    }
  }

  return null;
};
