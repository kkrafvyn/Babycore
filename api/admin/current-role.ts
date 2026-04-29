import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      role: data?.role || user.user_metadata?.role || 'user',
    });
  } catch (error) {
    console.error('Failed to load current user role:', error);
    res.status(200).json({
      success: true,
      role: user.user_metadata?.role || 'user',
    });
  }
}
