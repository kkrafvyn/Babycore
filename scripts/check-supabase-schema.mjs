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

const requiredTables = ['health_logs', 'user_settings'];

const probeTable = async (table) => {
  let response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
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
