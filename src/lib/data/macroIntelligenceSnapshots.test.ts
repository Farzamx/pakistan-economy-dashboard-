// Phase 10.1 — persistence layer tests. Mocks createPublicDataClient
// entirely, same boundary every other data-layer test in this repo uses —
// no real Supabase connection, no live network access.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/publicDataClient", () => ({
  createPublicDataClient: () => ({ rpc: rpcMock }),
}));

import { writeMacroIntelligenceSnapshot, readRecentMacroIntelligenceSnapshots } from "./macroIntelligenceSnapshots";
import type { MacroIntelligenceReport } from "@/lib/intelligence/types";

function report(overrides: Partial<MacroIntelligenceReport> = {}): MacroIntelligenceReport {
  return {
    calculatedAt: "2026-09-01T00:00:00.000Z",
    regime: { calculatedAt: "2026-09-01T00:00:00.000Z", dimensions: {} },
    signals: [
      {
        id: "inflation",
        dimension: "Inflation",
        label: "Inflation",
        state: "rising",
        direction: "Rising",
        confidence: "High",
        confidenceScore: 100,
        summary: "Headline CPI is rising.",
        evidence: [],
        missingInputs: [],
        calculatedAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "monetary-policy",
        dimension: "MonetaryPolicy",
        label: "Monetary Policy",
        state: "insufficient-data",
        direction: "Unknown",
        confidence: "Insufficient",
        confidenceScore: null,
        summary: "Not enough evidence.",
        evidence: [],
        missingInputs: ["SBP Policy Rate"],
        calculatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  rpcMock.mockReset();
});

describe("writeMacroIntelligenceSnapshot", () => {
  it("1. serializes exactly the compact per-dimension fields — never the raw evidence array — and passes the internal secret through", async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: "abc", skipped: false }, error: null });
    const result = await writeMacroIntelligenceSnapshot(report(), "secret-123");

    expect(result).toEqual({ success: true, skipped: false });
    expect(rpcMock).toHaveBeenCalledWith("store_macro_intelligence_snapshot", {
      p_internal_secret: "secret-123",
      p_dimensions: {
        Inflation: { state: "rising", direction: "Rising", confidence: "High", confidenceScore: 100, summary: "Headline CPI is rising." },
        MonetaryPolicy: { state: "insufficient-data", direction: "Unknown", confidence: "Insufficient", confidenceScore: null, summary: "Not enough evidence." },
      },
    });
  });

  it("persists insufficient-data states honestly — never omits or fabricates a different state", async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: "abc", skipped: false }, error: null });
    await writeMacroIntelligenceSnapshot(report(), "secret");
    const call = rpcMock.mock.calls[0][1] as { p_dimensions: Record<string, { state: string }> };
    expect(call.p_dimensions.MonetaryPolicy.state).toBe("insufficient-data");
  });

  it("6. a duplicate same-day write comes back as skipped, not an error (DB-enforced idempotency)", async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: null, skipped: true, reason: "A snapshot for this UTC calendar day already exists." }, error: null });
    const result = await writeMacroIntelligenceSnapshot(report(), "secret");
    expect(result).toEqual({ success: true, skipped: true });
  });

  it("10. persistence write failure (RPC error) is reported, never thrown", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "connection reset" } });
    const result = await writeMacroIntelligenceSnapshot(report(), "secret");
    expect(result).toEqual({ success: false, error: "connection reset" });
  });

  it("10. an unexpected throw from the RPC call itself is caught, never propagated", async () => {
    rpcMock.mockRejectedValueOnce(new Error("network down"));
    const result = await writeMacroIntelligenceSnapshot(report(), "secret");
    expect(result.success).toBe(false);
    expect(result.error).toContain("network down");
  });
});

describe("readRecentMacroIntelligenceSnapshots", () => {
  it("2. maps RPC rows into MacroIntelligenceSnapshot[]", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { computed_at: "2026-09-01T00:00:00Z", snapshot_date: "2026-09-01", dimensions: { Inflation: { state: "rising", direction: "Rising", confidence: "High", confidenceScore: 100, summary: "x" } } },
      ],
      error: null,
    });
    const rows = await readRecentMacroIntelligenceSnapshots(14);
    expect(rows).toHaveLength(1);
    expect(rows[0].computedAt).toBe("2026-09-01T00:00:00Z");
    expect(rows[0].dimensions.Inflation?.state).toBe("rising");
    expect(rpcMock).toHaveBeenCalledWith("get_recent_macro_intelligence_snapshots", { p_limit: 14 });
  });

  it("3. maps multiple rows, preserving RPC order (newest-first, per get_recent_macro_intelligence_snapshots' own ORDER BY)", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { computed_at: "2026-09-02T00:00:00Z", snapshot_date: "2026-09-02", dimensions: {} },
        { computed_at: "2026-09-01T00:00:00Z", snapshot_date: "2026-09-01", dimensions: {} },
      ],
      error: null,
    });
    const rows = await readRecentMacroIntelligenceSnapshots(14);
    expect(rows.map((r) => r.computedAt)).toEqual(["2026-09-02T00:00:00Z", "2026-09-01T00:00:00Z"]);
  });

  it("11. historical read failure (RPC error) resolves to an empty array, never throws", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "timeout" } });
    const rows = await readRecentMacroIntelligenceSnapshots(14);
    expect(rows).toEqual([]);
  });

  it("11. an unexpected throw from the RPC call itself resolves to an empty array, never propagates", async () => {
    rpcMock.mockRejectedValueOnce(new Error("network down"));
    const rows = await readRecentMacroIntelligenceSnapshots(14);
    expect(rows).toEqual([]);
  });

  it("8. zero snapshots (empty data array) resolves to an empty array — the honest '0 snapshots' case, not an error", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const rows = await readRecentMacroIntelligenceSnapshots(14);
    expect(rows).toEqual([]);
  });
});
