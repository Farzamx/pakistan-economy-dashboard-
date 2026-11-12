// Safeguards for the two anonymous, paid-model endpoints the Overview page embeds: /api/assistant and /api/assistant/translate (G.15).
//
// WHY. With the Overview-only access policy (accessPolicy.ts) these are the only open endpoints that spend money on a visitor's behalf (a Tavily search and an AI
// model chain, ending in a billed Groq backstop), and there is no login to tie a visitor to an account. Before this file they had no size limit, no rate limit,
// no origin check, and trusted the client-sent dashboard context and chat history verbatim (injected into the system prompt, roles included).
//
// WHAT. Narrow, in-process safeguards that need no login, no database and no new dependency:
//   - same-origin only (blocks other websites and browsers' cross-site use; a script that forges headers is stopped by the limits below, not by this);
//   - body-size and field-length caps, strict shapes, and sanitising of the context and history (the only roles accepted are user and assistant);
//   - per-client and per-instance rate limits, an in-flight cap, and a per-instance hourly budget of paid calls: counted only when a paid call is about to run
//     (a knowledge-base answer or a cached translation costs nothing and is never counted);
//   - a kill switch (ASSISTANT_DISABLED=1) that turns both paid endpoints off without touching the Overview;
//   - bounded memory for every structure here.
//
// LIMITS OF THE DESIGN (stated, not hidden). The counters live in the server process. Vercel can run several instances, so the real ceiling is the per-instance
// budget times the number of instances; this raises the cost of abuse and bounds a single instance, it is not a hard global spending cap. A hard cap has to be set
// at the providers (OpenRouter / Groq / Tavily key limits) and, optionally, as a platform rate-limit rule. See docs/access-policy.md.

import type { DashboardSnapshot } from "@/lib/assistantContext";

// ── Limits ─────────────────────────────────────────────────────────────────

export const GUARD_LIMITS = {
  maxBodyBytes: 24_000,
  maxMessageChars: 600,
  maxHistoryTurns: 6,
  maxHistoryChars: 1_000,
  maxContextField: 300,
  maxContextSummary: 600,
  maxDrivers: 6,
  maxHeadlines: 5,
  maxTranslateChars: 3_000,
  /** Distinct translations kept in the shared cache by the translate route (the shared cache itself has no bound). */
  maxTranslationCacheEntries: 300,
  assistant: { windowMs: 10 * 60_000, perWindow: 12, perDay: 60, maxInFlight: 4 },
  translate: { windowMs: 10 * 60_000, perWindow: 24, perDay: 120, maxInFlight: 4 },
  /** Paid calls (assistant + translate together) one server instance will make per hour. */
  globalPerHour: 240,
  maxTrackedClients: 5_000,
} as const;

// ── Origin ─────────────────────────────────────────────────────────────────

/**
 * The request comes from a page of this site. Browsers always send Origin on a POST, and Sec-Fetch-Site on every request; either is enough, and anything else is
 * refused. This does not authenticate anyone (a script can forge headers); it stops other sites and browsers from driving the endpoints.
 */
export function isSameOrigin(headers: Headers): boolean {
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.split(",")[0].trim().toLowerCase();
  } catch {
    return false;
  }
}

// ── Body ───────────────────────────────────────────────────────────────────

export type BodyResult = { ok: true; value: unknown } | { ok: false; status: 400 | 413; code: "invalid_json" | "body_too_large" };

/** Reads a JSON body, refusing anything larger than `maxBytes` (declared or actual) and anything that is not valid JSON. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413, code: "body_too_large" };
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, code: "invalid_json" };
  }
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413, code: "body_too_large" };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, code: "invalid_json" };
  }
}

// ── Client identity ────────────────────────────────────────────────────────

/** The caller's address as the platform reports it (first hop of x-forwarded-for, else x-real-ip). Unknown callers share one strict bucket. */
export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return (fwd || real || "unknown").slice(0, 64);
}

// ── Rate limiting ──────────────────────────────────────────────────────────

export type GateResult = { ok: true; release: () => void } | { ok: false; status: 429 | 503; code: "rate_limited" | "daily_limit" | "busy" | "budget_exhausted"; retryAfterSec: number };

interface GateOptions {
  windowMs: number;
  perWindow: number;
  perDay: number;
  maxInFlight: number;
  maxTrackedClients: number;
}

/** A shared per-instance budget of paid calls (both endpoints draw on it). */
export class HourlyBudget {
  private stamps: number[] = [];
  constructor(private readonly perHour: number, private readonly now: () => number = Date.now) {}
  private prune() {
    const cutoff = this.now() - 3_600_000;
    while (this.stamps.length && this.stamps[0] <= cutoff) this.stamps.shift();
  }
  /** Seconds until a call would be allowed, or 0 if one is allowed now. */
  retryAfter(): number {
    this.prune();
    if (this.stamps.length < this.perHour) return 0;
    return Math.max(1, Math.ceil((this.stamps[0] + 3_600_000 - this.now()) / 1000));
  }
  spend() {
    this.stamps.push(this.now());
  }
}

/**
 * Admission control for one paid endpoint. `enter()` is called only when a paid call is about to run; it enforces, in order, the in-flight cap, the shared hourly
 * budget, the per-client window and the per-client daily limit, and only counts a call that passes all four. The returned `release()` frees the in-flight slot.
 */
export class PaidCallGate {
  private readonly perClient = new Map<string, number[]>();
  private inFlight = 0;
  constructor(private readonly opts: GateOptions, private readonly budget: HourlyBudget, private readonly now: () => number = Date.now) {}

  enter(key: string): GateResult {
    const t = this.now();
    if (this.inFlight >= this.opts.maxInFlight) return { ok: false, status: 503, code: "busy", retryAfterSec: 5 };
    const wait = this.budget.retryAfter();
    if (wait > 0) return { ok: false, status: 503, code: "budget_exhausted", retryAfterSec: wait };

    const stamps = (this.perClient.get(key) ?? []).filter((s) => s > t - 86_400_000);
    const inWindow = stamps.filter((s) => s > t - this.opts.windowMs);
    if (stamps.length >= this.opts.perDay) return { ok: false, status: 429, code: "daily_limit", retryAfterSec: Math.max(1, Math.ceil((stamps[0] + 86_400_000 - t) / 1000)) };
    if (inWindow.length >= this.opts.perWindow) return { ok: false, status: 429, code: "rate_limited", retryAfterSec: Math.max(1, Math.ceil((inWindow[0] + this.opts.windowMs - t) / 1000)) };

    stamps.push(t);
    this.perClient.delete(key); // re-insert so the Map's order is least-recently-used first
    this.perClient.set(key, stamps);
    while (this.perClient.size > this.opts.maxTrackedClients) {
      const oldest = this.perClient.keys().next().value;
      if (oldest === undefined) break;
      this.perClient.delete(oldest);
    }
    this.budget.spend();
    this.inFlight++;
    let released = false;
    return {
      ok: true,
      release: () => {
        if (released) return;
        released = true;
        this.inFlight--;
      },
    };
  }

  /** For tests and diagnostics. */
  get trackedClients(): number {
    return this.perClient.size;
  }
  get inFlightNow(): number {
    return this.inFlight;
  }
}

export function createGate(kind: "assistant" | "translate", budget: HourlyBudget, now: () => number = Date.now): PaidCallGate {
  const l = GUARD_LIMITS[kind];
  return new PaidCallGate({ windowMs: l.windowMs, perWindow: l.perWindow, perDay: l.perDay, maxInFlight: l.maxInFlight, maxTrackedClients: GUARD_LIMITS.maxTrackedClients }, budget, now);
}

/** The process-wide instances the two routes use (one shared hourly budget). */
const sharedBudget = new HourlyBudget(GUARD_LIMITS.globalPerHour);
export const assistantGate = createGate("assistant", sharedBudget);
export const translateGate = createGate("translate", sharedBudget);

/** Kill switch for both paid endpoints. Read on every request, so it follows the deployed environment. */
export const paidAssistantDisabled = (): boolean => process.env.ASSISTANT_DISABLED === "1";

// ── Sanitising ─────────────────────────────────────────────────────────────

/** One line of plain text: control characters removed, whitespace (including newlines) collapsed, length capped. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** A chat message or a block of text: control characters removed except line breaks, length capped. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}

const num = (v: unknown, min: number, max: number): number => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : 0);
const line = (v: unknown, max: number = GUARD_LIMITS.maxContextField): string => cleanLine(v, max) || "n/a";
const lines = (v: unknown, count: number): string[] => (Array.isArray(v) ? v.slice(0, count).map((x) => cleanLine(x, GUARD_LIMITS.maxContextField)).filter(Boolean) : []);

/**
 * The dashboard snapshot the page sends, rebuilt field by field: unknown keys dropped, numbers clamped, strings reduced to one capped line. It still carries
 * the same information; it can no longer carry extra instructions, line breaks that imitate prompt sections, or unbounded text.
 */
export function sanitizeContext(raw: unknown): DashboardSnapshot {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    economicHealthScore: num(r.economicHealthScore, 0, 100),
    sentiment: line(r.sentiment),
    riskLevel: line(r.riskLevel),
    summary: line(r.summary, GUARD_LIMITS.maxContextSummary),
    topDrivers: lines(r.topDrivers, GUARD_LIMITS.maxDrivers),
    recessionProbability: num(r.recessionProbability, 0, 100),
    recessionCategory: line(r.recessionCategory),
    recessionModelScore: num(r.recessionModelScore, 0, 100),
    defaultProbability: num(r.defaultProbability, 0, 100),
    defaultCategory: line(r.defaultCategory),
    defaultModelScore: num(r.defaultModelScore, 0, 100),
    gdpGrowth: line(r.gdpGrowth),
    quarterlyGdpGrowth: line(r.quarterlyGdpGrowth),
    cpiInflation: line(r.cpiInflation),
    policyRate: line(r.policyRate),
    foreignReserves: line(r.foreignReserves),
    usdPkr: line(r.usdPkr),
    tradeBalance: line(r.tradeBalance),
    currentAccount: line(r.currentAccount),
    remittances: line(r.remittances),
    exports: line(r.exports),
    imports: line(r.imports),
    fiscalBalance: line(r.fiscalBalance),
    lsm: line(r.lsm),
    privateCreditGrowth: line(r.privateCreditGrowth),
    brentOil: line(r.brentOil),
    gold: line(r.gold),
    dxy: line(r.dxy),
    us10y: line(r.us10y),
    fedFunds: line(r.fedFunds),
    recentHeadlines: lines(r.recentHeadlines, GUARD_LIMITS.maxHeadlines),
    asOf: line(r.asOf, 20),
  };
}

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

/** The last few turns, user and assistant roles only (anything else, notably "system", is dropped), each capped. */
export function sanitizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: HistoryTurn[] = [];
  for (const t of raw.slice(-GUARD_LIMITS.maxHistoryTurns)) {
    if (!t || typeof t !== "object") continue;
    const role = (t as { role?: unknown }).role;
    const content = cleanText((t as { content?: unknown }).content, GUARD_LIMITS.maxHistoryChars);
    if ((role === "user" || role === "assistant") && content) turns.push({ role, content });
  }
  return turns;
}

// ── Responses ──────────────────────────────────────────────────────────────

const REFUSAL_TEXT: Record<string, string> = {
  forbidden: "This assistant can only be used from the PEIC Overview page.",
  invalid_json: "That request could not be read.",
  body_too_large: "That message is too long. Please shorten it and try again.",
  message_required: "Please type a question.",
  message_too_long: `Please keep your question under ${GUARD_LIMITS.maxMessageChars} characters.`,
  rate_limited: "You are asking too quickly. Please wait a little and try again.",
  daily_limit: "The assistant's limit for today has been reached. Please try again tomorrow.",
  busy: "The assistant is busy right now. Please try again in a moment.",
  budget_exhausted: "The assistant is at capacity right now. Please try again later.",
  disabled: "The AI assistant is switched off at the moment.",
  server_error: "Something went wrong on our side. Please try again.",
  text_required: "Nothing to translate.",
  text_too_long: "That text is too long to translate.",
};

/** The text a refused request answers with (the client shows `reply`/`translation` as it would any other answer). */
export const refusalText = (code: string): string => REFUSAL_TEXT[code] ?? REFUSAL_TEXT.server_error;

/** A refusal in the shape the assistant chat already reads, so the UI shows the message instead of failing. */
export function assistantRefusal(status: number, code: string, retryAfterSec?: number): Response {
  return Response.json(
    {
      reply: refusalText(code),
      confidence: "Low",
      confidenceReason: "Request not processed",
      source: "AI Knowledge",
      dataSource: null,
      queryCategory: "Unavailable",
      citations: [],
      searchPerformed: false,
      searchLatencyMs: null,
      sourcesFound: 0,
      modelUsed: "none",
      modelDisplayName: "Unavailable",
      error: code,
    },
    { status, headers: { "cache-control": "no-store", ...(retryAfterSec ? { "retry-after": String(retryAfterSec) } : {}) } },
  );
}

/** A refusal in the shape the translate callers already read. */
export function translateRefusal(status: number, code: string, retryAfterSec?: number): Response {
  return Response.json(
    { translation: `[${refusalText(code)}]`, error: code },
    { status, headers: { "cache-control": "no-store", ...(retryAfterSec ? { "retry-after": String(retryAfterSec) } : {}) } },
  );
}
