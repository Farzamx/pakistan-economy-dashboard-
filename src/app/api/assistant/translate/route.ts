import { FALLBACK_CHAIN } from "@/lib/openRouterClient";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
}

// ── System prompt ─────────────────────────────────────────────────────────────
// Strictly translation-only — model must not add, remove, or interpret anything.

const SYSTEM_PROMPT = `You are a Roman Urdu translator for Pakistani economic content.

YOUR ONLY JOB: Translate the user's text into simple, everyday Roman Urdu. Nothing else.

STRICT RULES — you must follow ALL of these:
1. Translate every sentence. Do not skip, summarise, or omit anything.
2. Do NOT add new information, opinions, commentary, or interpretations.
3. Do NOT remove any information from the original text.
4. Keep numbers, percentages, currencies (e.g. PKR, USD), and dates exactly as written.
5. Keep bullet points (- ) and any formatting structure intact.
6. For economic terms that have no simple Roman Urdu word, keep the English term and add a brief parenthetical explanation in Roman Urdu.
7. Output ONLY the Roman Urdu translation. No preamble like "Here is the translation:", no labels, nothing extra.

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
- Confidence / High / Medium / Low → Bharosa / Zyada / Darmiyani / Kam`;

// Strip any preamble the model may accidentally add despite instructions
function cleanTranslation(text: string): string {
  return text
    .replace(/^(here is|here'?s)\s+(the\s+)?(roman urdu\s+)?translation:?\s*/i, "")
    .replace(/^(roman urdu|translation):?\s*/i, "")
    .trim();
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
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: text },
          ],
          temperature: 0.1,
          max_tokens: 700,
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[AI/Translate] ${model} — HTTP ${res.status} ${res.statusText}`);
        continue;
      }

      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/Translate] ${model} — empty body`);
        continue;
      }

      const data = JSON.parse(rawText) as OpenRouterResponse;
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        console.warn(`[AI/Translate] ${model} — empty content`);
        continue;
      }

      const translation = cleanTranslation(raw);
      console.log(`[AI/Translate] Succeeded — model: ${model} | chars: ${translation.length}`);
      return Response.json({ translation });
    } catch (err) {
      console.warn(
        `[AI/Translate] ${model} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.error("[AI/Translate] All models failed");
  return Response.json({
    translation: "[Translation unavailable. Please try again.]",
  });
}
