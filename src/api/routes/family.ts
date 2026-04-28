/**
 * Family Sharing & Permissions API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/family/invite
 * Invite family member
 */
router.post('/invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { email, role = 'caregiver' } = req.body;
    const userId = req.user?.id;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const { data: invite, error } = await supabase
      .from('family_invites')
      .insert({
        id: uuidv4(),
        inviter_id: userId,
        invited_email: email,
        role,
        status: 'pending',
        token: uuidv4(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Family member invited', 'FAMILY', { userId, email });

    res.json({ success: true, data: invite, message: 'Invitation sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

/**
 * GET /api/family/members
 * Get family members
 */
router.get('/members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', userId)
      .or(`inviter_id.eq.${userId},invited_user_id.eq.${userId}`);

    if (error) throw error;

    res.json({ success: true, data: members || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch family members' });
  }
});

/**
 * POST /api/family/accept-invite
 * Accept family invitation
 */
router.post('/accept-invite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    const { data: invite, error: fetchError } = await supabase
      .from('family_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !invite) {
      return res.status(404).json({ success: false, error: 'Invite not found or expired' });
    }

    // Accept invitation
    const { error: updateError } = await supabase
      .from('family_invites')
      .update({ status: 'accepted' })
      .eq('token', token);

    if (updateError) throw updateError;

    // Add to family members
    const { error: addError } = await supabase.from('family_members').insert({
      id: uuidv4(),
      inviter_id: invite.inviter_id,
      invited_user_id: userId,
      role: invite.role,
      accepted_at: new Date().toISOString(),
    });

    if (addError) throw addError;

    logger.info('Family invitation accepted', 'FAMILY', { userId });

    res.json({ success: true, message: 'Invitation accepted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to accept invitation' });
  }
});

export default router;
