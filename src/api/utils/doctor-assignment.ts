import { logger } from '../../utils/logger.js';
import { supabase } from './supabase.js';

type EnsureDoctorAssignmentRecordInput = {
  doctorId: string;
  babyId: string;
  parentId: string;
  assignmentReason?: string | null;
  notes?: string | null;
};

const isMissingDoctorProfileError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const message = String(candidate.message || candidate.details || candidate.hint || '').toLowerCase();

  return (
    message.includes('doctor_profiles') ||
    message.includes('doctor_profile') ||
    message.includes('foreign key') ||
    message.includes('doctor_id')
  );
};

export const ensureDoctorAssignmentRecord = async ({
  doctorId,
  babyId,
  parentId,
  assignmentReason,
  notes,
}: EnsureDoctorAssignmentRecordInput): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doctor_baby_assignments')
      .upsert(
        {
          doctor_id: doctorId,
          baby_id: babyId,
          parent_id: parentId,
          assignment_reason: assignmentReason || 'Accepted care-team doctor invite',
          status: 'active',
          parent_consent: true,
          consent_date: new Date().toISOString(),
          notes: notes || null,
          end_date: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'doctor_id,baby_id' },
      );

    if (error) {
      if (isMissingDoctorProfileError(error)) {
        logger.warn('Skipped doctor assignment sync because doctor profile is not ready yet', 'DOCTOR', {
          doctorId,
          babyId,
          parentId,
        });
        return false;
      }

      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Failed to ensure doctor assignment record', error as Error, 'DOCTOR', {
      doctorId,
      babyId,
      parentId,
    });
    return false;
  }
};

export const syncAcceptedDoctorInvitesForDoctor = async (
  doctorId: string,
  doctorEmail?: string,
): Promise<number> => {
  const normalizedEmail = doctorEmail?.trim().toLowerCase();
  const queries = [
    supabase
      .from('family_sharing_invites')
      .select('id,baby_id,created_by,role,accepted_at,accepted_by,invited_email')
      .eq('role', 'doctor')
      .eq('accepted_by', doctorId)
      .not('accepted_at', 'is', null),
  ];

  if (normalizedEmail) {
    queries.push(
      supabase
        .from('family_sharing_invites')
        .select('id,baby_id,created_by,role,accepted_at,accepted_by,invited_email')
        .eq('role', 'doctor')
        .ilike('invited_email', normalizedEmail)
        .not('accepted_at', 'is', null),
    );
  }

  const results = await Promise.all(queries);
  const uniqueInvites = new Map<string, any>();

  for (const result of results) {
    if (result.error) {
      logger.warn('Skipped one accepted doctor invite sync query', 'DOCTOR', {
        doctorId,
        message: result.error.message,
      });
      continue;
    }

    for (const invite of result.data || []) {
      uniqueInvites.set(String(invite.id), invite);
    }
  }

  let syncedCount = 0;

  for (const invite of uniqueInvites.values()) {
    const created = await ensureDoctorAssignmentRecord({
      doctorId,
      babyId: String(invite.baby_id || ''),
      parentId: String(invite.created_by || ''),
      assignmentReason: 'Accepted care-team doctor invite',
    });

    if (created) {
      syncedCount += 1;
    }
  }

  return syncedCount;
};
