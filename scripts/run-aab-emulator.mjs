import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function run(scriptName) {
  const scriptPath = path.join(rootDir, 'scripts', scriptName);
  const result = spawnSync(node, [scriptPath], { stdio: 'inherit', cwd: rootDir, shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('=== Cradlyn: E: drive SDK + emulator + release AAB test ===\n');
run('bootstrap-android-sdk-e.mjs');
run('setup-emulator.mjs');
run('run-aab.mjs');
console.log('\nDone. The release build should now be open on the emulator.');
