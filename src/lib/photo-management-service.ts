import { getBaby as getStoredBaby } from './supabase-storage';
import { supabase } from './supabase';
import { buildStorageReference, createSignedStorageUrl } from './storage-signed-url';

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

type CollageTile = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const toDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const hydratePhoto = async (photo: BabyPhoto): Promise<BabyPhoto> => ({
  ...photo,
  url: (await createSignedStorageUrl('baby-photos', photo.storage_key, photo.url)) || photo.url,
});

const getTileLayout = (count: number): CollageTile[] => {
  if (count <= 1) {
    return [{ x: 0, y: 0, width: 1200, height: 1200 }];
  }

  if (count === 2) {
    return [
      { x: 0, y: 0, width: 600, height: 1200 },
      { x: 600, y: 0, width: 600, height: 1200 },
    ];
  }

  if (count === 3) {
    return [
      { x: 0, y: 0, width: 1200, height: 600 },
      { x: 0, y: 600, width: 600, height: 600 },
      { x: 600, y: 600, width: 600, height: 600 },
    ];
  }

  return [
    { x: 0, y: 0, width: 600, height: 600 },
    { x: 600, y: 0, width: 600, height: 600 },
    { x: 0, y: 600, width: 600, height: 600 },
    { x: 600, y: 600, width: 600, height: 600 },
  ];
};

const buildCollageSvg = (photos: BabyPhoto[]): string => {
  const selected = photos.slice(0, 4);
  const tiles = getTileLayout(selected.length);

  const imageMarkup = selected
    .map((photo, index) => {
      const tile = tiles[index];
      const safeUrl = escapeXml(photo.url);
      const clipId = `clip-${index}`;

      return `
        <clipPath id="${clipId}">
          <rect x="${tile.x}" y="${tile.y}" width="${tile.width}" height="${tile.height}" rx="36" ry="36" />
        </clipPath>
        <image
          href="${safeUrl}"
          x="${tile.x}"
          y="${tile.y}"
          width="${tile.width}"
          height="${tile.height}"
          preserveAspectRatio="xMidYMid slice"
          clip-path="url(#${clipId})"
        />
      `;
    })
    .join('\n');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7f9ff" />
          <stop offset="100%" stop-color="#edf2ff" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" fill="url(#bg)" rx="48" ry="48" />
      ${imageMarkup}
    </svg>
  `.trim();
};

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
        url: buildStorageReference('baby-photos', fileName),
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
    const storedBaby = await getStoredBaby(babyId);
    if (storedBaby?.dateOfBirth) {
      return storedBaby.dateOfBirth;
    }

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
    return await Promise.all(((data || []) as BabyPhoto[]).map((photo) => hydratePhoto(photo)));
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
    return await Promise.all(((data || []) as BabyPhoto[]).map((photo) => hydratePhoto(photo)));
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
 * Generate a monthly collage locally so the feature works without a separate image API.
 */
export async function generateMonthlyCollage(
  babyId: string,
  month: string
): Promise<PhotoCollage | null> {
  try {
    // Get photos for the month
    const photos = await getMonthlyPhotos(babyId, month);
    if (photos.length === 0) return null;

    const collageSvg = buildCollageSvg(photos);
    const collageUrl = toDataUrl(collageSvg);
    const collagePayload = {
      baby_id: babyId,
      month,
      photos: photos.map((p) => p.id),
      collage_url: collageUrl,
    };

    let { data, error } = await supabase
      .from('photo_collages')
      .upsert(collagePayload, { onConflict: 'baby_id,month' })
      .select()
      .single();

    if (error && /there is no unique|on conflict/i.test(String(error.message || error.details || ''))) {
      const fallback = await supabase
        .from('photo_collages')
        .insert(collagePayload)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

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
