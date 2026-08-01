import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAndroidSdkEnv, getAndroidToolPaths, getSystemImageMarker, resolveSystemImagesRoot } from './android-sdk.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sdkRoot, avdHome } = applyAndroidSdkEnv();
const { adb, emulator, sdkmanager, avdmanager } = getAndroidToolPaths(sdkRoot);
const avdName = process.env.CRADLYN_AVD_NAME || 'Cradlyn_Emulator';
const systemImage = 'system-images;android-34;google_apis;x86_64';
const systemImageReadyMarker = getSystemImageMarker();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const isWindows = process.platform === 'win32';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindows && command.endsWith('.bat'),
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: isWindows && command.endsWith('.bat'),
    ...options,
  });
}

function ensureSdkTools() {
  if (!existsSync(sdkmanager)) {
    console.error(`sdkmanager not found at ${sdkmanager}`);
    console.error('Install Android Studio or Android SDK command-line tools first.');
    process.exit(1);
  }
}

function acceptLicenses() {
  if (existsSync(systemImageReadyMarker)) {
    console.log('Skipping license prompt (SDK packages already installed).');
    return;
  }

  console.log('Accepting Android SDK licenses (non-interactive)...');
  const child = runCapture(sdkmanager, ['--licenses'], {
    input: `${'y\n'.repeat(40)}`,
  });
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  if (child.status !== 0 && !/All SDK package licenses accepted/i.test(output)) {
    console.error(output.trim() || 'Failed to accept SDK licenses.');
    process.exit(child.status ?? 1);
  }
}

function ensureSystemImage() {
  if (existsSync(systemImageReadyMarker)) {
    console.log('System image already installed.');
    return;
  }

  try {
    const drive = path.parse(resolveSystemImagesRoot()).root || 'E:\\';
    const stats = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-PSDrive ${drive[0]}).Free`,
    ], { encoding: 'utf8' });
    const freeBytes = Number((stats.stdout || '').trim());
    const minBytes = 2 * 1024 * 1024 * 1024;
    if (Number.isFinite(freeBytes) && freeBytes < minBytes) {
      console.error(
        `Not enough free disk space on ${drive} (need ~2 GB, have ~${Math.round(freeBytes / (1024 ** 3))} GB).`,
      );
      console.error('Free space on E:, then re-run run-emulator-test.bat.');
      process.exit(1);
    }
  } catch {
    // Ignore disk check failures and let sdkmanager report its own error.
  }

  console.log('Installing Android 34 system image (this can take a few minutes)...');
  run(sdkmanager, [systemImage]);
}

function listAvds() {
  const result = runCapture(avdmanager, ['list', 'avd']);
  return result.stdout || '';
}

function ensureAvd() {
  const avds = listAvds();
  if (avds.includes(`Name: ${avdName}`)) {
    console.log(`AVD "${avdName}" already exists.`);
    return;
  }

  console.log(`Creating AVD "${avdName}"...`);
  const create = runCapture(avdmanager, [
    'create',
    'avd',
    '-n',
    avdName,
    '-k',
    systemImage,
    '-d',
    'pixel_6',
    '--force',
  ], {
    input: 'no\n',
  });

  if (create.status !== 0) {
    console.error(create.stdout || create.stderr || 'Failed to create AVD.');
    process.exit(create.status ?? 1);
  }
}

function getConnectedDevices() {
  const devices = runCapture(adb, ['devices']);
  return (devices.stdout || '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('\tdevice'));
}

function isEmulatorRunning() {
  const devices = getConnectedDevices();
  return devices.some((line) => line.startsWith('emulator-'));
}

async function waitForBoot(timeoutMs = 240_000) {
  console.log('Waiting for emulator to finish booting...');
  const started = Date.now();

  runCapture(adb, ['wait-for-device']);

  while (Date.now() - started < timeoutMs) {
    const boot = runCapture(adb, ['shell', 'getprop', 'sys.boot_completed']);
    if ((boot.stdout || '').trim() === '1') {
      const anim = runCapture(adb, ['shell', 'getprop', 'service.bootanim.exit']);
      if ((anim.stdout || '').trim() === '1') {
        console.log('Emulator is ready.');
        return;
      }
    }
    await sleep(2000);
  }

  console.error('Emulator boot timed out. Try closing other emulators and run again.');
  process.exit(1);
}

async function startEmulator() {
  if (!existsSync(emulator)) {
    console.error(`Emulator binary not found at ${emulator}`);
    process.exit(1);
  }

  if (isEmulatorRunning()) {
    console.log('Emulator already running.');
    return;
  }

  console.log(`Starting emulator "${avdName}"...`);

  spawn(emulator, ['-avd', avdName, '-no-snapshot-save', '-no-boot-anim'], {
    detached: true,
    stdio: 'ignore',
    shell: false,
  }).unref();
  await waitForBoot();
}

async function main() {
  ensureSdkTools();
  console.log(`Using Android SDK on ${sdkRoot}`);
  console.log(`AVD home: ${avdHome}`);
  acceptLicenses();
  ensureSystemImage();
  ensureAvd();
  await startEmulator();

  console.log('\nEmulator setup complete.');
  console.log('Next: npm run run:aab');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
