// Phase 8.10E — focused coverage for getIngestionHealthList(), the new
// generalization that replaced two hardcoded fields (sbpIngestionHealth,
// worldBankIngestionHealth) with one collection derived from
// MONITORED_INGESTION_JOBS. Only @/lib/cronLogging is mocked — this
// function's only I/O — so this stays independent of the ~15 unrelated
// live checks getSystemHealthSnapshot() also performs (SBP/PBS/FRED/etc.),
// none of which this refactor touches.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CronRunRecord } from "@/lib/cronLogging";

const getCronRunHistoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cronLogging", () => ({
  getCronRunHistory: getCronRunHistoryMock,
  logCronRun: vi.fn(),
}));

import { getIngestionHealthList } from "./systemHealth";
import { MONITORED_INGESTION_JOBS } from "./ingestionWatchdog";

function successRun(jobName: string, finishedAt: string): CronRunRecord {
  return { jobName, status: "success", startedAt: finishedAt, finishedAt, durationMs: 100, detail: null };
}

beforeEach(() => {
  getCronRunHistoryMock.mockReset();
  getCronRunHistoryMock.mockResolvedValue([]);
});

describe("getIngestionHealthList — Phase 8.10E generalization", () => {
  it("returns exactly one entry per MONITORED_INGESTION_JOBS, same order", async () => {
    const list = await getIngestionHealthList();
    expect(list.map((e) => e.job.ingestionJobName)).toEqual(MONITORED_INGESTION_JOBS.map((j) => j.ingestionJobName));
  });

  it("SBP health remains present", async () => {
    const list = await getIngestionHealthList();
    expect(list.some((e) => e.job.ingestionJobName === "sbp-local-ingestion")).toBe(true);
  });

  it("World Bank health remains present", async () => {
    const list = await getIngestionHealthList();
    expect(list.some((e) => e.job.ingestionJobName === "worldbank-gdp-growth-ingestion")).toBe(true);
  });

  it("Net Liquid FX Reserves health is present and reflects the shared evaluator, not duplicated logic", async () => {
    const successAt = new Date().toISOString();
    getCronRunHistoryMock.mockImplementation((jobName: string) =>
      Promise.resolve(jobName === "netliquidreserves-ingestion" ? [successRun(jobName, successAt)] : []),
    );
    const list = await getIngestionHealthList();
    const netLiquid = list.find((e) => e.job.ingestionJobName === "netliquidreserves-ingestion");
    expect(netLiquid).toBeDefined();
    // If this were duplicated logic instead of evaluateIngestionHealth(), a
    // real success wouldn't reliably produce "healthy" with the exact
    // lastSuccessAt/episodeKey semantics the shared evaluator guarantees.
    expect(netLiquid?.health.state).toBe("healthy");
    expect(netLiquid?.health.lastSuccessAt).toBe(successAt);
    expect(netLiquid?.health.episodeKey).toBe(successAt);
  });

  it("performs exactly 2 cron_run_log reads per monitored job — no new query pattern introduced", async () => {
    await getIngestionHealthList();
    expect(getCronRunHistoryMock).toHaveBeenCalledTimes(MONITORED_INGESTION_JOBS.length * 2);
  });

  it("returned health data contains no secret-shaped strings", async () => {
    const list = await getIngestionHealthList();
    const serialized = JSON.stringify(list);
    expect(serialized).not.toMatch(/sk-|api[_-]?key|secret|password|bearer|authorization/i);
  });
});
