/**
 * Supabase Client Configuration
 * Initializes and exports Supabase client for database operations
 */

import { createClient } from '@supabase/supabase-js';
import {
  getSupabasePublicKey,
  getSupabaseServerUrl,
  getSupabaseServiceKey,
  loadServerEnvironment,
} from '../utils/runtime-config.js';

loadServerEnvironment();

const supabaseUrl = getSupabaseServerUrl();
const supabaseKey = getSupabasePublicKey() || getSupabaseServiceKey();

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
      'SUPABASE_URL and one of SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY/SUPABASE_SERVICE_KEY'
    ) as ReturnType<typeof createClient>);

export default supabase;
