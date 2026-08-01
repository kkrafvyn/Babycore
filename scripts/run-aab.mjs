import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAndroidSdkEnv, getAndroidToolPaths } from './android-sdk.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
applyAndroidSdkEnv();
const { adb } = getAndroidToolPaths();
const bundletoolJar = path.join(rootDir, 'tools', 'bundletool.jar');
const aabPath = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const apksPath = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'cradlyn-local.apks');
const packageName = 'com.cradlyn.app';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(command, args) {
  return spawnSync(command, args, { encoding: 'utf8', shell: false });
}

function ensureBundletool() {
  if (existsSync(bundletoolJar) && statSync(bundletoolJar).size > 1_000_000) {
    return;
  }

  mkdirSync(path.dirname(bundletoolJar), { recursive: true });
  console.log('Downloading bundletool...');
  run('powershell', [
    '-NoProfile',
    '-Command',
    `Invoke-WebRequest -Uri "https://github.com/google/bundletool/releases/download/1.18.0/bundletool-all-1.18.0.jar" -OutFile "${bundletoolJar.replace(/\\/g, '/')}"`,
  ]);
}

function ensureReleaseAab() {
  if (existsSync(aabPath)) {
    return;
  }

  console.log('Release AAB not found. Building with cap:sync:android + bundleRelease...');
  run(process.execPath, [path.join(rootDir, 'scripts', 'run-capacitor.mjs'), 'sync', 'android'], {
    cwd: rootDir,
  });
  run('gradlew.bat', ['bundleRelease'], {
    cwd: path.join(rootDir, 'android'),
    shell: true,
  });

  if (!existsSync(aabPath)) {
    console.error(`Expected AAB at ${aabPath} after build, but file is missing.`);
    process.exit(1);
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

function buildApksFromAab() {
  mkdirSync(path.dirname(apksPath), { recursive: true });
  if (existsSync(apksPath)) {
    rmSync(apksPath);
  }

  console.log('Converting AAB to installable APK set (universal mode)...');
  run('java', [
    '-jar',
    bundletoolJar,
    'build-apks',
    `--bundle=${aabPath}`,
    `--output=${apksPath}`,
    '--mode=universal',
    '--overwrite',
  ]);
}

function installApks() {
  console.log('Installing release build on device/emulator...');
  run('java', ['-jar', bundletoolJar, 'install-apks', `--apks=${apksPath}`]);
}

function launchApp() {
  console.log('Launching Cradlyn...');
  run(adb, [
    'shell',
    'monkey',
    '-p',
    packageName,
    '-c',
    'android.intent.category.LAUNCHER',
    '1',
  ]);
}

if (!existsSync(adb)) {
  console.error(`adb not found at ${adb}. Install Android SDK platform-tools first.`);
  process.exit(1);
}

ensureBundletool();
ensureReleaseAab();

console.log(`Using AAB: ${aabPath}`);
console.log('Checking connected devices...');
const connected = getConnectedDevices();

if (!connected.length) {
  const universalApk = path.join(rootDir, 'releases', 'android', 'cradlyn-1.0.8-v10-universal.apk');
  console.error('\nNo Android device or emulator connected.');
  console.error('\nTo test the AAB locally before Play Console publish:');
  console.error('  1. Phone: enable Developer options + USB debugging, connect via USB, accept the RSA prompt.');
  console.error('  2. Emulator: Android Studio > Device Manager > Create/start a virtual device.');
  console.error('  3. Re-run: npm run run:aab');
  if (existsSync(universalApk)) {
    console.error('\nOr sideload the extracted release APK directly:');
    console.error(`  "${adb}" install -r "${universalApk}"`);
  }
  console.error('\nYou can verify adb sees the device with:');
  console.error(`  "${adb}" devices`);
  process.exit(1);
}

console.log(`Found ${connected.length} device(s): ${connected.map((line) => line.split('\t')[0]).join(', ')}`);

buildApksFromAab();
installApks();
launchApp();

console.log('\nCradlyn release build (from AAB) is running on your device.');
console.log('Test: sign in, Care Copilot AI, and that baby data loads after login.');
