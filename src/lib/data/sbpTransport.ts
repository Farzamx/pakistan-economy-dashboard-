// SBP EasyData HTTP transport.
//
// WHY THIS EXISTS
// easydata.sbp.org.pk is fronted by Cloudflare bot management, which rejects
// Node's HTTP stack outright. Measured on the ingestion machine, same network,
// same minute, same authenticated URL, same API key:
//
//   curl (Windows Schannel) + browser UA .......... 200
//   Node fetch/undici + browser UA ................ 403
//   Node fetch/undici, no UA (previous code) ...... 403
//   node:https + browser headers .................. 403
//   node:https + ALPN pinned to http/1.1 .......... 403
//   node:https + Chrome cipher order + curves ..... 403
//   node:https + forced TLSv1.2 ................... 403
//
// Controls run alongside those: Node reached an unrelated Cloudflare-fronted
// host successfully (so Node is not broadly blocked), and curl still returned
// 200 immediately before and after (so the Node failures are transport-specific,
// not a temporal outage). An unauthenticated Node request to SBP returns 403
// rather than 401, meaning Node is stopped at Cloudflare's edge before SBP's
// origin ever sees it — credentials are not the issue.
//
// The surviving explanation is the TLS ClientHello fingerprint: curl on Windows
// uses Schannel, Node uses OpenSSL, and the remaining differences (extension
// ordering, GREASE, signature-algorithm ordering) are not reachable from Node's
// JS API. This is the best-supported hypothesis, NOT a proven fact — the
// ClientHello bytes were never captured and Cloudflare returns no attribution.
//
// Consequence worth knowing before "fixing" this by swapping HTTP libraries:
// axios, got, node-fetch and undici all delegate TLS to Node's OpenSSL and
// therefore produce the same fingerprint and the same 403. Changing HTTP
// library cannot help; only a different TLS stack can.
//
// SCOPE
// This module is deliberately the only place a subprocess is used for data
// retrieval. It performs one HTTP GET and returns status + raw body. It does no
// parsing, no validation, no retrying, no caching and no logging — every one of
// those remains owned by the existing SBP provider and ingestion orchestrator.
//
// CREDENTIALS
// The URL carries the API key as a query parameter (SBP's own API design, see
// sbp.ts). It is therefore never passed as a command-line argument, because
// argv is readable by other processes. Instead it is written to a curl --config
// file inside a private temporary directory, which is removed on every exit
// path. The URL is never logged, and errors below deliberately carry status
// codes only — never the URL, never the body.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

/** Proven to pass Cloudflare from the ingestion machine. Not arbitrary: this exact string was the one measured. */
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** SBP's largest series is a few hundred KB of JSON; 32MB is generous headroom without being unbounded. */
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;

/** curl's own exit code for "operation timed out" (--max-time exceeded). */
const CURL_EXIT_TIMEOUT = 28;

export type SbpTransportErrorKind =
  | "curl-missing"
  | "timeout"
  | "process-failed"
  | "no-response";

/**
 * A transport-layer failure — the request never produced an HTTP status.
 * An HTTP status that simply isn't 200 is NOT this: that is returned normally
 * as { status, body } so the caller decides how to treat it, exactly as the
 * previous fetch-based code did.
 */
export class SbpTransportError extends Error {
  constructor(
    message: string,
    readonly kind: SbpTransportErrorKind,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SbpTransportError";
  }
}

interface CurlExecError {
  code?: number | string;
  killed?: boolean;
  stdout?: string;
}

/**
 * Shared curl invocation — every security property (no shell, argv-safe,
 * credentialed URL only ever in a private 0600 config file, browser UA,
 * timeout, guaranteed temp-dir cleanup) lives here exactly once. The only
 * thing that varies between callers is whether the response is genuinely
 * text (SBP EasyData's JSON) or binary (Forex_Arch.xlsx's OOXML/ZIP bytes)
 * — Node's execFile must be told which via `encoding`, because decoding a
 * binary body through UTF-8 (the default) corrupts it: invalid byte
 * sequences silently become U+FFFD, which would make an .xlsx unreadable.
 * `sbpTransportGet` and `sbpTransportGetBinary` below are thin, differ only
 * in that one parameter, and both are exercised by the exact same tests
 * this file always had for the text path.
 *
 * curl's `--write-out "%{http_code}"` appends the 3-digit status as plain
 * ASCII directly after the body regardless of encoding, so slicing the
 * trailing 3 bytes/chars off is safe and identical in both modes.
 */
async function runCurl(
  url: string,
  timeoutMs: number,
  encoding: "utf8" | "buffer",
): Promise<{ status: number; body: string | Buffer }> {
  // mkdtemp creates a directory only this user can traverse (0700 on POSIX;
  // user-scoped under %TEMP% on Windows), so the config file is not world
  // readable even momentarily.
  const dir = await mkdtemp(path.join(tmpdir(), "peic-sbp-"));
  const configPath = path.join(dir, "request.curlcfg");

  try {
    // curl --config parses `url = "..."`. Quoted so query separators are safe.
    await writeFile(configPath, `url = "${url}"\n`, { mode: 0o600 });

    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));

    let stdout: string | Buffer;
    try {
      // execFile, not exec: arguments are passed directly to the process with
      // no shell involved, so there is no quoting or injection surface and no
      // dependency on bash/sh. Works identically on Windows and POSIX.
      const result = await execFileAsync(
        "curl",
        [
          "--config", configPath,
          "--silent",
          "--show-error",
          "--user-agent", BROWSER_USER_AGENT,
          "--max-time", String(timeoutSeconds),
          // Appends the status to stdout after the body. Avoids a second temp
          // file for the body while keeping status unambiguous: it is always
          // exactly the trailing 3 digits.
          "--write-out", "%{http_code}",
        ],
        {
          maxBuffer: MAX_RESPONSE_BYTES,
          // Belt and braces: if curl itself hangs past its own --max-time,
          // Node still reclaims the process.
          timeout: timeoutMs + 5_000,
          windowsHide: true,
          encoding: encoding === "buffer" ? "buffer" : "utf8",
        },
      );
      stdout = result.stdout;
    } catch (err) {
      const e = err as CurlExecError;

      if (e.code === "ENOENT") {
        throw new SbpTransportError(
          "curl executable not found on PATH — required for SBP ingestion",
          "curl-missing",
          err,
        );
      }
      if (e.code === CURL_EXIT_TIMEOUT || e.killed) {
        throw new SbpTransportError(
          `SBP request timed out after ${timeoutSeconds}s`,
          "timeout",
          err,
        );
      }
      // Deliberately reports the exit code only. curl's stderr can echo the
      // request URL, which carries the API key, so it is never surfaced.
      throw new SbpTransportError(
        `curl failed with exit code ${String(e.code ?? "unknown")}`,
        "process-failed",
        err,
      );
    }

    // Body followed by the 3-digit status. "000" means curl produced no HTTP
    // response at all (DNS failure, connection refused, TLS failure).
    const isBuffer = Buffer.isBuffer(stdout);
    const statusStr = isBuffer ? (stdout as Buffer).subarray(-3).toString("ascii") : (stdout as string).slice(-3);
    const status = Number(statusStr);
    const body: string | Buffer = isBuffer ? (stdout as Buffer).subarray(0, -3) : (stdout as string).slice(0, -3);

    if (!Number.isFinite(status) || status === 0) {
      throw new SbpTransportError(
        "SBP request produced no HTTP response (connection or TLS failure)",
        "no-response",
      );
    }

    return { status, body };
  } finally {
    // Runs on success, on HTTP error, and on every throw above — the config
    // file containing the credentialed URL never outlives the request.
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Performs one GET and returns the HTTP status and raw TEXT response body.
 * Unchanged behavior/signature from before this file supported binary
 * responses — SBP EasyData's JSON responses continue to flow through
 * exactly this path.
 *
 * Fails loudly: a missing curl binary, a timeout, or a curl process failure all
 * throw SbpTransportError rather than returning a fabricated response. It never
 * substitutes cached or stale data — higher layers own fallback behaviour.
 *
 * @param url        Full request URL. May contain credentials; never logged.
 * @param timeoutMs  Wall-clock budget, matching the previous fetch timeout.
 */
export async function sbpTransportGet(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  const { status, body } = await runCurl(url, timeoutMs, "utf8");
  return { status, body: body as string };
}

/**
 * Same transport, same security properties, for a genuinely BINARY response
 * (e.g. Forex_Arch.xlsx's OOXML/ZIP bytes) — see runCurl's own comment for
 * why this must not decode through UTF-8. Added for the Net Liquid FX
 * Reserves provider (Phase 8.10B); www.sbp.org.pk exhibits the same
 * TLS-fingerprint-based Cloudflare behavior already diagnosed for
 * easydata.sbp.org.pk (see this file's header and the Phase 8.10A
 * investigation), so the identical curl+Schannel+browser-UA transport
 * applies unchanged — only the response encoding differs.
 *
 * @param url        Full request URL. Public/unauthenticated for this caller, but treated with the same care regardless.
 * @param timeoutMs  Wall-clock budget.
 */
export async function sbpTransportGetBinary(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; body: Buffer }> {
  const { status, body } = await runCurl(url, timeoutMs, "buffer");
  return { status, body: body as Buffer };
}
