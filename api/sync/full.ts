import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase.js';
import {
  parseRequestBody,
  setCommonHeaders,
  type VercelRequest,
  type VercelResponse,
} from '../_shared/http.js';
import { applyFullSync } from '../_shared/sync-data.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const body = parseRequestBody(req.body);
    const localData =
      body.localData && typeof body.localData === 'object' ? body.localData : body;

    const supabaseAdmin = createSupabaseAdminClient();
    const result = await applyFullSync(supabaseAdmin, user, localData);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      results: result.results,
    });
  } catch (error) {
    console.error('Failed to apply full sync:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply full sync',
    });
  }
}
