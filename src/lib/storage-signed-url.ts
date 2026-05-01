import { supabase } from './supabase';

const normalizeFallbackUrl = (fallbackUrl?: string | null): string | null => {
  const normalized = String(fallbackUrl || '').trim();
  if (!normalized || normalized.startsWith('storage://')) {
    return null;
  }
  return normalized;
};

export async function createSignedStorageUrl(
  bucket: string,
  storageKey?: string | null,
  fallbackUrl?: string | null,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const safeStorageKey = String(storageKey || '').trim();
  const safeFallbackUrl = normalizeFallbackUrl(fallbackUrl);
  if (!safeStorageKey) {
    return safeFallbackUrl;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(safeStorageKey, expiresInSeconds);
  if (error) {
    console.warn(`Unable to create signed URL for ${bucket}/${safeStorageKey}:`, error.message);
    return safeFallbackUrl;
  }

  return data?.signedUrl || safeFallbackUrl;
}

export function buildStorageReference(bucket: string, storageKey?: string | null): string | null {
  const safeStorageKey = String(storageKey || '').trim();
  if (!safeStorageKey) {
    return null;
  }
  return `storage://${bucket}/${safeStorageKey}`;
}
