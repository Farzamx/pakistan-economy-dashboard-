"use client";

import { useState } from "react";

export default function OpenRouterTestPage() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/test", { method: "POST" });
      const data = await res.json() as { message?: string; error?: string; detail?: string };
      if (!res.ok) {
        setError(data.error ?? "Unknown error");
      } else {
        setResult(data.message ?? "(no message returned)");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>OpenRouter Test</h1>
      <button onClick={runTest} disabled={loading} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
        {loading ? "Testing…" : "Test OpenRouter"}
      </button>
      {result && <pre style={{ marginTop: "1rem", color: "green" }}>{result}</pre>}
      {error && <pre style={{ marginTop: "1rem", color: "red" }}>Error: {error}</pre>}
    </main>
  );
}
