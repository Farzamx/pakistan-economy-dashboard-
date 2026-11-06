// F.2f: the run lock. Real files, but only inside a throwaway temp directory — nothing near a database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LOCK_STALE_AFTER_MS, acquireRunLock, defaultLockPath } from "./runLock";

const root = mkdtempSync(path.join(tmpdir(), "peic-lock-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
let lock = "";
let n = 0;
beforeEach(() => {
  lock = path.join(root, `case-${++n}`, "run.lock");
});

const T0 = Date.parse("2026-12-02T09:15:00Z");
const alive = () => true;
const dead = () => false;

describe("mutual exclusion", () => {
  it("the first run gets the lock; a second concurrent run does not", () => {
    const a = acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    const b = acquireRunLock(lock, { now: () => T0 + 1000, pid: 222, pidAlive: alive });
    expect(a).not.toBeNull();
    expect(b).toBeNull();
  });

  it("writes who holds it and since when", () => {
    acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    expect(JSON.parse(readFileSync(lock, "utf-8"))).toEqual({ pid: 111, startedAt: "2026-12-02T09:15:00.000Z" });
  });

  it("after release the next run can proceed", () => {
    const a = acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    a?.release();
    expect(existsSync(lock)).toBe(false);
    expect(acquireRunLock(lock, { now: () => T0 + 5, pid: 222, pidAlive: alive })).not.toBeNull();
  });

  it("a SLOW holder whose stale lock was taken over must not delete the new holder's lock when it finally releases (first release, not a repeat)", () => {
    const slow = acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    const successor = acquireRunLock(lock, { now: () => T0 + LOCK_STALE_AFTER_MS + 1, pid: 222, pidAlive: alive });
    expect(successor).not.toBeNull();
    slow?.release(); // the slow run finishes late: this is ITS FIRST release call
    expect(existsSync(lock), "the successor's lock was deleted by the previous holder").toBe(true);
    expect(JSON.parse(readFileSync(lock, "utf-8")).pid).toBe(222);
    // and the current holder can still release its own
    successor?.release();
    expect(existsSync(lock)).toBe(false);
  });

  it("20 simultaneous attempts: exactly one wins", () => {
    const results = Array.from({ length: 20 }, (_, i) => acquireRunLock(lock, { now: () => T0, pid: 1000 + i, pidAlive: alive }));
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it("release is idempotent and never removes a lock that is no longer ours", () => {
    const a = acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    a?.release();
    const b = acquireRunLock(lock, { now: () => T0 + 5, pid: 222, pidAlive: alive });
    a?.release(); // a second release by the FIRST holder must not free b's lock
    expect(existsSync(lock)).toBe(true);
    b?.release();
    expect(existsSync(lock)).toBe(false);
  });
});

describe("stale locks do not block ingestion forever", () => {
  it("a lock older than the stale limit (a crashed run) is taken over", () => {
    acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    const later = acquireRunLock(lock, { now: () => T0 + LOCK_STALE_AFTER_MS + 1, pid: 222, pidAlive: alive });
    expect(later).not.toBeNull();
    expect(JSON.parse(readFileSync(lock, "utf-8")).pid).toBe(222);
  });

  it("a lock just inside the limit, with its process alive, still blocks (a slow live run is not stolen from)", () => {
    acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    expect(acquireRunLock(lock, { now: () => T0 + LOCK_STALE_AFTER_MS - 1, pid: 222, pidAlive: alive })).toBeNull();
  });

  it("a recent lock whose process is gone (killed, laptop power-off) is taken over at once", () => {
    acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive });
    expect(acquireRunLock(lock, { now: () => T0 + 1000, pid: 222, pidAlive: dead })).not.toBeNull();
  });

  it("the stale limit is longer than the Task Scheduler execution limit (PT1H)", () => {
    expect(LOCK_STALE_AFTER_MS).toBeGreaterThan(60 * 60 * 1000);
  });

  it("an unreadable lock file is conservative: held while fresh, taken over once old", () => {
    acquireRunLock(lock, { now: () => T0, pid: 111, pidAlive: alive })?.release();
    writeFileSync(lock, "not json");
    const mtime = Date.now();
    expect(acquireRunLock(lock, { now: () => mtime + 1000, pid: 222, pidAlive: alive })).toBeNull();
    const old = (Date.now() - LOCK_STALE_AFTER_MS - 60_000) / 1000;
    utimesSync(lock, old, old);
    expect(acquireRunLock(lock, { now: () => Date.now(), pid: 222, pidAlive: alive })).not.toBeNull();
  });
});

describe("defaults", () => {
  it("the default path is in the OS temp directory (never inside the repository)", () => {
    expect(defaultLockPath().startsWith(tmpdir())).toBe(true);
    expect(path.basename(defaultLockPath())).toBe("peic-pbs-cpi-ingestion.lock");
  });
  it("with the real pid-alive check, our own pid counts as alive and a vanished one does not", () => {
    const a = acquireRunLock(lock, { now: () => T0 });
    expect(a).not.toBeNull();
    // our own process is alive, so a fresh second attempt is blocked
    expect(acquireRunLock(lock, { now: () => T0 + 1000, pid: 99999999 })).toBeNull();
    a?.release();
  });
});
