#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const poolerUrlPath = path.join(repoRoot, 'supabase', '.temp', 'pooler-url');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--linked');

if (forwardedArgs.length === 0) {
  console.error('Usage: node scripts/run-supabase-linked.mjs <supabase arguments...>');
  process.exit(1);
}

if (forwardedArgs.includes('--db-url')) {
  console.error('Do not pass --db-url to run-supabase-linked.mjs; it is injected automatically.');
  process.exit(1);
}

if (!process.env.SUPABASE_DB_PASSWORD?.trim()) {
  console.error('SUPABASE_DB_PASSWORD is required for linked Supabase CLI commands.');
  process.exit(1);
}

if (!fs.existsSync(poolerUrlPath)) {
  console.error('Missing supabase/.temp/pooler-url. Run `supabase link` first.');
  process.exit(1);
}

const poolerUrl = new URL(fs.readFileSync(poolerUrlPath, 'utf8').trim());
poolerUrl.password = process.env.SUPABASE_DB_PASSWORD.trim();

const result = spawnSync(command, ['supabase', ...forwardedArgs, '--db-url', poolerUrl.toString()], {
  cwd: repoRoot,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
