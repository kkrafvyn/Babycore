import { supabase } from './supabase';

export type FamilySharingRole = 'owner' | 'editor' | 'viewer' | 'caregiver' | 'doctor';

export interface FamilySharingInvite {
  id: string;
  baby_id: string;
  invited_email: string;
  invited_name?: string;
  role: FamilySharingRole;
  invite_token: string;
  expires_at?: string;
  accepted_at?: string;
  accepted_by?: string;
  created_by: string;
  created_at: string;
  is_public_link?: boolean;
  baby_name_snapshot?: string;
  baby_photo_url_snapshot?: string;
  status?: 'accepted' | 'pending';
}

export interface CareTeamSearchCandidate {
  name: string;
  email: string;
  roleHint: 'doctor' | 'caregiver' | 'viewer';
  source: 'doctor_directory' | 'recent_invites';
  metadata?: string;
}

export interface PublicInviteLink {
  invite: FamilySharingInvite;
  inviteLink: string;
}

export interface CaregiverSession {
  id: string;
  baby_id: string;
  user_id: string;
  access_type: 'read_only' | 'log_only' | 'full';
  session_token: string;
  pin_code?: string;
  starts_at: string;
  expires_at: string;
  activity_log?: any[];
}

export interface SharingActivityLog {
  id: string;
  baby_id: string;
  user_id: string;
  action: string;
  details?: any;
  created_at: string;
}

/**
 * Send family sharing invite
 */
export async function sendFamilySharingInvite(
  babyId: string,
  invitedEmail: string,
  role: FamilySharingRole,
  createdBy: string,
  options?: {
    invitedName?: string;
    isPublicLink?: boolean;
    babyNameSnapshot?: string;
    babyPhotoUrlSnapshot?: string;
  },
): Promise<FamilySharingInvite | null> {
  try {
    const inviteToken = `${babyId}_${Math.random().toString(36).substring(7)}`;

    // 14 days expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const basePayload = {
      baby_id: babyId,
      invited_email: invitedEmail,
      role,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
      baby_name_snapshot: options?.babyNameSnapshot,
      baby_photo_url_snapshot: options?.babyPhotoUrlSnapshot,
    };

    const extendedPayload = {
      ...basePayload,
      invited_name: options?.invitedName,
      is_public_link: options?.isPublicLink || false,
    };

    let { data, error } = await supabase
      .from('family_sharing_invites')
      .insert(extendedPayload)
      .select()
      .single();

    // Backward-compat fallback for databases that don't yet have invited_name/is_public_link columns.
    if (
      error &&
      /(invited_name|is_public_link)/i.test(String(error.message || error.details || error.hint || ''))
    ) {
      const retry = await supabase
        .from('family_sharing_invites')
        .insert(basePayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Send email invitation (backend service)
    if (!options?.isPublicLink) {
      await sendInviteEmail(invitedEmail, babyId, role, inviteToken);
    }

    return data;
  } catch (err) {
    console.error('Error sending invite:', err);
    return null;
  }
}

/**
 * Send invite email
 */
async function sendInviteEmail(
  email: string,
  babyId: string,
  role: string,
  token: string
): Promise<void> {
  try {
    await fetch('/api/email/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_email: email,
        baby_id: babyId,
        role,
        invite_token: token,
        invite_link: `${window.location.origin}/accept-invite/${token}`,
      }),
    });
  } catch (err) {
    console.error('Error sending invite email:', err);
  }
}

/**
 * Accept family sharing invite
 */
export async function acceptFamilySharingInvite(
  inviteToken: string,
  userId: string
): Promise<FamilySharingInvite | null> {
  try {
    const { data: invite, error: inviteError } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('invite_token', inviteToken)
      .single();

    if (inviteError || !invite) throw inviteError || new Error('Invite not found');

    if (invite.accepted_at) {
      return invite;
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return null;
    }

    const acceptancePayload = {
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    };

    let { data, error } = await supabase
      .from('family_sharing_invites')
      .update(acceptancePayload)
      .eq('id', invite.id)
      .is('accepted_at', null)
      .select()
      .single();

    // Backward-compat fallback for databases without accepted_by.
    if (
      error &&
      /accepted_by/i.test(String(error.message || error.details || error.hint || ''))
    ) {
      const retry = await supabase
        .from('family_sharing_invites')
        .update({
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
        .is('accepted_at', null)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Link user to baby (would need a junction table)
    // This depends on your user-baby relationship model

    return {
      ...data,
      status: 'accepted',
    };
  } catch (err) {
    console.error('Error accepting invite:', err);
    return null;
  }
}

/**
 * Start caregiver session (quick handoff)
 */
export async function startCaregiverSession(
  babyId: string,
  userId: string,
  accessType: 'read_only' | 'log_only' | 'full',
  durationMinutes: number = 480, // 8 hours default
  pinCodeOverride?: string
): Promise<CaregiverSession | null> {
  try {
    // Generate PIN and session token
    const pinCode = pinCodeOverride || Math.floor(1000 + Math.random() * 9000).toString();
    const sessionToken = `${babyId}_${Math.random().toString(36).substring(7)}`;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    const { data, error } = await supabase
      .from('caregiver_sessions')
      .insert({
        baby_id: babyId,
        user_id: userId,
        access_type: accessType,
        session_token: sessionToken,
        pin_code: pinCode,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error starting caregiver session:', err);
    return null;
  }
}

/**
 * End caregiver session
 */
export async function endCaregiverSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('caregiver_sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error ending session:', err);
    return false;
  }
}

/**
 * Log activity in sharing session
 */
export async function logSharingActivity(
  babyId: string,
  userId: string,
  action: string,
  details?: any
): Promise<boolean> {
  try {
    const { error } = await supabase.from('sharing_activity_log').insert({
      baby_id: babyId,
      user_id: userId,
      action,
      details,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error logging activity:', err);
    return false;
  }
}

/**
 * Get sharing activity for a baby
 */
export async function getSharingActivityLog(
  babyId: string,
  limit = 50
): Promise<SharingActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('sharing_activity_log')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching activity log:', err);
    return [];
  }
}

/**
 * Get all family members for a baby
 */
export async function getFamilyMembers(babyId: string): Promise<FamilySharingInvite[]> {
  try {
    const { data, error } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .not('accepted_at', 'is', null);

    if (error) throw error;
    return (data || []).map((invite) => ({
      ...invite,
      status: invite.accepted_at ? 'accepted' : 'pending',
    }));
  } catch (err) {
    console.error('Error fetching family members:', err);
    return [];
  }
}

export function buildInviteLink(inviteToken: string, view: 'patients' | 'family-sharing' = 'patients') {
  if (typeof window === 'undefined') {
    return `/`;
  }

  const inviteUrl = new URL(window.location.pathname || '/', window.location.origin);
  inviteUrl.searchParams.set('invite', inviteToken);
  inviteUrl.searchParams.set('view', view);
  inviteUrl.hash = '#login';

  return inviteUrl.toString();
}

/**
 * Create a shareable invite link that can be opened by any authenticated user.
 */
export async function createPublicFamilyInviteLink(
  babyId: string,
  role: Extract<FamilySharingRole, 'caregiver' | 'doctor' | 'viewer' | 'editor'>,
  createdBy: string,
  options?: {
    invitedName?: string;
    babyNameSnapshot?: string;
    babyPhotoUrlSnapshot?: string;
    view?: 'patients' | 'family-sharing';
  },
): Promise<PublicInviteLink | null> {
  const placeholderEmail = `public-link+${Date.now()}@babycore.local`;

  const invite = await sendFamilySharingInvite(babyId, placeholderEmail, role, createdBy, {
    invitedName: options?.invitedName,
    isPublicLink: true,
    babyNameSnapshot: options?.babyNameSnapshot,
    babyPhotoUrlSnapshot: options?.babyPhotoUrlSnapshot,
  });

  if (!invite) return null;

  return {
    invite,
    inviteLink: buildInviteLink(invite.invite_token, options?.view || 'patients'),
  };
}

/**
 * Revoke family member access
 */
export async function revokeFamilyMemberAccess(inviteId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('family_sharing_invites')
      .delete()
      .eq('id', inviteId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error revoking access:', err);
    return false;
  }
}

/**
 * Update family member role
 */
export async function updateFamilyMemberRole(
  inviteId: string,
  newRole: FamilySharingRole
): Promise<FamilySharingInvite | null> {
  try {
    const { data, error } = await supabase
      .from('family_sharing_invites')
      .update({ role: newRole })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error updating role:', err);
    return null;
  }
}

const getCurrentUserEmail = async (): Promise<string | null> => {
  try {
    const auth = supabase.auth as any;
    const { data, error } = await auth.getUser();
    if (error) throw error;
    return data.user?.email?.trim().toLowerCase() || null;
  } catch (err) {
    console.error('Error getting current user email:', err);
    return null;
  }
};

const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const auth = supabase.auth as any;
    const { data, error } = await auth.getUser();
    if (error) throw error;
    return data.user?.id || null;
  } catch (err) {
    console.error('Error getting current user id:', err);
    return null;
  }
};

/**
 * Search care-team candidates by name (or email fallback).
 * Sources:
 * 1) doctor_profiles directory
 * 2) recent family_sharing_invites created by current user
 */
export async function searchCareTeamCandidates(query: string): Promise<CareTeamSearchCandidate[]> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const escaped = normalized.replace(/[%_]/g, '');
  const likeQuery = `%${escaped}%`;

  const [ownerUserId, doctorResult] = await Promise.all([
    getCurrentUserId(),
    supabase
      .from('doctor_profiles')
      .select('full_name, clinic_email, specialization')
      .ilike('full_name', likeQuery)
      .limit(12),
  ]);

  const doctorCandidates: CareTeamSearchCandidate[] = (doctorResult.data || [])
    .filter((entry: any) => Boolean(entry.clinic_email))
    .map((entry: any) => ({
      name: entry.full_name,
      email: String(entry.clinic_email).toLowerCase(),
      roleHint: 'doctor',
      source: 'doctor_directory' as const,
      metadata: entry.specialization || 'Doctor',
    }));

  let inviteCandidates: CareTeamSearchCandidate[] = [];
  if (ownerUserId) {
    const inviteResult = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('created_by', ownerUserId)
      .order('created_at', { ascending: false })
      .limit(120);

    inviteCandidates = (inviteResult.data || [])
      .map((invite: any) => {
        const email = String(invite.invited_email || '').toLowerCase();
        const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
        const name = String(invite.invited_name || fallbackName || email).trim();

        return {
          name,
          email,
          roleHint: invite.role === 'doctor' ? 'doctor' : 'caregiver',
          source: 'recent_invites' as const,
          metadata: invite.role || 'Care team',
        };
      })
      .filter((candidate) => candidate.email)
      .filter((candidate) => {
        const nameMatch = candidate.name.toLowerCase().includes(normalized);
        const emailMatch = candidate.email.toLowerCase().includes(normalized);
        return nameMatch || emailMatch;
      });
  }

  const combined = [...doctorCandidates, ...inviteCandidates];
  const dedupedByEmail = new Map<string, CareTeamSearchCandidate>();

  for (const candidate of combined) {
    if (!dedupedByEmail.has(candidate.email)) {
      dedupedByEmail.set(candidate.email, candidate);
    }
  }

  return Array.from(dedupedByEmail.values()).slice(0, 12);
}

/**
 * Get incoming sharing invites for logged in user by email.
 * This is used by doctor/caregiver accounts to add shared babies to "My Patients".
 */
export async function getIncomingSharingInvites(
  status: 'pending' | 'accepted' | 'all' = 'all'
): Promise<FamilySharingInvite[]> {
  try {
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) return [];

    let query = supabase
      .from('family_sharing_invites')
      .select('*')
      .ilike('invited_email', userEmail)
      .order('created_at', { ascending: false });

    if (status === 'pending') {
      query = query.is('accepted_at', null);
    }

    if (status === 'accepted') {
      query = query.not('accepted_at', 'is', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((invite) => ({
      ...invite,
      status: invite.accepted_at ? 'accepted' : 'pending',
    }));
  } catch (err) {
    console.error('Error fetching incoming sharing invites:', err);
    return [];
  }
}

/**
 * Accept incoming invite by invite ID and add baby to recipient patient list.
 */
export async function acceptIncomingSharingInvite(inviteId: string): Promise<FamilySharingInvite | null> {
  try {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: userId || undefined,
      })
      .eq('id', inviteId)
      .is('accepted_at', null)
      .select()
      .single();

    if (error && /accepted_by/i.test(String(error.message || error.details || error.hint || ''))) {
      const retry = await supabase
        .from('family_sharing_invites')
        .update({
          accepted_at: new Date().toISOString(),
        })
        .eq('id', inviteId)
        .is('accepted_at', null)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return {
        ...retry.data,
        status: 'accepted',
      };
    }

    if (error) throw error;

    return {
      ...data,
      status: 'accepted',
    };
  } catch (err) {
    console.error('Error accepting incoming invite:', err);
    return null;
  }
}
