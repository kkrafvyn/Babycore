import crypto from 'crypto';
import { Router, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { ensureDoctorAssignmentRecord } from '../utils/doctor-assignment.js';
import { resolveClientAppBaseUrl } from '../utils/app-base-url.js';

const router = Router();

type FamilySharingRole = 'owner' | 'editor' | 'viewer' | 'caregiver' | 'doctor';

type BabyAccessRole = 'owner' | 'shared' | 'doctor' | 'none';

type BabyAccessResult = {
  allowed: boolean;
  canManageSharing: boolean;
  role: BabyAccessRole;
  baby: any | null;
  sharedRole?: string;
};

const INVITABLE_ROLES = new Set<FamilySharingRole>(['editor', 'viewer', 'caregiver', 'doctor']);

const normalizeEmail = (value?: string): string => value?.trim().toLowerCase() || '';

const createInviteToken = (): string => crypto.randomBytes(24).toString('base64url');

const buildInviteLink = (
  req: AuthRequest,
  inviteToken: string,
  view: 'patients' | 'family-sharing' = 'patients',
): string => {
  const inviteUrl = new URL('/login', resolveClientAppBaseUrl(req));
  inviteUrl.searchParams.set('invite', inviteToken);
  inviteUrl.searchParams.set('view', view);
  return inviteUrl.toString();
};

const generatePublicInviteEmail = (): string =>
  `invite-${crypto.randomUUID().replace(/-/g, '')}@share.babycore.app`.toLowerCase();

const mapInvite = (invite: any) => ({
  ...invite,
  status: invite?.accepted_at ? 'accepted' : 'pending',
});

const isInviteExpired = (invite: any): boolean => {
  const expiresAtMs = invite?.expires_at ? new Date(invite.expires_at).getTime() : Number.NaN;
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
};

const isMissingRelationError = (error: any): boolean =>
  error?.code === '42P01' ||
  /relation .* does not exist|schema cache|could not find the table/i.test(
    String(error?.message || error?.details || error?.hint || ''),
  );

const isViewerOnlyAccess = (access: BabyAccessResult): boolean =>
  access.role === 'shared' && String(access.sharedRole || '').toLowerCase() === 'viewer';

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
    return { allowed: false, canManageSharing: false, role: 'none', baby: null };
  }

  if (baby.user_id === userId) {
    return { allowed: true, canManageSharing: true, role: 'owner', baby };
  }

  const normalizedEmail = normalizeEmail(userEmail);

  const { data: acceptedInviteByUser } = await supabase
    .from('family_sharing_invites')
    .select('*')
    .eq('baby_id', babyId)
    .eq('accepted_by', userId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let acceptedInviteByEmail: any = null;
  if (normalizedEmail) {
    const { data } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .ilike('invited_email', normalizedEmail)
      .not('accepted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    acceptedInviteByEmail = data || null;
  }

  const acceptedInvite = acceptedInviteByUser || acceptedInviteByEmail;
  if (acceptedInvite) {
    return {
      allowed: true,
      canManageSharing: false,
      role: 'shared',
      baby,
      sharedRole: String(acceptedInvite.role || ''),
    };
  }

  const { data: doctorAssignment } = await supabase
    .from('doctor_baby_assignments')
    .select('id')
    .eq('baby_id', babyId)
    .eq('doctor_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (doctorAssignment) {
    return { allowed: true, canManageSharing: false, role: 'doctor', baby };
  }

  return { allowed: false, canManageSharing: false, role: 'none', baby: null };
};

const ensureBabyAccess = async (
  req: AuthRequest,
  res: Response,
  babyId: string,
  options?: { requireSharingManager?: boolean },
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

  if (options?.requireSharingManager && !access.canManageSharing) {
    res.status(403).json({ success: false, error: 'Only the baby owner can manage care-team access' });
    return null;
  }

  return access;
};

const findInviteById = async (inviteId: string) => {
  const { data, error } = await supabase
    .from('family_sharing_invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const findInviteByToken = async (inviteToken: string) => {
  const { data, error } = await supabase
    .from('family_sharing_invites')
    .select('*')
    .eq('invite_token', inviteToken)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const acceptInviteRecord = async (invite: any, userId: string) => {
  const updatePayload = {
    accepted_at: new Date().toISOString(),
    accepted_by: userId,
  };

  let { data, error } = await supabase
    .from('family_sharing_invites')
    .update(updatePayload)
    .eq('id', invite.id)
    .is('accepted_at', null)
    .select('*')
    .single();

  if (error && /accepted_by/i.test(String(error.message || error.details || error.hint || ''))) {
    const retry = await supabase
      .from('family_sharing_invites')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
      .is('accepted_at', null)
      .select('*')
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  const doctorId = String(userId || '').trim();
  const babyId = String(data?.baby_id || invite?.baby_id || '').trim();
  const parentId = String(data?.created_by || invite?.created_by || '').trim();

  if (String(data?.role || '').trim().toLowerCase() === 'doctor' && doctorId && babyId && parentId) {
    await ensureDoctorAssignmentRecord({
      doctorId,
      babyId,
      parentId,
      assignmentReason: 'Accepted care-team doctor invite',
    });
  }

  return data;
};

const canCurrentUserAcceptInvite = (invite: any, req: AuthRequest): boolean => {
  const userId = String(req.user?.id || '').trim();
  const userEmail = normalizeEmail(req.user?.email);

  if (!userId) return false;
  if (String(invite?.accepted_by || '').trim() === userId) return true;
  if (invite?.is_public_link) return true;

  return normalizeEmail(invite?.invited_email) === userEmail;
};

router.get('/members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.query.babyId || '').trim();
    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: (data || []).map(mapInvite) });
  } catch (error) {
    logger.error('Failed to fetch family members', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to fetch family members' });
  }
});

router.post('/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.body?.babyId || '').trim();
    const invitedEmail = normalizeEmail(req.body?.email);
    const role = String(req.body?.role || 'caregiver').trim().toLowerCase() as FamilySharingRole;
    const invitedName = String(req.body?.invitedName || '').trim() || null;
    const babyNameSnapshot = String(req.body?.babyNameSnapshot || '').trim() || null;
    const babyPhotoUrlSnapshot = String(req.body?.babyPhotoUrlSnapshot || '').trim() || null;

    if (!babyId || !invitedEmail) {
      return res.status(400).json({ success: false, error: 'babyId and email are required' });
    }

    if (!INVITABLE_ROLES.has(role)) {
      return res.status(400).json({ success: false, error: 'Invalid invite role' });
    }

    const access = await ensureBabyAccess(req, res, babyId, { requireSharingManager: true });
    if (!access) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const basePayload = {
      baby_id: babyId,
      invited_email: invitedEmail,
      role,
      invite_token: createInviteToken(),
      expires_at: expiresAt.toISOString(),
      created_by: req.user?.id,
      baby_name_snapshot: babyNameSnapshot,
      baby_photo_url_snapshot: babyPhotoUrlSnapshot,
    };

    let { data, error } = await supabase
      .from('family_sharing_invites')
      .insert({
        ...basePayload,
        invited_name: invitedName,
        is_public_link: false,
      })
      .select('*')
      .single();

    if (error && /(invited_name|is_public_link)/i.test(String(error.message || error.details || error.hint || ''))) {
      const retry = await supabase
        .from('family_sharing_invites')
        .insert(basePayload)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    logger.info('Family sharing invite created', 'FAMILY', {
      babyId,
      invitedEmail,
      role,
      createdBy: req.user?.id,
    });

    return res.status(201).json({ success: true, data: mapInvite(data) });
  } catch (error) {
    logger.error('Failed to create family invite', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to create family invite' });
  }
});

router.post('/public-invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.body?.babyId || '').trim();
    const role = String(req.body?.role || 'caregiver').trim().toLowerCase() as FamilySharingRole;
    const invitedName = String(req.body?.invitedName || '').trim() || null;
    const babyNameSnapshot = String(req.body?.babyNameSnapshot || '').trim() || null;
    const babyPhotoUrlSnapshot = String(req.body?.babyPhotoUrlSnapshot || '').trim() || null;
    const view = String(req.body?.view || 'patients').trim() === 'family-sharing' ? 'family-sharing' : 'patients';

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    if (!INVITABLE_ROLES.has(role)) {
      return res.status(400).json({ success: false, error: 'Invalid invite role' });
    }

    const access = await ensureBabyAccess(req, res, babyId, { requireSharingManager: true });
    if (!access) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const basePayload = {
      baby_id: babyId,
      invited_email: generatePublicInviteEmail(),
      role,
      invite_token: createInviteToken(),
      expires_at: expiresAt.toISOString(),
      created_by: req.user?.id,
      baby_name_snapshot: babyNameSnapshot,
      baby_photo_url_snapshot: babyPhotoUrlSnapshot,
    };

    let { data, error } = await supabase
      .from('family_sharing_invites')
      .insert({
        ...basePayload,
        invited_name: invitedName,
        is_public_link: true,
      })
      .select('*')
      .single();

    if (error && /(invited_name|is_public_link)/i.test(String(error.message || error.details || error.hint || ''))) {
      const retry = await supabase
        .from('family_sharing_invites')
        .insert(basePayload)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: {
        invite: mapInvite(data),
        inviteLink: buildInviteLink(req, data.invite_token, view),
      },
    });
  } catch (error) {
    logger.error('Failed to create public family invite', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to create public family invite' });
  }
});

router.patch('/invites/:inviteId/role', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inviteId = String(req.params.inviteId || '').trim();
    const role = String(req.body?.role || '').trim().toLowerCase() as FamilySharingRole;

    if (!inviteId || !INVITABLE_ROLES.has(role)) {
      return res.status(400).json({ success: false, error: 'Invalid invite role update request' });
    }

    const invite = await findInviteById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }

    const access = await ensureBabyAccess(req, res, String(invite.baby_id || ''), {
      requireSharingManager: true,
    });
    if (!access) return;

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .update({ role })
      .eq('id', inviteId)
      .select('*')
      .single();

    if (error) throw error;

    return res.json({ success: true, data: mapInvite(data) });
  } catch (error) {
    logger.error('Failed to update family invite role', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to update family invite role' });
  }
});

router.delete('/invites/:inviteId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inviteId = String(req.params.inviteId || '').trim();
    if (!inviteId) {
      return res.status(400).json({ success: false, error: 'inviteId is required' });
    }

    const invite = await findInviteById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }

    const access = await ensureBabyAccess(req, res, String(invite.baby_id || ''), {
      requireSharingManager: true,
    });
    if (!access) return;

    const { error } = await supabase.from('family_sharing_invites').delete().eq('id', inviteId);
    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to revoke family invite', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to revoke family invite' });
  }
});

router.get('/incoming', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id || '').trim();
    const userEmail = normalizeEmail(req.user?.email);
    const status = String(req.query.status || 'all').trim().toLowerCase();

    const queries: PromiseLike<any>[] = [];

    if (userEmail) {
      let emailQuery = supabase
        .from('family_sharing_invites')
        .select('*')
        .ilike('invited_email', userEmail)
        .order('created_at', { ascending: false });

      if (status === 'pending') {
        emailQuery = emailQuery.is('accepted_at', null);
      } else if (status === 'accepted') {
        emailQuery = emailQuery.not('accepted_at', 'is', null);
      }

      queries.push(emailQuery);
    }

    if (userId && status !== 'pending') {
      let acceptedByQuery = supabase
        .from('family_sharing_invites')
        .select('*')
        .eq('accepted_by', userId)
        .order('created_at', { ascending: false });

      if (status === 'accepted' || status === 'all') {
        acceptedByQuery = acceptedByQuery.not('accepted_at', 'is', null);
      }

      queries.push(acceptedByQuery);
    }

    const results = await Promise.all(queries);
    const deduped = new Map<string, any>();

    for (const result of results) {
      if (result.error) {
        throw result.error;
      }

      for (const invite of result.data || []) {
        deduped.set(String(invite.id), invite);
      }
    }

    const data = Array.from(deduped.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return res.json({ success: true, data: data.map(mapInvite) });
  } catch (error) {
    logger.error('Failed to fetch incoming family invites', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to fetch incoming family invites' });
  }
});

router.post('/invites/:inviteId/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inviteId = String(req.params.inviteId || '').trim();
    if (!inviteId) {
      return res.status(400).json({ success: false, error: 'inviteId is required' });
    }

    const invite = await findInviteById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }

    if (invite.accepted_at) {
      if (!canCurrentUserAcceptInvite(invite, req)) {
        return res.status(409).json({ success: false, error: 'Invite has already been accepted' });
      }
      return res.json({ success: true, data: mapInvite(invite) });
    }

    if (isInviteExpired(invite)) {
      return res.status(410).json({ success: false, error: 'Invite has expired' });
    }

    if (!canCurrentUserAcceptInvite(invite, req)) {
      return res.status(403).json({ success: false, error: 'You cannot accept this invite' });
    }

    const acceptedInvite = await acceptInviteRecord(invite, String(req.user?.id || ''));
    return res.json({ success: true, data: mapInvite(acceptedInvite) });
  } catch (error) {
    logger.error('Failed to accept family invite by id', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to accept family invite' });
  }
});

router.post('/accept-invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inviteToken = String(req.body?.token || '').trim();
    if (!inviteToken) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const invite = await findInviteByToken(inviteToken);
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }

    if (invite.accepted_at) {
      if (!canCurrentUserAcceptInvite(invite, req)) {
        return res.status(409).json({ success: false, error: 'Invite has already been accepted' });
      }
      return res.json({ success: true, data: mapInvite(invite) });
    }

    if (isInviteExpired(invite)) {
      return res.status(410).json({ success: false, error: 'Invite has expired' });
    }

    if (!canCurrentUserAcceptInvite(invite, req)) {
      return res.status(403).json({ success: false, error: 'You cannot accept this invite' });
    }

    const acceptedInvite = await acceptInviteRecord(invite, String(req.user?.id || ''));
    return res.json({ success: true, data: mapInvite(acceptedInvite) });
  } catch (error) {
    logger.error('Failed to accept family invite by token', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to accept family invite' });
  }
});

router.get('/search-candidates', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rawQuery = String(req.query.query || req.query.q || '').trim().toLowerCase();
    if (rawQuery.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const likeQuery = `%${rawQuery.replace(/[%_]/g, '')}%`;
    const ownerUserId = String(req.user?.id || '').trim();

    const [doctorResult, recentInviteResult] = await Promise.all([
      supabase
        .from('doctor_profiles')
        .select('full_name,clinic_email,specialization')
        .ilike('full_name', likeQuery)
        .limit(12),
      ownerUserId
        ? supabase
            .from('family_sharing_invites')
            .select('*')
            .eq('created_by', ownerUserId)
            .order('created_at', { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (doctorResult.error) throw doctorResult.error;
    if (recentInviteResult.error) throw recentInviteResult.error;

    const doctorCandidates = (doctorResult.data || [])
      .filter((entry: any) => Boolean(entry.clinic_email))
      .map((entry: any) => ({
        name: String(entry.full_name || '').trim(),
        email: normalizeEmail(entry.clinic_email),
        roleHint: 'doctor',
        source: 'doctor_directory',
        metadata: entry.specialization || 'Doctor',
      }));

    const inviteCandidates = (recentInviteResult.data || [])
      .filter((invite: any) => !invite?.is_public_link)
      .filter((invite: any) => {
        const normalized = normalizeEmail(invite?.invited_email);
        return !/^invite-[a-f0-9]+@share\.babycore\.app$/.test(normalized);
      })
      .map((invite: any) => {
        const email = normalizeEmail(invite?.invited_email);
        const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
        const name = String(invite?.invited_name || fallbackName || email).trim();

        return {
          name,
          email,
          roleHint: invite?.role === 'doctor' ? 'doctor' : 'caregiver',
          source: 'recent_invites',
          metadata: invite?.role || 'Care team',
        };
      })
      .filter((candidate: any) => candidate.email)
      .filter((candidate: any) => {
        const nameMatch = String(candidate.name || '').toLowerCase().includes(rawQuery);
        const emailMatch = String(candidate.email || '').toLowerCase().includes(rawQuery);
        return nameMatch || emailMatch;
      });

    const combined = [...doctorCandidates, ...inviteCandidates];
    const deduped = new Map<string, any>();

    for (const candidate of combined) {
      if (!deduped.has(candidate.email)) {
        deduped.set(candidate.email, candidate);
      }
    }

    return res.json({ success: true, data: Array.from(deduped.values()).slice(0, 12) });
  } catch (error) {
    logger.error('Failed to search family sharing candidates', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to search care-team candidates' });
  }
});

router.post('/caregiver-sessions/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.body?.babyId || '').trim();
    const accessType = String(req.body?.accessType || 'read_only').trim();
    const durationMinutes = Math.max(5, Math.min(480, Number(req.body?.durationMinutes || 480)));
    const pinCodeOverride = String(req.body?.pinCodeOverride || '').trim() || null;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    if (!['read_only', 'log_only', 'full'].includes(accessType)) {
      return res.status(400).json({ success: false, error: 'Invalid caregiver session access type' });
    }

    if (pinCodeOverride && !/^\d{4}$/.test(pinCodeOverride)) {
      return res.status(400).json({ success: false, error: 'PIN override must be exactly 4 digits' });
    }

    const access = await ensureBabyAccess(req, res, babyId, { requireSharingManager: true });
    if (!access) return;

    const pinCode = pinCodeOverride || crypto.randomInt(1000, 10000).toString();
    const sessionToken = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    const { data, error } = await supabase
      .from('caregiver_sessions')
      .insert({
        baby_id: babyId,
        user_id: req.user?.id,
        access_type: accessType,
        session_token: sessionToken,
        pin_code: pinCode,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error('Failed to start caregiver session', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to start caregiver session' });
  }
});

router.post('/caregiver-sessions/:sessionId/end', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const { data: session, error: sessionError } = await supabase
      .from('caregiver_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const access = await ensureBabyAccess(req, res, String(session.baby_id || ''), {
      requireSharingManager: true,
    });
    if (!access) return;

    const { error } = await supabase
      .from('caregiver_sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to end caregiver session', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to end caregiver session' });
  }
});

router.post('/activity-log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.body?.babyId || '').trim();
    const action = String(req.body?.action || '').trim();
    const details = req.body?.details ?? null;

    if (!babyId || !action) {
      return res.status(400).json({ success: false, error: 'babyId and action are required' });
    }

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { error } = await supabase.from('sharing_activity_log').insert({
      baby_id: babyId,
      user_id: req.user?.id,
      action,
      details,
    });

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to log sharing activity', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to log sharing activity' });
  }
});

router.get('/activity-log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.query.babyId || '').trim();
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('sharing_activity_log')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error('Failed to fetch sharing activity log', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to fetch sharing activity log' });
  }
});

router.get('/shift-note', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.query.babyId || '').trim();

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    const { data, error } = await supabase
      .from('caregiver_shift_notes')
      .select('*')
      .eq('baby_id', babyId)
      .eq('status', 'saved')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return res.json({
          success: true,
          data: null,
          warning: 'caregiver_shift_notes table missing. Run latest SQL migrations to enable backend shift notes.',
        });
      }

      throw error;
    }

    return res.json({ success: true, data: data || null });
  } catch (error) {
    logger.error('Failed to fetch caregiver shift note', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to fetch caregiver shift note' });
  }
});

router.put('/shift-note', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const babyId = String(req.body?.babyId || '').trim();
    const note = String(req.body?.note || '').trim();

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'babyId is required' });
    }

    if (note.length > 5000) {
      return res.status(400).json({ success: false, error: 'Shift note must be 5000 characters or less' });
    }

    const access = await ensureBabyAccess(req, res, babyId);
    if (!access) return;

    if (isViewerOnlyAccess(access)) {
      return res.status(403).json({ success: false, error: 'Viewer access is read-only' });
    }

    const { data, error } = await supabase
      .from('caregiver_shift_notes')
      .insert({
        baby_id: babyId,
        author_id: req.user?.id,
        note,
        status: 'saved',
      })
      .select('*')
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(503).json({
          success: false,
          error: 'caregiver_shift_notes table missing. Run latest SQL migrations to enable backend shift notes.',
        });
      }

      throw error;
    }

    await supabase.from('sharing_activity_log').insert({
      baby_id: babyId,
      user_id: req.user?.id,
      action: 'shift_note_saved',
      details: {
        noteLength: note.length,
      },
    });

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to save caregiver shift note', error as Error, 'FAMILY');
    return res.status(500).json({ success: false, error: 'Failed to save caregiver shift note' });
  }
});

export default router;
