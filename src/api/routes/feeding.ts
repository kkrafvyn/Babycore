/**
 * Feeding Tracker API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/feeding/log
 * Log feeding session
 */
router.post('/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, type, duration, amount, notes } = req.body;

    if (!babyId || !type) {
      return res.status(400).json({ success: false, error: 'Baby ID and type required' });
    }

    const { data: log, error } = await supabase
      .from('feeding_logs')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        type,
        duration,
        amount,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Feeding logged', 'FEEDING', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: log, message: 'Feeding logged' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to log feeding' });
  }
});

/**
 * GET /api/feeding/logs
 * Get feeding logs
 */
router.get('/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, limit = 20, offset = 0 } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: logs, error, count } = await supabase
      .from('feeding_logs')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, data: logs, total: count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch feeding logs' });
  }
});

/**
 * PUT /api/feeding/:feedingId
 * Update feeding log
 */
router.put('/:feedingId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { feedingId } = req.params;
    const { duration, amount, notes } = req.body;

    const { data: log, error } = await supabase
      .from('feeding_logs')
      .update({ duration, amount, notes })
      .eq('id', feedingId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: log, message: 'Feeding updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update feeding' });
  }
});

/**
 * DELETE /api/feeding/:feedingId
 * Delete feeding log
 */
router.delete('/:feedingId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { feedingId } = req.params;

    const { error } = await supabase.from('feeding_logs').delete().eq('id', feedingId);

    if (error) throw error;

    res.json({ success: true, message: 'Feeding deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete feeding' });
  }
});

export default router;
