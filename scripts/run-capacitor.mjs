import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { stageNativeWearablesPlugin } from './stage-native-wearables-plugin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const args = process.argv.slice(2);

if (!args.length) {
  console.error('Usage: node scripts/run-capacitor.mjs <cap-command> [...args]');
  process.exit(1);
}

stageNativeWearablesPlugin();

const originalPackageJson = readFileSync(packageJsonPath, 'utf8');

try {
  const packageJson = JSON.parse(originalPackageJson);
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies['@babycore/native-wearables'] = 'file:plugins/native-wearables';
  writeFileSync(`${packageJsonPath}`, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const child = spawn('npm', ['exec', 'cap', '--', ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    writeFileSync(packageJsonPath, originalPackageJson, 'utf8');
    process.exit(code ?? 0);
  });
} catch (error) {
  writeFileSync(packageJsonPath, originalPackageJson, 'utf8');
  throw error;
}
