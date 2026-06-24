import { getApiBaseUrl } from './api-base-url';
import { createShareInviteEmail, isShareInviteEmail } from './app-domain';
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

export interface CaregiverShiftNote {
  id: string;
  baby_id: string;
  author_id?: string;
  note: string;
  status: 'draft' | 'saved';
  created_at: string;
  updated_at: string;
}

const isLocalBrowserHost = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const shouldAllowDirectSupabaseFallback = (): boolean =>
  typeof window === 'undefined' || isLocalBrowserHost();

const getActiveSessionAccessToken = async (): Promise<string | null> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
    error,
  } = await auth.getSession();

  if (error || !session?.access_token) {
    return null;
  }

  return session.access_token;
};

const callFamilyApi = async <TPayload>(
  path: string,
  init: RequestInit,
): Promise<TPayload | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = await getActiveSessionAccessToken();
  if (!accessToken) {
    return null;
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 404 || response.status === 405) {
    return null;
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Family API request failed with status ${response.status}`,
    );
  }

  return payload as TPayload;
};

const mapInvite = (invite: any): FamilySharingInvite => ({
  ...invite,
  status: invite?.accepted_at ? 'accepted' : 'pending',
});

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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: FamilySharingInvite;
      }>('/family/invite', {
        method: 'POST',
        body: JSON.stringify({
          babyId,
          email: invitedEmail,
          role,
          invitedName: options?.invitedName,
          babyNameSnapshot: options?.babyNameSnapshot,
          babyPhotoUrlSnapshot: options?.babyPhotoUrlSnapshot,
        }),
      });

      if (backendResponse?.data) {
        if (!options?.isPublicLink) {
          await sendInviteEmail(invitedEmail, babyId, role, backendResponse.data.invite_token);
        }

        return mapInvite(backendResponse.data);
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    } catch (backendError) {
      console.warn('Backend family invite request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    }

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

    return mapInvite(data);
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
  _babyId: string,
  _role: string,
  token: string
): Promise<void> {
  try {
    const auth = supabase.auth as any;
    const {
      data: { session },
    } = await auth.getSession();
    const accessToken: string | undefined = session?.access_token;

    await fetch(`${getApiBaseUrl()}/email/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        invite_token: token,
        recipient_email: email,
        view: 'patients',
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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: FamilySharingInvite;
      }>('/family/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token: inviteToken }),
      });

      if (backendResponse?.data) {
        return mapInvite(backendResponse.data);
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    } catch (backendError) {
      console.warn('Backend accept invite request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    }

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

    return mapInvite(data);
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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: CaregiverSession;
      }>('/family/caregiver-sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          babyId,
          accessType,
          durationMinutes,
          pinCodeOverride,
        }),
      });

      if (backendResponse?.data) {
        return backendResponse.data;
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    } catch (backendError) {
      console.warn('Backend start caregiver session request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    }

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
    try {
      const backendResponse = await callFamilyApi<{ success: boolean }>(
        `/family/caregiver-sessions/${encodeURIComponent(sessionId)}/end`,
        {
          method: 'POST',
        },
      );

      if (backendResponse) {
        return true;
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return false;
      }
    } catch (backendError) {
      console.warn('Backend end caregiver session request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return false;
      }
    }

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
    try {
      const backendResponse = await callFamilyApi<{ success: boolean }>('/family/activity-log', {
        method: 'POST',
        body: JSON.stringify({
          babyId,
          action,
          details,
        }),
      });

      if (backendResponse) {
        return true;
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return false;
      }
    } catch (backendError) {
      console.warn('Backend sharing activity log request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return false;
      }
    }

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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: SharingActivityLog[];
      }>(`/family/activity-log?babyId=${encodeURIComponent(babyId)}&limit=${encodeURIComponent(String(limit))}`, {
        method: 'GET',
      });

      if (backendResponse?.data) {
        return backendResponse.data;
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return [];
      }
    } catch (backendError) {
      console.warn('Backend sharing activity fetch failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return [];
      }
    }

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

export async function getCaregiverShiftNote(babyId: string): Promise<CaregiverShiftNote | null> {
  try {
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: CaregiverShiftNote | null;
      }>(`/family/shift-note?babyId=${encodeURIComponent(babyId)}`, {
        method: 'GET',
      });

      if (backendResponse) {
        return backendResponse.data || null;
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    } catch (backendError) {
      console.warn('Backend caregiver shift note fetch failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    }

    const { data, error } = await supabase
      .from('caregiver_shift_notes')
      .select('*')
      .eq('baby_id', babyId)
      .eq('status', 'saved')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('Error fetching caregiver shift note:', err);
    return null;
  }
}

export async function saveCaregiverShiftNote(
  babyId: string,
  note: string,
): Promise<CaregiverShiftNote | null> {
  try {
    const backendResponse = await callFamilyApi<{
      success: boolean;
      data?: CaregiverShiftNote;
    }>('/family/shift-note', {
      method: 'PUT',
      body: JSON.stringify({ babyId, note }),
    });

    if (backendResponse?.data) {
      return backendResponse.data;
    }

    if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
      return null;
    }

    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('caregiver_shift_notes')
      .insert({
        baby_id: babyId,
        author_id: userId,
        note,
        status: 'saved',
      })
      .select()
      .single();

    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('Error saving caregiver shift note:', err);
    return null;
  }
}

/**
 * Get all family members for a baby
 */
export async function getFamilyMembers(babyId: string): Promise<FamilySharingInvite[]> {
  try {
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: FamilySharingInvite[];
      }>(`/family/members?babyId=${encodeURIComponent(babyId)}`, {
        method: 'GET',
      });

      if (backendResponse?.data) {
        return backendResponse.data.map(mapInvite);
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return [];
      }
    } catch (backendError) {
      console.warn('Backend family members request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return [];
      }
    }

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .select('*')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapInvite);
  } catch (err) {
    console.error('Error fetching family members:', err);
    return [];
  }
}

export function buildInviteLink(inviteToken: string, view: 'patients' | 'family-sharing' = 'patients') {
  if (typeof window === 'undefined') {
    return `/`;
  }

  const inviteUrl = new URL('/login', window.location.origin);
  inviteUrl.searchParams.set('invite', inviteToken);
  inviteUrl.searchParams.set('view', view);

  return inviteUrl.toString();
}

const isSyntheticPublicInviteEmail = (email: string): boolean => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;

  if (/^public-link\+.+@budandbloom\.local$/.test(normalized)) return true;
  if (isShareInviteEmail(normalized)) return true;

  return false;
};

const generatePublicInviteEmail = (): string => {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(16).slice(2, 10)}`;

  return createShareInviteEmail(unique);
};

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
  try {
    const backendResponse = await callFamilyApi<{
      success: boolean;
      data?: PublicInviteLink;
    }>('/family/public-invite', {
      method: 'POST',
      body: JSON.stringify({
        babyId,
        role,
        invitedName: options?.invitedName,
        babyNameSnapshot: options?.babyNameSnapshot,
        babyPhotoUrlSnapshot: options?.babyPhotoUrlSnapshot,
        view: options?.view || 'patients',
      }),
    });

    if (backendResponse?.data) {
      return {
        invite: mapInvite(backendResponse.data.invite),
        inviteLink: backendResponse.data.inviteLink,
      };
    }

    if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
      return null;
    }
  } catch (backendError) {
    console.warn('Backend public family invite request failed.', backendError);
    if (!shouldAllowDirectSupabaseFallback()) {
      return null;
    }
  }

  const publicInviteEmail = generatePublicInviteEmail();

  const invite = await sendFamilySharingInvite(babyId, publicInviteEmail, role, createdBy, {
    invitedName: options?.invitedName,
    isPublicLink: true,
    babyNameSnapshot: options?.babyNameSnapshot,
    babyPhotoUrlSnapshot: options?.babyPhotoUrlSnapshot,
  });

  if (!invite) return null;

  return {
    invite: mapInvite(invite),
    inviteLink: buildInviteLink(invite.invite_token, options?.view || 'patients'),
  };
}

/**
 * Revoke family member access
 */
export async function revokeFamilyMemberAccess(inviteId: string): Promise<boolean> {
  try {
    try {
      const backendResponse = await callFamilyApi<{ success: boolean }>(
        `/family/invites/${encodeURIComponent(inviteId)}`,
        {
          method: 'DELETE',
        },
      );

      if (backendResponse) {
        return true;
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return false;
      }
    } catch (backendError) {
      console.warn('Backend revoke family invite request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return false;
      }
    }

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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: FamilySharingInvite;
      }>(`/family/invites/${encodeURIComponent(inviteId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      if (backendResponse?.data) {
        return mapInvite(backendResponse.data);
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    } catch (backendError) {
      console.warn('Backend update family role request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    }

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .update({ role: newRole })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) throw error;
    return mapInvite(data);
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

  try {
    const backendResponse = await callFamilyApi<{
      success: boolean;
      data?: CareTeamSearchCandidate[];
    }>(`/family/search-candidates?query=${encodeURIComponent(normalized)}`, {
      method: 'GET',
    });

    if (backendResponse?.data) {
      return backendResponse.data;
    }

    if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
      return [];
    }
  } catch (backendError) {
    console.warn('Backend care-team candidate search failed.', backendError);
    if (!shouldAllowDirectSupabaseFallback()) {
      return [];
    }
  }

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
      .filter((invite: any) => !invite?.is_public_link)
      .filter((invite: any) => !isSyntheticPublicInviteEmail(String(invite?.invited_email || '')))
      .map((invite: any) => {
        const email = String(invite.invited_email || '').toLowerCase();
        const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
        const name = String(invite.invited_name || fallbackName || email).trim();

        return {
          name,
          email,
          roleHint: (invite.role === 'doctor' ? 'doctor' : 'caregiver') as
            | 'doctor'
            | 'caregiver'
            | 'viewer',
          source: 'recent_invites' as const,
          metadata: invite.role || 'Care team',
        };
      })
      .filter((candidate: any) => candidate.email)
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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: FamilySharingInvite[];
      }>(`/family/incoming?status=${encodeURIComponent(status)}`, {
        method: 'GET',
      });

      if (backendResponse?.data) {
        return backendResponse.data.map(mapInvite);
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return [];
      }
    } catch (backendError) {
      console.warn('Backend incoming family invites request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return [];
      }
    }

    const userEmail = await getCurrentUserEmail();
    const userId = await getCurrentUserId();

    if (!userEmail && !userId) return [];

    const queries: any[] = [];

    if (userEmail) {
      let emailQuery = supabase
        .from('family_sharing_invites')
        .select('*')
        .ilike('invited_email', userEmail)
        .order('created_at', { ascending: false });

      if (status === 'pending') {
        emailQuery = emailQuery.is('accepted_at', null);
      }

      if (status === 'accepted') {
        emailQuery = emailQuery.not('accepted_at', 'is', null);
      }

      queries.push(emailQuery);
    }

    // Public invite links and accepted shares may not match invited_email,
    // so include invites accepted by the current account as well.
    if (userId && status !== 'pending') {
      let acceptedByQuery = supabase
        .from('family_sharing_invites')
        .select('*')
        .eq('accepted_by', userId)
        .order('created_at', { ascending: false });

      if (status === 'accepted') {
        acceptedByQuery = acceptedByQuery.not('accepted_at', 'is', null);
      }

      if (status === 'all') {
        acceptedByQuery = acceptedByQuery.not('accepted_at', 'is', null);
      }

      queries.push(acceptedByQuery);
    }

    const results = await Promise.all(queries);

    const combinedRows: any[] = [];
    for (const result of results) {
      if (result.error) {
        console.error('Error fetching incoming sharing invites:', result.error);
        continue;
      }
      combinedRows.push(...(result.data || []));
    }

    const dedupedById = new Map<string, any>();
    for (const invite of combinedRows) {
      dedupedById.set(invite.id, invite);
    }

    const dedupedRows = Array.from(dedupedById.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return dedupedRows.map(mapInvite);
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
    try {
      const backendResponse = await callFamilyApi<{
        success: boolean;
        data?: FamilySharingInvite;
      }>(`/family/invites/${encodeURIComponent(inviteId)}/accept`, {
        method: 'POST',
      });

      if (backendResponse?.data) {
        return mapInvite(backendResponse.data);
      }

      if (backendResponse === null && !shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    } catch (backendError) {
      console.warn('Backend accept incoming invite request failed.', backendError);
      if (!shouldAllowDirectSupabaseFallback()) {
        return null;
      }
    }

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
      return mapInvite(retry.data);
    }

    if (error) throw error;

    return mapInvite(data);
  } catch (err) {
    console.error('Error accepting incoming invite:', err);
    return null;
  }
}
