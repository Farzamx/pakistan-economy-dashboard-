export async function POST(): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nex-agi/nex-n2-pro:free",
      messages: [{ role: "user", content: "Reply only with: OpenRouter connection successful" }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `OpenRouter error ${res.status}`, detail: text }, { status: res.status });
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const message = data.choices?.[0]?.message?.content ?? null;

  return Response.json({ message });
}
