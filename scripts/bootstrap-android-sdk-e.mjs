import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cDriveSdk = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const eAndroidRoot = 'E:\\Android';
const eSystemImages = path.join(eAndroidRoot, 'system-images');
const eAvdHome = path.join(eAndroidRoot, 'avd');
const cSystemImages = path.join(cDriveSdk, 'system-images');
const systemImageMarker = path.join(eSystemImages, 'android-34', 'google_apis', 'x86_64', 'system.img');
const isWindows = process.platform === 'win32';

function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: isWindows && (command.endsWith('.bat') || command.endsWith('.cmd') || command === 'cmd'),
    env: {
      ...process.env,
      ANDROID_HOME: cDriveSdk,
      ANDROID_SDK_ROOT: cDriveSdk,
      ANDROID_AVD_HOME: eAvdHome,
    },
    ...options,
  });
}

function removeEDriveSdkCopy() {
  const eSdkCopy = path.join(eAndroidRoot, 'Sdk');
  if (!existsSync(eSdkCopy)) {
    return;
  }

  console.log('Removing duplicate SDK copy on E: to free space...');
  rmSync(eSdkCopy, { recursive: true, force: true });
}

function ensureSystemImagesJunction() {
  mkdirSync(eAndroidRoot, { recursive: true });
  mkdirSync(eAvdHome, { recursive: true });
  mkdirSync(eSystemImages, { recursive: true });

  if (existsSync(cSystemImages)) {
    const stats = spawnSync('cmd', ['/c', 'dir', cSystemImages], { encoding: 'utf8' });
    const isReparse = /SYMLINK|JUNCTION|<JUNCTION>/i.test(stats.stdout || '');
    if (!isReparse) {
      console.log('Moving any existing C: system-images aside...');
      const backup = `${cSystemImages}.backup-${Date.now()}`;
      runCapture('cmd', ['/c', 'move', cSystemImages, backup]);
    } else {
      rmSync(cSystemImages, { recursive: true, force: true });
    }
  }

  if (!existsSync(cSystemImages)) {
    console.log('Linking C: SDK system-images -> E: (saves ~1 GB on E:)');
    symlinkSync(eSystemImages, cSystemImages, 'junction');
  }
}

function installSystemImage() {
  if (existsSync(systemImageMarker)) {
    console.log('Android 34 system image already installed on E:.');
    return;
  }

  const sdkmanager = path.join(cDriveSdk, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat');
  if (!existsSync(sdkmanager)) {
    console.error(`sdkmanager not found at ${sdkmanager}`);
    process.exit(1);
  }

  console.log('Installing Android 34 system image (stored on E: via junction)...');
  runCapture(sdkmanager, [`--sdk_root=${cDriveSdk}`, '--licenses'], { input: `${'y\n'.repeat(40)}` });
  const install = runCapture(sdkmanager, [
    `--sdk_root=${cDriveSdk}`,
    'system-images;android-34;google_apis;x86_64',
  ]);

  if (!existsSync(systemImageMarker)) {
    console.error(install.stderr || install.stdout || 'System image install failed.');
    process.exit(install.status ?? 1);
  }
}

function writeConfig() {
  writeFileSync(
    path.join(rootDir, 'android', 'local.properties'),
    `sdk.dir=${cDriveSdk.replace(/\\/g, '\\\\')}\n`,
    'utf8',
  );

  writeFileSync(
    path.join(rootDir, 'scripts', 'android-sdk.env.json'),
    JSON.stringify(
      {
        ANDROID_HOME: cDriveSdk,
        ANDROID_SDK_ROOT: cDriveSdk,
        ANDROID_AVD_HOME: eAvdHome,
        SYSTEM_IMAGES_ON_E: eSystemImages,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

removeEDriveSdkCopy();
ensureSystemImagesJunction();
installSystemImage();
writeConfig();
console.log('\nReady.');
console.log(`  Tools SDK (C:): ${cDriveSdk}`);
console.log(`  System images (E:): ${eSystemImages}`);
console.log(`  AVDs (E:): ${eAvdHome}`);
