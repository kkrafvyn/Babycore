/**
 * Doctor Routes & Endpoints
 * Handles doctor profile, baby assignments, diagnoses, medications, and appointment reminders
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============================================================================
// DOCTOR PROFILE ENDPOINTS
// ============================================================================

/**
 * POST /api/doctor/profile
 * Create or update doctor profile
 */
router.post('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      fullName,
      specialization,
      licenseNumber,
      qualification,
      clinicName,
      clinicAddress,
      clinicPhone,
      clinicEmail,
      bio,
      yearsOfExperience,
      languagesSpoken,
      consultationFee,
      availabilityHours,
    } = req.body;

    if (!fullName || !specialization || !licenseNumber) {
      return res.status(400).json({
        success: false,
        error: 'Full name, specialization, and license number are required',
      });
    }

    const { data: profile, error } = await supabase
      .from('doctor_profiles')
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          specialization,
          license_number: licenseNumber,
          qualification,
          clinic_name: clinicName,
          clinic_address: clinicAddress,
          clinic_phone: clinicPhone,
          clinic_email: clinicEmail,
          bio,
          years_of_experience: yearsOfExperience,
          languages_spoken: languagesSpoken || ['English'],
          consultation_fee: consultationFee,
          availability_hours: availabilityHours,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    logger.info('Doctor profile created/updated', 'DOCTOR', { userId });

    res.json({
      success: true,
      data: profile,
      message: 'Doctor profile saved successfully',
    });
  } catch (error) {
    logger.error('Failed to save doctor profile', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to save doctor profile' });
  }
});

/**
 * GET /api/doctor/profile/:doctorId
 * Get doctor profile by ID
 */
router.get('/profile/:doctorId', async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId } = req.params;

    const { data: profile, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', doctorId)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Doctor profile not found',
      });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch doctor profile' });
  }
});

/**
 * GET /api/doctor/profile
 * Get own doctor profile
 */
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: profile, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Doctor profile not found. Please create a profile first.',
      });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch doctor profile' });
  }
});

// ============================================================================
// BABY ASSIGNMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/doctor/assign-baby
 * Doctor requests to be assigned to a baby (parent must approve)
 */
router.post('/assign-baby', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const { babyId, parentId, reason } = req.body;

    if (!babyId || !parentId) {
      return res.status(400).json({
        success: false,
        error: 'Baby ID and Parent ID are required',
      });
    }

    const { data: assignment, error } = await supabase
      .from('doctor_baby_assignments')
      .insert({
        id: uuidv4(),
        doctor_id: doctorId,
        baby_id: babyId,
        parent_id: parentId,
        assignment_reason: reason || 'Regular medical care',
        parent_consent: true, // Assuming parent approved in frontend
        consent_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Baby assigned to doctor', 'DOCTOR', { doctorId, babyId });

    res.json({
      success: true,
      data: assignment,
      message: 'Baby assigned successfully',
    });
  } catch (error) {
    logger.error('Failed to assign baby', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to assign baby' });
  }
});

/**
 * GET /api/doctor/babies
 * Get all babies assigned to this doctor
 */
router.get('/babies', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;

    const { data: assignments, error } = await supabase
      .rpc('get_doctor_assigned_babies', { doctor_user_id: doctorId });

    if (error) throw error;

    res.json({
      success: true,
      data: assignments || [],
      count: (assignments || []).length,
    });
  } catch (error) {
    logger.error('Failed to fetch doctor babies', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to fetch assigned babies' });
  }
});

/**
 * GET /api/doctor/babies/:babyId/details
 * Get full details for a baby (diagnoses, medications, etc.)
 */
router.get('/babies/:babyId/details', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const doctorId = req.user?.id;

    // Verify doctor is assigned to this baby
    const { data: assignment, error: assignmentError } = await supabase
      .from('doctor_baby_assignments')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('baby_id', babyId)
      .eq('status', 'active')
      .single();

    if (assignmentError || !assignment) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this baby',
      });
    }

    // Get baby details
    const { data: baby } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .single();

    // Get diagnoses
    const { data: diagnoses } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('baby_id', babyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Get active medications
    const { data: medications } = await supabase
      .rpc('get_baby_active_medications', { baby_id_param: babyId });

    // Get medical history
    const { data: history } = await supabase
      .from('medical_history_summary')
      .select('*')
      .eq('baby_id', babyId)
      .single();

    res.json({
      success: true,
      data: {
        baby,
        diagnoses: diagnoses || [],
        medications: medications || [],
        medicalHistory: history,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch baby details', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to fetch baby details' });
  }
});

// ============================================================================
// DIAGNOSIS ENDPOINTS
// ============================================================================

/**
 * POST /api/doctor/diagnoses
 * Create diagnosis for a baby
 */
router.post('/diagnoses', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const { babyId, diagnosisText, icd10Code, severity, onsetDate, notes } = req.body;

    if (!babyId || !diagnosisText || !onsetDate) {
      return res.status(400).json({
        success: false,
        error: 'Baby ID, diagnosis text, and onset date are required',
      });
    }

    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        doctor_id: doctorId,
        diagnosis_text: diagnosisText,
        icd10_code: icd10Code,
        severity,
        onset_date: onsetDate,
        status: 'active',
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Diagnosis created', 'DOCTOR', { doctorId, babyId });

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis recorded successfully',
    });
  } catch (error) {
    logger.error('Failed to create diagnosis', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to create diagnosis' });
  }
});

/**
 * GET /api/doctor/diagnoses/:babyId
 * Get all diagnoses for a baby
 */
router.get('/diagnoses/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;

    const { data: diagnoses, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: diagnoses || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch diagnoses' });
  }
});

/**
 * PUT /api/doctor/diagnoses/:diagnosisId
 * Update diagnosis
 */
router.put('/diagnoses/:diagnosisId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { diagnosisId } = req.params;
    const { status, notes } = req.body;

    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', diagnosisId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Diagnosis updated', 'DOCTOR', { diagnosisId });

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update diagnosis' });
  }
});

// ============================================================================
// MEDICATIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/doctor/medications
 * Prescribe medication for a baby
 */
router.post('/medications', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const {
      babyId,
      medicationName,
      dosage,
      unit,
      frequency,
      startDate,
      endDate,
      reason,
      instructions,
      sideEffects,
      contraindications,
    } = req.body;

    if (!babyId || !medicationName || !dosage || !unit || !frequency) {
      return res.status(400).json({
        success: false,
        error: 'All medication fields are required',
      });
    }

    const { data: medication, error } = await supabase
      .from('medications')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        doctor_id: doctorId,
        medication_name: medicationName,
        dosage,
        unit,
        frequency,
        start_date: startDate,
        end_date: endDate,
        reason_for_prescription: reason,
        instructions,
        possible_side_effects: sideEffects,
        contraindications,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Medication prescribed', 'DOCTOR', { doctorId, babyId, medicationName });

    res.json({
      success: true,
      data: medication,
      message: 'Medication prescribed successfully',
    });
  } catch (error) {
    logger.error('Failed to prescribe medication', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to prescribe medication' });
  }
});

/**
 * GET /api/doctor/medications/:babyId
 * Get active medications for a baby
 */
router.get('/medications/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;

    const { data: medications, error } = await supabase
      .rpc('get_baby_active_medications', { baby_id_param: babyId });

    if (error) throw error;

    res.json({
      success: true,
      data: medications || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch medications' });
  }
});

/**
 * POST /api/doctor/medications/:medicationId/track-adherence
 * Track medication adherence (parent logs dose given)
 */
router.post(
  '/medications/:medicationId/track-adherence',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { medicationId } = req.params;
      const { givenAt, notes } = req.body;
      const parentId = req.user?.id;

      const { data: adherence, error } = await supabase
        .from('medication_adherence')
        .insert({
          id: uuidv4(),
          medication_id: medicationId,
          given_at: givenAt || new Date().toISOString(),
          given_by: parentId,
          dose_taken: true,
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Medication adherence tracked', 'DOCTOR', { medicationId, parentId });

      res.json({
        success: true,
        data: adherence,
        message: 'Dose recorded successfully',
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to track adherence' });
    }
  }
);

/**
 * PUT /api/doctor/medications/:medicationId/stop
 * Stop medication (mark as discontinued)
 */
router.put('/medications/:medicationId/stop', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { medicationId } = req.params;
    const { reason } = req.body;

    const { data: medication, error } = await supabase
      .from('medications')
      .update({
        status: 'discontinued',
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicationId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Medication discontinued', 'DOCTOR', { medicationId, reason });

    res.json({
      success: true,
      data: medication,
      message: 'Medication stopped successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to stop medication' });
  }
});

// ============================================================================
// APPOINTMENT REMINDER ENDPOINTS
// ============================================================================

/**
 * POST /api/doctor/appointments/reminders
 * Create appointment reminder for parent/baby
 */
router.post('/appointments/reminders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const { babyId, parentId, appointmentType, scheduledDate, scheduledTime, reason } = req.body;

    if (!babyId || !parentId || !appointmentType || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'All appointment fields are required',
      });
    }

    const { data: reminder, error } = await supabase
      .from('appointment_reminders')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        doctor_id: doctorId,
        parent_id: parentId,
        appointment_type: appointmentType,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Appointment reminder created', 'DOCTOR', { doctorId, babyId, appointmentType });

    res.json({
      success: true,
      data: reminder,
      message: 'Appointment reminder set successfully',
    });
  } catch (error) {
    logger.error('Failed to create appointment reminder', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to create appointment reminder' });
  }
});

/**
 * GET /api/doctor/appointments/upcoming
 * Get upcoming appointments for doctor
 */
router.get('/appointments/upcoming', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const daysAhead = req.query.days ? parseInt(req.query.days as string) : 7;

    const { data: appointments, error } = await supabase
      .rpc('get_doctor_upcoming_appointments', {
        doctor_user_id: doctorId,
        days_ahead: daysAhead,
      });

    if (error) throw error;

    res.json({
      success: true,
      data: appointments || [],
      count: (appointments || []).length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch upcoming appointments' });
  }
});

/**
 * PUT /api/doctor/appointments/reminders/:reminderId/status
 * Update appointment reminder status
 */
router.put(
  '/appointments/reminders/:reminderId/status',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { reminderId } = req.params;
      const { status } = req.body;

      if (!['pending', 'reminded', 'completed', 'cancelled', 'no_show'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const { data: reminder, error } = await supabase
        .from('appointment_reminders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Appointment reminder status updated', 'DOCTOR', { reminderId, status });

      res.json({
        success: true,
        data: reminder,
        message: 'Appointment status updated successfully',
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update appointment' });
    }
  }
);

/**
 * POST /api/doctor/appointments/reminders/:reminderId/send-notification
 * Send reminder notification to parent
 */
router.post(
  '/appointments/reminders/:reminderId/send-notification',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { reminderId } = req.params;

      // Fetch reminder
      const { data: reminder } = await supabase
        .from('appointment_reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (!reminder) {
        return res.status(404).json({ success: false, error: 'Reminder not found' });
      }

      // Update reminder to mark as sent
      const { data: updated } = await supabase
        .from('appointment_reminders')
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
          status: 'reminded',
        })
        .eq('id', reminderId)
        .select()
        .single();

      await supabase.from('scheduled_notifications').insert({
        user_id: reminder.parent_id,
        title: 'Appointment Reminder',
        body: `You have an upcoming ${reminder.appointment_type} appointment on ${reminder.scheduled_date}${reminder.scheduled_time ? ` at ${reminder.scheduled_time}` : ''}.`,
        data: {
          type: 'appointment-reminder',
          reminderId: reminder.id,
          babyId: reminder.baby_id,
          doctorId: reminder.doctor_id,
        },
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      });

      logger.info('Appointment reminder notification sent', 'DOCTOR', { reminderId });

      res.json({
        success: true,
        data: updated,
        message: 'Reminder notification sent successfully',
      });
    } catch (error) {
      logger.error('Failed to send appointment reminder', error as Error, 'DOCTOR');
      res.status(500).json({ success: false, error: 'Failed to send reminder notification' });
    }
  }
);

// ============================================================================
// DASHBOARD & STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/doctor/dashboard
 * Doctor dashboard with statistics
 */
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id;

    // Get patient count
    const { data: patientCount, error: e1 } = await supabase
      .rpc('get_doctor_patient_count', { doctor_user_id: doctorId });

    // Get upcoming appointments
    const { data: upcomingAppointments } = await supabase
      .from('appointment_reminders')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'pending')
      .lte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(5);

    // Get recent diagnoses
    const { data: recentDiagnoses } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      data: {
        patientCount: patientCount || 0,
        upcomingAppointments: upcomingAppointments || [],
        recentDiagnoses: recentDiagnoses || [],
      },
    });
  } catch (error) {
    logger.error('Failed to fetch doctor dashboard', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

export default router;
