// F.2f: what cron_run_log says about the CPI job's RUNS. Pure: rows and a clock in, a diagnosis out.

import { describe, expect, it } from "vitest";
import type { CronRunRecord } from "@/lib/cronLogging";
import { formatCpiRunDetail, type CpiRunFields } from "@/lib/providers/cpiIngestionRunLog";
import { REPEATED_FAILURE_COUNT, evaluateCpiRunEvidence } from "./cpiIngestionMonitor";

const NOW = new Date("2026-12-04T10:00:00Z");
const STALE = 216; // the weekly figure the CPI job reuses (see ingestionWatchdog.ts)
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function run(status: CronRunRecord["status"], fields: CpiRunFields | null, ago: number): CronRunRecord {
  const at = hoursAgo(ago);
  return { jobName: "pbs-cpi-groups-ingestion", startedAt: at, finishedAt: at, durationMs: 1000, status, detail: fields ? formatCpiRunDetail(fields) : null };
}
const ok = (outcome: "updated" | "unchanged", ago: number, extra: Partial<CpiRunFields> = {}) =>
  run("success", { outcome, series: 26, updated: outcome === "updated" ? 26 : 0, unchanged: outcome === "unchanged" ? 26 : 0, failed: 0, latest: "2026-11", attempts: 1, ...extra }, ago);
const fail = (outcome: "pbs-unavailable" | "rejected" | "partial" | "error", ago: number, extra: Partial<CpiRunFields> = {}) => run("failure", { outcome, ...extra }, ago);
const ev = (rows: CronRunRecord[]) => evaluateCpiRunEvidence(rows, NOW, { staleAfterHours: STALE });

describe("a job that is running and succeeding", () => {
  it("a recent successful run that wrote data is healthy", () => {
    const e = ev([ok("updated", 2)]);
    expect(e.state).toBe("healthy");
    expect(e.lastSuccess?.parsed.outcome).toBe("updated");
    expect(e.lastDataChange?.at).toBe(hoursAgo(2));
    expect(e.consecutiveFailures).toBe(0);
    expect(e.cause).toBeNull();
  });

  it("a recent run that found nothing new is HEALTHY — and the data-change time still points at the older run that did change data", () => {
    const e = ev([ok("unchanged", 3), ok("unchanged", 27), ok("updated", 120)]);
    expect(e.state).toBe("healthy");
    expect(e.lastCompleted?.parsed.outcome).toBe("unchanged");
    expect(e.lastDataChange?.at).toBe(hoursAgo(120));
    expect(e.lines.join("\n")).toMatch(/PBS had nothing new; nothing was written/);
  });

  it("'last run' and 'last data change' are different things even in one history", () => {
    const e = ev([ok("unchanged", 1), ok("updated", 500)]);
    expect(e.lastSuccess?.at).toBe(hoursAgo(1));
    expect(e.lastDataChange?.at).toBe(hoursAgo(500));
  });

  it("the production history to date — the one legacy-format row of 2026-11-06 — reads as a healthy update", () => {
    const legacy: CronRunRecord = { jobName: "pbs-cpi-groups-ingestion", startedAt: hoursAgo(50), finishedAt: hoursAgo(50), durationMs: 126906, status: "success", detail: "26 PBS CPI series | 0 unchanged | 26 updated | 0 failed" };
    const e = ev([legacy]);
    expect(e.state).toBe("healthy");
    expect(e.lastDataChange?.parsed.format).toBe("legacy");
  });
});

describe("a job that has not run when expected", () => {
  it("no rows at all -> no-runs (never run, or never registered)", () => {
    const e = ev([]);
    expect(e.state).toBe("no-runs");
    expect(e.lastSuccess).toBeNull();
    expect(e.lines.join(" ")).toMatch(/never run, or is not registered/);
  });

  it("only SKIPPED rows -> still no-runs: a run that did nothing is not a run", () => {
    const e = ev([run("skipped", { outcome: "busy" }, 5)]);
    expect(e.state).toBe("no-runs");
    expect(e.skippedRuns).toBe(1);
  });

  it("the last success is older than the stale window and nothing since -> OVERDUE, 'NOT RUNNING' (distinct from failing)", () => {
    const e = ev([ok("unchanged", STALE + 30)]);
    expect(e.state).toBe("overdue");
    expect(e.consecutiveFailures).toBe(0);
    expect(e.lines.join("\n")).toMatch(/NOT RUNNING/);
    expect(e.lines.join("\n")).toMatch(/unregistered, disabled, or the ingestion host may be off/);
  });

  it("just inside the stale window is still healthy (no false alert on a run that is a little late)", () => {
    expect(ev([ok("unchanged", STALE - 1)]).state).toBe("healthy");
    expect(ev([ok("unchanged", STALE + 1)]).state).toBe("overdue");
  });
});

describe("a job that runs but fails — with the reason", () => {
  it("PBS unavailable -> failing, cause named, attempts reported, the job IS running", () => {
    const e = ev([fail("pbs-unavailable", 2, { attempts: 3, reason: "PBS CPI file request returned HTTP 503." }), ok("unchanged", 30)]);
    expect(e.state).toBe("failing");
    expect(e.cause).toBe("pbs-unavailable");
    expect(e.consecutiveFailures).toBe(1);
    const text = e.lines.join("\n");
    expect(text).toMatch(/the job IS running/);
    expect(text).toMatch(/PBS could not be reached after 3 attempt\(s\); nothing was written/);
  });

  it("file rejected by validation -> failing, cause validation-rejected, with the failing check", () => {
    const e = ev([fail("rejected", 2, { attempts: 1, reason: "validation failed: laspeyres" })]);
    expect(e.cause).toBe("validation-rejected");
    expect(e.lines.join("\n")).toMatch(/file was rejected by validation \(validation failed: laspeyres\)/);
  });

  it("a release only PARTLY ingested (25 of 26) -> failing, cause partial-ingestion, the failed series named", () => {
    const e = ev([fail("partial", 1, { series: 26, updated: 25, failed: 1, failedKeys: ["pbs:cpiGroupIndex03"], latest: "2026-11" })]);
    expect(e.state).toBe("failing");
    expect(e.cause).toBe("partial-ingestion");
    expect(e.lines.join("\n")).toMatch(/1 of 26 series failed \(pbs:cpiGroupIndex03\).*PARTLY ingested month/);
  });

  it("an unexpected error is distinguished from the others", () => {
    expect(ev([fail("error", 1, { reason: "boom" })]).cause).toBe("unexpected-error");
  });

  it("a failure row in the OLD free-text format is still a failure, with an honest 'no structured reason'", () => {
    const old: CronRunRecord = { jobName: "pbs-cpi-groups-ingestion", startedAt: hoursAgo(1), finishedAt: hoursAgo(1), durationMs: 1, status: "failure", detail: "Source validation failed: laspeyres" };
    const e = ev([old]);
    expect(e.state).toBe("failing");
    expect(e.cause).toBe("unknown");
    expect(e.lines.join("\n")).toMatch(/carries no structured reason/);
  });

  it(`failing becomes REPEATEDLY failing at ${REPEATED_FAILURE_COUNT} consecutive failed runs`, () => {
    const two = ev([fail("pbs-unavailable", 1, { attempts: 3 }), fail("pbs-unavailable", 25, { attempts: 3 }), ok("unchanged", 49)]);
    expect(two.state).toBe("failing");
    expect(two.consecutiveFailures).toBe(2);
    const three = ev([fail("pbs-unavailable", 1, { attempts: 3 }), fail("pbs-unavailable", 25, { attempts: 3 }), fail("pbs-unavailable", 49, { attempts: 3 }), ok("unchanged", 73)]);
    expect(three.state).toBe("repeatedly-failing");
    expect(three.lines.join("\n")).toMatch(/REPEATEDLY FAILING — the last 3 completed runs all failed/);
  });

  it("skipped (lock-held) rows neither break nor extend a failure streak", () => {
    const e = ev([fail("pbs-unavailable", 1, { attempts: 3 }), run("skipped", { outcome: "busy" }, 5), fail("pbs-unavailable", 20, { attempts: 3 }), ok("unchanged", 40)]);
    expect(e.consecutiveFailures).toBe(2);
    expect(e.skippedRuns).toBe(1);
  });

  it("failing wins over a recent-looking success further back: the NEWEST completed run decides", () => {
    expect(ev([fail("rejected", 1), ok("updated", 2)]).state).toBe("failing");
  });
});

describe("recovery after a provider outage", () => {
  it("failures followed by a success -> healthy, and the history says how many failures it recovered from", () => {
    const e = ev([ok("updated", 1), fail("pbs-unavailable", 25, { attempts: 3 }), fail("pbs-unavailable", 49, { attempts: 3 }), fail("pbs-unavailable", 73, { attempts: 3 }), ok("unchanged", 100)]);
    expect(e.state).toBe("healthy");
    expect(e.consecutiveFailures).toBe(0);
    expect(e.cause).toBeNull();
    expect(e.recoveredAfterFailures).toBe(3);
    expect(e.lines.join("\n")).toMatch(/Recovered: it followed 3 failed run\(s\)/);
  });

  it("a recovery from a PARTIAL run: the next complete run clears it", () => {
    const e = ev([ok("updated", 2), fail("partial", 26, { series: 26, updated: 25, failed: 1, failedKeys: ["pbs:cpiGroupIndex03"] })]);
    expect(e.state).toBe("healthy");
    expect(e.recoveredAfterFailures).toBe(1);
  });
});

describe("evidence stays honest", () => {
  it("what is unknown stays null — nothing is invented", () => {
    const e = ev([fail("pbs-unavailable", 1, { attempts: 3 })]);
    expect(e.lastSuccess).toBeNull();
    expect(e.lastDataChange).toBeNull();
    expect(e.lastSourceFetch).toBeNull(); // PBS was never reached in this history
    expect(e.successAgeHours).toBeNull();
    expect(e.lines.join("\n")).toMatch(/Last successful run: none on record/);
  });

  it("a success row with an unreadable detail counts as a success but is NOT counted as a data change or a source fetch", () => {
    const odd: CronRunRecord = { jobName: "x", startedAt: hoursAgo(1), finishedAt: hoursAgo(1), durationMs: 1, status: "success", detail: "something else entirely" };
    const e = ev([odd]);
    expect(e.state).toBe("healthy");
    expect(e.lastDataChange).toBeNull();
    expect(e.lastSourceFetch).toBeNull();
  });

  it("rows with an unusable timestamp are ignored, and input order does not matter", () => {
    const bad = { ...ok("updated", 1), finishedAt: "not a date" };
    const rows = [ok("unchanged", 2), bad, fail("rejected", 30), ok("updated", 60)];
    expect(ev(rows).lastCompleted?.at).toBe(hoursAgo(2));
    expect(ev([...rows].reverse())).toEqual(ev(rows));
  });

  it("the diagnosis text carries no URL even when a hostile reason was logged", () => {
    const e = ev([fail("error", 1, { reason: "GET https://abc.supabase.co/rest/v1/rpc?apikey=eyJhbGciOi failed" })]);
    expect(e.lines.join("\n")).not.toMatch(/https?:|eyJ/);
  });

  it("'source fetch' counts every outcome that REACHED PBS (including a rejected file) and none that did not", () => {
    expect(ev([fail("rejected", 3), fail("pbs-unavailable", 2)]).lastSourceFetch?.at).toBe(hoursAgo(3));
    expect(ev([fail("pbs-unavailable", 2), fail("error", 1)]).lastSourceFetch).toBeNull();
  });
});
