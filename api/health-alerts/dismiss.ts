import { parseRequestBody, setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http';
import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase';

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

  const body = parseRequestBody(req.body);
  const alertId = String(body.alertId || '').trim();
  if (!alertId) {
    res.status(400).json({ success: false, error: 'Missing alertId' });
    return;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('user_health_alerts_dismissed').upsert(
      {
        user_id: user.id,
        alert_id: alertId,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,alert_id' },
    );

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to dismiss alert',
    });
  }
}
