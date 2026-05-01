/**
 * Baby Management API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { ensureBabyAccess } from '../utils/baby-access.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/babies
 * Create new baby profile
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, dateOfBirth, gender } = req.body;

    if (!name || !dateOfBirth) {
      return res.status(400).json({ success: false, error: 'Name and date of birth required' });
    }

    const { data: baby, error } = await supabase
      .from('babies')
      .insert({
        id: uuidv4(),
        user_id: userId,
        name,
        date_of_birth: dateOfBirth,
        gender,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Baby profile created', 'BABY', { userId, babyId: baby.id });

    res.status(201).json({
      success: true,
      data: baby,
      message: 'Baby profile created successfully',
    });
  } catch (error) {
    logger.error('Failed to create baby profile', error as Error, 'BABY');
    res.status(500).json({ success: false, error: 'Failed to create baby profile' });
  }
});

/**
 * GET /api/babies
 * Get all babies for user
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: babies, error } = await supabase
      .from('babies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: babies || [],
      count: babies?.length || 0,
    });
  } catch (error) {
    logger.error('Failed to fetch babies', error as Error, 'BABY');
    res.status(500).json({ success: false, error: 'Failed to fetch babies' });
  }
});

/**
 * GET /api/babies/:babyId
 * Get specific baby details
 */
router.get('/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const userId = req.user?.id;

    const { data: baby, error } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .eq('user_id', userId)
      .single();

    if (error || !baby) {
      return res.status(404).json({ success: false, error: 'Baby not found' });
    }

    res.json({ success: true, data: baby });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch baby' });
  }
});

/**
 * PUT /api/babies/:babyId
 * Update baby profile
 */
router.put('/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const userId = req.user?.id;
    const { name, gender } = req.body;

    const { data: baby, error } = await supabase
      .from('babies')
      .update({ name, gender })
      .eq('id', babyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !baby) {
      return res.status(404).json({ success: false, error: 'Baby not found' });
    }

    logger.info('Baby profile updated', 'BABY', { userId, babyId });

    res.json({ success: true, data: baby, message: 'Baby profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update baby' });
  }
});

/**
 * DELETE /api/babies/:babyId
 * Delete baby profile
 */
router.delete('/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const userId = req.user?.id;

    const { error } = await supabase
      .from('babies')
      .delete()
      .eq('id', babyId)
      .eq('user_id', userId);

    if (error) throw error;

    logger.info('Baby profile deleted', 'BABY', { userId, babyId });

    res.json({ success: true, message: 'Baby profile deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete baby' });
  }
});

/**
 * GET /api/babies/:babyId/summary
 * Get comprehensive baby summary
 */
router.get('/:babyId/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const [baby, feeding, sleep, diaper, health] = await Promise.all([
      supabase.from('babies').select('*').eq('id', babyId).single(),
      supabase
        .from('feed_logs')
        .select('*')
        .eq('baby_id', babyId)
        .order('timestamp', { ascending: false })
        .limit(5),
      supabase
        .from('sleep_logs')
        .select('*')
        .eq('baby_id', babyId)
        .order('start_time', { ascending: false })
        .limit(5),
      supabase
        .from('diaper_logs')
        .select('*')
        .eq('baby_id', babyId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('health_records')
        .select('*')
        .eq('baby_id', babyId)
        .order('date_recorded', { ascending: false })
        .limit(3),
    ]);

    res.json({
      success: true,
      data: {
        baby: baby.data,
        recentFeeding: feeding.data,
        recentSleep: sleep.data,
        recentDiapers: diaper.data,
        healthRecords: health.data,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch baby summary' });
  }
});

export default router;
