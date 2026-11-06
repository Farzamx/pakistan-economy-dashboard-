# Inflation page: moving from live PBS parsing to the observation ledger

**Phase F.2e-Prep — assessment and test preparation. Nothing here changes the page, its data source, the database, the
scheduler or any methodology.** The prototype modules named below exist in the repository, are fully tested, and are
**not imported by the page**.

| Verified | Result |
|---|---|
| Production ledger (read-only, 3 public read RPCs) | complete, consistent, exact — see §1 |
| Ledger-backed model vs F.1's live-PBS model | **identical**: 3,211 derived values compared, max difference 0 — §4 |
| Outage / validation matrix | every case handled, none can mix sources — §3 |
| Mutation checks of the new code | 23 / 23 caught — §4 |
| Safe to run before ingestion is scheduled? | **Yes, for freshness; but it then delivers little of the benefit** — §7 |

Re-run the live verification any time: `npx tsx scripts/reconcileInflationLedger.ts --runs 5` (read-only; refuses under a test harness).

---

## 1. Ledger completeness report (production, read-only, 2026-11-06)

Two independent passes: Part A of the script uses raw RPC rows and its own arithmetic (none of the new reader code);
Part B uses the real reader. Both pass.

| Question | Finding |
|---|---|
| All 26 series exist? | **Yes** — 1 national index, 12 group indices, 12 weights, 1 total weight. No other `pbs:*` key exists. |
| All 52 months? | **Yes** — every series covers exactly 2022-07 … 2026-10, consecutively, month-end dates. 1,352 current rows. |
| Gaps / duplicates? | **None.** One current row per (series, month). |
| Base period | **One** across all 1,352 rows: `2015/2016`. Exactly three units, as designed. |
| Provenance | `source_series_id` = SDMX code and file URL on every row; `quality_status` official; `release_date` null (none invented); `source_updated_at` = the file's *Prepared* `2026-11-03T06:38:35Z`; one DataSetID; provider `pbs-sdmx` for all 26 (freshness summary). |
| Full precision | Stored number == the exact text PBS published, recorded beside it, on **all 1,352** rows. |
| Latest period | `2026-10-31` for all 26 keys; the live PBS file's latest is also `2026-10`. |
| Fixed basket | Each weight constant across all 52 months; the 12 weights total 100.0034; the stored total-weight series is 100 in every month. |
| Headline reconstruction | Σ w·I / Σ w reproduces the national index in every month, worst gap **0.0077** index points (limit 0.05). |
| Contributions vs headline | Group contributions sum to headline YoY inflation in all 40 YoY months, worst gap **0.0037** pp. |
| Who wrote it | one `cron_run_log` row, `pbs-cpi-groups-ingestion`, 2026-11-06 17:27 UTC (the F.2b-R incident), status success. |

**Does the ledger contain everything the page needs?** For the CPI group panel, yes: months, headline index, 12 group
indices, 12 weights — exactly what `CpiGroupPanel` holds. What it does **not** hold, and why that does not matter:
* release dates — the file exposes none (stored null, never inferred); the page does not show one;
* the file's dataset-level `COMMENT` ("Data for july was reviewed") — not part of any series; not used by the page;
* history before 2022-07 — absent from PBS's file too. Its first month has been 2022-07 in every inspection so far while the file grew at the end (0 of 48 previously seeded months changed between 31 July and 6 November). That is observation, not a guarantee: if PBS ever trims the start, the ledger would simply keep more history than the PBS fallback, and the fallback would show a shorter window;
* the page's other inputs — SBP headline/core/food/policy series, the `cpi_monthly_index` table, the PDF-derived category snapshot, the World Bank — are **separate sources and unchanged**.

## 2. Reader architecture (prototype, unwired)

```
 get_canonical_observation_provenance ×26  ──►  readLedgerSeries()     src/lib/data/cpiGroupLedgerReader.ts   (I/O, never throws)
                                                    │  LedgerReads
                                                    ▼
                                           assembleLedgerPanel()        src/lib/inflation/ledgerPanel.ts       (pure)
                                                    │  panel | issues, provenance, aligned grid
                                                    ▼
                                      existing buildGroupModel() → view model     (UNCHANGED F.1 analytics)
```

* **One existing RPC.** `get_canonical_observation_provenance` (migration 0052) returns value **and** every provenance field per
  current row, so one call per series is enough; the older history RPC lacks provenance. No new RPC, table or migration.
* **Output type is the F.1 `CpiGroupPanel`**, so nothing downstream knows where the data came from.
* **All or nothing.** A panel is returned only if every check passes; otherwise `panel = null` with every reason found. Nothing is
  zero-filled, interpolated, truncated to a "common window" or mixed with PBS. Missing observations are `null` in an aligned grid
  (diagnostic) and any null in the window rejects the read.
* **Checks** (thresholds imported from `pbsGroups.ts`, not copied): all 26 present, none empty, none hitting the row limit · month-end
  dates · no duplicate current row · all 26 cover the same consecutive months (a **partly ingested** new month is rejected whole) ·
  source series id / file URL / quality / unit match what the adapter wrote · **stored number == recorded source text** (precision) ·
  one **supported** base period (a rebase is never read as the old basket) · weights constant, positive, total 100 ± 0.1 and equal to
  the stored total series · index bounds 50–2000 · Laspeyres identity within 0.05 every month.
* **Strictness relative to the file parser** (pinned by parity tests): the ledger path never accepts what the file path rejects; it is
  *stricter* on gaps, base period, precision and provenance, because it also verifies what the writer promised.
* **Provenance preserved**: base period, first/latest month, month count, `source_updated_at` and `fetched_at` ranges, vintage range, DataSetIDs.
* **Resilience** (all bounded): concurrency 6; 8 s per call; 2 retries; **12 s overall deadline** that aborts everything in flight and starts
  nothing new (without it a hung ledger could hold a regeneration ≈ 2 minutes before fallback began); never throws.

## 3. Source selection and fallback

```
1  read + validate the ledger
2  valid and CURRENT (latest month ≥ previous calendar month)        → ledger.  PBS is not fetched.
3  valid but BEHIND the calendar → ask PBS once
       PBS valid and strictly newer                                  → PBS live, whole panel   (fallback-ledger-behind-source)
       otherwise                                                     → ledger                  (ledger-awaiting-release)
4  unavailable / invalid                                             → PBS live                (fallback-ledger-unavailable | -invalid)
5  neither usable                                                    → no panel                (unavailable-both)
```
Invariants (tested): the returned panel is **by identity exactly one source's panel**; ledger and PBS data are never merged; the
fallback is the existing PBS path unchanged; freshness never regresses versus today's live-PBS page; the decision is explained in a
`SourceNote` (source, reason, both sides' issues, latest months, whether PBS was asked).

| Scenario | Outcome |
|---|---|
| Ledger outage (every read fails) | PBS live, `fallback-ledger-unavailable`, 26 × 3 attempts bounded by the 12 s deadline |
| One series unreadable / incomplete group (weight absent) | PBS live, `…-unavailable` |
| Missing month in one group | PBS live, `…-invalid` ("missing 1 month(s)") |
| Partly ingested new month (25 of 26 series) | ledger rejected **whole**; PBS whole (never completed from PBS) |
| Incorrect / mixed / unsupported base period | PBS live, `…-invalid` |
| Invalid weights; broken Laspeyres identity | PBS live, `…-invalid` |
| PBS outage while ledger current | invisible — PBS is never asked |
| PBS outage while ledger behind | ledger kept (`ledger-awaiting-release`), PBS failure recorded |
| Both unavailable | no panel; both reasons, labelled "Ledger:" / "PBS file:" |
| **F.2a composition** | PBS fallback is **not** a failure (page regenerates, fallback logged). Both unavailable at runtime → `ProviderUnavailableError`, **ISR keeps the last good page**. At build → labelled unavailable state. Verified with the real `evaluateRequiredProviders` + `enforceProviderPolicy`. |

**Recording and exposing fallback use** (no new table, no page write): (1) one greppable line per generation —
`[InflationPage] CPI group source: source=pbs-live reason=fallback-ledger-invalid fallback=true ledgerLatest=… pbsLatest=… expected=… pbsChecked=… | ledger: …` —
a log-based alert on `fallback=true` is the monitor; (2) a `groupSource` field on the view model, shown in the methodology section as
`describeSource()` ("PEIC observation ledger (PBS CPI file, ingested)" / "PBS CPI file, read directly (…)"); (3) optionally a row on the
admin System Health page computed from the same note.

## 4. Reconciliation report

Harness: `src/lib/inflation/ledgerReconciliation.ts` (exact `===`, no tolerance) used by `ledgerReconciliation.test.ts` and, against production, by the script.

| Compared | Values | Max \|diff\| |
|---|---:|---:|
| months | 52 | 0 |
| headline index | 52 | 0 |
| basket weights | 12 | 0 |
| group indices (12 × 52) | 624 | 0 |
| group YoY (12 × 40) | 480 | 0 |
| group MoM (12 × 51) | 612 | 0 |
| contributions to headline YoY | 560 | 0 |
| contributions to headline MoM | 714 | 0 |
| other-groups YoY / MoM | 40 / 51 | 0 |
| waterfall 2025-10 → 2026-10 | 14 | 0 |
| **total** | **3,211** | **0** |

* **October 2026 reference figures** from the production ledger model: food contribution **2.8465 pp** (2.85), total **9.6068 pp** (9.61),
  transport YoY **28.6125 %** (28.61). Asserted in tests and the script only; a test pins that no new production module contains them (or 307.62 / 34.58).
* **Production-faithful pipeline in tests**: the real adapter + orchestrator write the real file into the in-memory ledger; its rows, served through
  the documented RPC contract, go through the real reader and assembler; the whole view model is `toEqual` to the file-built one. All 1,352 stored values equal the published text.
* **Forward path**: ingesting a coherent next month adds exactly 26 observations; the reader then serves 53 months, identical to F.1's model of the new file.
  A revision is served as the current value while the old vintage stays in the ledger.
* **Sensitivity (negative controls)**: a coherent revision on one side is located to `group 7 2026-10`; a one-ulp difference is reported; a ledger missing its newest month is reported.
* **Mutation checks**: 23 deliberate breaks of the new code (each validation, the selection rule, the reader's concurrency/retry/truncation/RPC name/overall deadline, exact comparison) — **23 caught**.

## 5. Performance and query count

| | Today (live PBS) | Ledger-first, as built | Ledger-first with a batch RPC (proposed) |
|---|---|---|---|
| DB RPCs for the CPI group panel | 0 | **26** | **1** |
| External HTTP for the panel | 1 (PBS, 83 KB) | 0 on the normal path (PBS only when needed) | same |
| Other DB RPCs the page already makes | ≈ 6–8 (derived from call sites; **not measured**) | unchanged | unchanged |
| Latency (this machine, 5 runs) | PBS fetch+parse median **220 ms** | 26 calls @ concurrency 6: median **743 ms** (665–832); sequential would be 4,188 ms | ≈ one round trip ≈ 160–250 ms (extrapolated from 4,188 ms / 26) |
| Worst case if the source hangs | PBS 15 s timeout | ledger 12 s deadline, then PBS 15 s | same |

* The page regenerates at most hourly (`revalidate = 3600`): ≤ 24 × 26 = **624** extra RPCs/day. Negligible load, but 26 near-simultaneous calls is the burst pattern an earlier audit found
  to be transiently flaky, which is why concurrency is capped at 6 and retried.
* **Batch RPC — documented, NOT created (needs a migration and separate approval).** Shape: read-only, `SECURITY DEFINER`, `STABLE`, granted to `anon` exactly like `…_provenance`,
  taking `p_indicator_keys text[]`. **Caveat found while designing it:** a flat result is 26 × 52 = 1,352 rows and grows ~312/year, which exceeds Supabase's default API
  row cap (1,000) and would be silently truncated. Return **one row per key with a `jsonb` array of its observations** (26 rows), and keep the reader's
  count/truncation check. Expected saving: 25 round trips, ~0.5 s, and removal of the burst pattern. It is an optimisation, not a prerequisite.

## 6. Freshness and monitoring design (no change to the freshness engine or its thresholds)

Six different questions, six different sources — never one badge:

| Concept | Answers | Source |
|---|---|---|
| **Latest observation period** | what month the newest figure describes | ledger `provenance.latestMonth` (max `observation_period`) |
| **Last successful ingestion (run)** | did the job run and succeed? | `cron_run_log` via the public `get_cron_run_history('pbs-cpi-groups-ingestion')` — the only place an *unchanged* run is visible |
| **Last data change** | when PEIC last wrote a row | `max(fetched_at)` over the 26 rows (an unchanged run writes nothing, so this is **not** "last ingestion") |
| **Last successful source fetch** | when PEIC last heard from PBS | ingestion run's `finished_at` (ledger path); the page's own fetch time when on PBS fallback |
| **Last successful page generation** | how old is what the visitor sees | `generatedAt` stamped at render (the F.2b follow-up in `pbs-cpi-groups-ingestion.md`) |
| **Current source / fallback** | which path served it, and why | `SourceNote` → log line + view-model `groupSource` |

**Behaviour when the ledger does not change for longer than the monthly release interval** (all driven by `SourceNote`; thresholds only *referenced*, never altered):

| State | Detected by | Page shows |
|---|---|---|
| Current | ledger latest = previous calendar month | "PEIC observation ledger (…)", as-of month |
| Awaiting release | ledger behind calendar, PBS not newer | same, plus "no newer month is published yet" |
| **Ledger behind source** | PBS valid and newer | PBS live, labelled "(it holds a newer month than the PEIC ledger)"; log `fallback=true reason=fallback-ledger-behind-source` — **this is the monitor for "ingestion is not running"** |
| Overdue | latest month older than the engine's existing monthly grace (40 days, read from `seriesRegistry.ts`, unchanged) *and* PBS not newer | the existing stale treatment, evaluated by the existing engine against the viewer's clock (the F.2b stale-page proposal), not frozen at generation |
| Both sources down | `unavailable-both` | last good page stays (F.2a) |

Proposed additions, none implemented: freshness-registry entries for the 26 keys and a watchdog entry for the CPI job (both protected files; F.2c);
a System Health row from `SourceNote`; a log-based alert on `fallback=true`.

## 7. Scheduler dependency

The CPI ingestion task and watchdog are **not registered**. Can the ledger-first page run without them?

* **Safe: yes.** The "behind the calendar → ask PBS" rule means whenever PBS has a newer valid month, PBS supplies the page. Freshness therefore never regresses versus today.
  Timeline: ledger holds Oct; on 1 Dec the ledger is "behind", so each regeneration asks PBS (one cached fetch/hour) until PBS publishes November (≈1–3 Dec); from the next
  regeneration the page shows PBS November, labelled as a fallback, exactly as fresh as today.
* **Valuable: only partly.** Without scheduled ingestion the ledger decays after every release, so for most of each month the page runs on the PBS fallback and the
  ledger's resilience/durability benefit is mostly unrealised. No alert fires for a missing ingestion either (no watchdog) — only the `fallback-ledger-behind-source` log line.
* **Recommended order**: F.2c (authorise the first *intended*, logged run + scheduled task + watchdog entry + freshness-registry entries) **before or together with** the page switch.
  The existing `cpi-pbs-sync` job (headline index only → `cpi_monthly_index`) does not substitute: it carries no group data.
* Nothing in this assessment registered or modified any scheduled task.
* **Update, Phase F.2f:** the schedule, the watchdog entry, the freshness-registry entries and a read-only status command now exist in the
  repository (see [pbs-cpi-ingestion-operations.md](pbs-cpi-ingestion-operations.md)) — but the task is **not registered** and the script still
  refuses `--write`, so the recommendation above (activate scheduling before or with the page switch) is unchanged and its prerequisites are outstanding.

## 8. Files expected to change in the implementation phase

Already in the repository from this phase (new, tested, unwired): `src/lib/inflation/{ledgerPanel,panelSource,ledgerReconciliation}.ts` (+ tests, `__fixtures__/ledgerFixtures.ts`),
`src/lib/data/cpiGroupLedgerReader.ts` (+ test), `scripts/reconcileInflationLedger.ts` (+ test).

To change (bounded):
| File | Change |
|---|---|
| `src/lib/data/cpiGroupPanelSource.ts` **(new, `server-only`)** | wire `readLedgerPanel` + existing `getCpiGroupPanel` + `selectPanel`; emit the log line |
| `src/lib/data/inflationPageData.ts` | replace the `getCpiGroupPanel()` call with the resolver; pass `source` into the model |
| `src/lib/inflation/viewModel.ts` | add `groupSource` to `InflationViewModel` (type + builder) |
| `src/components/inflation/MethodologySection.tsx` | show `describeSource()` |
| `src/lib/inflation/providerHealth.ts` | wording only (provider label) if desired |
| tests | `viewModel.test.ts`, `pageContract.test.ts`, `inflationFailurePolicy.test.ts`, new resolver test |

**Not changed**: `pbsCpiGroups.ts` (the fallback), `pbsGroups.ts`, `analytics.ts`, the page file, freshness/watchdog/registry, `vercel.json`, `supabase/`, any scheduler.

## 9. Risks and rollback

| Risk | Mitigation |
|---|---|
| Ledger stale before scheduling | crosscheck rule (§3); fallback is today's behaviour |
| Ledger validation stricter than the file parser → spurious fallback | safe direction (falls to PBS); visible in the log; parity tests document every stricter rule |
| Ledger read slow/hung | 8 s/call, 12 s overall deadline, then PBS |
| PBS rebases the basket | file parser would accept it, the ledger path rejects it; ledger stops updating, becomes "behind", PBS serves — needs a human decision on onboarding a new base (documented in F.2b) |
| A partly ingested month during a run (≈2 min) | rejected whole → PBS; next hour consistent |
| Source label confuses readers | wording reviewed in `describeSource()`; shown only in the methodology section |
| 26 calls burst | concurrency 6 + retry; batch RPC proposed |
| Two stored copies of the headline index (`cpi_monthly_index`, ledger) | the page's existing `index-sources` check keeps comparing them — it regains independence |

**Rollback**: the change is confined to one call site in `inflationPageData.ts` plus an additive view-model field. Revert that commit (or redeploy the previous one) and the page is
exactly the F.1/F.2a page; the PBS path was never modified. No data migration to undo; the ledger is untouched either way.

## 10. Bounded implementation plan (needs separate authorisation)

0. Decide F.2c ordering (§7). 1. Add `cpiGroupPanelSource.ts` + resolver test (fake ledger/PBS, the §3 matrix through the real wiring). 2. Add `groupSource` to the view model + tests.
3. Render the label. 4. Switch `inflationPageData.ts`; update the page-contract and failure-policy tests. 5. Run `scripts/reconcileInflationLedger.ts` (must say ALL CHECKS PASSED).
6. tsc, ESLint, full Vitest ×2, production build in an isolated worktree, 359 pages and `/inflation-rate-pakistan` still `Revalidate 1h`. 7. Deploy (separately authorised); then confirm the log
line shows `source=ledger reason=ledger`, the label renders, and re-run the reconcile script. 8. Later, optionally: batch RPC; freshness entries and watchdog (F.2c).
Acceptance for 4: the view model for the production data is deep-equal to the pre-change view model; no database write; no schedule touched.
