import type { Response } from 'express';
import { supabase } from './supabase.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  USER_ROLE_VALUES,
  enrichAuthUsersWithEffectiveRoles,
  getEffectiveRoleForUserId,
  listAllAuthUsers,
  type UserRole,
} from './effective-role.js';

export type { UserRole } from './effective-role.js';

export interface RolePermissions {
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewAnalytics: boolean;
  canDeleteData: boolean;
  canAccessPayments: boolean;
  canAccessReports: boolean;
  canModerateContent: boolean;
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canManageRoles: true,
    canViewAnalytics: true,
    canDeleteData: true,
    canAccessPayments: true,
    canAccessReports: true,
    canModerateContent: true,
  },
  manager: {
    canManageUsers: false,
    canManageRoles: false,
    canViewAnalytics: true,
    canDeleteData: false,
    canAccessPayments: true,
    canAccessReports: true,
    canModerateContent: true,
  },
  doctor: {
    canManageUsers: false,
    canManageRoles: false,
    canViewAnalytics: false,
    canDeleteData: false,
    canAccessPayments: false,
    canAccessReports: true,
    canModerateContent: false,
  },
  user: {
    canManageUsers: false,
    canManageRoles: false,
    canViewAnalytics: false,
    canDeleteData: false,
    canAccessPayments: true,
    canAccessReports: true,
    canModerateContent: false,
  },
  caregiver: {
    canManageUsers: false,
    canManageRoles: false,
    canViewAnalytics: false,
    canDeleteData: false,
    canAccessPayments: false,
    canAccessReports: true,
    canModerateContent: false,
  },
  viewer: {
    canManageUsers: false,
    canManageRoles: false,
    canViewAnalytics: false,
    canDeleteData: false,
    canAccessPayments: false,
    canAccessReports: true,
    canModerateContent: false,
  },
};

export function getPermissions(role: UserRole): RolePermissions {
  return rolePermissions[role] || rolePermissions.user;
}

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  const perms = getPermissions(role);
  return perms[permission] || false;
}

export function requirePermission(permission: keyof RolePermissions) {
  return (req: AuthRequest, res: Response, next: any) => {
    const role = (req.userRole || 'user') as UserRole;

    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredPermission: permission,
        yourRole: role,
      });
    }

    next();
  };
}

export async function assignRoleToUser(
  userId: string,
  role: UserRole,
  assignedBy: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existingRole, error: fetchError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message || 'Failed to check current role' };
    }

    const now = new Date().toISOString();

    if (existingRole?.id) {
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          role,
          assigned_by: assignedBy,
          assigned_at: now,
          updated_at: now,
        })
        .eq('user_id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    }

    const { error: insertError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
      assigned_by: assignedBy,
      assigned_at: now,
      updated_at: now,
      created_at: now,
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    return await getEffectiveRoleForUserId(userId);
  } catch {
    return 'user';
  }
}

export async function listUsersWithRoles(limit = 50, offset = 0, search = '') {
  const authUsers = await listAllAuthUsers();
  const enrichedUsers = await enrichAuthUsersWithEffectiveRoles(authUsers);
  const normalizedQuery = String(search || '').trim().toLowerCase();

  const filteredUsers = normalizedQuery
    ? enrichedUsers.filter((user) =>
        `${user.name} ${user.email} ${user.phone || ''} ${user.role} ${user.profileType || ''}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : enrichedUsers;

  const users = filteredUsers.slice(offset, offset + limit);

  return {
    users,
    total: filteredUsers.length,
    limit,
    offset,
    page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
    hasMore: offset + users.length < filteredUsers.length,
  };
}

export async function getRoleStatistics(): Promise<Record<UserRole, number>> {
  const authUsers = await listAllAuthUsers();
  const enrichedUsers = await enrichAuthUsersWithEffectiveRoles(authUsers);
  const stats = Object.fromEntries(USER_ROLE_VALUES.map((role) => [role, 0])) as Record<UserRole, number>;

  for (const user of enrichedUsers) {
    stats[user.role] = (stats[user.role] || 0) + 1;
  }

  return stats;
}

export async function getRoleDistribution(): Promise<Array<{ role: UserRole; count: number }>> {
  const stats = await getRoleStatistics();

  return Object.entries(stats)
    .map(([role, count]) => ({
      role: role as UserRole,
      count,
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
}

export async function promoteUser(
  userId: string,
  newRole: 'manager' | 'admin',
  promotedBy: string,
) {
  try {
    if (!['manager', 'admin'].includes(newRole)) {
      return { success: false, error: 'Invalid promotion role' };
    }

    const currentRole = await getUserRole(userId);
    if (currentRole === 'admin' && newRole === 'manager') {
      return { success: false, error: 'Cannot demote an admin' };
    }

    return assignRoleToUser(userId, newRole, promotedBy);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function demoteUser(userId: string, demotedBy: string) {
  try {
    return assignRoleToUser(userId, 'user', demotedBy);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function logRoleAssignment(
  userId: string,
  previousRole: string,
  newRole: string,
  assignedBy: string,
  reason?: string,
) {
  try {
    const { error } = await supabase.from('role_assignment_logs').insert({
      user_id: userId,
      previous_role: previousRole,
      new_role: newRole,
      assigned_by: assignedBy,
      reason,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log role assignment:', error);
    }
  } catch (error) {
    console.error('Failed to log role assignment:', error);
  }
}
