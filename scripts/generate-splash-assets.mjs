import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = process.cwd();

const iosTargets = [
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png',
].map((relativePath) => ({
  relativePath,
  width: 2732,
  height: 2732,
}));

const androidTargets = [
  ['android/app/src/main/res/drawable/splash.png', 480, 320],
  ['android/app/src/main/res/drawable-land-hdpi/splash.png', 800, 480],
  ['android/app/src/main/res/drawable-land-mdpi/splash.png', 480, 320],
  ['android/app/src/main/res/drawable-land-xhdpi/splash.png', 1280, 720],
  ['android/app/src/main/res/drawable-land-xxhdpi/splash.png', 1600, 960],
  ['android/app/src/main/res/drawable-land-xxxhdpi/splash.png', 1920, 1280],
  ['android/app/src/main/res/drawable-port-hdpi/splash.png', 480, 800],
  ['android/app/src/main/res/drawable-port-mdpi/splash.png', 320, 480],
  ['android/app/src/main/res/drawable-port-xhdpi/splash.png', 720, 1280],
  ['android/app/src/main/res/drawable-port-xxhdpi/splash.png', 960, 1600],
  ['android/app/src/main/res/drawable-port-xxxhdpi/splash.png', 1280, 1920],
].map(([relativePath, width, height]) => ({ relativePath, width, height }));

const targets = [...iosTargets, ...androidTargets];

const logoSvg = await fs.readFile(path.join(rootDir, 'public', 'logo.svg'), 'utf8');
const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      body {
        font-family: 'Manrope', 'Segoe UI', sans-serif;
      }

      .frame {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 82% 8%, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.16) 29%, rgba(255, 255, 255, 0) 56%),
          radial-gradient(circle at 50% 54%, rgba(171, 199, 212, 0.42) 0%, rgba(171, 199, 212, 0.14) 24%, rgba(171, 199, 212, 0) 52%),
          linear-gradient(180deg, #eef6fa 0%, #e7f1f5 48%, #dbe7e5 100%);
      }

      .frame::before {
        content: '';
        position: absolute;
        left: 50%;
        top: 39%;
        width: 58vmin;
        height: 58vmin;
        transform: translate(-50%, -50%);
        border-radius: 999px;
        background: rgba(207, 225, 233, 0.75);
        filter: blur(88px);
      }

      .frame::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -18%;
        width: 66vmin;
        height: 66vmin;
        transform: translateX(-50%);
        border-radius: 999px;
        background: rgba(199, 217, 223, 0.5);
        filter: blur(120px);
      }

      .main {
        position: absolute;
        left: 50%;
        top: 24%;
        width: min(82vw, 900px);
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .orb {
        position: relative;
        width: 25vmin;
        height: 25vmin;
        min-width: 180px;
        min-height: 180px;
        max-width: 680px;
        max-height: 680px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.6);
        background: rgba(255, 255, 255, 0.42);
        box-shadow: 0 34px 120px rgba(121, 149, 160, 0.2);
        backdrop-filter: blur(5px);
      }

      .orb::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.12) 42%, rgba(255, 255, 255, 0) 62%);
      }

      .logo {
        position: relative;
        width: 36%;
        min-width: 70px;
        max-width: 220px;
      }

      .title {
        margin: 5.5vmin 0 0;
        color: #2a3034;
        font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
        font-size: clamp(54px, 6.6vmin, 136px);
        font-weight: 800;
        letter-spacing: -0.08em;
        line-height: 0.95;
      }

      .subtitle {
        margin-top: 1.3vmin;
        color: #647c97;
        font-size: clamp(22px, 2.25vmin, 46px);
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .progress {
        position: absolute;
        left: 50%;
        top: 72%;
        width: min(52vw, 760px);
        height: clamp(4px, 0.55vmin, 10px);
        transform: translateX(-50%);
        overflow: hidden;
        border-radius: 999px;
        background: rgba(140, 163, 171, 0.22);
      }

      .progress::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 36%;
        border-radius: inherit;
        background: rgba(140, 163, 171, 0.66);
      }

      .footer {
        position: absolute;
        left: 7%;
        right: 7%;
        bottom: 8%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: rgba(125, 141, 146, 0.72);
      }

      .shield,
      .spacer {
        width: clamp(18px, 2vmin, 42px);
        height: clamp(18px, 2vmin, 42px);
        flex: 0 0 auto;
      }

      .footer-text {
        flex: 1;
        padding: 0 4vmin;
        font-size: clamp(14px, 1.45vmin, 42px);
        font-weight: 500;
        letter-spacing: 0.42em;
        text-align: center;
        text-transform: uppercase;
      }

      @media (orientation: landscape) {
        .main {
          top: 17%;
        }

        .orb {
          width: 22vmin;
          height: 22vmin;
        }

        .title {
          margin-top: 4vmin;
          font-size: clamp(44px, 5.2vmin, 120px);
        }

        .subtitle {
          font-size: clamp(18px, 1.8vmin, 36px);
        }

        .progress {
          top: 78%;
          width: min(42vw, 640px);
        }

        .footer {
          bottom: 7%;
        }
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="main">
        <div class="orb">
          <img class="logo" src="${logoDataUri}" alt="Cradlyn logo" />
        </div>
        <div class="title">Cradlyn</div>
        <div class="subtitle">Nurturing with intention.</div>
      </div>
      <div class="progress"></div>
      <div class="footer">
        <svg class="shield" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="footer-text">Premium Nursery Intelligence</div>
        <div class="spacer"></div>
      </div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 1920 },
});

await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
});

for (const target of targets) {
  const outputPath = path.join(rootDir, target.relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await page.setViewportSize({ width: target.width, height: target.height });
  await page.waitForTimeout(120);
  await page.screenshot({
    path: outputPath,
    type: 'png',
  });
  console.log(`Generated ${target.relativePath} (${target.width}x${target.height})`);
}

await browser.close();
