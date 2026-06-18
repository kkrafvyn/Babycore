#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const poolerUrlPath = path.join(repoRoot, 'supabase', '.temp', 'pooler-url');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--linked');

for (const envFile of ['.env', '.env.local', '.env.production.local']) {
  loadEnv({ path: path.join(repoRoot, envFile), override: false });
}

if (forwardedArgs.length === 0) {
  console.error('Usage: node scripts/run-supabase-linked.mjs <supabase arguments...>');
  process.exit(1);
}

if (forwardedArgs.includes('--db-url')) {
  console.error('Do not pass --db-url to run-supabase-linked.mjs; it is injected automatically.');
  process.exit(1);
}

const resolveDatabaseUrl = () => {
  const directUrl = String(process.env.SUPABASE_DB_URL || '').trim();
  if (directUrl) {
    return directUrl;
  }

  const password = String(process.env.SUPABASE_DB_PASSWORD || '').trim();
  if (!password) {
    console.error('SUPABASE_DB_PASSWORD or SUPABASE_DB_URL is required for linked Supabase CLI commands.');
    console.error('Tip: copy the Session pooler URI from Supabase Dashboard -> Project Settings -> Database.');
    process.exit(1);
  }

  if (!fs.existsSync(poolerUrlPath)) {
    console.error('Missing supabase/.temp/pooler-url. Run `npx supabase link` first.');
    process.exit(1);
  }

  const poolerUrl = new URL(fs.readFileSync(poolerUrlPath, 'utf8').trim());
  poolerUrl.password = password;
  return poolerUrl.toString();
};

const databaseUrl = resolveDatabaseUrl();

const result = spawnSync(command, ['supabase', ...forwardedArgs, '--db-url', databaseUrl], {
  cwd: repoRoot,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

if ((result.status ?? 1) !== 0) {
  console.error('\nDatabase CLI auth failed. This is not the same as SUPABASE_SERVICE_KEY.');
  console.error('Use the database password from Supabase Dashboard -> Project Settings -> Database.');
  console.error('If the password contains #, wrap SUPABASE_DB_PASSWORD in quotes, or paste the full URI as SUPABASE_DB_URL.');
}

process.exit(result.status ?? 1);
