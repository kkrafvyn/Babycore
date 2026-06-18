#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--linked');

if (forwardedArgs.length === 0) {
  console.error('Usage: node scripts/run-supabase-client.mjs <supabase arguments...>');
  process.exit(1);
}

const usesLinkedApi =
  (forwardedArgs[0] === 'migration' && forwardedArgs[1] === 'list') ||
  (forwardedArgs[0] === 'db' && forwardedArgs[1] === 'query');

const finalArgs = [...forwardedArgs];
if (usesLinkedApi && !finalArgs.includes('--linked') && !finalArgs.includes('--local')) {
  finalArgs.push('--linked');
}

const result = spawnSync(command, ['supabase', ...finalArgs], {
  cwd: repoRoot,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

if ((result.status ?? 1) !== 0 && usesLinkedApi) {
  console.error('\nLinked Supabase command failed. Run `npx supabase login` and `npx supabase link --project-ref <ref>` first.');
}

process.exit(result.status ?? 1);
