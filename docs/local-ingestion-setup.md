# Local SBP Ingestion Runner — Windows Task Scheduler Setup

## Why this exists

`easydata.sbp.org.pk` is fronted by Cloudflare bot-management, which
challenges every request from Vercel, GitHub Actions, and Supabase Edge
Functions (confirmed by direct testing — see the `network-diag-probe` job
in `cron_run_log`, viewable at `/admin/system-health`). This machine has
always reached SBP EasyData successfully, so it's today's ingestion
execution environment.

This is explicitly **temporary**. `scripts/ingestSbp.ts` is a plain Node
script with no Windows-specific logic anywhere in it — moving it to a VPS,
Linux box, Docker container, GitHub Actions runner, or any cron daemon later
means changing *where* `npm run ingest:sbp` is triggered from, never what it
does. Task Scheduler here is purely the trigger.

**Status on this machine:** configured and enabled — task `PEIC SBP
Ingestion`, daily at 8:00 AM local (Pakistan Standard Time, UTC+5 = 03:00
UTC), running as the interactive `farza` account. Everything below reflects
what's actually running, not just a suggestion; the rest of this doc is kept
instructional so the same steps reproduce cleanly on a replacement machine.

## One-time setup

1. Confirm `.env.local` has these already (it should — they're the same
   values the app already uses):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SBP_EASYDATA_API_KEY`, `NOTIFICATION_WORKER_SECRET`.
2. Run the migration once, in the Supabase SQL editor:
   `supabase/migrations/0050_raw_canonical_observations.sql`.
3. Run a manual first backfill from a terminal in the project root, and
   confirm it completes cleanly:
   ```
   npm run ingest:sbp
   ```
   The first run fetches each indicator's full history (2016–present) and
   writes every period — expect it to take significantly longer than
   subsequent runs (the very first backfill took ~28 minutes across 21
   series; every run after that is incremental — only the last ~60 days
   are re-fetched per indicator — and typically finishes in ~10-15 seconds
   when nothing has changed).
4. Find the full path to `node.exe` and this project's directory — Task
   Scheduler needs absolute paths, not `npm`/`npx` on their own, since it
   doesn't inherit your shell's PATH the same way a terminal does.
   ```powershell
   (Get-Command node).Source
   ```

## Creating the scheduled task

Open **Task Scheduler** → **Create Task…** (not "Basic Task" — the full
dialog gives you the working-directory field you need).

**General tab**
- Name: `PEIC SBP Ingestion`
- "Run whether user is logged on or not" — leave unchecked unless you want
  it to run even when signed out (requires storing your Windows password
  in the task).
- Check "Run with highest privileges" only if you hit permission errors —
  usually not needed for a script that just makes HTTP requests.

**Triggers tab** → New…
- "Daily", start time of your choosing (e.g. 08:00), recur every 1 day.
- Optionally add a second trigger "At log on" for the "also run at
  startup/login" requirement — add a 2–5 minute delay so networking is up
  before the task fires.

**Actions tab** → New…
- Action: "Start a program"
- Program/script: the full path to `node.exe` from step 4 above, e.g.
  `C:\Program Files\nodejs\node.exe`
- Add arguments:
  ```
  "C:\ECONOMY DASHBOARD\pakistan-economy-dashboard\node_modules\tsx\dist\cli.mjs" "C:\ECONOMY DASHBOARD\pakistan-economy-dashboard\scripts\ingestSbp.ts"
  ```
- Start in: `C:\ECONOMY DASHBOARD\pakistan-economy-dashboard`
  (this matters — the script resolves `.env.local` relative to the current
  working directory)

**Conditions tab**
- Uncheck **both** "Start the task only if the computer is on AC power" and
  "Stop if the computer switches to battery power" if this is a laptop that
  is ever on battery. This is not optional on this machine: verified by
  direct test — a temporary task with the AC-power restriction left at its
  PowerShell-module default queued forever and never actually launched while
  running on battery, with no error and no log line anywhere, just silently
  stuck in "Queued". If left checked, ingestion silently stops running the
  moment the laptop is unplugged.
- Leave "Start only if network connection is available" **unchecked**. It's
  a coarse, imprecise check (false negatives on VPNs, brief detection lag),
  and `scripts/ingestSbp.ts`'s own per-indicator retry/catch already handles
  a genuinely offline run cleanly (fails that indicator, logs it, picked up
  next run) — adding this would be a second, cruder connectivity gate on top
  of a system that already handles the failure mode correctly.

**Settings tab**
- Check "Run task as soon as possible after a scheduled start is missed" —
  this is `StartWhenAvailable` (see the exported XML below) — covers the
  laptop being fully off at the scheduled time; Windows runs the task the
  next time it's on, once.
- Check "Wake the computer to run this task" — free, built into Windows, and
  covers the common case of the laptop being merely asleep (not off, not
  logged out) at 8am with your session still intact.
- Leave "If the task fails, restart every ___" **unchecked/disabled**.
  `scripts/ingestSbp.ts` already retries each indicator internally
  (`MAX_RETRIES`, backoff) and only exits non-zero when every indicator
  failed — a scheduler-level restart on top would be a second, cruder retry
  system layered over one that already works and is already visible in
  `cron_run_log`. Don't add it.
- Under "If the task is already running, then the following rule applies":
  choose **"Do not start a new instance"**. This is the actual overlap
  protection — without it, a slow run (network trouble) plus a missed-run
  catch-up firing close together could run two ingestions concurrently
  against the same Supabase tables.

Save, then right-click the task → **Run** once to confirm it executes
outside of an interactive terminal (output won't be visible, but you can
verify via `/admin/system-health`'s Cron History section afterward, or by
checking `canonical_observations` directly).

## Handling missed runs — what's already covered, and by what

| Scenario | What happens | Mechanism |
|---|---|---|
| Laptop fully off at scheduled time | Runs once, automatically, the next time the laptop is on **and you're logged on** | Task Scheduler's `StartWhenAvailable` (Settings tab above) — no code involved |
| Laptop asleep, you're still logged on | Wakes and runs (`WakeToRun`), or catches up on next wake if the wake itself is missed | Task Scheduler |
| You're logged off (not just locked/asleep) at the scheduled time, for any length of time | Task does not run at all until you log back on, at which point `StartWhenAvailable` fires it once | Task Scheduler's `Logon Mode: Interactive only` — a real limitation of the "logged-on only" mode chosen for this machine, not something Task Scheduler can bridge on its own. The ingestion watchdog (`sbp-ingestion-watchdog`, checked daily at 09:00 UTC) will alert if this causes a genuine multi-day gap. |
| Internet down for part of the run | Each indicator retries twice with backoff before giving up; a genuinely offline run fails cleanly and is retried in full on the next scheduled run — nothing is left half-written (see Idempotency below) | `scripts/ingestSbp.ts`'s `fetchWithRetry` |
| SBP EasyData itself down/erroring (5xx, timeout) | Same retry-then-isolate behavior — that one indicator is marked `failed` for this run, everything else still completes, and it's picked up again next run | `scripts/ingestSbp.ts`'s per-indicator try/catch |
| Ingestion never runs for several days | Nothing breaks — the next successful run's incremental fetch window (last 60 days) still covers the gap, and `/admin/system-health`'s Canonical SBP Freshness section will honestly show each affected indicator as overdue in the meantime, never silently "fresh" | `INCREMENTAL_LOOKBACK_DAYS` + the freshness SLA view |

None of this requires a background service or daemon — it's Task
Scheduler's own built-in missed-run handling plus the script's existing
retry/isolation logic, both already free and already in place.

## Example scheduler configuration (exported)

Task Scheduler can export the task as XML (`Export…` from the task's
right-click menu) for backup/version reference. The action block looks like:

```xml
<Actions Context="Author">
  <Exec>
    <Command>C:\Program Files\nodejs\node.exe</Command>
    <Arguments>"C:\ECONOMY DASHBOARD\pakistan-economy-dashboard\node_modules\tsx\dist\cli.mjs" "C:\ECONOMY DASHBOARD\pakistan-economy-dashboard\scripts\ingestSbp.ts"</Arguments>
    <WorkingDirectory>C:\ECONOMY DASHBOARD\pakistan-economy-dashboard</WorkingDirectory>
  </Exec>
</Actions>
<Settings>
  <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
  <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
  <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
  <StartWhenAvailable>true</StartWhenAvailable>
  <WakeToRun>true</WakeToRun>
  <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
</Settings>
```

(`Command` above shows the generic Program-Files path as an example only —
use whatever `(Get-Command node).Source` prints on your machine; it will not
always be under Program Files.)

`StartWhenAvailable` is the actual missed-run setting from the checkbox
above — if it's `true` here, the "ran while the laptop was off" scenario is
genuinely configured, not just assumed. `MultipleInstancesPolicy: IgnoreNew`
is the overlap protection: confirms Task Scheduler will refuse to start a
second run while one is still in progress, rather than running two
concurrently. There is deliberately no `RestartOnFailure` block — see the
Settings tab note above for why.

## Example output

A normal, mostly-quiet day:

```
[ingest:sbp] Started — run 4f3a1c9e-... — 2026-08-08T03:00:01.204Z
[ingest:sbp] Fetching 22 indicators from SBP EasyData...

  · foreignReserves: no change (latest=2026-07-31)
  · netBankReserves: no change (latest=2026-07-31)
  · usdPkr: no change (latest=2026-08-06)
  ✓ moneySupplyM2: updated — 1 period(s) written, latest=2026-08-07
  · policyRate: no change (latest=2026-07-28)
  ...
  ✓ remittances: updated — 1 period(s) written, latest=2026-07-31)
  ...

[ingest:sbp] Fetched 22 indicators | 20 unchanged | 2 updated | 0 failed | Finished in 11.8s | Updated: moneySupplyM2, remittances
```

(22, not 20 — the 20 homepage KPI indicators, plus Urban Food Inflation
(feeds `/pakistan-food-inflation`) and Money Supply M2 YoY Growth (feeds
`weeklyIntelligenceCompute.ts`'s Health Score input), ingested the same way
even though neither is a `SbpIndicatorKey` union member. Log order can
vary between runs — up to 5 indicators are fetched concurrently.)

A day with a transient failure (retried, then given up on just that one
indicator — the other 19 still completed):

```
    retry 1/2 for tbillYield3m in 3000ms: SBP EasyData API returned 503 for TS_GP_BAM_SIRTBIL_AH.TB0040
    retry 2/2 for tbillYield3m in 6000ms: SBP EasyData API returned 503 for TS_GP_BAM_SIRTBIL_AH.TB0040
  ✗ tbillYield3m: FAILED — SBP EasyData API returned 503 for TS_GP_BAM_SIRTBIL_AH.TB0040

[ingest:sbp] Fetched 20 indicators | 19 unchanged | 0 updated | 1 failed | Finished in 41.2s | Failed: tbillYield3m (SBP EasyData API returned 503 for TS_GP_BAM_SIRTBIL_AH.TB0040)
```

This run still logs `success` overall (19/20 indicators succeeded) — see
`scripts/ingestSbp.ts`'s summary logic. `tbillYield3m` is retried
automatically on the next scheduled run; nothing else is affected.

## Verifying idempotency

Run `npm run ingest:sbp` twice in a row. The second run should report
`0 updated` for every indicator that didn't genuinely change between the
two runs (which, for daily/monthly/as-needed SBP series, is normally all
20) — confirming no duplicate rows are ever written for unchanged data.

## World Bank GDP-growth ingestion (Phase 8.4)

A second, independent scheduled task — `scripts/ingestWorldBank.ts` — keeps
the 3 approved World Bank GDP-growth series current using the exact same
laptop/Task-Scheduler architecture as SBP above, and reuses the same
generic pipeline (Phase 8.1's `ingestionOrchestrator.ts` + Phase 8.2's
`worldBankAdapter.ts`) rather than a second implementation. Only these 3
series are scheduled — **not** population, sector composition, or any
other provider:

- `worldbank:gdpGrowthPak`
- `worldbank:gdpGrowthIndia`
- `worldbank:gdpGrowthBangladesh`

**Task name:** `PEIC - World Bank GDP Ingestion` (separate task, separate
trigger, separate `MultipleInstances` scope from `PEIC SBP Ingestion` — the
two never block or interfere with each other).

**Cadence:** Weekly, every **Monday at 08:15 AM** (Pakistan Standard Time).
Not daily, deliberately: World Bank's GDP-growth indicator is annual data,
typically revised a few times a year (not daily), and the adapter always
re-fetches each series' full ~65-year history rather than an incremental
window (see `worldBankAdapter.ts`'s own header — annual revisions can touch
many historical years at once, so a full re-fetch is the only way to
reliably catch one). A daily run would burn 7x the requests/laptop-wake
cycles for no realistic freshness benefit; weekly is frequent enough to
catch a revision within days of publication while staying proportionate to
how often the underlying data actually changes. Monday 08:15 was chosen
only to land shortly after the SBP task's daily 08:00 slot, not because
World Bank publishes on a fixed weekday (it doesn't).

**Command:** identical pattern to SBP's — explicit `node.exe`, explicit tsx
CLI path, explicit script path, no PATH/npm/npx dependency:
```
"C:\ECONOMY DASHBOARD\pakistan-economy-dashboard\node_modules\tsx\dist\cli.mjs" "C:\ECONOMY DASHBOARD\pakistan-economy-dashboard\scripts\ingestWorldBank.ts"
```
**Working directory:** `C:\ECONOMY DASHBOARD\pakistan-economy-dashboard`
(same reason as SBP — `.env.local` resolves relative to `process.cwd()`).

**Login/power/missed-run behavior:** identical to the SBP task, unchanged
rationale — `Interactive` logon (runs while logged on, including locked),
`MultipleInstances: IgnoreNew` (no overlapping runs), AC/battery
restrictions off, `StartWhenAvailable: true` (catches up once if the
laptop was off at 08:15 Monday), `WakeToRun: true` (wakes a sleeping
laptop), no scheduler-level restart-on-failure (the orchestrator already
retries per-series internally and isolates failures — see
`ingestionOrchestrator.ts`).

**Environment variables:** the exact same three as SBP need —
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NOTIFICATION_WORKER_SECRET` — read from the same `.env.local`. World
Bank's API is keyless, so `SBP_EASYDATA_API_KEY` is not needed for this
task. No new secret was created; nothing in the task's action, arguments,
trigger, or settings contains a credential.

**Manual test command** (run from the project root):
```
npm run ingest:worldbank
```

**Manually triggering the registered task** (PowerShell):
```powershell
Start-ScheduledTask -TaskName "PEIC - World Bank GDP Ingestion"
Get-ScheduledTaskInfo -TaskName "PEIC - World Bank GDP Ingestion"
```

**Inspecting `cron_run_log`** for this job (from a Node/tsx script, or via
`/admin/system-health`'s Cron History section — same view SBP's runs
already appear in):
```js
await supabase.rpc("get_cron_run_history", { p_job_name: "worldbank-gdp-growth-ingestion", p_limit: 10 });
```

**Monitoring:** there is deliberately no separate World Bank ingestion
watchdog in this phase (unlike `sbp-ingestion-watchdog`) — `cron_run_log`
is the only current visibility into missed/failed runs. If a genuine
multi-week silent-gap risk is identified, a dedicated watchdog is a future
architectural decision, not something to add speculatively here.
