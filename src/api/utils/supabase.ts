/**
 * Supabase Client Configuration
 * Centralized Supabase client setup for backend API
 */

import { createClient } from '@supabase/supabase-js';
import {
  getSupabasePublicKey,
  getSupabaseServerUrl,
  getSupabaseServiceKey,
  loadServerEnvironment,
} from './runtime-config.js';

loadServerEnvironment();

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiYWJ5bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE1MTYyMzkwMjJ9.signature';

const supabaseUrl = getSupabaseServerUrl();
const supabaseServiceKey = getSupabaseServiceKey();
const supabasePublicKey = getSupabasePublicKey();

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
  supabaseUrl || FALLBACK_SUPABASE_URL,
  supabasePublicKey || FALLBACK_SUPABASE_PUBLISHABLE_KEY,
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

    // Check family sharing access using the current accepted invite model.
    const { data: access, error: accessError } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .eq('accepted_by', userId)
      .not('accepted_at', 'is', null)
      .maybeSingle();

    if (access && !accessError) {
      return true;
    }

    const { data: doctorAccess, error: doctorAccessError } = await supabase
      .from('doctor_baby_assignments')
      .select('id')
      .eq('baby_id', babyId)
      .eq('doctor_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    return !!doctorAccess && !doctorAccessError;
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
    const { data: sharedInviteRows } = await supabase
      .from('family_sharing_invites')
      .select('baby_id')
      .eq('accepted_by', userId)
      .not('accepted_at', 'is', null);

    const { data: doctorAssignments } = await supabase
      .from('doctor_baby_assignments')
      .select('baby_id,status')
      .eq('doctor_id', userId);

    const sharedBabyIds = Array.from(
      new Set(
        [
          ...(sharedInviteRows || []).map((row: any) => String(row?.baby_id || '')).filter(Boolean),
          ...(doctorAssignments || [])
            .filter((row: any) => !row?.status || row.status === 'active')
            .map((row: any) => String(row?.baby_id || ''))
            .filter(Boolean),
        ].filter(Boolean),
      ),
    );

    const { data: sharedBabies } = sharedBabyIds.length
      ? await supabase.from('babies').select('*').in('id', sharedBabyIds)
      : ({ data: [], error: null } as any);

    const dedupedBabies = new Map<string, any>();
    for (const baby of [...(ownedBabies || []), ...(sharedBabies || [])]) {
      if (baby?.id) {
        dedupedBabies.set(String(baby.id), baby);
      }
    }

    return Array.from(dedupedBabies.values());
  } catch (error) {
    console.error('Error getting user babies:', error);
    return [];
  }
}

export default supabase;
