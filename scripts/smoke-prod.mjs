#!/usr/bin/env node

const baseArg = process.argv[2];
const configuredBaseUrl =
  baseArg ||
  process.env.SMOKE_BASE_URL ||
  process.env.VITE_APP_URL ||
  process.env.CLIENT_URL ||
  process.env.APP_URL ||
  process.env.VITE_SUPABASE_AUTH_REDIRECT_URL ||
  '';

if (!configuredBaseUrl) {
  console.error(
    'Missing target URL. Pass a base URL as the first argument or set SMOKE_BASE_URL, VITE_APP_URL, CLIENT_URL, or APP_URL.',
  );
  process.exit(1);
}

const baseUrl = configuredBaseUrl.replace(/\/$/, '');
const authToken = process.env.SMOKE_AUTH_TOKEN || '';

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
};

const checks = [
  {
    name: 'Health endpoint',
    run: async () => fetchJson(`${baseUrl}/api/health`),
    pass: (result) => result.status === 200 && result.body?.status === 'ok',
  },
  {
    name: 'Config readiness endpoint',
    run: async () => fetchJson(`${baseUrl}/api/health/config`),
    pass: (result) => result.status === 200 && typeof result.body?.checks === 'object',
  },
  {
    name: 'Payments subscription-status route shape',
    run: async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      return fetchJson(`${baseUrl}/api/payments/subscription-status`, { headers });
    },
    pass: (result) => (authToken ? result.status !== 404 : result.status === 401),
  },
  {
    name: 'Health alerts route shape',
    run: async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      return fetchJson(`${baseUrl}/api/health-alerts/active`, { headers });
    },
    pass: (result) => (authToken ? result.status !== 404 : result.status === 401),
  },
  {
    name: 'Paystack webhook endpoint exists',
    run: async () =>
      fetchJson(`${baseUrl}/api/payments/webhook/paystack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'ping' }),
      }),
    pass: (result) => result.status !== 404,
  },
  {
    name: 'Paystack webhook compat endpoint exists',
    run: async () =>
      fetchJson(`${baseUrl}/api/webhooks/paystack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'ping' }),
      }),
    pass: (result) => result.status !== 404,
  },
];

const failures = [];

console.log(`\nRunning BabyCore smoke tests against ${baseUrl}\n`);

for (const check of checks) {
  try {
    const result = await check.run();
    const passed = check.pass(result);
    const label = passed ? 'PASS' : 'FAIL';
    console.log(`${label.padEnd(5)} ${check.name} -> HTTP ${result.status}`);
    if (!passed) {
      failures.push({
        name: check.name,
        result,
      });
    }
  } catch (error) {
    console.log(`FAIL  ${check.name} -> ${error instanceof Error ? error.message : String(error)}`);
    failures.push({
      name: check.name,
      result: { status: 0, body: null, error },
    });
  }
}

if (failures.length > 0) {
  console.log('\nSmoke test failures:');
  for (const failure of failures) {
    const details =
      failure.result?.body && typeof failure.result.body === 'object'
        ? JSON.stringify(failure.result.body).slice(0, 240)
        : '';
    console.log(`- ${failure.name}${details ? ` | ${details}` : ''}`);
  }
  process.exit(1);
}

console.log('\nAll smoke tests passed.');
