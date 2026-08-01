import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAndroidSdkEnv, getAndroidToolPaths } from './android-sdk.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
applyAndroidSdkEnv();
const { adb } = getAndroidToolPaths();
const apk = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const packageName = 'com.cradlyn.app';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(adb)) {
  console.error(`adb not found at ${adb}. Install Android SDK platform-tools first.`);
  process.exit(1);
}

console.log('Checking connected devices...');
const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' });
const connected = (devices.stdout || '')
  .split('\n')
  .slice(1)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('*') && line.includes('device'));

if (!connected.length) {
  console.error('No Android device or emulator connected.');
  console.error('Connect a phone with USB debugging enabled, or start an emulator in Android Studio.');
  process.exit(1);
}

if (!existsSync(apk)) {
  console.log('Debug APK not found. Building first...');
  run(process.execPath, ['scripts/run-capacitor.mjs', 'sync', 'android'], { cwd: rootDir });
  run('gradlew.bat', ['assembleDebug'], {
    cwd: path.join(rootDir, 'android'),
    shell: true,
  });
}

console.log('Installing APK...');
run(adb, ['install', '-r', apk]);

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

console.log('Cradlyn launched.');
