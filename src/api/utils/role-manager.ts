import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from './auth';

export type UserRole = 'admin' | 'manager' | 'user' | 'caregiver' | 'viewer';

export interface RolePermissions {
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewAnalytics: boolean;
  canDeleteData: boolean;
  canAccessPayments: boolean;
  canAccessReports: boolean;
  canModerateContent: boolean;
}

// Role-based permissions matrix
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

// Get permissions for a role
export function getPermissions(role: UserRole): RolePermissions {
  return rolePermissions[role] || rolePermissions.user;
}

// Check if user has permission
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  const perms = getPermissions(role);
  return perms[permission] || false;
}

// Middleware factory for permission checks
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

/**
 * Assign role to user (Admin only)
 */
export async function assignRoleToUser(
  userId: string,
  role: UserRole,
  assignedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      return { success: false, error: 'Failed to check user' };
    }

    if (user) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get user role
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return 'user';
    }

    return data.role as UserRole;
  } catch (error) {
    return 'user';
  }
}

/**
 * List all users with their roles (Admin only)
 */
export async function listUsersWithRoles(limit = 50, offset = 0) {
  try {
    const { data, error, count } = await supabase
      .from('user_roles')
      .select(
        `
        id,
        user_id,
        role,
        assigned_at,
        assigned_by
      `,
        { count: 'exact' }
      )
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return {
      users: data,
      total: count,
      limit,
      offset,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get role statistics (Admin only)
 */
export async function getRoleStatistics() {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role', { count: 'exact' });

    if (error) {
      throw error;
    }

    const stats = {
      admin: 0,
      manager: 0,
      user: 0,
      caregiver: 0,
      viewer: 0,
    };

    data?.forEach((record: any) => {
      const role = record.role as UserRole;
      if (role in stats) {
        stats[role]++;
      }
    });

    return stats;
  } catch (error) {
    throw error;
  }
}

/**
 * Promote user to manager or admin
 */
export async function promoteUser(userId: string, newRole: 'manager' | 'admin', promotedBy: string) {
  try {
    // Can only promote to manager or admin
    if (!['manager', 'admin'].includes(newRole)) {
      return { success: false, error: 'Invalid promotion role' };
    }

    // Check current role
    const currentRole = await getUserRole(userId);
    if (currentRole === 'admin' && newRole === 'manager') {
      return { success: false, error: 'Cannot demote an admin' };
    }

    const result = await assignRoleToUser(userId, newRole, promotedBy);
    return result;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Demote user back to regular user
 */
export async function demoteUser(userId: string, demotedBy: string) {
  try {
    const result = await assignRoleToUser(userId, 'user', demotedBy);
    return result;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Log role assignment for audit purposes
 */
export async function logRoleAssignment(
  userId: string,
  previousRole: string,
  newRole: string,
  assignedBy: string,
  reason?: string
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
