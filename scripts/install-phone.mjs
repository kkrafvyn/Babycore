import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAndroidSdkEnv, getAndroidToolPaths } from './android-sdk.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
applyAndroidSdkEnv();
const { adb } = getAndroidToolPaths();
const apkPath = path.join(rootDir, 'releases', 'android', 'cradlyn-1.0.8-v10-universal.apk');
const packageName = 'com.cradlyn.app';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getDevices() {
  const result = spawnSync(adb, ['devices'], { encoding: 'utf8', shell: false });
  return (result.stdout || '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);
}

if (!existsSync(adb)) {
  console.error(`adb not found at ${adb}`);
  process.exit(1);
}

if (!existsSync(apkPath)) {
  console.error(`Release APK not found: ${apkPath}`);
  process.exit(1);
}

spawnSync(adb, ['kill-server'], { stdio: 'ignore', shell: false });
spawnSync(adb, ['start-server'], { stdio: 'inherit', shell: false });

console.log('Waiting for phone (unlock Samsung and tap Allow on USB debugging)...');
run(adb, ['wait-for-device']);

const devices = getDevices();
console.log('\nConnected devices:');
devices.forEach((line) => console.log(`  ${line}`));

if (devices.some((line) => line.includes('unauthorized'))) {
  console.error('\nPhone is connected but unauthorized. Tap "Allow" on the USB debugging prompt.');
  process.exit(1);
}

if (!devices.some((line) => line.endsWith('device'))) {
  console.error('\nNo authorized device found.');
  process.exit(1);
}

console.log(`\nInstalling ${path.basename(apkPath)}...`);
const install = spawnSync(adb, ['install', '-r', apkPath], { encoding: 'utf8', shell: false });
if (install.status !== 0) {
  const output = `${install.stdout || ''}\n${install.stderr || ''}`;
  if (output.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
    console.log('Existing Cradlyn build uses a different signature. Removing old app...');
    spawnSync(adb, ['uninstall', packageName], { stdio: 'inherit', shell: false });
    run(adb, ['install', '-r', apkPath]);
  } else {
    process.stdout.write(output);
    process.exit(install.status ?? 1);
  }
}

console.log('Launching Cradlyn...');
run(adb, ['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
console.log('\nCradlyn is running on your phone.');
