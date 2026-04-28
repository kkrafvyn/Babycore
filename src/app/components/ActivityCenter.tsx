import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  CreditCard,
  Pill,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getActivityCenterFeed,
  type ActivityCenterCategory,
  type ActivityCenterEvent,
  type ActivityCenterFeedResponse,
} from '@/lib/care-advanced-api';

interface ActivityCenterProps {
  babyId: string;
  babyName: string;
  onBack: () => void;
}

type ActivityFilter = 'all' | 'urgent' | ActivityCenterCategory;

const FILTERS: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'care', label: 'Care' },
  { value: 'sharing', label: 'Sharing' },
  { value: 'billing', label: 'Billing' },
];

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const toneClasses: Record<string, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200',
  critical:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200',
};

const categoryLabel: Record<ActivityCenterCategory, string> = {
  care: 'Care',
  sharing: 'Sharing',
  billing: 'Billing',
};

function getEventIcon(event: ActivityCenterEvent) {
  switch (event.kind) {
    case 'payment':
      return CreditCard;
    case 'medication_dose':
      return Pill;
    case 'family_invite':
      return Users;
    case 'care_approval':
      return ShieldCheck;
    case 'emergency_share_access':
      return Activity;
    default:
      return Activity;
  }
}

export function ActivityCenter({ babyId, babyName, onBack }: ActivityCenterProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<ActivityCenterFeedResponse | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const loadFeed = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const data = await getActivityCenterFeed(babyId, 40);
      setFeed(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load the activity center right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, [babyId]);

  const filteredItems = useMemo(() => {
    const items = feed?.items || [];
    if (filter === 'all') return items;
    if (filter === 'urgent') {
      return items.filter((item) => item.tone === 'warning' || item.tone === 'critical');
    }
    return items.filter((item) => item.category === filter);
  }, [feed?.items, filter]);

  const generatedLabel = feed?.generatedAt ? relativeTime(feed.generatedAt) : null;

  const openLinkedView = (event: ActivityCenterEvent) => {
    const targetView = String(event.deepLink || '').replace(/^\/+/, '').trim();
    if (!targetView) return;
    window.dispatchEvent(new CustomEvent('nav_deep_link', { detail: { view: targetView } }));
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-gray bg-background/85 px-3 backdrop-blur-xl dark:border-zinc-800/50 sm:h-20 sm:px-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="p-2 text-primary transition-all hover:scale-110 active:scale-95 dark:text-zinc-400"
          >
            <ChevronLeft size={22} className="sm:h-6 sm:w-6" />
          </button>
          <span className="text-xl font-headline font-black tracking-tight text-foreground">
            Activity Center
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-3 pb-24 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="rounded-[2rem] border border-border-gray bg-surface p-5 shadow-sm dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">
                  Unified Feed
                </p>
                <h2 className="mt-1 text-2xl font-headline font-black tracking-tight text-foreground">
                  {feed?.babyName || babyName}
                </h2>
                <p className="mt-2 text-xs font-semibold text-text-dim">
                  See emergency access, care approvals, missed medication doses, and billing recovery updates in one
                  place.
                </p>
              </div>
              <button
                onClick={() => void loadFeed('refresh')}
                disabled={refreshing}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-gray bg-surface-gray text-foreground transition-all disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                title="Refresh activity"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-gray px-3 py-1 text-[10px] font-black uppercase tracking-widest text-foreground dark:bg-zinc-900">
                {feed?.role || 'owner'}
              </span>
              {generatedLabel && (
                <span className="rounded-full bg-surface-gray px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-dim dark:bg-zinc-900">
                  Updated {generatedLabel}
                </span>
              )}
            </div>
          </div>

          {feed && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Urgent</p>
                <p className="mt-2 text-2xl font-headline font-black text-foreground">{feed.summary.urgent}</p>
                <p className="mt-1 text-[11px] font-semibold text-text-dim">High-signal updates to review first</p>
              </div>
              <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Action Needed</p>
                <p className="mt-2 text-2xl font-headline font-black text-foreground">{feed.summary.actionRequired}</p>
                <p className="mt-1 text-[11px] font-semibold text-text-dim">Pending approvals or follow-up items</p>
              </div>
              <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Sharing</p>
                <p className="mt-2 text-2xl font-headline font-black text-foreground">{feed.summary.sharing}</p>
                <p className="mt-1 text-[11px] font-semibold text-text-dim">Emergency and family access activity</p>
              </div>
              <div className="rounded-[1.6rem] border border-border-gray bg-surface p-4 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-light">Billing</p>
                <p className="mt-2 text-2xl font-headline font-black text-foreground">{feed.summary.billing}</p>
                <p className="mt-1 text-[11px] font-semibold text-text-dim">Recovery and payment watch items</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`h-10 shrink-0 rounded-full border px-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === item.value
                    ? 'border-secondary bg-secondary text-white'
                    : 'border-border-gray bg-surface text-foreground dark:border-zinc-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 text-sm font-semibold text-text-light dark:border-zinc-800">
              Loading activity feed...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 dark:border-rose-900 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-500" />
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="rounded-[2rem] border border-border-gray bg-surface p-5 dark:border-zinc-800">
              <p className="text-sm font-semibold text-text-dim">
                No activity matched this filter yet.
              </p>
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <div className="space-y-3">
              {filteredItems.map((event) => {
                const Icon = getEventIcon(event);
                return (
                  <div
                    key={event.id}
                    className={`rounded-[1.7rem] border p-4 ${toneClasses[event.tone] || toneClasses.info}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-current dark:bg-black/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-black/20">
                            {categoryLabel[event.category]}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                            {relativeTime(event.occurredAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-black text-current">{event.title}</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed opacity-90">
                          {event.summary}
                        </p>
                        {event.deepLink && (
                          <button
                            onClick={() => openLinkedView(event)}
                            className="mt-3 rounded-full bg-white/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-current dark:bg-black/20"
                          >
                            Open related screen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
