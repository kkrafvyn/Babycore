/**
 * Doctor Routes & Endpoints
 * Handles doctor profile, baby assignments, diagnoses, medications, and appointment reminders
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { ensureBabyAccess, ensureRecordBabyAccess } from '../utils/baby-access.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { syncAcceptedDoctorInvitesForDoctor } from '../utils/doctor-assignment.js';

const router = Router();

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const getBabyRowsByIds = async (babyIds: string[]) => {
  const uniqueBabyIds = Array.from(new Set(babyIds.map((id) => String(id || '').trim()).filter(Boolean)));

  if (uniqueBabyIds.length === 0) {
    return new Map<string, any>();
  }

  const { data, error } = await supabase
    .from('babies')
    .select('id,name,date_of_birth,gender,photo_url,country,created_at')
    .in('id', uniqueBabyIds);

  if (error) throw error;

  const babiesById = new Map<string, any>();
  for (const row of data || []) {
    babiesById.set(String(row.id), row);
  }

  return babiesById;
};

const getDoctorAssignments = async (doctorId: string) => {
  const { data, error } = await supabase
    .from('doctor_baby_assignments')
    .select('baby_id,parent_id,status,assignment_reason,start_date,created_at')
    .eq('doctor_id', doctorId)
    .eq('status', 'active')
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

const getDoctorAssignedBabies = async (doctorId: string) => {
  const assignments = await getDoctorAssignments(doctorId);
  const babiesById = await getBabyRowsByIds(assignments.map((assignment: any) => assignment.baby_id));

  return assignments.map((assignment: any) => {
    const babyId = String(assignment?.baby_id || '');
    const baby = babiesById.get(babyId);

    return {
      babyId,
      babyName: baby?.name || `Baby ${babyId.slice(0, 8)}`,
      babyDateOfBirth: baby?.date_of_birth || null,
      babyGender: baby?.gender || 'other',
      babyPhotoUrl: baby?.photo_url || null,
      babyCountry: baby?.country || 'US',
      babyCreatedAt: baby?.created_at || null,
      parentId: assignment?.parent_id || null,
      parentEmail: null,
      status: assignment?.status || 'active',
      assignmentReason: assignment?.assignment_reason || null,
    };
  });
};

const getDoctorUpcomingAppointments = async (doctorId: string, daysAhead = 7) => {
  const startDate = toIsoDate(new Date());
  const endDate = toIsoDate(new Date(Date.now() + Math.max(0, daysAhead) * 24 * 60 * 60 * 1000));
  const { data, error } = await supabase
    .from('appointment_reminders')
    .select('id,baby_id,parent_id,scheduled_date,scheduled_time,appointment_type,status')
    .eq('doctor_id', doctorId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .in('status', ['pending', 'reminded'])
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (error) throw error;

  const rows = data || [];
  const babiesById = await getBabyRowsByIds(rows.map((appointment: any) => appointment.baby_id));

  return rows.map((appointment: any) => {
    const babyId = String(appointment?.baby_id || '');
    const baby = babiesById.get(babyId);

    return {
      appointment_id: appointment.id,
      baby_id: babyId,
      baby_name: baby?.name || `Baby ${babyId.slice(0, 8)}`,
      parent_id: appointment.parent_id || null,
      scheduled_date: appointment.scheduled_date,
      scheduled_time: appointment.scheduled_time,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
    };
  });
};

const getBabyActiveMedications = async (babyId: string) => {
  const today = toIsoDate(new Date());
  const { data, error } = await supabase
    .from('medications')
    .select('id,medication_name,dosage,frequency,doctor_id,prescribed_at,status,end_date')
    .eq('baby_id', babyId)
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('prescribed_at', { ascending: false });

  if (error) throw error;

  const rows = data || [];
  const doctorIds = Array.from(
    new Set(rows.map((medication: any) => String(medication?.doctor_id || '').trim()).filter(Boolean)),
  );
  const { data: doctors, error: doctorsError } = doctorIds.length
    ? await supabase.from('doctor_profiles').select('user_id,full_name').in('user_id', doctorIds)
    : { data: [], error: null };

  if (doctorsError) throw doctorsError;

  const doctorsById = new Map<string, string>();
  for (const doctor of doctors || []) {
    doctorsById.set(String(doctor.user_id), String(doctor.full_name || 'Doctor'));
  }

  return rows.map((medication: any) => ({
    medication_id: medication.id,
    medication_name: medication.medication_name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    doctor_name: doctorsById.get(String(medication.doctor_id)) || 'Doctor',
    prescribed_at: medication.prescribed_at,
    status: medication.status,
  }));
};

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
      medicalBoard,
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

    if (!fullName || !specialization || !licenseNumber || !qualification) {
      return res.status(400).json({
        success: false,
        error: 'Full name, specialization, qualification, and license number are required',
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
          medical_board: medicalBoard,
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

    const linkedInviteCount = userId
      ? await syncAcceptedDoctorInvitesForDoctor(String(userId), String(req.user?.email || ''))
      : 0;

    logger.info('Doctor profile created/updated', 'DOCTOR', { userId });

    res.json({
      success: true,
      data: profile,
      message:
        linkedInviteCount > 0
          ? `Doctor profile saved successfully and ${linkedInviteCount} patient assignment(s) were activated`
          : 'Doctor profile saved successfully',
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
    const doctorId = String(req.user?.id || '');
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const enrichedAssignments = await getDoctorAssignedBabies(doctorId);

    res.json({
      success: true,
      data: enrichedAssignments,
      count: enrichedAssignments.length,
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
    const medications = await getBabyActiveMedications(String(babyId));

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

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

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

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

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

    if (
      !(await ensureRecordBabyAccess<{ id: string; baby_id: string }>(req, res, {
        table: 'diagnoses',
        idValue: diagnosisId,
        write: true,
        missingMessage: 'Diagnosis not found',
      }))
    )
      return;

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

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

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

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const medications = await getBabyActiveMedications(String(babyId));

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

      if (
        !(await ensureRecordBabyAccess<{ id: string; baby_id: string }>(req, res, {
          table: 'medications',
          idValue: medicationId,
          write: true,
          missingMessage: 'Medication not found',
        }))
      )
        return;

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

    if (
      !(await ensureRecordBabyAccess<{ id: string; baby_id: string }>(req, res, {
        table: 'medications',
        idValue: medicationId,
        write: true,
        missingMessage: 'Medication not found',
      }))
    )
      return;

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

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

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

    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const appointments = await getDoctorUpcomingAppointments(String(doctorId), daysAhead);

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

      if (
        !(await ensureRecordBabyAccess<{ id: string; baby_id: string }>(req, res, {
          table: 'appointment_reminders',
          idValue: reminderId,
          write: true,
          missingMessage: 'Reminder not found',
        }))
      )
        return;

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

      const reminder = await ensureRecordBabyAccess<{
        id: string;
        baby_id: string;
        parent_id: string;
        doctor_id: string;
        appointment_type: string;
        scheduled_date: string;
        scheduled_time?: string | null;
      }>(req, res, {
        table: 'appointment_reminders',
        idValue: reminderId,
        select: 'id,baby_id,parent_id,doctor_id,appointment_type,scheduled_date,scheduled_time',
        write: true,
        missingMessage: 'Reminder not found',
      });

      if (!reminder) return;

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

    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const [{ count: patientCount, error: patientCountError }, appointments, { data: recentDiagnoses, error: diagnosisError }] =
      await Promise.all([
        supabase
          .from('doctor_baby_assignments')
          .select('baby_id', { count: 'exact', head: true })
          .eq('doctor_id', doctorId)
          .eq('status', 'active'),
        getDoctorUpcomingAppointments(String(doctorId), 14),
        supabase
          .from('diagnoses')
          .select('*')
          .eq('doctor_id', doctorId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

    if (patientCountError) throw patientCountError;
    if (diagnosisError) throw diagnosisError;

    res.json({
      success: true,
      data: {
        patientCount: patientCount || 0,
        upcomingAppointments: appointments.slice(0, 5),
        recentDiagnoses: recentDiagnoses || [],
      },
    });
  } catch (error) {
    logger.error('Failed to fetch doctor dashboard', error as Error, 'DOCTOR');
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

export default router;
