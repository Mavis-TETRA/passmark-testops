import dotenv from 'dotenv';

dotenv.config();

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type LocalAIResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
};

type OllamaChatResponse = {
  message?: {
    role?: string;
    content?: string;
  };
  error?: string;
};

type LocalAIConfig = {
  provider: 'ollama' | 'openai-compatible';
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  contextTokens: number;
  numThread: number;
  temperature: number;
  keepAlive: string;
};

function readRequiredEnv(name: string, hint = 'Set it in .env before calling the local AI API.'): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required. ${hint}`);
  }

  return value;
}

function readNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]?.trim());
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readProvider(): LocalAIConfig['provider'] {
  const provider = process.env.LOCAL_AI_PROVIDER?.trim().toLowerCase();
  return provider === 'openai-compatible' ? 'openai-compatible' : 'ollama';
}

function normalizeBaseUrl(baseUrl: string, provider: LocalAIConfig['provider']): string {
  const normalized = baseUrl.replace(/\/+$/, '');

  if (provider === 'ollama') {
    return normalized.replace(/\/v1$/i, '');
  }

  return normalized;
}

function readLocalAIConfig(): LocalAIConfig {
  const provider = readProvider();
  const baseUrl = readRequiredEnv(
    'LOCAL_AI_BASE_URL',
    provider === 'ollama'
      ? 'For Ollama use http://localhost:11434 on the host or http://ollama:11434 in Docker.'
      : 'For OpenAI-compatible providers use the /v1 base URL.'
  );

  return {
    provider,
    baseUrl: normalizeBaseUrl(baseUrl, provider),
    apiKey: process.env.LOCAL_AI_API_KEY?.trim() || 'ollama',
    model: readRequiredEnv('LOCAL_AI_MODEL'),
    timeoutMs: readNumberEnv('LOCAL_AI_TIMEOUT_MS', 120000),
    maxTokens: readNumberEnv('LOCAL_AI_MAX_TOKENS', 1536),
    contextTokens: readNumberEnv('LOCAL_AI_CONTEXT_TOKENS', 2048),
    numThread: readNumberEnv('LOCAL_AI_NUM_THREAD', 2),
    temperature: Number(process.env.LOCAL_AI_TEMPERATURE?.trim() || '0.2'),
    keepAlive: process.env.LOCAL_AI_KEEP_ALIVE?.trim() || '2m',
  };
}

export function getConfiguredLocalAIModel(): string {
  return process.env.LOCAL_AI_MODEL?.trim() || 'not-configured';
}

export async function askLocalAI(messages: ChatMessage[]): Promise<string> {
  const config = readLocalAIConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    if (config.provider === 'ollama') {
      return await askOllama(config, messages, controller.signal);
    }

    return await askOpenAICompatible(config, messages, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function askOpenAICompatible(
  config: LocalAIConfig,
  messages: ChatMessage[],
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Local AI request failed: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = (await response.json()) as LocalAIResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`Local AI returned empty content: ${JSON.stringify(data)}`);
  }

  return content;
}

async function askOllama(
  config: LocalAIConfig,
  messages: ChatMessage[],
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      keep_alive: config.keepAlive,
      messages,
      options: {
        num_ctx: config.contextTokens,
        num_predict: config.maxTokens,
        num_thread: config.numThread,
        temperature: config.temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.message?.content;

  if (!content) {
    throw new Error(`Ollama returned empty content: ${JSON.stringify(data)}`);
  }

  return content;
}
