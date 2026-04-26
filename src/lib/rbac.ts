/**
 * Role-Based Access Control (RBAC) System
 * Manages user roles: Admin, Manager, User
 */

export type UserRole = 'admin' | 'manager' | 'user';

export interface RolePermission {
  [key: string]: boolean;
}

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  permissions: RolePermission;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDefinition {
  name: UserRole;
  displayName: string;
  description: string;
  permissions: RolePermission;
}

/**
 * Permission definitions for all roles
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermission> = {
  admin: {
    // User Management
    'user.create': true,
    'user.read': true,
    'user.update': true,
    'user.delete': true,
    'user.manage_roles': true,

    // Subscription Management
    'subscription.view_all': true,
    'subscription.create': true,
    'subscription.update': true,
    'subscription.cancel': true,
    'subscription.generate_invoices': true,

    // Data Management
    'data.export': true,
    'data.import': true,
    'data.backup': true,
    'data.restore': true,
    'data.delete': true,

    // Reporting
    'reports.view_all': true,
    'reports.generate': true,
    'reports.export': true,

    // Settings
    'settings.app': true,
    'settings.security': true,
    'settings.integrations': true,

    // Sync Management
    'sync.manage': true,
    'sync.view_logs': true,

    // Analytics
    'analytics.view': true,
    'analytics.export': true,

    // Features
    'feature.growth_chart': true,
    'feature.vaccination': true,
    'feature.notifications': true,
    'feature.cloud_sync': true,
    'feature.multi_baby': true,
    'feature.export': true,
  },

  manager: {
    // User Management
    'user.create': true,
    'user.read': true,
    'user.update': true,
    'user.delete': false,
    'user.manage_roles': false,

    // Subscription Management
    'subscription.view_all': true,
    'subscription.create': false,
    'subscription.update': true,
    'subscription.cancel': false,
    'subscription.generate_invoices': true,

    // Data Management
    'data.export': true,
    'data.import': true,
    'data.backup': true,
    'data.restore': false,
    'data.delete': false,

    // Reporting
    'reports.view_all': true,
    'reports.generate': true,
    'reports.export': true,

    // Settings
    'settings.app': true,
    'settings.security': false,
    'settings.integrations': false,

    // Sync Management
    'sync.manage': false,
    'sync.view_logs': true,

    // Analytics
    'analytics.view': true,
    'analytics.export': true,

    // Features
    'feature.growth_chart': true,
    'feature.vaccination': true,
    'feature.notifications': true,
    'feature.cloud_sync': true,
    'feature.multi_baby': true,
    'feature.export': true,
  },

  user: {
    // User Management
    'user.create': false,
    'user.read': false,
    'user.update': true, // Can only update own profile
    'user.delete': false,
    'user.manage_roles': false,

    // Subscription Management
    'subscription.view_all': false,
    'subscription.create': false,
    'subscription.update': false,
    'subscription.cancel': false,
    'subscription.generate_invoices': false,

    // Data Management
    'data.export': true,
    'data.import': false,
    'data.backup': false,
    'data.restore': false,
    'data.delete': false,

    // Reporting
    'reports.view_all': false,
    'reports.generate': false,
    'reports.export': false,

    // Settings
    'settings.app': true,
    'settings.security': true,
    'settings.integrations': false,

    // Sync Management
    'sync.manage': false,
    'sync.view_logs': false,

    // Analytics
    'analytics.view': false,
    'analytics.export': false,

    // Features
    'feature.growth_chart': true,
    'feature.vaccination': true,
    'feature.notifications': true,
    'feature.cloud_sync': true,
    'feature.multi_baby': true,
    'feature.export': true,
  },
};

/**
 * Role definitions with metadata
 */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access. Can manage users, subscriptions, and system settings.',
    permissions: ROLE_PERMISSIONS.admin,
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Can manage users and view reports. Limited subscription management.',
    permissions: ROLE_PERMISSIONS.manager,
  },
  {
    name: 'user',
    displayName: 'User',
    description: 'Standard user. Can track baby activities and manage personal settings.',
    permissions: ROLE_PERMISSIONS.user,
  },
];

/**
 * RBAC Service Class
 */
export class RBACService {
  private static instance: RBACService;
  private currentUser: UserWithRole | null = null;

  private constructor() {}

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  setCurrentUser(user: UserWithRole): void {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  getCurrentUser(): UserWithRole | null {
    if (this.currentUser) {
      return this.currentUser;
    }
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      this.currentUser = JSON.parse(saved);
      return this.currentUser;
    }
    return null;
  }

  clearCurrentUser(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  /**
   * Check if current user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const rolePerms = ROLE_PERMISSIONS[user.role];
    return rolePerms?.[permission] ?? false;
  }

  /**
   * Check if current user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((perm) => this.hasPermission(perm));
  }

  /**
   * Check if current user has all specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((perm) => this.hasPermission(perm));
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /**
   * Get role definition
   */
  getRoleDefinition(role: UserRole): RoleDefinition | undefined {
    return ROLE_DEFINITIONS.find((r) => r.name === role);
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: UserRole): RolePermission {
    return ROLE_PERMISSIONS[role] ?? {};
  }

  /**
   * Get all available roles
   */
  getAllRoles(): RoleDefinition[] {
    return ROLE_DEFINITIONS;
  }

  /**
   * Check if user can assign role (admin only)
   */
  canAssignRole(targetRole: UserRole): boolean {
    return this.hasPermission('user.manage_roles');
  }

  /**
   * Check if user can manage another user (based on role hierarchy)
   */
  canManageUser(targetUserRole: UserRole): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      manager: 2,
      user: 1,
    };

    return roleHierarchy[currentUser.role] > roleHierarchy[targetUserRole];
  }

  /**
   * Create user with role
   */
  createUserWithRole(userId: string, email: string, role: UserRole): UserWithRole {
    const user: UserWithRole = {
      id: userId,
      email,
      role,
      permissions: ROLE_PERMISSIONS[role],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`user_${userId}`, JSON.stringify(user));
    return user;
  }

  /**
   * Update user role
   */
  updateUserRole(userId: string, newRole: UserRole): UserWithRole | null {
    const saved = localStorage.getItem(`user_${userId}`);
    if (!saved) return null;

    const user = JSON.parse(saved) as UserWithRole;
    user.role = newRole;
    user.permissions = ROLE_PERMISSIONS[newRole];
    user.updatedAt = new Date().toISOString();

    localStorage.setItem(`user_${userId}`, JSON.stringify(user));

    if (this.currentUser?.id === userId) {
      this.setCurrentUser(user);
    }

    return user;
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): UserWithRole | null {
    const saved = localStorage.getItem(`user_${userId}`);
    return saved ? JSON.parse(saved) : null;
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): boolean {
    localStorage.removeItem(`user_${userId}`);
    if (this.currentUser?.id === userId) {
      this.clearCurrentUser();
    }
    return true;
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): UserWithRole[] {
    if (!this.hasPermission('user.read')) {
      return [];
    }

    const users: UserWithRole[] = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith('user_')) {
        const saved = localStorage.getItem(key);
        if (saved) {
          users.push(JSON.parse(saved));
        }
      }
    }

    return users;
  }
}

/**
 * Hook-like function for React components
 */
export function useRBAC() {
  return RBACService.getInstance();
}

/**
 * Permission guard for components
 */
export function canAccess(permission: string): boolean {
  return RBACService.getInstance().hasPermission(permission);
}

/**
 * Role guard for components
 */
export function canAccessByRole(role: UserRole | UserRole[]): boolean {
  const rbac = RBACService.getInstance();
  if (Array.isArray(role)) {
    return rbac.hasAnyRole(role);
  }
  return rbac.hasRole(role);
}
