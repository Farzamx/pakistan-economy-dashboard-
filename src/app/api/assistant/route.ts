import { FALLBACK_CHAIN, getModelDisplayName } from "@/lib/openRouterClient";
import type { DashboardSnapshot } from "@/lib/assistantContext";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  message: string;
  context: DashboardSnapshot;
  history: ConvMessage[];
}

interface OpenRouterApiResponse {
  choices?: { message?: { content?: string } }[];
}

type SourceType = "Dashboard Data" | "AI Knowledge" | "Hybrid Analysis";

function buildSystemPrompt(ctx: DashboardSnapshot): string {
  const headlines = ctx.recentHeadlines
    .slice(0, 5)
    .map((h, i) => `${i + 1}. ${h}`)
    .join("\n");

  return `You are the Pakistan Economic Intelligence Assistant — an expert embedded in a live macroeconomic dashboard. You have access to the most recent indicator data. Always prioritise dashboard numbers before using training knowledge.

LIVE DASHBOARD DATA (as of ${ctx.asOf}):

Economic Health Score: ${ctx.economicHealthScore}/100 (${ctx.sentiment}, ${ctx.riskLevel} Risk)
Summary: ${ctx.summary}
Key Drivers: ${ctx.topDrivers.join(" | ")}

Quantitative Risk Models (deterministic, not AI-generated):
  Recession Probability: ${ctx.recessionProbability}% — ${ctx.recessionCategory} Risk (model score ${ctx.recessionModelScore}/100)
  Sovereign Default Probability: ${ctx.defaultProbability}% — ${ctx.defaultCategory} Risk (model score ${ctx.defaultModelScore}/100)

Core Economic Indicators:
  GDP Growth: ${ctx.gdpGrowth}
  CPI Inflation: ${ctx.cpiInflation}
  Policy Rate (SBP): ${ctx.policyRate}
  Foreign Reserves: ${ctx.foreignReserves}
  USD/PKR Exchange Rate: ${ctx.usdPkr}
  Trade Balance: ${ctx.tradeBalance}
  Exports: ${ctx.exports} | Imports: ${ctx.imports}
  Current Account: ${ctx.currentAccount}
  Remittances: ${ctx.remittances}
  Fiscal Balance: ${ctx.fiscalBalance}
  LSM (Large-Scale Manufacturing): ${ctx.lsm}
  Private Credit Growth: ${ctx.privateCreditGrowth}

Global Markets:
  Brent Crude Oil: ${ctx.brentOil}
  Gold: ${ctx.gold}
  US Dollar Index (DXY): ${ctx.dxy}
  US 10Y Treasury Yield: ${ctx.us10y}
  Fed Funds Rate: ${ctx.fedFunds}

Recent Headlines:
${headlines}

RESPONSE RULES:
1. Use live dashboard numbers first — cite specific values from the data above.
2. Keep answers focused: 2–3 sentences for simple questions, up to 5 for complex cross-indicator analysis.
3. Never invent numbers not shown above. If data isn't available, say so clearly.
4. End every response with exactly one SOURCE line (new line, no trailing text):
   SOURCE: Dashboard Data
   SOURCE: AI Knowledge
   SOURCE: Hybrid Analysis
   — "Dashboard Data" if answered solely from the data above
   — "AI Knowledge" if you relied on training knowledge not in the data
   — "Hybrid Analysis" if you combined both
5. Pakistan context: SBP = State Bank of Pakistan, IMF program context, PKR = Pakistani Rupee.`;
}

function parseSource(content: string): { reply: string; source: SourceType } {
  const match = content.match(
    /\n?SOURCE:\s*(Dashboard Data|AI Knowledge|Hybrid Analysis)\s*$/i,
  );
  const source = (match?.[1] as SourceType) ?? "Hybrid Analysis";
  const reply = content
    .replace(/\n?SOURCE:\s*(Dashboard Data|AI Knowledge|Hybrid Analysis)\s*$/i, "")
    .trim();
  return { reply, source };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply: "The AI assistant is temporarily unavailable (API key not configured).",
      source: "AI Knowledge",
      modelUsed: "fallback",
      modelDisplayName: "Offline",
    });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { message, context, history } = body;
  if (!message?.trim()) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(context);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    // Keep last 6 turns (3 exchanges) to stay within token limits on small models
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message.trim() },
  ];

  for (const model of FALLBACK_CHAIN) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, temperature: 0.35, max_tokens: 400 }),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[AI/Assistant] ${model} — HTTP ${res.status} ${res.statusText}`);
        continue;
      }

      const rawText = await res.text();
      if (!rawText.trim()) {
        console.warn(`[AI/Assistant] ${model} — empty body`);
        continue;
      }

      const apiData = JSON.parse(rawText) as OpenRouterApiResponse;
      const content = apiData.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) {
        console.warn(`[AI/Assistant] ${model} — empty content`);
        continue;
      }

      console.log(`[AI/Assistant] Succeeded — model: ${model}`);
      const { reply, source } = parseSource(content);
      return Response.json({
        reply,
        source,
        modelUsed: model,
        modelDisplayName: getModelDisplayName(model),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[AI/Assistant] ${model} — ${reason}`);
    }
  }

  console.error("[AI/Assistant] All models failed");
  return Response.json({
    reply: "I'm having trouble connecting right now. Please try again in a moment.",
    source: "AI Knowledge",
    modelUsed: "fallback",
    modelDisplayName: "Offline",
  });
}
