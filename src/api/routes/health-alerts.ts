/**
 * Health Alerts API Routes
 * Syncs WHO + CDC outbreak data and serves user-specific active alerts.
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../utils/supabase';

const router = Router();

const WHO_DON_ENDPOINT =
  'https://www.who.int/api/news/diseaseoutbreaknews?$top=40&$orderby=PublicationDateAndTime%20desc&$select=Title,PublicationDateAndTime,ItemDefaultUrl,UrlName,Summary,Advice,DonId';
const CDC_US_OUTBREAKS_ENDPOINT = 'https://www.cdc.gov/outbreaks/rss/us-outbreaks.html';
const CDC_INT_OUTBREAKS_ENDPOINT = 'https://www.cdc.gov/outbreaks/rss/int-outbreaks.html';
const DEFAULT_REGION = 'US';
const GLOBAL_REGION = 'GLOBAL';
const ACTIVE_WINDOW_DAYS = 180;
const DEFAULT_AGE_GROUPS = ['0-6', '6-12', '12+'];

type AlertType = 'epidemic' | 'seasonal' | 'outbreak' | 'warning';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface HealthAlertInsert {
  type: AlertType;
  disease_name: string;
  regions: string[];
  severity: AlertSeverity;
  start_date: string;
  end_date: string;
  description?: string;
  prevention_tips?: string;
  affected_age_groups: string[];
  source: 'WHO' | 'CDC';
  data_source_url: string;
}

interface WhoOutbreakItem {
  Title?: string;
  PublicationDateAndTime?: string;
  ItemDefaultUrl?: string;
  UrlName?: string;
  Summary?: string;
  Advice?: string;
}

interface WhoOutbreakResponse {
  value?: WhoOutbreakItem[];
}

interface HealthAlertRow {
  id: string;
  type: AlertType;
  disease_name: string;
  regions: string[];
  severity: AlertSeverity;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  prevention_tips?: string | null;
  affected_age_groups: string[];
  source?: string | null;
  data_source_url?: string | null;
}

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const stripHtml = (value: string): string =>
  normalizeWhitespace(value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' '));

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const normalizeRegion = (value: string | null | undefined): string => {
  const normalized = (value || DEFAULT_REGION).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_REGION;
};

const isActiveAlert = (alert: Pick<HealthAlertRow, 'end_date'>): boolean => {
  if (!alert.end_date) return true;
  const endAt = new Date(alert.end_date).getTime();
  return Number.isFinite(endAt) && endAt >= Date.now();
};

const deriveSeverity = (value: string): AlertSeverity => {
  const text = value.toLowerCase();

  if (
    /(critical|emergency|fatal|death|marburg|ebola|nipah|polio|cholera|measles)/.test(text)
  ) {
    return 'critical';
  }

  if (/(outbreak|global situation|influenza|mpox|dengue|cluster|rapid spread|severe)/.test(text)) {
    return 'high';
  }

  if (/(watch|advisory|warning|update|monitor)/.test(text)) {
    return 'medium';
  }

  return 'low';
};

const toIsoDateOrNow = (value: string | undefined): string => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const normalizeWhoItemUrl = (itemDefaultUrl?: string, urlName?: string): string => {
  const slug = (urlName || itemDefaultUrl || '').replace(/^\/+/, '').trim();
  if (!slug) {
    return 'https://www.who.int/emergencies/disease-outbreak-news';
  }

  if (slug.startsWith('http://') || slug.startsWith('https://')) {
    return slug;
  }

  return `https://www.who.int/emergencies/disease-outbreak-news/item/${slug}`;
};

const normalizeCdcUrl = (href: string): string => {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  if (href.startsWith('/')) {
    return `https://www.cdc.gov${href}`;
  }

  return `https://www.cdc.gov/${href}`;
};

const parseAnnouncementDate = (label: string): string => {
  const cleaned = label.replace(/^announced\s+/i, '').trim();
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

const parseCdcFeed = (html: string, regions: string[]): HealthAlertInsert[] => {
  const alerts: HealthAlertInsert[] = [];
  const itemRegex =
    /<li>\s*<a[^>]*href="([^"]+)"[^>]*class="feed-item-title"[^>]*>([\s\S]*?)<\/a>\s*<span[^>]*class="item-pubdate"[^>]*>([\s\S]*?)<\/span>\s*<\/li>/gi;

  let match: RegExpExecArray | null = itemRegex.exec(html);
  while (match) {
    const href = normalizeCdcUrl(match[1] || '');
    const title = stripHtml(match[2] || '');
    const announcedLabel = stripHtml(match[3] || '');
    const startDate = parseAnnouncementDate(announcedLabel);
    const description = truncate(
      announcedLabel
        ? `${announcedLabel}. Latest update from CDC outbreak monitoring.`
        : 'Latest update from CDC outbreak monitoring.',
      280,
    );

    if (title) {
      alerts.push({
        type: 'outbreak',
        disease_name: title,
        regions,
        severity: deriveSeverity(`${title} ${description}`),
        start_date: startDate,
        end_date: addDays(startDate, ACTIVE_WINDOW_DAYS),
        description,
        affected_age_groups: DEFAULT_AGE_GROUPS,
        source: 'CDC',
        data_source_url: href,
      });
    }

    match = itemRegex.exec(html);
  }

  return alerts;
};

const fetchWhoAlerts = async (): Promise<HealthAlertInsert[]> => {
  const response = await fetch(WHO_DON_ENDPOINT, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`WHO fetch failed with status ${response.status}`);
  }

  const data = (await response.json()) as WhoOutbreakResponse;
  const items = data.value || [];
  const alerts: HealthAlertInsert[] = [];

  for (const item of items) {
    const title = normalizeWhitespace(item.Title || '');
    if (!title) continue;

    const startDate = toIsoDateOrNow(item.PublicationDateAndTime);
    const summary = stripHtml(item.Summary || '');
    const advice = stripHtml(item.Advice || '');
    const diseaseName = truncate(title, 190);

    alerts.push({
      type: /global situation|global update|multi-country/i.test(title) ? 'epidemic' : 'outbreak',
      disease_name: diseaseName,
      regions: [GLOBAL_REGION],
      severity: deriveSeverity(`${title} ${summary}`),
      start_date: startDate,
      end_date: addDays(startDate, ACTIVE_WINDOW_DAYS),
      description: truncate(summary || `WHO outbreak update: ${title}`, 280),
      prevention_tips: advice ? truncate(advice, 320) : undefined,
      affected_age_groups: DEFAULT_AGE_GROUPS,
      source: 'WHO',
      data_source_url: normalizeWhoItemUrl(item.ItemDefaultUrl, item.UrlName),
    });
  }

  return alerts;
};

const fetchCdcAlerts = async (): Promise<HealthAlertInsert[]> => {
  const [usResponse, internationalResponse] = await Promise.all([
    fetch(CDC_US_OUTBREAKS_ENDPOINT),
    fetch(CDC_INT_OUTBREAKS_ENDPOINT),
  ]);

  const usAlerts = usResponse.ok
    ? parseCdcFeed(await usResponse.text(), [DEFAULT_REGION, GLOBAL_REGION])
    : [];
  const internationalAlerts = internationalResponse.ok
    ? parseCdcFeed(await internationalResponse.text(), [GLOBAL_REGION])
    : [];

  return [...usAlerts, ...internationalAlerts];
};

/**
 * GET /api/health-alerts/active
 * Get active health alerts for the current user region.
 */
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: prefs } = await supabase
      .from('user_health_preferences')
      .select('primary_region')
      .eq('user_id', userId)
      .single();

    const userRegion = normalizeRegion(prefs?.primary_region);

    const [{ data: allAlerts, error: alertsError }, { data: dismissed }] = await Promise.all([
      supabase.from('health_alerts').select('*').order('start_date', { ascending: false }).limit(500),
      supabase.from('user_health_alerts_dismissed').select('alert_id').eq('user_id', userId),
    ]);

    if (alertsError) throw alertsError;

    const dismissedIds = new Set((dismissed || []).map((record) => record.alert_id));
    const alerts = ((allAlerts || []) as HealthAlertRow[])
      .filter((alert) => {
        const regions = Array.isArray(alert.regions)
          ? alert.regions.map((region) => String(region).toUpperCase())
          : [];

        return (
          isActiveAlert(alert) &&
          !dismissedIds.has(alert.id) &&
          (regions.includes(userRegion) || regions.includes(GLOBAL_REGION))
        );
      })
      .sort((left, right) => {
        const severityDiff =
          (SEVERITY_WEIGHT[right.severity] || 0) - (SEVERITY_WEIGHT[left.severity] || 0);

        if (severityDiff !== 0) return severityDiff;
        return new Date(right.start_date).getTime() - new Date(left.start_date).getTime();
      });

    return res.json({ alerts, total: alerts.length, region: userRegion });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch active alerts';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/health-alerts/sync-external
 * Fetch latest alerts from WHO + CDC and insert new items.
 */
router.post('/sync-external', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [whoResult, cdcResult] = await Promise.allSettled([fetchWhoAlerts(), fetchCdcAlerts()]);

    const whoAlerts = whoResult.status === 'fulfilled' ? whoResult.value : [];
    const cdcAlerts = cdcResult.status === 'fulfilled' ? cdcResult.value : [];
    const allCandidates = [...whoAlerts, ...cdcAlerts];

    if (allCandidates.length === 0) {
      const failures = [
        ...(whoResult.status === 'rejected'
          ? [{ source: 'WHO', message: String(whoResult.reason) }]
          : []),
        ...(cdcResult.status === 'rejected'
          ? [{ source: 'CDC', message: String(cdcResult.reason) }]
          : []),
      ];

      return res.status(200).json({
        success: true,
        message: 'No external alerts fetched.',
        synced: 0,
        inserted: 0,
        skipped: 0,
        failures,
      });
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('health_alerts')
      .select('source,data_source_url')
      .not('data_source_url', 'is', null);

    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existingRows || []).map(
        (row) =>
          `${String(row.source || '').toUpperCase()}|${String(row.data_source_url || '').trim()}`,
      ),
    );

    const uniqueCandidates = allCandidates.filter((candidate, index, array) => {
      const key = `${candidate.source.toUpperCase()}|${candidate.data_source_url.trim()}`;
      return array.findIndex((item) => `${item.source.toUpperCase()}|${item.data_source_url.trim()}` === key) === index;
    });

    const freshAlerts = uniqueCandidates.filter((candidate) => {
      const key = `${candidate.source.toUpperCase()}|${candidate.data_source_url.trim()}`;
      return !existingKeys.has(key);
    });

    if (freshAlerts.length > 0) {
      const { error: insertError } = await supabase.from('health_alerts').insert(freshAlerts);
      if (insertError) throw insertError;
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${uniqueCandidates.length} external alerts.`,
      synced: uniqueCandidates.length,
      inserted: freshAlerts.length,
      skipped: uniqueCandidates.length - freshAlerts.length,
      failures: [
        ...(whoResult.status === 'rejected'
          ? [{ source: 'WHO', message: String(whoResult.reason) }]
          : []),
        ...(cdcResult.status === 'rejected'
          ? [{ source: 'CDC', message: String(cdcResult.reason) }]
          : []),
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync health alerts';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/health-alerts/dismiss
 * Dismiss an alert for current user.
 */
router.post('/dismiss', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { alertId } = req.body as { alertId?: string };

    if (!userId || !alertId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase.from('user_health_alerts_dismissed').upsert(
      {
        user_id: userId,
        alert_id: alertId,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,alert_id' },
    );

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dismiss alert';
    return res.status(500).json({ error: message });
  }
});

export default router;
