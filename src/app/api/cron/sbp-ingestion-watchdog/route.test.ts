// Trigger-route tests — Phase 8.6 (multi-job loop). The watchdog itself is
// mocked — its own logic is covered by src/lib/ingestionWatchdog.test.ts.
// These tests exist to prove the HTTP boundary: auth, per-job isolation,
// and that nothing sensitive crosses it. No live SBP/World Bank request,
// no real email, no Supabase.

import { describe, it, expect, vi, beforeEach } from "vitest";

const runIngestionWatchdogMock = vi.hoisted(() => vi.fn());
const logCronRunMock = vi.hoisted(() => vi.fn());

const SBP_JOB = { ingestionJobName: "sbp-local-ingestion", watchdogJobName: "sbp-ingestion-watchdog", label: "SBP ingestion", expectedIntervalHours: 24, staleAfterHours: 36 };
const WB_JOB = { ingestionJobName: "worldbank-gdp-growth-ingestion", watchdogJobName: "worldbank-ingestion-watchdog", label: "World Bank GDP-growth ingestion", expectedIntervalHours: 168, staleAfterHours: 216 };

vi.mock("@/lib/ingestionWatchdog", () => ({
  runIngestionWatchdog: runIngestionWatchdogMock,
  MONITORED_INGESTION_JOBS: [SBP_JOB, WB_JOB],
}));
vi.mock("@/lib/cronLogging", () => ({ logCronRun: logCronRunMock }));

const { GET } = await import("./route");

const SECRET = "test-cron-secret";
const REAL_ADMIN_EMAIL = "ops+real@example.com";

function req(auth?: string) {
  const headers = new Headers();
  if (auth !== undefined) headers.set("authorization", auth);
  return new Request("https://app.example.com/api/cron/sbp-ingestion-watchdog", { headers });
}

function healthyResult(job: typeof SBP_JOB) {
  return {
    job,
    health: {
      state: "healthy" as const,
      lastSuccessAt: "2026-08-12T10:00:00.000Z",
      ageMs: 2 * 60 * 60 * 1000,
      expectedCadenceHours: job.expectedIntervalHours,
      staleAfterHours: job.staleAfterHours,
      episodeKey: "2026-08-12T10:00:00.000Z",
      alertAlreadySent: false,
    },
    alertSent: false,
    reason: "healthy — no alert",
  };
}

beforeEach(() => {
  runIngestionWatchdogMock.mockReset();
  logCronRunMock.mockReset();
  logCronRunMock.mockResolvedValue(undefined);
  process.env.CRON_SECRET = SECRET;
  process.env.ADMIN_EMAIL = REAL_ADMIN_EMAIL;
  process.env.SBP_EASYDATA_API_KEY = "SBP-SECRET-KEY";
});

describe("GET /api/cron/sbp-ingestion-watchdog (multi-job)", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(runIngestionWatchdogMock).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong secret", async () => {
    const res = await GET(req("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(runIngestionWatchdogMock).not.toHaveBeenCalled();
  });

  it("rejects every request when CRON_SECRET is not configured, even with a header present", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(runIngestionWatchdogMock).not.toHaveBeenCalled();
  });

  it("evaluates every configured job on a correctly-authorized request", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => healthyResult(job));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(runIngestionWatchdogMock).toHaveBeenCalledTimes(2);
    expect(runIngestionWatchdogMock).toHaveBeenNthCalledWith(1, SBP_JOB);
    expect(runIngestionWatchdogMock).toHaveBeenNthCalledWith(2, WB_JOB);
  });

  it("returns per-job health state in the response, keyed/labeled by job", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => healthyResult(job));
    const res = await GET(req(`Bearer ${SECRET}`));
    const body = await res.json();
    expect(body.jobs).toHaveLength(2);
    expect(body.jobs.find((j: { ingestionJobName: string }) => j.ingestionJobName === "sbp-local-ingestion").state).toBe("healthy");
    expect(body.jobs.find((j: { ingestionJobName: string }) => j.ingestionJobName === "worldbank-gdp-growth-ingestion").state).toBe("healthy");
  });

  it("one job's failure does not prevent the other job from being evaluated", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => {
      if (job.ingestionJobName === SBP_JOB.ingestionJobName) throw new Error("SBP watchdog crashed unexpectedly");
      return healthyResult(job);
    });

    const res = await GET(req(`Bearer ${SECRET}`));
    const body = await res.json();

    expect(runIngestionWatchdogMock).toHaveBeenCalledTimes(2); // both were attempted
    const sbpOutcome = body.jobs.find((j: { ingestionJobName: string }) => j.ingestionJobName === SBP_JOB.ingestionJobName);
    const wbOutcome = body.jobs.find((j: { ingestionJobName: string }) => j.ingestionJobName === WB_JOB.ingestionJobName);
    expect(sbpOutcome.ok).toBe(false);
    expect(wbOutcome.ok).toBe(true);
    expect(wbOutcome.state).toBe("healthy");
  });

  it("logs a failure record under the CORRECT job's watchdogJobName when only that job throws", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => {
      if (job.ingestionJobName === WB_JOB.ingestionJobName) throw new Error("World Bank watchdog crashed");
      return healthyResult(job);
    });

    await GET(req(`Bearer ${SECRET}`));

    expect(logCronRunMock).toHaveBeenCalledTimes(1);
    expect(logCronRunMock.mock.calls[0][0]).toBe(WB_JOB.watchdogJobName);
    expect(logCronRunMock.mock.calls[0][0]).not.toBe(SBP_JOB.watchdogJobName);
    expect(logCronRunMock.mock.calls[0][2]).toBe("failure");
  });

  it("does not write a route-level cron_run_log entry when every job evaluates normally — the watchdog already logs for itself", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => healthyResult(job));
    await GET(req(`Bearer ${SECRET}`));
    expect(logCronRunMock).not.toHaveBeenCalled();
  });

  it("returns 500 only when at least one job's evaluation threw, not merely because a job is stale", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => ({
      ...healthyResult(job),
      health: { ...healthyResult(job).health, state: "stale" as const },
    }));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200); // stale is a normal, successfully-evaluated outcome, not a route failure
  });

  it("repeated invocations during the same failure episode do not duplicate the route's own logging", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => ({
      job,
      health: { ...healthyResult(job).health, state: "stale" as const, alertAlreadySent: true },
      alertSent: false,
      reason: "already alerted for this episode — suppressed",
    }));

    await GET(req(`Bearer ${SECRET}`));
    await GET(req(`Bearer ${SECRET}`));
    await GET(req(`Bearer ${SECRET}`));

    expect(runIngestionWatchdogMock).toHaveBeenCalledTimes(6); // 2 jobs x 3 invocations
    expect(logCronRunMock).not.toHaveBeenCalled();
  });

  it("never invokes SBP or World Bank ingestion — the route has no import path to either", async () => {
    const watchdogModule = await import("@/lib/ingestionWatchdog");
    expect(Object.keys(watchdogModule)).not.toContain("fetchSbpSeriesForIngestion");
    expect(Object.keys(watchdogModule)).not.toContain("ingestSbp");
    expect(Object.keys(watchdogModule)).not.toContain("worldBankAdapter");
    expect(Object.keys(watchdogModule)).not.toContain("ingestManySeries");
  });

  it("never exposes ADMIN_EMAIL in the response body", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => healthyResult(job));
    const res = await GET(req(`Bearer ${SECRET}`));
    const bodyText = JSON.stringify(await res.json());
    expect(bodyText).not.toContain(REAL_ADMIN_EMAIL);
    expect(bodyText).not.toContain("ADMIN_EMAIL");
  });

  it("never exposes SBP_EASYDATA_API_KEY in the response body, even on a job failure", async () => {
    runIngestionWatchdogMock.mockRejectedValue(new Error("boom near SBP-SECRET-KEY reference"));
    const res = await GET(req(`Bearer ${SECRET}`));
    const bodyText = JSON.stringify(await res.json());
    expect(bodyText).not.toContain("SBP-SECRET-KEY");
  });

  it("never exposes CRON_SECRET itself in any response", async () => {
    runIngestionWatchdogMock.mockImplementation(async (job: typeof SBP_JOB) => healthyResult(job));
    const res401 = await GET(req("Bearer wrong"));
    const res200 = await GET(req(`Bearer ${SECRET}`));
    const bodies = [await res401.text(), JSON.stringify(await res200.json())];
    for (const b of bodies) expect(b).not.toContain(SECRET);
  });

  it("never exposes an internal exception message in the HTTP response body", async () => {
    runIngestionWatchdogMock.mockRejectedValue(new Error("internal stack trace detail: /home/user/.env NOTIFICATION_WORKER_SECRET=xyz"));
    const res = await GET(req(`Bearer ${SECRET}`));
    const bodyText = JSON.stringify(await res.json());
    expect(bodyText).not.toContain("NOTIFICATION_WORKER_SECRET");
    expect(bodyText).not.toContain(".env");
  });
});
