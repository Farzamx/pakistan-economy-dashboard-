import { FALLBACK_CHAIN } from "@/lib/openRouterClient";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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

// Retry reinforcement — appended only when the first attempt from a given
// model still contained untranslated English (see containsVerbatimEnglishRun).
const RETRY_SUFFIX =
  "\n\n(Your previous attempt left some sentences in English. Re-translate the ENTIRE text above again — every heading, every paragraph, every bullet must be Roman Urdu this time.)";

// Strip any preamble the model may accidentally add despite instructions
function cleanTranslation(text: string): string {
  return text
    .replace(/^(here is|here'?s)\s+(the\s+)?(roman urdu\s+)?translation:?\s*/i, "")
    .replace(/^(roman urdu|translation):?\s*/i, "")
    .trim();
}

// Detects the exact failure mode reported by users: a heading gets translated
// but the body text under it is copied through unchanged. If any run of 6+
// consecutive words from the original English input appears verbatim in the
// translation, that run was never translated — flag it so the caller can
// retry instead of silently returning a mixed-language result.
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

  // Single call to a model; returns the cleaned translation, or null on any
  // failure (HTTP error, empty body, empty content, parse error).
  async function callModel(model: string, userContent: string): Promise<string | null> {
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
            { role: "user", content: userContent },
          ],
          temperature: 0.1,
          max_tokens: 1200,
        }),
        cache: "no-store",
      });

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
      console.warn(`[AI/Translate] ${model} — ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Prefer a fully-translated result over a partially-English one. For each
  // model: try once, and if the output still contains a verbatim run of the
  // original English text (the "translated heading, English body" failure
  // mode), retry that same model once with a corrective reminder before
  // moving on to the next model in the chain. Keep the first non-null result
  // as a best-effort fallback in case every model fails the completeness check.
  let bestAttempt: string | null = null;

  for (const model of FALLBACK_CHAIN) {
    const first = await callModel(model, `${text}${USER_SUFFIX}`);
    if (first === null) continue;

    if (!containsVerbatimEnglishRun(text, first)) {
      console.log(`[AI/Translate] Succeeded — model: ${model} | chars: ${first.length}`);
      return Response.json({ translation: first });
    }

    bestAttempt = bestAttempt ?? first;
    console.warn(`[AI/Translate] ${model} — output still contains untranslated English, retrying once`);

    const retry = await callModel(model, `${text}${RETRY_SUFFIX}`);
    if (retry !== null && !containsVerbatimEnglishRun(text, retry)) {
      console.log(`[AI/Translate] Succeeded after retry — model: ${model} | chars: ${retry.length}`);
      return Response.json({ translation: retry });
    }
    if (retry !== null) {
      bestAttempt = retry; // prefer the retry's output — usually closer to complete
      console.warn(`[AI/Translate] ${model} — retry still incomplete, trying next model`);
    }
  }

  if (bestAttempt) {
    console.warn("[AI/Translate] No model produced a fully clean translation — returning best effort");
    return Response.json({ translation: bestAttempt });
  }

  console.error("[AI/Translate] All models failed");
  return Response.json({
    translation: "[Translation unavailable. Please try again.]",
  });
}
