/**
 * Appointments API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { ensureBabyAccess, ensureRecordBabyAccess } from '../utils/baby-access.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/appointments/create
 * Create appointment
 */
router.post('/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, type, doctorName, datetime, location, notes } = req.body;

    if (!babyId || !type || !datetime) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    const { data: appointment, error } = await supabase
      .from('doctor_appointments')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        appointment_type: type,
        doctor_name: doctorName,
        scheduled_datetime: datetime,
        location,
        notes,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Appointment created', 'APPOINTMENTS', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

/**
 * GET /api/appointments
 * Get appointments
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const { data: appointments, error } = await supabase
      .from('doctor_appointments')
      .select('*')
      .eq('baby_id', babyId)
      .order('scheduled_datetime', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: appointments || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

/**
 * PUT /api/appointments/:appointmentId
 * Update appointment
 */
router.put('/:appointmentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { datetime, notes, status } = req.body;

    if (
      !(await ensureRecordBabyAccess<{ id: string; baby_id: string }>(req, res, {
        table: 'doctor_appointments',
        idValue: appointmentId,
        write: true,
        missingMessage: 'Appointment not found',
      }))
    )
      return;

    const { data: appointment, error } = await supabase
      .from('doctor_appointments')
      .update({ scheduled_datetime: datetime, notes, status })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update appointment' });
  }
});

/**
 * DELETE /api/appointments/:appointmentId
 * Cancel appointment
 */
router.delete('/:appointmentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId } = req.params;

    if (
      !(await ensureRecordBabyAccess<{ id: string; baby_id: string }>(req, res, {
        table: 'doctor_appointments',
        idValue: appointmentId,
        write: true,
        missingMessage: 'Appointment not found',
      }))
    )
      return;

    const { error } = await supabase
      .from('doctor_appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (error) throw error;

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
  }
});

export default router;
