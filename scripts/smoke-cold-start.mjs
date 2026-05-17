#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const host = process.env.SMOKE_HOST || '127.0.0.1';
const timeoutMs = Number(process.env.COLD_START_TIMEOUT_MS || 45_000);
const pollIntervalMs = Number(process.env.COLD_START_POLL_INTERVAL_MS || 1_000);
const distServerPath = path.resolve(process.cwd(), 'dist', 'api', 'server.js');

if (!fs.existsSync(distServerPath)) {
  console.error(`Missing built server at ${distServerPath}. Run "npm run build:full" first.`);
  process.exit(1);
}

const recentOutput = [];

const pushOutput = (stream, chunk) => {
  const lines = String(chunk || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  for (const line of lines) {
    recentOutput.push(`[${stream}] ${line}`);
  }

  if (recentOutput.length > 80) {
    recentOutput.splice(0, recentOutput.length - 80);
  }
};

const getAvailablePort = async () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        if (!port) {
          reject(new Error('Unable to determine a free port.'));
          return;
        }

        resolve(port);
      });
    });
  });

const fetchJson = async (url) => {
  const response = await fetch(url);
  const bodyText = await response.text();

  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
  };
};

const waitForCheck = async (name, url, predicate) => {
  const startedAt = Date.now();
  let lastResult = null;
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastResult = await fetchJson(url);
      lastError = null;
      if (predicate(lastResult)) {
        return lastResult;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(pollIntervalMs);
  }

  const resultSummary = lastResult
    ? `Last response: HTTP ${lastResult.status} ${JSON.stringify(lastResult.body).slice(0, 240)}`
    : lastError instanceof Error
      ? `Last error: ${lastError.message}`
      : `Last error: ${String(lastError)}`;

  throw new Error(`${name} did not become healthy within ${timeoutMs}ms. ${resultSummary}`);
};

const stopServer = async (child) => {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => {
      child.once('exit', resolve);
    }),
    delay(5_000),
  ]);

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
};

const port = await getAvailablePort();
const baseUrl = `http://${host}:${port}`;

const child = spawn(process.execPath, [distServerPath], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: host,
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout?.on('data', (chunk) => pushOutput('stdout', chunk));
child.stderr?.on('data', (chunk) => pushOutput('stderr', chunk));

try {
  console.log(`\nRunning local cold-start smoke test against ${baseUrl}\n`);

  const rootHealth = await waitForCheck('Root health endpoint', `${baseUrl}/health`, (result) =>
    result.status === 200 && result.body?.status === 'ok',
  );
  console.log(`PASS  /health -> HTTP ${rootHealth.status}`);

  const apiHealth = await waitForCheck('API health endpoint', `${baseUrl}/api/health`, (result) =>
    result.status === 200 && result.body?.status === 'ok' && typeof result.body?.environment === 'string',
  );
  console.log(`PASS  /api/health -> HTTP ${apiHealth.status}`);

  const configHealth = await waitForCheck(
    'Config readiness endpoint',
    `${baseUrl}/api/health/config`,
    (result) => result.status === 200 && result.body?.success === true && typeof result.body?.ready === 'boolean',
  );
  console.log(`PASS  /api/health/config -> HTTP ${configHealth.status} (ready=${configHealth.body.ready})`);

  console.log('\nCold-start smoke test passed.');
} catch (error) {
  console.error(`\nCold-start smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  if (recentOutput.length > 0) {
    console.error('\nRecent server output:');
    for (const line of recentOutput) {
      console.error(line);
    }
  }
  process.exitCode = 1;
} finally {
  await stopServer(child);
}
