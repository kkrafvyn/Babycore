import { createSupabaseAdminClient } from './supabase';

export type HealthAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type HealthAlertInsert = {
  type: 'epidemic' | 'seasonal' | 'outbreak' | 'warning';
  disease_name: string;
  regions: string[];
  severity: HealthAlertSeverity;
  start_date: string;
  end_date: string;
  description?: string;
  prevention_tips?: string;
  affected_age_groups: string[];
  source: 'WHO' | 'CDC';
  data_source_url: string;
};

const WHO_DON_ENDPOINT =
  'https://www.who.int/api/news/diseaseoutbreaknews?$top=40&$orderby=PublicationDateAndTime%20desc&$select=Title,PublicationDateAndTime,ItemDefaultUrl,UrlName,Summary,Advice';
const CDC_US_OUTBREAKS_ENDPOINT = 'https://www.cdc.gov/outbreaks/rss/us-outbreaks.html';
const CDC_INT_OUTBREAKS_ENDPOINT = 'https://www.cdc.gov/outbreaks/rss/int-outbreaks.html';
const ACTIVE_WINDOW_DAYS = 180;
const GLOBAL_REGION = 'GLOBAL';
const DEFAULT_REGION = 'US';
const DEFAULT_AGE_GROUPS = ['0-6', '6-12', '12+'];

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();
const stripHtml = (value: string): string =>
  normalizeWhitespace(value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' '));
const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

const toIsoDateOrNow = (value: string | undefined): string => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const deriveSeverity = (value: string): HealthAlertSeverity => {
  const text = value.toLowerCase();
  if (/(critical|emergency|fatal|death|marburg|ebola|nipah|polio|cholera|measles)/.test(text)) {
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

const normalizeCdcUrl = (href: string): string => {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://www.cdc.gov${href}`;
  return `https://www.cdc.gov/${href}`;
};

const parseAnnouncementDate = (label: string): string => {
  const cleaned = label.replace(/^announced\s+/i, '').trim();
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const parseCdcFeed = (html: string, regions: string[]): HealthAlertInsert[] => {
  const itemRegex =
    /<li>\s*<a[^>]*href="([^"]+)"[^>]*class="feed-item-title"[^>]*>([\s\S]*?)<\/a>\s*<span[^>]*class="item-pubdate"[^>]*>([\s\S]*?)<\/span>\s*<\/li>/gi;

  const alerts: HealthAlertInsert[] = [];
  let match = itemRegex.exec(html);
  while (match) {
    const href = normalizeCdcUrl(match[1] || '');
    const title = stripHtml(match[2] || '');
    const announcedLabel = stripHtml(match[3] || '');
    const startDate = parseAnnouncementDate(announcedLabel);

    if (title) {
      const description = truncate(
        announcedLabel
          ? `${announcedLabel}. Latest update from CDC outbreak monitoring.`
          : 'Latest update from CDC outbreak monitoring.',
        280,
      );

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

const normalizeWhoItemUrl = (itemDefaultUrl?: string, urlName?: string): string => {
  const slug = (urlName || itemDefaultUrl || '').replace(/^\/+/, '').trim();
  if (!slug) return 'https://www.who.int/emergencies/disease-outbreak-news';
  if (slug.startsWith('http://') || slug.startsWith('https://')) return slug;
  return `https://www.who.int/emergencies/disease-outbreak-news/item/${slug}`;
};

export const syncExternalHealthAlerts = async (): Promise<{
  synced: number;
  inserted: number;
  skipped: number;
}> => {
  const supabase = createSupabaseAdminClient();

  const [whoResponse, cdcUsResponse, cdcIntResponse] = await Promise.all([
    fetch(WHO_DON_ENDPOINT, { headers: { Accept: 'application/json' } }),
    fetch(CDC_US_OUTBREAKS_ENDPOINT),
    fetch(CDC_INT_OUTBREAKS_ENDPOINT),
  ]);

  const whoCandidates: HealthAlertInsert[] = [];
  if (whoResponse.ok) {
    const payload = (await whoResponse.json()) as {
      value?: Array<{
        Title?: string;
        PublicationDateAndTime?: string;
        ItemDefaultUrl?: string;
        UrlName?: string;
        Summary?: string;
        Advice?: string;
      }>;
    };

    for (const item of payload.value || []) {
      const title = normalizeWhitespace(item.Title || '');
      if (!title) continue;
      const startDate = toIsoDateOrNow(item.PublicationDateAndTime);
      const summary = stripHtml(item.Summary || '');
      const advice = stripHtml(item.Advice || '');
      whoCandidates.push({
        type: /global situation|global update|multi-country/i.test(title) ? 'epidemic' : 'outbreak',
        disease_name: truncate(title, 190),
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
  }

  const cdcCandidates = [
    ...(cdcUsResponse.ok ? parseCdcFeed(await cdcUsResponse.text(), [DEFAULT_REGION, GLOBAL_REGION]) : []),
    ...(cdcIntResponse.ok ? parseCdcFeed(await cdcIntResponse.text(), [GLOBAL_REGION]) : []),
  ];

  const candidates = [...whoCandidates, ...cdcCandidates];

  const { data: existingRows } = await supabase
    .from('health_alerts')
    .select('source,data_source_url')
    .not('data_source_url', 'is', null);

  const existingKeys = new Set(
    (existingRows || []).map((row: any) => `${String(row.source || '').toUpperCase()}|${String(row.data_source_url || '').trim()}`),
  );

  const uniqueCandidates = candidates.filter((candidate, index, array) => {
    const key = `${candidate.source.toUpperCase()}|${candidate.data_source_url.trim()}`;
    return array.findIndex((item) => `${item.source.toUpperCase()}|${item.data_source_url.trim()}` === key) === index;
  });

  const freshAlerts = uniqueCandidates.filter((candidate) => {
    const key = `${candidate.source.toUpperCase()}|${candidate.data_source_url.trim()}`;
    return !existingKeys.has(key);
  });

  if (freshAlerts.length > 0) {
    const { error } = await supabase.from('health_alerts').insert(freshAlerts);
    if (error) throw error;
  }

  return {
    synced: uniqueCandidates.length,
    inserted: freshAlerts.length,
    skipped: uniqueCandidates.length - freshAlerts.length,
  };
};

export const normalizeRegion = (value: string | null | undefined): string => {
  const normalized = (value || DEFAULT_REGION).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_REGION;
};

export const isActiveAlert = (endDate: string | null | undefined): boolean => {
  if (!endDate) return true;
  const endAt = new Date(endDate).getTime();
  return Number.isFinite(endAt) && endAt >= Date.now();
};

export const GLOBAL_HEALTH_REGION = GLOBAL_REGION;
