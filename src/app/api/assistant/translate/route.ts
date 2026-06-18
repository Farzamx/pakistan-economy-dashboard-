import { FALLBACK_CHAIN, MODEL_TIMEOUT_MS } from "@/lib/openRouterClient";
import { getFresh, setCache } from "@/lib/memoryCache";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Translated tooltip content is static (the ~30 TERMINOLOGY entries never
// change), so the same text gets requested repeatedly across different users
// and sessions. Caching by exact input text means only the FIRST request for
// a given tooltip ever calls the LLM — every subsequent request for the same
// text is free and instant. Configurable via env (default 24h, since the
// underlying English source text essentially never changes).
const TRANSLATION_CACHE_TTL_MS = Number(process.env.TRANSLATE_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
}

// ── System prompt ─────────────────────────────────────────────────────────────
// Strictly translation-only — model must not add, remove, or interpret anything.

const SYSTEM_PROMPT = `You are a Roman Urdu translator for Pakistani economic content.

YOUR ONLY JOB: Translate 100% of the user's text into simple, everyday Roman Urdu. Nothing else.

STRICT RULES — you must follow ALL of these:
1. Translate EVERY sentence, EVERY heading, EVERY bullet point, and EVERY paragraph. Do not skip, summarise, or omit anything.
2. If a heading is translated (e.g. "Kya hai?"), the paragraph or bullets immediately under that heading MUST also be fully translated in the same response. NEVER leave a translated heading followed by an English paragraph — that is a failed translation.
3. Do NOT add new information, opinions, commentary, or interpretations.
4. Do NOT remove any information from the original text.
5. Keep numbers, percentages, currencies (e.g. PKR, USD), and dates exactly as written.
6. Keep bullet points (- ) and any formatting structure intact.
7. For economic terms that have no simple Roman Urdu word, keep the English term and add a brief parenthetical explanation in Roman Urdu — but the REST of that sentence around the term must still be in Roman Urdu, not English.
8. Output ONLY the Roman Urdu translation. No preamble like "Here is the translation:", no labels, nothing extra.
9. Before you finish, re-read your own output line by line. If you find any line that is still a plain English sentence (not Roman Urdu, not a kept term with a parenthetical), rewrite that line in Roman Urdu before responding.

Worked example — follow this pattern exactly:

INPUT:
Kya hai?
How many Rupees it takes to buy one US Dollar.

Kyun zaroori hai?
A weaker Rupee makes imports more expensive.

CORRECT OUTPUT (note: the heading AND the sentence below it are both translated):
Kya hai?
Ek US Dollar khareedne ke liye kitne Rupay lagte hain.

Kyun zaroori hai?
Kamzor Rupay se imports mehengi ho jati hain.

INCORRECT OUTPUT (heading translated but sentence left in English — never do this):
Kya hai?
How many Rupees it takes to buy one US Dollar.

Standard economic term translations — use these consistently:
- Inflation → Mehengai
- GDP Growth → GDP Growth (mulki maeeshat ki taraqqi ki dar)
- Current Account Deficit → Current Account Deficit (mulk se zyada dollar bahar ja rahe hain)
- Fiscal Deficit → Hukoomat ke kharchay aamdani se zyada hona
- Foreign Reserves → Foreign Reserves (mulk ke paas mojood dollar)
- Exchange Rate / USD/PKR → Dollar ki qeemat rupay mein
- Policy Rate / Interest Rate → SBP ka interest rate
- Remittances → Bahar se aane wali raqam (remittances)
- Trade Balance → Baraamad aur Daraamad ka faraq
- Exports → Baraamdat
- Imports → Daraamdat
- Recession → Recession (maeeshat ka sust parana ya sankoch)
- Sovereign Default → Default (mulk ka qarz wapas na kar paana)
- Economic Health Score → Maeeshat ki sehat ka score
- Monetary Policy → Monetary Policy (SBP ki paise aur qarz se mutaliq policy)
- Confidence / High / Medium / Low → Bharosa / Zyada / Darmiyani / Kam
- Risk Level / Probability → Risk Level / Probability (khatre ka imkaan)
- Low / Elevated / High / Severe → Kam / Barhta hua / Zyada / Shadeed`;

// Reinforcement appended directly to the user message — instructions placed
// closest to the content the model is about to generate are followed more
// reliably than system-prompt-only instructions.
const USER_SUFFIX =
  "\n\n(Translate every single line above into Roman Urdu, including all headings, paragraphs, and bullet points. Do not leave any sentence in English.)";

// Strip any preamble the model may accidentally add despite instructions
function cleanTranslation(text: string): string {
  return text
    .replace(/^(here is|here'?s)\s+(the\s+)?(roman urdu\s+)?translation:?\s*/i, "")
    .replace(/^(roman urdu|translation):?\s*/i, "")
    .trim();
}

// Detects the exact failure mode previously reported: a heading gets translated
// but the body text under it is copied through unchanged. If any run of 6+
// consecutive words from the original English input appears verbatim in the
// translation, that run was never translated. Logged as a quality signal only
// — it does NOT trigger a second LLM call (that retry-on-incomplete loop was
// the main cause of slow translations; the strengthened prompt above is the
// primary defense now, this is just an observability signal).
function containsVerbatimEnglishRun(original: string, translated: string, minWords = 6): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const origWords = normalize(original).split(" ").filter(Boolean);
  const transNorm = normalize(translated);

  for (let i = 0; i + minWords <= origWords.length; i++) {
    const window = origWords.slice(i, i + minWords).join(" ");
    if (window.length > 12 && transNorm.includes(window)) {
      return true;
    }
  }
  return false;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const requestStart = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({
      translation: "[Translation unavailable — API key not configured.]",
    });
  }

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  // Cache hit — zero LLM calls, near-instant.
  const cacheKey = text;
  const cached = getFresh<string>(cacheKey, TRANSLATION_CACHE_TTL_MS);
  if (cached) {
    console.log(`[Timing] translation: ${Date.now() - requestStart}ms (cache hit, ${cached.ageMs}ms old)`);
    return Response.json({ translation: cached.data });
  }

  // Single call to a model, timeout-protected; returns the cleaned translation,
  // or null on any failure (HTTP error, timeout, empty body, empty content).
  async function callModel(model: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `${text}${USER_SUFFIX}` },
          ],
          temperature: 0.1,
          max_tokens: 1200,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[AI/Translate] ${model} — HTTP ${res.status} ${res.statusText}`);
        return null;
      }

      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/Translate] ${model} — empty body`);
        return null;
      }

      const data = JSON.parse(rawText) as OpenRouterResponse;
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        console.warn(`[AI/Translate] ${model} — empty content`);
        return null;
      }

      return cleanTranslation(raw);
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === "AbortError";
      console.warn(`[AI/Translate] ${model} — ${aborted ? `timeout after ${MODEL_TIMEOUT_MS}ms` : err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // One call per model, in order, stopping at the first success — no retry-on-
  // imperfect-quality loop. Model-to-model fallback only happens on a hard
  // failure (HTTP error, timeout, empty response), so the common case is
  // exactly one LLM call.
  for (const model of FALLBACK_CHAIN) {
    const callStart = Date.now();
    const result = await callModel(model);
    if (result === null) continue;

    if (containsVerbatimEnglishRun(text, result)) {
      console.warn(`[AI/Translate] ${model} — output may contain untranslated English (quality signal only, not retried)`);
    }

    setCache(cacheKey, result);
    console.log(`[Timing] translation: ${Date.now() - requestStart}ms (model call: ${Date.now() - callStart}ms) — ${model}`);
    return Response.json({ translation: result });
  }

  console.error(`[AI/Translate] All models failed (${Date.now() - requestStart}ms)`);
  return Response.json({
    translation: "[Translation unavailable. Please try again.]",
  });
}
