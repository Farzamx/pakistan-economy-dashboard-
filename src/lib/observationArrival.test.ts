// Phase D.4 — observation arrival tracking.
//
// The central risk this guards: inventing a publication time. A bulk
// backfill records WHEN PEIC LOADED a series, not when the provider
// published it, and substituting the load time (or the current time) would
// manufacture a lag history that never happened. Every assertion below
// exists to keep an unwitnessed arrival honestly unknown.

import { describe, expect, it } from "vitest";
import {
  BACKFILL_CLUSTER_THRESHOLD,
  MIN_MEASURED_FOR_PROFILE,
  buildArrivalReport,
  type ArrivalInput,
} from "./observationArrival";

const row = (observationPeriod: string, vintage: string | null, value = 1, extra: Partial<ArrivalInput> = {}): ArrivalInput => ({
  observationPeriod,
  value,
  vintage,
  ...extra,
});

/** The real backfill signature: many periods sharing one ingestion run. */
const BACKFILL = "2026-10-20T06:39:14.000Z";

describe("a first observation records its arrival", () => {
  it("measures the lag between the period and the first-seen vintage", () => {
    // The genuine D.3 evidence: obs 2026-10-23 first seen 2026-11-06.
    const r = buildArrivalReport("sbp:moneySupplyM2", [row("2026-10-23", "2026-11-06T06:50:57.000Z")]);
    expect(r.records[0].kind).toBe("first-observation");
    expect(r.records[0].arrivalLagDays).toBe(14);
    expect(r.records[0].firstSeenAt).toBe("2026-11-06T06:50:57.000Z");
    expect(r.records[0].unknownReason).toBeNull();
  });

  it("reproduces both genuine D.3 arrivals", () => {
    const r = buildArrivalReport("sbp:privateCreditGrowth", [
      row("2026-10-16", "2026-10-29T03:22:27.000Z"),
      row("2026-10-23", "2026-11-06T06:50:58.000Z"),
    ]);
    expect(r.records.map((x) => x.arrivalLagDays)).toEqual([13, 14]);
    expect(r.measuredCount).toBe(2);
  });
});

describe("repeated unchanged observations preserve the first-seen time", () => {
  it("re-running the report over the same vintage never moves it", () => {
    // The ledger's RPCs are no-ops on unchanged values, so the same vintage
    // arrives again; the computed arrival must be identical and stable.
    const input = [row("2026-10-23", "2026-11-06T06:50:57.000Z")];
    const first = buildArrivalReport("k", input);
    const second = buildArrivalReport("k", input);
    expect(second.records[0].firstSeenAt).toBe(first.records[0].firstSeenAt);
    expect(second.records[0].arrivalLagDays).toBe(first.records[0].arrivalLagDays);
  });

  it("does not mutate its input", () => {
    const input = [row("2026-10-23", "2026-11-06T06:50:57.000Z"), row("2026-10-16", "2026-10-29T03:22:27.000Z")];
    const snapshot = JSON.stringify(input);
    buildArrivalReport("k", input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("historical revisions preserve the original arrival record", () => {
  it("keeps a superseded row's own arrival alongside the revision's", () => {
    // The ledger supersedes rather than overwrites, so both rows exist with
    // their own vintages. Each must keep its own measured arrival.
    const r = buildArrivalReport("k", [
      row("2026-10-23", "2026-11-06T06:50:57.000Z", 44.3),   // original
      row("2026-10-23", "2026-11-20T06:50:57.000Z", 44.9),   // revision, same period
    ]);
    expect(r.records.map((x) => x.arrivalLagDays)).toEqual([14, 28]);
    // Crucially, the revision has NOT erased the original's arrival.
    expect(r.records[0].firstSeenAt).toBe("2026-11-06T06:50:57.000Z");
    expect(r.measuredCount).toBe(2);
  });

  it("does not collapse two vintages of one period into a single record", () => {
    const r = buildArrivalReport("k", [
      row("2026-10-23", "2026-11-06T06:50:57.000Z", 1),
      row("2026-10-23", "2026-11-20T06:50:57.000Z", 2),
    ]);
    expect(r.records).toHaveLength(2);
  });
});

describe("backfilled observations are distinguished from witnessed arrivals", () => {
  // Five periods sharing one ingestion run — the real backfill shape.
  const backfillRows = ["2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25", "2026-10-02"].map((d) => row(d, BACKFILL));

  it("marks a bulk-loaded cluster as backfilled, not as an arrival", () => {
    const r = buildArrivalReport("k", backfillRows);
    expect(r.records.every((x) => x.kind === "backfilled")).toBe(true);
    expect(r.measuredCount).toBe(0);
    expect(r.unknownCount).toBe(5);
  });

  it("NEVER reports a lag for a backfilled row", () => {
    // The core anti-fabrication guarantee.
    const r = buildArrivalReport("k", backfillRows);
    for (const rec of r.records) {
      expect(rec.arrivalLagDays).toBeNull();
      expect(rec.unknownReason).toBe("backfilled");
    }
    expect(r.stats).toBeNull();
  });

  it("separates genuine arrivals from a backfill in the same series", () => {
    const r = buildArrivalReport("k", [...backfillRows, row("2026-10-16", "2026-10-29T03:22:27.000Z"), row("2026-10-23", "2026-11-06T06:50:57.000Z")]);
    expect(r.measuredCount).toBe(2);
    expect(r.unknownCount).toBe(5);
    expect(r.records.filter((x) => x.kind === "first-observation").map((x) => x.arrivalLagDays)).toEqual([13, 14]);
  });

  it("treats a run below the cluster threshold as a genuine arrival", () => {
    // Two periods in one run is an ordinary catch-up, not a backfill.
    const sameRun = "2026-11-06T06:50:57.000Z";
    const r = buildArrivalReport("k", [row("2026-10-16", sameRun), row("2026-10-23", sameRun)]);
    expect(BACKFILL_CLUSTER_THRESHOLD).toBe(3);
    expect(r.measuredCount).toBe(2);
  });
});

describe("out-of-order gap fills are not counted as arrivals", () => {
  it("excludes a later run that reached back to fill an older hole", () => {
    // The real shape found in the ledger: a 12-period backfill, then weeks
    // later a LONE older period appears. Counting it would have produced a
    // spurious 41-day "arrival" for moneySupplyM2.
    const r = buildArrivalReport("k", [
      row("2026-06-05", "2026-08-07T23:03:00.000Z"),
      row("2026-06-12", "2026-08-07T23:03:00.000Z"),
      row("2026-06-19", "2026-08-07T23:03:00.000Z"),
      row("2026-08-14", "2026-09-01T03:00:00.000Z"),
      // Older than 2026-08-14, ingested afterwards => a gap fill.
      row("2026-07-31", "2026-09-10T04:50:00.000Z"),
    ]);
    const fill = r.records.find((x) => x.observationPeriod === "2026-07-31")!;
    expect(fill.kind).toBe("gap-fill");
    expect(fill.arrivalLagDays).toBeNull();
    expect(fill.unknownReason).toBe("out-of-order-gap-fill");
  });

  it("still counts a forward-moving arrival in a later run", () => {
    const r = buildArrivalReport("k", [
      row("2026-10-09", BACKFILL), row("2026-10-02", BACKFILL), row("2026-09-25", BACKFILL),
      row("2026-10-16", "2026-10-29T03:22:27.000Z"),
    ]);
    const arrival = r.records.find((x) => x.observationPeriod === "2026-10-16")!;
    expect(arrival.kind).toBe("first-observation");
    expect(arrival.arrivalLagDays).toBe(13);
  });
});

describe("unknown arrival times stay unknown", () => {
  it("a row with no vintage is never given one", () => {
    const r = buildArrivalReport("k", [row("2026-10-23", null)]);
    expect(r.records[0].firstSeenAt).toBeNull();
    expect(r.records[0].arrivalLagDays).toBeNull();
    expect(r.records[0].unknownReason).toBe("no-vintage");
  });

  it("never substitutes the current time for a missing vintage", () => {
    const before = Date.now();
    const r = buildArrivalReport("k", [row("2026-10-23", null)]);
    // Nothing in the output may resemble "now".
    expect(r.records[0].firstSeenAt).toBeNull();
    expect(JSON.stringify(r)).not.toContain(String(new Date(before).getFullYear() + 1));
  });

  it("rejects a vintage that precedes its own observation period", () => {
    const r = buildArrivalReport("k", [row("2026-10-23", "2026-10-01T00:00:00.000Z")]);
    expect(r.records[0].arrivalLagDays).toBeNull();
    expect(r.records[0].unknownReason).toBe("vintage-before-period");
  });

  it("an all-unknown series reports no statistics and says so plainly", () => {
    const r = buildArrivalReport("k", [row("2026-10-23", null), row("2026-10-16", null)]);
    expect(r.stats).toBeNull();
    expect(r.note).toMatch(/not evidence of when the provider published/i);
  });
});

describe("failed fetches create no arrival events", () => {
  it("an empty ledger produces an empty report, not a fabricated one", () => {
    const r = buildArrivalReport("k", []);
    expect(r.records).toEqual([]);
    expect(r.measuredCount).toBe(0);
    expect(r.stats).toBeNull();
    expect(r.insufficientEvidence).toBe(true);
  });

  it("a failed fetch writes no row, so the report is unchanged", () => {
    // The ledger only records successful observations; a failure simply
    // contributes nothing. Same input => same output.
    const input = [row("2026-10-23", "2026-11-06T06:50:57.000Z")];
    expect(buildArrivalReport("k", input)).toEqual(buildArrivalReport("k", input));
  });
});

describe("evidence sufficiency is stated honestly", () => {
  it("flags insufficient evidence while measured arrivals are few", () => {
    const r = buildArrivalReport("k", [row("2026-10-16", "2026-10-29T03:22:27.000Z"), row("2026-10-23", "2026-11-06T06:50:57.000Z")]);
    expect(r.insufficientEvidence).toBe(true);
    expect(r.note).toMatch(/too few to characterise/i);
  });

  it("stops flagging once enough arrivals accumulate", () => {
    const rows = Array.from({ length: MIN_MEASURED_FOR_PROFILE }, (_, i) => {
      const period = `2026-0${i + 1}-07`;
      // Distinct runs, each well clear of the cluster tolerance.
      return row(period, `2026-0${i + 1}-21T06:00:00.000Z`);
    });
    const r = buildArrivalReport("k", rows);
    expect(r.measuredCount).toBe(MIN_MEASURED_FOR_PROFILE);
    expect(r.insufficientEvidence).toBe(false);
    expect(r.stats).not.toBeNull();
  });

  it("computes statistics only over measured arrivals", () => {
    const r = buildArrivalReport("k", [
      row("2026-09-04", BACKFILL), row("2026-09-11", BACKFILL), row("2026-09-18", BACKFILL),
      row("2026-10-16", "2026-10-29T03:22:27.000Z"),
      row("2026-10-23", "2026-11-06T06:50:57.000Z"),
    ]);
    expect(r.stats).toEqual({ min: 13, median: 13, max: 14, count: 2 });
  });

  it("reports that SBP supplies no provider release date", () => {
    const r = buildArrivalReport("k", [row("2026-10-23", "2026-11-06T06:50:57.000Z")]);
    expect(r.records[0].hasProviderReleaseDate).toBe(false);
  });
});

describe("the module is observational only", () => {
  it("never emits a freshness verdict or reason code", () => {
    const r = buildArrivalReport("k", [row("2026-10-23", "2026-11-06T06:50:57.000Z"), row("2026-09-04", BACKFILL)]);
    const serialized = JSON.stringify(r);
    for (const token of ["current", "delayed-release", "stale", "beyond-grace", "past-due-within-grace", "graceDays"]) {
      expect(serialized, `arrival report must not carry freshness token "${token}"`).not.toContain(token);
    }
  });
});
