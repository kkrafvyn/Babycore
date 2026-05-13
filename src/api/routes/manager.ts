/**
 * Manager Routes
 * Endpoints for manager operations
 */

import { Router, Response } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { getRoleStatistics, requirePermission } from '../utils/role-manager.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// ============================================================================
// MANAGER ROUTES
// ============================================================================

/**
 * GET /api/manager/dashboard
 * Get manager dashboard data
 */
router.get('/dashboard', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getRoleStatistics();

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('admin_actions_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) throw activityError;

    logger.info('Manager accessed dashboard', 'MANAGER', {
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: {
        roleStatistics: stats,
        recentActivity,
        managerId: req.user?.id,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch manager dashboard', error as Error, 'MANAGER');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard',
    });
  }
});

/**
 * GET /api/manager/reports
 * List manager reports
 */
router.get(
  '/reports',
  requireRole('manager'),
  requirePermission('canViewAnalytics'),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const { data, error, count } = await supabase
        .from('manager_reports')
        .select('*', { count: 'exact' })
        .eq('manager_id', req.user.id)
        .order('generated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        success: true,
        data: {
          reports: data,
          total: count,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch manager reports', error as Error, 'MANAGER');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reports',
      });
    }
  }
);

/**
 * POST /api/manager/reports
 * Create a new manager report
 */
router.post(
  '/reports',
  requireRole('manager'),
  requirePermission('canViewAnalytics'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { reportType, title, description, metrics } = req.body;

      // Validate input
      if (!reportType || !title) {
        return res.status(400).json({
          success: false,
          error: 'Report type and title are required',
        });
      }

      const validReportTypes = ['daily', 'weekly', 'monthly', 'custom'];
      if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
      }

      // Create report
      const { data, error } = await supabase
        .from('manager_reports')
        .insert({
          manager_id: req.user.id,
          report_type: reportType,
          title,
          description,
          metrics: metrics || {},
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Manager created report', 'MANAGER', {
        userId: req.user?.id,
        reportType,
      });

      res.status(201).json({
        success: true,
        message: 'Report created successfully',
        data,
      });
    } catch (error) {
      logger.error('Failed to create manager report', error as Error, 'MANAGER');
      res.status(500).json({
        success: false,
        error: 'Failed to create report',
      });
    }
  }
);

/**
 * DELETE /api/manager/reports/:reportId
 * Delete a manager report
 */
router.delete(
  '/reports/:reportId',
  requireRole('manager'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { reportId } = req.params;

      // Verify ownership
      const { data: report, error: fetchError } = await supabase
        .from('manager_reports')
        .select('manager_id')
        .eq('id', reportId)
        .single();

      if (fetchError || !report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      if (report.manager_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete report created by another manager',
        });
      }

      // Delete report
      const { error: deleteError } = await supabase
        .from('manager_reports')
        .delete()
        .eq('id', reportId);

      if (deleteError) throw deleteError;

      logger.info('Manager deleted report', 'MANAGER', {
        userId: req.user?.id,
        reportId,
      });

      res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete manager report', error as Error, 'MANAGER');
      res.status(500).json({
        success: false,
        error: 'Failed to delete report',
      });
    }
  }
);

/**
 * GET /api/manager/activity-logs
 * Get all activity logs (for monitoring)
 */
router.get(
  '/activity-logs',
  requireRole('manager'),
  requirePermission('canViewAnalytics'),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const filterAction = req.query.action as string | undefined;

      let query = supabase
        .from('admin_actions_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filterAction) {
        query = query.eq('action', filterAction);
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);

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
      logger.error('Failed to fetch activity logs', error as Error, 'MANAGER');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity logs',
      });
    }
  }
);

/**
 * POST /api/manager/moderate-content/:postId
 * Moderate community content
 */
router.post(
  '/moderate-content/:postId',
  requireRole('manager'),
  requirePermission('canModerateContent'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { postId } = req.params;
      const { action, reason } = req.body;

      const validActions = ['flag', 'hide', 'delete', 'restore'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid moderation action',
        });
      }

      if (action === 'delete') {
        // Delete the post
        const { error: deleteError } = await supabase
          .from('community_posts')
          .delete()
          .eq('id', postId);

        if (deleteError) throw deleteError;
      } else if (action === 'hide') {
        // Hide the post
        const { error: hideError } = await supabase
          .from('community_posts')
          .update({ is_hidden: true, moderation_reason: reason })
          .eq('id', postId);

        if (hideError) throw hideError;
      }

      logger.info(`Content moderated by manager`, 'MANAGER', {
        userId: req.user?.id,
        postId,
        action,
        reason,
      });

      res.json({
        success: true,
        message: `Content ${action} successfully`,
      });
    } catch (error) {
      logger.error('Failed to moderate content', error as Error, 'MANAGER');
      res.status(500).json({
        success: false,
        error: 'Failed to moderate content',
      });
    }
  }
);

/**
 * GET /api/manager/permissions
 * Get current manager's permissions
 */
router.get('/permissions', requireRole('manager'), async (req: AuthRequest, res: Response) => {
  try {
    // Manager permissions
    const permissions = {
      canManageUsers: false,
      canManageRoles: false,
      canViewAnalytics: true,
      canDeleteData: false,
      canAccessPayments: true,
      canAccessReports: true,
      canModerateContent: true,
    };

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    logger.error('Failed to fetch manager permissions', error as Error, 'MANAGER');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
    });
  }
});

export default router;
