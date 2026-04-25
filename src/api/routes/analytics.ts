/**
 * Analytics & Insights API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Get comprehensive analytics dashboard
 */
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const [feedingStats, sleepStats, diaperStats, healthAlerts] = await Promise.all([
      supabase
        .from('feeding_logs')
        .select('*')
        .eq('baby_id', babyId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('sleep_analytics')
        .select('*')
        .eq('baby_id', babyId)
        .order('recorded_date', { ascending: false })
        .limit(30),
      supabase
        .from('diaper_logs')
        .select('*')
        .eq('baby_id', babyId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('health_records')
        .select('*')
        .eq('baby_id', babyId)
        .eq('action_required', true)
        .limit(5),
    ]);

    const feedingCount = feedingStats.data?.length || 0;
    const avgSleepMinutes = feedingStats.data
      ? (feedingStats.data as any[]).reduce((sum, item) => sum + (item.duration || 0), 0) / feedingCount
      : 0;

    res.json({
      success: true,
      data: {
        feeding: {
          count: feedingCount,
          avgDuration: avgSleepMinutes,
          recent: feedingStats.data?.slice(0, 5),
        },
        sleep: {
          count: sleepStats.data?.length || 0,
          recent: sleepStats.data?.slice(0, 5),
        },
        diaper: {
          count: diaperStats.data?.length || 0,
          recent: diaperStats.data?.slice(0, 5),
        },
        health: {
          alerts: healthAlerts.data || [],
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch analytics', error as Error, 'ANALYTICS');
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/trends
 * Get trends over time
 */
router.get('/trends', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, metric, daysBack = 30 } = req.query;

    if (!babyId || !metric) {
      return res.status(400).json({ success: false, error: 'Baby ID and metric required' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(daysBack));

    let table = metric === 'feeding' ? 'feeding_logs' : 'sleep_analytics';
    let dateField = metric === 'feeding' ? 'created_at' : 'recorded_date';

    const { data: trends, error } = await supabase
      .from(table)
      .select('*')
      .eq('baby_id', babyId)
      .gte(dateField, startDate.toISOString())
      .order(dateField, { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: trends || [], period: `Last ${daysBack} days` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

/**
 * GET /api/analytics/export
 * Export analytics data
 */
router.get('/export', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, format = 'json' } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const [feeding, sleep, diaper] = await Promise.all([
      supabase.from('feeding_logs').select('*').eq('baby_id', babyId),
      supabase.from('sleep_analytics').select('*').eq('baby_id', babyId),
      supabase.from('diaper_logs').select('*').eq('baby_id', babyId),
    ]);

    const exportData = {
      feeding: feeding.data || [],
      sleep: sleep.data || [],
      diaper: diaper.data || [],
      exportDate: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Convert to CSV format
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="baby-analytics.csv"');
    } else {
      res.header('Content-Type', 'application/json');
      res.header('Content-Disposition', 'attachment; filename="baby-analytics.json"');
    }

    res.json({ success: true, data: exportData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export analytics' });
  }
});

export default router;
