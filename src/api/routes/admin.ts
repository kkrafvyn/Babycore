/**
 * Admin Routes
 * Endpoints for admin operations
 */

import { Router, Response } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import {
  activatePremiumSubscriptionForPayment,
  recordPaymentEvent,
  safeSendPaymentConfirmationEmail,
  verifyPaystackTransaction,
  type PaymentEventRecord,
} from './payments.js';
import {
  assignRoleToUser,
  listUsersWithRoles,
  getRoleStatistics,
  logRoleAssignment,
  demoteUser,
  promoteUser,
  getUserRole,
} from '../utils/role-manager.js';
import { logger } from '../../utils/logger.js';
import {
  MAX_AUTOMATED_PAYMENT_RETRIES,
  planNextPaymentRetry,
} from '../../lib/billing-retry.js';

const router = Router();

const csvValue = (value: unknown): string => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const getPaymentQueryString = (value: unknown): string => String(value || '').trim();

const getPaymentQueryNumber = (value: unknown, fallback: number, min: number, max?: number): number => {
  const parsed = Number(value);
  let nextValue = Number.isFinite(parsed) ? parsed : fallback;
  nextValue = Math.max(min, nextValue);
  if (typeof max === 'number') {
    nextValue = Math.min(max, nextValue);
  }
  return nextValue;
};

const enrichPaymentEvents = async (events: PaymentEventRecord[]) => {
  const eventIds = (events || []).map((entry) => entry.id).filter(Boolean);
  const transitionsByEventId = new Map<string, any[]>();

  if (eventIds.length > 0) {
    const { data: transitions, error: transitionsError } = await supabase
      .from('payment_event_transitions')
      .select('*')
      .in('payment_event_id', eventIds)
      .order('created_at', { ascending: false });

    if (transitionsError) {
      throw transitionsError;
    }

    for (const transition of transitions || []) {
      const key = String((transition as any).payment_event_id || '');
      if (!key) continue;
      const existing = transitionsByEventId.get(key) || [];
      existing.push(transition);
      transitionsByEventId.set(key, existing);
    }
  }

  return (events || []).map((entry: any) => ({
    ...entry,
    payment_event_transitions: (transitionsByEventId.get(String(entry.id)) || []).slice(0, 8),
  }));
};

const fetchPaymentEventByReference = async (reference: string) => {
  const { data, error } = await supabase
    .from('payment_events')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PaymentEventRecord | null;
};

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
    const authAdmin = (supabase.auth as any).admin;
    const { error } = await authAdmin.deleteUser(userId);

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

/**
 * GET /api/admin/billing
 * Review billing events, recovery state, and recent transitions.
 */
router.get('/billing', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = getPaymentQueryNumber(req.query.limit, 50, 1, 200);
    const offset = getPaymentQueryNumber(req.query.offset, 0, 0);
    const search = getPaymentQueryString(req.query.search);
    const statusFilter = getPaymentQueryString(req.query.status);
    const recoveryStatusFilter = getPaymentQueryString(req.query.recoveryStatus);

    let query = supabase
      .from('payment_events')
      .select('*', { count: 'exact' })
      .order('last_transition_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,customer_email.ilike.%${search}%,plan_name.ilike.%${search}%`,
      );
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (recoveryStatusFilter) {
      query = query.eq('recovery_status', recoveryStatusFilter);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const enrichedEvents = await enrichPaymentEvents((data || []) as PaymentEventRecord[]);
    const summary = enrichedEvents.reduce(
      (acc, entry: any) => {
        acc.total += 1;
        if (entry.status === 'failed') acc.failed += 1;
        if (entry.recovery_status === 'retry_scheduled' || entry.recovery_status === 'retrying') acc.retrying += 1;
        if (entry.recovery_status === 'recovered') acc.recovered += 1;
        if (entry.recovery_status === 'abandoned') acc.abandoned += 1;
        return acc;
      },
      {
        total: 0,
        failed: 0,
        retrying: 0,
        recovered: 0,
        abandoned: 0,
      },
    );

    res.json({
      success: true,
      data: {
        events: enrichedEvents,
        total: Number(count || 0),
        limit,
        offset,
        summary,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch billing events', error as Error, 'ADMIN', {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing events',
    });
  }
});

/**
 * POST /api/admin/billing/retry-now
 * Force an immediate gateway re-check for a failed payment.
 */
router.post('/billing/retry-now', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const reference = getPaymentQueryString(req.body?.reference);
    if (!reference) {
      return res.status(400).json({ success: false, error: 'reference is required' });
    }

    const paymentEvent = await fetchPaymentEventByReference(reference);
    if (!paymentEvent) {
      return res.status(404).json({ success: false, error: 'Payment event not found' });
    }

    if (String(paymentEvent.provider || 'paystack') !== 'paystack') {
      return res.status(400).json({ success: false, error: 'Manual retry is only supported for Paystack events' });
    }

    const nowIso = new Date().toISOString();
    const verification = await verifyPaystackTransaction(reference);
    const verificationOk = verification.success && verification.data?.status === 'success';

    if (!verificationOk) {
      const retryPlan = planNextPaymentRetry(Number(paymentEvent.retry_count || 0) + 1, nowIso);

      await recordPaymentEvent({
        userId: paymentEvent.user_id,
        reference,
        provider: paymentEvent.provider || 'paystack',
        eventType: 'admin_retry_failed',
        status: 'failed',
        amount: Number(paymentEvent.amount || 0),
        currency: paymentEvent.currency || 'USD',
        planId: paymentEvent.plan_id || null,
        planName: paymentEvent.plan_name || null,
        countryCode: paymentEvent.country_code || null,
        customerEmail: paymentEvent.customer_email || null,
        subscriptionId: paymentEvent.subscription_id || null,
        invoiceId: paymentEvent.invoice_id || null,
        errorMessage: 'Admin-triggered verification still failing',
        failureCode: String(verification?.data?.status || 'admin_retry_failed'),
        failureSource: 'admin_billing_retry',
        gatewayPayload: verification?.data || {},
        incrementRetry: true,
        lastRetryAt: nowIso,
        nextRetryAt: retryPlan.nextRetryAt,
        recoveryStatus: retryPlan.recoveryStatus,
        transitionMetadata: {
          flow: 'admin_retry_now',
          maxAutomatedRetries: MAX_AUTOMATED_PAYMENT_RETRIES,
        },
      });

      await supabase.from('admin_actions_log').insert({
        admin_id: req.user?.id,
        action: 'billing_retry_now',
        target_user_id: paymentEvent.user_id,
        details: {
          reference,
          outcome: retryPlan.recoveryStatus,
        },
      });

      const updatedEvent = await fetchPaymentEventByReference(reference);
      return res.status(retryPlan.recoveryStatus === 'abandoned' ? 409 : 400).json({
        success: false,
        error:
          retryPlan.recoveryStatus === 'abandoned'
            ? 'Payment recovery limit reached. Please contact support.'
            : 'Payment is still not verified by gateway',
        data: updatedEvent,
      });
    }

    const paidAmount = Number(verification.data?.amount || 0) / 100;
    const planId = String(paymentEvent.plan_id || 'premium-monthly');
    const planName = String(paymentEvent.plan_name || 'Premium Access');
    const currency = String(paymentEvent.currency || 'USD');
    const { billingPeriod, endDate } = await activatePremiumSubscriptionForPayment({
      userId: paymentEvent.user_id,
      planId,
      planName,
      currency,
      paidAmount,
    });

    await recordPaymentEvent({
      userId: paymentEvent.user_id,
      reference,
      provider: paymentEvent.provider || 'paystack',
      eventType: 'admin_retry_success',
      status: 'reconciled',
      amount: paidAmount,
      currency,
      planId,
      planName,
      countryCode: paymentEvent.country_code || null,
      customerEmail: paymentEvent.customer_email || null,
      providerEventId: verification?.data?.id ? String(verification.data.id) : null,
      subscriptionId:
        verification?.data?.subscription?.subscription_code
          ? String(verification.data.subscription.subscription_code)
          : paymentEvent.subscription_id || null,
      invoiceId:
        verification?.data?.invoice_id
          ? String(verification.data.invoice_id)
          : paymentEvent.invoice_id || null,
      gatewayPayload: verification?.data || {},
      verifiedAt: nowIso,
      recoveredAt: nowIso,
      reconciledBy: req.user?.id || paymentEvent.user_id,
      reconciliationNotes: 'Recovered from billing ops retry-now action.',
      incrementRetry: true,
      lastRetryAt: nowIso,
      nextRetryAt: null,
      recoveryStatus: 'recovered',
      transitionMetadata: {
        flow: 'admin_retry_now',
        billingPeriod,
      },
    });

    await safeSendPaymentConfirmationEmail(
      paymentEvent.user_id,
      {
        name: planName,
        currency,
      },
      {
        amount_paid: paidAmount,
        renewal_date: endDate,
      },
    );

    await supabase.from('admin_actions_log').insert({
      admin_id: req.user?.id,
      action: 'billing_retry_now',
      target_user_id: paymentEvent.user_id,
      details: {
        reference,
        outcome: 'recovered',
      },
    });

    const updatedEvent = await fetchPaymentEventByReference(reference);
    res.json({
      success: true,
      message: 'Payment recovered and premium reactivated.',
      data: updatedEvent,
    });
  } catch (error) {
    logger.error('Failed to retry billing event', error as Error, 'ADMIN', {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retry billing event',
    });
  }
});

/**
 * POST /api/admin/billing/resolve
 * Mark a payment event resolved or abandoned with notes.
 */
router.post('/billing/resolve', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const reference = getPaymentQueryString(req.body?.reference);
    const resolutionStatus = getPaymentQueryString(req.body?.status) || 'reconciled';
    const notes = getPaymentQueryString(req.body?.notes);

    if (!reference) {
      return res.status(400).json({ success: false, error: 'reference is required' });
    }
    if (!['reconciled', 'cancelled'].includes(resolutionStatus)) {
      return res.status(400).json({ success: false, error: 'status must be reconciled or cancelled' });
    }

    const paymentEvent = await fetchPaymentEventByReference(reference);
    if (!paymentEvent) {
      return res.status(404).json({ success: false, error: 'Payment event not found' });
    }

    const nowIso = new Date().toISOString();
    const planId = String(paymentEvent.plan_id || 'premium-monthly');
    const planName = String(paymentEvent.plan_name || 'Premium Access');
    const currency = String(paymentEvent.currency || 'USD');
    const amount = Number(paymentEvent.amount || 0);

    if (resolutionStatus === 'reconciled') {
      await activatePremiumSubscriptionForPayment({
        userId: paymentEvent.user_id,
        planId,
        planName,
        currency,
        paidAmount: amount,
      });
    }

    await recordPaymentEvent({
      userId: paymentEvent.user_id,
      reference,
      provider: paymentEvent.provider || 'paystack',
      eventType: 'admin_resolved',
      status: resolutionStatus as 'reconciled' | 'cancelled',
      amount,
      currency,
      planId,
      planName,
      countryCode: paymentEvent.country_code || null,
      customerEmail: paymentEvent.customer_email || null,
      subscriptionId: paymentEvent.subscription_id || null,
      invoiceId: paymentEvent.invoice_id || null,
      gatewayPayload: paymentEvent.gateway_payload || {},
      verifiedAt: resolutionStatus === 'reconciled' ? nowIso : null,
      recoveredAt: resolutionStatus === 'reconciled' ? nowIso : null,
      reconciledBy: req.user?.id || paymentEvent.user_id,
      reconciliationNotes:
        notes || `Marked ${resolutionStatus} by billing ops.`,
      nextRetryAt: null,
      recoveryStatus: resolutionStatus === 'reconciled' ? 'recovered' : 'abandoned',
      transitionMetadata: {
        flow: 'admin_resolve',
        resolutionStatus,
      },
    });

    await supabase.from('admin_actions_log').insert({
      admin_id: req.user?.id,
      action: 'billing_resolved',
      target_user_id: paymentEvent.user_id,
      details: {
        reference,
        resolutionStatus,
        notes: notes || null,
      },
    });

    const updatedEvent = await fetchPaymentEventByReference(reference);
    res.json({
      success: true,
      message: `Payment marked ${resolutionStatus}.`,
      data: updatedEvent,
    });
  } catch (error) {
    logger.error('Failed to resolve billing event', error as Error, 'ADMIN', {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve billing event',
    });
  }
});

/**
 * GET /api/admin/billing/export
 * Export billing events as CSV.
 */
router.get('/billing/export', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const search = getPaymentQueryString(req.query.search);
    const statusFilter = getPaymentQueryString(req.query.status);
    const recoveryStatusFilter = getPaymentQueryString(req.query.recoveryStatus);

    let query = supabase
      .from('payment_events')
      .select('*')
      .order('last_transition_at', { ascending: false })
      .limit(1000);

    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,customer_email.ilike.%${search}%,plan_name.ilike.%${search}%`,
      );
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (recoveryStatusFilter) {
      query = query.eq('recovery_status', recoveryStatusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const header = [
      'reference',
      'status',
      'recovery_status',
      'provider',
      'amount',
      'currency',
      'plan_name',
      'customer_email',
      'retry_count',
      'attempted_at',
      'verified_at',
      'recovered_at',
      'next_retry_at',
      'failure_code',
      'failure_source',
      'error_message',
    ];

    const lines = [
      header.join(','),
      ...(data || []).map((entry: any) =>
        [
          csvValue(entry.reference),
          csvValue(entry.status),
          csvValue(entry.recovery_status),
          csvValue(entry.provider),
          csvValue(entry.amount),
          csvValue(entry.currency),
          csvValue(entry.plan_name),
          csvValue(entry.customer_email),
          csvValue(entry.retry_count),
          csvValue(entry.attempted_at),
          csvValue(entry.verified_at),
          csvValue(entry.recovered_at),
          csvValue(entry.next_retry_at),
          csvValue(entry.failure_code),
          csvValue(entry.failure_source),
          csvValue(entry.error_message),
        ].join(','),
      ),
    ];

    const filename = `billing-events-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  } catch (error) {
    logger.error('Failed to export billing events', error as Error, 'ADMIN', {
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to export billing events',
    });
  }
});

export default router;
