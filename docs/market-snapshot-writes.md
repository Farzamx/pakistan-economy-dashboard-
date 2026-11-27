# Market fallback snapshots: write control

Stage 2 remediation B, 27 Nov 2026, branch `feat/seo-growth-engine`.

## What the snapshots are

`public.market_fallback_snapshots` (migration 0018) holds one row per market symbol: the last good live value. It covers:
- gold, silver, dxy, wti, brent, natural-gas, us10y, fed-funds, pak-etf;
- the four FX pairs: usd-pkr, eur-pkr, gbp-pkr, sar-pkr.

When a live fetch fails, pages show this row ("cache-stale") instead of the hard-coded file. The table and its use are unchanged.

## The problem (before)

`savePersistedSnapshot()` upserted a row **on every successful live fetch**, which happened:
- during `next build` static generation (every Vercel Production **and Preview** build);
- on every ISR revalidation of the pages that use these providers: `/overview` every 5 minutes, and the FX and commodity pages every 15 minutes to 1 day;
- by the hourly freshness job.

Stage 2 made the FX and commodity pages public, so anonymous visitors and crawlers could trigger those revalidations, and with them the writes. The release audit found that the isolated build alone attempted 26 writes (refused by the loopback mock).

## Change made (smallest safe solution, no migration)

| Piece | Behaviour |
|---|---|
| `src/lib/marketFallbackSnapshot.ts` | Writes are **opt-in**. `savePersistedSnapshot()` returns immediately unless it runs inside `withSnapshotWrites()` (an `AsyncLocalStorage` context). Reading the fallback (`get_market_fallback_snapshot`) is unchanged and works everywhere. |
| `src/app/api/cron/global-markets-freshness/route.ts` | The **only** caller of `withSnapshotWrites()`. It is already authenticated with `Authorization: Bearer $CRON_SECRET` (401 otherwise) and already re-fetches every market symbol and the four FX pairs live, hourly (`.github/workflows/global-markets-freshness.yml`). Each successful live value is upserted, one row per symbol, idempotent as before. The Pakistan ETF, not part of the audit, is refreshed in the same context. |
| Pages, builds, ISR | Read-only. A visitor, a crawler or a build can no longer cause a write. |

### What stays the same
- **Fallback behaviour:** live → persisted snapshot → hard-coded file, still in that order.
- **Data written:** the same rows and RPC.
- **No new schedule:** no new scheduler, workflow, environment variable, dependency or database change.

### What changes for freshness

Snapshots are now refreshed hourly by the job, not opportunistically by renders. Whether a render can still refresh a stale row was checked against the cache windows:
- **The live fetches** themselves are cached for 15 minutes to an hour.
- **The FX pages** revalidate every 15 minutes.
- **Conclusion:** an hourly refresh keeps the fallback about as fresh as before for its purpose, which is to show something sensible when every live source is down.

### Tests (`src/lib/marketFallbackSnapshot.test.ts`, 12)
- No write outside the job, while the page still gets the live value.
- One upsert per symbol inside the job.
- A failed live fetch writes nothing and still falls back.
- The context does not leak to concurrent work and closes when the job ends.
- The cron route answers 401 and writes nothing for a missing, wrong, non-Bearer or unconfigured secret.
- With the secret, it writes the audited symbols and the Pakistan ETF.
- Only the cron route can enable writes.
- The RPC is called from one function, which checks the gate first.

## Risks and limits

1. **The job must run.** If the GitHub workflow stops, or `APP_URL` points somewhere other than Production, snapshots stop refreshing and fallbacks age.
   - The workflow, its schedule and its run history were **not** checked: that needs GitHub access.
   - **Owner action:** confirm recent successful runs of "Global Markets Freshness" in GitHub Actions and that `vars.APP_URL` is the Production URL.
2. **The RPC itself is still open (pre-existing, not changed here).**
   - `upsert_market_fallback_snapshot` is `SECURITY DEFINER` and granted to `anon` and `authenticated`.
   - It accepts **any** symbol key and **any** JSON.
   - Anyone holding the public anon key, which ships in the browser bundle, can call it directly. They could overwrite a symbol's fallback with fabricated values, which visitors would then see whenever the live source is down. They could also add junk rows.
   - The code change stops *the application* from writing on visitor traffic. It cannot stop *direct* calls: that needs a database change.
3. **Preview and Production builds** no longer write (the gate is closed during `next build`).

## Proposed follow-up (needs a migration, NOT done; requires the owner's approval)

Use the project's existing internal-secret pattern (migration 0011 `check_internal_secret`, as used by `log_cron_run` and `store_weekly_intelligence_snapshot`):

```sql
-- 00NN_market_snapshot_write_secret.sql (proposal only)
create or replace function public.upsert_market_fallback_snapshot_v2(p_internal_secret text, p_symbol_key text, p_kpi_json jsonb, p_source text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.check_internal_secret('notification_worker', p_internal_secret) then
    raise exception 'unauthorized';
  end if;
  if p_symbol_key not in ('gold','silver','dxy','wti','brent','natural-gas','us10y','fed-funds','pak-etf','usd-pkr','eur-pkr','gbp-pkr','sar-pkr') then
    raise exception 'unknown symbol %', p_symbol_key;
  end if;
  insert into public.market_fallback_snapshots (symbol_key, kpi_json, captured_at, source)
  values (p_symbol_key, p_kpi_json, now(), p_source)
  on conflict (symbol_key) do update set kpi_json = excluded.kpi_json, captured_at = excluded.captured_at, source = excluded.source;
end $$;
revoke all on function public.upsert_market_fallback_snapshot_v2(text, text, jsonb, text) from public;
grant execute on function public.upsert_market_fallback_snapshot_v2(text, text, jsonb, text) to anon, authenticated; -- gated by the secret
revoke execute on function public.upsert_market_fallback_snapshot(text, jsonb, text) from anon, authenticated;
```

Then `savePersistedSnapshot()` would pass `process.env.NOTIFICATION_WORKER_SECRET` (already set on Vercel for the cron logging). This is server-only and is never sent to a browser.

**Order:**
1. Apply the migration in staging.
2. Deploy the code.
3. Revoke the old grant in Production.
4. Clean up any junk rows (read-only review first).

The project has no migration history in Production (see project notes), so this needs a deliberate, reviewed rollout.
