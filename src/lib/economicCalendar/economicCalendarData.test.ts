// Phase 16 — regression tests for selectUpcomingByDate.
//
// The defect this pins, reproduced on production 2026-09-13: the overview's
// "Upcoming Calendar" tile listed 27 Jul, 5 Aug and 7 Aug 2026 as upcoming,
// because getAllScheduledEvents() selects on `status = 'scheduled'` with no
// date predicate and orders ascending — so events whose outcomes were never
// recorded upstream stay in that set forever and sort to the FRONT.

import { describe, it, expect } from "vitest";
import { selectUpcomingByDate } from "./economicCalendarData";

const events = [
  { eventDate: "2026-07-27", title: "SBP Monetary Policy Committee Meeting" },
  { eventDate: "2026-08-05", title: "Treasury Bill Auction (3M)" },
  { eventDate: "2026-08-07", title: "GDP Growth Release (FY2025-26 Provisional)" },
  { eventDate: "2026-09-14", title: "SBP Monetary Policy Committee Meeting" },
  { eventDate: "2026-10-26", title: "SBP Monetary Policy Committee Meeting" },
  { eventDate: "2026-12-14", title: "SBP Monetary Policy Committee Meeting" },
];

describe("selectUpcomingByDate", () => {
  it("regression: never presents a past event as upcoming", () => {
    const upcoming = selectUpcomingByDate(events, "2026-09-13", 5);
    expect(upcoming.map((e) => e.eventDate)).toEqual(["2026-09-14", "2026-10-26", "2026-12-14"]);
    // The three stale rows that were actually rendered in production are gone.
    for (const stale of ["2026-07-27", "2026-08-05", "2026-08-07"]) {
      expect(upcoming.some((e) => e.eventDate === stale)).toBe(false);
    }
  });

  it("treats an event dated today as upcoming, not past", () => {
    // The 14 Sep MPC must still be listed on 14 Sep itself.
    expect(selectUpcomingByDate(events, "2026-09-14", 5).map((e) => e.eventDate)).toContain("2026-09-14");
  });

  it("preserves the caller's soonest-first ordering rather than re-sorting", () => {
    const upcoming = selectUpcomingByDate(events, "2026-01-01", 6);
    expect(upcoming.map((e) => e.eventDate)).toEqual(events.map((e) => e.eventDate));
  });

  it("honours the limit", () => {
    expect(selectUpcomingByDate(events, "2026-01-01", 2)).toHaveLength(2);
  });

  it("returns an empty list when nothing is genuinely upcoming — the honest state, never a back-filled past event", () => {
    expect(selectUpcomingByDate(events, "2027-01-01", 5)).toEqual([]);
  });

  it("handles an empty input without throwing", () => {
    expect(selectUpcomingByDate([], "2026-09-13", 5)).toEqual([]);
  });

  it("is pure — the same inputs always produce the same output, and the input is not mutated", () => {
    const input = [...events];
    const a = selectUpcomingByDate(input, "2026-09-13", 5);
    const b = selectUpcomingByDate(input, "2026-09-13", 5);
    expect(a).toEqual(b);
    expect(input.map((e) => e.eventDate)).toEqual(events.map((e) => e.eventDate));
  });
});
