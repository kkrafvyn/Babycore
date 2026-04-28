import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { supabase } from '../utils/supabase.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

type BabyAccessRole = 'owner' | 'shared' | 'doctor' | 'none';

type BabyAccessResult = {
  allowed: boolean;
  canWrite: boolean;
  role: BabyAccessRole;
  baby: any | null;
  sharedRole?: string;
};

const getPdfBuffer = (doc: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer | Uint8Array) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const getUserProfileType = (user: any): string => {
  const profileType = String(user?.user_metadata?.onboarding_profile_type || '').trim().toLowerCase();
  if (profileType === 'doctor' || profileType === 'caregiver' || profileType === 'baby') {
    return profileType;
  }
  return 'baby';
};

const resolveBabyAccess = async (
  userId: string,
  userEmail: string | undefined,
  babyId: string,
): Promise<BabyAccessResult> => {
  const { data: baby, error: babyError } = await supabase
    .from('babies')
    .select('*')
    .eq('id', babyId)
    .maybeSingle();

  if (babyError || !baby) {
    return { allowed: false, canWrite: false, role: 'none', baby: null };
  }

  if (baby.user_id === userId) {
    return { allowed: true, canWrite: true, role: 'owner', baby };
  }

  const userEmailNormalized = normalizeEmail(userEmail);

  const { data: acceptedByUserInvite } = await supabase
    .from('family_sharing_invites')
    .select('*')
    .eq('baby_id', babyId)
    .eq('accepted_by', userId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let acceptedByEmailInvite: any = null;
  if (userEmailNormalized) {
    const { data } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .ilike('invited_email', userEmailNormalized)
      .not('accepted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    acceptedByEmailInvite = data || null;
  }

  const acceptedInvite = acceptedByUserInvite || acceptedByEmailInvite;

  if (acceptedInvite) {
    const writableRoles = new Set(['owner', 'editor', 'caregiver', 'doctor']);
    return {
      allowed: true,
      canWrite: writableRoles.has(String(acceptedInvite.role || '').toLowerCase()),
      role: 'shared',
      baby,
      sharedRole: acceptedInvite.role,
    };
  }

  const { data: assignment } = await supabase
    .from('doctor_baby_assignments')
    .select('id,status')
    .eq('baby_id', babyId)
    .eq('doctor_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (assignment) {
    return { allowed: true, canWrite: true, role: 'doctor', baby };
  }

  return { allowed: false, canWrite: false, role: 'none', baby: null };
};

const ensureBabyAccess = async (
  req: AuthRequest,
  res: Response,
  babyId: string,
): Promise<BabyAccessResult | null> => {
  const userId = req.user?.id as string | undefined;
  const userEmail = req.user?.email as string | undefined;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return null;
  }

  const access = await resolveBabyAccess(userId, userEmail, babyId);
  if (!access.allowed) {
    res.status(403).json({ success: false, error: 'No access to this baby profile' });
    return null;
  }

  return access;
};

const buildEmergencyCard = async (babyId: string) => {
  const [babyResult, allergiesResult, medicationsResult, growthResult, vaccineResult, doctorContactsResult] =
    await Promise.all([
      supabase.from('babies').select('*').eq('id', babyId).maybeSingle(),
      supabase
        .from('allergies')
        .select('allergen,severity,reaction_description,discovered_date')
        .eq('baby_id', babyId)
        .order('discovered_date', { ascending: false }),
      supabase
        .from('medications')
        .select('medication_name,dosage,frequency,status,start_date,end_date')
        .eq('baby_id', babyId)
        .in('status', ['active', 'completed'])
        .order('start_date', { ascending: false }),
      supabase
        .from('growth_measurements')
        .select('date,weight,height,head_circumference')
        .eq('baby_id', babyId)
        .order('date', { ascending: false })
        .limit(1),
      supabase
        .from('vaccination_records')
        .select('vaccine_name,status,due_date')
        .eq('baby_id', babyId)
        .in('status', ['overdue', 'scheduled'])
        .order('due_date', { ascending: true })
        .limit(10),
      supabase
        .from('pediatrician_contacts')
        .select('name,clinic_name,phone,email,specialty,is_primary')
        .eq('baby_id', babyId)
        .order('is_primary', { ascending: false }),
    ]);

  const baby = babyResult.data;
  const allergies = allergiesResult.data || [];
  const medications = medicationsResult.data || [];
  const growth = growthResult.data?.[0] || null;
  const vaccines = vaccineResult.data || [];
  const doctorContacts = doctorContactsResult.data || [];

  return {
    baby,
    generatedAt: new Date().toISOString(),
    allergies,
    medications,
    latestGrowth: growth,
    vaccines,
    doctorContacts,
  };
};

const formatEmergencyCardAsText = (card: any): string => {
  const lines: string[] = [];

  lines.push(`Emergency Share Card - ${card?.baby?.name || 'Baby'}`);
  lines.push(`Generated: ${new Date(card.generatedAt).toLocaleString()}`);
  lines.push('');
  lines.push(`Date of birth: ${card?.baby?.date_of_birth || 'Unknown'}`);
  lines.push(`Country: ${card?.baby?.country || 'Unknown'}`);
  lines.push('');

  lines.push('Allergies:');
  if (!card.allergies.length) {
    lines.push('- None recorded');
  } else {
    for (const entry of card.allergies) {
      lines.push(`- ${entry.allergen} (${entry.severity})`);
    }
  }
  lines.push('');

  lines.push('Active medications:');
  if (!card.medications.length) {
    lines.push('- None recorded');
  } else {
    for (const entry of card.medications) {
      lines.push(
        `- ${entry.medication_name}${entry.dosage ? ` ${entry.dosage}` : ''}${
          entry.frequency ? ` (${entry.frequency})` : ''
        }`,
      );
    }
  }
  lines.push('');

  lines.push('Recent vitals:');
  if (!card.latestGrowth) {
    lines.push('- No recent growth/vitals recorded');
  } else {
    lines.push(
      `- Date ${card.latestGrowth.date} | W ${card.latestGrowth.weight ?? '-'} | H ${
        card.latestGrowth.height ?? '-'
      } | HC ${card.latestGrowth.head_circumference ?? '-'}`,
    );
  }
  lines.push('');

  lines.push('Vaccines to review:');
  if (!card.vaccines.length) {
    lines.push('- None flagged');
  } else {
    for (const vax of card.vaccines) {
      lines.push(`- ${vax.vaccine_name} (${vax.status}) due ${vax.due_date || '-'}`);
    }
  }
  lines.push('');

  lines.push('Doctor / Clinic contacts:');
  if (!card.doctorContacts.length) {
    lines.push('- None recorded');
  } else {
    for (const contact of card.doctorContacts) {
      lines.push(
        `- ${contact.name}${contact.specialty ? ` (${contact.specialty})` : ''}${
          contact.clinic_name ? ` | ${contact.clinic_name}` : ''
        }${contact.phone ? ` | ${contact.phone}` : ''}${contact.email ? ` | ${contact.email}` : ''}`,
      );
    }
  }
  lines.push('');
  lines.push('Medical disclaimer: This summary does not replace emergency or professional medical judgment.');

  return lines.join('\n');
};

router.get('/medications/:babyId/schedules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('baby_id', babyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: data || [], accessRole: access.role });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load medication schedules' });
  }
});

router.post('/medications/schedules', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const {
      id,
      babyId,
      medicationId,
      medicationName,
      dosage,
      route,
      frequency,
      intervalHours,
      dosesPerDay,
      reminderTimes,
      instructions,
      startDate,
      endDate,
      stockQuantity,
      stockUnit,
      refillThreshold,
      lastRefillAt,
      nextRefillDueDate,
      requiresConfirmation,
      status,
    } = req.body || {};

    if (!babyId || !String(medicationName || '').trim()) {
      return res.status(400).json({ success: false, error: 'babyId and medicationName are required' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId));
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'You do not have write permission for this baby' });
    }

    const payload = {
      baby_id: String(babyId),
      medication_id: medicationId || null,
      medication_name: String(medicationName).trim(),
      dosage: dosage || null,
      route: route || null,
      frequency: frequency || null,
      interval_hours: intervalHours ?? null,
      doses_per_day: dosesPerDay ?? null,
      reminder_times: Array.isArray(reminderTimes) ? reminderTimes : [],
      instructions: instructions || null,
      start_date: startDate || null,
      end_date: endDate || null,
      stock_quantity: stockQuantity ?? null,
      stock_unit: stockUnit || null,
      refill_threshold: refillThreshold ?? 0,
      last_refill_at: lastRefillAt || null,
      next_refill_due_date: nextRefillDueDate || null,
      requires_confirmation: Boolean(requiresConfirmation),
      status: status || 'active',
      created_by: userId,
    };

    if (id) {
      const { data, error } = await supabase
        .from('medication_schedules')
        .update(payload)
        .eq('id', id)
        .eq('baby_id', String(babyId))
        .select('*')
        .single();

      if (error) throw error;
      return res.json({ success: true, data, mode: 'updated' });
    }

    const { data, error } = await supabase
      .from('medication_schedules')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data, mode: 'created' });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, error: error?.message || 'Failed to save medication schedule' });
  }
});

router.post('/medications/:scheduleId/log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    const userEmail = req.user?.email as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { scheduleId } = req.params;
    const {
      plannedFor,
      doseStatus = 'taken',
      quantityUsed,
      notes,
      caregiverConfirmed,
      forceApproval,
    } = req.body || {};

    const { data: schedule, error: scheduleError } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return res.status(404).json({ success: false, error: 'Medication schedule not found' });
    }

    const access = await resolveBabyAccess(userId, userEmail, schedule.baby_id);
    if (!access.allowed) {
      return res.status(403).json({ success: false, error: 'No access to this schedule' });
    }

    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required' });
    }

    const normalizedDoseStatus =
      doseStatus === 'missed' || doseStatus === 'skipped' ? doseStatus : 'taken';
    const parsedQuantity = Number.isFinite(Number(quantityUsed)) ? Number(quantityUsed) : null;

    const shouldRequireApproval =
      Boolean(forceApproval) || (Boolean(schedule.requires_confirmation) && access.role !== 'owner');

    const logPayload = {
      schedule_id: scheduleId,
      baby_id: schedule.baby_id,
      medication_name: schedule.medication_name,
      planned_for: plannedFor || null,
      dose_status: normalizedDoseStatus,
      quantity_used: parsedQuantity,
      notes: notes || null,
      logged_by: userId,
      caregiver_confirmed_by: caregiverConfirmed ? userId : null,
      caregiver_confirmed_at: caregiverConfirmed ? new Date().toISOString() : null,
      approval_required: shouldRequireApproval,
    };

    const { data: createdLog, error: logError } = await supabase
      .from('medication_dose_logs')
      .insert(logPayload)
      .select('*')
      .single();

    if (logError) throw logError;

    if (parsedQuantity !== null && parsedQuantity > 0 && schedule.stock_quantity !== null) {
      const updatedStock = Math.max(Number(schedule.stock_quantity) - parsedQuantity, 0);
      const threshold = Number(schedule.refill_threshold || 0);
      const nextRefillDueDate = updatedStock <= threshold ? new Date().toISOString().slice(0, 10) : null;

      await supabase
        .from('medication_schedules')
        .update({
          stock_quantity: updatedStock,
          next_refill_due_date: nextRefillDueDate,
        })
        .eq('id', scheduleId);
    }

    let approvalRequest: any = null;
    if (shouldRequireApproval) {
      const profileType = getUserProfileType(req.user);
      const { data: request, error: requestError } = await supabase
        .from('care_approval_requests')
        .insert({
          baby_id: schedule.baby_id,
          request_type: 'medication_log',
          target_table: 'medication_dose_logs',
          target_record_id: createdLog.id,
          requested_payload: {
            schedule_id: scheduleId,
            medication_name: schedule.medication_name,
            dose_status: normalizedDoseStatus,
            quantity_used: parsedQuantity,
            notes: notes || null,
            planned_for: plannedFor || null,
          },
          reason:
            profileType === 'doctor' || profileType === 'caregiver'
              ? 'Dose requires parent approval'
              : 'Manual approval requested',
          requested_by: userId,
          requested_by_role: profileType,
          status: 'pending',
        })
        .select('*')
        .single();

      if (requestError) {
        return res.status(500).json({
          success: false,
          error: requestError.message || 'Dose saved but approval request failed',
          data: createdLog,
        });
      }

      approvalRequest = request;
      await supabase
        .from('medication_dose_logs')
        .update({ approval_request_id: request.id })
        .eq('id', createdLog.id);
    }

    return res.json({
      success: true,
      data: createdLog,
      approvalRequest,
      requiresApproval: shouldRequireApproval,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to log medication dose' });
  }
});

router.get('/medications/:babyId/logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)));

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('medication_dose_logs')
      .select(
        `
        *,
        medication_schedules (
          id,
          medication_name,
          dosage,
          frequency,
          stock_quantity,
          refill_threshold,
          stock_unit
        )
      `,
      )
      .eq('baby_id', babyId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load dose logs' });
  }
});

router.get('/medications/:babyId/refill-alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('medication_schedules')
      .select('*')
      .eq('baby_id', babyId)
      .eq('status', 'active');

    if (error) throw error;

    const alerts = (data || [])
      .map((schedule: any) => {
        const stockQuantity = schedule.stock_quantity === null ? null : Number(schedule.stock_quantity);
        const threshold = Number(schedule.refill_threshold || 0);
        const isLowStock = stockQuantity !== null && stockQuantity <= threshold;
        const dueByDate =
          schedule.next_refill_due_date && new Date(schedule.next_refill_due_date).getTime() <= Date.now();
        const shouldAlert = isLowStock || dueByDate;

        return {
          scheduleId: schedule.id,
          medicationName: schedule.medication_name,
          stockQuantity,
          stockUnit: schedule.stock_unit,
          refillThreshold: threshold,
          nextRefillDueDate: schedule.next_refill_due_date,
          shouldAlert,
          reason: isLowStock ? 'low_stock' : dueByDate ? 'refill_due' : null,
        };
      })
      .filter((item) => item.shouldAlert);

    return res.json({ success: true, data: alerts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load refill alerts' });
  }
});

router.post('/approvals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const {
      babyId,
      requestType = 'other',
      targetTable,
      targetRecordId,
      requestedPayload,
      reason,
    } = req.body || {};

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    const access = await ensureBabyAccess(req, res, String(babyId));
    if (!access) return;
    if (!access.canWrite) {
      return res.status(403).json({ success: false, error: 'Write permission required' });
    }

    const profileType = getUserProfileType(req.user);
    const { data, error } = await supabase
      .from('care_approval_requests')
      .insert({
        baby_id: String(babyId),
        request_type: requestType,
        target_table: targetTable || null,
        target_record_id: targetRecordId || null,
        requested_payload: requestedPayload || {},
        reason: reason || null,
        requested_by: userId,
        requested_by_role: profileType,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create approval request' });
  }
});

router.get('/approvals/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const status = String(req.query.status || 'all').toLowerCase();

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    let query = supabase
      .from('care_approval_requests')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [], canDecide: access.role === 'owner' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load approvals' });
  }
});

router.post('/approvals/:approvalId/decision', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { approvalId } = req.params;
    const { decision, notes } = req.body || {};
    const status = String(decision || '').toLowerCase();
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'decision must be approved, rejected, or cancelled' });
    }

    const { data: request, error: requestError } = await supabase
      .from('care_approval_requests')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ success: false, error: 'Approval request not found' });
    }

    const access = await ensureBabyAccess(req, res, request.baby_id);
    if (!access) return;

    const isRequester = request.requested_by === userId;
    const isOwner = access.role === 'owner';
    if (!isOwner && !(isRequester && status === 'cancelled')) {
      return res.status(403).json({ success: false, error: 'Only parent owner can approve/reject this request' });
    }

    const { data, error } = await supabase
      .from('care_approval_requests')
      .update({
        status,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_notes: notes || null,
      })
      .eq('id', approvalId)
      .select('*')
      .single();

    if (error) throw error;

    if (request.target_table === 'medication_dose_logs' && request.target_record_id) {
      await supabase
        .from('medication_dose_logs')
        .update({
          approval_required: status === 'approved' ? false : true,
          caregiver_confirmed_by: status === 'approved' ? userId : null,
          caregiver_confirmed_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', request.target_record_id);
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to process decision' });
  }
});

router.get('/clinic/patient-queue', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const [assignmentsResult, appointmentsResult] = await Promise.all([
      supabase
        .from('doctor_baby_assignments')
        .select('id,baby_id,parent_id,status,start_date,notes,babies(name,date_of_birth,country,photo_url)')
        .eq('doctor_id', doctorId)
        .eq('status', 'active')
        .order('start_date', { ascending: false }),
      supabase
        .from('appointment_reminders')
        .select('id,baby_id,scheduled_date,scheduled_time,appointment_type,status')
        .eq('doctor_id', doctorId)
        .in('status', ['pending', 'reminded'])
        .order('scheduled_date', { ascending: true })
        .limit(200),
    ]);

    if (assignmentsResult.error) throw assignmentsResult.error;
    if (appointmentsResult.error) throw appointmentsResult.error;

    const assignments = assignmentsResult.data || [];
    const babyIds = assignments.map((item: any) => item.baby_id).filter(Boolean);

    if (!babyIds.length) {
      return res.json({
        success: true,
        data: { queue: [], alertInbox: [], stats: { totalPatients: 0, pendingApprovals: 0, overdueVaccines: 0 } },
      });
    }

    const [approvalsResult, overdueVaccinesResult] = await Promise.all([
      supabase
        .from('care_approval_requests')
        .select('id,baby_id,status,request_type,created_at,reason')
        .in('baby_id', babyIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('vaccination_records')
        .select('id,baby_id,vaccine_name,due_date,status')
        .in('baby_id', babyIds)
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(400),
    ]);

    if (approvalsResult.error) throw approvalsResult.error;
    if (overdueVaccinesResult.error) throw overdueVaccinesResult.error;

    const appointmentsByBaby = new Map<string, any[]>();
    for (const appointment of appointmentsResult.data || []) {
      if (!appointmentsByBaby.has(appointment.baby_id)) {
        appointmentsByBaby.set(appointment.baby_id, []);
      }
      appointmentsByBaby.get(appointment.baby_id)?.push(appointment);
    }

    const approvalsByBaby = new Map<string, any[]>();
    for (const item of approvalsResult.data || []) {
      if (!approvalsByBaby.has(item.baby_id)) {
        approvalsByBaby.set(item.baby_id, []);
      }
      approvalsByBaby.get(item.baby_id)?.push(item);
    }

    const overdueByBaby = new Map<string, any[]>();
    for (const item of overdueVaccinesResult.data || []) {
      if (!overdueByBaby.has(item.baby_id)) {
        overdueByBaby.set(item.baby_id, []);
      }
      overdueByBaby.get(item.baby_id)?.push(item);
    }

    const queue = assignments.map((assignment: any) => {
      const nextAppointment = (appointmentsByBaby.get(assignment.baby_id) || [])[0] || null;
      const pendingApprovals = approvalsByBaby.get(assignment.baby_id) || [];
      const overdueVaccines = overdueByBaby.get(assignment.baby_id) || [];

      return {
        assignmentId: assignment.id,
        babyId: assignment.baby_id,
        babyName: assignment.babies?.name || `Baby ${String(assignment.baby_id).slice(0, 8)}`,
        babyPhotoUrl: assignment.babies?.photo_url || null,
        country: assignment.babies?.country || 'US',
        dateOfBirth: assignment.babies?.date_of_birth || null,
        nextAppointment,
        pendingApprovalsCount: pendingApprovals.length,
        overdueVaccinesCount: overdueVaccines.length,
        status: assignment.status,
      };
    });

    const alertInbox = [
      ...(approvalsResult.data || []).map((item: any) => ({
        type: 'approval',
        id: item.id,
        babyId: item.baby_id,
        createdAt: item.created_at,
        title: `Approval required: ${item.request_type}`,
        message: item.reason || 'A care team change is waiting for parent decision.',
      })),
      ...(overdueVaccinesResult.data || []).slice(0, 50).map((item: any) => ({
        type: 'vaccine',
        id: item.id,
        babyId: item.baby_id,
        createdAt: item.due_date,
        title: `Overdue vaccine: ${item.vaccine_name}`,
        message: `Due date ${item.due_date}`,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: {
        queue,
        alertInbox,
        stats: {
          totalPatients: queue.length,
          pendingApprovals: (approvalsResult.data || []).length,
          overdueVaccines: (overdueVaccinesResult.data || []).length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load clinic panel data' });
  }
});

router.get('/clinic/report-templates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('clinic_report_templates')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to load templates' });
  }
});

router.post('/clinic/report-templates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const {
      id,
      name,
      reportType = 'health_summary',
      includeData = ['sleep', 'feeding', 'diaper', 'growth', 'vaccinations', 'health'],
      promptNotes,
      isDefault = false,
    } = req.body || {};

    if (!String(name || '').trim()) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }

    const payload = {
      doctor_id: doctorId,
      name: String(name).trim(),
      report_type: String(reportType || 'health_summary'),
      include_data: Array.isArray(includeData) ? includeData : [],
      prompt_notes: promptNotes || null,
      is_default: Boolean(isDefault),
    };

    if (id) {
      const { data, error } = await supabase
        .from('clinic_report_templates')
        .update(payload)
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('*')
        .single();

      if (error) throw error;
      return res.json({ success: true, data, mode: 'updated' });
    }

    const { data, error } = await supabase
      .from('clinic_report_templates')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.json({ success: true, data, mode: 'created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to save template' });
  }
});

router.delete('/clinic/report-templates/:templateId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user?.id as string | undefined;
    if (!doctorId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { templateId } = req.params;
    const { error } = await supabase
      .from('clinic_report_templates')
      .delete()
      .eq('id', templateId)
      .eq('doctor_id', doctorId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to delete template' });
  }
});

router.get('/emergency-card/:babyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const card = await buildEmergencyCard(babyId);
    if (!card.baby) {
      return res.status(404).json({ success: false, error: 'Baby not found' });
    }

    const text = formatEmergencyCardAsText(card);
    const qrCodeDataUrl = await QRCode.toDataURL(text);

    return res.json({
      success: true,
      data: {
        ...card,
        text,
        qrCodeDataUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to build emergency card' });
  }
});

router.get('/emergency-card/:babyId/pdf', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId } = req.params;
    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const card = await buildEmergencyCard(babyId);
    if (!card.baby) {
      return res.status(404).json({ success: false, error: 'Baby not found' });
    }

    const emergencyText = formatEmergencyCardAsText(card);
    const qrCodeDataUrl = await QRCode.toDataURL(emergencyText);

    const doc = new PDFDocument({ margin: 42 });
    const bufferPromise = getPdfBuffer(doc);

    doc.fontSize(20).text('BabyCore Emergency Share Card');
    doc.moveDown(0.4);
    doc.fontSize(12).text(`Baby: ${card.baby.name}`);
    doc.fontSize(10).fillColor('#4b5563').text(`Generated: ${new Date(card.generatedAt).toLocaleString()}`);
    doc.fillColor('#000000');
    doc.moveDown(0.7);

    doc.image(qrCodeDataUrl, 430, 42, { width: 120 });

    const lines = emergencyText.split('\n');
    for (const line of lines) {
      if (!line.trim()) {
        doc.moveDown(0.35);
      } else if (line.endsWith(':')) {
        doc.fontSize(12).font('Helvetica-Bold').text(line);
        doc.font('Helvetica');
      } else {
        doc.fontSize(10).text(line);
      }
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#6b7280').text('This card is informational. For emergencies, contact local emergency services immediately.');
    doc.end();

    const buffer = await bufferPromise;
    const safeBabyName = String(card.baby.name || 'baby').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const fileName = `emergency-share-card-${safeBabyName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to generate emergency PDF' });
  }
});

export default router;
