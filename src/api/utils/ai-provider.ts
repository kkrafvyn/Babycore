export type AiProviderId = 'openai' | 'qwen';

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiProviderConfig = {
  id: AiProviderId;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const normalizeProviderId = (value: unknown): AiProviderId => {
  const normalized = String(value || 'openai')
    .trim()
    .toLowerCase();

  return normalized === 'qwen' ? 'qwen' : 'openai';
};

export const resolveActiveAiProviderId = (override?: unknown): AiProviderId =>
  normalizeProviderId(override ?? process.env.AI_PROVIDER ?? 'openai');

export const resolveAiProviderConfig = (override?: unknown): AiProviderConfig | null => {
  const providerId = resolveActiveAiProviderId(override);

  if (providerId === 'qwen') {
    const apiKey = String(process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '').trim();
    if (!apiKey) {
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
  if (!apiKey) {
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

export async function requestAiChatCompletion(
  provider: AiProviderConfig,
  messages: AiChatMessage[],
  options: { temperature?: number } = {},
): Promise<{ content: string; model: string; provider: AiProviderId } | null> {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: options.temperature ?? 0.25,
      messages,
    }),
  });

  if (!response.ok) {
    console.warn(`Care copilot ${provider.id} request failed:`, response.status);
    return null;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  return {
    content: String(content).trim(),
    model: provider.model,
    provider: provider.id,
  };
}
