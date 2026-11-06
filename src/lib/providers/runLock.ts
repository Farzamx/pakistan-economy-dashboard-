// A single-run lock for the PBS CPI ingestion, so two runs can never ingest at the same time.
//
// WHY. The Windows Task Scheduler task uses MultipleInstancesPolicy=IgnoreNew, which stops the SCHEDULER from starting a
// second copy of its own task. It does nothing about a person running `npm run ingest:pbscpigroups -- --write` by hand
// while a scheduled run is in progress (or two triggers firing close together after a wake-from-sleep catch-up). Two
// simultaneous runs would race on the same (key, period) rows: the ledger's partial unique index keeps it from
// double-writing, but one run could fail mid-way and log a spurious partial. A lock removes the whole class.
//
// HOW. The lock is a file created with the exclusive flag ("wx"): the operating system guarantees exactly one creator.
// It holds {pid, startedAt}. It is considered STALE (and removed, once) when it is older than STALE_AFTER_MS — longer than
// the task's 1-hour execution limit — or when the process that wrote it no longer exists. A lock file that cannot be read
// is treated conservatively: stale only if it is also old. Release removes the file only if it is still OURS.
//
// SCOPE. One ingestion host (the laptop) runs these scripts, so a local file is the right granularity; it is deliberately
// not a database lock (that would be a write). Pure of any database or network access.

import { closeSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Longer than the Task Scheduler ExecutionTimeLimit (PT1H), so a live run is never mistaken for a stale one. */
export const LOCK_STALE_AFTER_MS = 90 * 60 * 1000;

export interface LockInfo {
  pid: number;
  startedAt: string;
}

export interface RunLock {
  path: string;
  /** Removes the lock if it is still ours. Safe to call more than once. */
  release(): void;
}

export interface LockDeps {
  now?: () => number;
  pid?: number;
  staleAfterMs?: number;
  /** Is a process with this pid alive? Defaults to signal 0, which checks existence without sending anything. */
  pidAlive?: (pid: number) => boolean;
}

export function defaultLockPath(name = "peic-pbs-cpi-ingestion.lock"): string {
  return path.join(os.tmpdir(), name);
}

function defaultPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM"; // exists but not ours to signal
  }
}

function readInfo(lockPath: string): LockInfo | null {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf-8")) as Partial<LockInfo>;
    return typeof parsed.pid === "number" && typeof parsed.startedAt === "string" ? { pid: parsed.pid, startedAt: parsed.startedAt } : null;
  } catch {
    return null;
  }
}

function isStale(lockPath: string, deps: Required<LockDeps>): boolean {
  const info = readInfo(lockPath);
  let ageMs: number;
  if (info && Number.isFinite(Date.parse(info.startedAt))) ageMs = deps.now() - Date.parse(info.startedAt);
  else {
    try {
      ageMs = deps.now() - statSync(lockPath).mtimeMs;
    } catch {
      return true; // vanished between our checks: nothing holds it
    }
  }
  if (ageMs > deps.staleAfterMs) return true;
  return info !== null && !deps.pidAlive(info.pid);
}

/** Returns the lock, or null if another live run holds it. Never throws for contention. */
export function acquireRunLock(lockPath: string = defaultLockPath(), overrides: LockDeps = {}): RunLock | null {
  const deps: Required<LockDeps> = {
    now: overrides.now ?? Date.now,
    pid: overrides.pid ?? process.pid,
    staleAfterMs: overrides.staleAfterMs ?? LOCK_STALE_AFTER_MS,
    pidAlive: overrides.pidAlive ?? defaultPidAlive,
  };
  mkdirSync(path.dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath, "wx");
      const info: LockInfo = { pid: deps.pid, startedAt: new Date(deps.now()).toISOString() };
      writeSync(fd, JSON.stringify(info));
      closeSync(fd);
      let released = false;
      return {
        path: lockPath,
        release() {
          if (released) return;
          released = true;
          const current = readInfo(lockPath);
          if (current && current.pid !== deps.pid) return; // somebody else's lock now: leave it alone
          try {
            unlinkSync(lockPath);
          } catch {
            /* already gone */
          }
        },
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      if (attempt === 0 && isStale(lockPath, deps)) {
        try {
          unlinkSync(lockPath);
        } catch {
          /* someone else removed it first; the retry below decides */
        }
        continue;
      }
      return null;
    }
  }
  return null;
}
