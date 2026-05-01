/**
 * Diaper Tracking API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { ensureBabyAccess } from '../utils/baby-access.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/diaper/log
 * Log diaper change
 */
router.post('/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, type, notes } = req.body;

    if (!babyId || !type) {
      return res.status(400).json({ success: false, error: 'Baby ID and type required' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    const { data: log, error } = await supabase
      .from('diaper_logs')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        type,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Diaper logged', 'DIAPER', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: log, message: 'Diaper change logged' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to log diaper' });
  }
});

/**
 * GET /api/diaper/logs
 * Get diaper logs
 */
router.get('/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, limit = 20, offset = 0 } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const { data: logs, error, count } = await supabase
      .from('diaper_logs')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, data: logs, total: count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch diaper logs' });
  }
});

export default router;
