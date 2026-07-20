import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { stageNativeWearablesPlugin } from './stage-native-wearables-plugin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const capacitorCliPath = path.join(repoRoot, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');
const args = process.argv.slice(2);

if (!args.length) {
  console.error('Usage: node scripts/run-capacitor.mjs <cap-command> [...args]');
  process.exit(1);
}

stageNativeWearablesPlugin();

const originalPackageJson = readFileSync(packageJsonPath, 'utf8');

try {
  if (!existsSync(capacitorCliPath)) {
    throw new Error(
      `Capacitor CLI not found at ${capacitorCliPath}. Run npm install before using native commands.`,
    );
  }

  const packageJson = JSON.parse(originalPackageJson);
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies['@cradlyn/native-wearables'] = 'file:plugins/native-wearables';
  writeFileSync(`${packageJsonPath}`, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const child = spawn(process.execPath, [capacitorCliPath, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', (error) => {
    writeFileSync(packageJsonPath, originalPackageJson, 'utf8');
    throw error;
  });

  child.on('exit', (code) => {
    writeFileSync(packageJsonPath, originalPackageJson, 'utf8');
    process.exit(code ?? 0);
  });
} catch (error) {
  writeFileSync(packageJsonPath, originalPackageJson, 'utf8');
  throw error;
}
