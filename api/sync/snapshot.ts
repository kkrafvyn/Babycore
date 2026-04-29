import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';
import { buildSyncSnapshot } from '../_shared/sync-data.js';

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
    const snapshot = await buildSyncSnapshot(supabaseAdmin, user);
    res.status(200).json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to build sync snapshot:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build sync snapshot',
    });
  }
}
