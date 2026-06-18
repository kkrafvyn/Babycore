#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: false });
}

const getEnv = (key) => String(process.env[key] || '').trim();
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const serviceKey =
  getEnv('SUPABASE_SERVICE_KEY') ||
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnv('SUPABASE_SECRET_KEY');
const anonKey =
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_KEY for production client checks.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const publicClient = anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const requiredTables = [
  'health_logs',
  'user_settings',
  'shared_care_workspaces',
  'caregiver_shift_notes',
  'babies',
  'user_roles',
  'billing_events',
];

const probeTable = async (client, table, select = '*') => {
  const { error, count } = await client.from(table).select(select, { head: true, count: 'exact' });
  if (!error) {
    return { ok: true, status: 'reachable', count: count ?? 0 };
  }

  const message = error.message || 'unknown error';
  if (/permission denied|row-level security|JWT/i.test(message)) {
    return { ok: true, status: 'rls-protected', count: null };
  }

  if (/does not exist|Could not find the table/i.test(message)) {
    return { ok: false, status: 'missing', count: null, message };
  }

  return { ok: false, status: 'error', count: null, message };
};

const main = async () => {
  console.log(`\nChecking production Supabase client: ${supabaseUrl}\n`);

  let failures = 0;

  for (const table of requiredTables) {
    const serviceResult = await probeTable(
      admin,
      table,
      table === 'user_settings' ? 'user_id,care_workspace_data,care_profile_preferences' : '*',
    );
    const label = table.padEnd(24, ' ');
    if (serviceResult.ok) {
      const countLabel =
        serviceResult.count === null ? serviceResult.status : `${serviceResult.status} (${serviceResult.count})`;
      console.log(`PASS  ${label} -> ${countLabel}`);
    } else {
      failures += 1;
      console.log(`FAIL  ${label} -> ${serviceResult.message}`);
    }
  }

  if (publicClient) {
    const { error } = await publicClient.auth.getSession();
    if (error) {
      failures += 1;
      console.log(`FAIL  auth client           -> ${error.message}`);
    } else {
      console.log('PASS  auth client           -> reachable');
    }
  }

  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (usersError) {
    failures += 1;
    console.log(`FAIL  auth admin API        -> ${usersError.message}`);
  } else {
    console.log(`PASS  auth admin API        -> reachable (${users?.users?.length ? 'users present' : 'no users returned'})`);
  }

  if (failures > 0) {
    console.error(`\n${failures} production client check(s) failed.`);
    process.exit(1);
  }

  console.log('\nProduction Supabase client checks passed.');
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
