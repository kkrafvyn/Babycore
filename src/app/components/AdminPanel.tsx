import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  deleteAdminUser,
  demoteAdminUser,
  fetchAdminAuditLogs,
  fetchAdminLogs,
  fetchAdminOverview,
  fetchAdminUsers,
  promoteAdminUser,
  updateAdminUserRole,
  type AdminUserRecord,
} from '../../lib/admin-api';

interface AdminPanelProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatAny = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
};

const ROLE_OPTIONS = ['admin', 'manager', 'user', 'caregiver', 'viewer'] as const;

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [roleDistribution, setRoleDistribution] = useState<Array<{ role: string; count: number }>>([]);
  const [recent, setRecent] = useState<Record<string, any[]>>({});
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, any>>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, any>>>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const loadOverview = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const response = await fetchAdminOverview();
    if (!response.success || !response.data) {
      setError(response.error || 'Unable to load admin overview.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setCounts(response.data.counts || {});
    setRoleDistribution(response.data.roleDistribution || []);
    setRecent(response.data.recent || {});
    setGeneratedAt(response.data.generatedAt || '');
    setLoading(false);
    setRefreshing(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    const response = await fetchAdminUsers({ limit: 100, offset: 0 });
    if (!response.success || !response.data) {
      setUsersError(response.error || 'Unable to load admin users.');
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

  const loadAdminLogs = async () => {
    const [actions, audit] = await Promise.all([
      fetchAdminLogs({ limit: 20, offset: 0 }),
      fetchAdminAuditLogs({ limit: 20, offset: 0 }),
    ]);

    setLogs(actions.success && actions.data ? actions.data.logs || [] : []);
    setAuditLogs(audit.success && audit.data ? audit.data.logs || [] : []);
  };

  const refreshAll = async (isRefresh = false) => {
    await Promise.all([loadOverview(isRefresh), loadUsers(), loadAdminLogs()]);
  };

  const handleApplyRole = async (user: AdminUserRecord) => {
    const nextRole = (roleDrafts[user.id] || user.role) as
      | 'admin'
      | 'manager'
      | 'user'
      | 'caregiver'
      | 'viewer';

    if (!nextRole || nextRole === user.role) return;

    setActingUserId(user.id);
    const result = await updateAdminUserRole(user.id, nextRole);
    setActingUserId(null);

    if (!result.success) {
      toast.error(result.error || 'Failed to update role.');
      return;
    }

    toast.success(`${user.name}'s role updated to ${nextRole}.`);
    await Promise.all([loadUsers(), loadAdminLogs(), loadOverview(true)]);
  };

  const handlePromote = async (user: AdminUserRecord, nextRole: 'manager' | 'admin') => {
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
    if (user.role === 'user') return;
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

  useEffect(() => {
    refreshAll();
  }, []);

  const countEntries = useMemo(
    () =>
      Object.entries(counts).sort((a, b) => b[1] - a[1]),
    [counts],
  );

  const recentSections = useMemo(
    () =>
      Object.entries(recent).filter(([, values]) => Array.isArray(values) && values.length > 0),
    [recent],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const haystack = `${user.name} ${user.email} ${user.role} ${user.profileType || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search]);

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
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Admin Panel</span>
        </div>

        <button
          onClick={() => refreshAll(true)}
          disabled={refreshing || loading}
          className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg disabled:opacity-60 active:scale-90 transition-all"
          title="Refresh admin data"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-14">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="bg-surface rounded-[3rem] p-8 border border-border-gray dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">System Visibility</p>
                <h2 className="text-2xl font-headline font-black text-foreground tracking-tight mt-2">
                  Full Platform Overview
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            </div>
            <p className="text-[11px] font-bold text-text-dim mt-4">
              Generated: {generatedAt ? formatDateTime(generatedAt) : '-'}
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
              <p className="text-sm font-bold text-text-light">Loading admin data...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">Totals</h3>
                <div className="grid grid-cols-2 gap-3">
                  {countEntries.map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-surface rounded-[1.6rem] border border-border-gray dark:border-zinc-800 p-4"
                    >
                      <p className="text-[9px] font-black text-text-light uppercase tracking-widest">{label}</p>
                      <p className="text-2xl font-headline font-black text-foreground mt-2">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Role Distribution
                </h3>
                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-2">
                  {roleDistribution.length === 0 && (
                    <p className="text-sm font-bold text-text-light">No role distribution data.</p>
                  )}
                  {roleDistribution.map((item) => (
                    <div
                      key={item.role}
                      className="bg-surface-gray dark:bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-light">
                        {item.role}
                      </p>
                      <p className="text-lg font-headline font-black text-foreground">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 gap-3">
                  <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em]">
                    User Management
                  </h3>
                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                    {filteredUsers.length}/{usersTotal}
                  </span>
                </div>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search users by name or email"
                    className="w-full rounded-xl border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-900 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-secondary transition-all"
                  />

                  {usersLoading && (
                    <p className="text-sm font-bold text-text-light">Loading users...</p>
                  )}

                  {!usersLoading && usersError && (
                    <p className="text-sm font-bold text-red-500">{usersError}</p>
                  )}

                  {!usersLoading && !usersError && filteredUsers.length === 0 && (
                    <p className="text-sm font-bold text-text-light">No users found.</p>
                  )}

                  {!usersLoading && !usersError && filteredUsers.length > 0 && (
                    <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                      {filteredUsers.map((user) => {
                        const selectedRole = roleDrafts[user.id] || user.role;
                        const isActing = actingUserId === user.id;
                        const canPromoteManager = user.role !== 'manager';
                        const canPromoteAdmin = user.role !== 'admin';
                        const canDemote = user.role !== 'user';

                        return (
                          <div
                            key={user.id}
                            className="bg-surface-gray dark:bg-zinc-900 rounded-xl border border-border-gray dark:border-zinc-800 p-3 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-foreground truncate">{user.name}</p>
                                <p className="text-[10px] font-semibold text-text-light truncate">{user.email}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mt-1">
                                  {user.role} | {user.profileType || 'baby'} | Babies {user.babiesCount || 0}
                                </p>
                              </div>
                              <span className="text-[9px] font-black text-text-light uppercase tracking-widest whitespace-nowrap">
                                {formatDateTime(user.lastSignInAt || user.createdAt || undefined)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={selectedRole}
                                onChange={(event) =>
                                  setRoleDrafts((prev) => ({ ...prev, [user.id]: event.target.value }))
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
                                disabled={isActing || selectedRole === user.role}
                                className="rounded-lg bg-secondary text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 disabled:opacity-50"
                              >
                                Apply Role
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handlePromote(user, 'manager')}
                                disabled={isActing || !canPromoteManager}
                                className="rounded-lg border border-border-gray dark:border-zinc-700 bg-background dark:bg-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-foreground disabled:opacity-50"
                              >
                                Promote Manager
                              </button>
                              <button
                                onClick={() => handlePromote(user, 'admin')}
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
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Admin Activity
                </h3>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Action Logs</p>
                  {(logs || []).length === 0 ? (
                    <p className="text-sm font-bold text-text-light">No admin actions logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 6).map((log, index) => (
                        <div
                          key={`${log.id || index}`}
                          className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {String(log.action || 'action')}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1 break-all">
                            target: {String(log.target_user_id || '-')}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1">
                            {formatDateTime(String(log.created_at || ''))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-4 space-y-3">
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Role Audit Trail</p>
                  {(auditLogs || []).length === 0 ? (
                    <p className="text-sm font-bold text-text-light">No role assignment changes logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.slice(0, 6).map((log, index) => (
                        <div
                          key={`${log.id || index}`}
                          className="rounded-xl border border-border-gray dark:border-zinc-700 bg-surface-gray dark:bg-zinc-900 p-3"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {String(log.previous_role || 'user')}
                            {' -> '}
                            {String(log.new_role || 'user')}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1 break-all">
                            user: {String(log.user_id || '-')}
                          </p>
                          <p className="text-[10px] font-semibold text-text-light mt-1">
                            {formatDateTime(String(log.created_at || ''))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] px-1">
                  Recent Data
                </h3>
                <div className="space-y-4">
                  {recentSections.length === 0 && (
                    <div className="bg-surface rounded-[2rem] border border-border-gray dark:border-zinc-800 p-6">
                      <p className="text-sm font-bold text-text-light">No recent rows available.</p>
                    </div>
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
                              <div key={key} className="flex items-start justify-between gap-3 py-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-text-light">
                                  {key}
                                </span>
                                <span className="text-[10px] font-bold text-foreground text-right break-all">
                                  {key.includes('date') || key.includes('time') || key.endsWith('_at')
                                    ? formatDateTime(typeof value === 'string' ? value : undefined)
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
