import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  'src',
  'tests',
  'public',
  'index.html',
  'capacitor.config.json',
  'android/app/src/main/res/values/strings.xml',
  'supabase/templates',
  '.env.production.example',
  'package.json',
];

const skipPathPattern =
  /(node_modules|dist|\.git|babycore-e1adb|google-services\.json|package-lock\.json|rebrand-user-facing-text\.mjs)/i;

const protectedTokens = ['BabyLogNotification', 'fetchBabyLogs'];

const replacements = [
  [/Babycore Command/g, 'Bud & Bloom Command'],
  [/Babycore Ops/g, 'Bud & Bloom Ops'],
  [/Who is using Babycore/g, 'Who is using Bud & Bloom'],
  [/while Babycore tests/g, 'while Bud & Bloom tests'],
  [/while Babycore completes/g, 'while Bud & Bloom completes'],
  [/summarizes Babycore records/g, 'summarizes Bud & Bloom records'],
  [/Babycore!/g, 'BudBloom!'],
  [/Serenity AI Insight/g, 'Bloom AI Insight'],
  [/Serenity Mobile/g, 'Bud & Bloom Mobile'],
  [/Editorial Serenity/g, 'Editorial Bloom'],
  [/Serenity never retains/g, 'Bud & Bloom never retains'],
  [/Join BabyLog/g, 'Join Bud & Bloom'],
  [/Rejoindre BabyLog/g, 'Rejoindre Bud & Bloom'],
  [/Zu BabyLog/g, 'Zu Bud & Bloom'],
  [/Loading BabyLog\.\.\./g, 'Loading Bud & Bloom...'],
  [/BabyLog Policy Center/g, 'Bud & Bloom Policy Center'],
  [/BabyLog Visit Packet/g, 'Bud & Bloom Visit Packet'],
  [/BabyLog Health Report/g, 'Bud & Bloom Health Report'],
  [/BabyLog Subscription/g, 'Bud & Bloom Subscription'],
  [/BabyLog Update/g, 'Bud & Bloom Update'],
  [/Open BabyLog/g, 'Open Bud & Bloom'],
  [/BabyLog Backend API Server/g, 'Bud & Bloom Backend API Server'],
  [/BabyLog Team/g, 'Bud & Bloom Team'],
  [/© 2024 BabyLog Editorial/g, '© 2024 Bud & Bloom Editorial'],
  [/original BabyLog feel/g, 'original Bud & Bloom feel'],
  [/Where BabyLog gets/g, 'Where Bud & Bloom gets'],
  [/from BabyLog\./g, 'from Bud & Bloom.'],
  [/appName: 'BabyLog'/g, "appName: 'Bud & Bloom'"],
  [/short_name": "BabyLog"/g, 'short_name": "Bud & Bloom"'],
  [/name": "BabyLog"/g, 'name": "Bud & Bloom"'],
  [/APP_NAME=BabyLog/g, 'APP_NAME=Bud & Bloom'],
  [/VITE_APP_NAME=BabyLog/g, 'VITE_APP_NAME=Bud & Bloom'],
  [/APP_PRODUCT_NAME=Serenity/g, 'APP_PRODUCT_NAME=Bloom'],
  [/VITE_APP_PRODUCT_NAME=Serenity/g, 'VITE_APP_PRODUCT_NAME=Bloom'],
  [/Confirm your BabyLog account/g, 'Confirm your Bud & Bloom account'],
  [/Reset your BabyLog password/g, 'Reset your Bud & Bloom password'],
  [/BabyLog password/g, 'Bud & Bloom password'],
  [/BabyLog account/g, 'Bud & Bloom account'],
  [/BabyLog logo/g, 'Bud & Bloom logo'],
  [/BabyLog nursing mother logo/g, 'Bud & Bloom logo'],
  [/alt="BabyLog"/g, 'alt="Bud & Bloom"'],
  [/<title>BabyLog/g, '<title>Bud & Bloom'],
  [/"appName": "BabyLog"/g, '"appName": "Bud & Bloom"'],
  [/"name": "babylog"/g, '"name": "bud-and-bloom"'],
  [/BabyLog - Baby Care Management/g, 'Bud & Bloom - Baby Care Management'],
  [/title_activity_main">BabyLog</g, 'title_activity_main">Bud & Bloom</'],
  [/app_name">BabyLog</g, 'app_name">Bud & Bloom</'],
  [/BABYLOG SECURE ACCESS/g, 'BUD & BLOOM SECURE ACCESS'],
  [/BabyLog/g, 'Bud & Bloom'],
];

function maskProtected(content) {
  const placeholders = new Map();
  let masked = content;
  protectedTokens.forEach((token, index) => {
    const placeholder = `__PROTECTED_TOKEN_${index}__`;
    masked = masked.split(token).join(placeholder);
    placeholders.set(placeholder, token);
  });
  return { masked, placeholders };
}

function unmaskProtected(content, placeholders) {
  let restored = content;
  for (const [placeholder, token] of placeholders.entries()) {
    restored = restored.split(placeholder).join(token);
  }
  return restored;
}

function shouldProcess(filePath) {
  if (skipPathPattern.test(filePath)) return false;
  return targets.some((target) => {
    const absolute = path.resolve(rootDir, target);
    return filePath === absolute || filePath.startsWith(`${absolute}${path.sep}`);
  });
}

function applyReplacements(content) {
  const { masked, placeholders } = maskProtected(content);
  let next = masked;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  return unmaskProtected(next, placeholders);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    files.push(dir);
    return files;
  }
  for (const entry of fs.readdirSync(dir)) {
    walk(path.join(dir, entry), files);
  }
  return files;
}

const files = targets.flatMap((target) => {
  const absolute = path.resolve(rootDir, target);
  return fs.existsSync(absolute) ? walk(absolute) : [];
});

let changed = 0;
for (const filePath of files) {
  if (!shouldProcess(filePath)) continue;
  if (!/\.(ts|tsx|js|jsx|json|html|xml|webmanifest|example|md)$/i.test(filePath)) continue;
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = applyReplacements(original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
    changed += 1;
    console.log(path.relative(rootDir, filePath));
  }
}

console.log(`Updated ${changed} files.`);
