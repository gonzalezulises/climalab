import type { ActionResult } from "@/types";

export type AiProviderName = "openai" | "anthropic" | "ollama";

export type AiProviderMetadata = {
  provider: AiProviderName | null;
  model: string | null;
};

export type AiInvocationOptions = {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

type AiEnvLike = {
  OPENAI_API_KEY?: string | undefined;
  OPENAI_MODEL?: string | undefined;
  ANTHROPIC_API_KEY?: string | undefined;
  ANTHROPIC_MODEL?: string | undefined;
  OLLAMA_BASE_URL?: string | undefined;
  OLLAMA_MODEL?: string | undefined;
  AI_GATEWAY_API_KEY?: string | undefined;
};

const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:72b";
const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1";

function getRuntimeAiEnv(): AiEnvLike {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  };
}

export function resolveAiProviderMetadata(aiEnv: AiEnvLike): AiProviderMetadata {
  if (aiEnv.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: aiEnv.OPENAI_MODEL ?? null,
    };
  }

  if (aiEnv.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      model: aiEnv.ANTHROPIC_MODEL ?? null,
    };
  }

  if (aiEnv.OLLAMA_BASE_URL) {
    return {
      provider: "ollama",
      model: aiEnv.OLLAMA_MODEL ?? null,
    };
  }

  return {
    provider: null,
    model: null,
  };
}

export function getAiProviderMetadata(): AiProviderMetadata {
  return resolveAiProviderMetadata(getRuntimeAiEnv());
}

export function hasConfiguredAiProvider(aiEnv: AiEnvLike = getRuntimeAiEnv()) {
  return resolveAiProviderMetadata(aiEnv).provider !== null;
}

export async function callAI(
  systemPrompt: string,
  userContent: string,
  opts?: AiInvocationOptions
): Promise<ActionResult<string>> {
  const aiEnv = getRuntimeAiEnv();
  const openaiKey = aiEnv.OPENAI_API_KEY;
  const anthropicKey = aiEnv.ANTHROPIC_API_KEY;
  const ollamaUrl = aiEnv.OLLAMA_BASE_URL;
  const gatewayKey = aiEnv.AI_GATEWAY_API_KEY;

  if (openaiKey) {
    return callOpenAI(
      openaiKey,
      aiEnv.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      systemPrompt,
      userContent,
      opts,
      gatewayKey
    );
  }

  if (anthropicKey) {
    return callAnthropic(
      anthropicKey,
      aiEnv.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
      systemPrompt,
      userContent,
      opts,
      gatewayKey
    );
  }

  if (ollamaUrl) {
    return callOllamaNative(
      ollamaUrl,
      aiEnv.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
      systemPrompt,
      userContent,
      opts
    );
  }

  return {
    success: false,
    error:
      "Motor de IA no configurado. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY o OLLAMA_BASE_URL.",
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  opts?: AiInvocationOptions,
  gatewayKey?: string
): Promise<ActionResult<string>> {
  try {
    const useGateway = Boolean(gatewayKey);
    const url = useGateway
      ? `${AI_GATEWAY_URL}/chat/completions`
      : "https://api.anthropic.com/v1/messages";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useGateway) {
      headers.Authorization = `Bearer ${gatewayKey}`;
      headers["x-provider-api-key"] = apiKey;
    } else {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    }

    const body = useGateway
      ? {
          model: `anthropic/${model}`,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          max_tokens: opts?.maxTokens ?? 4096,
          temperature: opts?.temperature ?? 0.3,
        }
      : {
          model,
          max_tokens: opts?.maxTokens ?? 4096,
          temperature: opts?.temperature ?? 0.3,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts?.timeout ?? 60_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        success: false,
        error: `Error de Anthropic (${response.status}): ${body.slice(0, 200)}`,
      };
    }

    const data = await response.json();

    if (useGateway) {
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      return { success: true, data: content };
    } else {
      const content: string = data?.content?.[0]?.text ?? "";
      return { success: true, data: content };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión con Anthropic";
    return { success: false, error: message };
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  opts?: AiInvocationOptions,
  gatewayKey?: string
): Promise<ActionResult<string>> {
  try {
    const useGateway = Boolean(gatewayKey);
    const url = useGateway
      ? `${AI_GATEWAY_URL}/chat/completions`
      : "https://api.openai.com/v1/chat/completions";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useGateway) {
      headers.Authorization = `Bearer ${gatewayKey}`;
      headers["x-provider-api-key"] = apiKey;
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: useGateway ? `openai/${model}` : model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 4096,
      }),
      signal: AbortSignal.timeout(opts?.timeout ?? 60_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        success: false,
        error: `Error de OpenAI (${response.status}): ${body.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return { success: true, data: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión con OpenAI";
    return { success: false, error: message };
  }
}

async function callOllamaNative(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  opts?: AiInvocationOptions
): Promise<ActionResult<string>> {
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        stream: false,
        options: {
          temperature: opts?.temperature ?? 0.3,
          num_predict: opts?.maxTokens ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(opts?.timeout ?? 120_000),
    });

    if (!response.ok) {
      return { success: false, error: `Error del modelo (${response.status})` };
    }

    const data = await response.json();
    const content: string = data?.message?.content ?? "";
    return { success: true, data: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión con el modelo";
    return { success: false, error: message };
  }
}
