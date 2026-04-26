import {
  GLOBAL_HEALTH_REGION,
  isActiveAlert,
  normalizeRegion,
} from '../_shared/health-alerts.js';
import { setCommonHeaders, type VercelRequest, type VercelResponse } from '../_shared/http.js';
import { createSupabaseAdminClient, getAuthenticatedUser } from '../_shared/supabase.js';

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

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
    const supabase = createSupabaseAdminClient();

    const [{ data: prefs }, { data: allAlerts, error: alertsError }, { data: dismissed }] =
      await Promise.all([
        supabase
          .from('user_health_preferences')
          .select('primary_region')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('health_alerts').select('*').order('start_date', { ascending: false }).limit(500),
        supabase.from('user_health_alerts_dismissed').select('alert_id').eq('user_id', user.id),
      ]);

    if (alertsError) throw alertsError;

    const userRegion = normalizeRegion(prefs?.primary_region);
    const dismissedIds = new Set((dismissed || []).map((record: any) => record.alert_id));

    const alerts = (allAlerts || [])
      .filter((alert: any) => {
        const regions = Array.isArray(alert.regions)
          ? alert.regions.map((region: unknown) => String(region).toUpperCase())
          : [];

        return (
          isActiveAlert(alert.end_date) &&
          !dismissedIds.has(alert.id) &&
          (regions.includes(userRegion) || regions.includes(GLOBAL_HEALTH_REGION))
        );
      })
      .sort((left: any, right: any) => {
        const severityDiff =
          (SEVERITY_WEIGHT[right.severity] || 0) - (SEVERITY_WEIGHT[left.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return new Date(right.start_date).getTime() - new Date(left.start_date).getTime();
      });

    res.status(200).json({
      success: true,
      alerts,
      total: alerts.length,
      region: userRegion,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch active alerts',
    });
  }
}
