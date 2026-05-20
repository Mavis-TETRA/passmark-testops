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

type LocalAIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required. Set it in .env before calling the local AI API.`);
  }

  return value;
}

function readLocalAIConfig(): LocalAIConfig {
  return {
    baseUrl: readRequiredEnv('LOCAL_AI_BASE_URL').replace(/\/+$/, ''),
    apiKey: readRequiredEnv('LOCAL_AI_API_KEY'),
    model: readRequiredEnv('LOCAL_AI_MODEL'),
  };
}

export function getConfiguredLocalAIModel(): string {
  return process.env.LOCAL_AI_MODEL?.trim() || 'not-configured';
}

export async function askLocalAI(messages: ChatMessage[]): Promise<string> {
  const config = readLocalAIConfig();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
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
