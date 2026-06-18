#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const dryRun = process.argv.includes('--dry-run');

const parseMigrationFile = (filename) => {
  const match = filename.match(/^(\d+)_(.+)\.sql$/);
  if (!match) return null;
  return { version: match[1], name: match[2], filePath: path.join(migrationsDir, filename) };
};

const listLocalMigrations = () =>
  fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map(parseMigrationFile)
    .filter((entry) => entry !== null)
    .sort((left, right) => left.version.localeCompare(right.version));

const withTempSqlFile = (sql, run) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'babycore-supabase-'));
  const tempFile = path.join(tempDir, 'query.sql');

  try {
    fs.writeFileSync(tempFile, `${sql.trim()}\n`, 'utf8');
    return run(tempFile);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const parseJsonOutput = (output) => {
  const trimmed = String(output || '').trim();
  if (!trimmed) return [];

  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return [];
  }

  try {
    const payload = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    return Array.isArray(payload?.rows) ? payload.rows : [];
  } catch {
    return [];
  }
};

const runLinkedQuery = (sql) =>
  withTempSqlFile(sql, (tempFile) => {
    const result = spawnSync(command, ['supabase', 'db', 'query', '--linked', '-o', 'json', '--file', tempFile], {
      cwd: repoRoot,
      shell: process.platform === 'win32',
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
    });

    if (result.status !== 0) {
      const stderr = String(result.stderr || '').trim();
      const stdout = String(result.stdout || '').trim();
      throw new Error(stderr || stdout || 'Linked Supabase query failed.');
    }

    return parseJsonOutput(result.stdout);
  });

const runLinkedSqlFile = (filePath) => {
  const result = spawnSync(command, ['supabase', 'db', 'query', '--linked', '-o', 'json', '--file', filePath], {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim();
    const stdout = String(result.stdout || '').trim();
    throw new Error(stderr || stdout || `Failed applying ${path.basename(filePath)}`);
  }
};

const main = () => {
  const localMigrations = listLocalMigrations();
  const appliedRows = runLinkedQuery(
    'select version, name from supabase_migrations.schema_migrations order by version',
  );
  const appliedVersions = new Set(appliedRows.map((row) => String(row.version)));
  const pending = localMigrations.filter((migration) => !appliedVersions.has(migration.version));

  console.log(`Local migrations: ${localMigrations.length}`);
  console.log(`Remote migrations: ${appliedVersions.size}`);
  console.log(`Pending migrations: ${pending.length}`);

  if (pending.length === 0) {
    console.log('\nProduction database is up to date.');
    return;
  }

  if (dryRun) {
    console.log('\nDry run only. Pending files:');
    for (const migration of pending) {
      console.log(`- ${migration.version}_${migration.name}.sql`);
    }
    return;
  }

  console.log('\nApplying pending migrations via linked Supabase client...');
  for (const migration of pending) {
    console.log(`Applying ${migration.version}_${migration.name}.sql`);
    runLinkedSqlFile(migration.filePath);
    runLinkedQuery(
      `insert into supabase_migrations.schema_migrations(version, name) values ('${migration.version}', '${migration.name.replace(/'/g, "''")}')`,
    );
    console.log(`Applied ${migration.version}_${migration.name}`);
  }

  console.log('\nAll pending migrations applied.');
};

try {
  main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
