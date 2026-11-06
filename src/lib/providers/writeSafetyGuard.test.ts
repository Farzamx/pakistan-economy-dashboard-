// Phase F.2b-R: the independent write barrier. Every test passes an EXPLICIT env object — none reads or
// depends on the real process environment, and none can reach a database.

import { describe, expect, it, vi } from "vitest";
import {
  TEST_SIGNALS,
  WRITE_CONFIRM_ENV,
  WriteRefusedError,
  assertNotUnderTest,
  assertWriteAllowed,
  assertWriteConfirmed,
  loadLocalEnv,
  underTest,
} from "./writeSafetyGuard";

const PROD = "https://abcdefghijklmnop.supabase.co";
const operatorEnv = { NEXT_PUBLIC_SUPABASE_URL: PROD, [WRITE_CONFIRM_ENV]: "abcdefghijklmnop.supabase.co" };

describe("barrier 1 — not under test", () => {
  it("passes in a clean operator environment", () => {
    expect(() => assertNotUnderTest({})).not.toThrow();
    expect(underTest({})).toBeNull();
  });

  it.each(TEST_SIGNALS)("refuses when %s is present", (signal) => {
    expect(() => assertNotUnderTest({ [signal]: "1" })).toThrow(WriteRefusedError);
    expect(underTest({ [signal]: "1" })).toBe(signal);
  });

  it("refuses under NODE_ENV=test", () => {
    expect(() => assertNotUnderTest({ NODE_ENV: "test" })).toThrow(/NODE_ENV=test/);
  });

  it("an empty signal value is not a signal (but the harness always sets '1')", () => {
    expect(underTest({ PEIC_TEST_ISOLATION: "" })).toBeNull();
  });
});

describe("barrier 2 — target-bound confirmation", () => {
  it("passes when the operator confirms the exact host being written to", () => {
    expect(() => assertWriteConfirmed(operatorEnv)).not.toThrow();
  });

  it("is case- and whitespace-insensitive for the host", () => {
    expect(() => assertWriteConfirmed({ ...operatorEnv, [WRITE_CONFIRM_ENV]: "  ABCDEFGHIJKLMNOP.supabase.co " })).not.toThrow();
  });

  it("refuses when no confirmation is given, and tells the operator exactly what to set", () => {
    const { [WRITE_CONFIRM_ENV]: _omit, ...rest } = operatorEnv;
    void _omit;
    expect(() => assertWriteConfirmed(rest)).toThrow(new RegExp(`${WRITE_CONFIRM_ENV}=abcdefghijklmnop\\.supabase\\.co`));
  });

  it("refuses a confirmation for a DIFFERENT database", () => {
    expect(() => assertWriteConfirmed({ ...operatorEnv, [WRITE_CONFIRM_ENV]: "someotherproject.supabase.co" })).toThrow(WriteRefusedError);
  });

  it("refuses a generic confirmation such as 'yes', 'true' or '1'", () => {
    for (const v of ["yes", "true", "1", "production", "*"]) expect(() => assertWriteConfirmed({ ...operatorEnv, [WRITE_CONFIRM_ENV]: v })).toThrow(WriteRefusedError);
  });

  it("refuses when the database URL is missing or unparseable (fail closed)", () => {
    expect(() => assertWriteConfirmed({ [WRITE_CONFIRM_ENV]: "x" })).toThrow(/no database URL/);
    expect(() => assertWriteConfirmed({ NEXT_PUBLIC_SUPABASE_URL: "not a url", [WRITE_CONFIRM_ENV]: "x" })).toThrow(/not parseable/);
  });
});

describe("both barriers together", () => {
  it("allows a write only when not under test AND the target is confirmed", () => {
    expect(() => assertWriteAllowed(operatorEnv)).not.toThrow();
  });

  it("a correct confirmation does NOT help under a test harness — the barriers are independent", () => {
    expect(() => assertWriteAllowed({ ...operatorEnv, PEIC_TEST_ISOLATION: "1" })).toThrow(/test harness/);
    expect(() => assertWriteAllowed({ ...operatorEnv, VITEST: "true" })).toThrow(/test harness/);
  });

  it("test-harness isolation does NOT need a missing confirmation to be noticed — each alone is sufficient", () => {
    expect(() => assertNotUnderTest({ PEIC_TEST_ISOLATION: "1" })).toThrow(WriteRefusedError); // barrier 1 alone
    expect(() => assertWriteConfirmed({ NEXT_PUBLIC_SUPABASE_URL: PROD })).toThrow(WriteRefusedError); // barrier 2 alone
  });
});

describe("loadLocalEnv", () => {
  it("never reads the env file under any test-harness signal", () => {
    const load = vi.fn();
    expect(loadLocalEnv({ PEIC_TEST_ISOLATION: "1" }, "/x/.env.local", load)).toBe(false);
    expect(loadLocalEnv({ VITEST: "true" }, "/x/.env.local", load)).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("reads it for a normal operator run", () => {
    const load = vi.fn();
    expect(loadLocalEnv({}, "/x/.env.local", load)).toBe(true);
    expect(load).toHaveBeenCalledWith({ path: "/x/.env.local", quiet: true });
  });
});
