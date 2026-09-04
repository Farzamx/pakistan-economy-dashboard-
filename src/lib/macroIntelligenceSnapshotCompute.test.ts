// Phase 10.1 — scheduled-computation cycle tests. Mocks
// buildMacroIntelligenceReport and writeMacroIntelligenceSnapshot at their
// module boundaries — this file never reaches a real read-model or a real
// Supabase call, structurally.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MacroIntelligenceReport } from "@/lib/intelligence/types";

const buildReportMock = vi.hoisted(() => vi.fn());
const writeSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/intelligence/macroIntelligence", () => ({ buildMacroIntelligenceReport: buildReportMock }));
vi.mock("@/lib/data/macroIntelligenceSnapshots", () => ({ writeMacroIntelligenceSnapshot: writeSnapshotMock }));

const { runMacroIntelligenceSnapshotCycle } = await import("./macroIntelligenceSnapshotCompute");

const NOW = new Date("2026-09-01T10:00:00.000Z");

function fakeReport(signalCount = 7): MacroIntelligenceReport {
  return {
    calculatedAt: NOW.toISOString(),
    regime: { calculatedAt: NOW.toISOString(), dimensions: {} },
    signals: Array.from({ length: signalCount }, (_, i) => ({
      id: `dim-${i}`,
      dimension: "Inflation",
      label: "x",
      state: "rising",
      direction: "Rising" as const,
      confidence: "High" as const,
      confidenceScore: 100,
      summary: "x",
      evidence: [],
      missingInputs: [],
      calculatedAt: NOW.toISOString(),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runMacroIntelligenceSnapshotCycle", () => {
  it("builds the report exactly once and hands it to the persistence layer unmodified — never a duplicated computation", async () => {
    const report = fakeReport();
    buildReportMock.mockResolvedValue(report);
    writeSnapshotMock.mockResolvedValue({ success: true, skipped: false });

    const result = await runMacroIntelligenceSnapshotCycle("secret", NOW);

    expect(buildReportMock).toHaveBeenCalledTimes(1);
    expect(buildReportMock).toHaveBeenCalledWith(NOW);
    expect(writeSnapshotMock).toHaveBeenCalledTimes(1);
    expect(writeSnapshotMock).toHaveBeenCalledWith(report, "secret");
    expect(result).toEqual({ success: true, skipped: false, dimensionCount: 7 });
  });

  it("12. determinism — identical (mocked) inputs and `now` produce an identical cycle outcome across two calls", async () => {
    buildReportMock.mockResolvedValue(fakeReport());
    writeSnapshotMock.mockResolvedValue({ success: true, skipped: false });

    const a = await runMacroIntelligenceSnapshotCycle("secret", NOW);
    const b = await runMacroIntelligenceSnapshotCycle("secret", NOW);
    expect(a).toEqual(b);
  });

  it("6. a skipped write (already-computed-today) surfaces as skipped, not an error — the cycle still reports success", async () => {
    buildReportMock.mockResolvedValue(fakeReport());
    writeSnapshotMock.mockResolvedValue({ success: true, skipped: true });

    const result = await runMacroIntelligenceSnapshotCycle("secret", NOW);
    expect(result).toEqual({ success: true, skipped: true, dimensionCount: 7 });
  });

  it("10. a persistence failure is surfaced as a failed cycle, never thrown out of this function", async () => {
    buildReportMock.mockResolvedValue(fakeReport());
    writeSnapshotMock.mockResolvedValue({ success: false, error: "db unreachable" });

    const result = await runMacroIntelligenceSnapshotCycle("secret", NOW);
    expect(result).toEqual({ success: false, skipped: false, error: "db unreachable" });
  });
});
