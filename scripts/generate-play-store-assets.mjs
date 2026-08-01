import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'store-listing', 'android');
const host = '127.0.0.1';
const port = 4288;
const baseUrl = `http://${host}:${port}`;

const loadEnvFile = (relativePath) => {
  try {
    const content = fsSync.readFileSync(path.join(rootDir, relativePath), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional env files.
  }
};

loadEnvFile('.env.production.local');
loadEnvFile('.env.local');
loadEnvFile('.env');

const TEST_BABY = {
  id: 'store-listing-baby',
  name: 'Avery',
  dateOfBirth: '2024-06-15T08:00:00.000Z',
  gender: 'girl',
  country: 'US',
  ageGroup: 'infant',
  createdAt: '2026-05-17T12:00:00.000Z',
};

const TEST_USER = {
  id: 'store-listing-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'parent@cradlyn.com',
  email_confirmed_at: '2026-05-17T12:00:00.000Z',
  user_metadata: { onboarding_profile_type: 'baby', full_name: 'Jordan' },
  created_at: '2026-05-17T12:00:00.000Z',
};

const MOBILE_SPLASH_SESSION_KEY = 'babylog_mobile_splash_seen';
const LEGACY_GUEST_SESSION_KEY = 'babylog_guest_session';
const TEST_USER_SCOPE = `user:${TEST_USER.id}`;

const SCREENSHOTS = [
  { file: '01-dashboard.png', route: '/dashboard', waitMs: 1800 },
  { file: '02-sleep.png', route: '/sleep', waitMs: 1400 },
  { file: '03-feeding.png', route: '/feeding', waitMs: 1400 },
  { file: '04-growth.png', route: '/growth', waitMs: 1400 },
  { file: '05-vaccination.png', route: '/vaccination', waitMs: 1400 },
  { file: '06-family-sharing.png', route: '/family-sharing', waitMs: 1400 },
];

const getSupabaseAuthStorageKey = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0] || 'example';
  return `sb-${projectRef}-auth-token`;
};

const startServer = () =>
  new Promise((resolve, reject) => {
    const server = spawn(process.execPath, ['scripts/serve-spa.mjs', '--host', host, '--port', String(port)], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error('Timed out waiting for SPA server'));
      }
    }, 60_000);

    server.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('listening')) {
        resolved = true;
        clearTimeout(timeout);
        resolve(server);
      }
    });

    server.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });

    server.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`SPA server exited early with code ${code}`));
      }
    });
  });

const stubNetwork = async (page) => {
  const fulfillJson = async (route, payload, status = 200) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  };

  await page.route('**/auth/v1/user**', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, TEST_USER);
      return;
    }
    await route.continue();
  });

  await page.route('**/auth/v1/token**', async (route) => {
    await fulfillJson(route, {
      access_token: 'store-listing-access-token',
      refresh_token: 'store-listing-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: TEST_USER,
    });
  });

  await page.route('**/auth/v1/session**', async (route) => {
    await fulfillJson(route, {
      access_token: 'store-listing-access-token',
      refresh_token: 'store-listing-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: TEST_USER,
    });
  });

  await page.route('**/rest/v1/**', async (route) => {
    await fulfillJson(route, { code: '42501', message: 'permission denied' }, 401);
  });

  await page.route('**/storage/v1/**', async (route) => {
    await fulfillJson(route, { message: 'storage unavailable during asset generation' }, 401);
  });

  await page.route('**/api/payments/config', async (route) => {
    await fulfillJson(route, {
      success: true,
      data: {
        paymentCollection: {
          enabled: false,
          reason: 'Store listing asset generation',
          source: 'database',
          updatedAt: '2026-07-27T12:00:00.000Z',
        },
        premiumAccess: {
          enabled: false,
          reason: 'Store listing asset generation',
          source: 'database',
          updatedAt: '2026-07-27T12:00:00.000Z',
        },
      },
    });
  });

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/payments/config')) {
      await route.continue();
      return;
    }
    await fulfillJson(route, { success: true, data: [] });
  });
};

const primeAppState = async (page) => {
  const authStorageKey = getSupabaseAuthStorageKey();
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

  await page.evaluate(
    async ({ authKey, baby, ownerScopeId, user, now, hour }) => {
      const waitForRequest = (request) =>
        new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

      const deleteDb = () =>
        new Promise((resolve) => {
          const request = indexedDB.deleteDatabase('babylog');
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        });

      localStorage.removeItem('babylog_guest_session');
      sessionStorage.setItem('babylog_mobile_splash_seen', 'true');
      localStorage.setItem(
        authKey,
        JSON.stringify({
          access_token: 'store-listing-access-token',
          refresh_token: 'store-listing-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user,
        }),
      );

      await deleteDb();

      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('babylog', 5);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          const db = request.result;
          const tx = request.transaction;
          if (!tx) return;

          const ensureStore = (name, indexes = []) => {
            const store = db.objectStoreNames.contains(name)
              ? tx.objectStore(name)
              : db.createObjectStore(name, { keyPath: 'id' });
            for (const [indexName, keyPath] of indexes) {
              if (!store.indexNames.contains(indexName)) {
                store.createIndex(indexName, keyPath, { unique: false });
              }
            }
            return store;
          };

          ensureStore('babies', [['ownerScopeId', 'ownerScopeId']]);
          ensureStore('sleep_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'startTime'],
          ]);
          ensureStore('feed_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          ensureStore('diaper_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          ensureStore('growth_measurements', [
            ['babyId', 'babyId'],
            ['date', 'date'],
          ]);
          ensureStore('vaccination_records', [
            ['babyId', 'babyId'],
            ['dueDate', 'dueDate'],
          ]);
          if (!db.objectStoreNames.contains('user_settings')) {
            db.createObjectStore('user_settings', { keyPath: 'userId' });
          }
          ensureStore('milestones', [
            ['babyId', 'babyId'],
            ['date', 'date'],
          ]);
          ensureStore('memories', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          ensureStore('health_logs', [
            ['babyId', 'babyId'],
            ['timestamp', 'timestamp'],
          ]);
          ensureStore('journal_entries', [
            ['babyId', 'babyId'],
            ['date', 'date'],
          ]);
          ensureStore('achievements', [['babyId', 'babyId']]);
        };
        request.onsuccess = () => resolve(request.result);
      });

      const tx = database.transaction(
        ['babies', 'sleep_logs', 'feed_logs', 'diaper_logs', 'growth_measurements'],
        'readwrite',
      );

      await waitForRequest(tx.objectStore('babies').put({ ...baby, ownerScopeId }));

      const sampleSleep = [
        {
          id: 'sleep-1',
          babyId: baby.id,
          startTime: new Date(now - 6 * hour).toISOString(),
          endTime: new Date(now - 4.5 * hour).toISOString(),
          durationMinutes: 90,
          notes: 'Morning nap',
        },
        {
          id: 'sleep-2',
          babyId: baby.id,
          startTime: new Date(now - 11 * hour).toISOString(),
          endTime: new Date(now - 9 * hour).toISOString(),
          durationMinutes: 120,
          notes: 'Night sleep',
        },
      ];

      const sampleFeeds = [
        {
          id: 'feed-1',
          babyId: baby.id,
          timestamp: new Date(now - 2 * hour).toISOString(),
          type: 'breast',
          durationMinutes: 18,
          side: 'left',
        },
        {
          id: 'feed-2',
          babyId: baby.id,
          timestamp: new Date(now - 5 * hour).toISOString(),
          type: 'bottle',
          amountMl: 120,
        },
      ];

      const sampleDiapers = [
        {
          id: 'diaper-1',
          babyId: baby.id,
          timestamp: new Date(now - 3 * hour).toISOString(),
          type: 'wet',
        },
      ];

      const sampleGrowth = [
        {
          id: 'growth-1',
          babyId: baby.id,
          date: new Date(now - 14 * 24 * hour).toISOString(),
          weightKg: 7.8,
          heightCm: 68,
        },
      ];

      for (const entry of sampleSleep) await waitForRequest(tx.objectStore('sleep_logs').put(entry));
      for (const entry of sampleFeeds) await waitForRequest(tx.objectStore('feed_logs').put(entry));
      for (const entry of sampleDiapers) await waitForRequest(tx.objectStore('diaper_logs').put(entry));
      for (const entry of sampleGrowth) await waitForRequest(tx.objectStore('growth_measurements').put(entry));

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

      database.close();
    },
    {
      authKey: authStorageKey,
      baby: TEST_BABY,
      ownerScopeId: TEST_USER_SCOPE,
      user: TEST_USER,
      now,
      hour,
    },
  );

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByText("Today's focus").first().waitFor({ timeout: 30_000 });
};

const buildFeatureGraphicHtml = (dashboardDataUri, logoDataUri) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1024px;
        height: 500px;
        overflow: hidden;
        font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
      }
      .frame {
        position: relative;
        width: 1024px;
        height: 500px;
        background:
          radial-gradient(circle at 18% 18%, rgba(223, 248, 255, 0.75) 0%, rgba(223, 248, 255, 0) 42%),
          radial-gradient(circle at 88% 82%, rgba(69, 105, 125, 0.18) 0%, rgba(69, 105, 125, 0) 48%),
          linear-gradient(135deg, #f8f7fb 0%, #eef0f5 52%, #e7edf2 100%);
      }
      .content {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 42px 56px;
      }
      .copy {
        max-width: 430px;
        z-index: 2;
      }
      .logo {
        width: 92px;
        height: 92px;
        object-fit: contain;
        margin-bottom: 18px;
      }
      .title {
        margin: 0;
        color: #45697d;
        font-size: 64px;
        font-weight: 800;
        letter-spacing: -0.06em;
        line-height: 0.95;
      }
      .tagline {
        margin: 14px 0 0;
        color: #686d76;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.28em;
        text-transform: uppercase;
      }
      .desc {
        margin: 22px 0 0;
        color: #242932;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.35;
        max-width: 390px;
      }
      .phone-wrap {
        position: relative;
        width: 250px;
        height: 500px;
        margin-right: 18px;
        transform: translateY(28px);
      }
      .phone-shadow {
        position: absolute;
        inset: auto 12px -8px 12px;
        height: 28px;
        border-radius: 999px;
        background: rgba(36, 41, 50, 0.18);
        filter: blur(14px);
      }
      .phone {
        position: absolute;
        inset: 0;
        border-radius: 34px;
        padding: 10px;
        background: linear-gradient(180deg, #2f3944 0%, #1b222b 100%);
        box-shadow: 0 28px 60px rgba(69, 105, 125, 0.28);
      }
      .phone-screen {
        width: 100%;
        height: 100%;
        border-radius: 26px;
        overflow: hidden;
        background: #f8f7fb;
      }
      .phone-screen img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="content">
        <div class="copy">
          <img class="logo" src="${logoDataUri}" alt="Cradlyn logo" />
          <h1 class="title">Cradlyn</h1>
          <p class="tagline">Nurturing with intention</p>
          <p class="desc">Calm baby care tracking for sleep, feeding, growth, health, and family sharing.</p>
        </div>
        <div class="phone-wrap">
          <div class="phone-shadow"></div>
          <div class="phone">
            <div class="phone-screen">
              <img src="${dashboardDataUri}" alt="Cradlyn dashboard preview" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

await fs.mkdir(outputDir, { recursive: true });

const distIndex = path.join(rootDir, 'dist', 'index.html');
const shouldBuild =
  process.env.FORCE_PLAY_STORE_BUILD === '1' || !fsSync.existsSync(distIndex);

if (shouldBuild) {
  console.log('Building frontend...');
  await new Promise((resolve, reject) => {
    const build = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:frontend'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed: ${code}`))));
  });
} else {
  console.log('Using existing dist/ build (set FORCE_PLAY_STORE_BUILD=1 to rebuild).');
}

console.log(`Supabase auth storage key: ${getSupabaseAuthStorageKey()}`);

const server = await startServer();
let browser;

try {
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  });
  const context = await browser.newContext({
    ...devices['Pixel 5'],
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await stubNetwork(page);
  await primeAppState(page);

  const screenshotsDir = path.join(outputDir, 'phone-screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  let dashboardBuffer = null;

  for (const shot of SCREENSHOTS) {
    await page.goto(`${baseUrl}${shot.route}`, { waitUntil: 'networkidle' });
    if (shot.route === '/dashboard') {
      await page.getByText("Today's focus").first().waitFor({ timeout: 30_000 });
    } else if (shot.route === '/sleep') {
      await page.getByText('Sleep Timer').first().waitFor({ timeout: 30_000 });
    } else if (shot.route === '/feeding') {
      await page.getByText('Feeding Timer').first().waitFor({ timeout: 30_000 });
    } else if (shot.route === '/growth') {
      await page.getByText(/Growth/i).first().waitFor({ timeout: 30_000 });
    } else if (shot.route === '/vaccination') {
      await page.getByText(/Vaccin/i).first().waitFor({ timeout: 30_000 });
    } else if (shot.route === '/family-sharing') {
      await page.getByRole('heading', { name: /Invite Member/i }).waitFor({ timeout: 30_000 });
    }
    await page.waitForTimeout(shot.waitMs);

    const screenshotPath = path.join(screenshotsDir, shot.file);
    const buffer = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false });
    if (shot.file === '01-dashboard.png') {
      dashboardBuffer = buffer;
    }
    console.log(`Generated ${path.relative(rootDir, screenshotPath)}`);
  }

  const logoBuffer = await fs.readFile(path.join(rootDir, 'public', 'splash-logo.png'));
  const logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  const dashboardDataUri = `data:image/png;base64,${(dashboardBuffer || logoBuffer).toString('base64')}`;

  const featurePage = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await featurePage.setContent(buildFeatureGraphicHtml(dashboardDataUri, logoDataUri), {
    waitUntil: 'networkidle',
  });
  await featurePage.waitForTimeout(500);

  const featureGraphicPath = path.join(outputDir, 'feature-graphic.png');
  await featurePage.screenshot({ path: featureGraphicPath, type: 'png' });
  console.log(`Generated ${path.relative(rootDir, featureGraphicPath)}`);

  const iconSource = path.join(rootDir, 'public', 'logo.png');
  const iconDest = path.join(outputDir, 'app-icon-512.png');
  const iconPage = await browser.newPage({ viewport: { width: 512, height: 512 } });
  const logoIconBuffer = await fs.readFile(iconSource);
  const logoIconDataUri = `data:image/png;base64,${logoIconBuffer.toString('base64')}`;
  await iconPage.setContent(
    `<!DOCTYPE html><html><body style="margin:0;background:#f8f7fb;"><img src="${logoIconDataUri}" width="512" height="512" style="display:block;width:512px;height:512px;object-fit:contain;" /></body></html>`,
    { waitUntil: 'networkidle' },
  );
  await iconPage.screenshot({ path: iconDest, type: 'png' });
  await iconPage.close();
  console.log(`Generated ${path.relative(rootDir, iconDest)}`);

  const readme = `# Cradlyn Play Store Graphics

Generated for Google Play default store listing.

## Files
- \`feature-graphic.png\` — 1024 x 500 feature banner
- \`phone-screenshots/\` — 1080 x 1920 phone screenshots (9:16)
- \`app-icon-512.png\` — copied from public/logo.png (resize to exactly 512x512 if needed)

## Upload in Play Console
1. Store presence → Main store listing
2. Feature graphic → \`feature-graphic.png\`
3. Phone screenshots → upload all files in \`phone-screenshots/\`
4. App icon → \`app-icon-512.png\` (must be exactly 512x512)

Regenerate:
\`\`\`bash
node scripts/generate-play-store-assets.mjs
\`\`\`
`;
  await fs.writeFile(path.join(outputDir, 'README.md'), readme, 'utf8');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}

console.log(`\nPlay Store assets ready in ${path.relative(rootDir, outputDir)}`);
