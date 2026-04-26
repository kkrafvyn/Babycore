import { supabase } from './supabase';

export type FamilySharingRole = 'owner' | 'editor' | 'viewer' | 'caregiver' | 'doctor';

export interface FamilySharingInvite {
  id: string;
  baby_id: string;
  invited_email: string;
  role: FamilySharingRole;
  invite_token: string;
  expires_at?: string;
  accepted_at?: string;
  created_by: string;
  created_at: string;
  baby_name_snapshot?: string;
  baby_photo_url_snapshot?: string;
  status?: 'accepted' | 'pending';
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
    babyNameSnapshot?: string;
    babyPhotoUrlSnapshot?: string;
  },
): Promise<FamilySharingInvite | null> {
  try {
    const inviteToken = `${babyId}_${Math.random().toString(36).substring(7)}`;

    // 14 days expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .insert({
        baby_id: babyId,
        invited_email: invitedEmail,
        role,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy,
        baby_name_snapshot: options?.babyNameSnapshot,
        baby_photo_url_snapshot: options?.babyPhotoUrlSnapshot,
      })
      .select()
      .single();

    if (error) throw error;

    // Send email invitation (backend service)
    await sendInviteEmail(invitedEmail, babyId, role, inviteToken);

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

    const { data, error } = await supabase
      .from('family_sharing_invites')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
      .is('accepted_at', null)
      .select()
      .single();

    if (error) throw error;

    // Link user to baby (would need a junction table)
    // This depends on your user-baby relationship model

    return data;
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
    const { data, error } = await supabase
      .from('family_sharing_invites')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inviteId)
      .is('accepted_at', null)
      .select()
      .single();

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
