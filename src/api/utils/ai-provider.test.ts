import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveActiveAiProviderId,
  resolveAiProviderConfig,
} from './ai-provider.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('ai-provider', () => {
  it('defaults to openai', () => {
    delete process.env.AI_PROVIDER;
    expect(resolveActiveAiProviderId()).toBe('openai');
  });

  it('selects qwen when AI_PROVIDER=qwen', () => {
    process.env.AI_PROVIDER = 'qwen';
    process.env.QWEN_API_KEY = 'qwen-key';
    process.env.QWEN_MODEL = 'qwen-plus';

    const config = resolveAiProviderConfig();
    expect(config?.id).toBe('qwen');
    expect(config?.model).toBe('qwen-plus');
    expect(config?.baseUrl).toContain('dashscope.aliyuncs.com');
  });

  it('selects openai when AI_PROVIDER=openai', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';

    const config = resolveAiProviderConfig();
    expect(config?.id).toBe('openai');
    expect(config?.model).toBe('gpt-4o-mini');
    expect(config?.baseUrl).toContain('api.openai.com');
  });

  it('returns null when the active provider key is missing', () => {
    process.env.AI_PROVIDER = 'qwen';
    delete process.env.QWEN_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;

    expect(resolveAiProviderConfig()).toBeNull();
  });
});
