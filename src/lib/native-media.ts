import { Capacitor } from '@capacitor/core';

type NativeCameraBridge = {
  Capacitor: {
    isNativePlatform: () => boolean;
  };
  Camera: {
    takePhoto: (options: Record<string, unknown>) => Promise<any>;
    chooseFromGallery: (options: Record<string, unknown>) => Promise<{ results?: any[] }>;
    requestPermissions: (options?: { permissions?: Array<'camera' | 'photos'> }) => Promise<{
      camera: 'granted' | 'denied' | 'prompt' | 'limited';
      photos: 'granted' | 'denied' | 'prompt' | 'limited';
    }>;
  };
  CameraDirection: {
    Rear: string;
    Front: string;
  };
  MediaTypeSelection: {
    Photo: number;
  };
};

export interface CapturedPhotoAsset {
  file: File;
  previewUrl: string;
  format: string;
  source: 'camera' | 'library';
  width?: number;
  height?: number;
}

const CANCELLED_CAMERA_CODES = new Set(['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0020', 'OS-PLUG-CAMR-0013']);

const normalizeFormat = (format?: string | null, mimeType?: string | null): string => {
  const normalized = (format || mimeType?.split('/')[1] || 'jpeg').toLowerCase();
  if (normalized === 'jpg') {
    return 'jpeg';
  }
  if (normalized === 'heic' || normalized === 'heif') {
    return 'jpeg';
  }
  return normalized;
};

const getMimeTypeForFormat = (format: string): string => {
  if (format === 'jpg' || format === 'jpeg') {
    return 'image/jpeg';
  }
  if (format === 'png') {
    return 'image/png';
  }
  if (format === 'gif') {
    return 'image/gif';
  }
  if (format === 'webp') {
    return 'image/webp';
  }
  return `image/${format}`;
};

const parseResolution = (resolution?: string | null): { width?: number; height?: number } => {
  if (!resolution || !resolution.includes('x')) {
    return {};
  }

  const [width, height] = resolution.split('x').map((value) => Number.parseInt(value.trim(), 10));
  return {
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
  };
};

const ensureDataUrl = (value: string, mimeType: string): string =>
  value.startsWith('data:') ? value : `data:${mimeType};base64,${value}`;

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, payload] = dataUrl.split(',');
  const mimeMatch = meta.match(/^data:(.*?);base64$/i);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(payload || '');
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const isCameraCancellation = (error: unknown): boolean => {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code || '') : '';
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as any).message || '') : String(error || '');

  return CANCELLED_CAMERA_CODES.has(code) || /cancel/i.test(message);
};

const getBridge = async (): Promise<NativeCameraBridge | null> => {
  if (!isNativeAppRuntime()) {
    return null;
  }

  try {
    const cameraModule = await import('@capacitor/camera');
    const camera = cameraModule?.Camera || cameraModule?.default?.Camera;

    if (!camera || !Capacitor.isNativePlatform()) {
      return null;
    }

    return {
      Capacitor,
      Camera: camera,
      CameraDirection: cameraModule.CameraDirection,
      MediaTypeSelection: cameraModule.MediaTypeSelection,
    } as NativeCameraBridge;
  } catch {
    return null;
  }
};

const mediaResultToAsset = async (
  mediaResult: any,
  source: 'camera' | 'library',
  baseName: string,
): Promise<CapturedPhotoAsset> => {
  const format = normalizeFormat(mediaResult?.metadata?.format, mediaResult?.mimeType || null);
  const mimeType = getMimeTypeForFormat(format);
  const previewUrl = String(mediaResult?.webPath || mediaResult?.uri || '').trim();
  let blob: Blob | null = null;

  if (previewUrl) {
    const response = await fetch(previewUrl);
    blob = await response.blob();
  } else if (typeof mediaResult?.thumbnail === 'string' && mediaResult.thumbnail.trim()) {
    blob = dataUrlToBlob(ensureDataUrl(mediaResult.thumbnail.trim(), mimeType));
  }

  if (!blob) {
    throw new Error('Unable to read the selected photo.');
  }

  const file = new File([blob], `${baseName}-${Date.now()}.${format}`, {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  });
  const { width, height } = parseResolution(mediaResult?.metadata?.resolution);

  return {
    file,
    previewUrl: previewUrl || URL.createObjectURL(file),
    format,
    source,
    width,
    height,
  };
};

const requestCameraPermissions = async (
  bridge: NativeCameraBridge,
  permissions: Array<'camera' | 'photos'>,
): Promise<void> => {
  try {
    const result = await bridge.Camera.requestPermissions({ permissions });
    const denied = permissions.some((permission) => result?.[permission] === 'denied');
    if (denied) {
      throw new Error('Camera access was denied.');
    }
  } catch (error) {
    if (isCameraCancellation(error)) {
      throw error;
    }
    throw error;
  }
};

export const isNativeAppRuntime = (): boolean => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

export const captureNativePhoto = async (
  baseName = 'babylog-photo',
): Promise<CapturedPhotoAsset | null> => {
  const bridge = await getBridge();
  if (!bridge) {
    return null;
  }

  try {
    await requestCameraPermissions(bridge, ['camera', 'photos']);
    const mediaResult = await bridge.Camera.takePhoto({
      quality: 88,
      targetWidth: 1800,
      targetHeight: 1800,
      correctOrientation: true,
      cameraDirection: bridge.CameraDirection.Rear,
      includeMetadata: true,
      saveToGallery: false,
      editable: 'no',
    });

    return await mediaResultToAsset(mediaResult, 'camera', baseName);
  } catch (error) {
    if (isCameraCancellation(error)) {
      return null;
    }
    throw error;
  }
};

export const chooseNativePhoto = async (
  baseName = 'babylog-photo',
): Promise<CapturedPhotoAsset | null> => {
  const bridge = await getBridge();
  if (!bridge) {
    return null;
  }

  try {
    await requestCameraPermissions(bridge, ['photos']);
    const response = await bridge.Camera.chooseFromGallery({
      mediaType: bridge.MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      includeMetadata: true,
      editable: 'no',
    });
    const firstResult = response?.results?.[0];
    if (!firstResult) {
      return null;
    }

    return await mediaResultToAsset(firstResult, 'library', baseName);
  } catch (error) {
    if (isCameraCancellation(error)) {
      return null;
    }
    throw error;
  }
};
