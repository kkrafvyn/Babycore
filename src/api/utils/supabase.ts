/**
 * Supabase Client Configuration
 * Centralized Supabase client setup for backend API
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';
const supabasePublicKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

const createMissingConfigProxy = (label: string) =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(`Missing required environment variables: ${label}`);
      },
    }
  );

// Create Supabase client with service role key (for backend operations)
export const hasServiceConfig = Boolean(supabaseUrl && supabaseServiceKey);

export const supabase = hasServiceConfig
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : (createMissingConfigProxy(
      'SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)'
    ) as ReturnType<typeof createClient>);

// Create Supabase client with anon key (for public operations)
export const supabasePublic = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabasePublicKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const getBearerToken = (authHeader?: string | string[]) => {
  const rawValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!rawValue) return null;

  const match = rawValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

export const createRequestSupabaseClient = (authHeader?: string | string[]) => {
  const token = getBearerToken(authHeader);
  const key = token && supabasePublicKey ? supabasePublicKey : (supabaseServiceKey || supabasePublicKey);

  if (!supabaseUrl || !key) {
    throw new Error(
      'Missing SUPABASE_URL and one of SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY',
    );
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
};

// Helper: Get user from token
export async function getUserFromToken(token: string) {
  try {
    const authClient = createRequestSupabaseClient(`Bearer ${token}`).auth as any;
    const { data: { user }, error } = await authClient.getUser(token);
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// Helper: Check if user has permission on resource
export async function checkResourceAccess(
  userId: string,
  babyId: string
): Promise<boolean> {
  try {
    // Check direct ownership
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('user_id')
      .eq('id', babyId)
      .single();

    if (babyError || !baby) {
      return false;
    }

    if (baby.user_id === userId) {
      return true;
    }

    // Check family sharing access
    const { data: access, error: accessError } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('invited_user_id', userId)
      .eq('baby_id', babyId)
      .eq('status', 'accepted')
      .single();

    return !!access && !accessError;
  } catch (error) {
    console.error('Error checking resource access:', error);
    return false;
  }
}

// Helper: Get all babies user has access to
export async function getUserBabies(userId: string) {
  try {
    // Get owned babies
    const { data: ownedBabies } = await supabase
      .from('babies')
      .select('*')
      .eq('user_id', userId);

    // Get shared babies
    const { data: sharedBabies } = await supabase
      .from('family_sharing_invites')
      .select('babies(id, name, date_of_birth, photo_url)')
      .eq('invited_user_id', userId)
      .eq('status', 'accepted');

    const babies = [
      ...(ownedBabies || []),
      ...(sharedBabies?.map(s => s.babies).filter(Boolean) || []),
    ];

    return babies;
  } catch (error) {
    console.error('Error getting user babies:', error);
    return [];
  }
}

export default supabase;
