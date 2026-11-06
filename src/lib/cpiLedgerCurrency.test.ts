// F.2f: is the CPI ledger current, and how does that combine with the run evidence? Pure.

import { describe, expect, it } from "vitest";
import type { CronRunRecord } from "@/lib/cronLogging";
import { PBS_CPI_INDICATOR_KEYS } from "@/lib/providers/pbsCpiSeries";
import { formatCpiRunDetail, type CpiRunFields } from "@/lib/providers/cpiIngestionRunLog";
import { evaluateCpiRunEvidence } from "./cpiIngestionMonitor";
import { BEHIND_PBS_ESCALATE_HOURS, evaluateCpiIngestionStatus, evaluateLedgerCurrency, type LedgerKeyState, type PbsProbe } from "./cpiLedgerCurrency";
import { ledgerKeysFromSummary } from "./cpiLedgerKeys";

const NOV_15 = new Date("2026-11-15T12:00:00Z"); // previous calendar month = 2026-10
const DEC_03 = new Date("2026-12-03T05:00:00Z"); // previous calendar month = 2026-11; PBS has usually not yet prepared the file
const DEC_05 = new Date("2026-12-05T08:00:00Z");

const VINTAGE = "2026-11-06T17:29:30.553+00:00";
const keysAt = (latest: string, over: Record<string, string | null> = {}): LedgerKeyState[] =>
  PBS_CPI_INDICATOR_KEYS.map((key) => ({ key, latestPeriod: key in over ? over[key] : latest, vintage: VINTAGE }));

const pbs = (latestMonth: string, preparedAt: string | null = null): PbsProbe => ({ ok: true, latestMonth, preparedAt });

describe("ledger currency: the states", () => {
  it("current: all 26 series at the previous calendar month", () => {
    const c = evaluateLedgerCurrency(keysAt("2026-10-31"), pbs("2026-10"), NOV_15);
    expect(c).toMatchObject({ state: "current", ledgerLatestMonth: "2026-10", expectedMonth: "2026-10", keysAtLatest: 26, laggingKeys: [] });
  });

  it("current needs no PBS probe when nothing newer can be due", () => {
    expect(evaluateLedgerCurrency(keysAt("2026-10-31"), null, NOV_15).state).toBe("current");
    expect(evaluateLedgerCurrency(keysAt("2026-10-31"), { ok: false, error: "HTTP 503" }, NOV_15).state).toBe("current");
  });

  it("AWAITING RELEASE: the ledger is a month old and PBS has not published the next one — normal, not an alarm", () => {
    const c = evaluateLedgerCurrency(keysAt("2026-10-31"), pbs("2026-10"), DEC_03);
    expect(c.state).toBe("awaiting-release");
    expect(c.lines.join(" ")).toMatch(/awaiting release, which is normal/);
  });

  it("BEHIND PBS: PBS holds a newer month than the ledger, and says how long ago it prepared it", () => {
    const c = evaluateLedgerCurrency(keysAt("2026-10-31"), pbs("2026-11", "2026-12-04T22:00:00Z"), DEC_05);
    expect(c).toMatchObject({ state: "behind-pbs", pbsLatestMonth: "2026-11", ledgerLatestMonth: "2026-10" });
    expect(c.behindForHours).toBeCloseTo(10, 5);
  });

  it("PARTIAL RELEASE: 25 series reach the new month, one does not", () => {
    const c = evaluateLedgerCurrency(keysAt("2026-11-30", { "pbs:cpiGroupIndex03": "2026-10-31" }), pbs("2026-11"), DEC_05);
    expect(c.state).toBe("partial-release");
    expect(c).toMatchObject({ keysAtLatest: 25, laggingKeys: ["pbs:cpiGroupIndex03"], ledgerLatestMonth: "2026-11" });
    expect(c.lines.join(" ")).toMatch(/PARTLY ingested: 25 of 26/);
  });

  it("PARTIAL RELEASE also when a key is simply absent from the ledger", () => {
    const keys = keysAt("2026-10-31").filter((k) => k.key !== "pbs:cpiWeightTotal");
    const c = evaluateLedgerCurrency(keys, pbs("2026-10"), NOV_15);
    expect(c.state).toBe("partial-release");
    expect(c.laggingKeys).toEqual(["pbs:cpiWeightTotal"]);
  });

  it("NO DATA: nothing in the ledger", () => {
    expect(evaluateLedgerCurrency([], pbs("2026-10"), NOV_15).state).toBe("no-data");
    expect(evaluateLedgerCurrency(keysAt("x", Object.fromEntries(PBS_CPI_INDICATOR_KEYS.map((k) => [k, null]))), null, NOV_15).state).toBe("no-data");
  });

  it("UNKNOWN is reported as unknown — never as current: PBS cannot be asked / was not asked", () => {
    expect(evaluateLedgerCurrency(keysAt("2026-10-31"), { ok: false, error: "timeout" }, DEC_05).state).toBe("pbs-unreachable");
    expect(evaluateLedgerCurrency(keysAt("2026-10-31"), null, DEC_05).state).toBe("behind-calendar-unverified");
  });

  it("builds its key table from the real RPC row shape", () => {
    const rows = PBS_CPI_INDICATOR_KEYS.map((k) => ({ indicator_key: k, latest_observation_period: "2026-10-31", vintage: VINTAGE }));
    expect(evaluateLedgerCurrency(ledgerKeysFromSummary(rows), pbs("2026-10"), NOV_15).state).toBe("current");
  });
});

describe("timestamps are never fabricated", () => {
  it("the last data change is the newest canonical vintage among the keys", () => {
    const keys = keysAt("2026-10-31");
    keys[5] = { ...keys[5], vintage: "2026-11-09T01:00:00Z" };
    expect(evaluateLedgerCurrency(keys, pbs("2026-10"), NOV_15).lastDataChangeAt).toBe("2026-11-09T01:00:00Z");
  });
  it("with no usable vintage it is null, not 'now' and not the period", () => {
    const keys = keysAt("2026-10-31").map((k) => ({ ...k, vintage: null }));
    expect(evaluateLedgerCurrency(keys, pbs("2026-10"), NOV_15).lastDataChangeAt).toBeNull();
    expect(evaluateLedgerCurrency(keys.map((k) => ({ ...k, vintage: "garbage" })), pbs("2026-10"), NOV_15).lastDataChangeAt).toBeNull();
  });
  it("behindForHours is null when PBS did not say when it prepared the file", () => {
    expect(evaluateLedgerCurrency(keysAt("2026-10-31"), pbs("2026-11"), DEC_05).behindForHours).toBeNull();
  });
});

// ───────────────────────────── combined verdict ─────────────────────────────

const STALE = 216;
const at = (now: Date, h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const row = (now: Date, status: CronRunRecord["status"], f: CpiRunFields, ago: number): CronRunRecord => ({ jobName: "pbs-cpi-groups-ingestion", startedAt: at(now, ago), finishedAt: at(now, ago), durationMs: 1, status, detail: formatCpiRunDetail(f) });
const okRun = (now: Date, ago: number, outcome: "unchanged" | "updated" = "unchanged") => row(now, "success", { outcome, series: 26, failed: 0, latest: "2026-10" }, ago);
const status = (now: Date, runs: CronRunRecord[], keys: LedgerKeyState[], probe: PbsProbe) =>
  evaluateCpiIngestionStatus(evaluateCpiRunEvidence(runs, now, { staleAfterHours: STALE }), evaluateLedgerCurrency(keys, probe, now));

describe("combined status", () => {
  it("OK: healthy runs and a current ledger", () => {
    const s = status(NOV_15, [okRun(NOV_15, 3)], keysAt("2026-10-31"), pbs("2026-10"));
    expect(s.severity).toBe("ok");
    expect(s.headline).toMatch(/^ok — /);
  });

  it("NO FALSE ALARM in the normal gap before PBS publishes: runs healthy, ledger a month old, PBS not out -> a NOTICE at most", () => {
    const s = status(DEC_03, [okRun(DEC_03, 3), okRun(DEC_03, 27)], keysAt("2026-10-31"), pbs("2026-10"));
    expect(s.severity).toBe("notice");
    expect(s.reasons[0]).toMatch(/PBS has not published 2026-11 yet \(normal\)/);
  });

  it("a delayed release (day 9, PBS still not out) stays a notice as long as the runs keep succeeding", () => {
    const day9 = new Date("2026-12-09T05:00:00Z");
    expect(status(day9, [okRun(day9, 2)], keysAt("2026-10-31"), pbs("2026-10")).severity).toBe("notice");
  });

  it("A SUCCESSFUL RUN THAT STILL LEAVES THE LEDGER BEHIND is a warning, and says so explicitly", () => {
    const s = status(DEC_05, [okRun(DEC_05, 20, "unchanged")], keysAt("2026-10-31"), pbs("2026-11", at(DEC_05, 10)));
    expect(s.run.state).toBe("healthy");
    expect(s.currency.state).toBe("behind-pbs");
    expect(s.severity).toBe("warning");
    expect(s.reasons.join(" ")).toMatch(/the latest run succeeded, but PBS has published since — a successful run is not proof that the ledger is current/);
  });

  it(`…and becomes CRITICAL once PBS has held the release for more than ${BEHIND_PBS_ESCALATE_HOURS}h without the ledger taking it`, () => {
    const s = status(DEC_05, [okRun(DEC_05, 20)], keysAt("2026-10-31"), pbs("2026-11", at(DEC_05, BEHIND_PBS_ESCALATE_HOURS + 1)));
    expect(s.severity).toBe("critical");
    expect(s.reasons[0]).toMatch(/PBS has held 2026-11 for 49h and the ledger still lacks it/);
  });

  it("PBS unavailable: the latest run failed with pbs-unavailable -> warning; repeated -> critical", () => {
    const f = (ago: number) => row(NOV_15, "failure", { outcome: "pbs-unavailable", attempts: 3 }, ago);
    expect(status(NOV_15, [f(1), okRun(NOV_15, 30)], keysAt("2026-10-31"), { ok: false, error: "HTTP 503" }).severity).toBe("warning");
    const s = status(NOV_15, [f(1), f(25), f(49), okRun(NOV_15, 73)], keysAt("2026-10-31"), { ok: false, error: "HTTP 503" });
    expect(s.severity).toBe("critical");
    expect(s.reasons[0]).toMatch(/failed 3 runs in a row \(pbs-unavailable\)/);
  });

  it("a partly ingested release after a partial run is CRITICAL", () => {
    const partialRun = row(DEC_05, "failure", { outcome: "partial", series: 26, updated: 25, failed: 1, failedKeys: ["pbs:cpiGroupIndex03"], latest: "2026-11" }, 1);
    const s = status(DEC_05, [partialRun, okRun(DEC_05, 30)], keysAt("2026-11-30", { "pbs:cpiGroupIndex03": "2026-10-31" }), pbs("2026-11"));
    expect(s.severity).toBe("critical");
    expect(s.currency.state).toBe("partial-release");
  });

  it("RECOVERY: after the outage, a good run that completes the release -> ok again", () => {
    const runs = [row(DEC_05, "success", { outcome: "updated", series: 26, updated: 26, failed: 0, latest: "2026-11" }, 1), row(DEC_05, "failure", { outcome: "pbs-unavailable", attempts: 3 }, 25)];
    const s = status(DEC_05, runs, keysAt("2026-11-30"), pbs("2026-11"));
    expect(s.severity).toBe("ok");
    expect(s.run.recoveredAfterFailures).toBe(1);
  });

  it("NOT RUNNING at all is critical even though the ledger looks current — 'current' is not proof the job still runs", () => {
    const s = status(NOV_15, [okRun(NOV_15, STALE + 40)], keysAt("2026-10-31"), pbs("2026-10"));
    expect(s.currency.state).toBe("current");
    expect(s.severity).toBe("critical");
    expect(s.reasons[0]).toMatch(/NOT RUNNING/);
  });

  it("never run + no data -> critical, with both reasons", () => {
    const s = status(NOV_15, [], [], null);
    expect(s.severity).toBe("critical");
    expect(s.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("the current ledger is NOT reported current merely because an old successful run is still in the log", () => {
    // run healthy (a success 20h ago) but PBS has since published and the ledger has not taken it
    const s = status(DEC_05, [okRun(DEC_05, 20)], keysAt("2026-10-31"), pbs("2026-11", at(DEC_05, 5)));
    expect(s.currency.state).not.toBe("current");
    expect(s.severity).not.toBe("ok");
  });
});

describe("the six dimensions", () => {
  it("1–4 carry real evidence; 5 and 6 say plainly that they are page-side and not evaluated here", () => {
    const runs = [okRun(NOV_15, 3), row(NOV_15, "success", { outcome: "updated", series: 26, updated: 26, failed: 0, latest: "2026-10" }, 200)];
    const d = status(NOV_15, runs, keysAt("2026-10-31"), pbs("2026-10")).dimensions;
    expect(d.latestObservationPeriod).toBe("2026-10");
    expect(d.lastIngestionRun).toBe(at(NOV_15, 3));
    expect(d.lastDataChange).toBe(VINTAGE); // the ledger's own vintage, NOT the run time
    expect(d.lastSourceFetch).toBe(at(NOV_15, 3));
    expect(d.lastPageGeneration).toBe("page-side: not evaluated here");
    expect(d.currentPageSource).toBe("page-side: not evaluated here");
  });

  it("ingestion RAN (unchanged) vs data CHANGED are different timestamps", () => {
    const d = status(NOV_15, [okRun(NOV_15, 1)], keysAt("2026-10-31"), pbs("2026-10")).dimensions;
    expect(d.lastIngestionRun).not.toBe(d.lastDataChange);
  });

  it("with no evidence they are null, not defaulted", () => {
    const d = status(NOV_15, [], [], null).dimensions;
    expect([d.latestObservationPeriod, d.lastIngestionRun, d.lastDataChange, d.lastSourceFetch]).toEqual([null, null, null, null]);
  });
});

describe("the terminal report", () => {
  it("leads with the verdict, shows all six dimensions, and never prints a value it does not have", async () => {
    const { formatCpiIngestionStatus } = await import("./cpiLedgerCurrency");
    const text = formatCpiIngestionStatus(status(DEC_05, [okRun(DEC_05, 20)], keysAt("2026-10-31"), pbs("2026-11", at(DEC_05, 10)))).join("\n");
    expect(text.split("\n")[0]).toMatch(/^STATUS: warning — PBS holds 2026-11; the ledger is at 2026-10/);
    for (const d of ["latest observation period", "last ingestion run", "last data change", "last source fetch", "last page generation", "current page source"]) expect(text).toContain(d);
    expect(text).toMatch(/a successful run is not proof that the ledger is current/);
    const none = formatCpiIngestionStatus(status(NOV_15, [], [], null)).join("\n");
    expect(none).toMatch(/last ingestion run\s+: — \(no evidence\)/);
    expect(none).not.toMatch(/undefined|null|NaN/);
  });
});
