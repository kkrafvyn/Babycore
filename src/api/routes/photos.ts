/**
 * Photo Management API Routes
 */

import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { supabase } from '../utils/supabase.js';
import {
  buildStorageReference,
  createSignedStorageUrl,
  ensureBabyAccess,
  ensureRecordBabyAccess,
} from '../utils/baby-access.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const toSignedPhoto = async (photo: any) => {
  const signedUrl = await createSignedStorageUrl('baby-photos', photo?.storage_key);
  return {
    ...photo,
    photo_url: signedUrl || photo?.photo_url || null,
  };
};

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

    if (!(await ensureBabyAccess(req, res, String(babyId), { write: true }))) return;

    // Upload to Supabase Storage
    const fileName = `${babyId}/${Date.now()}-${uuidv4()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('baby-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) throw uploadError;

    // Save to database
    const { data: photo, error: dbError } = await supabase
      .from('baby_photos')
      .insert({
        id: uuidv4(),
        baby_id: babyId,
        user_id: req.user?.id,
        photo_url: buildStorageReference('baby-photos', fileName),
        storage_key: fileName,
        caption,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    logger.info('Photo uploaded', 'PHOTOS', { userId: req.user?.id, babyId });

    res.status(201).json({ success: true, data: await toSignedPhoto(photo) });
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

    if (!(await ensureBabyAccess(req, res, String(babyId)))) return;

    const { data: photos, error, count } = await supabase
      .from('baby_photos')
      .select('*', { count: 'exact' })
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    const signedPhotos = await Promise.all((photos || []).map((photo: any) => toSignedPhoto(photo)));
    res.json({ success: true, data: signedPhotos, total: count });
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

    const photo = await ensureRecordBabyAccess<{
      id: string;
      baby_id: string;
      storage_key?: string | null;
    }>(req, res, {
      table: 'baby_photos',
      idValue: photoId,
      select: 'id,baby_id,storage_key',
      write: true,
      missingMessage: 'Photo not found',
    });
    if (!photo) return;

    if (photo.storage_key) {
      const { error: storageError } = await supabase.storage.from('baby-photos').remove([photo.storage_key]);
      if (storageError) {
        throw storageError;
      }
    }

    const { error } = await supabase.from('baby_photos').delete().eq('id', photoId);

    if (error) throw error;

    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete photo' });
  }
});

export default router;
