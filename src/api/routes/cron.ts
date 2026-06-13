import { Router, type Request, type Response } from 'express';

import { supabase } from '../utils/supabase.js';
import {
  processDueEmailReports,
  processSubscriptionBillingEmails,
} from '../utils/process-scheduled-emails.js';
import { processDueScheduledNotifications } from './notifications.js';
import { processScheduledPaymentRetries } from './payments.js';

const router = Router();

const getCronBearerToken = (req: Request): string => {
  const headerValue = req.get('authorization') || '';
  if (!headerValue.startsWith('Bearer ')) {
    return '';
  }

  return headerValue.slice('Bearer '.length).trim();
};

const authorizeCronRequest = (req: Request, res: Response): boolean => {
  const configuredSecret = String(process.env.CRON_SECRET || '').trim();
  if (!configuredSecret) {
    res.status(500).json({
      success: false,
      error: 'CRON_SECRET is not configured',
    });
    return false;
  }

  if (getCronBearerToken(req) !== configuredSecret) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized cron request',
    });
    return false;
  }

  return true;
};

router.get('/maintenance', async (req: Request, res: Response) => {
  if (!authorizeCronRequest(req, res)) {
    return;
  }

  try {
    const [
      cleanupExpiredLinksResult,
      pruneShareLogResult,
      prunePaymentTransitionResult,
      scheduledNotificationResult,
      scheduledEmailReportsResult,
    ] = await Promise.all([
      supabase.rpc('cleanup_expired_emergency_share_links'),
      supabase.rpc('prune_old_emergency_share_link_access_logs', {
        retention_days: 90,
      }),
      supabase.rpc('prune_old_payment_event_transitions', {
        retention_days: 365,
      }),
      processDueScheduledNotifications(200),
      processDueEmailReports(50),
    ]);

    if (cleanupExpiredLinksResult.error) throw cleanupExpiredLinksResult.error;
    if (pruneShareLogResult.error) throw pruneShareLogResult.error;
    if (prunePaymentTransitionResult.error) throw prunePaymentTransitionResult.error;

    return res.json({
      success: true,
      data: {
        expiredLinksRevoked: Number(cleanupExpiredLinksResult.data || 0),
        shareAccessLogsPruned: Number(pruneShareLogResult.data || 0),
        paymentTransitionsPruned: Number(prunePaymentTransitionResult.data || 0),
        notificationsProcessed: scheduledNotificationResult.processed,
        notificationsSent: scheduledNotificationResult.sent,
        notificationsFailed: scheduledNotificationResult.failed,
        emailReportsProcessed: scheduledEmailReportsResult.processed,
        emailReportsSent: scheduledEmailReportsResult.sent,
        emailReportsFailed: scheduledEmailReportsResult.failed,
        ranAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to run maintenance cron',
    });
  }
});

router.get('/payment-retries', async (req: Request, res: Response) => {
  if (!authorizeCronRequest(req, res)) {
    return;
  }

  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 25)));
    const [result, subscriptionEmails] = await Promise.all([
      processScheduledPaymentRetries(limit),
      processSubscriptionBillingEmails(limit),
    ]);

    return res.json({
      success: true,
      data: {
        ...result,
        subscriptionEmails,
        ranAt: new Date().toISOString(),
        limit,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process scheduled payment retries',
    });
  }
});

export default router;
