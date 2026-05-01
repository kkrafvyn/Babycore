import type { Response } from 'express';

import type { AuthRequest } from '../middleware/auth.js';
import { supabase } from './supabase.js';

export type BabyAccessRole = 'owner' | 'shared' | 'doctor' | 'none';

export type BabyAccessResult = {
  allowed: boolean;
  canWrite: boolean;
  role: BabyAccessRole;
  baby: Record<string, any> | null;
  sharedRole?: string | null;
};

type EnsureBabyAccessOptions = {
  write?: boolean;
  missingMessage?: string;
  forbiddenMessage?: string;
};

type EnsureRecordAccessOptions = {
  table: string;
  idValue: string;
  idColumn?: string;
  select?: string;
  write?: boolean;
  missingMessage?: string;
  forbiddenMessage?: string;
};

const WRITABLE_SHARED_ROLES = new Set(['owner', 'editor', 'caregiver', 'doctor']);

const normalizeEmail = (value?: string | null): string | null => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
};

export async function resolveBabyAccessForIdentity(
  userId?: string | null,
  userEmail?: string | null,
  babyId?: string | null,
): Promise<BabyAccessResult> {
  if (!userId || !babyId) {
    return { allowed: false, canWrite: false, role: 'none', baby: null };
  }

  const { data: baby, error: babyError } = await supabase
    .from('babies')
    .select('id,name,date_of_birth,gender,user_id')
    .eq('id', babyId)
    .maybeSingle();

  if (babyError) {
    throw babyError;
  }

  if (!baby) {
    return { allowed: false, canWrite: false, role: 'none', baby: null };
  }

  if (String(baby.user_id || '') === String(userId)) {
    return { allowed: true, canWrite: true, role: 'owner', baby };
  }

  const normalizedEmail = normalizeEmail(userEmail);
  const [inviteByUser, inviteByEmail, doctorAssignment] = await Promise.all([
    supabase
      .from('family_sharing_invites')
      .select('id,role')
      .eq('baby_id', babyId)
      .eq('accepted_by', userId)
      .not('accepted_at', 'is', null)
      .maybeSingle(),
    normalizedEmail
      ? supabase
          .from('family_sharing_invites')
          .select('id,role')
          .eq('baby_id', babyId)
          .ilike('invited_email', normalizedEmail)
          .not('accepted_at', 'is', null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    supabase
      .from('doctor_baby_assignments')
      .select('id,status')
      .eq('baby_id', babyId)
      .eq('doctor_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const acceptedInvite = inviteByUser.data || inviteByEmail.data;
  if (acceptedInvite) {
    const sharedRole = String(acceptedInvite.role || '').trim().toLowerCase() || null;
    return {
      allowed: true,
      canWrite: sharedRole ? WRITABLE_SHARED_ROLES.has(sharedRole) : false,
      role: 'shared',
      baby,
      sharedRole,
    };
  }

  if (doctorAssignment.data) {
    return { allowed: true, canWrite: true, role: 'doctor', baby };
  }

  return { allowed: false, canWrite: false, role: 'none', baby: null };
}

export async function ensureBabyAccess(
  req: AuthRequest,
  res: Response,
  babyId?: string | null,
  options: EnsureBabyAccessOptions = {},
): Promise<BabyAccessResult | null> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return null;
  }

  if (!babyId) {
    res.status(400).json({ success: false, error: options.missingMessage || 'Baby ID required' });
    return null;
  }

  const access = await resolveBabyAccessForIdentity(req.user.id, req.user.email, babyId);
  if (!access.allowed || (options.write && !access.canWrite)) {
    res.status(403).json({
      success: false,
      error: options.forbiddenMessage || 'You do not have access to this baby',
    });
    return null;
  }

  return access;
}

export async function ensureRecordBabyAccess<T extends { baby_id?: string | null }>(
  req: AuthRequest,
  res: Response,
  options: EnsureRecordAccessOptions,
): Promise<T | null> {
  const { data: rawData, error } = await supabase
    .from(options.table)
    .select(options.select || 'id,baby_id')
    .eq(options.idColumn || 'id', options.idValue)
    .maybeSingle();
  const data = rawData as (T & { baby_id?: string | null }) | null;

  if (error) {
    throw error;
  }

  if (!data) {
    res.status(404).json({ success: false, error: options.missingMessage || 'Record not found' });
    return null;
  }

  const access = await ensureBabyAccess(req, res, String(data.baby_id || ''), {
    write: options.write,
    forbiddenMessage: options.forbiddenMessage,
  });

  if (!access) {
    return null;
  }

  return data as unknown as T;
}

export async function createSignedStorageUrl(
  bucket: string,
  storagePath?: string | null,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const safePath = String(storagePath || '').trim();
  if (!safePath) {
    return null;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(safePath, expiresInSeconds);
  if (error) {
    console.warn(`Unable to create signed URL for ${bucket}/${safePath}:`, error.message);
    return null;
  }

  return data?.signedUrl || null;
}

export function buildStorageReference(bucket: string, storagePath?: string | null): string | null {
  const safePath = String(storagePath || '').trim();
  if (!safePath) {
    return null;
  }
  return `storage://${bucket}/${safePath}`;
}
