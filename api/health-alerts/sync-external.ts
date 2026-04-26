import { syncExternalHealthAlerts } from '../_shared/health-alerts.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';
import { getAuthenticatedUser } from '../_shared/supabase.js';

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
    const result = await syncExternalHealthAlerts();
    res.status(200).json({
      success: true,
      message: `Synced ${result.synced} external alerts.`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to sync external alerts',
    });
  }
}
