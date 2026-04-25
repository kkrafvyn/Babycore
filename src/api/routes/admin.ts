/**
 * Admin Routes
 * Endpoints for admin operations
 */

import { Router, Response } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import {
  assignRoleToUser,
  listUsersWithRoles,
  getRoleStatistics,
  logRoleAssignment,
  demoteUser,
  promoteUser,
  getUserRole,
} from '../utils/role-manager';
import { logger } from '../../utils/logger';

const router = Router();

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/admin/users
 * List all users with their roles
 */
router.get('/users', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await listUsersWithRoles(limit, offset);

    logger.info('Admin fetched users list', 'ADMIN', {
      userId: req.user?.id,
      limit,
      offset,
      count: result.users.length,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to fetch users', error as Error, 'ADMIN', {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * POST /api/admin/users/:userId/role
 * Assign or update user role
 */
router.post('/users/:userId/role', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role, reason } = req.body;

    // Validate role
    const validRoles = ['admin', 'manager', 'user', 'caregiver', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
      });
    }

    // Get previous role for logging
    const previousRole = await getUserRole(userId);

    // Assign new role
    const result = await assignRoleToUser(userId, role, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Log the role assignment
    await logRoleAssignment(userId, previousRole, role, req.user.id, reason);

    // Log admin action
    await supabase.from('admin_actions_log').insert({
      admin_id: req.user.id,
      action: 'role_changed',
      target_user_id: userId,
      details: { previousRole, newRole: role, reason },
    });

    logger.info(`Role changed for user ${userId}`, 'ADMIN', {
      adminId: req.user.id,
      targetUserId: userId,
      newRole: role,
    });

    res.json({
      success: true,
      message: 'Role updated successfully',
      previousRole,
      newRole: role,
    });
  } catch (error) {
    logger.error('Failed to update user role', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to update role',
    });
  }
});

/**
 * POST /api/admin/users/:userId/promote
 * Promote user to manager or admin
 */
router.post('/users/:userId/promote', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { newRole, reason } = req.body;

    const result = await promoteUser(userId, newRole, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    logger.info(`User promoted to ${newRole}`, 'ADMIN', {
      adminId: req.user.id,
      targetUserId: userId,
    });

    res.json({
      success: true,
      message: `User promoted to ${newRole}`,
    });
  } catch (error) {
    logger.error('Failed to promote user', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to promote user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/demote
 * Demote user back to regular user
 */
router.post('/users/:userId/demote', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await demoteUser(userId, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    logger.info(`User demoted to regular user`, 'ADMIN', {
      adminId: req.user.id,
      targetUserId: userId,
    });

    res.json({
      success: true,
      message: 'User demoted successfully',
    });
  } catch (error) {
    logger.error('Failed to demote user', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to demote user',
    });
  }
});

/**
 * GET /api/admin/stats
 * Get role statistics
 */
router.get('/stats', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getRoleStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch role statistics', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

/**
 * GET /api/admin/logs
 * Get admin action logs
 */
router.get('/logs', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabase
      .from('admin_actions_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        logs: data,
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch admin logs', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only)
 */
router.delete('/users/:userId', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    // Log the action
    await supabase.from('admin_actions_log').insert({
      admin_id: req.user.id,
      action: 'user_deleted',
      target_user_id: userId,
      details: {},
    });

    // Delete user from auth
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    logger.info(`User deleted by admin`, 'ADMIN', {
      adminId: req.user.id,
      deletedUserId: userId,
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete user', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs for role assignments
 */
router.get('/audit-logs', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error, count } = await supabase
      .from('role_assignment_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        logs: data,
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', error as Error, 'ADMIN');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
});

export default router;
