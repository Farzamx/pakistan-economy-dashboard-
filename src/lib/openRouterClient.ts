// Centralized AI client with PROVIDER-level failover, not just model-level.
// All three AI features (Economic Health Score, Risk Intelligence, News Intelligence)
// route through this shared function rather than calling any provider directly.
//
// Chain: 3 OpenRouter models, each independently retried -> Groq (a
// completely independent inference provider/infrastructure, not just a
// different model on the same backend) -> null (callers substitute their
// own hardcoded fallback, e.g. NEUTRAL_TAG in intelligence.ts). This closes
// the gap where an OpenRouter-wide outage (e.g. account-level 429) used to
// fail every model in the chain together, since they all shared one
// provider — Groq has its own separate API key, billing, and rate limits,
// so it stays up independently of OpenRouter's state.
//
// Retry: each step gets up to 2 attempts, but ONLY for fast-failing
// retryable HTTP statuses (429/500/502/503/504) — a genuine timeout/abort is
// NOT retried on the same endpoint. If a model doesn't respond within
// MODEL_TIMEOUT_MS once, retrying the same slow/hanging endpoint would
// spend a second full timeout window for little chance of success; moving
// to the next step in the chain recovers faster than waiting twice on the
// same one. This keeps worst-case latency close to the pre-retry baseline
// (one timeout per step, not two) while still giving fast-failing rate
// limits a real second chance with backoff.
//
// nex-agi/nex-n2-pro:free was removed from the OpenRouter chain (2026-06) —
// it frequently returned HTTP 429, and with no per-call timeout previously
// in place, a slow or hanging 429 could burn several seconds before the
// next model was tried. Ordered by *confirmed* latency (see inline
// comments) so the fastest reliable model is tried first.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Per-attempt call timeout. If a model doesn't respond within this window
// (slow, rate-limited without a fast 429, or hanging), abort and move on
// rather than waiting indefinitely — this is the single biggest lever for
// cutting tail latency, since one hanging call used to be able to consume
// most of a 10-12s budget on its own.
export const MODEL_TIMEOUT_MS = Number(process.env.AI_MODEL_TIMEOUT_MS ?? 6000);

// Ordered OpenRouter fallback chain — fastest confirmed model first,
// heaviest/largest last. Only models confirmed available on this account
// are included.
export const FALLBACK_CHAIN: string[] = [
  "openai/gpt-oss-20b:free",                   // fastest confirmed: ~2.7s, lightweight
  "openai/gpt-oss-120b:free",                  // large reasoning: confirmed clean JSON, ~3.9s
  "nousresearch/hermes-3-llama-3.1-405b:free", // structured-output specialist: 405B dense, slowest — last resort
];

// Groq's flagship production model (console.groq.com/docs/models, checked
// at implementation time) — 120B, 131k context, ~500 tok/s. Deliberately
// the same underlying model family already proven in FALLBACK_CHAIN above
// to return clean, parseable JSON for this app's exact prompts, just on an
// entirely independent host — picked for consistency of behavior, not
// because it has to be a different model from OpenRouter's.
export const GROQ_MODEL = "openai/gpt-oss-120b";

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "openai/gpt-oss-120b:free": "GPT-OSS 120B",
  "nousresearch/hermes-3-llama-3.1-405b:free": "Hermes 3 405B",
  "openai/gpt-oss-20b:free": "GPT-OSS 20B",
  [GROQ_MODEL]: "GPT-OSS 120B (Groq)",
};

export function getModelDisplayName(modelId: string): string {
  return (
    MODEL_DISPLAY_NAMES[modelId] ??
    (modelId.split("/").pop()?.split(":")[0] ?? "AI")
  );
}

export type AiProvider = "OpenRouter" | "Groq";

export interface OpenRouterCallConfig {
  revalidate: number;
  temperature?: number;
  taskLabel: string; // shown in console logs, e.g. "Economic Health Score"
}

export interface OpenRouterCallResult<T> {
  result: T;
  modelUsed: string;
  modelDisplayName: string;
  provider: AiProvider;
  latencyMs: number;
}

interface ChatApiResponse {
  choices?: { message?: { content?: string } }[];
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
// 1 initial attempt + 1 retry. Deliberately small — this is a per-STEP
// budget on top of an already multi-step chain (3 OpenRouter models + Groq),
// not a replacement for the chain itself. See file header for why timeouts
// are excluded from the retry path.
const MAX_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type StepOutcome<T> = { ok: true; result: T; latencyMs: number; httpStatus: number } | { ok: false; reason: string; latencyMs: number };

/**
 * One provider/model "step": POSTs `prompt` to `url`, retrying up to
 * MAX_ATTEMPTS times with exponential backoff for retryable HTTP statuses
 * only. Never logs the API key — only the model/provider label, status, and
 * timing are written to the console.
 */
async function attemptStep<T>(
  label: string,
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
  revalidate: number,
  parseContent: (content: string) => T,
  taskLabel: string,
): Promise<StepOutcome<T>> {
  let lastLatency = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    const callStart = Date.now();
    try {
      const res = await fetch(url, {
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
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - callStart;
      lastLatency = latencyMs;

      if (!res.ok) {
        const retryable = RETRYABLE_STATUS.has(res.status);
        const willRetry = retryable && attempt < MAX_ATTEMPTS;
        console.warn(`[AI/${taskLabel}] ${label} — HTTP ${res.status} ${res.statusText} (${latencyMs}ms)${willRetry ? ", retrying..." : ""}`);
        if (willRetry) {
          await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        return { ok: false, reason: String(res.status), latencyMs };
      }

      // Must use res.text() + JSON.parse() — some models prepend whitespace or
      // reasoning tokens before the JSON body, breaking Next.js's res.json().
      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/${taskLabel}] ${label} — empty response body (${latencyMs}ms)`);
        return { ok: false, reason: "empty response body", latencyMs };
      }

      const apiData = JSON.parse(rawText) as ChatApiResponse;
      const content = apiData.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) {
        console.warn(`[AI/${taskLabel}] ${label} — empty message content (${latencyMs}ms)`);
        return { ok: false, reason: "empty message content", latencyMs };
      }

      // parseContent throws on invalid JSON or parse failure -> caught below,
      // no retry (deterministic failure — retrying the same input would
      // produce the same bad output), move straight to the next step.
      const result = parseContent(content);
      return { ok: true, result, latencyMs, httpStatus: res.status };
    } catch (err) {
      clearTimeout(timer);
      const latencyMs = Date.now() - callStart;
      lastLatency = latencyMs;
      const aborted = err instanceof Error && err.name === "AbortError";
      const reason = aborted ? "Timeout" : err instanceof Error ? err.message : String(err);
      console.warn(`[AI/${taskLabel}] ${label} — ${reason} (${latencyMs}ms)`);
      // Timeouts/network errors are not retried on the same endpoint — see
      // file header. Parse failures land here too (same reasoning).
      return { ok: false, reason, latencyMs };
    }
  }
  return { ok: false, reason: "exhausted retries", latencyMs: lastLatency };
}

function logSuccess(provider: AiProvider, model: string, latencyMs: number, taskLabel: string): void {
  console.log(
    `[AI/${taskLabel}]\nProvider: ${provider}\nModel: ${model}\nLatency: ${(latencyMs / 1000).toFixed(2)}s\nStatus: Success`,
  );
}

/**
 * Call the AI failover chain: OpenRouter's 3 models, then Groq, each with
 * its own bounded retry — independent providers, not just independent
 * models, so a provider-wide outage on one no longer takes down the whole
 * chain.
 *
 * @param prompt        - The user-role message to send to the model
 * @param parseContent  - Pure function that parses the model's string response into T.
 *                        If it throws (SyntaxError, validation error, etc.) the client
 *                        moves to the next step rather than returning a bad result.
 * @param config        - revalidate (ISR seconds), optional temperature, task label for logs
 * @returns             - Parsed result + model/provider metadata, or null if every step failed
 */
export async function callOpenRouter<T>(
  prompt: string,
  parseContent: (content: string) => T,
  config: OpenRouterCallConfig,
): Promise<OpenRouterCallResult<T> | null> {
  const { revalidate, temperature = 0.2, taskLabel } = config;
  const failureLog: string[] = [];

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    for (let i = 0; i < FALLBACK_CHAIN.length; i++) {
      const model = FALLBACK_CHAIN[i];
      const label = `OpenRouter Model ${i + 1} (${model})`;
      const outcome = await attemptStep(label, OPENROUTER_URL, openRouterKey, model, prompt, temperature, revalidate, parseContent, taskLabel);
      if (outcome.ok) {
        logSuccess("OpenRouter", model, outcome.latencyMs, taskLabel);
        return { result: outcome.result, modelUsed: model, modelDisplayName: getModelDisplayName(model), provider: "OpenRouter", latencyMs: outcome.latencyMs };
      }
      failureLog.push(`OpenRouter Model ${i + 1} → ${outcome.reason}`);
    }
  } else {
    failureLog.push("OpenRouter → no OPENROUTER_API_KEY configured");
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const outcome = await attemptStep("Groq", GROQ_URL, groqKey, GROQ_MODEL, prompt, temperature, revalidate, parseContent, taskLabel);
    if (outcome.ok) {
      logSuccess("Groq", GROQ_MODEL, outcome.latencyMs, taskLabel);
      return { result: outcome.result, modelUsed: GROQ_MODEL, modelDisplayName: getModelDisplayName(GROQ_MODEL), provider: "Groq", latencyMs: outcome.latencyMs };
    }
    failureLog.push(`Groq → ${outcome.reason}`);
  } else {
    failureLog.push("Groq → no GROQ_API_KEY configured");
  }

  console.error(`[AI/${taskLabel}]\nProvider: Hardcoded Fallback\nReason:\n${failureLog.map((l) => `- ${l}`).join("\n")}`);
  return null;
}
