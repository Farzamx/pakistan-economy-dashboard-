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
- Uncheck "Start the task only if the computer is on AC power" if this is a
  laptop you sometimes run on battery.
- Leave "Start only if network connection is available" checked if present
  in your Windows version — a sensible guard for this specific job.

**Settings tab**
- Check "Run task as soon as possible after a scheduled start is missed" —
  this is `StartWhenAvailable` (see the exported XML below) — covers the
  laptop being fully off at the scheduled time; Windows runs the task the
  next time it's on, once.
- Optionally check "Wake the computer to run this task" if the laptop is
  merely asleep (not off) at 8am and you want it to actually wake for this
  — free, built into Windows, no extra software. Leave unchecked if you'd
  rather it just run `StartWhenAvailable`-style whenever you next wake it
  yourself.
- "If the task fails, restart every" → 10 minutes, up to 3 attempts — a
  reasonable outer retry layer on top of the script's own internal
  per-indicator retries.

Save, then right-click the task → **Run** once to confirm it executes
outside of an interactive terminal (output won't be visible, but you can
verify via `/admin/system-health`'s Cron History section afterward, or by
checking `canonical_observations` directly).

## Handling missed runs — what's already covered, and by what

| Scenario | What happens | Mechanism |
|---|---|---|
| Laptop fully off at scheduled time | Runs once, automatically, the next time the laptop is on | Task Scheduler's `StartWhenAvailable` (Settings tab above) — no code involved |
| Laptop asleep at scheduled time | Either wakes and runs (if "Wake the computer" is checked), or runs `StartWhenAvailable`-style on next wake | Task Scheduler |
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
  <StartWhenAvailable>true</StartWhenAvailable>
  <RestartOnFailure>
    <Interval>PT10M</Interval>
    <Count>3</Count>
  </RestartOnFailure>
</Settings>
```

`StartWhenAvailable` is the actual missed-run setting from the checkbox
above — if it's `true` here, the "ran while the laptop was off" scenario
is genuinely configured, not just assumed.

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
