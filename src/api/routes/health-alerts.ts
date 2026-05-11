/**
 * Health Alerts API Routes
 * Syncs WHO + CDC outbreak data and serves user-specific active alerts.
 */

import { Router, Response as ExpressResponse } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';

const router = Router();

const WHO_DON_ENDPOINT =
  'https://www.who.int/api/news/diseaseoutbreaknews?$top=40&$orderby=PublicationDateAndTime%20desc&$select=Title,PublicationDateAndTime,ItemDefaultUrl,UrlName,Summary,Advice,DonId';
const CDC_US_OUTBREAKS_ENDPOINT = 'https://www.cdc.gov/outbreaks/rss/us-outbreaks.html';
const CDC_INT_OUTBREAKS_ENDPOINT = 'https://www.cdc.gov/outbreaks/rss/int-outbreaks.html';
const FDA_FOOD_RECALLS_ENDPOINT =
  'https://api.fda.gov/food/enforcement.json?limit=12&sort=report_date%3Adesc';
const FDA_DEVICE_RECALLS_ENDPOINT =
  'https://api.fda.gov/device/enforcement.json?limit=8&sort=report_date%3Adesc';
const CPSC_BABY_RECALLS_ENDPOINT =
  'https://www.saferproducts.gov/RestWebServices/Recall?ProductName=Baby&format=json';
const CPSC_TODDLER_RECALLS_ENDPOINT =
  'https://www.saferproducts.gov/RestWebServices/Recall?ProductName=Toddler&format=json';
const USDA_FSIS_RECALLS_ENDPOINT = 'https://www.fsis.usda.gov/fsis/api/recall/v/1';
const FDA_RECALLS_URL = 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts';
const USDA_RECALLS_URL = 'https://www.fsis.usda.gov/recalls-alerts';
const DEFAULT_REGION = 'US';
const GLOBAL_REGION = 'GLOBAL';
const ACTIVE_WINDOW_DAYS = 180;
const DEFAULT_AGE_GROUPS = ['0-6', '6-12', '12+'];
const SOURCE_TIMEOUT_MS = 8000;
const NEWS_FEED_LIMIT = 40;

type AlertType = 'epidemic' | 'seasonal' | 'outbreak' | 'warning';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
type HealthNewsCategory =
  | 'outbreak'
  | 'food-recall'
  | 'device-recall'
  | 'product-safety'
  | 'guidance';
type HealthNewsSource = 'WHO' | 'CDC' | 'FDA' | 'USDA FSIS' | 'CPSC';

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

interface HealthNewsItem {
  id: string;
  title: string;
  summary: string;
  source: HealthNewsSource;
  category: HealthNewsCategory;
  severity: AlertSeverity;
  published_at: string;
  url: string;
  regions: string[];
  affected_age_groups: string[];
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
  normalizeWhitespace(
    value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&ldquo;|&rdquo;/gi, '"'),
  );

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

const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeoutMs = SOURCE_TIMEOUT_MS,
): Promise<globalThis.Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const slugify = (value: string): string =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

const createNewsId = (source: HealthNewsSource, value: string, fallback: string): string =>
  `${source.toLowerCase().replace(/\s+/g, '-')}-${slugify(value || fallback || Date.now().toString())}`;

const toOpenFdaIsoDate = (value: string | undefined): string => {
  if (!value) return new Date().toISOString();
  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return toIsoDateOrNow(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  return toIsoDateOrNow(value);
};

const deriveNewsSeverity = (value: string): AlertSeverity => {
  const text = value.toLowerCase();
  if (/(class i|critical|emergency|fatal|death|serious injury|listeria|botulism)/.test(text)) {
    return 'critical';
  }

  if (/(class ii|outbreak|recall|salmonella|e\. coli|lead|choking|suffocation|fall hazard)/.test(text)) {
    return 'high';
  }

  if (/(advisory|warning|allergen|undeclared|monitor|update)/.test(text)) {
    return 'medium';
  }

  return 'low';
};

const sortNewsItems = (items: HealthNewsItem[]): HealthNewsItem[] =>
  [...items].sort((left, right) => {
    const severityDiff =
      (SEVERITY_WEIGHT[right.severity] || 0) - (SEVERITY_WEIGHT[left.severity] || 0);

    if (severityDiff !== 0) return severityDiff;
    return new Date(right.published_at).getTime() - new Date(left.published_at).getTime();
  });

const uniqueNewsItems = (items: HealthNewsItem[]): HealthNewsItem[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.source}|${item.url || item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const response = await fetchWithTimeout(WHO_DON_ENDPOINT, {
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
    fetchWithTimeout(CDC_US_OUTBREAKS_ENDPOINT),
    fetchWithTimeout(CDC_INT_OUTBREAKS_ENDPOINT),
  ]);

  const usAlerts = usResponse.ok
    ? parseCdcFeed(await usResponse.text(), [DEFAULT_REGION, GLOBAL_REGION])
    : [];
  const internationalAlerts = internationalResponse.ok
    ? parseCdcFeed(await internationalResponse.text(), [GLOBAL_REGION])
    : [];

  return [...usAlerts, ...internationalAlerts];
};

const alertToNewsItem = (alert: HealthAlertInsert): HealthNewsItem => ({
  id: createNewsId(alert.source, alert.data_source_url, alert.disease_name),
  title: alert.disease_name,
  summary: alert.description || `${alert.source} health update`,
  source: alert.source,
  category: 'outbreak',
  severity: alert.severity,
  published_at: alert.start_date,
  url: alert.data_source_url,
  regions: alert.regions,
  affected_age_groups: alert.affected_age_groups,
});

const fetchWhoNews = async (): Promise<HealthNewsItem[]> =>
  (await fetchWhoAlerts()).map(alertToNewsItem);

const fetchCdcNews = async (): Promise<HealthNewsItem[]> =>
  (await fetchCdcAlerts()).map(alertToNewsItem);

const fetchOpenFdaNews = async (
  endpoint: string,
  category: 'food-recall' | 'device-recall',
): Promise<HealthNewsItem[]> => {
  const response = await fetchWithTimeout(endpoint);
  if (!response.ok) {
    throw new Error(`openFDA fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    results?: Array<{
      recall_number?: string;
      product_description?: string;
      reason_for_recall?: string;
      classification?: string;
      report_date?: string;
      recall_initiation_date?: string;
      distribution_pattern?: string;
      product_type?: string;
    }>;
  };

  return (payload.results || [])
    .map((item) => {
      const title = truncate(stripHtml(item.product_description || item.product_type || 'FDA recall'), 160);
      const reason = stripHtml(item.reason_for_recall || 'FDA recall notice');
      const classification = item.classification ? `${item.classification}. ` : '';
      const summary = truncate(
        `${classification}${reason}${
          item.distribution_pattern ? ` Distribution: ${item.distribution_pattern}` : ''
        }`,
        320,
      );
      const publishedAt = toOpenFdaIsoDate(item.report_date || item.recall_initiation_date);

      return {
        id: createNewsId('FDA', item.recall_number || title, publishedAt),
        title,
        summary,
        source: 'FDA' as const,
        category,
        severity: deriveNewsSeverity(`${classification} ${title} ${summary}`),
        published_at: publishedAt,
        url: FDA_RECALLS_URL,
        regions: [DEFAULT_REGION],
        affected_age_groups: DEFAULT_AGE_GROUPS,
      };
    })
    .filter((item) => item.title.trim().length > 0);
};

const fetchCpscChildProductNews = async (): Promise<HealthNewsItem[]> => {
  const responses = await Promise.all([
    fetchWithTimeout(CPSC_BABY_RECALLS_ENDPOINT),
    fetchWithTimeout(CPSC_TODDLER_RECALLS_ENDPOINT),
  ]);

  const payloads = await Promise.all(
    responses
      .filter((response) => response.ok)
      .map((response) => response.json() as Promise<any[]>),
  );

  return payloads.flat().map((item) => {
    const hazards = Array.isArray(item.Hazards)
      ? item.Hazards.map((hazard: any) => stripHtml(String(hazard?.Name || ''))).filter(Boolean)
      : [];
    const products = Array.isArray(item.Products)
      ? item.Products.map((product: any) => stripHtml(String(product?.Name || ''))).filter(Boolean)
      : [];
    const publishedAt = toIsoDateOrNow(item.LastPublishDate || item.RecallDate);
    const title = truncate(stripHtml(item.Title || products[0] || 'Children product recall'), 180);
    const summary = truncate(
      hazards[0] || stripHtml(item.Description || 'Consumer product safety recall.'),
      320,
    );

    return {
      id: createNewsId('CPSC', String(item.RecallID || item.URL || title), publishedAt),
      title,
      summary,
      source: 'CPSC' as const,
      category: 'product-safety' as const,
      severity: deriveNewsSeverity(`${title} ${summary}`),
      published_at: publishedAt,
      url: item.URL || 'https://www.cpsc.gov/Recalls',
      regions: [DEFAULT_REGION],
      affected_age_groups: DEFAULT_AGE_GROUPS,
    };
  });
};

const fetchUsdaFsisNews = async (): Promise<HealthNewsItem[]> => {
  const response = await fetchWithTimeout(USDA_FSIS_RECALLS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`USDA FSIS fetch failed with status ${response.status}`);
  }

  const payload = await response.json();
  const records = Array.isArray(payload)
    ? payload
    : payload?.results || payload?.data || payload?.items || payload?.rows || [];

  return records.slice(0, 10).map((item: any) => {
    const title = truncate(
      stripHtml(
        item.title ||
          item.recall_title ||
          item.field_title ||
          item.product_name ||
          item.name ||
          'USDA food safety recall',
      ),
      180,
    );
    const summary = truncate(
      stripHtml(
        item.summary ||
          item.field_summary ||
          item.reason ||
          item.reason_for_recall ||
          item.description ||
          'USDA FSIS recall or public health alert.',
      ),
      320,
    );
    const publishedAt = toIsoDateOrNow(
      item.recall_date || item.field_recall_date || item.date || item.created || item.published_at,
    );

    return {
      id: createNewsId('USDA FSIS', item.id || item.url || title, publishedAt),
      title,
      summary,
      source: 'USDA FSIS' as const,
      category: 'food-recall' as const,
      severity: deriveNewsSeverity(`${title} ${summary}`),
      published_at: publishedAt,
      url: item.url || item.link || USDA_RECALLS_URL,
      regions: [DEFAULT_REGION],
      affected_age_groups: DEFAULT_AGE_GROUPS,
    };
  });
};

/**
 * GET /api/health-alerts/news
 * Live family health updates from public health and safety sources.
 */
router.get('/news', async (req: AuthRequest, res: ExpressResponse) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const region = normalizeRegion(String(req.query.region || DEFAULT_REGION));
    const sourceRequests = [
      { source: 'WHO', load: fetchWhoNews },
      { source: 'CDC', load: fetchCdcNews },
      {
        source: 'FDA',
        load: () => fetchOpenFdaNews(FDA_FOOD_RECALLS_ENDPOINT, 'food-recall'),
      },
      {
        source: 'FDA',
        load: () => fetchOpenFdaNews(FDA_DEVICE_RECALLS_ENDPOINT, 'device-recall'),
      },
      { source: 'CPSC', load: fetchCpscChildProductNews },
      { source: 'USDA FSIS', load: fetchUsdaFsisNews },
    ] as const;

    const settled = await Promise.allSettled(sourceRequests.map((request) => request.load()));
    const failures = settled.flatMap((result, index) =>
      result.status === 'rejected'
        ? [{ source: sourceRequests[index].source, message: String(result.reason) }]
        : [],
    );
    const items = settled.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    );

    const filteredItems = uniqueNewsItems(items).filter((item) => {
      const regions = item.regions.map((itemRegion) => itemRegion.toUpperCase());
      return regions.includes(region) || regions.includes(GLOBAL_REGION);
    });

    return res.json({
      items: sortNewsItems(filteredItems).slice(0, NEWS_FEED_LIMIT),
      total: filteredItems.length,
      region,
      failures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch health news';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/health-alerts/active
 * Get active health alerts for the current user region.
 */
router.get('/active', async (req: AuthRequest, res: ExpressResponse) => {
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
router.post('/sync-external', async (req: AuthRequest, res: ExpressResponse) => {
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
router.post('/dismiss', async (req: AuthRequest, res: ExpressResponse) => {
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
