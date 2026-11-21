import { describe, expect, it } from "vitest";
import {
  arrowState,
  blurState,
  clampValue,
  commitFor,
  displayFor,
  formatNumber,
  initialState,
  isOutOfRange,
  parseDraft,
  sanitizeDraft,
  settledText,
  stepValue,
  syncState,
  typeInto,
  type FieldState,
  type NumericRules,
} from "./numericInput";

const PCT: NumericRules = { min: 0, max: 100 };
const RATE: NumericRules = { min: -50, max: 200 }; // negatives allowed
const YEARS: NumericRules = { min: 1, max: 50, integer: true, emptyBehavior: "keep" };
const MONEY: NumericRules = { min: 0 };

/** Types a whole string one character at a time, the way a keyboard does, and returns the final state and every number the tool was told. */
function typeAll(text: string, r: NumericRules, start = 0): { state: FieldState; told: number[]; tool: number } {
  let tool = start;
  let state: FieldState = { draft: "", seen: tool }; // the box starts empty (select-all + type), the tool holds `start`
  const told: number[] = [];
  let current = "";
  for (const ch of text) {
    current += ch;
    const res = typeInto(state, current, tool, r);
    state = res.state;
    current = state.draft;
    if (res.commit !== undefined) {
      tool = res.commit;
      told.push(res.commit);
      state = syncState(state, tool, r);
    }
  }
  return { state, told, tool };
}

describe("sanitizeDraft", () => {
  it("accepts the intermediate drafts a person types on the way to a number", () => {
    for (const s of ["", "0", "0.", "0.5", ".", ".5", "-", "-0", "-0.", "-.5", "12.50"]) expect(sanitizeDraft(s, RATE)).toBe(s);
  });
  it("rejects letters, a second dot, a stray minus", () => {
    expect(sanitizeDraft("1a", RATE)).toBeNull();
    expect(sanitizeDraft("1.2.3", RATE)).toBeNull();
    expect(sanitizeDraft("1-2", RATE)).toBeNull();
    expect(sanitizeDraft("e5", RATE)).toBeNull();
    expect(sanitizeDraft("+5", RATE)).toBeNull();
  });
  it("rejects a minus where negatives make no sense, and a dot in integer fields", () => {
    expect(sanitizeDraft("-", PCT)).toBeNull();
    expect(sanitizeDraft("-5", MONEY)).toBeNull();
    expect(sanitizeDraft("2.5", YEARS)).toBeNull();
    expect(sanitizeDraft("-3", YEARS)).toBeNull();
  });
  it("drops thousands separators and spaces so 1,000 can be pasted", () => {
    expect(sanitizeDraft("1,500,000", MONEY)).toBe("1500000");
    expect(sanitizeDraft(" 25 ", PCT)).toBe("25");
  });
  it("honours maxDecimals", () => {
    expect(sanitizeDraft("1.25", { maxDecimals: 2 })).toBe("1.25");
    expect(sanitizeDraft("1.255", { maxDecimals: 2 })).toBeNull();
  });
});

describe("parseDraft / commitFor", () => {
  it("classifies drafts", () => {
    expect(parseDraft("")).toEqual({ kind: "empty" });
    for (const s of ["-", ".", "-."]) expect(parseDraft(s)).toEqual({ kind: "partial" });
    expect(parseDraft("1.")).toEqual({ kind: "number", value: 1 });
    expect(parseDraft(".5")).toEqual({ kind: "number", value: 0.5 });
    expect(parseDraft("007")).toEqual({ kind: "number", value: 7 });
  });
  it("never produces -0", () => {
    expect(Object.is((parseDraft("-0") as { value: number }).value, 0)).toBe(true);
    expect(Object.is(commitFor("-0", RATE), 0)).toBe(true);
  });
  it("tells the tool nothing for half-typed numbers", () => {
    expect(commitFor("-", RATE)).toBeUndefined();
    expect(commitFor(".", PCT)).toBeUndefined();
  });
  it("empty commits emptyValue (default 0), or nothing for keep fields", () => {
    expect(commitFor("", PCT)).toBe(0);
    expect(commitFor("", { min: 1, emptyValue: 1 })).toBe(1);
    expect(commitFor("", YEARS)).toBeUndefined();
  });
  it("clamps before the tool sees the number", () => {
    expect(commitFor("250", PCT)).toBe(100);
    expect(commitFor("-5", RATE)).toBe(-5);
    expect(commitFor("-500", RATE)).toBe(-50);
    expect(commitFor("0", YEARS)).toBe(1);
  });
});

describe("typing whole values (the reported bug)", () => {
  it.each([
    ["0", 0],
    ["0.5", 0.5],
    ["1", 1],
    ["2.5", 2.5],
    ["10", 10],
    ["100", 100],
    ["0.25", 0.25],
    [".5", 0.5],
    ["12.75", 12.75],
  ])("percentage field accepts %s", (text, expected) => {
    const { state, tool } = typeAll(text, PCT);
    expect(tool).toBe(expected);
    expect(state.draft).toBe(text); // the text is never rewritten under the cursor
  });

  it("typing 0 keeps showing 0 (not blanked) so 0.5 can follow", () => {
    const { state, tool } = typeAll("0", PCT, 7);
    expect(state.draft).toBe("0");
    expect(tool).toBe(0);
  });

  it("typing a value above max is held at max for the tool but the text stays until blur", () => {
    const { state, tool } = typeAll("150", PCT);
    expect(tool).toBe(100);
    expect(state.draft).toBe("150");
    expect(isOutOfRange(state.draft, PCT)).toBe(true);
    expect(blurState(state, tool, PCT).draft).toBe("100");
  });

  it("negative rates can be typed through '-' and '-0.'", () => {
    const { state, tool, told } = typeAll("-2.5", RATE);
    expect(tool).toBe(-2.5);
    expect(state.draft).toBe("-2.5");
    expect(told).not.toContain(NaN);
  });

  it("large money values", () => {
    const { tool, state } = typeAll("123456789012", MONEY);
    expect(tool).toBe(123456789012);
    expect(state.draft).toBe("123456789012");
  });
});

describe("editing and clearing", () => {
  it("deleting a character edits normally", () => {
    const { state, tool } = typeAll("25", PCT, 0);
    const r = typeInto(state, "2", tool, PCT);
    expect(r.state.draft).toBe("2");
    expect(r.commit).toBe(2);
  });
  it("clearing the box tells the tool 0 and leaves the box empty while focused", () => {
    const { state, tool } = typeAll("25", PCT);
    const r = typeInto(state, "", tool, PCT);
    expect(r.state.draft).toBe("");
    expect(r.commit).toBe(0);
  });
  it("select-all and replace works", () => {
    const { state, tool } = typeAll("25", PCT);
    const r = typeInto(state, "7", tool, PCT);
    expect(r.state.draft).toBe("7");
    expect(r.commit).toBe(7);
  });
  it("a keep field (years) can be cleared and retyped without the tool seeing 0 or an empty value", () => {
    let tool = 10;
    let state = initialState(tool, YEARS);
    let r = typeInto(state, "", tool, YEARS);
    expect(r.commit).toBeUndefined();
    state = r.state;
    expect(state.draft).toBe("");
    r = typeInto(state, "2", tool, YEARS);
    expect(r.commit).toBe(2);
    tool = 2;
    state = r.state;
    r = typeInto(state, "25", tool, YEARS);
    expect(r.commit).toBe(25);
  });
  it("blur returns an emptied keep field to the tool's value", () => {
    expect(settledText("", 10, YEARS)).toBe("10");
    expect(settledText("-", 10, RATE)).toBe("10");
  });
  it("blur on an emptied optional field leaves it blank (placeholder), as the tools had it", () => {
    expect(settledText("", 0, PCT)).toBe("");
  });
  it("blur normalises a trailing dot and leading zeros but keeps a typed 0", () => {
    expect(settledText("5.", 5, PCT)).toBe("5");
    expect(settledText("007", 7, PCT)).toBe("7");
    expect(settledText("0", 0, PCT)).toBe("0");
  });
});

describe("tool-driven changes", () => {
  it("syncState adopts a value the tool changed (a restore button)", () => {
    const { state } = typeAll("25", PCT);
    const s = syncState(state, 10, PCT);
    expect(s.draft).toBe("10");
    expect(s.seen).toBe(10);
  });
  it("syncState leaves the draft alone when it already means that value", () => {
    const { state } = typeAll("2.50", PCT);
    expect(state.draft).toBe("2.50");
    expect(syncState({ ...state, seen: 1 }, 2.5, PCT).draft).toBe("2.50");
  });
  it("a tool 0 shows blank (placeholder) unless the field has a non-zero emptyValue or is keep", () => {
    expect(displayFor(0, PCT)).toBe("");
    expect(displayFor(0, { min: 1, emptyValue: 1 })).toBe("0");
    expect(displayFor(0, { emptyBehavior: "keep" })).toBe("0");
    expect(displayFor(5, PCT)).toBe("5");
  });
});

describe("formatNumber / clampValue / stepValue", () => {
  it("removes binary noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(150000)).toBe("150000");
    expect(formatNumber(1 / 3)).toBe("0.333333333333");
    expect(formatNumber(Number.NaN)).toBe("");
  });
  it("clamp respects only the bounds that exist and never returns -0", () => {
    expect(clampValue(-5, {})).toBe(-5);
    expect(clampValue(5, { max: 3 })).toBe(3);
    expect(Object.is(clampValue(-0, {}), 0)).toBe(true);
  });
  it("arrow stepping keeps 0.1 steps clean and clamps", () => {
    expect(stepValue(0.1, 1, 0.1, PCT)).toBe(0.2);
    expect(stepValue(0.7, 1, 0.1, PCT)).toBe(0.8);
    expect(stepValue(0, -1, 1, PCT)).toBe(0);
    expect(stepValue(100, 1, 1, PCT)).toBe(100);
    expect(stepValue(0, -1, 0.5, RATE)).toBe(-0.5);
  });
  it("arrowState steps from the typed text, or from the tool value when the text is partial", () => {
    const st: FieldState = { draft: "2.5", seen: 2.5 };
    const r = arrowState(st, 2.5, 1, 0.5, PCT);
    expect(r.commit).toBe(3);
    expect(r.state.draft).toBe("3");
    const p = arrowState({ draft: "-", seen: 4 }, 4, 1, 1, RATE);
    expect(p.commit).toBe(5);
  });
});

describe("integer / keep fields", () => {
  it("years: typing 2 then 5 reaches 25 without ever being forced to a minimum", () => {
    const { tool, state } = typeAll("25", YEARS, 10);
    expect(tool).toBe(25);
    expect(state.draft).toBe("25");
  });
  it("years: typing 0 clamps to 1 for the tool; text stays 0 until blur then shows 1", () => {
    const { tool, state } = typeAll("0", YEARS, 10);
    expect(tool).toBe(1);
    expect(blurState(state, tool, YEARS).draft).toBe("1");
  });
});
