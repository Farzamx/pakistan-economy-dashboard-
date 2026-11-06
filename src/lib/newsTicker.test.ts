// Ticker policy constants and helpers (Overview "Latest News").

import { describe, expect, it } from "vitest";
import {
  TICKER_MIN_ITEMS_TO_ANIMATE,
  TICKER_SECONDS_PER_ITEM,
  TICKER_STATIC_VISIBLE_AT_DESKTOP,
  shouldAnimateTicker,
  tickerAlignTimeMs,
  tickerDurationSeconds,
} from "./newsTicker";

describe("when the ticker moves", () => {
  it("does not animate fewer than two headlines", () => {
    // One headline sliding past and looping back to itself is motion with no
    // information in it.
    expect(shouldAnimateTicker(0)).toBe(false);
    expect(shouldAnimateTicker(1)).toBe(false);
  });

  it("animates from two headlines upward", () => {
    expect(TICKER_MIN_ITEMS_TO_ANIMATE).toBe(2);
    expect(shouldAnimateTicker(2)).toBe(true);
    expect(shouldAnimateTicker(6)).toBe(true);
  });
});

describe("pace", () => {
  it("is slow enough to read while moving", () => {
    // Text is in motion while it is read; anything faster than ~12s per card
    // makes a headline hard to follow.
    expect(TICKER_SECONDS_PER_ITEM).toBeGreaterThanOrEqual(12);
  });

  it("scales the loop with the number of headlines, so pace per card is constant", () => {
    expect(tickerDurationSeconds(6)).toBe(6 * TICKER_SECONDS_PER_ITEM);
    expect(tickerDurationSeconds(4)).toBe(4 * TICKER_SECONDS_PER_ITEM);
    // Doubling the headlines doubles the loop; it never speeds the cards up.
    expect(tickerDurationSeconds(8) / 8).toBe(tickerDurationSeconds(4) / 4);
  });

  it("never returns a negative duration", () => {
    expect(tickerDurationSeconds(0)).toBe(0);
    expect(tickerDurationSeconds(-3)).toBe(0);
  });
});

describe("aligning a keyboard-focused card", () => {
  it("puts card 0 at the start of the loop", () => {
    expect(tickerAlignTimeMs(0)).toBe(0);
  });

  it("puts card i exactly i card-times into the loop", () => {
    // The loop is N card-times long and moves one card-width per card-time, so
    // card i is at the left edge after i card-times — whatever the panel width.
    expect(tickerAlignTimeMs(3)).toBe(3 * TICKER_SECONDS_PER_ITEM * 1000);
  });

  it("lands every card inside the loop", () => {
    const n = 6;
    for (let i = 0; i < n; i++) {
      expect(tickerAlignTimeMs(i)).toBeLessThan(tickerDurationSeconds(n) * 1000);
    }
  });

  it("clamps a negative index to the start", () => {
    expect(tickerAlignTimeMs(-1)).toBe(0);
  });
});

describe("the static presentation", () => {
  it("shows a bounded number of rows beside Markets", () => {
    expect(TICKER_STATIC_VISIBLE_AT_DESKTOP).toBeGreaterThanOrEqual(3);
    expect(TICKER_STATIC_VISIBLE_AT_DESKTOP).toBeLessThanOrEqual(5);
  });
});
