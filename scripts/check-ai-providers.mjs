#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const repoRoot = process.cwd();

const readEnvFile = (filename) => {
  const filePath = path.join(repoRoot, filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
};

const applyEnv = (values) => {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }
    process.env[key] = String(value);
  }
};

// Prefer explicit .env AI keys; ignore empty overrides from pulled Vercel env files.
const baseEnv = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
};

applyEnv(baseEnv);

for (const [key, value] of Object.entries(readEnvFile('.env.production.local'))) {
  if (/^(OPENAI|QWEN|DASHSCOPE|AI)_/i.test(key) && String(value || '').trim() === '') {
    continue;
  }
  process.env[key] = String(value);
}

const trimTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '');

const isPlaceholder = (value) =>
  /your_|sk_your|example|changeme|placeholder/i.test(String(value || '').trim());

const buildProvider = (providerId) => {
  if (providerId === 'qwen') {
    const apiKey = String(process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '').trim();
    if (!apiKey || isPlaceholder(apiKey)) {
      return null;
    }

    return {
      id: 'qwen',
      label: 'Qwen',
      apiKey,
      baseUrl: trimTrailingSlashes(
        process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      ),
      model: String(process.env.QWEN_MODEL || 'qwen-turbo').trim() || 'qwen-turbo',
    };
  }

  const apiKey = String(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '').trim();
  if (!apiKey || isPlaceholder(apiKey)) {
    return null;
  }

  return {
    id: 'openai',
    label: 'OpenAI',
    apiKey,
    baseUrl: trimTrailingSlashes(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
    model: String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini',
  };
};

const testProvider = async (providerId) => {
  const provider = buildProvider(providerId);
  if (!provider) {
    return {
      provider: providerId,
      ok: false,
      skipped: true,
      error: 'Missing or placeholder API key',
    };
  }

  const started = Date.now();
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Reply with exactly OK.' },
        { role: 'user', content: 'Say OK.' },
      ],
    }),
  });

  const latencyMs = Date.now() - started;
  const rawBody = await response.text();
  let payload = null;

  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.message ||
      rawBody.slice(0, 240) ||
      `HTTP ${response.status}`;

    return {
      provider: providerId,
      ok: false,
      model: provider.model,
      status: response.status,
      latencyMs,
      error: apiMessage,
    };
  }

  const content = String(payload?.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    return {
      provider: providerId,
      ok: false,
      model: provider.model,
      status: response.status,
      latencyMs,
      error: 'API returned 200 but no message content',
    };
  }

  return {
    provider: providerId,
    ok: true,
    model: provider.model,
    status: response.status,
    latencyMs,
    preview: content.slice(0, 80),
  };
};

const activeProvider = String(process.env.AI_PROVIDER || 'openai').trim().toLowerCase();

console.log('\nCradlyn AI provider check\n');
console.log(`Active provider (AI_PROVIDER): ${activeProvider}`);
console.log('');

const results = [];
for (const providerId of ['openai', 'qwen']) {
  const result = await testProvider(providerId);
  results.push(result);

  const marker = result.ok ? 'PASS' : result.skipped ? 'SKIP' : 'FAIL';
  console.log(`[${marker}] ${providerId}`);
  if (result.model) {
    console.log(`  model: ${result.model}`);
  }
  if (result.latencyMs !== undefined) {
    console.log(`  latency: ${result.latencyMs}ms`);
  }
  if (result.preview) {
    console.log(`  reply: ${result.preview}`);
  }
  if (result.error) {
    console.log(`  error: ${result.error}`);
  }
  console.log('');
}

const activeResult = results.find((result) => result.provider === activeProvider);
if (!activeResult?.ok) {
  console.error('Active AI provider is not working. Care Copilot will fall back to rule-based responses.');
  process.exit(1);
}

console.log('Active AI provider is ready for Care Copilot.\n');
