# PBS CPI ingestion — operations runbook

Phase F.2f. Companion to [pbs-cpi-groups-ingestion.md](pbs-cpi-groups-ingestion.md) (what is ingested and how it is validated),
[ingestion-script-entry-points.md](ingestion-script-entry-points.md) (how scripts start) and
[incident-f2b-r-production-write.md](incident-f2b-r-production-write.md) (why the safeguards below exist).

## 0. Status — four different things, only two of which are true

| | Status | Evidence |
|---|---|---|
| **Code and configuration implemented** | **YES** | write run with lock, bounded retries and one log row per outcome; watchdog entry; freshness-registry entries; read-only status command; all tested |
| **Scheduler configured in the repository** | **YES** | [`ops/scheduled-tasks/peic-pbs-cpi-groups-ingestion.xml`](../ops/scheduled-tasks/peic-pbs-cpi-groups-ingestion.xml) — a *template* with `{{placeholders}}`; it cannot be registered until rendered |
| **Scheduler actually activated** | **NO** | no task named `PEIC - PBS CPI Groups Ingestion` exists in the Task Scheduler (read-only audit, 2026-11-07); `WRITE_MODE_AUTHORIZED` is `false`, so the script refuses `--write` |
| **First successful production ingestion by the scheduled path** | **NO** | the only run on record is the unintended one of 2026-11-06 17:27 UTC (the F.2b-R incident); its 1,352 observations are in the ledger and were verified exact |

A configuration file existing is not a schedule running. Do not read this document as saying the job is scheduled.

## 1. How it is scheduled

PEIC's ledger ingestions are scripts run by **Windows Task Scheduler on the ingestion laptop** (SBP, World Bank, Net Liquid Reserves,
FRED, Yahoo Gold). This is the sixth, in the same shape and with the same settings; it is deliberately **not** a Vercel cron or a
GitHub Action (no second scheduling mechanism; `vercel.json` and `.github/workflows` have nothing for it, and a test pins that).

**Evidence for the cadence.** The project's own calendar shows PBS releasing the monthly CPI on the 1st–3rd (weekend-adjusted): 3 Aug,
1 Sep, 1 Oct, 2 Nov 2026 — and once, in June, on the 10th. The SDMX file the ledger is built from follows by about a day (October data:
released 2 Nov, file *Prepared* 3 Nov 06:38 UTC). So:

| Trigger (PKT) | Why |
|---|---|
| every day 1–10, **09:15** | catches the release within a day, weekends and holidays included, and the one observed slip to the 10th |
| days 1–5, also **17:30** | a same-day file without waiting for the next morning |
| every **Monday 12:30** | the floor: a release later than the 10th, and any revision, within a week; and a success row at least weekly, which is what the watchdog's threshold is built on |

About 14–22 runs a month, **one request to PBS each** (plus 26 read RPCs); writes happen only when the file changed. Nothing runs
more often than a day apart except the 17:30 pair on days 1–5 (8h15m after the 09:15 run, 15h45m before the next).

Settings (identical to the other tasks): `StartWhenAvailable` (a missed run fires on wake), `WakeToRun`, `MultipleInstancesPolicy=IgnoreNew`,
1-hour execution limit, interactive logon. **No** restart-on-failure and **no** repetition (no polling): the retries are in the script.

## 2. What a run does

`ingestPbsCpiGroups.ts --write --confirm-write-host <host>` → `executeWriteRun()` ([src/lib/providers/pbsCpiGroupsRun.ts](../src/lib/providers/pbsCpiGroupsRun.ts)):

1. barriers (see §8), then take the **single-run lock** (a file in the OS temp directory);
2. fetch PBS's file — **3 attempts, 20 s then 40 s apart, 30 s timeout each** (≈ 2.5 minutes worst case);
3. validate it with the existing adapter (all 26 series, one base period, the Laspeyres identity…) — an invalid file never reaches the ledger;
4. hand it to the **existing orchestrator** over the **existing adapter** — unchanged — which writes only genuinely new or revised observations;
5. write **exactly one** `cron_run_log` row, whatever happened; release the lock.

| outcome | status | exit | meaning |
|---|---|---|---|
| `unchanged` | success | 0 | all 26 series already match PBS; nothing written (**healthy**) |
| `updated` | success | 0 | observations written; all 26 reconciled |
| `partial` | **failure** | 1 | some series failed — the ledger may hold a **partly ingested** month until a later run completes it |
| `pbs-unavailable` | failure | 1 | PBS unreachable after 3 attempts; nothing written |
| `rejected` | failure | 1 | PBS answered but the file failed validation; nothing written |
| `error` | failure | 1 | unexpected exception; what was written is unknown |
| `busy` | skipped | 0 | another run held the lock; this one did nothing |

The row's `detail` is one machine-readable line: `cpi-ingest/1 | outcome=updated | series=26 | updated=26 | … | latest=2026-10 | attempts=1 | prepared=…`
(unknown fields are *omitted*, never defaulted; URLs and credentials are stripped). `partial` being a *failure* is deliberate: the generic
scripts call a run a success unless every series failed, but a 26-series panel that the Inflation page rejects whole must never look healthy
when 25 of 26 were written.

## 3. Retries, failures and overlap

* **Retries are bounded and live in the script** (3 PBS attempts per run). The scheduler adds no retry; the next trigger is at most a day away
  in the release window and a week outside it. Every failed run is logged, so it is visible; nothing is retried silently.
* **Idempotent:** re-running after any failure is always safe. A second run writes nothing it has already written.
* **No overlap:** the scheduler refuses to start the task twice (`IgnoreNew`); the **lock file** also stops a *manual* run from overlapping a
  scheduled one. The lock is stale after 90 minutes (longer than the 1-hour limit) or when the process that wrote it is gone, so a crash
  or power-off never blocks ingestion forever. A run that finds the lock held logs `skipped` and exits 0.
* **Closest two triggers are 3h15m apart**, so even without `IgnoreNew` two scheduled runs could not overlap a 1-hour task (tested on the XML).

## 4. How the watchdog detects problems (and what it cannot)

The existing daily watchdog (`/api/cron/sbp-ingestion-watchdog`, Vercel cron 09:00 UTC) now includes `PBS_CPI_GROUPS_MONITOR_JOB`
(`pbs-cpi-groups-ingestion`). Its rule is the one every job has: **no `status=success` row within `staleAfterHours` → stale → one alert per
episode, a reminder every 72 h.** For this job `expectedIntervalHours/staleAfterHours = 168/216`, reused **verbatim** from World Bank (same
Monday floor, same laptop, same mechanics). A run that found nothing new is a success, so it is **never** a false alarm on a quiet month.

It uses `cron_run_log` as the evidence that a run happened and **never** `fetched_at` (which changes only when data changes). A new, optional
`diagnose` hook adds the *reason* to the alert and a `diag=` token to the watchdog's own log row; it cannot change the state or whether an alert
goes out, and a failure inside it is swallowed. The other five jobs are untouched (a test checks that their alerts carry no diagnosis block and their log rows no `diag=` token).

| Situation | What you will see |
|---|---|
| Recent success (updated or unchanged) | healthy, no alert; `diag=healthy` |
| Ingestion has not run when expected | after 216 h: stale alert, body says **NOT RUNNING** (unregistered / disabled / laptop off); `diag=overdue` |
| Never ran / never registered | `never-run` alert, body says so; `diag=no-runs` |
| Latest run failed | `diag=failing:<cause>`; alert once 216 h pass without a success, naming the cause |
| PBS unavailable | cause `pbs-unavailable`, attempts shown |
| File rejected | cause `validation-rejected`, with the failing check id |
| Release only partly ingested (25 of 26) | cause `partial-ingestion`, the failed series named |
| Repeatedly failing | 3+ consecutive failed runs → `REPEATEDLY FAILING` |
| Recovery | success after failures → healthy; "Recovered: it followed N failed run(s)" |

**Limitations, stated plainly.**
1. The watchdog alerts on *time since the last success*. A short outage (failures, but a success within 216 h) is recorded in the watchdog's own
   log row (`diag=`) and in `cron_run_log`, and is visible with `npm run check:cpistatus`, but does **not** email. Alerting earlier on repeated failure would change the watchdog's staleness model — a broader change, deliberately not made.
2. The watchdog **never calls a provider**, so it cannot know that PBS has published something the ledger lacks. That is `npm run check:cpistatus` (§6).
3. It cannot tell "the task was never registered" from "the laptop was off" except by the absence of rows.

## 5. The six freshness dimensions — which timestamp means what

| # | Dimension | Source of truth | Not to be confused with |
|---|---|---|---|
| 1 | **Latest observation period** | `max(observation_period)` of the 26 keys (`get_canonical_freshness_summary`) | when anything ran |
| 2 | **Last ingestion run** | newest completed `cron_run_log` row for `pbs-cpi-groups-ingestion` | whether data changed |
| 3 | **Last data change** | newest canonical `vintage` among the 26 keys | `fetched_at`, which is not a run marker |
| 4 | **Last source fetch** | newest run that reached PBS (any outcome except `pbs-unavailable`/`busy`/`error`) | the last *successful* run |
| 5 | Last page generation | page-side (Phase F.2e) | — not evaluated here |
| 6 | Current page source / fallback | page-side (Phase F.2e) | — not evaluated here |

A missing value is shown as missing ("— (no evidence)"), never defaulted. **Freshness registry:** the 26 keys are registered as `monthly`, `graceDays` 40
(the same constant as every other monthly series), `expectsSourceUpdatedAt` true (the adapter really fills it), `expectsReleaseDate` false (the file has none).
Nothing reads those entries yet; the existing engine, unchanged, gives them a sensible verdict (tested).

## 6. Is the ledger behind PBS? — verify without writing anything

```
npm run check:cpistatus            # reads: cron_run_log, the ledger's per-key latest period/vintage, and one GET of PBS's public file
npm run check:cpistatus -- --no-pbs
```
Read-only by construction (a wrapper allows two public read RPCs and nothing else; exit 0 = ok/notice, 1 = warning/critical). It prints the verdict, the six
dimensions, the run evidence, and the ledger-vs-PBS statement. States: **current** · **awaiting release** (ledger a month old, PBS has not published — normal, a *notice*) ·
**behind PBS** (PBS holds a newer month: *warning*, *critical* once PBS has held it > 48 h) · **partial release** (25/26 series at the new month: *critical*) ·
**pbs-unreachable / unverified** (cannot tell — reported as unknown, never as current) · **no data**.

A **successful run does not prove the ledger is current**: if PBS publishes after the last run, the run was a success and the ledger is behind. The command says so explicitly.
Once the Inflation page is ledger-backed (F.2e) its per-generation log line (`reason=fallback-ledger-behind-source`) is a continuous production signal of the same thing.

## 7. Recovery after an outage

* **Laptop off / task missed:** nothing to do — `StartWhenAvailable` fires it on wake; otherwise the next trigger runs. Idempotent.
* **PBS unavailable:** wait; runs retry on their own. When it returns, the next run ingests whatever was published meanwhile.
* **File rejected:** the ledger was not touched and the page keeps its last good data. Run `npm run ingest:pbscpigroups` (dry run) to see the failing check ids. A new
  base period or basket is *not* handled automatically (see "Source revisions" in pbs-cpi-groups-ingestion.md).
* **Partly ingested month:** run `npm run check:cpistatus` to see which series lag, then let the next run complete it (or start the task). The Inflation page rejects a partial ledger whole.
* **Stale lock:** `%TEMP%\peic-pbs-cpi-ingestion.lock`; it clears itself after 90 min or when its process is gone. Deleting it by hand is safe only if no run is in progress.

## 8. Safety barriers (unchanged by F.2f; extended, not weakened)

A real write needs **all** of: `WRITE_MODE_AUTHORIZED = true` in the build · no test harness active (`PEIC_TEST_ISOLATION`/`VITEST*`/`NODE_ENV=test`) · the target host
confirmed for *this run* (`--confirm-write-host`, because a scheduled task cannot set environment variables, or `PEIC_CONFIRM_WRITE_HOST`) · `--write` given · the live PBS file
(`--file` is refused for writes). The tests start the real script only as a subprocess with an explicit allow-list environment, **dead credentials** and a loopback
database URL, against a loopback spy; a mutation of the write flag cannot reach a database (tests A–E, H in `ingestPbsCpiGroups.isolation.test.ts`). Importing any ingestion script is inert.

## 9. Verify the scheduler without any production write

| Check | Command | Writes? |
|---|---|---|
| The definition: triggers, coverage, gaps, overlap, delayed-release handling | `npx vitest run src/lib/cpiIngestionSchedule.test.ts` | none |
| Is it registered? | `Get-ScheduledTask -TaskName "PEIC - PBS CPI Groups Ingestion"` — **expected today: "not found"** | none |
| Did it run, and how did it end (after activation)? | `Get-ScheduledTaskInfo -TaskName "PEIC - PBS CPI Groups Ingestion"` (LastRunTime / LastTaskResult), then `npm run check:cpistatus` | none |
| What would a run do? | `npm run ingest:pbscpigroups -- --ledger live-read` (dry run against the real ledger's current rows) | none |
| Ledger vs PBS, 3,211 values | `npx tsx scripts/reconcileInflationLedger.ts` | none |

**`Start-ScheduledTask` and `--write` are real ingestions** — never part of verification.

## 10. Activation checklist (not done; each step is a decision)

0. **Authorise the first intended production ingestion.** It is expected to be `outcome=unchanged` (the ledger already holds October) and to write one `cron_run_log` row.
1. **Flip `WRITE_MODE_AUTHORIZED` to `true`** in `src/lib/providers/pbsCpiGroupsIngestion.ts`, in a reviewed commit. Three tests pin the current state and **must be updated in the same commit — that is intended**: `ingestPbsCpiGroups.test.ts` ("writing is not authorized"), `cpiIngestionSchedule.test.ts` ("still refuses to write"), and `ingestPbsCpiGroups.isolation.test.ts` (its mutation *flips* `false` to `true`; once the build says `true`, that mutation must become the reverse, so the proof "mutating the flag cannot reach a database" stays meaningful).
2. **Render and register the task** (PowerShell, as the ingestion user — the commands are here; nothing has been run):
   ```powershell
   $repo   = "C:\ECONOMY DASHBOARD\pakistan-economy-dashboard"
   $dbUrl  = ((Select-String -Path "$repo\.env.local" -Pattern '^NEXT_PUBLIC_SUPABASE_URL=(.+)$').Matches[0].Groups[1].Value).Trim('"')
   $dbHost = ([System.Uri]$dbUrl).Host
   $xml = (Get-Content -Raw -Encoding UTF8 "$repo\ops\scheduled-tasks\peic-pbs-cpi-groups-ingestion.xml") `
     -replace '\{\{REPO_DIR\}\}', $repo -replace '\{\{NODE_EXE\}\}', (Get-Command node).Source -replace '\{\{SUPABASE_HOST\}\}', $dbHost
   Register-ScheduledTask -TaskName "PEIC - PBS CPI Groups Ingestion" -Xml $xml
   ```
   then confirm it with the read-only checks in §9 (principal = you, action = node + tsx + the script, 3 triggers).
3. **Do this BEFORE the deployment that carries the watchdog entry** — or before **2026-11-15 17:29 UTC**: the watchdog reports a job stale 216 h after its last success, and the only success on record is
   the unintended run of 2026-11-06. The triggers that fall inside that window are 9 Nov 09:15, 12:30 (and 17:30 does not apply: day 9) and 10 Nov 09:15 PKT; the next is Monday 16 Nov, too late. So register the task, with step 1 done, **before 09:15 PKT on 10 Nov** for a run to land in time; otherwise expect one (accurate) stale alert on 2026-11-15, and nothing after the first run.
4. **First run:** let the schedule do it, or `Start-ScheduledTask` once (that *is* the first intended ingestion). Then `npm run check:cpistatus` → `ok`, and one new `cron_run_log` row with `outcome=unchanged`.
5. Next day: the deployed watchdog row for this job should read `state=healthy … diag=healthy`.
6. Only then consider switching the Inflation page to the ledger (Phase F.2e).

## 11. Open items and risks

* Everything in §10 is outstanding.
* The ingestion host must be on (laptop). `WakeToRun` + `StartWhenAvailable` mitigate; the watchdog detects it after 216 h.
* A push to `origin/main` may trigger an automatic Vercel deployment (the project is linked; whether Git auto-deploy is enabled could not be verified from here). If it does, step 3's timing applies from that moment.
* PBS rebasing the CPI basket is rejected by the adapter (by design) → the ledger stops updating → `check:cpistatus` shows *behind PBS* or *rejected* runs → a human decision is needed.
* The four `scripts/verify_*.mjs` tools and `generateEconomicCalendarSeed.ts` still run at import (no test imports them; a policy test enforces that). They are unrelated to CPI ingestion and were not changed.
