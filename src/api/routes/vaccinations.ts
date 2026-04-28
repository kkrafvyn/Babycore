/**
 * Vaccination Records API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/vaccinations/record
 * Record vaccination
 */
router.post('/record', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, vaccineName, dateGiven, nextDue, notes } = req.body;

    if (!babyId || !vaccineName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const hasGivenDate = Boolean(dateGiven);
    const { data: record, error } = await supabase
      .from('vaccination_records')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        vaccine_name: vaccineName,
        due_date: nextDue || dateGiven || new Date().toISOString(),
        given_date: hasGivenDate ? dateGiven : null,
        status: hasGivenDate ? 'given' : 'scheduled',
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Vaccination recorded', 'VACCINATION', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to record vaccination' });
  }
});

/**
 * GET /api/vaccinations/records
 * Get vaccination records
 */
router.get('/records', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: records, error } = await supabase
      .from('vaccination_records')
      .select('*')
      .eq('baby_id', babyId)
      .order('due_date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch vaccination records' });
  }
});

export default router;
