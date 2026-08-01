import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Large emulator payloads live on E:; tools stay on C:. */
export const DEFAULT_ANDROID_AVD_HOME = 'E:\\Android\\avd';
export const DEFAULT_E_SYSTEM_IMAGES = 'E:\\Android\\system-images';

const cDriveSdkRoot = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');

const readSavedEnv = () => {
  try {
    const configPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'android-sdk.env.json');
    if (!existsSync(configPath)) {
      return null;
    }
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
};

export function resolveAndroidSdkRoot() {
  const saved = readSavedEnv();
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    saved?.ANDROID_HOME,
    saved?.ANDROID_SDK_ROOT,
    cDriveSdkRoot,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = path.normalize(String(candidate));
    if (existsSync(path.join(normalized, 'platform-tools', 'adb.exe'))) {
      return normalized;
    }
  }

  return path.normalize(String(cDriveSdkRoot));
}

export function resolveAndroidAvdHome() {
  const saved = readSavedEnv();
  return path.normalize(
    process.env.ANDROID_AVD_HOME ||
      saved?.ANDROID_AVD_HOME ||
      DEFAULT_ANDROID_AVD_HOME,
  );
}

export function resolveSystemImagesRoot() {
  const saved = readSavedEnv();
  const candidate =
    saved?.SYSTEM_IMAGES_ON_E ||
    DEFAULT_E_SYSTEM_IMAGES;
  return path.normalize(candidate);
}

export function applyAndroidSdkEnv() {
  const sdkRoot = resolveAndroidSdkRoot();
  const avdHome = resolveAndroidAvdHome();

  process.env.ANDROID_HOME = sdkRoot;
  process.env.ANDROID_SDK_ROOT = sdkRoot;
  process.env.ANDROID_AVD_HOME = avdHome;

  return { sdkRoot, avdHome };
}

export function getAndroidToolPaths(sdkRoot = resolveAndroidSdkRoot()) {
  return {
    sdkRoot,
    adb: path.join(sdkRoot, 'platform-tools', 'adb.exe'),
    emulator: path.join(sdkRoot, 'emulator', 'emulator.exe'),
    sdkmanager: path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat'),
    avdmanager: path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'avdmanager.bat'),
  };
}

export function getSystemImageMarker(
  apiLevel = 34,
  variant = 'google_apis',
  abi = 'x86_64',
) {
  return path.join(resolveSystemImagesRoot(), `android-${apiLevel}`, variant, abi, 'system.img');
}
