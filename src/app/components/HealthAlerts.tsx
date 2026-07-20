import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, Newspaper, RefreshCw, ShieldAlert, X } from 'lucide-react';
import {
  getActiveAlertsForUser,
  dismissAlert,
  syncExternalHealthAlerts,
  getHealthNewsFeed,
  HealthAlert,
  HealthNewsItem,
} from '@/lib/health-alerts-service';
import { useAuthStore } from '@/app/AppContext';

interface HealthAlertsProps {
  countryCode?: string;
  babyId?: string;
  babyName?: string;
}

type NewsCategoryFilter = 'all' | HealthNewsItem['category'];

const severityPillClasses: Record<HealthAlert['severity'], string> = {
  critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200',
  high: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
};

const categoryLabels: Record<HealthNewsItem['category'], string> = {
  outbreak: 'Outbreak',
  'food-recall': 'Food recall',
  'device-recall': 'Device recall',
  'product-safety': 'Product safety',
  guidance: 'Guidance',
};

const categoryFilters: Array<{
  id: NewsCategoryFilter;
  label: string;
  description: string;
}> = [
  { id: 'all', label: 'All Updates', description: 'Full source wire' },
  { id: 'outbreak', label: 'Outbreaks', description: 'CDC + WHO reports' },
  { id: 'food-recall', label: 'Food Recalls', description: 'FDA + USDA FSIS' },
  { id: 'device-recall', label: 'Device Recalls', description: 'FDA device safety' },
  { id: 'product-safety', label: 'Baby Products', description: 'CPSC recall feed' },
];

const sourceDirectory: Array<{
  source: HealthNewsItem['source'];
  title: string;
  description: string;
  url: string;
  accentClass: string;
}> = [
  {
    source: 'CDC',
    title: 'CDC Outbreaks',
    description: 'US and international outbreak RSS updates.',
    url: 'https://www.cdc.gov/outbreaks/',
    accentClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200',
  },
  {
    source: 'WHO',
    title: 'WHO Disease Outbreak News',
    description: 'Global outbreak and emergency disease reports.',
    url: 'https://www.who.int/emergencies/disease-outbreak-news',
    accentClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200',
  },
  {
    source: 'FDA',
    title: 'FDA Recalls',
    description: 'Food and medical device recall notices.',
    url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    accentClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200',
  },
  {
    source: 'USDA FSIS',
    title: 'USDA FSIS Recalls',
    description: 'Meat, poultry, and egg product safety alerts.',
    url: 'https://www.fsis.usda.gov/recalls-alerts',
    accentClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
  },
  {
    source: 'CPSC',
    title: 'CPSC Baby Product Recalls',
    description: 'Consumer product safety recalls for baby and toddler items.',
    url: 'https://www.cpsc.gov/Recalls',
    accentClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-200',
  },
];

const visualClasses = [
  'from-[#f7ede6] via-[#dcecf7] to-[#f9fafb]',
  'from-[#dff1ff] via-[#f4f7fb] to-[#fff5ef]',
  'from-[#f8e1dc] via-[#f6efe9] to-[#dfece7]',
  'from-[#e8edf2] via-[#f6f6f8] to-[#d8e9ee]',
  'from-[#eef0ff] via-[#faf9fc] to-[#e5f4ef]',
  'from-[#f8eadb] via-[#f7f7fb] to-[#e0edf7]',
];

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'official source';
  }
};

export function HealthAlerts({ countryCode, babyName }: HealthAlertsProps) {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [newsItems, setNewsItems] = useState<HealthNewsItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const region = countryCode || 'US';

  const loadUpdates = async (showLoading = false) => {
    if (!user?.id) {
      setAlerts([]);
      setNewsItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoading) setLoading(true);
    setRefreshing(true);

    await syncExternalHealthAlerts();

    const [alertData, newsData] = await Promise.all([
      getActiveAlertsForUser(user.id, region),
      getHealthNewsFeed(region),
    ]);

    setAlerts(alertData);
    setNewsItems(newsData);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user?.id) {
      setAlerts([]);
      setNewsItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let isMounted = true;

    const fetchAlerts = async () => {
      setLoading(true);
      setRefreshing(true);

      await syncExternalHealthAlerts();

      const [alertData, newsData] = await Promise.all([
        getActiveAlertsForUser(user.id, region),
        getHealthNewsFeed(region),
      ]);

      if (!isMounted) return;

      setAlerts(alertData);
      setNewsItems(newsData);
      setLoading(false);
      setRefreshing(false);
    };

    fetchAlerts();

    return () => {
      isMounted = false;
    };
  }, [user?.id, region]);

  const handleDismiss = async (alertId: string) => {
    if (!user?.id) return;

    const success = await dismissAlert(user.id, alertId);
    if (success) {
      setDismissed((prev) => new Set([...prev, alertId]));
    }
  };

  const activeAlerts = alerts.filter((alert) => !dismissed.has(alert.id));
  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === 'critical');
  const advisoryAlerts = activeAlerts.filter((alert) => alert.severity !== 'critical');
  const visibleNewsItems = useMemo(
    () =>
      selectedCategory === 'all'
        ? newsItems
        : newsItems.filter((item) => item.category === selectedCategory),
    [newsItems, selectedCategory],
  );
  const featuredItem = visibleNewsItems[0] || newsItems[0] || null;
  const cardItems = (featuredItem
    ? visibleNewsItems.filter((item) => item.id !== featuredItem.id)
    : visibleNewsItems
  ).slice(0, 6);
  const hasSelectedResults = visibleNewsItems.length > 0;
  const headline = babyName ? `${babyName}'s Health Updates` : 'Health Updates';

  const getFilterCount = (filter: NewsCategoryFilter) =>
    filter === 'all'
      ? newsItems.length
      : newsItems.filter((item) => item.category === filter).length;

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="rounded-[3rem] border border-border-gray bg-surface p-8 shadow-sm dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-secondary" />
            <div>
              <h2 className="font-headline text-2xl font-black tracking-tight text-foreground">
                Loading health updates
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-light">
                Checking CDC, WHO, FDA, CPSC, and USDA FSIS sources.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-[2rem] bg-surface-gray dark:bg-zinc-900"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="rounded-[2.5rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800 lg:sticky lg:top-6 lg:self-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-light">
              Source Wire
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black tracking-tight text-foreground">
              Health News
            </h2>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-text-dim">
              Official baby-care safety updates, recalls, and outbreak notices for {region}.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            {categoryFilters.map((filter) => {
              const isSelected = selectedCategory === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedCategory(filter.id)}
                  className={`w-full rounded-[1.4rem] border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-white bg-white text-foreground shadow-sm dark:border-zinc-700 dark:bg-zinc-900'
                      : 'border-transparent text-text-dim hover:bg-surface-gray dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black">{filter.label}</span>
                    <span className="rounded-full bg-surface-gray px-2 py-1 text-[9px] font-black text-text-light dark:bg-zinc-800">
                      {getFilterCount(filter.id)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-text-light">{filter.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[2rem] bg-secondary-container p-4 text-on-secondary-container dark:bg-blue-950/40 dark:text-blue-100">
            <p className="text-[10px] font-black uppercase tracking-widest">Stay Updated</p>
            <p className="mt-2 text-xs font-semibold leading-relaxed">
              Refresh pulls the latest connected source feed for your region.
            </p>
            <button
              type="button"
              onClick={() => loadUpdates(false)}
              disabled={refreshing}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Feed
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-light">
                Official Health Sources
              </p>
              <h1 className="mt-2 font-headline text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                {headline}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-text-dim">
                A calmer place to review recalls, advisories, and public-health updates without losing the original Cradlyn feel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadUpdates(false)}
              disabled={refreshing}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-border-gray bg-surface px-5 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm transition hover:bg-surface-gray disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {!user?.id && (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
              <p className="text-sm font-black">Sign in to receive live regional health updates.</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed">
                The official feed endpoint is protected so every family receives updates through their account.
              </p>
            </div>
          )}

          <a
            href={featuredItem?.url || sourceDirectory[0].url}
            target="_blank"
            rel="noreferrer"
            className={`group relative block min-h-[360px] overflow-hidden rounded-[3rem] bg-gradient-to-br ${
              visualClasses[0]
            } p-8 shadow-editorial ring-1 ring-border-gray transition hover:-translate-y-0.5 hover:shadow-xl dark:ring-zinc-800 sm:p-12`}
          >
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/60 blur-2xl dark:bg-white/10" />
            <div className="absolute bottom-0 right-0 h-56 w-72 rounded-tl-[6rem] bg-secondary/10" />
            <div className="absolute bottom-8 right-8 hidden h-28 w-28 items-center justify-center rounded-[2rem] border border-white/60 bg-white/40 text-secondary shadow-sm backdrop-blur sm:flex dark:border-white/10 dark:bg-white/10">
              <Newspaper className="h-12 w-12" />
            </div>
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary shadow-sm dark:bg-zinc-900/80">
                {featuredItem ? `${featuredItem.source} - ${categoryLabels[featuredItem.category]}` : 'Official source guide'}
              </span>
              <h2 className="mt-6 max-w-3xl font-headline text-4xl font-black leading-none tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {featuredItem?.title || 'Where Cradlyn gets family health news'}
              </h2>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-text-dim sm:text-base">
                {featuredItem?.summary ||
                  'We collect baby-relevant updates from CDC, WHO, FDA, CPSC, and USDA FSIS feeds, then show the most relevant alerts and recalls in one parent-friendly view.'}
              </p>
              <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-xs font-black text-foreground shadow-sm transition group-hover:gap-4 dark:bg-zinc-950">
                {featuredItem ? 'Read official update' : 'Review source list'}
                <ExternalLink className="h-4 w-4" />
              </div>
            </div>
          </a>

          {activeAlerts.length > 0 ? (
            <section className="grid gap-3 md:grid-cols-2">
              {[...criticalAlerts, ...advisoryAlerts].slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-[2rem] border p-5 ${severityPillClasses[alert.severity]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          {alert.severity} alert
                        </p>
                        <h3 className="mt-1 text-base font-black">{alert.disease_name}</h3>
                        <p className="mt-2 line-clamp-3 text-xs font-semibold leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      title="Dismiss alert"
                      onClick={() => handleDismiss(alert.id)}
                      className="rounded-full p-1.5 transition hover:bg-white/50 dark:hover:bg-black/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="flex items-center gap-3 rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800">
              <ShieldAlert className="h-5 w-5 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">
                No active regional health alerts right now.
              </p>
            </div>
          )}

          <section className="grid gap-5 lg:grid-cols-3">
            {hasSelectedResults ? (
              cardItems.map((item, index) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group rounded-[2.5rem] border border-border-gray bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 ${
                    index === 3 ? 'lg:col-span-2' : ''
                  }`}
                >
                  <div
                    className={`relative flex aspect-[1.35] items-end overflow-hidden rounded-[2rem] bg-gradient-to-br ${
                      visualClasses[(index + 1) % visualClasses.length]
                    } p-5`}
                  >
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/60 blur-xl dark:bg-white/10" />
                    <span className="relative rounded-full bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-secondary dark:bg-zinc-900/80">
                      {item.source}
                    </span>
                  </div>
                  <div className="px-1 pt-4">
                    <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-light">
                      <span>{categoryLabels[item.category]}</span>
                      <span>-</span>
                      <span>{formatDate(item.published_at)}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 font-headline text-xl font-black leading-tight tracking-tight text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-xs font-semibold leading-relaxed text-text-dim">
                      {item.summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-secondary">
                      <span>{getDomain(item.url)}</span>
                      <ExternalLink className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-[2.5rem] border border-dashed border-border-gray bg-surface p-8 text-center dark:border-zinc-800 lg:col-span-3">
                <Newspaper className="mx-auto h-8 w-8 text-text-light" />
                <h3 className="mt-4 font-headline text-xl font-black text-foreground">
                  No updates in this category yet.
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-text-dim">
                  Try All Updates or refresh the official feed. Some sources only publish when a new advisory or recall is active.
                </p>
              </div>
            )}
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {sourceDirectory.map((source) => {
              const count = newsItems.filter((item) => item.source === source.source).length;
              return (
                <a
                  key={source.source}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800"
                >
                  <span className={`inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${source.accentClass}`}>
                    {source.source}
                  </span>
                  <h3 className="mt-4 text-sm font-black leading-tight text-foreground">{source.title}</h3>
                  <p className="mt-2 line-clamp-3 text-[11px] font-semibold leading-relaxed text-text-dim">
                    {source.description}
                  </p>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-text-light">
                    {count} in feed
                  </p>
                </a>
              );
            })}
          </section>

          <section className="rounded-[3rem] bg-surface-gray p-8 text-center dark:bg-zinc-900 sm:p-12">
            <p className="font-headline text-3xl font-black tracking-tight text-foreground">
              Baby care updates in one calm place
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-text-dim">
              The feed is source-led and educational. Always follow your pediatric clinician for diagnosis, treatment, and urgent care decisions.
            </p>
            <button
              type="button"
              onClick={() => loadUpdates(false)}
              disabled={refreshing}
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-xs font-black text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Check Latest Sources
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
