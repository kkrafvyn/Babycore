import React, { useState } from 'react';
import { ChevronDown, Copy, KeyRound, Link2, Trash2, UserCog } from 'lucide-react';
import type { AdminUserRecord } from '../../lib/admin-api';

const ROLE_OPTIONS = ['admin', 'manager', 'user', 'doctor', 'caregiver', 'viewer'] as const;

export type UserPasswordResetResult = {
  mode: 'temporary' | 'recovery_link';
  email: string;
  temporaryPassword?: string;
  recoveryLink?: string;
  emailSent?: boolean;
  emailError?: string;
};

const roleBadgeClass = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-slate-800 text-white';
    case 'manager':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200';
    case 'doctor':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200';
    case 'caregiver':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200';
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
  resetResult?: UserPasswordResetResult | null;
  formatDateTime: (value?: string) => string;
  onRoleChange: (userId: string, role: string) => void;
  onApplyRole: (user: AdminUserRecord) => void;
  onPromote: (user: AdminUserRecord, role: 'manager' | 'admin') => void;
  onDemote: (user: AdminUserRecord) => void;
  onDelete: (user: AdminUserRecord) => void;
  onResetPassword: (user: AdminUserRecord, password?: string) => void;
  onSendRecoveryLink: (user: AdminUserRecord) => void;
  onCopy: (value: string, message: string) => void;
}

export const AdminUserManagementCard: React.FC<AdminUserManagementCardProps> = ({
  user,
  selectedRole,
  isActing,
  resetResult,
  formatDateTime,
  onRoleChange,
  onApplyRole,
  onPromote,
  onDemote,
  onDelete,
  onResetPassword,
  onSendRecoveryLink,
  onCopy,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [showRoleTools, setShowRoleTools] = useState(false);

  const canPromoteManager = user.role !== 'manager';
  const canPromoteAdmin = user.role !== 'admin';
  const canDemote = user.role !== 'user';
  const resetValue =
    resetResult?.mode === 'temporary' ? resetResult.temporaryPassword : resetResult?.recoveryLink;
  const showResetResult =
    resetResult &&
    (resetResult.mode === 'temporary'
      ? Boolean(resetValue)
      : Boolean(resetValue) || Boolean(resetResult.emailSent) || Boolean(resetResult.emailError));

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#45697d] text-sm font-bold text-white">
            {getInitials(user.name, user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-foreground">{user.name || 'Unnamed user'}</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-text-dim">{user.email}</p>
            <p className="mt-1 text-xs text-text-light">
              {user.profileType || 'baby'} profile · {user.babiesCount || 0} babies · Last active{' '}
              {formatDateTime(user.lastSignInAt || user.createdAt || undefined)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#dbeef6] bg-[#f7fbff] p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
          <div className="mb-3 flex items-center gap-2 text-[#45697d] dark:text-sky-300">
            <KeyRound size={16} />
            <p className="text-sm font-bold">Reset password</p>
          </div>
          <label className="mb-2 block text-xs font-medium text-text-dim" htmlFor={`password-${user.id}`}>
            New password (leave blank to auto-generate)
          </label>
          <input
            id={`password-${user.id}`}
            type="text"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Optional custom password"
            disabled={isActing}
            className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#45697d] focus:ring-2 focus:ring-[#45697d]/15 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onResetPassword(user, newPassword.trim() || undefined)}
              disabled={isActing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#45697d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3a5869] disabled:opacity-50"
            >
              <KeyRound size={15} />
              {isActing ? 'Resetting…' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => onSendRecoveryLink(user)}
              disabled={isActing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-[#45697d] hover:text-[#45697d] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <Link2 size={15} />
              {isActing ? 'Sending…' : 'Send reset link'}
            </button>
          </div>

          {showResetResult && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {resetResult.mode === 'temporary'
                      ? 'New password for this user'
                      : resetResult.emailSent
                        ? `Reset email sent to ${resetResult.email}`
                        : 'Reset link for this user'}
                  </p>
                  {resetResult.emailError && !resetResult.emailSent && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-300">{resetResult.emailError}</p>
                  )}
                  {resetValue && (
                    <p className="mt-1 break-all font-mono text-sm text-foreground">{resetValue}</p>
                  )}
                </div>
                {resetValue && (
                  <button
                    type="button"
                    onClick={() => onCopy(resetValue, 'Copied to clipboard.')}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1.5 text-xs font-semibold text-white dark:bg-amber-300 dark:text-amber-950"
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowRoleTools((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserCog size={16} className="text-text-dim" />
              Role & account actions
            </span>
            <ChevronDown
              size={16}
              className={`text-text-light transition-transform ${showRoleTools ? 'rotate-180' : ''}`}
            />
          </button>

          {showRoleTools && (
            <div className="space-y-3 border-t border-slate-200 px-4 py-4 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <select
                  value={selectedRole}
                  onChange={(event) => onRoleChange(user.id, event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-[#45697d] dark:border-zinc-700 dark:bg-zinc-900"
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
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
                >
                  Apply role
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => onPromote(user, 'manager')}
                  disabled={isActing || !canPromoteManager}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-foreground disabled:opacity-50 dark:border-zinc-700"
                >
                  → Manager
                </button>
                <button
                  type="button"
                  onClick={() => onPromote(user, 'admin')}
                  disabled={isActing || !canPromoteAdmin}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-foreground disabled:opacity-50 dark:border-zinc-700"
                >
                  → Admin
                </button>
                <button
                  type="button"
                  onClick={() => onDemote(user)}
                  disabled={isActing || !canDemote}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-foreground disabled:opacity-50 dark:border-zinc-700"
                >
                  → User
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(user)}
                  disabled={isActing}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-600 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
