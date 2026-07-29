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
  done?: boolean;
  error?: string;
};

export type LocalAIStreamProgress = {
  chunks: number;
  receivedChars: number;
  elapsedMs: number;
};

type AskLocalAIOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  jsonSchema?: Record<string, unknown>;
  onProgress?: (progress: LocalAIStreamProgress) => void;
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
    timeoutMs: readNumberEnv('LOCAL_AI_TIMEOUT_MS', 180000),
    maxTokens: readNumberEnv('LOCAL_AI_MAX_TOKENS', 1536),
    contextTokens: readNumberEnv('LOCAL_AI_CONTEXT_TOKENS', 4096),
    numThread: readNumberEnv('LOCAL_AI_NUM_THREAD', 2),
    temperature: Number(process.env.LOCAL_AI_TEMPERATURE?.trim() || '0.2'),
    keepAlive: process.env.LOCAL_AI_KEEP_ALIVE?.trim() || '2m',
  };
}

export function getConfiguredLocalAIModel(): string {
  return process.env.LOCAL_AI_MODEL?.trim() || 'not-configured';
}

export async function getLocalAIStatus(): Promise<Record<string, unknown>> {
  const config = readLocalAIConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs, 5000));

  try {
    const endpoint = config.provider === 'ollama' ? '/api/tags' : '/models';
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      signal: controller.signal,
      headers: config.provider === 'openai-compatible'
        ? { Authorization: `Bearer ${config.apiKey}` }
        : undefined,
    });
    const data = response.ok ? await response.json() as Record<string, unknown> : {};
    const models = config.provider === 'ollama'
      ? (Array.isArray(data.models) ? data.models : [])
      : (Array.isArray(data.data) ? data.data : []);

    return {
      online: response.ok,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      models,
      message: response.ok ? 'Local AI is reachable.' : `Local AI returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      online: false,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      models: [],
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function unloadLocalAIModel(): Promise<Record<string, unknown>> {
  const config = readLocalAIConfig();

  if (config.provider !== 'ollama') {
    throw new Error('Model unload is only available for Ollama.');
  }

  const response = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, keep_alive: 0 }),
  });

  if (!response.ok) {
    throw new Error(`Unable to unload Ollama model: HTTP ${response.status}.`);
  }

  return { ok: true, model: config.model, message: 'Model unloaded from memory.' };
}

export async function askLocalAI(
  messages: ChatMessage[],
  options: AskLocalAIOptions = {}
): Promise<string> {
  const config = readLocalAIConfig();
  const timeoutMs = options.timeoutMs || config.timeoutMs;
  const maxTokens = options.maxTokens || config.maxTokens;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });

  try {
    if (options.signal?.aborted) {
      controller.abort();
    }

    if (config.provider === 'ollama') {
      return await askOllama(
        config,
        messages,
        controller.signal,
        maxTokens,
        options.jsonMode,
        options.jsonSchema,
        options.onProgress
      );
    }

    const content = await askOpenAICompatible(
      config,
      messages,
      controller.signal,
      maxTokens,
      options.jsonMode,
      options.jsonSchema
    );
    options.onProgress?.({
      chunks: 1,
      receivedChars: content.length,
      elapsedMs: 0,
    });
    return content;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message))) {
      if (options.signal?.aborted && !timedOut) {
        throw new Error('Local AI request was cancelled.');
      }
      throw new Error(`Local AI timed out after ${Math.round(timeoutMs / 1000)} seconds. Try Quick coverage again or use a faster model.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}

async function askOpenAICompatible(
  config: LocalAIConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
  maxTokens: number,
  jsonMode = false,
  jsonSchema?: Record<string, unknown>
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
      max_tokens: maxTokens,
      temperature: config.temperature,
      response_format: jsonSchema
        ? {
            type: 'json_schema',
            json_schema: {
              name: 'passmark_response',
              strict: true,
              schema: jsonSchema,
            },
          }
        : jsonMode
          ? { type: 'json_object' }
          : undefined,
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
  signal: AbortSignal,
  maxTokens: number,
  jsonMode = false,
  jsonSchema?: Record<string, unknown>,
  onProgress?: (progress: LocalAIStreamProgress) => void
): Promise<string> {
  const startedAt = Date.now();
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      stream: Boolean(onProgress),
      format: jsonSchema || (jsonMode ? 'json' : undefined),
      keep_alive: config.keepAlive,
      messages,
      options: {
        num_ctx: config.contextTokens,
        num_predict: maxTokens,
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

  if (!onProgress) {
    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content;

    if (!content) {
      throw new Error(`Ollama returned empty content: ${JSON.stringify(data)}`);
    }

    return content;
  }

  if (!response.body) {
    throw new Error('Ollama returned no response stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let chunks = 0;

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const data = JSON.parse(trimmed) as OllamaChatResponse;
    if (data.error) {
      throw new Error(`Ollama stream failed: ${data.error}`);
    }

    const fragment = data.message?.content || '';
    if (!fragment) return;

    content += fragment;
    chunks += 1;
    onProgress({
      chunks,
      receivedChars: content.length,
      elapsedMs: Date.now() - startedAt,
    });
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    lines.forEach(consumeLine);
    if (done) break;
  }

  consumeLine(buffer);

  if (!content) {
    throw new Error('Ollama returned an empty streamed response.');
  }

  return content;
}
