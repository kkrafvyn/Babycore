import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  Receipt,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  fetchAdminBilling,
  resolveAdminBillingEvent,
  retryAdminBillingEvent,
} from "../../lib/admin-api";
import {
  createManagerReport,
  fetchManagerActivityLogs,
  fetchManagerDashboard,
  fetchManagerPermissions,
  fetchManagerReports,
} from "../../lib/manager-api";
import type { BillingEventRecord } from "../../lib/payment-api";
import { toast } from "sonner";

interface ManagerPanelProps {
  onBack: () => void;
}

type ManagerSectionId =
  | "overview"
  | "billing"
  | "activity"
  | "reports"
  | "settings";

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
    id: "overview",
    label: "Overview",
    eyebrow: "Manager View",
    title: "Limited Admin Workspace",
    description:
      "Monitor platform health without full admin-only user controls.",
    Icon: BarChart3,
  },
  {
    id: "billing",
    label: "Billing",
    eyebrow: "Payment Ops",
    title: "Billing Recovery",
    description:
      "Review failed payments, retry eligible references, and reconcile outcomes.",
    Icon: Receipt,
  },
  {
    id: "activity",
    label: "Activity",
    eyebrow: "Operations Trail",
    title: "Recent Platform Activity",
    description:
      "Track the latest admin and manager actions across the system.",
    Icon: ScrollText,
  },
  {
    id: "reports",
    label: "Reports",
    eyebrow: "Analytics",
    title: "Manager Reports",
    description: "View saved manager reports generated for operational review.",
    Icon: ClipboardList,
  },
  {
    id: "settings",
    label: "Settings",
    eyebrow: "Role Boundary",
    title: "Manager Settings",
    description:
      "Review manager permissions and confirm role changes stay admin-only.",
    Icon: ShieldCheck,
  },
];

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const getRecoveryClass = (status?: string | null): string => {
  switch (status) {
    case "recovered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300";
    case "retry_scheduled":
    case "retrying":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300";
    case "abandoned":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300";
    default:
      return "border-border-gray bg-surface-gray text-text-dim dark:border-zinc-700 dark:bg-zinc-900";
  }
};

const ManagerEmptyState = ({
  Icon,
  title,
  description,
}: {
  Icon: typeof ShieldCheck;
  title: string;
  description: string;
}) => (
  <div className="rounded-[2rem] border border-dashed border-slate-300/80 bg-white/60 p-6 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-zinc-200">
      <Icon size={20} />
    </div>
    <p className="mt-4 text-sm font-headline font-black tracking-tight text-foreground">
      {title}
    </p>
    <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-text-light">
      {description}
    </p>
  </div>
);

export const ManagerPanel: React.FC<ManagerPanelProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleStatistics, setRoleStatistics] = useState<Record<string, number>>(
    {},
  );
  const [managerId, setManagerId] = useState("");
  const [activityLogs, setActivityLogs] = useState<Array<Record<string, any>>>(
    [],
  );
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
  const [billingActingReference, setBillingActingReference] = useState<
    string | null
  >(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ManagerSectionId>("overview");
  const mainRef = React.useRef<HTMLElement | null>(null);

  const loadWorkspace = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [dashboard, activity, managerReports, managerPermissions, billing] =
      await Promise.all([
        fetchManagerDashboard(),
        fetchManagerActivityLogs(),
        fetchManagerReports(),
        fetchManagerPermissions(),
        fetchAdminBilling({ limit: 20, offset: 0, status: "failed" }),
      ]);

    if (!dashboard.success || !dashboard.data) {
      setError(dashboard.error || "Unable to load manager dashboard.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setRoleStatistics(dashboard.data.roleStatistics || {});
    setManagerId(dashboard.data.managerId || "");
    setActivityLogs(
      activity.success && activity.data
        ? activity.data.logs || []
        : dashboard.data.recentActivity || [],
    );
    setReports(
      managerReports.success && managerReports.data
        ? managerReports.data.reports || []
        : [],
    );
    setPermissions(
      managerPermissions.success && managerPermissions.data
        ? managerPermissions.data
        : {},
    );
    setBillingEvents(
      billing.success && billing.data ? billing.data.events || [] : [],
    );
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
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleResolveBilling = async (
    reference: string,
    status: "reconciled" | "cancelled",
  ) => {
    const notes = window.prompt(
      status === "reconciled"
        ? "Optional notes for marking this payment reconciled:"
        : "Optional notes for marking this payment cancelled:",
      "",
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

  const roleEntries = useMemo(
    () =>
      Object.entries(roleStatistics).sort(
        (a, b) => Number(b[1]) - Number(a[1]),
      ),
    [roleStatistics],
  );
  const permissionEntries = useMemo(
    () => Object.entries(permissions),
    [permissions],
  );
  const activeSectionMeta = useMemo(
    () =>
      MANAGER_SECTIONS.find((section) => section.id === activeSection) ||
      MANAGER_SECTIONS[0],
    [activeSection],
  );
  const ActiveSectionIcon = activeSectionMeta.Icon;
  const totalAccountsVisible = roleEntries.reduce(
    (sum, [, count]) => sum + Number(count || 0),
    0,
  );
  const enabledPermissionCount = permissionEntries.filter(([, enabled]) =>
    Boolean(enabled),
  ).length;
  const generatedManagerReport = useMemo(() => {
    const failedBilling = Number(billingSummary.failed || 0);
    const retryingBilling = Number(billingSummary.retrying || 0);
    const recoveredBilling = Number(billingSummary.recovered || 0);
    const operationalRisk =
      failedBilling > 0
        ? "Needs payment recovery review"
        : activityLogs.length === 0
          ? "Quiet activity period"
          : "Stable";
    const insights = [
      failedBilling > 0
        ? `${failedBilling} failed payment event${failedBilling === 1 ? "" : "s"} need recovery action.`
        : "No failed payment events are currently visible.",
      retryingBilling > 0
        ? `${retryingBilling} payment event${retryingBilling === 1 ? " is" : "s are"} already retrying.`
        : "No payment retries are currently in progress.",
      recoveredBilling > 0
        ? `${recoveredBilling} payment event${recoveredBilling === 1 ? " has" : "s have"} recovered.`
        : "No recovered payment events are visible in this filtered view.",
      `${enabledPermissionCount}/${permissionEntries.length || 0} manager powers are enabled.`,
      `${activityLogs.length} recent activity log${activityLogs.length === 1 ? "" : "s"} loaded for review.`,
    ];

    return {
      summary: `${operationalRisk}. Visible roles: ${totalAccountsVisible}. Failed billing: ${failedBilling}. Reports saved: ${reports.length}.`,
      insights,
      metrics: {
        totalAccountsVisible,
        roleStatistics,
        billingSummary,
        recentActivityCount: activityLogs.length,
        savedReportsCount: reports.length,
        enabledPermissionCount,
        totalPermissionCount: permissionEntries.length,
      },
    };
  }, [
    activityLogs.length,
    billingSummary,
    enabledPermissionCount,
    permissionEntries.length,
    reports.length,
    roleStatistics,
    totalAccountsVisible,
  ]);
  const handleSaveGeneratedReport = async () => {
    setGeneratingReport(true);
    const result = await createManagerReport({
      reportType: "daily",
      title: `Operations readiness report - ${new Date().toLocaleDateString()}`,
      description: generatedManagerReport.summary,
      metrics: generatedManagerReport.metrics,
    });
    setGeneratingReport(false);

    if (!result.success) {
      toast.error(result.error || "Failed to save manager report.");
      return;
    }

    toast.success(result.message || "Manager report saved.");
    await loadWorkspace(true);
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const managerHeroStats = [
    { label: "Visible roles", value: totalAccountsVisible },
    { label: "Failed billing", value: billingSummary.failed },
    { label: "Reports", value: reports.length },
    {
      label: "Powers on",
      value: `${enabledPermissionCount}/${permissionEntries.length || 0}`,
    },
  ];

  return (
    <div className="fit-screen relative overflow-hidden bg-[#f7f8fb] dark:bg-[#050507]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-28 top-8 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute right-[-9rem] top-36 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute bottom-[-11rem] left-1/4 h-96 w-96 rounded-full bg-slate-200/70 blur-3xl dark:bg-indigo-500/10" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-[1.75rem] border border-white/70 bg-white/80 px-4 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-all hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-zinc-200"
              aria-label="Go back"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-light">
                Babycore Ops
              </p>
              <h1 className="truncate text-lg font-headline font-black tracking-tight text-foreground sm:text-xl">
                Manager Workspace
              </h1>
            </div>
          </div>

          <button
            onClick={() => void loadWorkspace(true)}
            disabled={refreshing || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white shadow-lg shadow-slate-950/15 transition-all active:scale-95 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
            title="Refresh manager data"
            aria-label="Refresh manager data"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main
        ref={mainRef}
        className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-4 pb-36 pt-28 sm:px-6 sm:pb-32 lg:px-10 lg:pl-36"
      >
        <nav
          className="fixed left-5 top-28 z-40 hidden lg:block"
          aria-label="Manager sections"
        >
          <div className="flex w-[6.25rem] flex-col gap-2 rounded-[2rem] border border-white/70 bg-white/80 p-2 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
            <p className="px-2 pb-1 pt-2 text-center text-[9px] font-black uppercase tracking-[0.24em] text-text-light">
              Manager
            </p>
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
                      ? "bg-[#111827] text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-zinc-950"
                      : "text-text-light hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/10"
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
                    isActive
                      ? "bg-white text-[#1c1c1e]"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  <SectionIcon size={15} />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mx-auto w-full max-w-6xl space-y-12 sm:space-y-8">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-white/75 bg-white/80 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75 sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-emerald-300 to-slate-500" />
            <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-zinc-950">
                    Limited admin
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Safe ops mode
                  </span>
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-text-light">
                  {activeSectionMeta.eyebrow}
                </p>
                <h2 className="mt-3 max-w-2xl text-4xl font-headline font-black tracking-[-0.06em] text-foreground sm:text-5xl">
                  {activeSectionMeta.title}
                </h2>
                <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-text-dim sm:text-base">
                  {activeSectionMeta.description}
                </p>
                <p className="mt-5 break-all text-[11px] font-bold uppercase tracking-[0.16em] text-text-light">
                  Manager ID {managerId || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center justify-between rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-white dark:text-zinc-950">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
                      Viewing
                    </p>
                    <p className="mt-1 text-lg font-headline font-black tracking-tight">
                      {activeSectionMeta.label}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 dark:bg-zinc-950/10">
                    <ActiveSectionIcon size={20} />
                  </div>
                </div>
                {managerHeroStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.55rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-headline font-black tracking-tight text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <MotionDiv
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-[2rem] p-6"
            >
              <p className="text-sm font-black text-red-600 dark:text-red-300">
                {error}
              </p>
            </MotionDiv>
          )}

          {loading ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
              <p className="text-sm font-bold text-text-light">
                Loading manager workspace...
              </p>
            </div>
          ) : (
            <>
              <div
                id="manager-overview"
                className={activeSection === "overview" ? "space-y-4" : "hidden"}
              >
                <div className="px-1">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    Role Snapshot
                  </p>
                  <h3 className="mt-1 text-xl font-headline font-black tracking-tight text-foreground">
                    Operational account mix
                  </h3>
                </div>
                {roleEntries.length === 0 && (
                  <ManagerEmptyState
                    Icon={BarChart3}
                    title="No role statistics yet"
                    description="Manager overview data will appear as soon as the backend returns account statistics."
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {roleEntries.map(([role, count]) => (
                    <div
                      key={role}
                      className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-[9px] font-black text-text-light uppercase tracking-widest">
                        {role}
                      </p>
                      <p className="text-2xl font-headline font-black text-foreground mt-2">
                        {count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                id="manager-billing"
                className={activeSection === "billing" ? "space-y-4" : "hidden"}
              >
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Billing Recovery
                </h3>
                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { label: "Failed", value: billingSummary.failed },
                      { label: "Retrying", value: billingSummary.retrying },
                      { label: "Recovered", value: billingSummary.recovered },
                      { label: "Abandoned", value: billingSummary.abandoned },
                      { label: "Visible", value: billingSummary.total },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-light">
                          {item.label}
                        </p>
                        <p className="mt-1 text-lg font-headline font-black text-foreground">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {billingEvents.length === 0 ? (
                    <ManagerEmptyState
                      Icon={Receipt}
                      title="No failed payments need action"
                      description="When a payment fails, managers can retry eligible Paystack references or mark the event reconciled here."
                    />
                  ) : (
                    <div className="grid gap-3 xl:grid-cols-2">
                      {billingEvents.map((entry) => {
                        const isActing =
                          billingActingReference === entry.reference;

                        return (
                          <div
                            key={entry.id}
                            className="rounded-[1.35rem] border border-slate-200/70 bg-slate-50/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-foreground truncate">
                                  {entry.plan_name || "Premium Access"}
                                </p>
                                <p className="text-[10px] font-semibold text-text-light break-all">
                                  {entry.reference}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                                  {entry.status} | {entry.currency || "USD"}{" "}
                                  {Number(entry.amount || 0).toFixed(2)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getRecoveryClass(
                                  entry.recovery_status,
                                )}`}
                              >
                                {entry.recovery_status || "not_needed"}
                              </span>
                            </div>

                            <p className="text-[10px] font-semibold text-text-dim">
                              {entry.customer_email || "-"} |{" "}
                              {formatDateTime(entry.attempted_at)}
                            </p>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() =>
                                  void handleRetryBilling(entry.reference)
                                }
                                disabled={
                                  isActing || entry.provider !== "paystack"
                                }
                                className="rounded-lg bg-secondary text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 disabled:opacity-50"
                              >
                                Retry
                              </button>
                              <button
                                onClick={() =>
                                  void handleResolveBilling(
                                    entry.reference,
                                    "reconciled",
                                  )
                                }
                                disabled={isActing}
                                className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-foreground disabled:opacity-50"
                              >
                                Reconcile
                              </button>
                              <button
                                onClick={() =>
                                  void handleResolveBilling(
                                    entry.reference,
                                    "cancelled",
                                  )
                                }
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

              <div
                id="manager-activity"
                className={activeSection === "activity" ? "space-y-4" : "hidden"}
              >
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Activity Trail
                </h3>
                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-3">
                  {activityLogs.length === 0 ? (
                    <ManagerEmptyState
                      Icon={ScrollText}
                      title="No activity logs available"
                      description="Recent admin and manager activity will appear here once platform actions are recorded."
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activityLogs.slice(0, 8).map((log, index) => (
                        <div
                          key={`${log.id || index}`}
                          className="rounded-[1.35rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {String(log.action || "action")}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1">
                            {formatDateTime(String(log.created_at || ""))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                id="manager-reports"
                className={activeSection === "reports" ? "space-y-4" : "hidden"}
              >
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Reports
                </h3>
                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-3">
                  <div className="rounded-[1.8rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-white dark:text-zinc-950">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
                          Live generated report
                        </p>
                        <h4 className="mt-2 text-xl font-headline font-black tracking-tight">
                          Operations readiness snapshot
                        </h4>
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 opacity-75">
                          {generatedManagerReport.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSaveGeneratedReport()}
                        disabled={generatingReport}
                        className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-lg transition-all active:scale-95 disabled:opacity-60 dark:bg-zinc-950 dark:text-white"
                      >
                        {generatingReport ? "Saving..." : "Save Report"}
                      </button>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {generatedManagerReport.insights.map((insight) => (
                        <div
                          key={insight}
                          className="rounded-[1.15rem] bg-white/10 px-3 py-3 text-xs font-semibold leading-5 dark:bg-zinc-950/10"
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>

                  {reports.length === 0 ? (
                    <ManagerEmptyState
                      Icon={ClipboardList}
                      title="No saved reports yet"
                      description="Use the live generated report above to create the first saved manager report."
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {reports.slice(0, 8).map((report, index) => (
                        <div
                          key={`${report.id || index}`}
                          className="rounded-[1.35rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                          <p className="text-sm font-black text-foreground">
                            {String(report.title || "Report")}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                            {String(report.report_type || "custom")}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-text-light">
                            {formatDateTime(
                              String(
                                report.generated_at || report.created_at || "",
                              ),
                            )}
                          </p>
                          {report.description && (
                            <p className="mt-3 text-xs font-semibold leading-5 text-text-dim">
                              {String(report.description)}
                            </p>
                          )}
                          {report.metrics && typeof report.metrics === "object" && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {Object.entries(report.metrics)
                                .filter(([, value]) =>
                                  ["string", "number", "boolean"].includes(typeof value),
                                )
                                .slice(0, 4)
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="rounded-xl bg-white/70 px-3 py-2 dark:bg-white/5"
                                  >
                                    <p className="text-[8px] font-black uppercase tracking-widest text-text-light">
                                      {key}
                                    </p>
                                    <p className="mt-1 text-xs font-black text-foreground">
                                      {String(value)}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                id="manager-settings"
                className={activeSection === "settings" ? "space-y-4" : "hidden"}
              >
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Manager Settings
                </h3>
                <div className="rounded-[2rem] border border-sky-200/80 bg-sky-50/85 p-5 shadow-xl shadow-sky-950/5 backdrop-blur-xl dark:border-sky-400/20 dark:bg-sky-950/20">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                    Role boundary
                  </p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-sky-950 dark:text-sky-50">
                    Managers can review the powers enabled for this limited
                    admin role. They cannot switch account roles here; role
                    changes stay in full Admin Settings only.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Scope",
                      value: "Billing, reports, activity",
                      detail: "Managers stay focused on operations instead of user role control.",
                    },
                    {
                      label: "Escalation",
                      value: "Admin handles roles",
                      detail: "Promotions, demotions, and deletes require the full admin page.",
                    },
                    {
                      label: "Launch QA",
                      value: "Safe by default",
                      detail: "Managers can verify billing recovery without unlocking broader settings.",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-light">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-headline font-black tracking-tight text-foreground">
                        {item.value}
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-text-dim">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 sm:grid-cols-2">
                  {permissionEntries.length === 0 && (
                    <div className="sm:col-span-2">
                      <ManagerEmptyState
                        Icon={ShieldCheck}
                        title="No permission details loaded"
                        description="Manager powers will list here when the permissions endpoint returns enabled capabilities."
                      />
                    </div>
                  )}
                  {permissionEntries.map(([permission, enabled]) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light">
                        {permission}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          enabled
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                        }`}
                      >
                        {enabled ? "On" : "Off"}
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
