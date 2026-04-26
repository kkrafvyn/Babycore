import { createClient } from '@supabase/supabase-js';
import { getBearerToken, type VercelRequest } from './http.js';

export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const getAuthenticatedUser = async (request: VercelRequest) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const authClient = supabase.auth as any;
  const {
    data: { user },
    error,
  } = await authClient.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
};
