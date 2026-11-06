// Phase F.2b-S: the shared entry-point helper. Pure and in-process: nothing here starts a script, reads an env
// file or touches a network or database (every collaborator is a stub).

import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { enterScript, isDirectInvocation, runIfEntryPoint, samePath } from "./scriptEntry";

const SCRIPT = path.resolve(__dirname, "..", "..", "..", "scripts", "ingestSbp.ts");

describe("samePath", () => {
  it("treats absolute, relative-to-cwd and re-spelled paths to the same file as equal", () => {
    expect(samePath(SCRIPT, SCRIPT)).toBe(true);
    expect(samePath(path.relative(process.cwd(), SCRIPT), SCRIPT)).toBe(true);
    expect(samePath(path.join(path.dirname(SCRIPT), "..", "scripts", "ingestSbp.ts"), SCRIPT)).toBe(true);
  });
  it.runIf(process.platform === "win32")("is case-insensitive on Windows (Task Scheduler vs Explorer spellings)", () => {
    expect(samePath(SCRIPT.toUpperCase(), SCRIPT.toLowerCase())).toBe(true);
  });
  it("distinguishes different files", () => {
    expect(samePath(SCRIPT, SCRIPT.replace("ingestSbp", "ingestFred"))).toBe(false);
  });
});

describe("isDirectInvocation: either independent signal is enough", () => {
  it("require.main === module alone", () => {
    expect(isDirectInvocation({ filename: SCRIPT, requireMain: true }, "/somewhere/else.js")).toBe(true);
  });
  it("argv[1] naming this file alone (the launcher asked for it)", () => {
    expect(isDirectInvocation({ filename: SCRIPT, requireMain: false }, SCRIPT)).toBe(true);
  });
  it("argv[1] given relative, as `tsx scripts/x.ts` would, still matches (Node resolves it; so do we)", () => {
    expect(isDirectInvocation({ filename: SCRIPT, requireMain: false }, path.relative(process.cwd(), SCRIPT))).toBe(true);
  });
  it("an IMPORTED module: neither signal — a test runner / another script is the program", () => {
    for (const argv1 of ["/repo/node_modules/vitest/vitest.mjs", "/repo/scripts/ingestFred.ts", "", undefined]) {
      expect(isDirectInvocation({ filename: SCRIPT, requireMain: false }, argv1), String(argv1)).toBe(false);
    }
  });
});

describe("runIfEntryPoint", () => {
  it("runs start() exactly once when executed directly, and reports it", () => {
    const start = vi.fn();
    expect(runIfEntryPoint({ filename: SCRIPT, requireMain: true }, start, "/x")).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
  });
  it("runs NOTHING when imported", () => {
    const start = vi.fn();
    expect(runIfEntryPoint({ filename: SCRIPT, requireMain: false }, start, "/repo/node_modules/vitest/vitest.mjs")).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });
});

describe("enterScript", () => {
  const clean = {} as Record<string, string | undefined>;

  it("in a normal run (no test signal) loads .env.local from the working directory with dotenv's banner left on", () => {
    const load = vi.fn();
    const exit = vi.fn() as never;
    enterScript("ingest:sbp", { env: clean, load, exit });
    expect(load).toHaveBeenCalledWith({ path: path.resolve(process.cwd(), ".env.local"), quiet: false });
    expect(exit).not.toHaveBeenCalled();
  });

  it("honours an explicit env path", () => {
    const load = vi.fn();
    enterScript("x", { env: clean, load, envPath: "/custom/.env.local", exit: vi.fn() as never });
    expect(load).toHaveBeenCalledWith({ path: "/custom/.env.local", quiet: false });
  });

  it.each(["PEIC_TEST_ISOLATION", "VITEST", "VITEST_WORKER_ID", "JEST_WORKER_ID"])("under %s it REFUSES (exit 2) and reads no env file", (signal) => {
    const load = vi.fn();
    const exit = vi.fn() as never;
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    enterScript("ingest:fred", { env: { [signal]: "1" }, load, exit });
    expect(exit).toHaveBeenCalledWith(2);
    expect(load).not.toHaveBeenCalled();
    expect(String(err.mock.calls[0][0])).toMatch(/^\[ingest:fred\] REFUSED: .*test harness/);
    err.mockRestore();
  });

  it("refuses under NODE_ENV=test too", () => {
    const load = vi.fn();
    const exit = vi.fn() as never;
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    enterScript("x", { env: { NODE_ENV: "test" }, load, exit });
    expect(exit).toHaveBeenCalledWith(2);
    expect(load).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
