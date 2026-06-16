import { getAiEconomicAnalysis } from "@/lib/data/aiEconomicAnalysis";
import type { IndicatorSnapshot } from "@/lib/data/aiEconomicAnalysis";
import type { NewsItem } from "@/lib/data/news";

interface RequestBody {
  indicators: IndicatorSnapshot;
  news: NewsItem[];
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as RequestBody;
    const { indicators, news } = body;

    if (!indicators || !news) {
      return Response.json({ error: "Missing indicators or news in request body" }, { status: 400 });
    }

    const analysis = await getAiEconomicAnalysis(indicators, news);
    return Response.json(analysis);
  } catch {
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}
