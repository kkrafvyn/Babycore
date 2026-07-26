import React from 'react';
import { KeyRound, Mail, Shield, Trash2 } from 'lucide-react';
import type { AdminUserRecord } from '../../lib/admin-api';

const ROLE_OPTIONS = ['admin', 'manager', 'user', 'doctor', 'caregiver', 'viewer'] as const;

const roleBadgeClass = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950';
    case 'manager':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200';
    case 'doctor':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200';
    case 'caregiver':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-200';
  }
};

const getInitials = (name: string, email: string): string => {
  const source = name.trim() || email.trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

export interface AdminUserManagementCardProps {
  user: AdminUserRecord;
  selectedRole: string;
  isActing: boolean;
  formatDateTime: (value?: string) => string;
  onRoleChange: (userId: string, role: string) => void;
  onApplyRole: (user: AdminUserRecord) => void;
  onPromote: (user: AdminUserRecord, role: 'manager' | 'admin') => void;
  onDemote: (user: AdminUserRecord) => void;
  onDelete: (user: AdminUserRecord) => void;
  onResetTemporaryPassword: (user: AdminUserRecord) => void;
  onGenerateRecoveryLink: (user: AdminUserRecord) => void;
}

export const AdminUserManagementCard: React.FC<AdminUserManagementCardProps> = ({
  user,
  selectedRole,
  isActing,
  formatDateTime,
  onRoleChange,
  onApplyRole,
  onPromote,
  onDemote,
  onDelete,
  onResetTemporaryPassword,
  onGenerateRecoveryLink,
}) => {
  const canPromoteManager = user.role !== 'manager';
  const canPromoteAdmin = user.role !== 'admin';
  const canDemote = user.role !== 'user';

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400" />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-black text-white dark:from-white dark:to-zinc-200 dark:text-zinc-950">
            {getInitials(user.name, user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-black text-foreground">{user.name}</p>
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${roleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-text-dim">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-text-light">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/5">
                <Shield size={11} />
                {user.profileType || 'baby'}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/5">
                Babies {user.babiesCount || 0}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/5">
                {formatDateTime(user.lastSignInAt || user.createdAt || undefined)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-text-light">
            Password access
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onResetTemporaryPassword(user)}
              disabled={isActing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-foreground transition-all hover:border-secondary hover:text-secondary disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900"
            >
              <KeyRound size={14} />
              Set temp password
            </button>
            <button
              type="button"
              onClick={() => onGenerateRecoveryLink(user)}
              disabled={isActing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-foreground transition-all hover:border-secondary hover:text-secondary disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900"
            >
              <Mail size={14} />
              Reset link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select
            value={selectedRole}
            onChange={(event) => onRoleChange(user.id, event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-foreground outline-none focus:border-secondary dark:border-white/10 dark:bg-zinc-900"
            disabled={isActing}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onApplyRole(user)}
            disabled={isActing || selectedRole === user.role}
            className="rounded-xl bg-secondary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
          >
            Apply role
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPromote(user, 'manager')}
            disabled={isActing || !canPromoteManager}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900"
          >
            Promote manager
          </button>
          <button
            type="button"
            onClick={() => onPromote(user, 'admin')}
            disabled={isActing || !canPromoteAdmin}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900"
          >
            Promote admin
          </button>
          <button
            type="button"
            onClick={() => onDemote(user)}
            disabled={isActing || !canDemote}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900"
          >
            Demote user
          </button>
          <button
            type="button"
            onClick={() => onDelete(user)}
            disabled={isActing}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
};
