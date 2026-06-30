// Centralized AI client with PROVIDER-level failover, not just model-level.
// All AI features (Economic Health Score, Risk Intelligence, News
// Intelligence, and — as of the Production Reliability & Institutional
// Upgrade, Part 8 — the chat Assistant) route through this shared function
// rather than calling any provider directly. Provider logic exists in
// exactly one place.
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
//
// PROVIDER HEALTH TRACKING (Production Audit Part 7): a process-local
// in-memory map tracks consecutive failures, last success/failure, and
// recent latency per model. A model that returns 429 is put into cooldown
// immediately (a 429 is an explicit, authoritative "stop hitting me right
// now" signal, not a one-off blip); other failure types trigger a cooldown
// after 2 consecutive failures. Models currently in cooldown are skipped
// entirely — not retried, not even attempted — and the remaining models
// are tried in ascending order of recent failure count, so a chain that's
// "learned" one model is unhealthy converges on a working one much faster
// than the original always-try-in-fixed-order behavior. This is
// process-local (resets per serverless cold start), which is a real
// limitation on Vercel's multi-instance model — see getProviderHealth()'s
// own comment — but still meaningfully reduces repeat-hammering of a
// model that just 429'd within the same warm instance, which is exactly
// the pattern visible in the logs that motivated this change.

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Per-attempt call timeout. If a model doesn't respond within this window
// (slow, rate-limited without a fast 429, or hanging), abort and move on
// rather than waiting indefinitely — this is the single biggest lever for
// cutting tail latency, since one hanging call used to be able to consume
// most of a 10-12s budget on its own.
export const MODEL_TIMEOUT_MS = Number(process.env.AI_MODEL_TIMEOUT_MS ?? 6000);

// Ordered OpenRouter fallback chain — fastest confirmed model first,
// heaviest/largest last. Only models confirmed available on this account
// are included. This is the BASE order; getOrderedSteps() below adjusts it
// per-call based on live health (skipping cooldowns, prioritizing models
// with fewer recent failures) rather than always using this fixed order.
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

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterCallConfig {
  revalidate: number;
  temperature?: number;
  maxTokens?: number;
  taskLabel: string; // shown in console logs, e.g. "Economic Health Score"
  /**
   * Task-specific routing (Production Audit Part 7): try this provider's
   * step(s) before the rest of the chain, instead of always starting with
   * OpenRouter. The rest of the chain still runs as a fallback if the
   * preferred provider fails — this narrows priority, it doesn't remove
   * resilience. No current caller sets this (see file header for why); the
   * capability exists for a workload that should default to the paid,
   * less rate-limited Groq tier.
   */
  preferProvider?: AiProvider;
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

// ── Provider health tracking ────────────────────────────────────────────

interface ModelHealth {
  totalAttempts: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastFailureReason: string | null;
  recentLatenciesMs: number[]; // ring buffer, most recent last
  cooldownUntil: number | null;
}

const RECENT_LATENCIES_MAX = 20;
const COOLDOWN_AFTER_CONSECUTIVE_FAILURES = 2;
const RATE_LIMIT_COOLDOWN_MS = 30_000; // 429 — assume it may clear soon, but don't hammer it
const GENERIC_COOLDOWN_MS = 15_000; // timeout/5xx/parse failure after repeated occurrences
const MAX_COOLDOWN_MS = 5 * 60_000; // doubles per repeated 429, capped here

const healthByStep = new Map<string, ModelHealth>();

function getHealth(stepKey: string): ModelHealth {
  let health = healthByStep.get(stepKey);
  if (!health) {
    health = { totalAttempts: 0, totalSuccesses: 0, consecutiveFailures: 0, lastSuccessAt: null, lastFailureAt: null, lastFailureReason: null, recentLatenciesMs: [], cooldownUntil: null };
    healthByStep.set(stepKey, health);
  }
  return health;
}

function isInCooldown(stepKey: string): boolean {
  const health = healthByStep.get(stepKey);
  return !!health?.cooldownUntil && health.cooldownUntil > Date.now();
}

function recordAttempt(stepKey: string, latencyMs: number): void {
  const health = getHealth(stepKey);
  health.totalAttempts++;
  health.recentLatenciesMs.push(latencyMs);
  if (health.recentLatenciesMs.length > RECENT_LATENCIES_MAX) health.recentLatenciesMs.shift();
}

function recordSuccess(stepKey: string): void {
  const health = getHealth(stepKey);
  health.totalSuccesses++;
  health.consecutiveFailures = 0;
  health.lastSuccessAt = Date.now();
  health.cooldownUntil = null;
}

function recordFailure(stepKey: string, reason: string, isRateLimit: boolean): void {
  const health = getHealth(stepKey);
  health.consecutiveFailures++;
  health.lastFailureAt = Date.now();
  health.lastFailureReason = reason;

  if (isRateLimit) {
    // Doubles on repeated rate-limit hits while in/just-out-of cooldown,
    // capped at MAX_COOLDOWN_MS — a model that keeps 429ing gets backed off
    // further each time rather than retried at a fixed interval forever.
    const priorCooldownMs = health.cooldownUntil ? RATE_LIMIT_COOLDOWN_MS : RATE_LIMIT_COOLDOWN_MS;
    const multiplier = Math.min(2 ** Math.max(0, health.consecutiveFailures - 1), MAX_COOLDOWN_MS / priorCooldownMs);
    health.cooldownUntil = Date.now() + Math.min(priorCooldownMs * multiplier, MAX_COOLDOWN_MS);
  } else if (health.consecutiveFailures >= COOLDOWN_AFTER_CONSECUTIVE_FAILURES) {
    health.cooldownUntil = Date.now() + GENERIC_COOLDOWN_MS;
  }
}

export interface ProviderHealthSnapshot {
  step: string;
  provider: AiProvider;
  model: string;
  totalAttempts: number;
  totalSuccesses: number;
  successRatePct: number | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  avgLatencyMs: number | null;
  inCooldown: boolean;
  cooldownUntil: string | null;
}

/**
 * Snapshot of every model's tracked health, for the internal System Health
 * page (Part 11). Process-local — on Vercel's multi-instance serverless
 * model this reflects only the instance that happens to serve the request,
 * not a global view. Still useful operationally: it shows what THIS
 * warm instance has actually observed recently, which is exactly the
 * cooldown state currently shaping its own routing decisions.
 */
export function getProviderHealthSnapshot(): ProviderHealthSnapshot[] {
  const steps = [
    ...FALLBACK_CHAIN.map((m) => ({ provider: "OpenRouter" as AiProvider, model: m })),
    { provider: "Groq" as AiProvider, model: GROQ_MODEL },
  ];
  return steps.map(({ provider, model }) => {
    const stepKey = `${provider}:${model}`;
    const health = healthByStep.get(stepKey);
    const avgLatencyMs = health && health.recentLatenciesMs.length > 0
      ? Math.round(health.recentLatenciesMs.reduce((a, b) => a + b, 0) / health.recentLatenciesMs.length)
      : null;
    return {
      step: stepKey,
      provider,
      model,
      totalAttempts: health?.totalAttempts ?? 0,
      totalSuccesses: health?.totalSuccesses ?? 0,
      successRatePct: health && health.totalAttempts > 0 ? Math.round((health.totalSuccesses / health.totalAttempts) * 100) : null,
      consecutiveFailures: health?.consecutiveFailures ?? 0,
      lastSuccessAt: health?.lastSuccessAt ? new Date(health.lastSuccessAt).toISOString() : null,
      lastFailureAt: health?.lastFailureAt ? new Date(health.lastFailureAt).toISOString() : null,
      lastFailureReason: health?.lastFailureReason ?? null,
      avgLatencyMs,
      inCooldown: isInCooldown(stepKey),
      cooldownUntil: health?.cooldownUntil ? new Date(health.cooldownUntil).toISOString() : null,
    };
  });
}

// ── Attempt mechanics ───────────────────────────────────────────────────

type StepOutcome<T> = { ok: true; result: T; latencyMs: number; httpStatus: number } | { ok: false; reason: string; latencyMs: number; isRateLimit: boolean };

/**
 * One provider/model "step": POSTs `messages` to `url`, retrying up to
 * MAX_ATTEMPTS times with exponential backoff for retryable HTTP statuses
 * only. Never logs the API key — only the model/provider label, status, and
 * timing are written to the console.
 */
async function attemptStep<T>(
  label: string,
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number | undefined,
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
          messages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
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
        return { ok: false, reason: String(res.status), latencyMs, isRateLimit: res.status === 429 };
      }

      // Must use res.text() + JSON.parse() — some models prepend whitespace or
      // reasoning tokens before the JSON body, breaking Next.js's res.json().
      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/${taskLabel}] ${label} — empty response body (${latencyMs}ms)`);
        return { ok: false, reason: "empty response body", latencyMs, isRateLimit: false };
      }

      const apiData = JSON.parse(rawText) as ChatApiResponse;
      const content = apiData.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) {
        console.warn(`[AI/${taskLabel}] ${label} — empty message content (${latencyMs}ms)`);
        return { ok: false, reason: "empty message content", latencyMs, isRateLimit: false };
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
      return { ok: false, reason, latencyMs, isRateLimit: false };
    }
  }
  return { ok: false, reason: "exhausted retries", latencyMs: lastLatency, isRateLimit: false };
}

function logSuccess(provider: AiProvider, model: string, latencyMs: number, taskLabel: string): void {
  console.log(
    `[AI/${taskLabel}]\nProvider: ${provider}\nModel: ${model}\nLatency: ${(latencyMs / 1000).toFixed(2)}s\nStatus: Success`,
  );
}

interface Step {
  provider: AiProvider;
  model: string;
  url: string;
  apiKey: string;
}

/**
 * Builds the attempt order for this call: starts from FALLBACK_CHAIN (+
 * Groq last, unless preferProvider asks for Groq first), drops any step
 * currently in cooldown, then sorts the rest by ascending consecutive
 * failure count — a model with 0 recent failures is tried before one with
 * 1, even if the latter is earlier in the static FALLBACK_CHAIN order.
 * Cooled-down steps aren't dropped silently — see the "skipped (cooldown)"
 * log line in callOpenRouter.
 */
function getOrderedSteps(openRouterKey: string | undefined, groqKey: string | undefined, preferProvider: AiProvider | undefined): { steps: Step[]; skipped: string[] } {
  const all: Step[] = [];
  if (openRouterKey) {
    for (const model of FALLBACK_CHAIN) all.push({ provider: "OpenRouter", model, url: OPENROUTER_URL, apiKey: openRouterKey });
  }
  if (groqKey) all.push({ provider: "Groq", model: GROQ_MODEL, url: GROQ_URL, apiKey: groqKey });

  if (preferProvider) {
    all.sort((a, b) => (a.provider === preferProvider ? -1 : 0) - (b.provider === preferProvider ? -1 : 0));
  }

  const skipped: string[] = [];
  const available: Step[] = [];
  for (const step of all) {
    const stepKey = `${step.provider}:${step.model}`;
    if (isInCooldown(stepKey)) {
      skipped.push(stepKey);
    } else {
      available.push(step);
    }
  }

  // Stable sort by ascending consecutive-failure count within the
  // (already provider-preferred, cooldown-filtered) order above.
  const withHealth = available.map((step, originalIndex) => ({ step, originalIndex, failures: getHealth(`${step.provider}:${step.model}`).consecutiveFailures }));
  withHealth.sort((a, b) => a.failures - b.failures || a.originalIndex - b.originalIndex);

  return { steps: withHealth.map((w) => w.step), skipped };
}

/**
 * Call the AI failover chain: OpenRouter's models, then Groq (or Groq
 * first if preferProvider is set), each with its own bounded retry,
 * dynamically reordered and filtered by live provider health.
 *
 * @param promptOrMessages - A single user-role prompt string (existing
 *                        callers), or a full message array (system/history/
 *                        user) for multi-turn callers like the Assistant.
 * @param parseContent  - Pure function that parses the model's string response into T.
 *                        If it throws (SyntaxError, validation error, etc.) the client
 *                        moves to the next step rather than returning a bad result.
 * @param config        - revalidate (ISR seconds), optional temperature/maxTokens/
 *                        preferProvider, task label for logs
 * @returns             - Parsed result + model/provider metadata, or null if every step failed
 */
export async function callOpenRouter<T>(
  promptOrMessages: string | ChatMessage[],
  parseContent: (content: string) => T,
  config: OpenRouterCallConfig,
): Promise<OpenRouterCallResult<T> | null> {
  const { revalidate, temperature = 0.2, maxTokens, taskLabel, preferProvider } = config;
  const messages: ChatMessage[] = typeof promptOrMessages === "string" ? [{ role: "user", content: promptOrMessages }] : promptOrMessages;
  const failureLog: string[] = [];

  const { steps, skipped } = getOrderedSteps(process.env.OPENROUTER_API_KEY, process.env.GROQ_API_KEY, preferProvider);
  if (skipped.length > 0) {
    console.log(`[AI/${taskLabel}] Skipping (cooldown): ${skipped.join(", ")}`);
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepKey = `${step.provider}:${step.model}`;
    const label = step.provider === "OpenRouter" ? `OpenRouter (${step.model})` : "Groq";
    const outcome = await attemptStep(label, step.url, step.apiKey, step.model, messages, temperature, maxTokens, revalidate, parseContent, taskLabel);
    recordAttempt(stepKey, outcome.latencyMs);

    if (outcome.ok) {
      recordSuccess(stepKey);
      logSuccess(step.provider, step.model, outcome.latencyMs, taskLabel);
      return { result: outcome.result, modelUsed: step.model, modelDisplayName: getModelDisplayName(step.model), provider: step.provider, latencyMs: outcome.latencyMs };
    }

    recordFailure(stepKey, outcome.reason, outcome.isRateLimit);
    failureLog.push(`${label} → ${outcome.reason}`);
  }

  if (!process.env.OPENROUTER_API_KEY) failureLog.push("OpenRouter → no OPENROUTER_API_KEY configured");
  if (!process.env.GROQ_API_KEY) failureLog.push("Groq → no GROQ_API_KEY configured");

  console.error(`[AI/${taskLabel}]\nProvider: Hardcoded Fallback\nReason:\n${failureLog.map((l) => `- ${l}`).join("\n")}`);
  return null;
}
