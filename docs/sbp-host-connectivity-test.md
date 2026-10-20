# SBP EasyData — candidate-host connectivity test

**Purpose.** Decide whether a machine other than the current laptop can serve as
the SBP ingestion host. A host is *not viable* until it passes every stage below.
This procedure is **read-only**: it ingests nothing, writes nothing, and changes
no configuration on this project or on SBP.

**Status.** Draft for review (Phase 21). Nothing here has been run on any
candidate host. Stage 2 needs the SBP API key on the candidate and is therefore
gated on a separate, explicit approval — do not start it from this document alone.

## Why a test is required, and what is and is not known

- `src/lib/data/sbpTransport.ts` records that `easydata.sbp.org.pk` is behind
  Cloudflare bot management. On the laptop, **curl using Windows Schannel +
  a browser User-Agent returns 200, while Node (undici and `node:https`, even with
  browser headers) returns 403**. The best-supported explanation is the TLS
  ClientHello fingerprint; it is a hypothesis, not a proven fact.
- Ingestion therefore shells out to `curl`. **The TLS library behind that curl
  matters.** Windows curl uses Schannel (proven). Linux/macOS curl normally uses
  OpenSSL/LibreSSL, whose fingerprint is *untested against this endpoint*. A Linux
  host can fail even though the laptop works.
- The earlier "Vercel / GitHub Actions / Supabase Edge get 403" result does not
  establish that those *networks* are blocked. `.github/workflows/sbp-connectivity-probe.yml`
  notes those tests sent no User-Agent (the laptop also gets 403 with a default
  UA), and `sbpTransport.ts` records that **Node's own HTTP stack gets 403 even
  from the laptop with browser headers**. Vercel and Supabase Edge run Node/Deno
  HTTP stacks, so their 403s are explained by the client alone. Cloud hosts are
  therefore **not proven blocked**, and equally **not proven viable** (that
  probe workflow has not been run as far as this repo shows). Only the
  measurements below can decide.
- A `401` without a key is a *positive* signal: only SBP's origin can emit it, so
  the request passed Cloudflare. A `403` is Cloudflare's edge refusing it.

## Ground rules (apply to every stage)

1. Never print, log, or put the API key in a command line, URL shown on screen,
   shell history, CI log or chat. Stage 2 reads it from a mode-0600 file / protected
   environment and passes it only through a curl `--config` file, like
   `sbpTransport.ts` does.
2. Never print or store a response body. Print only: HTTP status, timing,
   an allow-listed set of headers, and (Stage 2) a row *count*.
3. One request per probe. No loops faster than one request per 30 s. Do not run
   `npm run ingest:sbp` on a candidate host as a "test".
4. Do not point the candidate at production write paths. Reads of public RPCs
   only (Stage 3).

## Stage 0 — record the host

Record (none of this is secret): OS and version, `curl --version` first line
(note the TLS backend: Schannel / OpenSSL / etc.), public egress IP class
(residential / office / datacenter), always-on schedule, and who owns the box.
Egress identity from Cloudflare's own trace endpoint:

```
curl -s --max-time 25 https://www.cloudflare.com/cdn-cgi/trace | grep -E '^(ip|loc|colo|http|tls)='
```

## Stage 1 — unauthenticated edge test (no credential involved)

Linux/macOS (bash):

```bash
#!/usr/bin/env bash
set -uo pipefail
URL="https://easydata.sbp.org.pk/api/v1/series/TS_GP_BAM_M2_W.M000070/data?format=json"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
ALLOW='^(HTTP/|server:|cf-ray:|cf-mitigated:|content-type:|retry-after:|x-ratelimit)'
probe () { label="$1"; shift; h="$(mktemp)"
  r="$(curl -s -o /dev/null -D "$h" -w '%{http_code} %{time_total}' --max-time 25 "$@" "$URL" 2>/dev/null || echo '000 0')"
  echo "$label status=${r%% *} time=${r##* }s"; grep -iE "$ALLOW" "$h" | sed 's/^/    /'; rm -f "$h"; }
probe A_default_UA
probe B_browser_UA -A "$UA"
probe C_browser_UA_plus_Accept -A "$UA" -H "Accept: application/json,text/html;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9"
```

Windows (PowerShell), using the system `curl.exe`:

```powershell
$u="https://easydata.sbp.org.pk/api/v1/series/TS_GP_BAM_M2_W.M000070/data?format=json"
$ua="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
"B_browser_UA status=" + (curl.exe -s -o NUL -w "%{http_code}" --max-time 25 -A $ua $u)
```

**Pass:** probe B and C return `401` (origin reached; key missing).
**Fail:** B or C return `403`, or `Content-Type: text/html` with a Cloudflare
challenge, or `cf-mitigated: challenge`. **Inconclusive:** `000` (re-run; check
the Stage 0 trace). Probe A is a control, not a pass/fail input: the laptop
baseline was A=403, B=401, C=401, but a different host may answer A differently
and that is neither good nor bad on its own.

**Stage 1 must also be run against the host the Net Liquid FX Reserves task
reads** (`https://www.sbp.org.pk/assets/document/…`, fetched through the same
curl transport — see `sbpTransportGetBinary`), using probe B's header shape and
an unauthenticated `GET` of `https://www.sbp.org.pk/`. Any `403` there means that
task could not move to the candidate even if EasyData works. The World Bank,
FRED and Yahoo jobs use Node `fetch` today and are not subject to this
curl/TLS concern, but still belong in Stage 3.

## Stage 2 — authenticated single-series fetch (needs separate approval)

Only if Stage 1 passed. One request for one series, asserting status `200` and a
parseable `{columns, rows}` body with `rows.length > 0`. Print **only** the
status and the row count.

- The key reaches the candidate via the owner's own secure channel, never via
  chat or this repository, into a file readable only by the service account.
- Build the request exactly as production does: a curl `--config` file containing
  `url = "…?format=json&api_key=…"`, `--user-agent` set to the browser UA above,
  `--max-time 60`, body to a temp file that is parsed for its row count and then
  deleted. The URL, the config file and the body must never be echoed.
- Do not rotate or revoke the key as part of the test. When testing ends, delete
  the key file from the candidate and confirm with a directory listing.

**Pass:** `200` and `rows.length > 0`. **Fail:** `401/403/429` or an unparseable
body. A `429` or any `retry-after` / `x-ratelimit-*` header must be recorded — it
is the first real evidence of SBP's rate limit, which is currently unknown.

## Stage 3 — everything else the host would need (read-only)

From the candidate, with no credentials except the public anon key already used by
the website:

- Supabase reachability: POST `get_cron_run_history` (`p_job_name`:
  `sbp-local-ingestion`, `p_limit`: 1) → expect `200` JSON. This is the same public
  read RPC the dashboard uses; it writes nothing. The anon key is public, but pass
  it from an environment variable rather than typing it into the command line so
  it does not land in shell history. Print only the status code and row count.
  Never call `log_cron_run`, `log_source_health`, `ingest_raw_observation` or any
  other write RPC from the candidate during this test.
- Other providers the other tasks use, **unauthenticated reachability only** (status
  code): `https://api.worldbank.org/`, `https://query1.finance.yahoo.com/`,
  `https://www.sbp.org.pk/` (used by the Net Liquid FX Reserves task), and
  `https://api.stlouisfed.org/` (FRED).
- Software: Node of the same major version as the laptop (v24.16.0 observed; the
  project declares no `engines` field), `npm ci` possible, `curl` on PATH, and the
  host's clock NTP-synchronised (the 08:00 PKT trigger depends on it).

## Stage 4 — repeatability

One green run is a snapshot, because Cloudflare policy is dynamic. Repeat Stages 1
(and 2, once approved) **at least once a day for 7 consecutive days, including the
08:00 PKT window**, and record each result. The host is viable only if **every**
run passes and the host stayed up for all of them.

## Decision table

| Result | Meaning | Action |
|---|---|---|
| Stage 1 B/C = 401 on every run, Stage 2 = 200 on every run, Stage 3 all reachable, 7/7 days | Host can reach SBP and the pipeline's dependencies | Candidate may be **proposed** for migration — a separate phase, separate approval |
| Stage 1 B/C = 403 | Edge refuses this host (IP reputation or TLS fingerprint) | Not viable. If the TLS backend is OpenSSL, note it: a Schannel/Windows host, or a different egress IP, may still work |
| Stage 1 passes, Stage 2 = 401 | Key rejected from this network or key invalid | Not viable until the key issue is resolved separately; do not rotate keys as part of the test |
| Any `429` | Rate limit hit | Record `retry-after`; do not repeat; the limit must be understood before adding more triggers anywhere |
| Mixed or intermittent results across days | Cloudflare scoring is borderline for this host | Not viable as the sole host |

## What this procedure deliberately does not do

It does not migrate ingestion, move or copy any credential, change the Windows
Task Scheduler job, alter Vercel/Supabase configuration, or run the ingestion
script. Migrating would be a separate phase with its own scope and approval.
