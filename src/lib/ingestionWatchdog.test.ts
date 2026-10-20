// Multi-provider dead-man's switch tests — Phase 8.6. Fully mocked: no
// Supabase, no live SBP/World Bank request, no real email. Time is
// injected rather than faked globally, so these are deterministic and
// independent of the machine clock.

import { describe, it, expect, vi } from "vitest";
import type { CronRunRecord } from "@/lib/cronLogging";

const getCronRunHistoryMock = vi.hoisted(() => vi.fn());
const logCronRunMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cronLogging", () => ({
  getCronRunHistory: getCronRunHistoryMock,
  logCronRun: logCronRunMock,
}));
vi.mock("@/lib/email/resend", () => ({ sendEmail: sendEmailMock }));

const {
  evaluateIngestionHealth,
  runIngestionWatchdog,
  SBP_MONITOR_JOB,
  WORLD_BANK_MONITOR_JOB,
  NET_LIQUID_RESERVES_MONITOR_JOB,
  FRED_MONITOR_JOB,
  YAHOO_GOLD_MONITOR_JOB,
  MONITORED_INGESTION_JOBS,
  REMINDER_INTERVAL_HOURS,
} = await import("@/lib/ingestionWatchdog");

const NOW = new Date("2026-08-12T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function run(jobName: string, overrides: Partial<CronRunRecord> & { finishedAt: string }): CronRunRecord {
  return {
    jobName,
    startedAt: overrides.finishedAt,
    durationMs: 1000,
    status: "success",
    detail: null,
    ...overrides,
  };
}

/** A success `hours` before NOW, for the given ingestion job. */
function successAgo(jobName: string, hours: number): CronRunRecord {
  return run(jobName, { finishedAt: new Date(NOW.getTime() - hours * HOUR).toISOString() });
}

/** Routes each job name to its own history, mirroring the real per-job-scoped read pattern. */
function mockHistories(byJobName: Record<string, CronRunRecord[]>) {
  getCronRunHistoryMock.mockImplementation(async (jobName: string) => byJobName[jobName] ?? []);
}

function resetAll() {
  getCronRunHistoryMock.mockReset();
  logCronRunMock.mockReset();
  sendEmailMock.mockReset();
  logCronRunMock.mockResolvedValue(undefined);
  sendEmailMock.mockResolvedValue({ success: true, id: "msg_1" });
  process.env.ADMIN_EMAIL = "ops@example.com";
}

describe("A. registry", () => {
  it("contains exactly five monitored jobs: SBP, World Bank, Net Liquid FX Reserves, FRED, and Yahoo Gold", () => {
    expect(MONITORED_INGESTION_JOBS).toHaveLength(5);
    expect(MONITORED_INGESTION_JOBS).toEqual([SBP_MONITOR_JOB, WORLD_BANK_MONITOR_JOB, NET_LIQUID_RESERVES_MONITOR_JOB, FRED_MONITOR_JOB, YAHOO_GOLD_MONITOR_JOB]);
  });

  it("every job has a unique ingestionJobName", () => {
    const names = MONITORED_INGESTION_JOBS.map((j) => j.ingestionJobName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every job has a unique watchdogJobName, distinct from every ingestionJobName", () => {
    const watchdogNames = MONITORED_INGESTION_JOBS.map((j) => j.watchdogJobName);
    const ingestionNames = MONITORED_INGESTION_JOBS.map((j) => j.ingestionJobName);
    expect(new Set(watchdogNames).size).toBe(watchdogNames.length);
    for (const w of watchdogNames) expect(ingestionNames).not.toContain(w);
  });

  it("SBP values are unchanged from the pre-Phase-8.6 constants", () => {
    expect(SBP_MONITOR_JOB.ingestionJobName).toBe("sbp-local-ingestion");
    expect(SBP_MONITOR_JOB.watchdogJobName).toBe("sbp-ingestion-watchdog");
    expect(SBP_MONITOR_JOB.expectedIntervalHours).toBe(24);
    expect(SBP_MONITOR_JOB.staleAfterHours).toBe(36);
  });

  it("World Bank cadence matches the actual Phase 8.4 weekly schedule (168h)", () => {
    expect(WORLD_BANK_MONITOR_JOB.ingestionJobName).toBe("worldbank-gdp-growth-ingestion");
    expect(WORLD_BANK_MONITOR_JOB.watchdogJobName).toBe("worldbank-ingestion-watchdog");
    expect(WORLD_BANK_MONITOR_JOB.expectedIntervalHours).toBe(168);
  });

  it("World Bank's threshold is the confirmed, evidence-based value (216h = 168h interval + 48h buffer), not SBP's 36h or a naive copy", () => {
    expect(WORLD_BANK_MONITOR_JOB.staleAfterHours).toBe(216);
    expect(WORLD_BANK_MONITOR_JOB.staleAfterHours).not.toBe(SBP_MONITOR_JOB.staleAfterHours);
    expect(WORLD_BANK_MONITOR_JOB.staleAfterHours).toBeGreaterThan(WORLD_BANK_MONITOR_JOB.expectedIntervalHours);
    expect(WORLD_BANK_MONITOR_JOB.staleAfterHours).toBeLessThan(WORLD_BANK_MONITOR_JOB.expectedIntervalHours * 2); // must fire before a second consecutive miss
  });

  it("Net Liquid FX Reserves matches the actual Phase 8.10C weekly schedule (168h) and job names", () => {
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName).toBe("netliquidreserves-ingestion");
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName).toBe("netliquidreserves-ingestion-watchdog");
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.expectedIntervalHours).toBe(168);
  });

  it("Net Liquid FX Reserves reuses World Bank's exact, already-evidenced weekly threshold (same cadence, same scheduler mechanics) rather than a freshly invented number", () => {
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.staleAfterHours).toBe(216);
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.staleAfterHours).toBe(WORLD_BANK_MONITOR_JOB.staleAfterHours);
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.expectedIntervalHours).toBe(WORLD_BANK_MONITOR_JOB.expectedIntervalHours);
    expect(NET_LIQUID_RESERVES_MONITOR_JOB.staleAfterHours).not.toBe(SBP_MONITOR_JOB.staleAfterHours);
  });

  it("FRED matches the actual Phase 8.14 weekly schedule (168h) and job names — ingestionJobName exactly matches ingestFred.ts's cron_run_log JOB_NAME", () => {
    expect(FRED_MONITOR_JOB.ingestionJobName).toBe("fred-monthly-ingestion");
    expect(FRED_MONITOR_JOB.watchdogJobName).toBe("fred-ingestion-watchdog");
    expect(FRED_MONITOR_JOB.expectedIntervalHours).toBe(168);
  });

  it("FRED reuses World Bank's/Net Liquid FX Reserves' exact, already-evidenced weekly threshold (same cadence, same scheduler mechanics, confirmed live in Phase 8.14) rather than a freshly invented number or a blind copy of SBP's 36h", () => {
    expect(FRED_MONITOR_JOB.staleAfterHours).toBe(216);
    expect(FRED_MONITOR_JOB.staleAfterHours).toBe(WORLD_BANK_MONITOR_JOB.staleAfterHours);
    expect(FRED_MONITOR_JOB.staleAfterHours).toBe(NET_LIQUID_RESERVES_MONITOR_JOB.staleAfterHours);
    expect(FRED_MONITOR_JOB.expectedIntervalHours).toBe(WORLD_BANK_MONITOR_JOB.expectedIntervalHours);
    expect(FRED_MONITOR_JOB.staleAfterHours).not.toBe(SBP_MONITOR_JOB.staleAfterHours);
  });

  it("FRED's watchdogJobName is unique and cannot collide with SBP/World Bank/Net Liquid FX Reserves", () => {
    const allWatchdogNames = MONITORED_INGESTION_JOBS.map((j) => j.watchdogJobName);
    expect(allWatchdogNames.filter((n) => n === FRED_MONITOR_JOB.watchdogJobName)).toHaveLength(1);
  });

  it("B/C/D. Yahoo Gold matches the actual Phase 8.18 genuinely-monthly schedule (744h = 31 days) and job names — ingestionJobName exactly matches ingestYahooGold.ts's cron_run_log JOB_NAME", () => {
    expect(YAHOO_GOLD_MONITOR_JOB.ingestionJobName).toBe("yahoo-gold-monthly-ingestion");
    expect(YAHOO_GOLD_MONITOR_JOB.watchdogJobName).toBe("yahoo-gold-monthly-ingestion-watchdog");
    expect(YAHOO_GOLD_MONITOR_JOB.expectedIntervalHours).toBe(744);
  });

  it("E. Yahoo Gold's threshold (912h = 744h interval + 168h/7-day buffer) is freshly derived — no prior monthly-SCHEDULED job exists to reuse from — but follows the identical method (interval + buffer, fire before a second miss) every other threshold in this file already uses, not SBP's unrelated 36h", () => {
    expect(YAHOO_GOLD_MONITOR_JOB.staleAfterHours).toBe(912);
    expect(YAHOO_GOLD_MONITOR_JOB.staleAfterHours).not.toBe(SBP_MONITOR_JOB.staleAfterHours);
    expect(YAHOO_GOLD_MONITOR_JOB.staleAfterHours).not.toBe(WORLD_BANK_MONITOR_JOB.staleAfterHours); // deliberately NOT a copy — different schedule kind (monthly vs weekly)
    expect(YAHOO_GOLD_MONITOR_JOB.staleAfterHours).toBeGreaterThan(YAHOO_GOLD_MONITOR_JOB.expectedIntervalHours);
    expect(YAHOO_GOLD_MONITOR_JOB.staleAfterHours).toBeLessThan(YAHOO_GOLD_MONITOR_JOB.expectedIntervalHours * 2); // must fire before a second consecutive miss (1488h)
  });

  it("Yahoo Gold's watchdogJobName is unique and cannot collide with any other monitored job", () => {
    const allWatchdogNames = MONITORED_INGESTION_JOBS.map((j) => j.watchdogJobName);
    expect(allWatchdogNames.filter((n) => n === YAHOO_GOLD_MONITOR_JOB.watchdogJobName)).toHaveLength(1);
  });

  it("O. commandHint reflects the real package.json script and contains no credential-shaped value", () => {
    expect(YAHOO_GOLD_MONITOR_JOB.commandHint).toBe("npm run ingest:yahoogold");
    expect(YAHOO_GOLD_MONITOR_JOB.commandHint).not.toMatch(/key|token|secret|password|bearer/i);
  });
});

describe("B. evaluator — provider-independent behavior", () => {
  it("treats a recent successful run as healthy, for any job", () => {
    resetAll();
    const h = evaluateIngestionHealth([successAgo(SBP_MONITOR_JOB.ingestionJobName, 2)], [], NOW, SBP_MONITOR_JOB);
    expect(h.state).toBe("healthy");
    expect(h.ageMs).toBe(2 * HOUR);
    expect(h.expectedCadenceHours).toBe(24);
    expect(h.staleAfterHours).toBe(36);
  });

  it("treats an unchanged-data run as a success — the pipeline still worked (SBP)", () => {
    resetAll();
    const unchanged = run(SBP_MONITOR_JOB.ingestionJobName, {
      finishedAt: new Date(NOW.getTime() - 3 * HOUR).toISOString(),
      detail: "Fetched 22 indicators | 22 unchanged | 0 updated | 0 failed",
    });
    expect(evaluateIngestionHealth([unchanged], [], NOW, SBP_MONITOR_JOB).state).toBe("healthy");
  });

  it("treats a '3 unchanged' World Bank run as healthy too — ingestion health is not data freshness", () => {
    resetAll();
    const unchanged = run(WORLD_BANK_MONITOR_JOB.ingestionJobName, {
      finishedAt: new Date(NOW.getTime() - 3 * HOUR).toISOString(),
      detail: "Fetched 3 World Bank series | 3 unchanged | 0 updated | 0 failed",
    });
    expect(evaluateIngestionHealth([unchanged], [], NOW, WORLD_BANK_MONITOR_JOB).state).toBe("healthy");
  });

  it("marks a successful run older than the job's own window as stale — SBP", () => {
    resetAll();
    const h = evaluateIngestionHealth([successAgo(SBP_MONITOR_JOB.ingestionJobName, 37)], [], NOW, SBP_MONITOR_JOB);
    expect(h.state).toBe("stale");
  });

  it("marks a successful run older than the job's own window as stale — World Bank (uses 216h, not SBP's 36h)", () => {
    resetAll();
    // 40h old would be "stale" under SBP's threshold but must be "healthy" under World Bank's 216h — proves the evaluator uses the PASSED-IN job's own threshold, not a shared constant.
    const healthyUnderWb = evaluateIngestionHealth([successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 40)], [], NOW, WORLD_BANK_MONITOR_JOB);
    expect(healthyUnderWb.state).toBe("healthy");

    const staleUnderWb = evaluateIngestionHealth([successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 217)], [], NOW, WORLD_BANK_MONITOR_JOB);
    expect(staleUnderWb.state).toBe("stale");
  });

  it("stays healthy exactly at each job's own threshold boundary", () => {
    resetAll();
    expect(evaluateIngestionHealth([successAgo(SBP_MONITOR_JOB.ingestionJobName, 36)], [], NOW, SBP_MONITOR_JOB).state).toBe("healthy");
    expect(evaluateIngestionHealth([successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 216)], [], NOW, WORLD_BANK_MONITOR_JOB).state).toBe("healthy");
  });

  it("goes stale exactly one unit past each job's own threshold boundary", () => {
    resetAll();
    expect(evaluateIngestionHealth([successAgo(SBP_MONITOR_JOB.ingestionJobName, 36.001)], [], NOW, SBP_MONITOR_JOB).state).toBe("stale");
    expect(evaluateIngestionHealth([successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 216.001)], [], NOW, WORLD_BANK_MONITOR_JOB).state).toBe("stale");
  });

  it("reports never-run when no successful run exists, for any job", () => {
    resetAll();
    const failed = run(WORLD_BANK_MONITOR_JOB.ingestionJobName, { finishedAt: new Date(NOW.getTime() - HOUR).toISOString(), status: "failure" });
    const h = evaluateIngestionHealth([failed], [], NOW, WORLD_BANK_MONITOR_JOB);
    expect(h.state).toBe("never-run");
    expect(h.lastSuccessAt).toBeNull();
    expect(h.ageMs).toBeNull();
  });

  it("ignores failed and skipped runs when finding the last success", () => {
    resetAll();
    const recentFailure = run(SBP_MONITOR_JOB.ingestionJobName, { finishedAt: new Date(NOW.getTime() - HOUR).toISOString(), status: "failure" });
    const oldSuccess = successAgo(SBP_MONITOR_JOB.ingestionJobName, 40);
    expect(evaluateIngestionHealth([oldSuccess, recentFailure], [], NOW, SBP_MONITOR_JOB).state).toBe("stale");
  });

  it("derives the episode key from the last success so recovery starts a new episode", () => {
    resetAll();
    const a = evaluateIngestionHealth([successAgo(SBP_MONITOR_JOB.ingestionJobName, 50)], [], NOW, SBP_MONITOR_JOB);
    const b = evaluateIngestionHealth([successAgo(SBP_MONITOR_JOB.ingestionJobName, 50), successAgo(SBP_MONITOR_JOB.ingestionJobName, 1)], [], NOW, SBP_MONITOR_JOB);
    expect(a.episodeKey).not.toBe(b.episodeKey);
  });

  it("the evaluator does not IMPORT any freshness-engine module (no data-cadence coupling) — prose comments explaining the boundary are fine, an import statement would not be", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./ingestionWatchdog.ts", import.meta.url), "utf-8"));
    const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line));
    for (const line of importLines) {
      expect(line).not.toMatch(/freshnessEngine|seriesRegistry/);
    }
  });
});

describe("C. job isolation", () => {
  it("SBP and World Bank are evaluated independently from the same MONITORED_INGESTION_JOBS pass", async () => {
    resetAll();
    mockHistories({
      [SBP_MONITOR_JOB.ingestionJobName]: [successAgo(SBP_MONITOR_JOB.ingestionJobName, 2)],
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 300)], // stale under WB's own threshold
    });

    const results = await Promise.all(MONITORED_INGESTION_JOBS.map((job) => runIngestionWatchdog(job, NOW)));

    const sbpResult = results.find((r) => r.job.ingestionJobName === SBP_MONITOR_JOB.ingestionJobName)!;
    const wbResult = results.find((r) => r.job.ingestionJobName === WORLD_BANK_MONITOR_JOB.ingestionJobName)!;
    expect(sbpResult.health.state).toBe("healthy");
    expect(wbResult.health.state).toBe("stale");
  });

  it("one job's evaluation reads ONLY its own ingestion + watchdog history, never the other job's", async () => {
    resetAll();
    const calls: string[] = [];
    getCronRunHistoryMock.mockImplementation(async (jobName: string) => {
      calls.push(jobName);
      return [];
    });
    await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    expect(calls).toEqual([WORLD_BANK_MONITOR_JOB.ingestionJobName, WORLD_BANK_MONITOR_JOB.watchdogJobName]);
    expect(calls).not.toContain(SBP_MONITOR_JOB.ingestionJobName);
    expect(calls).not.toContain(SBP_MONITOR_JOB.watchdogJobName);
  });
});

describe("D. deduplication", () => {
  it("1. SBP failure alerts", async () => {
    resetAll();
    mockHistories({ [SBP_MONITOR_JOB.ingestionJobName]: [successAgo(SBP_MONITOR_JOB.ingestionJobName, 40)] });
    const result = await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.alertSent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("2. repeated SBP failure does not alert again", async () => {
    resetAll();
    const lastSuccess = successAgo(SBP_MONITOR_JOB.ingestionJobName, 40);
    mockHistories({ [SBP_MONITOR_JOB.ingestionJobName]: [lastSuccess] });
    await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);
    const firstDetail = logCronRunMock.mock.calls[0][3] as string;

    const priorWatchdogRun = run(SBP_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: firstDetail });
    sendEmailMock.mockClear();
    mockHistories({ [SBP_MONITOR_JOB.ingestionJobName]: [lastSuccess], [SBP_MONITOR_JOB.watchdogJobName]: [priorWatchdogRun] });

    const second = await runIngestionWatchdog(SBP_MONITOR_JOB, new Date(NOW.getTime() + HOUR));
    expect(second.health.alertAlreadySent).toBe(true);
    expect(second.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("3. SBP recovery creates a new episode and re-enables alerting", async () => {
    resetAll();
    const oldEpisode = successAgo(SBP_MONITOR_JOB.ingestionJobName, 200);
    const staleAlert = run(SBP_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${oldEpisode.finishedAt}` });

    // Recovers, then goes stale again — a NEW episode.
    const recovery = successAgo(SBP_MONITOR_JOB.ingestionJobName, 40);
    mockHistories({ [SBP_MONITOR_JOB.ingestionJobName]: [oldEpisode, recovery], [SBP_MONITOR_JOB.watchdogJobName]: [staleAlert] });

    const result = await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.health.alertAlreadySent).toBe(false); // old marker was for a DIFFERENT episode
    expect(result.alertSent).toBe(true);
  });

  it("4. World Bank failure alerts independently", async () => {
    resetAll();
    mockHistories({ [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)] });
    const result = await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.alertSent).toBe(true);
  });

  it("5. an SBP failure does not suppress World Bank's alert", async () => {
    resetAll();
    // SBP already alerted for its own episode.
    const sbpEpisode = successAgo(SBP_MONITOR_JOB.ingestionJobName, 40);
    const sbpAlert = run(SBP_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${sbpEpisode.finishedAt}` });
    mockHistories({
      [SBP_MONITOR_JOB.ingestionJobName]: [sbpEpisode],
      [SBP_MONITOR_JOB.watchdogJobName]: [sbpAlert],
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)],
    });

    const wbResult = await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    expect(wbResult.health.alertAlreadySent).toBe(false);
    expect(wbResult.alertSent).toBe(true);
  });

  it("6. a World Bank failure does not suppress SBP's alert", async () => {
    resetAll();
    const wbEpisode = successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220);
    const wbAlert = run(WORLD_BANK_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${wbEpisode.finishedAt}` });
    mockHistories({
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [wbEpisode],
      [WORLD_BANK_MONITOR_JOB.watchdogJobName]: [wbAlert],
      [SBP_MONITOR_JOB.ingestionJobName]: [successAgo(SBP_MONITOR_JOB.ingestionJobName, 40)],
    });

    const sbpResult = await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);
    expect(sbpResult.health.alertAlreadySent).toBe(false);
    expect(sbpResult.alertSent).toBe(true);
  });

  it("7. both fail independently — two alerts, one per job", async () => {
    resetAll();
    mockHistories({
      [SBP_MONITOR_JOB.ingestionJobName]: [successAgo(SBP_MONITOR_JOB.ingestionJobName, 40)],
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)],
    });

    const [sbpResult, wbResult] = await Promise.all([
      runIngestionWatchdog(SBP_MONITOR_JOB, NOW),
      runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW),
    ]);

    expect(sbpResult.alertSent).toBe(true);
    expect(wbResult.alertSent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it("8. never-run deduplicates using episodeKey='never', scoped per job", async () => {
    resetAll();
    mockHistories({}); // no history for either job
    await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    const detail = logCronRunMock.mock.calls[0][3] as string;
    expect(detail).toContain("alerted-for=never");

    const priorNeverRunAlert = run(WORLD_BANK_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail });
    sendEmailMock.mockClear();
    mockHistories({ [WORLD_BANK_MONITOR_JOB.watchdogJobName]: [priorNeverRunAlert] });
    const second = await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, new Date(NOW.getTime() + HOUR));
    expect(second.health.alertAlreadySent).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("9. a failed email send retries on the next invocation (no marker written)", async () => {
    resetAll();
    sendEmailMock.mockResolvedValue({ success: false, error: "smtp down" });
    mockHistories({ [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)] });

    await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);

    const detail = logCronRunMock.mock.calls[0][3] as string;
    expect(detail).not.toContain("alerted-for=");
    expect(detail).toContain("no-alert");
  });

  it("10. duplicate invocation for the same job/episode is bounded by the existing marker-check + Resend-idempotency-key protection (unchanged race profile)", async () => {
    resetAll();
    mockHistories({ [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)] });

    const [first, second] = await Promise.all([
      runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW),
      runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW),
    ]);
    // Both see no prior marker (mocked history never changes mid-flight, matching the app-level race this already had for SBP) --
    // but both share the SAME idempotency key, which is the existing, unchanged Resend-level protection against an actual duplicate send reaching the recipient twice.
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    const [firstArgs, firstKey] = sendEmailMock.mock.calls[0];
    const [secondArgs, secondKey] = sendEmailMock.mock.calls[1];
    expect(firstKey).toBe(secondKey);
    expect(firstKey).toBe(`${WORLD_BANK_MONITOR_JOB.watchdogJobName}-${first.health.episodeKey}`);
    expect(secondKey).toBe(`${WORLD_BANK_MONITOR_JOB.watchdogJobName}-${second.health.episodeKey}`);
    expect(firstArgs.subject).toBe(secondArgs.subject);
  });

  it("idempotency key incorporates job identity — SBP and World Bank alerts for a coincidentally-identical episodeKey never collide", async () => {
    resetAll();
    // 220h ago is stale under BOTH jobs' own thresholds (SBP: 36h, World Bank: 216h) — needed so both alerts actually fire from the same shared timestamp.
    const sameTimestamp = new Date(NOW.getTime() - 220 * HOUR).toISOString();
    mockHistories({
      [SBP_MONITOR_JOB.ingestionJobName]: [run(SBP_MONITOR_JOB.ingestionJobName, { finishedAt: sameTimestamp })],
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [run(WORLD_BANK_MONITOR_JOB.ingestionJobName, { finishedAt: sameTimestamp })],
    });
    await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);
    await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);

    const sbpKey = sendEmailMock.mock.calls[0][1] as string;
    const wbKey = sendEmailMock.mock.calls[1][1] as string;
    expect(sbpKey).not.toBe(wbKey);
    expect(sbpKey).toContain(SBP_MONITOR_JOB.watchdogJobName);
    expect(wbKey).toContain(WORLD_BANK_MONITOR_JOB.watchdogJobName);
  });
});

describe("E. security", () => {
  it("never places secrets, URLs or credentials in the alert or the run log — SBP", async () => {
    resetAll();
    process.env.SBP_EASYDATA_API_KEY = "SUPER-SECRET-KEY";
    mockHistories({ [SBP_MONITOR_JOB.ingestionJobName]: [successAgo(SBP_MONITOR_JOB.ingestionJobName, 40)] });

    await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);

    const [emailArgs] = sendEmailMock.mock.calls[0];
    const emailBlob = JSON.stringify(emailArgs);
    const logBlob = String(logCronRunMock.mock.calls[0][3]);
    for (const blob of [emailBlob, logBlob]) {
      expect(blob).not.toContain("SUPER-SECRET-KEY");
      expect(blob).not.toContain("api_key");
      expect(blob).not.toContain("easydata.sbp.org.pk");
    }
  });

  it("never places World Bank source data or Supabase credentials in the alert or the run log", async () => {
    resetAll();
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "FAKE-ANON-KEY-VALUE";
    process.env.NOTIFICATION_WORKER_SECRET = "FAKE-INTERNAL-SECRET";
    mockHistories({ [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)] });

    await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);

    const [emailArgs] = sendEmailMock.mock.calls[0];
    const emailBlob = JSON.stringify(emailArgs);
    const logBlob = String(logCronRunMock.mock.calls[0][3]);
    for (const blob of [emailBlob, logBlob]) {
      expect(blob).not.toContain("FAKE-ANON-KEY-VALUE");
      expect(blob).not.toContain("FAKE-INTERNAL-SECRET");
      expect(blob).not.toContain("api.worldbank.org");
    }
  });

  it("never reads process.env directly for anything except ADMIN_EMAIL (no provider credential is read by this module)", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./ingestionWatchdog.ts", import.meta.url), "utf-8"));
    const envReads = [...source.matchAll(/process\.env\.(\w+)/g)].map((m) => m[1]);
    expect(new Set(envReads)).toEqual(new Set(["ADMIN_EMAIL"]));
  });

  it("skips alerting when no recipient is configured, without throwing, for any job", async () => {
    resetAll();
    delete process.env.ADMIN_EMAIL;
    mockHistories({ [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220)] });

    const result = await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    expect(result.alertSent).toBe(false);
    expect(result.reason).toContain("ADMIN_EMAIL");
    expect(sendEmailMock).not.toHaveBeenCalled();
    process.env.ADMIN_EMAIL = "ops@example.com";
  });

  it("records each job's own run under that job's own watchdogJobName, never under its ingestionJobName or another job's watchdogJobName", async () => {
    resetAll();
    mockHistories({ [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 2)] });
    await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    expect(logCronRunMock.mock.calls[0][0]).toBe(WORLD_BANK_MONITOR_JOB.watchdogJobName);
    expect(logCronRunMock.mock.calls[0][0]).not.toBe(WORLD_BANK_MONITOR_JOB.ingestionJobName);
    expect(logCronRunMock.mock.calls[0][0]).not.toBe(SBP_MONITOR_JOB.watchdogJobName);
  });
});

describe("F. Net Liquid FX Reserves — Phase 8.10D dedicated coverage", () => {
  it("1. healthy weekly ingestion", async () => {
    resetAll();
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 2)] });
    const result = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("healthy");
    expect(result.alertSent).toBe(false);
  });

  it("2. stale weekly ingestion (past the 216h threshold)", async () => {
    resetAll();
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220)] });
    const result = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.alertSent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("3. never-run state", async () => {
    resetAll();
    mockHistories({});
    const result = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("never-run");
    expect(result.health.lastSuccessAt).toBeNull();
    expect(result.alertSent).toBe(true); // never-run is alertable, same as the other two jobs
  });

  it("4. a failed recent run does not mask an old successful run", async () => {
    resetAll();
    const oldSuccess = successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220);
    const recentFailure = run(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, { finishedAt: new Date(NOW.getTime() - 1 * HOUR).toISOString(), status: "failure" });
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [oldSuccess, recentFailure] });
    const result = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    // A failure 1h ago must not be mistaken for a success -- the 220h-old
    // success is still the last GENUINE success, correctly reported stale.
    expect(result.health.state).toBe("stale");
    expect(result.health.lastSuccessAt).toBe(oldSuccess.finishedAt);
  });

  it("5. alert deduplication — repeated stale checks during the same episode do not re-alert", async () => {
    resetAll();
    const lastSuccess = successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220);
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [lastSuccess] });
    await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    const firstDetail = logCronRunMock.mock.calls[0][3] as string;

    const priorWatchdogRun = run(NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: firstDetail });
    sendEmailMock.mockClear();
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [lastSuccess], [NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName]: [priorWatchdogRun] });

    const second = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, new Date(NOW.getTime() + HOUR));
    expect(second.health.alertAlreadySent).toBe(true);
    expect(second.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("6. recovery creates a new alert episode", async () => {
    resetAll();
    const oldEpisode = successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 400);
    const staleAlert = run(NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${oldEpisode.finishedAt}` });
    const recovery = successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220); // recovered, then went stale again -- a NEW episode
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [oldEpisode, recovery], [NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName]: [staleAlert] });

    const result = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.health.alertAlreadySent).toBe(false); // old marker was for a DIFFERENT episode
    expect(result.alertSent).toBe(true);
  });

  it("7. missing ADMIN_EMAIL remains safe (no throw, alert simply skipped)", async () => {
    resetAll();
    delete process.env.ADMIN_EMAIL;
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220)] });

    const result = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    expect(result.alertSent).toBe(false);
    expect(result.reason).toContain("ADMIN_EMAIL");
    expect(sendEmailMock).not.toHaveBeenCalled();
    process.env.ADMIN_EMAIL = "ops@example.com";
  });

  it("8. no SBP/World Bank/Net Liquid FX secrets appear in alert or log output", async () => {
    resetAll();
    process.env.SBP_EASYDATA_API_KEY = "SUPER-SECRET-SBP-KEY";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "FAKE-ANON-KEY";
    mockHistories({ [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220)] });

    await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);

    const [emailArgs] = sendEmailMock.mock.calls[0];
    const emailBlob = JSON.stringify(emailArgs);
    const logBlob = String(logCronRunMock.mock.calls[0][3]);
    for (const blob of [emailBlob, logBlob]) {
      expect(blob).not.toContain("SUPER-SECRET-SBP-KEY");
      expect(blob).not.toContain("FAKE-ANON-KEY");
      expect(blob).not.toContain("sbp.org.pk");
      expect(blob).not.toContain("worldbank.org");
    }
  });

  it("job isolation: a Net Liquid FX episode never suppresses or is suppressed by World Bank's or SBP's", async () => {
    resetAll();
    const nlrEpisode = successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220);
    const wbEpisode = successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 220);
    const wbAlert = run(WORLD_BANK_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${wbEpisode.finishedAt}` });
    mockHistories({
      [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [nlrEpisode],
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [wbEpisode],
      [WORLD_BANK_MONITOR_JOB.watchdogJobName]: [wbAlert],
    });

    const nlrResult = await runIngestionWatchdog(NET_LIQUID_RESERVES_MONITOR_JOB, NOW);
    expect(nlrResult.health.alertAlreadySent).toBe(false);
    expect(nlrResult.alertSent).toBe(true);
  });
});

describe("G. FRED — Phase 8.14 dedicated coverage", () => {
  it("A/F. FRED monitor job exists and evaluates a healthy weekly ingestion as healthy", async () => {
    resetAll();
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [successAgo(FRED_MONITOR_JOB.ingestionJobName, 2)] });
    const result = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("healthy");
    expect(result.alertSent).toBe(false);
  });

  it("G. an old successful run (past the 216h threshold) is correctly reported stale", async () => {
    resetAll();
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [successAgo(FRED_MONITOR_JOB.ingestionJobName, 220)] });
    const result = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.alertSent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("H. never-run state", async () => {
    resetAll();
    mockHistories({});
    const result = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("never-run");
    expect(result.health.lastSuccessAt).toBeNull();
    expect(result.alertSent).toBe(true); // never-run is alertable, same as every other job
  });

  it("I. a failed recent run does not mask an old successful run", async () => {
    resetAll();
    const oldSuccess = successAgo(FRED_MONITOR_JOB.ingestionJobName, 220);
    const recentFailure = run(FRED_MONITOR_JOB.ingestionJobName, { finishedAt: new Date(NOW.getTime() - 1 * HOUR).toISOString(), status: "failure" });
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [oldSuccess, recentFailure] });
    const result = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.health.lastSuccessAt).toBe(oldSuccess.finishedAt);
  });

  it("J. alert deduplication — repeated stale checks during the same episode do not re-alert", async () => {
    resetAll();
    const lastSuccess = successAgo(FRED_MONITOR_JOB.ingestionJobName, 220);
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [lastSuccess] });
    await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    const firstDetail = logCronRunMock.mock.calls[0][3] as string;

    const priorWatchdogRun = run(FRED_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: firstDetail });
    sendEmailMock.mockClear();
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [lastSuccess], [FRED_MONITOR_JOB.watchdogJobName]: [priorWatchdogRun] });

    const second = await runIngestionWatchdog(FRED_MONITOR_JOB, new Date(NOW.getTime() + HOUR));
    expect(second.health.alertAlreadySent).toBe(true);
    expect(second.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("K. recovery creates a new alert episode", async () => {
    resetAll();
    const oldEpisode = successAgo(FRED_MONITOR_JOB.ingestionJobName, 400);
    const staleAlert = run(FRED_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${oldEpisode.finishedAt}` });
    const recovery = successAgo(FRED_MONITOR_JOB.ingestionJobName, 220); // recovered, then went stale again -- a NEW episode
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [oldEpisode, recovery], [FRED_MONITOR_JOB.watchdogJobName]: [staleAlert] });

    const result = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.health.alertAlreadySent).toBe(false); // old marker was for a DIFFERENT episode
    expect(result.alertSent).toBe(true);
  });

  it("L. missing ADMIN_EMAIL remains safe (no throw, alert simply skipped)", async () => {
    resetAll();
    delete process.env.ADMIN_EMAIL;
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [successAgo(FRED_MONITOR_JOB.ingestionJobName, 220)] });

    const result = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(result.alertSent).toBe(false);
    expect(result.reason).toContain("ADMIN_EMAIL");
    expect(sendEmailMock).not.toHaveBeenCalled();
    process.env.ADMIN_EMAIL = "ops@example.com";
  });

  it("M. no FRED/SBP/World Bank/Net Liquid FX secrets appear in alert or log output", async () => {
    resetAll();
    process.env.FRED_API_KEY = "SUPER-SECRET-FRED-KEY";
    process.env.SBP_EASYDATA_API_KEY = "SUPER-SECRET-SBP-KEY";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "FAKE-ANON-KEY";
    mockHistories({ [FRED_MONITOR_JOB.ingestionJobName]: [successAgo(FRED_MONITOR_JOB.ingestionJobName, 220)] });

    await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);

    const [emailArgs] = sendEmailMock.mock.calls[0];
    const emailBlob = JSON.stringify(emailArgs);
    const logBlob = String(logCronRunMock.mock.calls[0][3]);
    for (const blob of [emailBlob, logBlob]) {
      expect(blob).not.toContain("SUPER-SECRET-FRED-KEY");
      expect(blob).not.toContain("SUPER-SECRET-SBP-KEY");
      expect(blob).not.toContain("FAKE-ANON-KEY");
      expect(blob).not.toContain("stlouisfed.org");
      expect(blob).not.toContain("sbp.org.pk");
    }
  });

  it("N. job isolation: a FRED episode never suppresses or is suppressed by SBP's, World Bank's, or Net Liquid FX Reserves'", async () => {
    resetAll();
    const fredEpisode = successAgo(FRED_MONITOR_JOB.ingestionJobName, 220);
    const nlrEpisode = successAgo(NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName, 220);
    const nlrAlert = run(NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${nlrEpisode.finishedAt}` });
    mockHistories({
      [FRED_MONITOR_JOB.ingestionJobName]: [fredEpisode],
      [NET_LIQUID_RESERVES_MONITOR_JOB.ingestionJobName]: [nlrEpisode],
      [NET_LIQUID_RESERVES_MONITOR_JOB.watchdogJobName]: [nlrAlert],
    });

    const fredResult = await runIngestionWatchdog(FRED_MONITOR_JOB, NOW);
    expect(fredResult.health.alertAlreadySent).toBe(false);
    expect(fredResult.alertSent).toBe(true);
  });

  it("O. the generic watchdog route (sbp-ingestion-watchdog/route.ts) discovers FRED automatically via MONITORED_INGESTION_JOBS — no route change needed", () => {
    expect(MONITORED_INGESTION_JOBS).toContain(FRED_MONITOR_JOB);
  });
});

describe("H. Yahoo Gold — Phase 8.18 dedicated coverage", () => {
  it("A/F. registry contains Gold exactly once, and a healthy recent monthly run evaluates healthy", async () => {
    resetAll();
    expect(MONITORED_INGESTION_JOBS.filter((j) => j === YAHOO_GOLD_MONITOR_JOB)).toHaveLength(1);
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 2)] });
    const result = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("healthy");
    expect(result.alertSent).toBe(false);
  });

  it("G. an old successful run (past the 912h threshold) is correctly reported stale", async () => {
    resetAll();
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920)] });
    const result = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.alertSent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("H. never-run state", async () => {
    resetAll();
    mockHistories({});
    const result = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("never-run");
    expect(result.health.lastSuccessAt).toBeNull();
    expect(result.alertSent).toBe(true); // never-run is alertable, same as every other job
  });

  it("I. a failed recent run does not mask an old successful run", async () => {
    resetAll();
    const oldSuccess = successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920);
    const recentFailure = run(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, { finishedAt: new Date(NOW.getTime() - 1 * HOUR).toISOString(), status: "failure" });
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [oldSuccess, recentFailure] });
    const result = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.health.lastSuccessAt).toBe(oldSuccess.finishedAt);
  });

  it("J. alert deduplication — repeated stale checks during the same episode do not re-alert", async () => {
    resetAll();
    const lastSuccess = successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920);
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [lastSuccess] });
    await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    const firstDetail = logCronRunMock.mock.calls[0][3] as string;

    const priorWatchdogRun = run(YAHOO_GOLD_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: firstDetail });
    sendEmailMock.mockClear();
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [lastSuccess], [YAHOO_GOLD_MONITOR_JOB.watchdogJobName]: [priorWatchdogRun] });

    const second = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, new Date(NOW.getTime() + HOUR));
    expect(second.health.alertAlreadySent).toBe(true);
    expect(second.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("K. recovery creates a new alert episode", async () => {
    resetAll();
    const oldEpisode = successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 1500);
    const staleAlert = run(YAHOO_GOLD_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${oldEpisode.finishedAt}` });
    const recovery = successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920); // recovered, then went stale again -- a NEW episode
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [oldEpisode, recovery], [YAHOO_GOLD_MONITOR_JOB.watchdogJobName]: [staleAlert] });

    const result = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(result.health.state).toBe("stale");
    expect(result.health.alertAlreadySent).toBe(false); // old marker was for a DIFFERENT episode
    expect(result.alertSent).toBe(true);
  });

  it("L. job isolation: a Yahoo Gold episode never suppresses or is suppressed by SBP's, World Bank's, Net Liquid FX Reserves', or FRED's", async () => {
    resetAll();
    const goldEpisode = successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920);
    const fredEpisode = successAgo(FRED_MONITOR_JOB.ingestionJobName, 220);
    const fredAlert = run(FRED_MONITOR_JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: `state=stale | alerted-for=${fredEpisode.finishedAt}` });
    mockHistories({
      [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [goldEpisode],
      [FRED_MONITOR_JOB.ingestionJobName]: [fredEpisode],
      [FRED_MONITOR_JOB.watchdogJobName]: [fredAlert],
    });

    const goldResult = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(goldResult.health.alertAlreadySent).toBe(false);
    expect(goldResult.alertSent).toBe(true);
  });

  it("M. missing ADMIN_EMAIL remains safe (no throw, alert simply skipped)", async () => {
    resetAll();
    delete process.env.ADMIN_EMAIL;
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920)] });

    const result = await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);
    expect(result.alertSent).toBe(false);
    expect(result.reason).toContain("ADMIN_EMAIL");
    expect(sendEmailMock).not.toHaveBeenCalled();
    process.env.ADMIN_EMAIL = "ops@example.com";
  });

  it("N. no Yahoo/FRED/SBP/World Bank/Net Liquid FX secrets appear in alert or log output", async () => {
    resetAll();
    process.env.SBP_EASYDATA_API_KEY = "SUPER-SECRET-SBP-KEY";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "FAKE-ANON-KEY";
    mockHistories({ [YAHOO_GOLD_MONITOR_JOB.ingestionJobName]: [successAgo(YAHOO_GOLD_MONITOR_JOB.ingestionJobName, 920)] });

    await runIngestionWatchdog(YAHOO_GOLD_MONITOR_JOB, NOW);

    const [emailArgs] = sendEmailMock.mock.calls[0];
    const emailBlob = JSON.stringify(emailArgs);
    const logBlob = String(logCronRunMock.mock.calls[0][3]);
    for (const blob of [emailBlob, logBlob]) {
      expect(blob).not.toContain("SUPER-SECRET-SBP-KEY");
      expect(blob).not.toContain("FAKE-ANON-KEY");
      expect(blob).not.toContain("query1.finance.yahoo.com");
      expect(blob).not.toContain("stlouisfed.org");
    }
  });

  it("P. the generic watchdog route discovers Yahoo Gold automatically via MONITORED_INGESTION_JOBS — no route change needed", () => {
    expect(MONITORED_INGESTION_JOBS).toContain(YAHOO_GOLD_MONITOR_JOB);
  });
});

// Phase 21 (C1) — repeat the alert every 72h while ONE failure episode continues.
describe("I. reminders — Phase 21 C1", () => {
  const JOB = SBP_MONITOR_JOB;
  /** A watchdog row recording an alert for `episodeKey`, finished `hoursAgo` before NOW. */
  function alertRow(episodeKey: string, hoursAgo: number, extra = ""): CronRunRecord {
    return run(JOB.watchdogJobName, {
      finishedAt: new Date(NOW.getTime() - hoursAgo * HOUR).toISOString(),
      status: "failure",
      detail: `job=${JOB.ingestionJobName} | state=stale | alerted-for=${episodeKey}${extra}`,
    });
  }
  /** One ingestion success long enough ago to be stale; episodeKey is its finishedAt. */
  const staleSuccess = () => successAgo(JOB.ingestionJobName, 200);

  it("A. initial alert: no prior alert -> a plain (non-reminder) alert with the unchanged pre-reminder idempotency key", async () => {
    resetAll();
    const success = staleSuccess();
    mockHistories({ [JOB.ingestionJobName]: [success] });
    const result = await runIngestionWatchdog(JOB, NOW);

    expect(result.alertSent).toBe(true);
    expect(result.reason).toBe("alert sent");
    expect(result.health.reminderDue).toBe(false); // nothing to remind about yet
    const [email, key] = sendEmailMock.mock.calls[0];
    expect(email.subject).not.toMatch(/^Reminder/);
    expect(email.text).not.toContain("Reminder:");
    expect(key).toBe(`${JOB.watchdogJobName}-${success.finishedAt}`);
    expect(logCronRunMock.mock.calls[0][3]).not.toContain("reminder-after=");
  });

  it("B. suppressed at every point before the interval has elapsed (1h, 24h, 48h, 70h)", async () => {
    for (const hoursSinceAlert of [1, 24, 48, 70]) {
      resetAll();
      const success = staleSuccess();
      mockHistories({
        [JOB.ingestionJobName]: [success],
        [JOB.watchdogJobName]: [alertRow(success.finishedAt, hoursSinceAlert)],
      });
      const result = await runIngestionWatchdog(JOB, NOW);
      expect(result.alertSent, `${hoursSinceAlert}h`).toBe(false);
      expect(result.health.reminderDue, `${hoursSinceAlert}h`).toBe(false);
      expect(result.reason).toBe("already alerted for this episode — suppressed");
      expect(sendEmailMock).not.toHaveBeenCalled();
    }
  });

  it("C. reminder is sent once 72h have passed since the last alert, as a clearly marked reminder", async () => {
    resetAll();
    const success = staleSuccess();
    const prior = alertRow(success.finishedAt, 72);
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [prior] });
    const result = await runIngestionWatchdog(JOB, NOW);

    expect(result.health.alertAlreadySent).toBe(true);
    expect(result.health.reminderDue).toBe(true);
    expect(result.alertSent).toBe(true);
    expect(result.reason).toBe("reminder sent");
    const [email] = sendEmailMock.mock.calls[0];
    expect(email.subject).toMatch(/^Reminder — PEIC: SBP ingestion stale/);
    expect(email.text).toContain(`Last alert sent ${prior.finishedAt}`);
    expect(email.text).toContain("every 72h");
    // Still the same safe, credential-free content as the initial alert.
    expect(email.text).toContain("Last successful run");
  });

  it("D. the 72h boundary tolerates the cron's own timing: due at 71h, not due a hair before", async () => {
    // The watchdog is a once-a-day cron that logs its row a few seconds after it starts, so the third daily run sees slightly UNDER 72h.
    // Without the 1h tolerance this would silently become a 96h cadence (see test H).
    resetAll();
    const success = staleSuccess();
    const justUnder = new Date(NOW.getTime() - (71 * HOUR - 1)).toISOString();
    const exactly = new Date(NOW.getTime() - 71 * HOUR).toISOString();
    const mk = (finishedAt: string) => [run(JOB.watchdogJobName, { finishedAt, status: "failure", detail: `alerted-for=${success.finishedAt}` })];

    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: mk(justUnder) });
    expect((await runIngestionWatchdog(JOB, NOW)).alertSent).toBe(false);

    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: mk(exactly) });
    expect((await runIngestionWatchdog(JOB, NOW)).alertSent).toBe(true);
  });

  it("E. the reminder interval is measured from the MOST RECENT alert, not the first", async () => {
    resetAll();
    const success = staleSuccess();
    // First alert 150h ago, a reminder 30h ago -> only 30h since the last one: suppressed.
    mockHistories({
      [JOB.ingestionJobName]: [success],
      [JOB.watchdogJobName]: [alertRow(success.finishedAt, 150), alertRow(success.finishedAt, 30)],
    });
    const result = await runIngestionWatchdog(JOB, NOW);
    expect(result.health.lastAlertAt).toBe(new Date(NOW.getTime() - 30 * HOUR).toISOString());
    expect(result.alertSent).toBe(false);
  });

  it("F. idempotency keys: deterministic within one reminder interval, distinct for each successive reminder, distinct from the initial alert", async () => {
    resetAll();
    const success = staleSuccess();
    const initialKey = `${JOB.watchdogJobName}-${success.finishedAt}`;

    // Two invocations in the same interval see the same last alert -> same key (provider-level dedupe).
    const alert1 = alertRow(success.finishedAt, 72);
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [alert1] });
    await Promise.all([runIngestionWatchdog(JOB, NOW), runIngestionWatchdog(JOB, NOW)]);
    const [, k1a] = sendEmailMock.mock.calls[0];
    const [, k1b] = sendEmailMock.mock.calls[1];
    expect(k1a).toBe(k1b);
    expect(k1a).toBe(`${initialKey}-reminder-after-${alert1.finishedAt}`);

    // That reminder is logged at NOW; the NEXT one (72h later) is anchored to that row -> a different key.
    sendEmailMock.mockClear();
    const reminder1Row = run(JOB.watchdogJobName, {
      finishedAt: NOW.toISOString(),
      status: "failure",
      detail: `alerted-for=${success.finishedAt} | reminder-after=${alert1.finishedAt}`,
    });
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [alert1, reminder1Row] });
    await runIngestionWatchdog(JOB, new Date(NOW.getTime() + 72 * HOUR));
    const [, k2] = sendEmailMock.mock.calls[0];
    expect(k2).toBe(`${initialKey}-reminder-after-${reminder1Row.finishedAt}`);
    expect(new Set([initialKey, k1a, k2]).size).toBe(3);
  });

  it("G. a reminder writes the same alert marker (so it suppresses the next 72h) plus an audit field; a suppressed run writes neither", async () => {
    resetAll();
    const success = staleSuccess();
    const prior = alertRow(success.finishedAt, 80);
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [prior] });
    await runIngestionWatchdog(JOB, NOW);
    const detail = logCronRunMock.mock.calls[0][3] as string;
    expect(detail).toContain(`alerted-for=${success.finishedAt}`);
    expect(detail).toContain(`reminder-after=${prior.finishedAt}`);

    // Replaying that row as history -> the next hour's check is suppressed.
    sendEmailMock.mockClear();
    const reminderRow = run(JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail });
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [prior, reminderRow] });
    const next = await runIngestionWatchdog(JOB, new Date(NOW.getTime() + HOUR));
    expect(next.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(logCronRunMock.mock.calls[1][3]).not.toContain("alerted-for=");
    expect(logCronRunMock.mock.calls[1][3]).not.toContain("reminder-after=");
  });

  it("H. simulated daily cron over 12 days: alerts land on days 0, 3, 6, 9 — NOT every 4th day despite the run being logged seconds after it starts", async () => {
    resetAll();
    const success = successAgo(JOB.ingestionJobName, 40); // already stale on day 0
    const rows: CronRunRecord[] = [];
    const alertDays: number[] = [];
    const DAY = 24 * HOUR;
    for (let day = 0; day < 12; day++) {
      const runNow = new Date(NOW.getTime() + day * DAY); // cron fires at the same time daily
      mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [...rows] });
      sendEmailMock.mockClear();
      logCronRunMock.mockClear();
      await runIngestionWatchdog(JOB, runNow);
      if (sendEmailMock.mock.calls.length > 0) alertDays.push(day);
      // logCronRun runs after the send; the DB stamps finished_at a few seconds after the run began.
      const [, , status, detail] = logCronRunMock.mock.calls[0];
      rows.unshift(run(JOB.watchdogJobName, { finishedAt: new Date(runNow.getTime() + 3000).toISOString(), status, detail }));
    }
    expect(alertDays).toEqual([0, 3, 6, 9]);
  });

  it("I. recovery: once ingestion succeeds again no reminder is sent, however long ago the last alert was", async () => {
    resetAll();
    const old = staleSuccess();
    const recovery = successAgo(JOB.ingestionJobName, 2);
    mockHistories({
      [JOB.ingestionJobName]: [old, recovery],
      [JOB.watchdogJobName]: [alertRow(old.finishedAt, 500)],
    });
    const result = await runIngestionWatchdog(JOB, NOW);
    expect(result.health.state).toBe("healthy");
    expect(result.health.reminderDue).toBe(false);
    expect(result.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("J. a NEW failure after recovery is an initial alert (not a reminder), even if the previous episode's alert is itself >72h old", async () => {
    resetAll();
    const old = successAgo(JOB.ingestionJobName, 400);
    const recovery = successAgo(JOB.ingestionJobName, 40); // recovered, then failed again
    mockHistories({
      [JOB.ingestionJobName]: [old, recovery],
      [JOB.watchdogJobName]: [alertRow(old.finishedAt, 300)],
    });
    const result = await runIngestionWatchdog(JOB, NOW);
    expect(result.health.alertAlreadySent).toBe(false);
    expect(result.alertSent).toBe(true);
    expect(result.reason).toBe("alert sent");
    expect(sendEmailMock.mock.calls[0][0].subject).not.toMatch(/^Reminder/);
    expect(sendEmailMock.mock.calls[0][1]).toBe(`${JOB.watchdogJobName}-${recovery.finishedAt}`);
  });

  it("K. a failed reminder send writes no marker and is retried on the next invocation with the same key", async () => {
    resetAll();
    const success = staleSuccess();
    const prior = alertRow(success.finishedAt, 80);
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [prior] });
    sendEmailMock.mockResolvedValue({ success: false, error: "resend down" });

    const first = await runIngestionWatchdog(JOB, NOW);
    expect(first.alertSent).toBe(false);
    expect(first.reason).toBe("reminder failed: resend down");
    const failedDetail = logCronRunMock.mock.calls[0][3] as string;
    expect(failedDetail).not.toContain("alerted-for=");

    // The failed attempt's row doesn't count as an alert, so the next run is still due.
    sendEmailMock.mockResolvedValue({ success: true, id: "msg_2" });
    const failedRow = run(JOB.watchdogJobName, { finishedAt: NOW.toISOString(), status: "failure", detail: failedDetail });
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [prior, failedRow] });
    const retry = await runIngestionWatchdog(JOB, new Date(NOW.getTime() + 24 * HOUR));
    expect(retry.alertSent).toBe(true);
    expect(sendEmailMock.mock.calls[0][1]).toBe(sendEmailMock.mock.calls[1][1]);
  });

  it("L. never-run episodes also remind every 72h", async () => {
    resetAll();
    const priorNever = run(JOB.watchdogJobName, {
      finishedAt: new Date(NOW.getTime() - 72 * HOUR).toISOString(),
      status: "failure",
      detail: "state=never-run | alerted-for=never",
    });
    mockHistories({ [JOB.watchdogJobName]: [priorNever] });
    const result = await runIngestionWatchdog(JOB, NOW);
    expect(result.health.state).toBe("never-run");
    expect(result.alertSent).toBe(true);
    expect(sendEmailMock.mock.calls[0][0].subject).toMatch(/^Reminder — PEIC: SBP ingestion has never completed successfully/);
    expect(sendEmailMock.mock.calls[0][1]).toBe(`${JOB.watchdogJobName}-never-reminder-after-${priorNever.finishedAt}`);

    resetAll();
    mockHistories({ [JOB.watchdogJobName]: [{ ...priorNever, finishedAt: new Date(NOW.getTime() - 24 * HOUR).toISOString() }] });
    expect((await runIngestionWatchdog(JOB, NOW)).alertSent).toBe(false);
  });

  it("M. missing ADMIN_EMAIL on a due reminder: skipped without throwing, no marker, nothing sent", async () => {
    resetAll();
    delete process.env.ADMIN_EMAIL;
    const success = staleSuccess();
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [alertRow(success.finishedAt, 80)] });
    const result = await runIngestionWatchdog(JOB, NOW);
    expect(result.alertSent).toBe(false);
    expect(result.reason).toContain("ADMIN_EMAIL");
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(logCronRunMock.mock.calls[0][3]).not.toContain("alerted-for=");
    process.env.ADMIN_EMAIL = "ops@example.com";
  });

  it("N. job isolation: another job's recent alert neither triggers nor suppresses this job's reminder", async () => {
    resetAll();
    const sbpSuccess = successAgo(SBP_MONITOR_JOB.ingestionJobName, 200);
    const wbSuccess = successAgo(WORLD_BANK_MONITOR_JOB.ingestionJobName, 300);
    const wbRecentAlert = run(WORLD_BANK_MONITOR_JOB.watchdogJobName, {
      finishedAt: new Date(NOW.getTime() - 1 * HOUR).toISOString(),
      status: "failure",
      detail: `alerted-for=${wbSuccess.finishedAt}`,
    });
    mockHistories({
      [SBP_MONITOR_JOB.ingestionJobName]: [sbpSuccess],
      [SBP_MONITOR_JOB.watchdogJobName]: [alertRow(sbpSuccess.finishedAt, 80)],
      [WORLD_BANK_MONITOR_JOB.ingestionJobName]: [wbSuccess],
      [WORLD_BANK_MONITOR_JOB.watchdogJobName]: [wbRecentAlert],
    });
    const sbp = await runIngestionWatchdog(SBP_MONITOR_JOB, NOW);
    const wb = await runIngestionWatchdog(WORLD_BANK_MONITOR_JOB, NOW);
    expect(sbp.alertSent).toBe(true); // SBP's own 80h-old alert -> reminder due
    expect(wb.alertSent).toBe(false); // World Bank's own 1h-old alert -> still suppressed
  });

  it("O. evaluator: reminderDue is false when healthy or when no alert was ever sent; lastAlertAt is the latest of several; works on the exported constant", () => {
    resetAll();
    expect(REMINDER_INTERVAL_HOURS).toBe(72);

    const stale = staleSuccess();
    const noAlert = evaluateIngestionHealth([stale], [], NOW, JOB);
    expect(noAlert.lastAlertAt).toBeNull();
    expect(noAlert.reminderDue).toBe(false);

    const healthy = successAgo(JOB.ingestionJobName, 2);
    const healthyWithOldAlert = evaluateIngestionHealth([healthy], [alertRow(healthy.finishedAt, 500)], NOW, JOB);
    expect(healthyWithOldAlert.state).toBe("healthy");
    expect(healthyWithOldAlert.reminderDue).toBe(false);

    const latest = alertRow(stale.finishedAt, 10);
    const several = evaluateIngestionHealth([stale], [alertRow(stale.finishedAt, 300), latest, alertRow(stale.finishedAt, 100)], NOW, JOB);
    expect(several.lastAlertAt).toBe(latest.finishedAt);
  });

  it("P. security: a reminder's email and run-log row carry no secrets or provider URLs", async () => {
    resetAll();
    process.env.SBP_EASYDATA_API_KEY = "SUPER-SECRET-REMINDER-KEY";
    process.env.NOTIFICATION_WORKER_SECRET = "FAKE-INTERNAL-SECRET";
    const success = staleSuccess();
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [alertRow(success.finishedAt, 80)] });
    await runIngestionWatchdog(JOB, NOW);

    const blobs = [JSON.stringify(sendEmailMock.mock.calls[0]), String(logCronRunMock.mock.calls[0][3])];
    for (const blob of blobs) {
      expect(blob).not.toContain("SUPER-SECRET-REMINDER-KEY");
      expect(blob).not.toContain("FAKE-INTERNAL-SECRET");
      expect(blob).not.toContain("easydata.sbp.org.pk");
      expect(blob).not.toContain("api_key");
    }
  });

  it("Q. email sent but the run-log write is lost: the next invocation re-sends with the IDENTICAL key (at-least-once; never a missed alert) — initial alert and reminder", async () => {
    // logCronRun is best-effort and never throws, so a lost write just means no marker row exists next time.
    resetAll();
    const success = staleSuccess();

    // Initial alert: sent, row lost.
    mockHistories({ [JOB.ingestionJobName]: [success] });
    const first = await runIngestionWatchdog(JOB, NOW);
    expect(first.alertSent).toBe(true);
    // Next invocation sees the same (marker-less) history -> alerts again, same key, so Resend can dedupe inside its window.
    const second = await runIngestionWatchdog(JOB, new Date(NOW.getTime() + HOUR));
    expect(second.alertSent).toBe(true);
    expect(sendEmailMock.mock.calls[0][1]).toBe(sendEmailMock.mock.calls[1][1]);
    expect(sendEmailMock.mock.calls[1][0].subject).not.toMatch(/^Reminder/); // still an initial alert, not misreported as a reminder

    // Reminder: sent, row lost -> next invocation repeats it, anchored to the same previous alert -> same key.
    resetAll();
    const prior = alertRow(success.finishedAt, 80);
    mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [prior] });
    await runIngestionWatchdog(JOB, NOW);
    await runIngestionWatchdog(JOB, new Date(NOW.getTime() + HOUR));
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock.mock.calls[0][1]).toBe(sendEmailMock.mock.calls[1][1]);
    expect(sendEmailMock.mock.calls[0][1]).toBe(`${JOB.watchdogJobName}-${success.finishedAt}-reminder-after-${prior.finishedAt}`);
  });

  it("R. daily cron with the OBSERVED production start-time spread (09:11:34-09:36:07, 25 min): reminders still land on every third run for 30 days", async () => {
    resetAll();
    const success = successAgo(JOB.ingestionJobName, 40);
    const DAY = 24 * HOUR;
    // Deterministic pseudo-random offsets spanning exactly the observed 0..1473s spread (no Math.random: tests must be reproducible).
    let seed = 12345;
    const nextOffsetMs = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed / 2147483648) * 1473 * 1000;
    };
    const rows: CronRunRecord[] = [];
    const alertDays: number[] = [];
    for (let day = 0; day < 30; day++) {
      const runNow = new Date(NOW.getTime() + day * DAY + nextOffsetMs());
      mockHistories({ [JOB.ingestionJobName]: [success], [JOB.watchdogJobName]: [...rows] });
      sendEmailMock.mockClear();
      logCronRunMock.mockClear();
      await runIngestionWatchdog(JOB, runNow);
      if (sendEmailMock.mock.calls.length > 0) alertDays.push(day);
      const [, , status, detail] = logCronRunMock.mock.calls[0];
      rows.unshift(run(JOB.watchdogJobName, { finishedAt: new Date(runNow.getTime() + 2000).toISOString(), status, detail }));
    }
    expect(alertDays).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24, 27]);
  });

  it("S. the reminder logic is identical for all five monitored jobs (each uses its own history, interval is job-independent)", async () => {
    for (const job of MONITORED_INGESTION_JOBS) {
      resetAll();
      const stale = successAgo(job.ingestionJobName, job.staleAfterHours + 100);
      const mk = (hoursAgo: number) =>
        run(job.watchdogJobName, {
          finishedAt: new Date(NOW.getTime() - hoursAgo * HOUR).toISOString(),
          status: "failure",
          detail: `alerted-for=${stale.finishedAt}`,
        });

      mockHistories({ [job.ingestionJobName]: [stale], [job.watchdogJobName]: [mk(48)] });
      expect((await runIngestionWatchdog(job, NOW)).alertSent, `${job.label} @48h`).toBe(false);

      mockHistories({ [job.ingestionJobName]: [stale], [job.watchdogJobName]: [mk(73)] });
      const due = await runIngestionWatchdog(job, NOW);
      expect(due.alertSent, `${job.label} @73h`).toBe(true);
      expect(sendEmailMock.mock.calls.at(-1)![1]).toBe(`${job.watchdogJobName}-${stale.finishedAt}-reminder-after-${mk(73).finishedAt}`);
    }
  });
});
