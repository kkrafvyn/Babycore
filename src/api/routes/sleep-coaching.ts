/**
 * Sleep Coaching API Routes
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { ensureBabyAccess } from '../utils/baby-access.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';

const router = Router();

type AppSleepCoachingMethod = 'ferber' | 'camp_out' | 'gentle';
type DbSleepCoachingMethod = 'ferber' | 'gentling' | 'pick_up_put_down';

const toDbMethod = (method: string): DbSleepCoachingMethod => {
  if (method === 'camp_out') return 'gentling';
  if (method === 'gentle') return 'pick_up_put_down';
  return 'ferber';
};

const todayDate = () => new Date().toISOString().split('T')[0];
const currentTime = () => new Date().toTimeString().slice(0, 5);

const ensureProgram = async (params: {
  babyId: string;
  method: AppSleepCoachingMethod;
  targetBedtime?: string;
  currentChallenges?: string[];
}) => {
  const dbMethod = toDbMethod(params.method);
  const { data: existing, error: existingError } = await supabase
    .from('sleep_coaching_programs')
    .select('*')
    .eq('baby_id', params.babyId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from('sleep_coaching_programs')
      .update({
        method: dbMethod,
        target_bedtime: params.targetBedtime || existing.target_bedtime || currentTime(),
        current_challenges: params.currentChallenges || existing.current_challenges || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('sleep_coaching_programs')
    .insert({
      id: uuidv4(),
      baby_id: params.babyId,
      method: dbMethod,
      target_bedtime: params.targetBedtime || currentTime(),
      current_challenges: params.currentChallenges || [],
      status: 'active',
      start_date: todayDate(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * GET /api/sleep-coaching/program?babyId=...
 * Return the active sleep coaching program for a baby.
 */
router.get('/program', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.query.babyId || '');
    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, babyId))) return;

    const { data, error } = await supabase
      .from('sleep_coaching_programs')
      .select('*')
      .eq('baby_id', babyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return res.json({ success: true, data: data || null });
  } catch (error) {
    logger.error('Failed to fetch sleep coaching program', error as Error, 'SLEEP_COACHING');
    return res.status(500).json({ success: false, error: 'Failed to fetch sleep coaching program' });
  }
});

/**
 * POST /api/sleep-coaching/program
 * Create or update the active sleep coaching program for a baby.
 */
router.post('/program', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, method = 'ferber', targetBedtime, currentChallenges } = req.body;
    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    const program = await ensureProgram({
      babyId: String(babyId),
      method,
      targetBedtime,
      currentChallenges,
    });

    return res.status(201).json({ success: true, data: program });
  } catch (error) {
    logger.error('Failed to save sleep coaching program', error as Error, 'SLEEP_COACHING');
    return res.status(500).json({ success: false, error: 'Failed to save sleep coaching program' });
  }
});

/**
 * POST /api/sleep-coaching/sessions
 * Log a completed sleep coaching timer session.
 */
router.post('/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      babyId,
      programId,
      method = 'ferber',
      sessionDate = todayDate(),
      totalSleepMinutes,
      notes,
      parentFatigue,
      bedtimeAchieved,
      nightWakings,
    } = req.body;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    let program: any = null;
    if (programId) {
      const { data, error } = await supabase
        .from('sleep_coaching_programs')
        .select('*')
        .eq('id', programId)
        .eq('baby_id', babyId)
        .maybeSingle();

      if (error) throw error;
      program = data;
    }

    if (!program) {
      program = await ensureProgram({ babyId: String(babyId), method });
    }

    const { count, error: countError } = await supabase
      .from('sleep_coaching_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', program.id);

    if (countError) throw countError;

    const { data, error } = await supabase
      .from('sleep_coaching_sessions')
      .insert({
        id: uuidv4(),
        program_id: program.id,
        day_number: Number(count || 0) + 1,
        session_date: sessionDate,
        bedtime_achieved: Boolean(bedtimeAchieved),
        night_wakings: Number.isFinite(Number(nightWakings)) ? Number(nightWakings) : null,
        total_sleep_minutes: Math.max(0, Number(totalSleepMinutes || 0)),
        notes: notes || null,
        parent_fatigue: Number.isFinite(Number(parentFatigue)) ? Number(parentFatigue) : null,
        success_metrics: {
          source: 'sleep_training_timer',
          appMethod: method,
          loggedBy: req.user?.id,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Failed to log sleep coaching session', error as Error, 'SLEEP_COACHING');
    return res.status(500).json({ success: false, error: 'Failed to log sleep coaching session' });
  }
});

export default router;
