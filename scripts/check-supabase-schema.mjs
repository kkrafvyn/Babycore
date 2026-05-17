#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const args = process.argv.slice(2);
const envFileArgIndex = args.findIndex((arg) => arg === '--env-file');
const hasExplicitEnvFile = envFileArgIndex >= 0 && Boolean(args[envFileArgIndex + 1]);
const envFile = hasExplicitEnvFile ? args[envFileArgIndex + 1] : '.env';

const resolveEnvPath = (candidate) => {
  if (path.isAbsolute(candidate)) {
    return candidate;
  }
  return path.resolve(process.cwd(), candidate);
};

const envPath = resolveEnvPath(envFile);
const readEnvFile = (filename) => {
  const filePath = resolveEnvPath(filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return dotenv.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
};

const envFiles = hasExplicitEnvFile
  ? [envFile]
  : ['.env', '.env.local', '.env.production', '.env.production.local'];
const fileEnv = Object.assign({}, ...envFiles.map((file) => readEnvFile(file)));
const getEnv = (key) => process.env[key] ?? fileEnv[key] ?? '';
const toStringValue = (value) => (typeof value === 'string' ? value.trim() : '');
const hasValue = (value) => toStringValue(value).length > 0;
const isPlaceholder = (value) => {
  const normalized = toStringValue(value).toLowerCase();
  if (!normalized) return true;

  return (
    normalized.includes('your_') ||
    normalized.includes('your-project') ||
    normalized.includes('example') ||
    normalized.includes('placeholder') ||
    normalized.includes('replace_me') ||
    normalized.includes('changeme')
  );
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
const supabaseKey =
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  '';

if (!hasValue(supabaseUrl) || !hasValue(supabaseKey) || isPlaceholder(supabaseUrl) || isPlaceholder(supabaseKey)) {
  console.error('\nMissing valid Supabase URL or publishable/anon key.');
  console.error(
    hasExplicitEnvFile
      ? `Tried env file: ${envPath}`
      : `Tried env files: ${envFiles.join(', ')}`,
  );
  console.error('Expected one of: VITE_SUPABASE_URL / SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY');
  process.exit(1);
}

const requiredSchemaChecks = [
  { label: 'health_logs', table: 'health_logs', select: '*' },
  {
    label: 'user_settings care workspace columns',
    table: 'user_settings',
    select: 'user_id,care_workspace_data,care_profile_preferences',
  },
  { label: 'shared_care_workspaces', table: 'shared_care_workspaces', select: 'baby_id' },
  { label: 'caregiver_shift_notes', table: 'caregiver_shift_notes', select: 'baby_id,author_id,note,status' },
];

const probeTable = async ({ label, table, select }) => {
  let response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.cause instanceof Error
          ? `${error.message}: ${error.cause.message}`
          : error.message
        : String(error);

    return {
      label,
      table,
      status: 0,
      ok: false,
      body: { message },
    };
  }

  const bodyText = await response.text();
  let bodyJson = null;

  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = bodyText;
  }

  return {
    label,
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

console.log(
  hasExplicitEnvFile
    ? `\nChecking Supabase schema with ${path.basename(envPath)}\n`
    : `\nChecking Supabase schema with ${envFiles.filter((file) => fs.existsSync(resolveEnvPath(file))).join(', ')}\n`,
);

const results = await Promise.all(requiredSchemaChecks.map((check) => probeTable(check)));
const failures = [];

for (const result of results) {
  const exists = tableExistsWithProtectedAccess(result);
  const label = exists ? 'PASS' : 'FAIL';
  const suffix = exists && !result.ok ? ' (protected by RLS)' : '';
  console.log(`${label.padEnd(5)} ${result.label} -> HTTP ${result.status}${suffix}`);

  if (!exists) {
    const details =
      typeof result.body === 'string'
        ? result.body.slice(0, 220)
        : JSON.stringify(result.body).slice(0, 220);
    failures.push(`${result.label}: ${details}`);
  }
}

if (failures.length > 0) {
  console.error('\nMissing required schema objects for cross-device sync:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    '\nSync the generated Supabase migrations with "npm run db:sync-migrations", apply the linked project migrations with "npm run db:migrate" (or run the specific SQL files manually if you are repairing an older project), then rerun this check.',
  );
  process.exit(1);
}

console.log('\nRequired health/settings sync and caregiver handoff tables are present.');
