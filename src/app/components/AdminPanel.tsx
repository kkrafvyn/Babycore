import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  CheckCircle2,
  CreditCard,
  Database,
  Power,
  Receipt,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  createAdminUser,
  deleteAdminUser,
  exportAdminBillingEvents,
  fetchAdminBilling,
  fetchAdminLaunchHealth,
  fetchAdminPaymentConfig,
  fetchAdminPricing,
  demoteAdminUser,
  fetchAdminAuditLogs,
  fetchAdminLogs,
  fetchAdminOverview,
  fetchAdminUsers,
  promoteAdminUser,
  resolveAdminBillingEvent,
  retryAdminBillingEvent,
  saveAdminPaymentConfig,
  saveAdminPricing,
  updateAdminUserRole,
  type AdminLaunchHealthCheck,
  type AdminPricingPlan,
  type AdminUserRecord,
} from "../../lib/admin-api";
import type { BillingEventRecord } from "../../lib/payment-api";
import {
  DEFAULT_PAYMENT_COLLECTION_REASON,
  DEFAULT_PREMIUM_ACCESS_REASON,
  type PaymentCollectionConfig,
} from "../../lib/payment-config";

interface AdminPanelProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

type AdminSectionId =
  | "overview"
  | "launch"
  | "payments"
  | "users"
  | "activity"
  | "billing"
  | "data"
  | "settings";

const ADMIN_SECTIONS: Array<{
  id: AdminSectionId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof ShieldCheck;
}> = [
  {
    id: "overview",
    label: "Overview",
    eyebrow: "System Visibility",
    title: "Full Platform Overview",
    description:
      "Review platform totals, profile mix, and high-level health in one place.",
    Icon: BarChart3,
  },
  {
    id: "launch",
    label: "Launch",
    eyebrow: "Readiness",
    title: "Launch Readiness",
    description:
      "Check payment gates, premium test access, migrations, errors, and operational blockers before marketing.",
    Icon: CheckCircle2,
  },
  {
    id: "payments",
    label: "Payments",
    eyebrow: "Revenue Control",
    title: "Payment Settings",
    description:
      "Pause checkout, open premium testing access, and tune plan pricing before launch.",
    Icon: CreditCard,
  },
  {
    id: "users",
    label: "Users",
    eyebrow: "User Directory",
    title: "Platform Users",
    description:
      "Search accounts and inspect profile status without changing roles from this page.",
    Icon: Users,
  },
  {
    id: "settings",
    label: "Settings",
    eyebrow: "Role Settings",
    title: "Admin Settings",
    description:
      "Create admin accounts and switch user roles from one intentional control page.",
    Icon: Settings2,
  },
  {
    id: "activity",
    label: "Activity",
    eyebrow: "Audit Trail",
    title: "Admin Activity Logs",
    description:
      "Trace admin actions and role changes so sensitive work stays accountable.",
    Icon: ScrollText,
  },
  {
    id: "billing",
    label: "Billing",
    eyebrow: "Billing Ops",
    title: "Failed Payment Recovery",
    description:
      "Filter billing events, export CSVs, retry payments, and reconcile issues.",
    Icon: Receipt,
  },
  {
    id: "data",
    label: "Data",
    eyebrow: "Recent Records",
    title: "Platform Data Snapshot",
    description:
      "Inspect recent database rows returned by the admin overview endpoint.",
    Icon: Database,
  },
];

const formatDateTime = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatAny = (value: any): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
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

const EmptyStateCard = ({
  Icon,
  title,
  description,
  action,
}: {
  Icon: typeof ShieldCheck;
  title: string;
  description: string;
  action?: React.ReactNode;
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
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

const ROLE_OPTIONS = [
  "admin",
  "manager",
  "user",
  "doctor",
  "caregiver",
  "viewer",
] as const;
const LIMITED_ADMIN_ROLE_OPTIONS = ["manager", "admin"] as const;
const PROFILE_TYPE_OPTIONS = ["baby", "doctor", "caregiver"] as const;
const LIMITED_ADMIN_ROLE_LABELS: Record<
  (typeof LIMITED_ADMIN_ROLE_OPTIONS)[number],
  string
> = {
  manager: "Limited admin",
  admin: "Full admin",
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [roleDistribution, setRoleDistribution] = useState<
    Array<{ role: string; count: number }>
  >([]);
  const [recent, setRecent] = useState<Record<string, any[]>>({});
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [pricingPlans, setPricingPlans] = useState<AdminPricingPlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [paymentCollection, setPaymentCollection] =
    useState<PaymentCollectionConfig | null>(null);
  const [paymentCollectionReason, setPaymentCollectionReason] = useState(
    DEFAULT_PAYMENT_COLLECTION_REASON,
  );
  const [paymentCollectionLoading, setPaymentCollectionLoading] =
    useState(false);
  const [paymentCollectionSaving, setPaymentCollectionSaving] = useState(false);
  const [paymentCollectionError, setPaymentCollectionError] = useState<
    string | null
  >(null);
  const [premiumAccess, setPremiumAccess] =
    useState<PaymentCollectionConfig | null>(null);
  const [premiumAccessReason, setPremiumAccessReason] = useState(
    DEFAULT_PREMIUM_ACCESS_REASON,
  );
  const [premiumAccessSaving, setPremiumAccessSaving] = useState(false);
  const [creatingTeamMember, setCreatingTeamMember] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [teamMemberDraft, setTeamMemberDraft] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager" as (typeof LIMITED_ADMIN_ROLE_OPTIONS)[number],
    profileType: "baby" as (typeof PROFILE_TYPE_OPTIONS)[number],
  });
  const [logs, setLogs] = useState<Array<Record<string, any>>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, any>>>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [billingEvents, setBillingEvents] = useState<BillingEventRecord[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSearch, setBillingSearch] = useState("");
  const [billingStatusFilter, setBillingStatusFilter] = useState("failed");
  const [billingRecoveryFilter, setBillingRecoveryFilter] = useState("");
  const [billingSummary, setBillingSummary] = useState({
    total: 0,
    failed: 0,
    retrying: 0,
    recovered: 0,
    abandoned: 0,
  });
  const [billingTotal, setBillingTotal] = useState(0);
  const [billingActingReference, setBillingActingReference] = useState<
    string | null
  >(null);
  const [launchHealthChecks, setLaunchHealthChecks] = useState<
    AdminLaunchHealthCheck[]
  >([]);
  const [launchHealthLoading, setLaunchHealthLoading] = useState(false);
  const [launchHealthError, setLaunchHealthError] = useState<string | null>(
    null,
  );
  const [launchHealthGeneratedAt, setLaunchHealthGeneratedAt] =
    useState<string>("");
  const [activeSection, setActiveSection] =
    useState<AdminSectionId>("overview");
  const mainRef = React.useRef<HTMLElement | null>(null);

  const handleSectionChange = (sectionId: AdminSectionId) => {
    setActiveSection(sectionId);
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const loadOverview = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const response = await fetchAdminOverview();
    if (!response.success || !response.data) {
      setError(response.error || "Unable to load admin overview.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setCounts(response.data.counts || {});
    setRoleDistribution(response.data.roleDistribution || []);
    setRecent(response.data.recent || {});
    setGeneratedAt(response.data.generatedAt || "");
    setLoading(false);
    setRefreshing(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    const response = await fetchAdminUsers({ limit: 100, offset: 0 });
    if (!response.success || !response.data) {
      setUsersError(response.error || "Unable to load admin users.");
      setUsers([]);
      setUsersTotal(0);
      setUsersLoading(false);
      return;
    }

    setUsersError(null);
    setUsers(response.data.users || []);
    setUsersTotal(response.data.total || response.data.users.length || 0);
    setRoleDrafts((prev) => {
      const next = { ...prev };
      for (const user of response.data?.users || []) {
        next[user.id] = user.role;
      }
      return next;
    });
    setUsersLoading(false);
  };

  const loadPricing = async () => {
    setPricingLoading(true);
    const response = await fetchAdminPricing();
    if (!response.success || !response.data) {
      setPricingError(response.error || "Unable to load pricing.");
      setPricingPlans([]);
      setPricingLoading(false);
      return;
    }

    setPricingError(null);
    setPricingPlans(response.data.plans || []);
    setPricingLoading(false);
  };

  const loadPaymentCollection = async () => {
    setPaymentCollectionLoading(true);
    const response = await fetchAdminPaymentConfig();
    if (
      !response.success ||
      !response.data?.paymentCollection ||
      !response.data?.premiumAccess
    ) {
      setPaymentCollectionError(
        response.error || "Unable to load payment collection control.",
      );
      setPaymentCollection(null);
      setPaymentCollectionReason(DEFAULT_PAYMENT_COLLECTION_REASON);
      setPremiumAccess(null);
      setPremiumAccessReason(DEFAULT_PREMIUM_ACCESS_REASON);
      setPaymentCollectionLoading(false);
      return;
    }

    setPaymentCollectionError(null);
    setPaymentCollection(response.data.paymentCollection);
    setPaymentCollectionReason(
      response.data.paymentCollection.reason ||
        DEFAULT_PAYMENT_COLLECTION_REASON,
    );
    setPremiumAccess(response.data.premiumAccess);
    setPremiumAccessReason(
      response.data.premiumAccess.reason || DEFAULT_PREMIUM_ACCESS_REASON,
    );
    setPaymentCollectionLoading(false);
  };

  const loadLaunchHealth = async () => {
    setLaunchHealthLoading(true);
    const response = await fetchAdminLaunchHealth();
    if (!response.success || !response.data) {
      setLaunchHealthError(
        response.error || "Unable to load live launch health checks.",
      );
      setLaunchHealthChecks([]);
      setLaunchHealthGeneratedAt("");
      setLaunchHealthLoading(false);
      return;
    }

    setLaunchHealthError(null);
    setLaunchHealthChecks(response.data.checks || []);
    setLaunchHealthGeneratedAt(response.data.generatedAt || "");
    setLaunchHealthLoading(false);
  };

  const loadAdminLogs = async () => {
    const [actions, audit] = await Promise.all([
      fetchAdminLogs({ limit: 20, offset: 0 }),
      fetchAdminAuditLogs({ limit: 20, offset: 0 }),
    ]);

    setLogs(actions.success && actions.data ? actions.data.logs || [] : []);
    setAuditLogs(audit.success && audit.data ? audit.data.logs || [] : []);
  };

  const loadBilling = async () => {
    setBillingLoading(true);
    const response = await fetchAdminBilling({
      limit: 30,
      offset: 0,
      search: billingSearch,
      status: billingStatusFilter || undefined,
      recoveryStatus: billingRecoveryFilter || undefined,
    });

    if (!response.success || !response.data) {
      setBillingError(response.error || "Unable to load billing ops data.");
      setBillingEvents([]);
      setBillingSummary({
        total: 0,
        failed: 0,
        retrying: 0,
        recovered: 0,
        abandoned: 0,
      });
      setBillingTotal(0);
      setBillingLoading(false);
      return;
    }

    setBillingError(null);
    setBillingEvents(response.data.events || []);
    setBillingSummary(response.data.summary);
    setBillingTotal(response.data.total || response.data.events.length || 0);
    setBillingLoading(false);
  };

  const refreshAll = async (isRefresh = false) => {
    await Promise.all([
      loadOverview(isRefresh),
      loadUsers(),
      loadAdminLogs(),
      loadBilling(),
      loadPricing(),
      loadPaymentCollection(),
      loadLaunchHealth(),
    ]);
  };

  const handlePricingDraftChange = (
    planId: AdminPricingPlan["id"],
    field: "ghanaAmount" | "internationalAmount",
    value: string,
  ) => {
    setPricingPlans((current) =>
      current.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              [field]: value === "" ? 0 : Number(value),
            }
          : plan,
      ),
    );
  };

  const handleSavePricing = async () => {
    setPricingSaving(true);
    const response = await saveAdminPricing(
      pricingPlans.map((plan) => ({
        id: plan.id,
        ghanaAmount: Number(plan.ghanaAmount || 0),
        internationalAmount: Number(plan.internationalAmount || 0),
        isActive: plan.isActive,
      })),
    );
    setPricingSaving(false);

    if (!response.success || !response.data) {
      toast.error(response.error || "Failed to save pricing.");
      return;
    }

    setPricingPlans(response.data.plans || []);
    toast.success(response.message || "Pricing updated.");
    await Promise.all([loadOverview(true), loadAdminLogs(), loadLaunchHealth()]);
  };

  const handleSavePaymentCollection = async (enabled: boolean) => {
    if (enabled && !paymentCollectionEnabled) {
      const confirmed = window.confirm(
        "Turn on live payment collection? Users will be able to complete Paystack checkout immediately.",
      );
      if (!confirmed) return;
    }

    setPaymentCollectionSaving(true);
    const response = await saveAdminPaymentConfig({
      enabled,
      reason:
        paymentCollectionReason.trim() || DEFAULT_PAYMENT_COLLECTION_REASON,
    });
    setPaymentCollectionSaving(false);

    if (!response.success || !response.data?.paymentCollection) {
      toast.error(
        response.error || "Failed to update payment collection control.",
      );
      return;
    }

    setPaymentCollection(response.data.paymentCollection);
    setPaymentCollectionReason(
      response.data.paymentCollection.reason ||
        DEFAULT_PAYMENT_COLLECTION_REASON,
    );
    if (response.data.premiumAccess) {
      setPremiumAccess(response.data.premiumAccess);
      setPremiumAccessReason(
        response.data.premiumAccess.reason || DEFAULT_PREMIUM_ACCESS_REASON,
      );
    }
    toast.success(response.message || "Payment collection control updated.");
    await Promise.all([loadOverview(true), loadAdminLogs(), loadLaunchHealth()]);
  };

  const handleSavePremiumAccess = async (enabled: boolean) => {
    if (enabled && !premiumAccessEnabled) {
      const confirmed = window.confirm(
        "Require an active premium plan again? Users without an active or test subscription will see the paywall.",
      );
      if (!confirmed) return;
    }

    setPremiumAccessSaving(true);
    const response = await saveAdminPaymentConfig({
      premiumAccessEnabled: enabled,
      premiumAccessReason:
        premiumAccessReason.trim() || DEFAULT_PREMIUM_ACCESS_REASON,
    });
    setPremiumAccessSaving(false);

    if (!response.success || !response.data?.premiumAccess) {
      toast.error(response.error || "Failed to update premium access mode.");
      return;
    }

    if (response.data.paymentCollection) {
      setPaymentCollection(response.data.paymentCollection);
      setPaymentCollectionReason(
        response.data.paymentCollection.reason ||
          DEFAULT_PAYMENT_COLLECTION_REASON,
      );
    }
    setPremiumAccess(response.data.premiumAccess);
    setPremiumAccessReason(
      response.data.premiumAccess.reason || DEFAULT_PREMIUM_ACCESS_REASON,
    );
    toast.success(response.message || "Premium access mode updated.");
    await Promise.all([loadOverview(true), loadAdminLogs(), loadLaunchHealth()]);
  };

  const handleCreateTeamMember = async () => {
    if (!teamMemberDraft.name.trim() || !teamMemberDraft.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    setCreatingTeamMember(true);
    setTemporaryPassword(null);
    const response = await createAdminUser({
      name: teamMemberDraft.name.trim(),
      email: teamMemberDraft.email.trim(),
      password: teamMemberDraft.password.trim() || undefined,
      role: teamMemberDraft.role,
      profileType: teamMemberDraft.profileType,
    });
    setCreatingTeamMember(false);

    if (!response.success || !response.data?.user) {
      toast.error(response.error || "Failed to create admin team member.");
      return;
    }

    setTemporaryPassword(response.data.temporaryPassword || null);
    setTeamMemberDraft({
      name: "",
      email: "",
      password: "",
      role: "manager",
      profileType: "baby",
    });
    const createdRole =
      response.data.user.role === "admin" ? "full admin" : "limited admin";
    toast.success(`${response.data.user.name} created as ${createdRole}.`);
    await Promise.all([loadUsers(), loadAdminLogs(), loadOverview(true)]);
  };

  const handleApplyRole = async (user: AdminUserRecord) => {
    const nextRole = (roleDrafts[user.id] || user.role) as
      | "admin"
      | "manager"
      | "user"
      | "doctor"
      | "caregiver"
      | "viewer";

    if (!nextRole || nextRole === user.role) return;

    setActingUserId(user.id);
    const result = await updateAdminUserRole(user.id, nextRole);
    setActingUserId(null);

    if (!result.success) {
      toast.error(result.error || "Failed to update role.");
      return;
    }

    toast.success(`${user.name}'s role updated to ${nextRole}.`);
    await Promise.all([loadUsers(), loadAdminLogs(), loadOverview(true)]);
  };

  const handlePromote = async (
    user: AdminUserRecord,
    nextRole: "manager" | "admin",
  ) => {
    if (user.role === nextRole) return;
    setActingUserId(user.id);
    const result = await promoteAdminUser(user.id, nextRole);
    setActingUserId(null);

    if (!result.success) {
      toast.error(result.error || `Failed to promote ${user.name}.`);
      return;
    }

    toast.success(`${user.name} promoted to ${nextRole}.`);
    await Promise.all([loadUsers(), loadAdminLogs(), loadOverview(true)]);
  };

  const handleDemote = async (user: AdminUserRecord) => {
    if (user.role === "user") return;
    setActingUserId(user.id);
    const result = await demoteAdminUser(user.id);
    setActingUserId(null);

    if (!result.success) {
      toast.error(result.error || `Failed to demote ${user.name}.`);
      return;
    }

    toast.success(`${user.name} demoted to user.`);
    await Promise.all([loadUsers(), loadAdminLogs(), loadOverview(true)]);
  };

  const handleDeleteUser = async (user: AdminUserRecord) => {
    const confirmed = window.confirm(
      `Delete ${user.email || user.name}? This permanently removes their account.`,
    );
    if (!confirmed) return;

    setActingUserId(user.id);
    const result = await deleteAdminUser(user.id);
    setActingUserId(null);

    if (!result.success) {
      toast.error(result.error || `Failed to delete ${user.name}.`);
      return;
    }

    toast.success(`${user.name} deleted.`);
    await Promise.all([loadUsers(), loadAdminLogs(), loadOverview(true)]);
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
    await Promise.all([loadBilling(), loadAdminLogs(), loadOverview(true)]);
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
    await Promise.all([loadBilling(), loadAdminLogs(), loadOverview(true)]);
  };

  const handleExportBilling = async () => {
    try {
      await exportAdminBillingEvents({
        search: billingSearch,
        status: billingStatusFilter || undefined,
        recoveryStatus: billingRecoveryFilter || undefined,
      });
      toast.success("Billing export downloaded.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to export billing events.");
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBilling();
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [billingSearch, billingStatusFilter, billingRecoveryFilter]);

  const countEntries = useMemo(
    () => Object.entries(counts).sort((a, b) => b[1] - a[1]),
    [counts],
  );

  const recentSections = useMemo(
    () =>
      Object.entries(recent).filter(
        ([, values]) => Array.isArray(values) && values.length > 0,
      ),
    [recent],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const haystack =
        `${user.name} ${user.email} ${user.role} ${user.profileType || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search]);

  const paymentCollectionEnabled = Boolean(paymentCollection?.enabled);
  const paymentCollectionStatusLabel = paymentCollectionLoading
    ? "Checking"
    : paymentCollectionEnabled
      ? "On"
      : "Off";
  const premiumAccessEnabled = Boolean(premiumAccess?.enabled);
  const premiumAccessStatusLabel = paymentCollectionLoading
    ? "Checking"
    : premiumAccessEnabled
      ? "Restricted"
      : "Open";
  const paymentControlsReady = Boolean(paymentCollection && premiumAccess);
  const userPremiumAccessOpen =
    paymentControlsReady && (!paymentCollectionEnabled || !premiumAccessEnabled);
  const userPremiumAccessStatusLabel =
    paymentCollectionLoading || !paymentControlsReady
      ? "Checking"
      : userPremiumAccessOpen
        ? "Open"
        : "Plan Required";
  const userPremiumAccessReason = !paymentControlsReady
    ? "Checking latest payment controls."
    : !paymentCollectionEnabled
      ? "Payments are paused, so premium tools are open automatically during QA."
      : !premiumAccessEnabled
        ? "Premium access is explicitly open for user testing."
        : "Payments and premium enforcement are both on.";
  const activeSectionMeta = useMemo(
    () =>
      ADMIN_SECTIONS.find((section) => section.id === activeSection) ||
      ADMIN_SECTIONS[0],
    [activeSection],
  );
  const ActiveSectionIcon = activeSectionMeta.Icon;
  const adminRoleCount =
    roleDistribution.find((item) => item.role === "admin")?.count || 0;
  const managerRoleCount =
    roleDistribution.find((item) => item.role === "manager")?.count || 0;
  const heroStats = [
    {
      label: "Users loaded",
      value: usersTotal || users.length || counts.users || 0,
    },
    { label: "Admins", value: adminRoleCount },
    { label: "Managers", value: managerRoleCount },
    { label: "Failed billing", value: billingSummary.failed },
  ];
  const launchReadinessItems = [
    {
      label: "Premium testing",
      status: userPremiumAccessOpen ? "ready" : "blocked",
      title: userPremiumAccessOpen
        ? "Premium tools are open for QA"
        : "Users still need an active plan",
      description: userPremiumAccessReason,
      action: "Open Payments",
      section: "payments" as AdminSectionId,
    },
    {
      label: "Payment collection",
      status: !paymentCollectionEnabled ? "ready" : "warning",
      title: !paymentCollectionEnabled
        ? "Live checkout is paused"
        : "Live checkout is enabled",
      description: !paymentCollectionEnabled
        ? "Safe for full-app testing before marketing."
        : "Users can complete real checkout. Confirm this is intentional before launch QA.",
      action: "Open Payments",
      section: "payments" as AdminSectionId,
    },
    {
      label: "Admin API",
      status: error ? "blocked" : "ready",
      title: error ? "Admin overview has an error" : "Admin overview is loading",
      description: error || "Overview, counts, and role data loaded without a top-level error.",
      action: "Open Overview",
      section: "overview" as AdminSectionId,
    },
    {
      label: "User directory",
      status: usersError ? "blocked" : users.length > 0 ? "ready" : "warning",
      title: usersError
        ? "User directory failed"
        : users.length > 0
          ? "Users are visible"
          : "No users loaded",
      description:
        usersError ||
        (users.length > 0
          ? `${users.length} user record${users.length === 1 ? "" : "s"} loaded for review.`
          : "Confirm the admin users endpoint and production database are returning records."),
      action: "Open Users",
      section: "users" as AdminSectionId,
    },
    {
      label: "Billing recovery",
      status: billingError ? "blocked" : billingSummary.failed > 0 ? "warning" : "ready",
      title: billingError
        ? "Billing recovery failed"
        : billingSummary.failed > 0
          ? "Failed payments need review"
          : "No failed payments blocking QA",
      description:
        billingError ||
        (billingSummary.failed > 0
          ? `${billingSummary.failed} failed payment event${billingSummary.failed === 1 ? "" : "s"} visible.`
          : "Billing recovery view is clear for the current filters."),
      action: "Open Billing",
      section: "billing" as AdminSectionId,
    },
    {
      label: "Pricing",
      status: pricingError ? "blocked" : pricingPlans.length > 0 ? "ready" : "warning",
      title: pricingError
        ? "Pricing failed"
        : pricingPlans.length > 0
          ? "Pricing plans are configured"
          : "No pricing plans loaded",
      description:
        pricingError ||
        (pricingPlans.length > 0
          ? `${pricingPlans.length} premium plan${pricingPlans.length === 1 ? "" : "s"} loaded.`
          : "Confirm subscription tables and pricing seed data before marketing."),
      action: "Open Payments",
      section: "payments" as AdminSectionId,
    },
    {
      label: "Care workspace migration",
      status: recent.shared_care_workspaces ? "ready" : "warning",
      title: recent.shared_care_workspaces
        ? "Workspace sync table is visible"
        : "Verify shared_care_workspaces migration",
      description: recent.shared_care_workspaces
        ? "Recent workspace rows are available to the admin overview."
        : "If the console still warns about shared_care_workspaces, run the latest SQL migrations before launch QA.",
      action: "Open Data",
      section: "data" as AdminSectionId,
    },
  ];
  const launchSectionBySource: Record<AdminLaunchHealthCheck["source"], AdminSectionId> = {
    api: "overview",
    database: "data",
    vercel: "launch",
    payments: "payments",
    logs: "activity",
  };
  const launchActionBySection: Record<AdminSectionId, string> = {
    overview: "Open Overview",
    launch: "Refresh Launch",
    payments: "Open Payments",
    users: "Open Users",
    activity: "Open Activity",
    billing: "Open Billing",
    data: "Open Data",
    settings: "Open Settings",
  };
  const liveLaunchReadinessItems = launchHealthChecks.map((check) => {
    const section = launchSectionBySource[check.source] || "launch";
    return {
      label: check.label,
      status: check.status,
      title: check.title,
      description: check.description,
      action: launchActionBySection[section],
      section,
      source: check.source,
      checkedAt: check.checkedAt,
    };
  });
  const launchHealthErrorItem = launchHealthError
    ? [
        {
          label: "Live health",
          status: "blocked",
          title: "Live launch health failed",
          description: launchHealthError,
          action: "Refresh Launch",
          section: "launch" as AdminSectionId,
          source: "api",
          checkedAt: "",
        },
      ]
    : [];
  const displayLaunchReadinessItems =
    liveLaunchReadinessItems.length > 0
      ? liveLaunchReadinessItems
      : launchHealthErrorItem.length > 0
        ? launchHealthErrorItem
        : launchReadinessItems;
  const launchReadyCount = displayLaunchReadinessItems.filter(
    (item) => item.status === "ready",
  ).length;
  const launchBlockerCount = displayLaunchReadinessItems.filter(
    (item) => item.status === "blocked",
  ).length;

  return (
    <div className="fit-screen relative overflow-hidden bg-[#f6f7fb] dark:bg-[#050507]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-slate-300/50 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl dark:bg-amber-500/10" />
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
                Babycore Command
              </p>
              <h1 className="truncate text-lg font-headline font-black tracking-tight text-foreground sm:text-xl">
                Admin Console
              </h1>
            </div>
          </div>

          <button
            onClick={() => refreshAll(true)}
            disabled={refreshing || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white shadow-lg shadow-slate-950/15 transition-all active:scale-95 disabled:opacity-60 dark:bg-white dark:text-zinc-950"
            title="Refresh admin data"
            aria-label="Refresh admin data"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main
        ref={mainRef}
        className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-4 pb-32 pt-28 sm:px-6 lg:px-10 lg:pl-36"
      >
        <nav
          className="fixed left-5 top-28 z-40 hidden lg:block"
          aria-label="Admin sections"
        >
          <div className="flex w-[6.25rem] flex-col gap-2 rounded-[2rem] border border-white/70 bg-white/80 p-2 shadow-2xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
            <p className="px-2 pb-1 pt-2 text-center text-[9px] font-black uppercase tracking-[0.24em] text-text-light">
              Admin
            </p>
            {ADMIN_SECTIONS.map((section) => {
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
          aria-label="Admin sections"
        >
          <div className="pointer-events-auto mx-auto flex max-w-md gap-1 overflow-x-auto rounded-[2rem] border border-white/10 bg-[#1c1c1e]/95 p-2 shadow-2xl shadow-black/25 backdrop-blur-2xl no-scrollbar">
            {ADMIN_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              const SectionIcon = section.Icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleSectionChange(section.id)}
                  className={`flex h-14 min-w-[4rem] flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[7px] font-black uppercase tracking-[0.12em] transition-all ${
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

        <div className="mx-auto w-full max-w-6xl space-y-8">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-white/75 bg-white/80 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75 sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-slate-500 to-amber-300" />
            <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-end">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white dark:bg-white dark:text-zinc-950">
                    Full admin
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                      premiumAccessEnabled
                        ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-zinc-200"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}
                  >
                    Premium {premiumAccessStatusLabel}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                      paymentCollectionEnabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}
                  >
                    Payments {paymentCollectionStatusLabel}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                      paymentCollectionLoading || !paymentControlsReady
                        ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-zinc-200"
                        : userPremiumAccessOpen
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                  >
                    User Premium {userPremiumAccessStatusLabel}
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
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-text-light">
                  Generated {generatedAt ? formatDateTime(generatedAt) : "-"}
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
                {heroStats.map((item) => (
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
                Loading admin data...
              </p>
            </div>
          ) : (
            <>
              <div
                id="admin-overview"
                className={activeSection === "overview" ? "space-y-4" : "hidden"}
              >
                <div className="flex items-end justify-between gap-3 px-1">
                  <div>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                      Totals
                    </p>
                    <h3 className="mt-1 text-xl font-headline font-black tracking-tight text-foreground">
                      Platform health at a glance
                    </h3>
                  </div>
                </div>
                {countEntries.length === 0 && (
                  <EmptyStateCard
                    Icon={BarChart3}
                    title="No overview totals yet"
                    description="Once users start creating records, platform totals will appear here automatically."
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {countEntries.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-[9px] font-black text-text-light uppercase tracking-widest">
                        {label}
                      </p>
                      <p className="text-2xl font-headline font-black text-foreground mt-2">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={activeSection === "overview" ? "space-y-4" : "hidden"}>
                <div className="px-1">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    Role Distribution
                  </p>
                  <h3 className="mt-1 text-xl font-headline font-black tracking-tight text-foreground">
                    Who is using Babycore
                  </h3>
                </div>
                <div className="grid gap-2 rounded-[2.25rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 sm:grid-cols-2">
                  {roleDistribution.length === 0 && (
                    <div className="sm:col-span-2">
                      <EmptyStateCard
                        Icon={Users}
                        title="No role mix to show yet"
                        description="Role distribution will update after the admin API returns user records."
                      />
                    </div>
                  )}
                  {roleDistribution.map((item) => (
                    <div
                      key={item.role}
                      className="flex items-center justify-between rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light">
                        {item.role}
                      </p>
                      <p className="text-lg font-headline font-black text-foreground">
                        {item.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                id="admin-launch"
                className={activeSection === "launch" ? "space-y-4" : "hidden"}
              >
                <div className="rounded-[2.5rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/75">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-light">
                        Launch QA
                      </p>
                      <h3 className="mt-2 text-3xl font-headline font-black tracking-[-0.05em] text-foreground">
                        {launchBlockerCount > 0
                          ? "Fix blockers before marketing"
                          : "Ready for deeper production testing"}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-dim">
                        This page checks the gates that matter before ads or public launch: premium access, payments,
                        migrations, admin API health, Vercel deployment state, and recent runtime logs.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={loadLaunchHealth}
                          disabled={launchHealthLoading}
                          className="rounded-2xl bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                        >
                          {launchHealthLoading ? "Checking..." : "Refresh Live Health"}
                        </button>
                        <span className="text-[11px] font-semibold text-text-light">
                          {launchHealthGeneratedAt
                            ? `Live check ${formatDateTime(launchHealthGeneratedAt)}`
                            : liveLaunchReadinessItems.length > 0
                              ? "Live backend checks loaded."
                              : "Using app-loaded fallback checks until live health responds."}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-64">
                      <div className="rounded-[1.35rem] bg-slate-950 px-4 py-4 text-white dark:bg-white dark:text-zinc-950">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                          Ready
                        </p>
                        <p className="mt-2 text-2xl font-headline font-black">
                          {launchReadyCount}/{displayLaunchReadinessItems.length}
                        </p>
                      </div>
                      <div
                        className={`rounded-[1.35rem] px-4 py-4 ${
                          launchBlockerCount > 0
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        }`}
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">
                          Blockers
                        </p>
                        <p className="mt-2 text-2xl font-headline font-black">
                          {launchBlockerCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {displayLaunchReadinessItems.map((item) => {
                    const isReady = item.status === "ready";
                    const isBlocked = item.status === "blocked";

                    return (
                      <div
                        key={`${item.label}-${item.title}`}
                        className={`rounded-[2rem] border p-5 shadow-sm backdrop-blur-xl ${
                          isReady
                            ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-950/20"
                            : isBlocked
                              ? "border-rose-200/80 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-950/20"
                              : "border-amber-200/80 bg-amber-50/80 dark:border-amber-400/20 dark:bg-amber-950/20"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                              isReady
                                ? "bg-emerald-500 text-white"
                                : isBlocked
                                  ? "bg-rose-500 text-white"
                                  : "bg-amber-500 text-white"
                            }`}
                          >
                            {isReady ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-text-light">
                              {item.label}
                            </p>
                            <p className="mt-1 text-base font-headline font-black tracking-tight text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-text-dim">
                              {item.description}
                            </p>
                            {"source" in item && item.source ? (
                              <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-text-light">
                                Source: {String(item.source)}
                                {"checkedAt" in item && item.checkedAt
                                  ? ` | ${formatDateTime(String(item.checkedAt))}`
                                  : ""}
                              </p>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                item.section === "launch"
                                  ? loadLaunchHealth()
                                  : handleSectionChange(item.section)
                              }
                              className="mt-4 rounded-xl bg-white/80 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-foreground shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] dark:bg-white/10"
                            >
                              {item.action}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                id="admin-payments"
                className={activeSection === "payments" ? "space-y-4" : "hidden"}
              >
                <div className="flex items-center justify-between px-1 gap-3">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    Payment Collection
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      paymentCollectionEnabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    }`}
                  >
                    {paymentCollectionStatusLabel}
                  </span>
                </div>

                <div
                  className={`relative overflow-hidden rounded-[2.35rem] border p-5 shadow-xl backdrop-blur-xl ${
                    paymentCollectionLoading || !paymentControlsReady
                      ? "border-white/70 bg-white/80 shadow-slate-950/5 dark:border-white/10 dark:bg-zinc-950/70"
                      : userPremiumAccessOpen
                        ? "border-emerald-200/80 bg-emerald-50/85 shadow-emerald-950/5 dark:border-emerald-400/20 dark:bg-emerald-950/20"
                        : "border-rose-200/80 bg-rose-50/85 shadow-rose-950/5 dark:border-rose-400/20 dark:bg-rose-950/20"
                  }`}
                >
                  <div className="absolute right-[-2rem] top-[-3rem] h-28 w-28 rounded-full bg-white/50 blur-2xl dark:bg-white/10" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          userPremiumAccessOpen
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-950 text-white dark:bg-white dark:text-zinc-950"
                        }`}
                      >
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-light">
                          Effective user access
                        </p>
                        <p className="mt-1 text-lg font-headline font-black tracking-tight text-foreground">
                          {userPremiumAccessOpen
                            ? "Users can open premium tools"
                            : paymentCollectionLoading || !paymentControlsReady
                              ? "Checking premium access"
                              : "Users need an active plan"}
                        </p>
                        <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-text-dim">
                          {userPremiumAccessReason}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center sm:w-80">
                      <div className="rounded-[1.15rem] bg-white/70 px-3 py-3 dark:bg-white/10">
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-light">
                          Payments
                        </p>
                        <p className="mt-1 text-xs font-black text-foreground">
                          {paymentCollectionStatusLabel}
                        </p>
                      </div>
                      <div className="rounded-[1.15rem] bg-white/70 px-3 py-3 dark:bg-white/10">
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-light">
                          Premium
                        </p>
                        <p className="mt-1 text-xs font-black text-foreground">
                          {premiumAccessStatusLabel}
                        </p>
                      </div>
                      <div className="rounded-[1.15rem] bg-white/70 px-3 py-3 dark:bg-white/10">
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-light">
                          Result
                        </p>
                        <p className="mt-1 text-xs font-black text-foreground">
                          {userPremiumAccessStatusLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        paymentCollectionEnabled
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                      }`}
                    >
                      <Power size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">
                        {paymentCollectionEnabled
                          ? "Live checkout is enabled"
                          : "Live checkout is paused"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold leading-relaxed text-text-light">
                        Keep this off while we finish full-app QA. Turning it on
                        lets users complete real checkout.
                      </p>
                    </div>
                  </div>

                  {paymentCollectionError && (
                    <p className="text-sm font-bold text-red-500">
                      {paymentCollectionError}
                    </p>
                  )}

                  <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">
                      Customer-facing pause note
                    </span>
                    <textarea
                      value={paymentCollectionReason}
                      onChange={(event) =>
                        setPaymentCollectionReason(event.target.value)
                      }
                      className="min-h-24 w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-3 py-3 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        void handleSavePaymentCollection(
                          !paymentCollectionEnabled,
                        )
                      }
                      disabled={
                        paymentCollectionSaving || paymentCollectionLoading
                      }
                      className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 ${
                        paymentCollectionEnabled ? "bg-red-500" : "bg-secondary"
                      }`}
                    >
                      {paymentCollectionSaving
                        ? "Saving..."
                        : paymentCollectionEnabled
                          ? "Turn Payments Off"
                          : "Turn Payments On"}
                    </button>
                    <button
                      onClick={() =>
                        void handleSavePaymentCollection(
                          paymentCollectionEnabled,
                        )
                      }
                      disabled={
                        paymentCollectionSaving || paymentCollectionLoading
                      }
                      className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50"
                    >
                      Save Note
                    </button>
                  </div>
                </div>

                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl ${
                          premiumAccessEnabled
                            ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-200"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        }`}
                      >
                        <ShieldCheck size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground">
                          {premiumAccessEnabled
                            ? "Premium requires a plan"
                            : "Premium is open for user testing"}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold leading-relaxed text-text-light">
                          Open access lets normal users enter premium tools
                          during QA without paying. Payment pause also opens
                          premium automatically so users are not trapped behind
                          checkout.
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        premiumAccessEnabled
                          ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-zinc-200"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      }`}
                    >
                      {premiumAccessStatusLabel}
                    </span>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">
                      Premium access note
                    </span>
                    <textarea
                      value={premiumAccessReason}
                      onChange={(event) =>
                        setPremiumAccessReason(event.target.value)
                      }
                      className="min-h-24 w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-3 py-3 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        void handleSavePremiumAccess(!premiumAccessEnabled)
                      }
                      disabled={premiumAccessSaving || paymentCollectionLoading}
                      className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 ${
                        premiumAccessEnabled ? "bg-secondary" : "bg-slate-950"
                      }`}
                    >
                      {premiumAccessSaving
                        ? "Saving..."
                        : premiumAccessEnabled
                          ? "Open Access"
                          : "Require Premium"}
                    </button>
                    <button
                      onClick={() =>
                        void handleSavePremiumAccess(premiumAccessEnabled)
                      }
                      disabled={premiumAccessSaving || paymentCollectionLoading}
                      className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              </div>

              <div className={activeSection === "payments" ? "space-y-4" : "hidden"}>
                <div className="flex items-center justify-between px-1 gap-3">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    Premium Pricing
                  </h3>
                  <button
                    onClick={() => void handleSavePricing()}
                    disabled={
                      pricingSaving ||
                      pricingLoading ||
                      pricingPlans.length === 0
                    }
                    className="rounded-full bg-secondary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {pricingSaving ? "Saving..." : "Save Pricing"}
                  </button>
                </div>

                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-3">
                  {pricingLoading && (
                    <p className="text-sm font-bold text-text-light">
                      Loading pricing...
                    </p>
                  )}

                  {!pricingLoading && pricingError && (
                    <p className="text-sm font-bold text-red-500">
                      {pricingError}
                    </p>
                  )}

                  {!pricingLoading &&
                    !pricingError &&
                    pricingPlans.length === 0 && (
                      <p className="text-sm font-bold text-text-light">
                        No pricing plans found.
                      </p>
                    )}

                  {!pricingLoading &&
                    !pricingError &&
                    pricingPlans.length > 0 && (
                      <div className="space-y-3">
                        {pricingPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-foreground">
                                  {plan.name}
                                </p>
                                <p className="text-[10px] font-semibold text-text-light mt-1">
                                  {plan.description}
                                </p>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-secondary">
                                {plan.billingPeriod}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <label className="space-y-1">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-text-light">
                                  Ghana (GHS)
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={plan.ghanaAmount}
                                  onChange={(event) =>
                                    handlePricingDraftChange(
                                      plan.id,
                                      "ghanaAmount",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-text-light">
                                  Outside Ghana (USD)
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={plan.internationalAmount}
                                  onChange={(event) =>
                                    handlePricingDraftChange(
                                      plan.id,
                                      "internationalAmount",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div
                id="admin-settings"
                className={activeSection === "settings" ? "space-y-4" : "hidden"}
              >
                <div className="flex items-center justify-between px-1 gap-3">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    Admin Team
                  </h3>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                    manager = limited admin
                  </span>
                </div>

                <div className="rounded-[2.25rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70 space-y-3">
                  <p className="text-[10px] font-semibold text-text-light leading-relaxed">
                    Create full admins or limited admins. Use{" "}
                    <span className="font-black text-secondary">manager</span>{" "}
                    when you want a restricted admin account.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={teamMemberDraft.name}
                      onChange={(event) =>
                        setTeamMemberDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Admin name"
                      className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                    />
                    <input
                      value={teamMemberDraft.email}
                      onChange={(event) =>
                        setTeamMemberDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="Admin email"
                      className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                    />
                    <input
                      value={teamMemberDraft.password}
                      onChange={(event) =>
                        setTeamMemberDraft((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Temporary password (optional)"
                      className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={teamMemberDraft.role}
                        onChange={(event) =>
                          setTeamMemberDraft((current) => ({
                            ...current,
                            role: event.target
                              .value as (typeof LIMITED_ADMIN_ROLE_OPTIONS)[number],
                          }))
                        }
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-foreground outline-none"
                      >
                        {LIMITED_ADMIN_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {LIMITED_ADMIN_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={teamMemberDraft.profileType}
                        onChange={(event) =>
                          setTeamMemberDraft((current) => ({
                            ...current,
                            profileType: event.target
                              .value as (typeof PROFILE_TYPE_OPTIONS)[number],
                          }))
                        }
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-foreground outline-none"
                      >
                        {PROFILE_TYPE_OPTIONS.map((profileType) => (
                          <option key={profileType} value={profileType}>
                            {profileType}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => void handleCreateTeamMember()}
                      disabled={creatingTeamMember}
                      className="rounded-xl bg-secondary px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                    >
                      {creatingTeamMember
                        ? "Creating..."
                        : "Create Admin Account"}
                    </button>
                  </div>

                  {temporaryPassword && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-950/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                        Generated Temporary Password
                      </p>
                      <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">
                        {temporaryPassword}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div
                id="admin-users"
                className={
                  activeSection === "users" || activeSection === "settings"
                    ? "space-y-4"
                    : "hidden"
                }
              >
                <div className="flex items-center justify-between px-1 gap-3">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    {activeSection === "settings"
                      ? "Role Switcher"
                      : "User Directory"}
                  </h3>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                    {filteredUsers.length}/{usersTotal}
                  </span>
                </div>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  {activeSection === "users" && (
                    <div className="rounded-[1.4rem] border border-cyan-200/70 bg-cyan-50/80 px-4 py-3 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-950/20 dark:text-cyan-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-70">
                        Read-only page
                      </p>
                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-bold leading-relaxed">
                          Role switching now lives only in Admin Settings so
                          permission changes happen in one deliberate place.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSectionChange("settings")}
                          className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-900/10"
                        >
                          Open Settings
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search users by name or email"
                    className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                  />

                  {usersLoading && (
                    <p className="text-sm font-bold text-text-light">
                      Loading users...
                    </p>
                  )}

                  {!usersLoading && usersError && (
                    <p className="text-sm font-bold text-red-500">
                      {usersError}
                    </p>
                  )}

                  {!usersLoading &&
                    !usersError &&
                    filteredUsers.length === 0 && (
                      <EmptyStateCard
                        Icon={Users}
                        title={search.trim() ? "No users match that search" : "No users loaded yet"}
                        description={
                          search.trim()
                            ? "Try a different name, email, profile type, or role."
                            : "New accounts will appear here after they sign up or are created by an admin."
                        }
                      />
                    )}

                  {!usersLoading && !usersError && filteredUsers.length > 0 && (
                    <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                      {filteredUsers.map((user) => {
                        const selectedRole = roleDrafts[user.id] || user.role;
                        const isActing = actingUserId === user.id;
                        const canPromoteManager = user.role !== "manager";
                        const canPromoteAdmin = user.role !== "admin";
                        const canDemote = user.role !== "user";

                        return (
                          <div
                            key={user.id}
                            className="bg-surface-gray dark:bg-zinc-900 rounded-xl border border-border-gray dark:border-zinc-800 p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-foreground truncate">
                                  {user.name}
                                </p>
                                <p className="text-[10px] font-semibold text-text-light truncate">
                                  {user.email}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mt-1">
                                  {user.role} | {user.profileType || "baby"} |
                                  Babies {user.babiesCount || 0}
                                </p>
                              </div>
                              <span className="text-[9px] font-black text-text-light uppercase tracking-widest whitespace-nowrap">
                                {formatDateTime(
                                  user.lastSignInAt ||
                                    user.createdAt ||
                                    undefined,
                                )}
                              </span>
                            </div>

                            {activeSection === "settings" ? (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={selectedRole}
                                    onChange={(event) =>
                                      setRoleDrafts((prev) => ({
                                        ...prev,
                                        [user.id]: event.target.value,
                                      }))
                                    }
                                    className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-foreground outline-none"
                                    disabled={isActing}
                                  >
                                    {ROLE_OPTIONS.map((role) => (
                                      <option key={role} value={role}>
                                        {role}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleApplyRole(user)}
                                    disabled={
                                      isActing || selectedRole === user.role
                                    }
                                    className="rounded-lg bg-secondary text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 disabled:opacity-50"
                                  >
                                    Apply Role
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() =>
                                      handlePromote(user, "manager")
                                    }
                                    disabled={isActing || !canPromoteManager}
                                    className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-foreground disabled:opacity-50"
                                  >
                                    Promote Manager
                                  </button>
                                  <button
                                    onClick={() => handlePromote(user, "admin")}
                                    disabled={isActing || !canPromoteAdmin}
                                    className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-foreground disabled:opacity-50"
                                  >
                                    Promote Admin
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleDemote(user)}
                                    disabled={isActing || !canDemote}
                                    className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-foreground disabled:opacity-50"
                                  >
                                    Demote User
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    disabled={isActing}
                                    className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-red-600 dark:text-red-300 disabled:opacity-50"
                                  >
                                    Delete User
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-3 text-[10px] font-bold leading-relaxed text-text-light dark:border-white/10 dark:bg-white/5">
                                Role controls are available from Admin Settings
                                only.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div
                id="admin-activity"
                className={activeSection === "activity" ? "space-y-4" : "hidden"}
              >
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Admin Activity
                </h3>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">
                    Action Logs
                  </p>
                  {(logs || []).length === 0 ? (
                    <EmptyStateCard
                      Icon={ScrollText}
                      title="No admin actions yet"
                      description="Sensitive actions such as role changes, pricing updates, and payment toggles will appear here."
                    />
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 6).map((log, index) => (
                        <div
                          key={`${log.id || index}`}
                          className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {String(log.action || "action")}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1 break-all">
                            target: {String(log.target_user_id || "-")}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1">
                            {formatDateTime(String(log.created_at || ""))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">
                    Role Audit Trail
                  </p>
                  {(auditLogs || []).length === 0 ? (
                    <EmptyStateCard
                      Icon={ShieldCheck}
                      title="No role changes recorded"
                      description="When an admin promotes, demotes, or switches a user role, the audit trail will capture it here."
                    />
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.slice(0, 6).map((log, index) => (
                        <div
                          key={`${log.id || index}`}
                          className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {String(log.previous_role || "user")}
                            {" -> "}
                            {String(log.new_role || "user")}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1 break-all">
                            user: {String(log.user_id || "-")}
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
                id="admin-billing"
                className={activeSection === "billing" ? "space-y-4" : "hidden"}
              >
                <div className="flex items-center justify-between px-1 gap-3">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    Billing Ops
                  </h3>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                    {billingEvents.length}/{billingTotal}
                  </span>
                </div>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-4">
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
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 px-3 py-3"
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={billingSearch}
                      onChange={(event) => setBillingSearch(event.target.value)}
                      placeholder="Search reference, email, or plan"
                      className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={billingStatusFilter}
                        onChange={(event) =>
                          setBillingStatusFilter(event.target.value)
                        }
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-foreground outline-none"
                      >
                        <option value="">All status</option>
                        <option value="failed">Failed</option>
                        <option value="reconciled">Reconciled</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select
                        value={billingRecoveryFilter}
                        onChange={(event) =>
                          setBillingRecoveryFilter(event.target.value)
                        }
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-2 py-2 text-[11px] font-black uppercase tracking-wider text-foreground outline-none"
                      >
                        <option value="">All recovery</option>
                        <option value="eligible">Eligible</option>
                        <option value="retry_scheduled">Retry scheduled</option>
                        <option value="retrying">Retrying</option>
                        <option value="recovered">Recovered</option>
                        <option value="abandoned">Abandoned</option>
                      </select>
                      <button
                        onClick={() => void handleExportBilling()}
                        className="rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {billingLoading && (
                    <p className="text-sm font-bold text-text-light">
                      Loading billing operations data...
                    </p>
                  )}

                  {!billingLoading && billingError && (
                    <p className="text-sm font-bold text-red-500">
                      {billingError}
                    </p>
                  )}

                  {!billingLoading &&
                    !billingError &&
                    billingEvents.length === 0 && (
                      <EmptyStateCard
                        Icon={Receipt}
                        title="No billing events match"
                        description="Clear the filters or wait for Paystack events to sync before retrying recovery actions."
                      />
                    )}

                  {!billingLoading &&
                    !billingError &&
                    billingEvents.length > 0 && (
                      <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                        {billingEvents.map((entry) => {
                          const isActing =
                            billingActingReference === entry.reference;

                          return (
                            <div
                              key={entry.id}
                              className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3 space-y-3"
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

                              <div className="space-y-1 text-[10px] font-semibold text-text-dim">
                                <p>Email: {entry.customer_email || "-"}</p>
                                <p>
                                  Attempted:{" "}
                                  {formatDateTime(
                                    entry.attempted_at || undefined,
                                  )}
                                </p>
                                <p>
                                  Retries: {entry.retry_count || 0}
                                  {entry.next_retry_at
                                    ? ` | Next ${formatDateTime(entry.next_retry_at)}`
                                    : ""}
                                </p>
                                {(entry.failure_code ||
                                  entry.failure_source) && (
                                  <p>
                                    Failure: {entry.failure_code || "-"} |{" "}
                                    {entry.failure_source || "-"}
                                  </p>
                                )}
                                {entry.error_message && (
                                  <p className="text-rose-500">
                                    {entry.error_message}
                                  </p>
                                )}
                              </div>

                              {entry.payment_event_transitions?.length ? (
                                <div className="rounded-lg border border-border-gray dark:border-zinc-800 bg-background dark:bg-zinc-950 px-3 py-2">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-text-light">
                                    Recent Timeline
                                  </p>
                                  {entry.payment_event_transitions
                                    .slice(0, 3)
                                    .map((transition) => (
                                      <p
                                        key={transition.id}
                                        className="mt-1 text-[10px] font-semibold text-text-dim"
                                      >
                                        {transition.event_type}
                                        {" -> "}
                                        {transition.new_status}
                                        {" | "}
                                        {formatDateTime(transition.created_at)}
                                      </p>
                                    ))}
                                </div>
                              ) : null}

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
                                  Retry Now
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
                                  Mark Reconciled
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
                                  Mark Cancelled
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
                id="admin-data"
                className={activeSection === "data" ? "space-y-4" : "hidden"}
              >
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Recent Data
                </h3>
                <div className="space-y-4">
                  {recentSections.length === 0 && (
                    <EmptyStateCard
                      Icon={Database}
                      title="No recent rows available"
                      description="The admin overview endpoint did not return recent table snapshots yet."
                    />
                  )}

                  {recentSections.map(([table, rows]) => (
                    <details
                      key={table}
                      className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4"
                    >
                      <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                        <span className="text-sm font-headline font-black text-foreground tracking-tight">
                          {table}
                        </span>
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                          {rows.length} rows
                        </span>
                      </summary>

                      <div className="mt-3 space-y-2">
                        {rows.map((row, index) => (
                          <div
                            key={`${table}-${index}`}
                            className="bg-surface-gray dark:bg-zinc-900 rounded-xl p-3 border border-border-gray dark:border-zinc-800"
                          >
                            {Object.entries(row).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-start justify-between gap-3 py-0.5"
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-light">
                                  {key}
                                </span>
                                <span className="text-[10px] font-bold text-foreground text-right break-all">
                                  {key.includes("date") ||
                                  key.includes("time") ||
                                  key.endsWith("_at")
                                    ? formatDateTime(
                                        typeof value === "string"
                                          ? value
                                          : undefined,
                                      )
                                    : formatAny(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
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
