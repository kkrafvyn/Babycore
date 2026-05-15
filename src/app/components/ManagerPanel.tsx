import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  Receipt,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  fetchAdminBilling,
  resolveAdminBillingEvent,
  retryAdminBillingEvent,
} from '../../lib/admin-api';
import {
  fetchManagerActivityLogs,
  fetchManagerDashboard,
  fetchManagerPermissions,
  fetchManagerReports,
} from '../../lib/manager-api';
import type { BillingEventRecord } from '../../lib/payment-api';
import { toast } from 'sonner';

interface ManagerPanelProps {
  onBack: () => void;
}

type ManagerSectionId = 'overview' | 'billing' | 'activity' | 'reports' | 'permissions';

const MotionDiv = motion.div as any;

const MANAGER_SECTIONS: Array<{
  id: ManagerSectionId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof ShieldCheck;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    eyebrow: 'Manager View',
    title: 'Limited Admin Workspace',
    description: 'Monitor platform health without full admin-only user controls.',
    Icon: BarChart3,
  },
  {
    id: 'billing',
    label: 'Billing',
    eyebrow: 'Payment Ops',
    title: 'Billing Recovery',
    description: 'Review failed payments, retry eligible references, and reconcile outcomes.',
    Icon: Receipt,
  },
  {
    id: 'activity',
    label: 'Activity',
    eyebrow: 'Operations Trail',
    title: 'Recent Platform Activity',
    description: 'Track the latest admin and manager actions across the system.',
    Icon: ScrollText,
  },
  {
    id: 'reports',
    label: 'Reports',
    eyebrow: 'Analytics',
    title: 'Manager Reports',
    description: 'View saved manager reports generated for operational review.',
    Icon: ClipboardList,
  },
  {
    id: 'permissions',
    label: 'Access',
    eyebrow: 'Role Boundary',
    title: 'Manager Permissions',
    description: 'See exactly which admin powers are available to this manager role.',
    Icon: ShieldCheck,
  },
];

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const getRecoveryClass = (status?: string | null): string => {
  switch (status) {
    case 'recovered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';
    case 'retry_scheduled':
    case 'retrying':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300';
    case 'abandoned':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300';
    default:
      return 'border-border-gray bg-surface-gray text-text-dim dark:border-zinc-700 dark:bg-zinc-900';
  }
};

export const ManagerPanel: React.FC<ManagerPanelProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleStatistics, setRoleStatistics] = useState<Record<string, number>>({});
  const [managerId, setManagerId] = useState('');
  const [activityLogs, setActivityLogs] = useState<Array<Record<string, any>>>([]);
  const [reports, setReports] = useState<Array<Record<string, any>>>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [billingEvents, setBillingEvents] = useState<BillingEventRecord[]>([]);
  const [billingSummary, setBillingSummary] = useState({
    total: 0,
    failed: 0,
    retrying: 0,
    recovered: 0,
    abandoned: 0,
  });
  const [billingActingReference, setBillingActingReference] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ManagerSectionId>('overview');

  const loadWorkspace = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [dashboard, activity, managerReports, managerPermissions, billing] = await Promise.all([
      fetchManagerDashboard(),
      fetchManagerActivityLogs(),
      fetchManagerReports(),
      fetchManagerPermissions(),
      fetchAdminBilling({ limit: 20, offset: 0, status: 'failed' }),
    ]);

    if (!dashboard.success || !dashboard.data) {
      setError(dashboard.error || 'Unable to load manager dashboard.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setRoleStatistics(dashboard.data.roleStatistics || {});
    setManagerId(dashboard.data.managerId || '');
    setActivityLogs(activity.success && activity.data ? activity.data.logs || [] : dashboard.data.recentActivity || []);
    setReports(managerReports.success && managerReports.data ? managerReports.data.reports || [] : []);
    setPermissions(managerPermissions.success && managerPermissions.data ? managerPermissions.data : {});
    setBillingEvents(billing.success && billing.data ? billing.data.events || [] : []);
    setBillingSummary(
      billing.success && billing.data
        ? billing.data.summary
        : {
            total: 0,
            failed: 0,
            retrying: 0,
            recovered: 0,
            abandoned: 0,
          },
    );
    setLoading(false);
    setRefreshing(false);
  };

  const handleSectionChange = (sectionId: ManagerSectionId) => {
    setActiveSection(sectionId);
    window.requestAnimationFrame(() => {
      document.getElementById(`manager-${sectionId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleRetryBilling = async (reference: string) => {
    setBillingActingReference(reference);
    const result = await retryAdminBillingEvent(reference);
    setBillingActingReference(null);

    if (!result.success) {
      toast.error(result.error || `Failed to retry ${reference}.`);
      return;
    }

    toast.success(result.message || `Retry requested for ${reference}.`);
    await loadWorkspace(true);
  };

  const handleResolveBilling = async (reference: string, status: 'reconciled' | 'cancelled') => {
    const notes = window.prompt(
      status === 'reconciled'
        ? 'Optional notes for marking this payment reconciled:'
        : 'Optional notes for marking this payment cancelled:',
      '',
    );

    setBillingActingReference(reference);
    const result = await resolveAdminBillingEvent({
      reference,
      status,
      notes: notes || undefined,
    });
    setBillingActingReference(null);

    if (!result.success) {
      toast.error(result.error || `Failed to update ${reference}.`);
      return;
    }

    toast.success(result.message || `${reference} updated.`);
    await loadWorkspace(true);
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const roleEntries = useMemo(
    () => Object.entries(roleStatistics).sort((a, b) => Number(b[1]) - Number(a[1])),
    [roleStatistics],
  );
  const permissionEntries = useMemo(() => Object.entries(permissions), [permissions]);
  const activeSectionMeta = useMemo(
    () => MANAGER_SECTIONS.find((section) => section.id === activeSection) || MANAGER_SECTIONS[0],
    [activeSection],
  );
  const ActiveSectionIcon = activeSectionMeta.Icon;

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Manager Workspace</span>
        </div>

        <button
          onClick={() => void loadWorkspace(true)}
          disabled={refreshing || loading}
          className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg disabled:opacity-60 active:scale-90 transition-all"
          title="Refresh manager data"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-28">
        <nav className="fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block" aria-label="Manager sections">
          <div className="flex w-[5.75rem] flex-col gap-2 rounded-[2rem] border border-border-gray bg-surface/90 p-2 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:border-zinc-800 dark:bg-zinc-950/90">
            {MANAGER_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              const SectionIcon = section.Icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={isActive}
                  title={section.label}
                  onClick={() => handleSectionChange(section.id)}
                  className={`flex flex-col items-center gap-1 rounded-[1.45rem] px-2 py-3 text-[8px] font-black uppercase tracking-[0.14em] transition-all ${
                    isActive
                      ? 'bg-foreground text-background shadow-lg shadow-black/10'
                      : 'text-text-light hover:bg-surface-gray hover:text-foreground dark:hover:bg-zinc-900'
                  }`}
                >
                  <SectionIcon size={17} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <nav
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 lg:hidden"
          aria-label="Manager sections"
        >
          <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[2rem] border border-white/10 bg-[#1c1c1e]/95 p-2 shadow-2xl shadow-black/25 backdrop-blur-2xl">
            {MANAGER_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              const SectionIcon = section.Icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleSectionChange(section.id)}
                  className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[7px] font-black uppercase tracking-[0.12em] transition-all ${
                    isActive ? 'bg-white text-[#1c1c1e]' : 'text-white/55 hover:text-white'
                  }`}
                >
                  <SectionIcon size={15} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="bg-surface rounded-[3rem] p-8 border border-border-gray dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                  {activeSectionMeta.eyebrow}
                </p>
                <h2 className="text-2xl font-headline font-black text-foreground tracking-tight mt-2">
                  {activeSectionMeta.title}
                </h2>
                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-text-dim">
                  {activeSectionMeta.description}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                <ActiveSectionIcon size={20} />
              </div>
            </div>
            <p className="text-[11px] font-bold text-text-dim mt-4 break-all">
              Manager ID: {managerId || '-'}
            </p>
          </div>

          {error && (
            <MotionDiv
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-[2rem] p-6"
            >
              <p className="text-sm font-black text-red-600 dark:text-red-300">{error}</p>
            </MotionDiv>
          )}

          {loading ? (
            <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-8 text-center">
              <p className="text-sm font-bold text-text-light">Loading manager workspace...</p>
            </div>
          ) : (
            <>
              <div id="manager-overview" className="space-y-4 scroll-mt-36">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Role Snapshot
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {roleEntries.map(([role, count]) => (
                    <div
                      key={role}
                      className="bg-surface rounded-[1.6rem] border border-border-gray dark:border-zinc-800 p-4"
                    >
                      <p className="text-[9px] font-black text-text-light uppercase tracking-widest">{role}</p>
                      <p className="text-2xl font-headline font-black text-foreground mt-2">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="manager-billing" className="space-y-4 scroll-mt-36">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Billing Recovery
                </h3>
                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { label: 'Failed', value: billingSummary.failed },
                      { label: 'Retrying', value: billingSummary.retrying },
                      { label: 'Recovered', value: billingSummary.recovered },
                      { label: 'Abandoned', value: billingSummary.abandoned },
                      { label: 'Visible', value: billingSummary.total },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 px-3 py-3"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-light">{item.label}</p>
                        <p className="mt-1 text-lg font-headline font-black text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {billingEvents.length === 0 ? (
                    <p className="text-sm font-bold text-text-light">No failed billing events right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {billingEvents.map((entry) => {
                        const isActing = billingActingReference === entry.reference;

                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-foreground truncate">
                                  {entry.plan_name || 'Premium Access'}
                                </p>
                                <p className="text-[10px] font-semibold text-text-light break-all">{entry.reference}</p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                                  {entry.status} | {entry.currency || 'USD'} {Number(entry.amount || 0).toFixed(2)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getRecoveryClass(
                                  entry.recovery_status,
                                )}`}
                              >
                                {entry.recovery_status || 'not_needed'}
                              </span>
                            </div>

                            <p className="text-[10px] font-semibold text-text-dim">
                              {entry.customer_email || '-'} | {formatDateTime(entry.attempted_at)}
                            </p>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => void handleRetryBilling(entry.reference)}
                                disabled={isActing || entry.provider !== 'paystack'}
                                className="rounded-lg bg-secondary text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 disabled:opacity-50"
                              >
                                Retry
                              </button>
                              <button
                                onClick={() => void handleResolveBilling(entry.reference, 'reconciled')}
                                disabled={isActing}
                                className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-foreground disabled:opacity-50"
                              >
                                Reconcile
                              </button>
                              <button
                                onClick={() => void handleResolveBilling(entry.reference, 'cancelled')}
                                disabled={isActing}
                                className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-red-600 dark:text-red-300 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div id="manager-activity" className="space-y-4 scroll-mt-36">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Activity Trail
                </h3>
                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm font-bold text-text-light">No activity logs available.</p>
                  ) : (
                    activityLogs.slice(0, 8).map((log, index) => (
                      <div
                        key={`${log.id || index}`}
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                          {String(log.action || 'action')}
                        </p>
                        <p className="text-[10px] font-semibold text-text-light mt-1">
                          {formatDateTime(String(log.created_at || ''))}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div id="manager-reports" className="space-y-4 scroll-mt-36">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Reports
                </h3>
                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  {reports.length === 0 ? (
                    <p className="text-sm font-bold text-text-light">No manager reports found.</p>
                  ) : (
                    reports.slice(0, 8).map((report, index) => (
                      <div
                        key={`${report.id || index}`}
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3"
                      >
                        <p className="text-sm font-black text-foreground">{String(report.title || 'Report')}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                          {String(report.report_type || 'custom')}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-text-light">
                          {formatDateTime(String(report.generated_at || report.created_at || ''))}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div id="manager-permissions" className="space-y-4 scroll-mt-36">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Role Powers
                </h3>
                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-2">
                  {permissionEntries.map(([permission, enabled]) => (
                    <div
                      key={permission}
                      className="bg-surface-gray dark:bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light">{permission}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          enabled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'
                        }`}
                      >
                        {enabled ? 'On' : 'Off'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
