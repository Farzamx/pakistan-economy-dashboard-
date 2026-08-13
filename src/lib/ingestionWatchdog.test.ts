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
  MONITORED_INGESTION_JOBS,
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
  it("contains exactly three monitored jobs: SBP, World Bank, and Net Liquid FX Reserves", () => {
    expect(MONITORED_INGESTION_JOBS).toHaveLength(3);
    expect(MONITORED_INGESTION_JOBS).toEqual([SBP_MONITOR_JOB, WORLD_BANK_MONITOR_JOB, NET_LIQUID_RESERVES_MONITOR_JOB]);
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
