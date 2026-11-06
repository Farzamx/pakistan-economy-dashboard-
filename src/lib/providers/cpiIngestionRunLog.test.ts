// F.2f: the structured cron_run_log line. Pure.

import { describe, expect, it } from "vitest";
import { CPI_RUN_OUTCOMES, formatCpiRunDetail, parseCpiRunDetail, sanitizeReason, statusForOutcome, type CpiRunFields } from "./cpiIngestionRunLog";

const full: CpiRunFields = {
  outcome: "updated", series: 26, updated: 26, unchanged: 0, failed: 0, periodsWritten: 1352, latest: "2026-10", attempts: 1, prepared: "2026-11-03T06:38:35.000Z",
};

describe("format / parse round trip", () => {
  it("a full line reads back exactly", () => {
    const line = formatCpiRunDetail(full);
    expect(line).toBe("cpi-ingest/1 | outcome=updated | series=26 | updated=26 | unchanged=0 | failed=0 | periodsWritten=1352 | latest=2026-10 | attempts=1 | prepared=2026-11-03T06:38:35.000Z");
    expect(parseCpiRunDetail(line)).toEqual({ format: "v1", ...full, failedKeys: undefined, reason: undefined });
  });

  it.each(CPI_RUN_OUTCOMES.map((o) => [o] as const))("outcome %s survives", (outcome) => {
    expect(parseCpiRunDetail(formatCpiRunDetail({ outcome })).outcome).toBe(outcome);
  });

  it("an unknown field is OMITTED, never defaulted: a parsed run says undefined, not zero", () => {
    const line = formatCpiRunDetail({ outcome: "pbs-unavailable", attempts: 3 });
    expect(line).toBe("cpi-ingest/1 | outcome=pbs-unavailable | attempts=3");
    const p = parseCpiRunDetail(line);
    expect(p.updated).toBeUndefined();
    expect(p.failed).toBeUndefined();
    expect(p.latest).toBeUndefined();
    expect(p.prepared).toBeUndefined();
  });

  it("failed series keys are listed (capped) so a partial month names its holes", () => {
    const keys = Array.from({ length: 11 }, (_, i) => `pbs:cpiGroupIndex${String(i + 1).padStart(2, "0")}`);
    const p = parseCpiRunDetail(formatCpiRunDetail({ outcome: "partial", failed: 11, failedKeys: keys }));
    expect(p.failedKeys).toHaveLength(9); // 8 keys + the "+3" overflow marker
    expect(p.failedKeys?.at(-1)).toBe("+3");
  });
});

describe("statuses", () => {
  it("only unchanged/updated are successes; a PARTLY ingested month is a failure; busy is skipped", () => {
    expect(CPI_RUN_OUTCOMES.map((o) => [o, statusForOutcome(o)])).toEqual([
      ["unchanged", "success"], ["updated", "success"], ["partial", "failure"], ["pbs-unavailable", "failure"], ["rejected", "failure"], ["error", "failure"], ["busy", "skipped"],
    ]);
  });
});

describe("the reason field is inert", () => {
  it("URLs, separators, newlines and length are neutralised", () => {
    const s = sanitizeReason("fetch https://www.pbs.gov.pk/x?token=abc failed | outcome=updated\nsecond line\t" + "x".repeat(400));
    expect(s).not.toMatch(/https?:/);
    expect(s).not.toMatch(/[|=\n\t]/);
    expect(s.length).toBeLessThanOrEqual(160);
  });
  it("a hostile reason cannot forge another field (outcome=updated inside the text)", () => {
    const p = parseCpiRunDetail(formatCpiRunDetail({ outcome: "error", reason: "x | outcome=updated | failed=0" }));
    expect(p.outcome).toBe("error");
    expect(p.failed).toBeUndefined();
  });
});

describe("what it refuses to believe", () => {
  it.each([null, undefined, "", "random text", "cpi-ingest/2 | outcome=updated", "cpi-ingest/1", "cpi-ingest/1 | outcome=great-success"])("%s -> unknown", (d) => {
    expect(parseCpiRunDetail(d)).toEqual({ format: "unknown" });
  });
  it("garbage numbers, months and timestamps are dropped rather than parsed", () => {
    const p = parseCpiRunDetail("cpi-ingest/1 | outcome=updated | series=NaN | updated=-3 | latest=2026-13 | prepared=yesterday");
    expect(p).toMatchObject({ format: "v1", outcome: "updated" });
    expect([p.series, p.updated, p.latest, p.prepared]).toEqual([undefined, undefined, undefined, undefined]);
  });
  it("only the first occurrence of a field counts", () => {
    expect(parseCpiRunDetail("cpi-ingest/1 | outcome=updated | outcome=error").outcome).toBe("updated");
  });
});

describe("the legacy line (the single production run so far)", () => {
  it("is read as an update of 26 series, flagged legacy", () => {
    expect(parseCpiRunDetail("26 PBS CPI series | 0 unchanged | 26 updated | 0 failed")).toEqual({ format: "legacy", series: 26, unchanged: 0, updated: 26, failed: 0, outcome: "updated" });
  });
  it("a legacy line with failures is a partial; with nothing updated, unchanged", () => {
    expect(parseCpiRunDetail("26 PBS CPI series | 23 unchanged | 0 updated | 3 failed | Failed: x").outcome).toBe("partial");
    expect(parseCpiRunDetail("26 PBS CPI series | 26 unchanged | 0 updated | 0 failed").outcome).toBe("unchanged");
  });
});
