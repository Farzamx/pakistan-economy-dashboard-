// F.2f: the PBS CPI job inside the EXISTING ingestion watchdog. Fully mocked: no Supabase, no email, no network.
// The real runIngestionWatchdog() runs; only cron_run_log access and the mail sender are replaced.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CronRunRecord } from "@/lib/cronLogging";
import { formatCpiRunDetail, type CpiRunFields } from "@/lib/providers/cpiIngestionRunLog";

const getCronRunHistoryMock = vi.hoisted(() => vi.fn());
const logCronRunMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cronLogging", () => ({ getCronRunHistory: getCronRunHistoryMock, logCronRun: logCronRunMock }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: sendEmailMock }));

const { PBS_CPI_GROUPS_MONITOR_JOB, SBP_MONITOR_JOB, WORLD_BANK_MONITOR_JOB, MONITORED_INGESTION_JOBS, runIngestionWatchdog } = await import("@/lib/ingestionWatchdog");
const { JOB_NAME } = await import("@/lib/providers/pbsCpiGroupsIngestion");

const NOW = new Date("2026-12-04T10:00:00Z");
const HOUR = 3_600_000;
const iso = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * HOUR).toISOString();
const J = PBS_CPI_GROUPS_MONITOR_JOB;

function cpiRun(status: CronRunRecord["status"], fields: CpiRunFields, hoursAgo: number): CronRunRecord {
  return { jobName: J.ingestionJobName, startedAt: iso(hoursAgo), finishedAt: iso(hoursAgo), durationMs: 1000, status, detail: formatCpiRunDetail(fields) };
}
const success = (h: number, outcome: "updated" | "unchanged" = "unchanged") => cpiRun("success", { outcome, series: 26, failed: 0, latest: "2026-11", attempts: 1 }, h);
const failure = (h: number, f: CpiRunFields) => cpiRun("failure", f, h);

function histories(ingestion: CronRunRecord[], watchdog: CronRunRecord[] = []) {
  getCronRunHistoryMock.mockImplementation(async (jobName: string) => (jobName === J.ingestionJobName ? ingestion : jobName === J.watchdogJobName ? watchdog : []));
}
const lastLogRow = () => {
  const call = logCronRunMock.mock.calls.at(-1);
  return { job: call?.[0] as string, status: call?.[2] as string, detail: call?.[3] as string };
};
const lastEmail = () => sendEmailMock.mock.calls.at(-1)?.[0] as { subject: string; text: string; html: string } | undefined;

beforeEach(() => {
  getCronRunHistoryMock.mockReset();
  logCronRunMock.mockReset();
  sendEmailMock.mockReset();
  logCronRunMock.mockResolvedValue(undefined);
  sendEmailMock.mockResolvedValue({ success: true, id: "m1" });
  process.env.ADMIN_EMAIL = "ops@example.com";
});

describe("how the CPI job is registered", () => {
  it("under the name the ingestion script logs under (the watchdog must not import the ingestion module, so this pins the equality)", () => {
    expect(J.ingestionJobName).toBe(JOB_NAME);
    expect(J.watchdogJobName).toBe(`${JOB_NAME}-watchdog`);
  });

  it("weekly floor thresholds reused verbatim from World Bank (168h / 216h): same Monday trigger, same laptop, same mechanics", () => {
    expect([J.expectedIntervalHours, J.staleAfterHours]).toEqual([WORLD_BANK_MONITOR_JOB.expectedIntervalHours, WORLD_BANK_MONITOR_JOB.staleAfterHours]);
    expect([J.expectedIntervalHours, J.staleAfterHours]).toEqual([168, 216]);
  });

  it("is in the registry the generic route and System Health already enumerate — no route or page change is needed", () => {
    expect(MONITORED_INGESTION_JOBS).toContain(J);
  });

  it("the watchdog module still has no dependency on the freshness engine/registry or on the ingestion module, and calls no provider", () => {
    const src = readFileSync(join(__dirname, "ingestionWatchdog.ts"), "utf-8");
    const imports = [...src.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
    expect(imports.sort()).toEqual(["@/lib/cpiIngestionMonitor", "@/lib/cronLogging", "@/lib/email/resend"].sort());
    expect(src).not.toMatch(/fetch\(|createClient|pbs\.gov\.pk/);
  });
});

describe("healthy and unhealthy states reach the operator with their reason", () => {
  it("a recent successful run that found nothing new: no alert; the watchdog's own row says healthy and why", async () => {
    histories([success(3), success(27)]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.state).toBe("healthy");
    expect(r.alertSent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(lastLogRow()).toMatchObject({ job: J.watchdogJobName, status: "success" });
    expect(lastLogRow().detail).toMatch(/state=healthy \| last-success=.* \| .*diag=healthy$/);
  });

  it("NEVER RAN (no row at all): alert, and the body says the job has no completed run — not registered or never run", async () => {
    histories([]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.state).toBe("never-run");
    expect(r.alertSent).toBe(true);
    expect(lastEmail()?.subject).toBe("PEIC: PBS CPI group ingestion has never completed successfully");
    expect(lastEmail()?.text).toMatch(/no completed run on record — it has never run, or is not registered with the scheduler/);
  });

  it("NOT RUNNING (last success long ago, nothing since): stale alert whose body says NOT RUNNING and why that can happen", async () => {
    histories([success(300)]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.state).toBe("stale");
    expect(lastEmail()?.text).toMatch(/NOT RUNNING — the last completed run succeeded 300h ago/);
    expect(lastEmail()?.text).toMatch(/unregistered, disabled, or the ingestion host may be off/);
    expect(lastLogRow().detail).toMatch(/diag=overdue$/);
  });

  it("PBS UNAVAILABLE for long enough to go stale: the alert names the cause and that the job IS running", async () => {
    histories([failure(2, { outcome: "pbs-unavailable", attempts: 3, reason: "PBS CPI file request returned HTTP 503." }), failure(26, { outcome: "pbs-unavailable", attempts: 3 }), failure(50, { outcome: "pbs-unavailable", attempts: 3 }), success(230)]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.state).toBe("stale");
    const text = lastEmail()?.text ?? "";
    expect(text).toMatch(/REPEATEDLY FAILING — the last 3 completed runs all failed; the job IS running/);
    expect(text).toMatch(/PBS could not be reached after 3 attempt\(s\); nothing was written/);
    expect(lastLogRow().detail).toMatch(/diag=repeatedly-failing:pbs-unavailable$/);
  });

  it("a PARTLY INGESTED release that stays unrepaired: the alert says which series failed and that the month is partial", async () => {
    histories([failure(5, { outcome: "partial", series: 26, updated: 25, failed: 1, failedKeys: ["pbs:cpiGroupIndex03"], latest: "2026-11" }), success(240)]);
    await runIngestionWatchdog(J, NOW);
    expect(lastEmail()?.text).toMatch(/1 of 26 series failed \(pbs:cpiGroupIndex03\): the ledger may hold a PARTLY ingested month/);
    expect(lastLogRow().detail).toMatch(/diag=failing:partial-ingestion$/);
  });

  it("file REJECTED by validation: the alert says PBS answered but the file failed validation", async () => {
    histories([failure(4, { outcome: "rejected", attempts: 1, reason: "validation failed: laspeyres" }), success(250)]);
    await runIngestionWatchdog(J, NOW);
    expect(lastEmail()?.text).toMatch(/PBS answered but the file was rejected by validation \(validation failed: laspeyres\)/);
  });

  it("a short outage (failures, but a success within the weekly floor) does NOT alert — the watchdog's staleness model is unchanged — yet the log row records the failure", async () => {
    histories([failure(1, { outcome: "pbs-unavailable", attempts: 3 }), failure(25, { outcome: "pbs-unavailable", attempts: 3 }), success(100)]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.state).toBe("healthy");
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(lastLogRow().detail).toMatch(/diag=failing:pbs-unavailable$/);
  });

  it("RECOVERY: after the outage a success clears the episode — no alert, diagnosis healthy, and it remembers what it recovered from", async () => {
    histories([success(1, "updated"), failure(25, { outcome: "pbs-unavailable", attempts: 3 }), failure(49, { outcome: "pbs-unavailable", attempts: 3 })]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.state).toBe("healthy");
    expect(r.alertSent).toBe(false);
    expect(r.diagnosis?.lines.join("\n")).toMatch(/Recovered: it followed 2 failed run\(s\)/);
  });

  it("the alert is de-duplicated per episode exactly as for every other job (the existing marker still works)", async () => {
    histories([success(300)]);
    const first = await runIngestionWatchdog(J, NOW);
    expect(first.alertSent).toBe(true);
    histories([success(300)], [{ jobName: J.watchdogJobName, startedAt: iso(1), finishedAt: iso(1), durationMs: 1, status: "failure", detail: lastLogRow().detail }]);
    sendEmailMock.mockClear();
    const second = await runIngestionWatchdog(J, NOW);
    expect(second.alertSent).toBe(false);
    expect(second.reason).toBe("already alerted for this episode — suppressed");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("the diagnosis token does not disturb the carry-forward parser: last-success= is still the FIRST such field", async () => {
    histories([success(300)]);
    await runIngestionWatchdog(J, NOW);
    const detail = lastLogRow().detail;
    expect(detail.indexOf("last-success=")).toBeLessThan(detail.indexOf("diag="));
    // feed it back with an EMPTY ingestion window: the watchdog must recover the last success from its own record
    histories([], [{ jobName: J.watchdogJobName, startedAt: iso(1), finishedAt: iso(1), durationMs: 1, status: "failure", detail }]);
    const r = await runIngestionWatchdog(J, NOW);
    expect(r.health.lastSuccessSource).toBe("watchdog-record");
  });
});

describe("it cannot make the rest of monitoring worse", () => {
  it("a diagnosis that throws is swallowed: the watchdog still evaluates, alerts and logs, just without the explanation", async () => {
    const broken = { ...J, diagnose: () => { throw new Error("bug in the explanation"); } };
    histories([success(300)]);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await runIngestionWatchdog(broken, NOW);
    spy.mockRestore();
    expect(r.health.state).toBe("stale");
    expect(r.alertSent).toBe(true);
    expect(r.diagnosis).toBeUndefined();
    expect(lastEmail()?.text).not.toMatch(/Diagnosis/);
    expect(lastLogRow().detail).not.toMatch(/diag=/);
  });

  it("no URL or credential can reach the email or the log row, even from a hostile logged reason", async () => {
    histories([failure(2, { outcome: "error", reason: "GET https://abc.supabase.co/rest/v1/x?apikey=eyJhbGciOiJIUzI1 failed" }), success(250)]);
    await runIngestionWatchdog(J, NOW);
    const everything = `${lastEmail()?.text}\n${lastEmail()?.html}\n${lastLogRow().detail}`;
    expect(everything).not.toMatch(/https?:\/\/|eyJ|apikey/i);
  });

  it("the OTHER jobs' alerts are byte-for-byte what they were: no diagnosis block, no diag token", async () => {
    for (const job of [SBP_MONITOR_JOB, WORLD_BANK_MONITOR_JOB]) {
      getCronRunHistoryMock.mockImplementation(async (name: string) => (name === job.ingestionJobName ? [{ jobName: name, startedAt: iso(400), finishedAt: iso(400), durationMs: 1, status: "success", detail: null } as CronRunRecord] : []));
      sendEmailMock.mockClear();
      logCronRunMock.mockClear();
      const r = await runIngestionWatchdog(job, NOW);
      expect(r.alertSent).toBe(true);
      expect(r.diagnosis).toBeUndefined();
      expect(lastEmail()?.text).not.toMatch(/Diagnosis|PARTLY|NOT RUNNING/);
      expect(lastLogRow().detail).not.toMatch(/diag=/);
    }
  });
});
