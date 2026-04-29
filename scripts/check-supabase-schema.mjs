#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const args = process.argv.slice(2);
const envFileArgIndex = args.findIndex((arg) => arg === '--env-file');
const envFile =
  envFileArgIndex >= 0 && args[envFileArgIndex + 1]
    ? args[envFileArgIndex + 1]
    : '.env';

const resolveEnvPath = (candidate) => {
  if (path.isAbsolute(candidate)) {
    return candidate;
  }
  return path.resolve(process.cwd(), candidate);
};

const envPath = resolveEnvPath(envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('\nMissing Supabase URL or publishable/anon key.');
  console.error(`Tried env file: ${envPath}`);
  console.error('Expected one of: VITE_SUPABASE_URL / SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY');
  process.exit(1);
}

const requiredTables = ['health_logs', 'user_settings'];

const probeTable = async (table) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  const bodyText = await response.text();
  let bodyJson = null;

  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = bodyText;
  }

  return {
    table,
    status: response.status,
    ok: response.ok,
    body: bodyJson,
  };
};

const tableExistsWithProtectedAccess = (result) => {
  if (result.ok) {
    return true;
  }

  if (result.status !== 401 && result.status !== 403) {
    return false;
  }

  const code = typeof result.body === 'object' && result.body ? result.body.code : '';
  const message = typeof result.body === 'object' && result.body ? result.body.message : '';

  return code === '42501' || String(message).toLowerCase().includes('permission denied');
};

console.log(`\nChecking Supabase schema with ${path.basename(envPath)}\n`);

const results = await Promise.all(requiredTables.map((table) => probeTable(table)));
const failures = [];

for (const result of results) {
  const exists = tableExistsWithProtectedAccess(result);
  const label = exists ? 'PASS' : 'FAIL';
  const suffix = exists && !result.ok ? ' (protected by RLS)' : '';
  console.log(`${label.padEnd(5)} ${result.table} -> HTTP ${result.status}${suffix}`);

  if (!exists) {
    const details =
      typeof result.body === 'string'
        ? result.body.slice(0, 220)
        : JSON.stringify(result.body).slice(0, 220);
    failures.push(`${result.table}: ${details}`);
  }
}

if (failures.length > 0) {
  console.error('\nMissing required schema objects for cross-device sync:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nRun database/sql/33-health-logs-and-user-settings.sql against the target Supabase project, then rerun this check.');
  process.exit(1);
}

console.log('\nRequired health/settings sync tables are present.');
