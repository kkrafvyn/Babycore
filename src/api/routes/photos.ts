/**
 * Photo Management API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/photos/upload
 * Upload baby photo
 */
router.post('/upload', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, caption } = req.body;

    if (!babyId || !req.file) {
      return res.status(400).json({ success: false, error: 'Baby ID and file required' });
    }

    // Upload to Supabase Storage
    const fileName = `${babyId}/${Date.now()}-${uuidv4()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('baby-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from('baby-photos').getPublicUrl(fileName);

    // Save to database
    const { data: photo, error: dbError } = await supabase
      .from('baby_photos')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        photo_url: publicUrl.publicUrl,
        caption,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    logger.info('Photo uploaded', 'PHOTOS', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: photo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to upload photo' });
  }
});

/**
 * GET /api/photos/timeline
 * Get photo timeline
 */
router.get('/timeline', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { babyId, limit = 20, offset = 0 } = req.query;

    if (!babyId) {
      return res.status(400).json({ success: false, error: 'Baby ID required' });
    }

    const { data: photos, error, count } = await supabase
      .from('baby_photos')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, data: photos, total: count });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch photos' });
  }
});

/**
 * DELETE /api/photos/:photoId
 * Delete photo
 */
router.delete('/:photoId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;

    const { error } = await supabase.from('baby_photos').delete().eq('id', photoId);

    if (error) throw error;

    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete photo' });
  }
});

export default router;
