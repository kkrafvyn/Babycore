/**
 * Health Alerts API Routes
 * Endpoints for managing epidemic/outbreak alerts
 */

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

/**
 * GET /api/health-alerts/active
 * Get active health alerts for user's region
 */
export async function getActiveHealthAlerts(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get user's region from preferences
    const { data: prefs, error: prefError } = await supabase
      .from('user_health_preferences')
      .select('region')
      .eq('user_id', userId)
      .single();

    if (prefError) throw prefError;

    // Get active alerts for region
    const today = new Date().toISOString().split('T')[0];
    const { data: alerts, error: alertError } = await supabase
      .from('health_alerts')
      .select('*')
      .contains('regions', [prefs?.region || 'US'])
      .gte('end_date', today)
      .order('severity', { ascending: false });

    if (alertError) throw alertError;

    return res.json({ alerts, total: alerts?.length || 0 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/health-alerts/sync-external
 * Fetch latest alerts from external APIs (WHO, CDC)
 * Run daily via cron job
 */
export async function syncExternalHealthAlerts(req: Request, res: Response) {
  try {
    const alerts: any[] = [];

    // Fetch WHO alerts
    const whoResponse = await fetch('https://www.who.int/api/outbreak-news-feed');
    const whoData = await whoResponse.json();
    
    for (const item of whoData.messages || []) {
      alerts.push({
        type: 'outbreak',
        disease_name: item.title,
        regions: ['GLOBAL'],
        severity: getSeverity(item.description),
        description: item.description,
        start_date: new Date().toISOString(),
        end_date: null,
        source: 'WHO',
      });
    }

    // Fetch CDC alerts
    const cdcResponse = await fetch('https://www.cdc.gov/api/v1/alerts');
    const cdcData = await cdcResponse.json();

    for (const item of cdcData.alerts || []) {
      alerts.push({
        type: 'alert',
        disease_name: item.name,
        regions: ['US'],
        severity: item.severity,
        description: item.description,
        start_date: new Date().toISOString(),
        end_date: null,
        source: 'CDC',
      });
    }

    // Insert new alerts
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('health_alerts')
        .upsert(alerts, { onConflict: 'disease_name,regions' });

      if (error) throw error;
    }

    return res.json({ 
      success: true, 
      message: `Synced ${alerts.length} health alerts`,
      alerts,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/health-alerts/dismiss
 * User dismisses an alert
 */
export async function dismissHealthAlert(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { alertId } = req.body;

    if (!userId || !alertId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert dismissal record
    const { error } = await supabase
      .from('user_alert_dismissals')
      .insert({
        user_id: userId,
        alert_id: alertId,
        dismissed_at: new Date().toISOString(),
      });

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Helper: Determine severity from description
 */
function getSeverity(description: string): 'low' | 'medium' | 'high' | 'critical' {
  const text = description.toLowerCase();
  if (text.includes('critical') || text.includes('emergency')) return 'critical';
  if (text.includes('high') || text.includes('severe')) return 'high';
  if (text.includes('moderate')) return 'medium';
  return 'low';
}
