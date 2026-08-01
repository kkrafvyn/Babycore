import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4273);
const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1';

const e2eEnv: Record<string, string> = {
  CI: process.env.CI || 'true',
  VITE_SUPABASE_URL: 'https://babycore-demo.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_babycore_demo',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_babycore_demo',
  SUPABASE_URL: 'https://babycore-demo.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_babycore_demo',
  SUPABASE_SERVICE_KEY: 'sb_service_babycore_demo',
  VITE_SUPABASE_AUTH_REDIRECT_URL: 'https://app.babycore.dev/auth/callback',
  VITE_PAYSTACK_PUBLIC_KEY: 'pk_test_babycore_demo',
  PAYSTACK_SECRET_KEY: 'sk_test_babycore_demo',
};

for (const [key, value] of Object.entries(e2eEnv)) {
  process.env[key] = value;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && node scripts/serve-spa.mjs --host ${host} --port ${port}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: reuseExistingServer && !process.env.CI,
    env: e2eEnv,
  },
});
