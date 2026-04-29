/**
 * Supabase Client Configuration
 * Initializes and exports Supabase client for database operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
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

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : (createMissingConfigProxy(
      'SUPABASE_URL and one of SUPABASE_ANON_KEY/SUPABASE_SERVICE_KEY'
    ) as ReturnType<typeof createClient>);

export default supabase;
