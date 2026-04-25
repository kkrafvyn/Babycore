/**
 * Health Records API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/health/alerts
 * Create health alert
 */
router.post('/alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, alertType, severity, description, actionRequired } = req.body;

    if (!babyId || !alertType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data: alert, error } = await supabase
      .from('health_records')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        type: alertType,
        severity,
        description,
        action_required: actionRequired,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Health alert created', 'HEALTH', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create health alert' });
  }
});

/**
 * GET /api/health/alerts
 * Get health alerts
 */
router.get('/alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: alerts, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch health alerts' });
  }
});

export default router;
