/**
 * OpenRouter AI Service
 * Single API key, multiple models (GPT + Gemini)
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
 *
 * Usage:
 *   createAIResponse("Give diet plan", "gpt")
 *   createAIResponse("Analyze food image", "gemini")
 *   createAIVisionResponse("What food is this?", imageBase64, "image/jpeg", "gemini")
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_MAP: Record<ModelType, string> = {
  gpt: "openai/gpt-4o-mini",
  gemini: "google/gemini-flash-1.5",
};

export type ModelType = "gpt" | "gemini";

export interface AIRequestOptions {
  systemPrompt?: string;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  return key;
}

async function callOpenRouter(
  body: Record<string, unknown>,
  retries = 2
): Promise<string> {
  const apiKey = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(OPENROUTER_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fitcoach.app",
          "X-Title": "FitCoach",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error("Empty response from OpenRouter");
      }
      return content;
    } catch (err: any) {
      lastError = err;
      console.warn(`[OpenRouter] Attempt ${attempt} failed:`, err.message);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw lastError ?? new Error("OpenRouter request failed");
}

/**
 * Send a text prompt to GPT or Gemini via OpenRouter.
 *
 * @example
 * const plan = await createAIResponse("Give diet plan", "gpt", { jsonMode: true });
 * const tip  = await createAIResponse("Motivate me", "gemini");
 */
export async function createAIResponse(
  prompt: string,
  modelType: ModelType,
  options: AIRequestOptions = {}
): Promise<string> {
  const {
    systemPrompt,
    jsonMode = false,
    maxTokens = 1024,
    temperature = 0.7,
    maxRetries = 2,
  } = options;

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const body: Record<string, unknown> = {
    model: MODEL_MAP[modelType],
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  return callOpenRouter(body, maxRetries);
}

/**
 * Send an image + text prompt to a vision-capable model via OpenRouter.
 * Uses Gemini Flash (vision) by default; can also use GPT-4o-mini.
 *
 * @example
 * const analysis = await createAIVisionResponse(
 *   "Analyze this food image",
 *   base64String,
 *   "image/jpeg",
 *   "gemini"
 * );
 */
export async function createAIVisionResponse(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  modelType: ModelType = "gemini",
  options: AIRequestOptions = {}
): Promise<string> {
  const { systemPrompt, maxTokens = 512, temperature = 0, maxRetries = 2 } =
    options;

  const userContent: unknown[] = [
    { type: "text", text: prompt },
    {
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${imageBase64}` },
    },
  ];

  const messages: { role: string; content: unknown }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userContent });

  const body: Record<string, unknown> = {
    model: MODEL_MAP[modelType],
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  return callOpenRouter(body, maxRetries);
}
