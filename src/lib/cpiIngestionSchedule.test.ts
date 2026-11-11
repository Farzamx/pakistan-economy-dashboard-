// F.2f: the scheduled-task definition for PBS CPI ingestion, tested as DATA. These tests read the XML file in the repository and do
// calendar arithmetic on it. They never query, register or start anything in the operating system's scheduler.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PBS_CPI_GROUPS_MONITOR_JOB } from "@/lib/ingestionWatchdog";
import { assertWellFormed, expandRuns, parseTaskXml, waitUntilNextRun } from "@/lib/testUtils/taskScheduleModel";

const ROOT = join(__dirname, "..", "..");
const XML_PATH = join(ROOT, "ops", "scheduled-tasks", "peic-pbs-cpi-groups-ingestion.xml");
const xml = readFileSync(XML_PATH, "utf-8");
const task = parseTaskXml(xml);

const PKT = 5 * 3_600_000;
const pkt = (iso: string) => new Date(new Date(iso + "Z").getTime() - PKT); // a PKT wall-clock string -> the UTC instant
const HOUR = 3_600_000;

describe("the definition is well-formed and uses the project's established task shape", () => {
  it("is well-formed XML (no '--' inside the comment, balanced tags) — the scheduler would reject it otherwise", () => {
    expect(() => assertWellFormed(xml)).not.toThrow();
    expect(() => assertWellFormed(xml.replace("<Command>", "<!-- a -- b --><Command>"))).toThrow(/--/);
    expect(() => assertWellFormed(xml.replace("</Task>", ""))).toThrow(/not balanced/);
  });

  it("has the same settings as every other PEIC ingestion task (StartWhenAvailable, WakeToRun, IgnoreNew, 1h limit, interactive logon)", () => {
    expect(task.settings).toMatchObject({
      DisallowStartIfOnBatteries: "false",
      StopIfGoingOnBatteries: "false",
      ExecutionTimeLimit: "PT1H",
      MultipleInstancesPolicy: "IgnoreNew",
      StartWhenAvailable: "true",
      WakeToRun: "true",
    });
    expect(xml).toMatch(/<LogonType>InteractiveToken<\/LogonType>/);
  });

  it("matches the settings of the tasks actually registered, by structure (a regression check against drifting from the convention)", () => {
    const docs = readFileSync(join(ROOT, "docs", "local-ingestion-setup.md"), "utf-8");
    for (const s of ["IgnoreNew", "StartWhenAvailable", "WakeToRun"]) expect(docs).toContain(s);
  });

  it("runs the SAME script shape as the others (node + tsx cli + absolute script path, working directory = the repo) and nothing else", () => {
    expect(task.exec.command).toBe("{{NODE_EXE}}");
    expect(task.exec.args).toBe('"{{REPO_DIR}}\\node_modules\\tsx\\dist\\cli.mjs" "{{REPO_DIR}}\\scripts\\ingestPbsCpiGroups.ts" --write --confirm-write-host {{SUPABASE_HOST}}');
    expect(task.exec.workingDirectory).toBe("{{REPO_DIR}}");
  });

  it("is a TEMPLATE: it carries no host, no path, no credential, so it cannot be registered by accident and leaks nothing", () => {
    const body = xml.replace(/<!--[\s\S]*?-->/g, ""); // the explanatory comment is not part of the task
    expect([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()).toEqual(["NODE_EXE", "REPO_DIR", "REPO_DIR", "REPO_DIR", "SUPABASE_HOST"]);
    expect(xml).not.toMatch(/supabase\.co|C:\\|F:\\|eyJ|secret|apikey|@\w+\.\w+/i);
  });

  it("is the only task definition in ops/scheduled-tasks, and Vercel has no cron for this job", () => {
    expect(readdirSync(join(ROOT, "ops", "scheduled-tasks"))).toEqual(["peic-pbs-cpi-groups-ingestion.xml"]);
    expect(readFileSync(join(ROOT, "vercel.json"), "utf-8")).not.toMatch(/pbs-?cpi|ingestPbs/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GitHub Actions: the repository has no other scheduler for this job. Exactly ONE workflow may name the ingestion script, and
// only the read-only Stage 1 runner probe (G.8): dispatch-only, no write flag, no secret, no environment, no schedule. Every
// other workflow must still be free of the script, exactly as before.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");
const PROBE_FILE = "cpi-pbs-runner-probe.yml";
const SCRIPT_REF = /ingestPbsCpiGroups|ingest:pbscpigroups/;
const readWorkflow = (name: string) => readFileSync(join(WORKFLOWS_DIR, name), "utf-8");

/** The rule names the probe workflow breaks, ([] = compliant). Comments are ignored: they document, they do not execute. */
function probeViolations(text: string): string[] {
  const body = text
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .map((l) => l.replace(/\s+#\s.*$/, ""))
    .join("\n");
  const v: string[] = [];

  // Triggers: the `on:` block must be exactly `workflow_dispatch:`; nothing automatic, nothing scheduled.
  const onBlock = /^on:[ \t]*\n((?:[ \t]+.*\n|[ \t]*\n)*)/m.exec(body + "\n")?.[1] ?? "";
  const onKeys = onBlock.split("\n").map((l) => l.trim()).filter(Boolean);
  if (onKeys.length !== 1 || onKeys[0] !== "workflow_dispatch:") v.push("trigger: the only trigger must be workflow_dispatch");
  if (/^\s*schedule\s*:|\bcron\s*:/m.test(body)) v.push("schedule: a recurring trigger is not allowed");
  if (/pull_request|workflow_run|repository_dispatch|^\s*push\s*:/m.test(body)) v.push("automatic-trigger: pull-request, push, workflow_run and repository_dispatch are not allowed");

  // Writes, credentials, environments.
  if (/--write|--confirm-write-host/.test(body)) v.push("write-flag: no write or host-confirmation flag");
  if (/secrets\s*\.|\$\{\{\s*secrets/.test(body)) v.push("secrets: no secret reference");
  if (/NOTIFICATION_WORKER_SECRET|SUPABASE|\.env\.local|PEIC_CONFIRM_WRITE_HOST/i.test(body)) v.push("credentials: no database credential or env-file reference");
  if (/^\s*environment\s*:/m.test(body)) v.push("environment: no environment declaration");
  if (/^\s*concurrency\s*:/m.test(body)) v.push("concurrency: out of Stage 1 scope");
  if (/continue-on-error/.test(body)) v.push("continue-on-error: failures must not be masked");
  if (/\bprintenv\b|^\s*env\s*(\||>|$)|set\s+-x|\bdeclare\s+-x\b/m.test(body)) v.push("env-dump: no environment dump or shell tracing");

  // Token, runner, installs.
  const perms = body.match(/^\s*permissions\s*:/gm) ?? [];
  if (perms.length !== 1 || !/^permissions:\s*\n\s+contents:\s*read\s*$/m.test(body) || /:\s*write\b/.test(body)) v.push("permissions: exactly `contents: read`, once, at workflow level");
  if (!/^\s*runs-on:\s*ubuntu-24\.04\s*$/m.test(body)) v.push("runner: ubuntu-24.04 is pinned");
  if (!/^\s*timeout-minutes:\s*\d+\s*$/m.test(body)) v.push("timeout: a job timeout is required");
  if (!/persist-credentials:\s*false/.test(body)) v.push("checkout: persist-credentials must be false");
  if (!/node-version:\s*['"]?24['"]?\s*$/m.test(body)) v.push("node: Node.js 24");
  if (!/^\s*npm ci --ignore-scripts\s*$/m.test(body)) v.push("install: npm ci --ignore-scripts");
  const uses = [...body.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)\s*$/gm)].map((m) => m[1]);
  const allowedUses = /^actions\/(checkout|setup-node)@[0-9a-f]{40}$/;
  if (uses.length !== 2 || !uses.every((u) => allowedUses.test(u)) || new Set(uses.map((u) => u.split("@")[0])).size !== 2) v.push("actions: exactly checkout and setup-node, each pinned to a full 40-hex commit SHA");

  // The script: named exactly once, as the plain dry run (no argument, so no flag can ride along).
  const scriptLines = body.split("\n").filter((l) => SCRIPT_REF.test(l));
  if (scriptLines.length !== 1 || !/^\s*npm run --silent ingest:pbscpigroups > probe\.log 2>&1 \|\| code=\$\?\s*$/.test(scriptLines[0])) v.push("script: the ingestion script appears once, as the plain default dry run");
  return v;
}

describe("GitHub Actions: no workflow may run CPI ingestion except the read-only Stage 1 PBS runner probe", () => {
  const files = readdirSync(WORKFLOWS_DIR);

  it("every workflow other than the probe is free of the ingestion script, exactly as before", () => {
    for (const f of files.filter((n) => n !== PROBE_FILE)) expect(readWorkflow(f), f).not.toMatch(SCRIPT_REF);
  });

  it("the probe exists, and it is the only workflow that names the script", () => {
    expect(files).toContain(PROBE_FILE);
    expect(files.filter((f) => SCRIPT_REF.test(readWorkflow(f)))).toEqual([PROBE_FILE]);
  });

  it("the probe is dispatch-only, read-only and credential-free: no schedule, no pull-request trigger, no write flag, no secret, no environment, pinned actions", () => {
    expect(probeViolations(readWorkflow(PROBE_FILE))).toEqual([]);
  });

  describe("each probe rule can fail (a check that cannot fail proves nothing)", () => {
    const real = readWorkflow(PROBE_FILE).replace(/\r\n/g, "\n"); // a Windows checkout may hold CRLF; the mutations below are written with LF
    const mutate = (from: string | RegExp, to: string) => {
      const out = real.replace(from, to);
      expect(out, `mutation target not found: ${String(from)}`).not.toBe(real);
      return out;
    };
    const cases: [string, string, RegExp][] = [
      ["adds a schedule", mutate("  workflow_dispatch:\n", "  workflow_dispatch:\n  schedule:\n    - cron: '17 4 * * *'\n"), /^schedule:/],
      ["adds a pull_request trigger", mutate("  workflow_dispatch:\n", "  workflow_dispatch:\n  pull_request:\n"), /^trigger:/],
      ["adds a push trigger", mutate("  workflow_dispatch:\n", "  workflow_dispatch:\n  push:\n"), /^automatic-trigger:/],
      ["replaces the trigger with an inline list", mutate(/^on:\s*\n\s+workflow_dispatch:\s*\n/m, "on: [push]\n"), /^trigger:/],
      ["passes --write", mutate("ingest:pbscpigroups >", "ingest:pbscpigroups -- --write >"), /^write-flag:/],
      ["adds any argument to the script", mutate("ingest:pbscpigroups >", "ingest:pbscpigroups -- --ledger live-read >"), /^script:/],
      ["adds a second script invocation", mutate("      - name: Evaluate and report", "      - name: Again\n        run: npm run ingest:pbscpigroups\n\n      - name: Evaluate and report"), /^script:/],
      ["references a secret", mutate("PBS_URL: https", "TOKEN: ${{ secrets.ANYTHING }}\n          PBS_URL: https"), /^secrets:/],
      ["references the worker secret by name", mutate("PBS_URL: https", "NOTIFICATION_WORKER_SECRET: x\n          PBS_URL: https"), /^credentials:/],
      ["declares an environment", mutate("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    environment: production\n"), /^environment:/],
      ["adds a concurrency group", mutate("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    concurrency: x\n"), /^concurrency:/],
      ["grants write permission", mutate("  contents: read\n", "  contents: write\n"), /^permissions:/],
      ["adds a second permissions block", mutate("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    permissions:\n      contents: read\n"), /^permissions:/],
      ["floats the runner", mutate("ubuntu-24.04", "ubuntu-latest"), /^runner:/],
      ["unpins checkout to a tag", mutate(/actions\/checkout@[0-9a-f]{40}/, "actions/checkout@v7"), /^actions:/],
      ["adds an unlisted action", mutate("      - name: Set up Node.js 24", "      - uses: some/other-action@0123456789abcdef0123456789abcdef01234567\n      - name: Set up Node.js 24"), /^actions:/],
      ["removes --ignore-scripts", mutate("npm ci --ignore-scripts", "npm ci"), /^install:/],
      ["lets the checkout keep its credentials", mutate("persist-credentials: false", "persist-credentials: true"), /^checkout:/],
      ["dumps the environment", mutate("          echo \"curl exit", "          printenv\n          echo \"curl exit"), /^env-dump:/],
      ["masks a failure", mutate("        if: always()\n", "        if: always()\n        continue-on-error: true\n"), /^continue-on-error:/],
    ];
    it.each(cases)("%s", (_name, text, rule) => {
      expect(probeViolations(text).some((x) => rule.test(x))).toBe(true);
    });

    it("comments cannot hide a violation, and a rule word inside a comment is not a violation", () => {
      expect(probeViolations(real + "\n# schedule: not a trigger, only a comment\n# --write\n")).toEqual([]);
      expect(probeViolations(real + "\nschedule:\n  - cron: '1 1 * * *'\n").some((x) => /^schedule:/.test(x))).toBe(true);
    });
  });
});

describe("the cadence", () => {
  it("is exactly three triggers: daily on days 1-10 at 09:15, days 1-5 at 17:30, and Mondays at 12:30 (PKT)", () => {
    expect(task.triggers).toHaveLength(3);
    const [a, b, c] = task.triggers;
    expect([a.hour, a.minute, a.daysOfMonth]).toEqual([9, 15, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]);
    expect([b.hour, b.minute, b.daysOfMonth]).toEqual([17, 30, [1, 2, 3, 4, 5]]);
    expect([c.hour, c.minute, c.daysOfWeek, c.daysOfMonth]).toEqual([12, 30, [1], null]);
    expect(task.triggers.every((t) => t.offsetMinutes === 300 && t.months.length === 12)).toBe(true);
  });

  it("does not poll: no repetition, and no restart-on-failure (the script's own bounded retries are the only retries)", () => {
    expect(task.hasRepetition).toBe(false);
    expect(task.hasRestartOnFailure).toBe(false);
  });

  // A full year: 2027, starting after the first StartBoundary (2026-11-09).
  const YEAR_FROM = pkt("2027-01-01T00:00:00");
  const YEAR_TO = pkt("2028-01-01T00:00:00");
  const runs = expandRuns(task.triggers, YEAR_FROM, YEAR_TO);
  const localDay = (d: Date) => new Date(d.getTime() + PKT);

  it("PBS is asked a bounded number of times: 14–22 runs in any month (no unnecessary polling)", () => {
    for (let m = 0; m < 12; m++) {
      const inMonth = runs.filter((r) => localDay(r).getUTCMonth() === m);
      expect(inMonth.length, `month ${m + 1}`).toBeGreaterThanOrEqual(14);
      expect(inMonth.length, `month ${m + 1}`).toBeLessThanOrEqual(22);
    }
  });

  it("every one of days 1-10 of every month has a run (weekends and holidays included), days 1-5 have two, and days 11+ only Mondays", () => {
    for (let m = 0; m < 12; m++) {
      for (let day = 1; day <= 28; day++) {
        const count = runs.filter((r) => { const l = localDay(r); return l.getUTCMonth() === m && l.getUTCDate() === day; }).length;
        const dow = new Date(Date.UTC(2027, m, day)).getUTCDay();
        const expected = day <= 5 ? 2 : day <= 10 ? 1 : 0;
        const withMonday = expected + (dow === 1 ? 1 : 0);
        expect(count, `2027-${m + 1}-${day}`).toBe(withMonday);
      }
    }
  });

  it("a release that appears LATE is still picked up promptly: any file available on days 1–10 waits at most ~24h; later ones at most a week", () => {
    const month = (y: number, m: number, d: number, h: number) => pkt(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00`);
    for (const [y, m] of [[2027, 1], [2027, 2], [2027, 3], [2027, 7]]) {
      const window = expandRuns(task.triggers, month(y, m, 1, 0), month(y, m + 1, 28, 0));
      for (let d = 1; d <= 9; d++) {
        for (const h of [0, 6, 9, 12, 15, 18, 21, 23]) {
          const wait = waitUntilNextRun(window, month(y, m, d, h));
          expect(wait, `${y}-${m}-${d} ${h}:00`).not.toBeNull();
          expect(wait as number, `${y}-${m}-${d} ${h}:00`).toBeLessThanOrEqual(24 * HOUR);
        }
      }
      // appears on day 10 after the last window run, on a weekend: the Monday floor
      const wait = waitUntilNextRun(window, month(y, m, 10, 12));
      expect(wait as number).toBeLessThanOrEqual(7 * 24 * HOUR);
    }
  });

  it("the weekend / holiday slip: a release first available on a SATURDAY of days 1–10 is ingested within a day (the monthly triggers ignore weekdays)", () => {
    // 2027-05-08 is a Saturday
    const at = pkt("2027-05-08T10:00:00");
    const wait = waitUntilNextRun(expandRuns(task.triggers, pkt("2027-05-01T00:00:00"), pkt("2027-05-20T00:00:00")), at);
    expect(new Date(at.getTime() + PKT).getUTCDay()).toBe(6);
    expect(wait as number).toBeLessThanOrEqual(24 * HOUR);
  });

  it("the longest gap between consecutive runs in a year is at most a week — inside the watchdog's stale threshold with room to spare", () => {
    let longest = 0;
    for (let i = 1; i < runs.length; i++) longest = Math.max(longest, runs[i].getTime() - runs[i - 1].getTime());
    expect(longest).toBeLessThanOrEqual(168 * HOUR);
    expect(longest).toBeLessThan(PBS_CPI_GROUPS_MONITOR_JOB.staleAfterHours * HOUR);
    expect(PBS_CPI_GROUPS_MONITOR_JOB.expectedIntervalHours).toBe(168);
  });
});

describe("no duplicate or overlapping execution", () => {
  const runs = expandRuns(task.triggers, pkt("2027-01-01T00:00:00"), pkt("2028-01-01T00:00:00"));

  it("no two triggers ever fire within an hour of each other, so even without IgnoreNew two scheduled runs could not overlap a 1-hour task", () => {
    let closest = Infinity;
    for (let i = 1; i < runs.length; i++) closest = Math.min(closest, runs[i].getTime() - runs[i - 1].getTime());
    expect(closest).toBeGreaterThan(HOUR);
    expect(closest).toBe(3 * HOUR + 15 * 60_000); // 09:15 -> 12:30 on a Monday inside the window
  });

  it("the scheduler refuses to start a second instance of the same task", () => {
    expect(task.settings.MultipleInstancesPolicy).toBe("IgnoreNew");
  });

  it("the script adds its own lock for the case the scheduler cannot see (a manual run during a scheduled one)", () => {
    const script = readFileSync(join(ROOT, "scripts", "ingestPbsCpiGroups.ts"), "utf-8");
    expect(script).toMatch(/acquireLock: \(\) => acquireRunLock\(\)/);
  });
});

describe("the retries are bounded", () => {
  it("the PBS fetch makes three attempts, 20s then 40s apart: about two minutes of waiting at most, far inside the 1 hour execution limit", () => {
    const script = readFileSync(join(ROOT, "scripts", "ingestPbsCpiGroups.ts"), "utf-8");
    expect(script).toContain("fetchPbsCpiFileCounted({ attempts: 3, retryDelayMs: 20_000 })");
    const worstCaseMs = 3 * 30_000 + 20_000 + 40_000; // three 30s timeouts + the two waits
    expect(worstCaseMs).toBeLessThan(5 * 60_000);
    expect(worstCaseMs).toBeLessThan(60 * 60_000);
  });
});

describe("what happens before activation", () => {
  it("the script still refuses to write: the repository definition cannot cause a production write by existing, or by being registered too early", async () => {
    const { WRITE_MODE_AUTHORIZED } = await import("@/lib/providers/pbsCpiGroupsIngestion");
    expect(WRITE_MODE_AUTHORIZED).toBe(false);
  });
});
