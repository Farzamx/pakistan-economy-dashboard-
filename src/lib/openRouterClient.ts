// Centralized OpenRouter client with automatic model failover.
// All three AI features (Economic Health Score, Risk Intelligence, News Intelligence)
// route through this shared function rather than calling OpenRouter directly.
//
// Failover chain: each model is tried in sequence; a model is skipped on any of:
//   HTTP error, rate-limit (429), empty body, empty content, invalid JSON from
//   parseContent, or any thrown exception. Console logs show which model succeeded
//   and which failed (with reason), so the fallback path is always auditable.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Ordered fallback chain — primary first, lightweight backup last.
// Only models confirmed available on this account are included.
export const FALLBACK_CHAIN: string[] = [
  "nex-agi/nex-n2-pro:free",                   // primary: current model, 262k ctx
  "openai/gpt-oss-120b:free",                  // large reasoning: confirmed clean JSON, 3.9s
  "nousresearch/hermes-3-llama-3.1-405b:free", // structured-output specialist: 405B dense
  "openai/gpt-oss-20b:free",                   // lightweight backup: confirmed 2.7s
];

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "nex-agi/nex-n2-pro:free":                   "Nex-N2-Pro",
  "openai/gpt-oss-120b:free":                  "GPT-OSS 120B",
  "nousresearch/hermes-3-llama-3.1-405b:free": "Hermes 3 405B",
  "openai/gpt-oss-20b:free":                   "GPT-OSS 20B",
};

export function getModelDisplayName(modelId: string): string {
  return (
    MODEL_DISPLAY_NAMES[modelId] ??
    (modelId.split("/").pop()?.split(":")[0] ?? "AI")
  );
}

export interface OpenRouterCallConfig {
  revalidate: number;
  temperature?: number;
  taskLabel: string; // shown in console logs, e.g. "Economic Health Score"
}

export interface OpenRouterCallResult<T> {
  result: T;
  modelUsed: string;
  modelDisplayName: string;
}

interface OpenRouterApiResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Call OpenRouter with automatic failover across the FALLBACK_CHAIN.
 *
 * @param prompt        - The user-role message to send to the model
 * @param parseContent  - Pure function that parses the model's string response into T.
 *                        If it throws (SyntaxError, validation error, etc.) the client
 *                        moves to the next model rather than returning a bad result.
 * @param config        - revalidate (ISR seconds), optional temperature, task label for logs
 * @returns             - Parsed result + model metadata, or null if all models fail
 */
export async function callOpenRouter<T>(
  prompt: string,
  parseContent: (content: string) => T,
  config: OpenRouterCallConfig,
): Promise<OpenRouterCallResult<T> | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const { revalidate, temperature = 0.2, taskLabel } = config;

  for (const model of FALLBACK_CHAIN) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
        }),
        next: { revalidate },
      });

      if (!res.ok) {
        console.warn(`[AI/${taskLabel}] ${model} — HTTP ${res.status} ${res.statusText}`);
        continue;
      }

      // Must use res.text() + JSON.parse() — some models (e.g. nex-agi) prepend
      // whitespace/reasoning tokens before JSON, breaking Next.js's res.json().
      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/${taskLabel}] ${model} — empty response body`);
        continue;
      }

      const apiData = JSON.parse(rawText) as OpenRouterApiResponse;
      const content = apiData.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) {
        console.warn(`[AI/${taskLabel}] ${model} — empty message content`);
        continue;
      }

      // parseContent throws on invalid JSON or parse failure → caught below → try next model
      const result = parseContent(content);

      console.log(`[AI/${taskLabel}] Succeeded — model: ${model}`);
      return { result, modelUsed: model, modelDisplayName: getModelDisplayName(model) };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[AI/${taskLabel}] ${model} — ${reason}`);
    }
  }

  console.error(
    `[AI/${taskLabel}] All ${FALLBACK_CHAIN.length} models in failover chain failed. Using hardcoded fallback.`,
  );
  return null;
}
