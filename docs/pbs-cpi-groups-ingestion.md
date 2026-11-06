# PBS CPI group ingestion — design and operating procedure

**Status (updated Phase F.2f).** The four things people mean by "scheduled" are different, and only the first two are true today:

| | |
|---|---|
| Code and configuration implemented | **yes** — locked, logged, bounded-retry write run; watchdog entry; freshness-registry entries; status command |
| Scheduler configured in the repository | **yes** — `ops/scheduled-tasks/peic-pbs-cpi-groups-ingestion.xml` (a template; cannot be registered until rendered) |
| Scheduler actually activated | **no** — no Task Scheduler task exists, and `WRITE_MODE_AUTHORIZED` is still `false`, so the script refuses `--write` |
| First successful production ingestion by the scheduled path | **no** — the only run on record is the unintended one of 2026-11-06 |

The operating procedure — schedule, retries, monitoring, recovery, and the **activation checklist** — is in
[pbs-cpi-ingestion-operations.md](pbs-cpi-ingestion-operations.md). The sections below that say "proposed" were written in F.2b
and are kept for their reasoning; where F.2f implemented them it says so.

**Incident (F.2b-R):** the write path was executed **once, unintentionally**, on 2026-11-06 by a
mutation experiment, and the production ledger now holds the 26 series (1,352 observations, verified exact
against the PBS file). See [incident-f2b-r-production-write.md](incident-f2b-r-production-write.md). The write path is
now behind three independent barriers (the flag, a test-harness refusal, and an operator confirmation that names the
database host) and cannot be reached from the test suite.

## What is ingested

One public file, <https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml>
(`https://www.pbs.gov.pk/cpi/` redirects to it), becomes **26 scalar series** in the
existing observation ledger (`raw_observations` / `canonical_observations`,
migrations 0050–0052). No schema change, no new RPC.

| Ledger key | SDMX code | Unit |
|---|---|---|
| `pbs:cpiIndexNational` | `PCPI_IX` | Index (2015-16=100) |
| `pbs:cpiGroupIndex01` … `12` | `PCPI_CP_NN_IX` | Index (2015-16=100) |
| `pbs:cpiGroupWeight01` … `12` | `PCPI_CP_NN_WT` | % of basket |
| `pbs:cpiWeightTotal` | `PCPI_WT` | % of basket (all groups) |

52 months today (2022-07 … 2026-10) → **1,352 observations**. Observation date =
month-end. Provider id `pbs-sdmx`.

Only what the file publishes is stored. Year-on-year and month-on-month rates and
group contributions are **derived at read time** from indices and weights (as the F.1
page does), never stored as if the source had published them. Weights, indices, rates
and contributions stay four different things.

### Provenance recorded on every observation

| Column (migration 0051) | Value |
|---|---|
| `source_updated_at` | the file header's own `<Prepared>` timestamp |
| `source_series_id` | the SDMX `INDICATOR` code |
| `release_date` | **null** — the file exposes none; one is never inferred |
| `quality_status` | `official` |
| `fetched_at` | set by the orchestrator when a row is written |
| `source_reference` | file URL, `DataSetID`, `BASE_PER`, methodology, the value exactly as written in the file, the publisher the header declares ("IMF SDMX Central") |

## Validation: one defect rejects the whole file

The 26 series are one file, so the adapter is built **only** from a dataset that passed
every check; an invalid file cannot reach a single write. Reported (`--dry-run` prints
them): all 26 series present and unique · valid, unduplicated, gap-free months ·
finite numbers only (never zero-filled) · identical months across all 26 · base period on
the allow-list and identical across the 13 index series · monthly / Pakistan / CPI ·
weights total 100 ± 0.1 every month · each weight constant within the base period ·
Laspeyres identity (Σ w·I / Σ w reproduces the headline; the F.1 gate, reused) · a valid
`Prepared` timestamp when present.

**Base period.** Allow-list: `2015/2016`. A different base means a new basket and new
weights: the file is rejected until a person decides how to onboard it (see "Source
revisions").

## Dry run (the default mode; `--write` exists but is refused in this build)

```
npm run ingest:pbscpigroups                              # live PBS file, empty ledger: a first-run backfill
npm run ingest:pbscpigroups -- --file saved.xml          # offline
npm run ingest:pbscpigroups -- --ledger live-read        # compare with the real ledger (public READ RPC only)
npm run ingest:pbscpigroups -- --show-provenance
```

It drives the real, unmodified orchestrator against an in-memory ledger that obeys the
real RPC semantics, so planned counts are those of the code that will run. Exit codes:
0 ok · 1 file rejected or unobtainable · 2 refused/bad arguments. It never writes a
`cron_run_log` entry (that is itself a database write).

## Operation — designed in F.2b; **implemented in the repository in F.2f, NOT activated**

> **F.2f changed the details below.** The schedule is no longer "daily 09:15 and 17:30"; it is daily on days 1–10 (09:15), days 1–5
> also 17:30, plus a Monday 12:30 floor (reasoning and evidence in the runbook). The watchdog entry uses the weekly 168h/216h
> thresholds, not 12h/36h, and was added with a `diagnose` hook. The 26 keys are in the freshness registry. A real run also now
> takes a single-run lock and writes one `cron_run_log` row for every outcome. Read the runbook for the current facts.

### Schedule (F.2b proposal — superseded by the runbook)
Task Scheduler task **"PEIC - PBS CPI Groups Ingestion"**, on the same laptop and with the
same settings as the existing tasks (`StartWhenAvailable`, `WakeToRun`,
`MultipleInstances: IgnoreNew`, no restart-on-failure; the orchestrator already retries):

* **Daily 09:15 and 17:30 PKT.** PBS publishes about the 1st–3rd of the month, around
  midday; the evening trigger picks a same-day release up. Runs are idempotent, so a
  daily cadence costs one small HTTP request and 26 read RPCs and writes nothing when
  nothing changed.
* Chosen to avoid the existing slots: SBP daily 08:00; Mondays 08:15 (World Bank), 08:30
  (net liquid reserves), 08:45 (FRED). **Verify against the live Task Scheduler before
  registering** — this list is from the code comments.
* Optional later optimisation: the server returns `ETag` / `Last-Modified` and the header
  has `Prepared`; a run could skip when they are unchanged.

### Watchdog registration (F.2b proposal — IMPLEMENTED in F.2f with different thresholds; see `PBS_CPI_GROUPS_MONITOR_JOB`)
A new entry in `MONITORED_INGESTION_JOBS` (`src/lib/ingestionWatchdog.ts`), consumed by
the existing `/api/cron/sbp-ingestion-watchdog` route:

```ts
export const PBS_CPI_GROUPS_MONITOR_JOB: IngestionMonitorJob = {
  ingestionJobName: "pbs-cpi-groups-ingestion",      // = JOB_NAME in pbsCpiGroupsIngestion.ts
  watchdogJobName: "pbs-cpi-groups-ingestion-watchdog",
  label: "PBS CPI group ingestion",
  expectedIntervalHours: 12,                          // two triggers a day
  staleAfterHours: 36,                                // as SBP: one full day can be missed before an alert
  commandHint: "npm run ingest:pbscpigroups",
};
```

### Freshness registry (F.2b proposal — IMPLEMENTED in F.2f: 26 entries, monthly, graceDays 40, entries only)
The 26 keys need `SERIES_CATALOG` / `seriesRegistry.ts` entries (monthly cadence, the
existing `CADENCE_GRACE_DAYS`) before a page can show a freshness verdict for them.
Entries only; no threshold or algorithm change.

### Failure alerts (F.2f: implemented — and one F.2b statement corrected)
* **Source rejected** (validation failure): the write path logs a `cron_run_log`
  *failure* with the failing check ids; the watchdog's staleness rule then emails via the
  existing mechanism. The ledger is untouched, so the page keeps its last good data.
* **Ledger error mid-run:** the orchestrator isolates the failing series; the run is
  logged with the failures, and the next run completes the rest (idempotent).
  **Correction:** F.2b said a run is a "success" unless ALL 26 fail. For a 26-series panel that the page rejects whole, a half-ingested
  month must never look healthy, so F.2f logs ANY failed series as a **failure** (`outcome=partial`, naming the failed keys).
* **All 26 fail:** logged as `failure`.
* **PBS unreachable / unexpected error / lock held:** also logged (failure, failure, skipped). Before F.2f a PBS outage left no row at all.

### Backfill procedure (Phase F.2c — requires its own authorization)
**Superseded in part by the F.2b-R incident:** the initial backfill has already happened (unintentionally) and was
verified exact. What F.2c now decides is whether to accept that population and run the first *intended*, logged
ingestion (expected: 26 unchanged, 0 writes except one `cron_run_log` row).
1. `npm run ingest:pbscpigroups -- --ledger live-read` → confirm: validation passes,
   26 series, 0 new, 0 revised (today's result).
2. Authorize F.2c; a reviewed change flips `WRITE_MODE_AUTHORIZED`. Writes require the
   live PBS file (`--file` is refused for writes), `NOTIFICATION_WORKER_SECRET`, and — new — the operator setting
   `PEIC_CONFIRM_WRITE_HOST=<the Supabase host>` for that run (the script names the exact value if it is missing).
   Writes are refused under any test harness.
3. Run once, from the laptop, from a normal shell (not from a test).
4. Verify with a read-only script: ledger vs the live file for all 1,352 points (expected
   maximum difference 0) and the identity per month.
5. Re-run immediately: expect 26 unchanged and zero write RPCs.
6. Only then register the scheduled task (which must set `PEIC_CONFIRM_WRITE_HOST`) and the watchdog entry.

History before July 2022 is not in this file. It cannot be backfilled from it.

### Recovery procedure
* **Run failed or laptop was off:** re-run. Everything is idempotent.
* **Bad value suspected in the ledger:** the ledger has no delete or update path by design.
  Correct by re-ingesting the right value (a new vintage; the old row stays, superseded),
  or stop reading the affected key. Any more drastic remedy needs explicit approval.
* **PBS unreachable from the laptop:** the page is unaffected (it reads what is stored);
  the watchdog alerts after 36 hours.

### Source revisions
* A changed value for an existing month is written as a new **vintage**: the old canonical
  row gets `superseded_at`, a new row is inserted, the raw ledger gains a row. Nothing is
  overwritten. Observed so far: 0 of 48 previously-seeded months changed between 31 July
  and 6 November 2026 — a short window, so "rare", not "never".
* A **rebase** (new base period, new weights) is *not* handled automatically: the file is
  rejected at the base-period check. The reader must never mix bases; the F.1 identity
  check is a second line of defence against a half-completed switch. Onboarding a new base
  needs a decision on key naming and history, taken by a person.
* **No read RPC exposes superseded vintages today.** Showing "as known on date X" would
  need one (additive, read-only, needs a migration and approval).

## Reliability follow-up: a long outage can show stale data with a "Current" badge

**The limitation (F.2a).** When PBS or the World Bank fails at runtime, the page now
refuses to regenerate, so Next keeps serving the last good page. That is the right
trade-off for one failure, but in a long outage the page is frozen: its freshness badge
was computed when it was last generated, so it can keep saying "Current" about data that
has since become stale. Nothing on the page says it is old.

**Four different timestamps are being conflated.** They answer different questions and
should be shown (or checked) separately:

| Timestamp | Answers | Where it comes from |
|---|---|---|
| Last successful **page generation** | How old is what I am looking at? | Time of the last successful render |
| **Latest observation period** | What month does the newest figure describe? | The data (e.g. Oct 2026) |
| Last successful **provider fetch** | When did PEIC last hear from the source? | Ledger `fetched_at` / `source_updated_at` after F.2e; page generation time until then |
| Actual **data freshness** | Is the data overdue for its cadence? | The existing freshness engine, evaluated against *now* |

**Proposed approach (no change to freshness methodology or thresholds).**
1. Embed the generation time in the page (`generatedAt`, ISO) — it is already known at
   render time.
2. Show it plainly next to the freshness badge: "Page generated 6 Nov 2026, 17:40 PKT ·
   data through Oct 2026". Never let a badge stand alone as the only statement of currency.
3. A tiny client component compares `generatedAt` with the viewer's clock. If the page is
   older than a bound (suggest 3 × the 1-hour revalidation window), it shows a notice:
   "This page has not refreshed since …; figures may be out of date." This needs no server
   call, so it still works when the page is frozen.
4. Where a freshness verdict is displayed, evaluate it with the **existing** engine
   against the viewer's current time (client side) rather than relying on the verdict
   frozen at generation. The engine, its definitions and its thresholds are used as they
   are; only *when* it is evaluated changes.
5. Alert operators: the `[InflationPage] … regeneration refused` log line from F.2a is
   the signal; a log-based alert on it turns "frozen page" into a page for a human.
6. After F.2e (page reads the ledger), the fourth row can show the real last-fetch time.

Not implemented in F.2b. Item 4 touches how a protected module is *called*, so it needs
explicit approval.
