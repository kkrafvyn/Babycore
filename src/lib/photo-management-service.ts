import { supabase } from './supabase';

export interface BabyPhoto {
  id: string;
  baby_id: string;
  url: string;
  storage_key?: string;
  description?: string;
  photo_date: string;
  age_days?: number;
  tags?: string[];
  is_monthly_milestone: boolean;
  created_at: string;
}

export interface PhotoCollage {
  id: string;
  baby_id: string;
  month: string; // YYYY-MM
  collage_url?: string;
  photos: string[];
}

/**
 * Upload baby photo to cloud storage
 */
export async function uploadBabyPhoto(
  babyId: string,
  file: File,
  photoDate: string,
  description?: string,
  tags?: string[]
): Promise<BabyPhoto | null> {
  try {
    // Upload to Supabase Storage
    const fileName = `${babyId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('baby-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('baby-photos')
      .getPublicUrl(fileName);

    // Calculate age in days
    const birthDate = await getBabyBirthDate(babyId);
    const ageDays = birthDate
      ? Math.floor((new Date(photoDate).getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    // Save metadata to database
    const { data, error } = await supabase
      .from('baby_photos')
      .insert({
        baby_id: babyId,
        url: publicUrl.publicUrl,
        storage_key: fileName,
        description,
        photo_date: photoDate,
        age_days: ageDays,
        tags: tags || [],
        is_monthly_milestone: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error uploading photo:', err);
    return null;
  }
}

/**
 * Get baby's birth date from database
 */
async function getBabyBirthDate(babyId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('babies')
      .select('date_of_birth')
      .eq('id', babyId)
      .single();

    if (error) throw error;
    return data?.date_of_birth || null;
  } catch (err) {
    console.error('Error getting baby birth date:', err);
    return null;
  }
}

/**
 * Get all photos for a baby
 */
export async function getBabyPhotos(
  babyId: string,
  limit = 50,
  offset = 0
): Promise<BabyPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('baby_photos')
      .select('*')
      .eq('baby_id', babyId)
      .order('photo_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching baby photos:', err);
    return [];
  }
}

/**
 * Get photos for a specific month (for collage)
 */
export async function getMonthlyPhotos(
  babyId: string,
  month: string // YYYY-MM
): Promise<BabyPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('baby_photos')
      .select('*')
      .eq('baby_id', babyId)
      .like('photo_date', `${month}%`)
      .order('photo_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching monthly photos:', err);
    return [];
  }
}

/**
 * Mark photo as monthly milestone
 */
export async function markAsMonthlyMilestone(
  photoId: string,
  isMilestone: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('baby_photos')
      .update({ is_monthly_milestone: isMilestone })
      .eq('id', photoId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error marking monthly milestone:', err);
    return false;
  }
}

/**
 * Delete a photo from storage and database
 */
export async function deletePhoto(photoId: string, storageKey: string): Promise<boolean> {
  try {
    // Delete from storage
    if (storageKey) {
      await supabase.storage.from('baby-photos').remove([storageKey]);
    }

    // Delete from database
    const { error } = await supabase.from('baby_photos').delete().eq('id', photoId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting photo:', err);
    return false;
  }
}

/**
 * Generate monthly collage (would be done server-side with image library)
 */
export async function generateMonthlyCollage(
  babyId: string,
  month: string
): Promise<PhotoCollage | null> {
  try {
    // Get photos for the month
    const photos = await getMonthlyPhotos(babyId, month);
    if (photos.length === 0) return null;

    // TODO: Use sharp or similar library to generate collage
    // For now, just create database record with photo URLs
    const { data, error } = await supabase
      .from('photo_collages')
      .insert({
        baby_id: babyId,
        month,
        photos: photos.map((p) => p.id),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error generating collage:', err);
    return null;
  }
}

/**
 * Get collage for a month
 */
export async function getMonthlyCollage(
  babyId: string,
  month: string
): Promise<PhotoCollage | null> {
  try {
    const { data, error } = await supabase
      .from('photo_collages')
      .select('*')
      .eq('baby_id', babyId)
      .eq('month', month)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching collage:', err);
    return null;
  }
}
