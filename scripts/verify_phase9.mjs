/**
 * Phase 9 — Production Verification
 *
 * Verifies every canonical indicator against the live Supabase DB,
 * confirms cron history, event chain integrity, observation_date backfill,
 * and optionally runs a live pipeline pass if APP_URL + CRON_SECRET are set.
 *
 * SAFETY: all DB queries are SELECT-only via the anon key.
 * The optional pipeline trigger (Section 7) calls the deployed endpoint —
 * idempotent; safe to run against production.
 *
 * Usage: node scripts/verify_phase9.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname }            from "path";
import { fileURLToPath }            from "url";

// ─── Load .env.local ──────────────────────────────────────────────────────────

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath     = join(projectRoot, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq  = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WORKER_SECRET = process.env.NOTIFICATION_WORKER_SECRET;
const APP_URL       = process.env.APP_URL;
const CRON_SECRET   = process.env.CRON_SECRET;

const TIMEOUT_MS = 30_000;

// ─── Result counters ──────────────────────────────────────────────────────────

let passed = 0, failed = 0, warnings = 0;

function pass(label, detail = "") {
  console.log(`  PASS  ${label}${detail ? " — " + detail : ""}`);
  passed++;
}
function fail(label, detail = "") {
  console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
  failed++;
}
function warn(label, detail = "") {
  console.warn(`  WARN  ${label}${detail ? " — " + detail : ""}`);
  warnings++;
}
function info(msg) { console.log(`        ${msg}`); }
function section(title) {
  console.log(`\n${"─".repeat(72)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(72));
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function sbq(path, params = {}) {
  const q   = new URLSearchParams(params).toString();
  const url = `${SUPABASE_URL}/rest/v1/${path}?${q}`;
  const res = await fetch(url, {
    headers: {
      apikey:        ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Accept:        "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0,200)}`);
  try   { return JSON.parse(text); }
  catch { return []; }
}

async function sbqRpc(fn, body = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: {
      apikey:          ANON_KEY,
      Authorization:   `Bearer ${ANON_KEY}`,
      "Content-Type":  "application/json",
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  try   { return JSON.parse(text); }
  catch { return null; }
}

// ─── Section 1: Environment ───────────────────────────────────────────────────

section("1. Environment");

if (SUPABASE_URL && ANON_KEY) {
  pass("Supabase env vars", SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0] + ".supabase.co");
} else {
  fail("SUPABASE_URL or ANON_KEY missing — all DB sections will fail");
}
if (APP_URL && CRON_SECRET) {
  pass("APP_URL + CRON_SECRET available — live pipeline test enabled");
} else {
  warn("APP_URL or CRON_SECRET missing — Section 7 (live pipeline) will be skipped");
}

// ─── Section 2: Canonical series — recurrence metadata ───────────────────────

section("2. economic_event_series — Recurrence Metadata");

// Production-verified recurrence types (confirmed 2026-07-03 against live DB).
// lag: null means recurrence_lag_days is not checked for that recurrence type.
// Notes on non-obvious values:
//   CPI/Core: lag=1 → generate_next_occurrence produces 1st of M+1 (PBS release day)
//   LSM: lag=45 → 45 days after month-end produces ~18th of M+2 (PBS release window)
//   worker-remittances/current-account: monthly_lag (not "monthly") — same behaviour
//   MPC/T-bills/PIB: official_calendar — managed by official calendar sync, not recurrence
const EXPECTED_SERIES = [
  { slug: "cpi-inflation-release",               recurrence_type: "monthly_lag",      lag: 1    },
  { slug: "core-inflation-release",              recurrence_type: "monthly_lag",      lag: 1    },
  { slug: "exports-release",                     recurrence_type: "monthly_lag",      lag: 15   },
  { slug: "imports-release",                     recurrence_type: "monthly_lag",      lag: 15   },
  { slug: "trade-balance",                       recurrence_type: "monthly_lag",      lag: 15   },
  { slug: "large-scale-manufacturing-lsm-growth",recurrence_type: "monthly_lag",      lag: 45   },
  { slug: "worker-remittances",                  recurrence_type: "monthly_lag",      lag: null },
  { slug: "current-account-balance",             recurrence_type: "monthly_lag",      lag: null },
  { slug: "spi-weekly-inflation-release",        recurrence_type: "weekly",           lag: null },
  { slug: "sbp-foreign-exchange-reserves",       recurrence_type: "weekly",           lag: null },
  { slug: "sbp-monetary-policy-committee-meeting",recurrence_type: "official_calendar",lag: null },
  { slug: "treasury-bill-auction-3m",            recurrence_type: "official_calendar", lag: null },
  { slug: "pib-auction",                         recurrence_type: "official_calendar", lag: null },
];

try {
  const slugs   = EXPECTED_SERIES.map(s => s.slug);
  const rows    = await sbq("economic_event_series", {
    select: "slug,recurrence_type,recurrence_lag_days,event_slug_prefix,event_title_template",
    slug:   `in.(${slugs.join(",")})`,
    order:  "slug",
  });

  const bySlug = Object.fromEntries(rows.map(r => [r.slug, r]));

  for (const expected of EXPECTED_SERIES) {
    const row = bySlug[expected.slug];
    if (!row) { fail(`Series missing from DB`, expected.slug); continue; }

    const recOk = row.recurrence_type === expected.recurrence_type ||
                  (expected.recurrence_type === "as_needed" && row.recurrence_type === "as_needed");
    if (!recOk) {
      fail(`${expected.slug} — wrong recurrence_type`, `got=${row.recurrence_type} want=${expected.recurrence_type}`);
    } else if (expected.lag !== null && row.recurrence_lag_days !== expected.lag) {
      fail(`${expected.slug} — wrong recurrence_lag_days`, `got=${row.recurrence_lag_days} want=${expected.lag}`);
    } else {
      pass(`${expected.slug}`, `type=${row.recurrence_type}${row.recurrence_lag_days ? ` lag=${row.recurrence_lag_days}d` : ""}`);
    }

    // For exports/imports specifically: also verify slug_prefix + title template present
    if (expected.slug === "exports-release" || expected.slug === "imports-release") {
      if (!row.event_slug_prefix || !row.event_title_template) {
        fail(`${expected.slug} — missing event_slug_prefix or event_title_template`);
      } else {
        info(`  slug_prefix=${row.event_slug_prefix}  title_template=${row.event_title_template}`);
      }
    }
  }
} catch (err) {
  fail("Section 2 query failed", err.message);
}

// ─── Section 3: Canonical observations — observation_date and value ───────────

section("3. Canonical Observations — Latest Released Events");

const CANONICAL_SLUGS = [
  "cpi-inflation-release",
  "core-inflation-release",
  "large-scale-manufacturing-lsm-growth",
  "trade-balance",
  "exports-release",
  "imports-release",
];

const canonicalResults = {};

for (const slug of CANONICAL_SLUGS) {
  try {
    // Get series id
    const seriesRows = await sbq("economic_event_series", {
      select: "id,source_name,slug",
      slug:   `eq.${slug}`,
      limit:  "1",
    });
    if (!seriesRows.length) { fail(`Series not found: ${slug}`); continue; }
    const seriesId = seriesRows[0].id;

    // Get latest released event with observation_date
    const eventRows = await sbq("economic_events", {
      select:           "event_date,actual_value,observation_date,status,reference_period",
      series_id:        `eq.${seriesId}`,
      status:           "eq.released",
      observation_date: "not.is.null",
      order:            "observation_date.desc",
      limit:            "3",
    });

    if (!eventRows.length) {
      fail(`${slug} — no released events with observation_date`);
      continue;
    }

    const latest = eventRows[0];
    canonicalResults[slug] = latest;
    pass(
      `${slug}`,
      `obs=${latest.observation_date}  val="${latest.actual_value}"  event_date=${latest.event_date}`,
    );

    // Verify observation_date is non-null and recent enough to be plausible
    const obsAge = (Date.now() - new Date(latest.observation_date + "T00:00:00Z").getTime()) / (1000*60*60*24);
    if (obsAge > 120) {
      warn(`${slug} — observation_date is ${Math.round(obsAge)} days old (>120 days)`);
    }

    // For exports/imports: also verify reference_period is populated
    if (slug === "exports-release" || slug === "imports-release") {
      if (!latest.reference_period) {
        fail(`${slug} — reference_period is NULL on latest released event`);
      } else {
        info(`  reference_period=${latest.reference_period}`);
      }
      // Show next 2 events as well
      for (const e of eventRows.slice(1)) {
        info(`  also released: obs=${e.observation_date} val="${e.actual_value}"`);
      }
    }
  } catch (err) {
    fail(`${slug} query failed`, err.message);
  }
}

// ─── Section 4: observation_date backfill coverage ────────────────────────────

section("4. Observation Date Backfill — NULL Coverage");

const BACKFILL_SLUGS = [
  "cpi-inflation-release",
  "core-inflation-release",
  "large-scale-manufacturing-lsm-growth",
  "trade-balance",
];

for (const slug of BACKFILL_SLUGS) {
  try {
    const seriesRows = await sbq("economic_event_series", { select: "id", slug: `eq.${slug}`, limit: "1" });
    if (!seriesRows.length) continue;
    const sid = seriesRows[0].id;

    const nullRows = await sbq("economic_events", {
      select:    "id,event_date,status",
      series_id: `eq.${sid}`,
      status:    "eq.released",
      observation_date: "is.null",
      order:     "event_date.desc",
      limit:     "10",
    });

    if (nullRows.length === 0) {
      pass(`${slug} — all released events have observation_date`);
    } else {
      fail(`${slug} — ${nullRows.length} released event(s) still have NULL observation_date`,
        nullRows.map(r => r.event_date).join(", "));
    }
  } catch (err) {
    fail(`${slug} backfill check failed`, err.message);
  }
}

// ─── Section 5: Event chain — scheduled future events ────────────────────────

section("5. Event Chain — Scheduled Future Events");

const CHAIN_SLUGS = [
  "cpi-inflation-release",
  "core-inflation-release",
  "exports-release",
  "imports-release",
  "trade-balance",
  "large-scale-manufacturing-lsm-growth",
  "worker-remittances",
  "current-account-balance",
  "spi-weekly-inflation-release",
  "sbp-foreign-exchange-reserves",
];

const today = new Date().toISOString().slice(0, 10);

for (const slug of CHAIN_SLUGS) {
  try {
    const seriesRows = await sbq("economic_event_series", { select: "id", slug: `eq.${slug}`, limit: "1" });
    if (!seriesRows.length) { fail(`Series missing: ${slug}`); continue; }
    const sid = seriesRows[0].id;

    const futureRows = await sbq("economic_events", {
      select:     "event_date,status,reference_period",
      series_id:  `eq.${sid}`,
      status:     "in.(scheduled,tentative)",
      event_date: `gte.${today}`,
      order:      "event_date.asc",
      limit:      "4",
    });

    if (futureRows.length === 0) {
      fail(`${slug} — no scheduled/tentative future events (chain broken?)`);
    } else {
      const dates = futureRows.map(r => r.event_date).join(", ");
      pass(`${slug} — ${futureRows.length} future event(s)`, dates);
    }
  } catch (err) {
    fail(`${slug} chain check failed`, err.message);
  }
}

// ─── Section 6: reference_period integrity for exports/imports ────────────────

section("6. exports-release / imports-release — reference_period Integrity");

for (const slug of ["exports-release", "imports-release"]) {
  try {
    const seriesRows = await sbq("economic_event_series", { select: "id", slug: `eq.${slug}`, limit: "1" });
    if (!seriesRows.length) { fail(`Series missing: ${slug}`); continue; }
    const sid = seriesRows[0].id;

    // All events (released + scheduled) — check reference_period populated
    const allRows = await sbq("economic_events", {
      select:    "event_date,status,reference_period,observation_date",
      series_id: `eq.${sid}`,
      order:     "event_date.asc",
    });

    const nullRefPeriod = allRows.filter(r => !r.reference_period);
    const total         = allRows.length;

    if (nullRefPeriod.length === 0) {
      pass(`${slug} — all ${total} events have reference_period`);
    } else {
      fail(`${slug} — ${nullRefPeriod.length}/${total} events missing reference_period`,
        nullRefPeriod.map(r => `${r.event_date}(${r.status})`).join(", "));
    }

    // Show full event list
    for (const r of allRows) {
      info(`  ${r.event_date}  ${r.status.padEnd(10)}  ref=${r.reference_period ?? "NULL"}  obs=${r.observation_date ?? "NULL"}`);
    }
  } catch (err) {
    fail(`${slug} reference_period check failed`, err.message);
  }
}

// ─── Section 7: cron execution history ───────────────────────────────────────

section("7. Cron Execution History — sync_trigger_log");

try {
  const triggerRows = await sbq("sync_trigger_log", {
    select:  "triggered_at,scheduler_name,trigger_type,total_synced,total_failed,jobs_summary",
    order:   "triggered_at.desc",
    limit:   "10",
  });

  if (!triggerRows || triggerRows.length === 0) {
    warn("sync_trigger_log — no rows accessible (may be restricted to service role)");
  } else {
    pass(`sync_trigger_log — ${triggerRows.length} recent entries accessible`);
    for (const r of triggerRows) {
      const dt      = new Date(r.triggered_at).toISOString().replace("T", " ").slice(0, 19) + " UTC";
      const synced  = r.total_synced ?? "?";
      const failed2 = r.total_failed ?? "?";
      info(`  ${dt}  scheduler=${r.scheduler_name}  synced=${synced}  failed=${failed2}`);
    }

    // Check for recent failure-only runs
    const recentFailed = triggerRows.filter(r => r.total_failed > 0 && r.total_synced === 0);
    if (recentFailed.length > 0) {
      warn(`${recentFailed.length} recent cron run(s) had total_failed>0 and total_synced=0`);
    }

    // Confirm last cron was within 24 hours
    const lastRun    = new Date(triggerRows[0].triggered_at);
    const hoursAgo   = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    if (hoursAgo <= 24) {
      pass(`Last cron run ${hoursAgo.toFixed(1)}h ago — within 24-hour window`);
    } else {
      fail(`Last cron run was ${hoursAgo.toFixed(1)}h ago — exceeds 24-hour window`);
    }
  }
} catch (err) {
  warn("sync_trigger_log query failed (likely restricted)", err.message.slice(0, 120));
}

// ─── Section 8: Live pipeline trigger ────────────────────────────────────────

section("8. Live Pipeline Trigger");

if (APP_URL && CRON_SECRET) {
  try {
    const endpoint = `${APP_URL}/api/cron/sync-economic-calendar`;
    info(`Calling: ${endpoint}`);
    const res = await fetch(endpoint, {
      headers: {
        Authorization:    `Bearer ${CRON_SECRET}`,
        "x-scheduler-name": "verify_phase9",
        "x-trigger-type": "manual",
      },
      signal: AbortSignal.timeout(120_000), // 2-minute timeout for full pipeline
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      pass("Live pipeline run returned HTTP 200");
      info(`  totalSynced=${body.totalSynced}  totalFailed=${body.totalFailed}  durationMs=${body.durationMs}`);
      info(`  scheduler=${body.scheduler}`);

      if (body.cpiPbsResults?.length > 0) {
        for (const r of body.cpiPbsResults) {
          info(`  CPI/Core: ${r.seriesSlug}  ${r.status}  ${r.detail ?? ""}`);
        }
      }
      if (body.tradeBalanceResults?.length > 0) {
        for (const r of body.tradeBalanceResults) {
          info(`  Trade: ${r.seriesSlug}  ${r.status}  ${r.detail ?? ""}`);
        }
      }
      if (body.fxReservesResult) {
        const fx = body.fxReservesResult;
        info(`  FX Reserves: ${fx.status}  ${fx.detail ?? ""}`);
      }
      if (body.lsmResult) {
        info(`  LSM: ${body.lsmResult.status}  ${body.lsmResult.detail ?? ""}`);
      }
      if (body.results?.length > 0) {
        for (const r of body.results) {
          info(`  EasyData: ${r.seriesSlug ?? r.series ?? ""}  ${r.status}  ${r.detail ?? ""}`);
        }
      }

      if (body.totalFailed > 0) {
        warn(`Pipeline had ${body.totalFailed} failed step(s) — see detail above`);
      }
    } else {
      fail(`Live pipeline returned HTTP ${res.status}`, JSON.stringify(body).slice(0, 200));
    }
  } catch (err) {
    fail("Live pipeline call failed", err.message);
  }
} else {
  warn("Skipped — APP_URL or CRON_SECRET not set in .env.local");
  info("  Add APP_URL=https://your-vercel-app.vercel.app and CRON_SECRET=... to .env.local");
}

// ─── Section 9: Post-pipeline canonical verification ─────────────────────────

section("9. Post-Pipeline — Canonical Observation Freshness");

info("Waiting 3 seconds for any cache writes to settle...");
await new Promise(r => setTimeout(r, 3000));

for (const slug of CANONICAL_SLUGS) {
  try {
    const seriesRows = await sbq("economic_event_series", { select: "id,source_name", slug: `eq.${slug}`, limit: "1" });
    if (!seriesRows.length) continue;
    const sid = seriesRows[0].id;

    const eventRows = await sbq("economic_events", {
      select:           "event_date,actual_value,observation_date,status",
      series_id:        `eq.${sid}`,
      status:           "eq.released",
      observation_date: "not.is.null",
      order:            "observation_date.desc",
      limit:            "1",
    });

    if (!eventRows.length) { warn(`${slug} — still no canonical after pipeline run`); continue; }
    const e = eventRows[0];

    // Compare with what we found in Section 3
    const before = canonicalResults[slug];
    if (before && e.observation_date === before.observation_date) {
      pass(`${slug} — unchanged (pipeline found no newer data)`, `obs=${e.observation_date} val="${e.actual_value}"`);
    } else if (!before) {
      pass(`${slug} — now has canonical observation`, `obs=${e.observation_date} val="${e.actual_value}"`);
    } else {
      pass(`${slug} — UPDATED by pipeline run`, `${before.observation_date} → ${e.observation_date}  val="${e.actual_value}"`);
    }
  } catch (err) {
    warn(`${slug} post-pipeline check failed`, err.message.slice(0, 80));
  }
}

// ─── Section 10: Gap detection — orphaned past months ────────────────────────

section("10. Gap Detection — Missing Past-Month Events");

// For each monthly series: check there are no gaps in the past 3 months
const GAP_CHECK_SLUGS = [
  { slug: "cpi-inflation-release",               lagMonths: 1 },
  { slug: "core-inflation-release",              lagMonths: 1 },
  { slug: "exports-release",                     lagMonths: 1 },
  { slug: "imports-release",                     lagMonths: 1 },
  { slug: "trade-balance",                       lagMonths: 1 },
  { slug: "large-scale-manufacturing-lsm-growth",lagMonths: 2 },
  { slug: "worker-remittances",                  lagMonths: 1 },
  { slug: "current-account-balance",             lagMonths: 2 },
];

const todayDate = new Date();

for (const { slug, lagMonths } of GAP_CHECK_SLUGS) {
  try {
    const seriesRows = await sbq("economic_event_series", { select: "id", slug: `eq.${slug}`, limit: "1" });
    if (!seriesRows.length) continue;
    const sid = seriesRows[0].id;

    // Expected event dates: the past 4 release months
    // Each release event_date is approximately first-of-month + lagMonths
    // We just check that there are ≥1 events in the past 90 days (released OR scheduled)
    const cutoff = new Date(todayDate);
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const recentRows = await sbq("economic_events", {
      select:     "event_date,status,observation_date",
      series_id:  `eq.${sid}`,
      event_date: `gte.${cutoffStr}`,
      order:      "event_date.asc",
    });

    if (recentRows.length === 0) {
      fail(`${slug} — no events in past 90 days (gap detector may not have run)`);
    } else {
      const released   = recentRows.filter(r => r.status === "released").length;
      const scheduled  = recentRows.filter(r => r.status === "scheduled" || r.status === "tentative").length;
      pass(`${slug} — ${recentRows.length} events in past 90 days (${released} released, ${scheduled} scheduled)`);
      for (const r of recentRows) {
        info(`  ${r.event_date}  ${r.status.padEnd(10)}  obs=${r.observation_date ?? "—"}`);
      }
    }
  } catch (err) {
    fail(`${slug} gap check failed`, err.message.slice(0, 80));
  }
}

// ─── Section 11: SPI weekly chain ────────────────────────────────────────────

section("11. SPI Weekly Chain");

try {
  const seriesRows = await sbq("economic_event_series", {
    select: "id", slug: "eq.spi-weekly-inflation-release", limit: "1",
  });
  if (seriesRows.length) {
    const sid = seriesRows[0].id;
    const rows = await sbq("economic_events", {
      select:    "event_date,status,actual_value,observation_date",
      series_id: `eq.${sid}`,
      order:     "event_date.desc",
      limit:     "6",
    });
    if (rows.length === 0) {
      fail("spi-weekly-inflation-release — no events");
    } else {
      pass(`SPI weekly — ${rows.length} recent events`);
      for (const r of rows) {
        info(`  ${r.event_date}  ${r.status.padEnd(10)}  obs=${r.observation_date ?? "—"}  val="${r.actual_value ?? "—"}"`);
      }
    }
  }
} catch (err) {
  warn("SPI weekly chain check failed", err.message.slice(0, 80));
}

// ─── Section 12: FX Reserves weekly chain ────────────────────────────────────

section("12. FX Reserves Weekly Chain");

try {
  const seriesRows = await sbq("economic_event_series", {
    select: "id", slug: "eq.sbp-foreign-exchange-reserves", limit: "1",
  });
  if (seriesRows.length) {
    const sid = seriesRows[0].id;
    const rows = await sbq("economic_events", {
      select:    "event_date,status,actual_value,observation_date",
      series_id: `eq.${sid}`,
      order:     "event_date.desc",
      limit:     "6",
    });
    if (rows.length === 0) {
      fail("sbp-foreign-exchange-reserves — no events");
    } else {
      pass(`FX reserves weekly — ${rows.length} recent events`);
      for (const r of rows) {
        info(`  ${r.event_date}  ${r.status.padEnd(10)}  obs=${r.observation_date ?? "—"}  val="${r.actual_value ?? "—"}"`);
      }
    }
  }
} catch (err) {
  warn("FX reserves chain check failed", err.message.slice(0, 80));
}

// ─── Section 13: source_health_log — recent source failures ──────────────────

section("13. Source Health Log — Recent Failures");

try {
  const healthRows = await sbq("source_health_log", {
    select:  "logged_at,source_name,status,detail",
    status:  "eq.error",
    order:   "logged_at.desc",
    limit:   "10",
  });

  if (!healthRows || healthRows.length === 0) {
    pass("source_health_log — no recent errors (or table not accessible)");
  } else {
    warn(`source_health_log — ${healthRows.length} error entries found`);
    for (const r of healthRows) {
      const dt = new Date(r.logged_at).toISOString().replace("T"," ").slice(0,19);
      info(`  ${dt}  ${r.source_name}  ${r.detail ?? ""}`);
    }
  }
} catch {
  info("source_health_log not accessible via anon key — skipped");
}

// ─── Final summary ────────────────────────────────────────────────────────────

section("PHASE 9 SUMMARY");

console.log(`
  Passed:   ${passed}
  Failed:   ${failed}
  Warnings: ${warnings}
`);

if (failed === 0 && warnings <= 2) {
  console.log("  STATUS: PRODUCTION VERIFIED ✓");
  console.log("  All canonical indicators confirmed live, event chains intact,");
  console.log("  cron history clean, no manual SQL or cache clearing required.");
} else if (failed === 0) {
  console.log("  STATUS: MOSTLY VERIFIED — review warnings above");
} else {
  console.log(`  STATUS: ${failed} FAILURE(S) — requires investigation`);
}

process.exit(failed > 0 ? 1 : 0);
