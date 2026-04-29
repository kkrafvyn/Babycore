import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'plugins', 'native-wearables');
const targetDir = path.join(repoRoot, 'node_modules', '@babycore', 'native-wearables');

export function stageNativeWearablesPlugin() {
  if (!existsSync(sourceDir)) {
    throw new Error(`Native wearables plugin source not found at ${sourceDir}`);
  }

  mkdirSync(path.dirname(targetDir), { recursive: true });
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });

  return targetDir;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const stagedPath = stageNativeWearablesPlugin();
  console.log(`Staged native wearables plugin to ${stagedPath}`);
}
