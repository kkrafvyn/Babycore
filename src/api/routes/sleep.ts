/**
 * Sleep Tracker API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/sleep/log
 * Log sleep session
 */
router.post('/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, startTime, endTime, quality, notes } = req.body;

    if (!babyId || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60);

    const { data: log, error } = await supabase
      .from('sleep_analytics')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        start_time: startTime,
        end_time: endTime,
        total_sleep_minutes: duration,
        quality_score: quality,
        notes,
        recorded_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Sleep logged', 'SLEEP', { userId: req.user?.id, babyId, duration });

    res.status(201).json({ success: true, data: log, message: 'Sleep logged' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to log sleep' });
  }
});

/**
 * GET /api/sleep/logs
 * Get sleep logs
 */
router.get('/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, limit = 20, offset = 0 } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: logs, error, count } = await supabase
      .from('sleep_analytics')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('recorded_date', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, data: logs, total: count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sleep logs' });
  }
});

export default router;
