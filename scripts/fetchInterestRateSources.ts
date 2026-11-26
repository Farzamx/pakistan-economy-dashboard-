// Source acquisition for the Interest Rates & Monetary Policy dashboard. READ-ONLY toward every external system: it performs HTTP GETs against the State Bank of
// Pakistan's public website and its EasyData API, and writes files into one local directory. No database, no ingestion, no ledger, no production write.
//
//   npx tsx scripts/fetchInterestRateSources.ts --retrieved 2026-11-26 [--out data/sources/interest-rates] [--only sbp|easydata]
//
// What it writes (all under --out):
//   sbp/<file>                    the SBP workbooks and PDFs byte-for-byte as served (rejected unless the bytes really are .xls/.xlsx/.pdf: some SBP links
//                                 answer 200 with an HTML page, audit finding C8)
//   easydata/<dataset>.csv        every observation EasyData returned for the listed series, verbatim (value and status exactly as the API printed them),
//                                 one row per series and date, sorted by series then date
//   manifest.json                 for every file: institution, URL (never the API key), retrieval date, SHA-256, size and row count
//
// The EasyData API key comes from the environment the project's guarded loader provides (enterScript: refuses under any test harness, then loads
// .env.local). It travels only inside sbpTransport's private curl --config file: never printed, never written, never part of a recorded URL.
//
// Importing this module does nothing: main() runs only through runIfEntryPoint() (src/lib/providers/scriptEntry.ts), like every credential script.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sbpTransportGet, sbpTransportGetBinary } from "@/lib/data/sbpTransport";
import { enterScript, runIfEntryPoint } from "@/lib/providers/scriptEntry";

export const SBP_FILES = [
  { file: "Lendingdepositrates_Arch.xls", url: "https://www.sbp.org.pk/assets/document/Lendingdepositrates_Arch.xls", kind: "xls", description: "Weighted-average lending and deposit rates, full history (half-yearly 1997-2003, monthly from Jan 2004)" },
  { file: "Lendingdepositrates.pdf", url: "https://www.sbp.org.pk/assets/document/Lendingdepositrates.pdf", kind: "pdf", description: "Weighted-average lending and deposit rates, latest month (independent check)" },
  { file: "OMO-Inject-Hist.xlsx", url: "https://www.sbp.org.pk/assets/document/OMO-Inject-Hist.xlsx", kind: "xlsx", description: "SBP open market operations: reverse repo (injection) history" },
  { file: "OMO-MopUp-Hist.xlsx", url: "https://www.sbp.org.pk/assets/document/OMO-MopUp-Hist.xlsx", kind: "xlsx", description: "SBP open market operations: repo (mop-up) history" },
  { file: "sir.pdf", url: "https://www.sbp.org.pk/assets/document/sir.pdf", kind: "pdf", description: "Structure of Interest Rates (independent check of policy rates, KIBOR, auctions, lending and deposit rates)" },
  { file: "tb.xlsx", url: "https://www.sbp.org.pk/assets/document/tb.xlsx", kind: "xlsx", description: "T-bill auction results (input of scripts/buildGovSecAuctions.ts)" },
  { file: "Pakinvestbonds.xlsx", url: "https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx", kind: "xlsx", description: "PIB auction results (input of scripts/buildGovSecAuctions.ts)" },
] as const;

/** EasyData series by dataset. Codes verified against the API on 26 Nov 2026 (docs/interest-rates-dashboard-audit.md). */
export const EASYDATA_SERIES: Record<string, readonly string[]> = {
  TS_GP_IR_SIRPR_AH: ["SBPOL0010", "SBPOL0020", "SBPOL0030"],
  TS_GP_IR_REPOMR_D: ["ORR"],
  TS_GP_BAM_SIRKIBOR_D: ["1KIBOR1W", "2KIBOR2W", "KIBOR0010", "KIBOR0020", "KIBOR0030", "6KIBOR9M", "7KIBOR12M", "8KIBOR2Y", "9KIBOR3Y"],
  TS_GP_BAM_SIRTBIL_AH: ["TB0010", "TB0020", "TB0030", "TB0040", "TB0050", "TB0060"],
  TS_GP_BAM_SIRPIBS_AH: ["PIB0010", "PIB0020", "PIB0030", "PIB0040", "PIB0050", "PIB0060", "PIB0070", "PIB0080", "PIB0090", "PIB0100", "PIB0110", "PIB0120", "PIB0130", "PIB0140", "PIB0150", "PIB0160"],
  TS_GP_PT_CPI_M: ["P00011516"],
};

export const EASYDATA_BASE = "https://easydata.sbp.org.pk/api/v1/series";
export const EASYDATA_START = "1990-01-01";
const TIMEOUT_MS = 90_000;

export interface ManifestEntry {
  path: string;
  institution: "State Bank of Pakistan";
  url: string;
  description: string;
  retrievedOn: string;
  sha256: string;
  bytes: number;
  rows?: number;
}

export interface Args {
  retrieved: string;
  out: string;
  only: "sbp" | "easydata" | null;
}

export function parseArgs(argv: string[]): Args | string {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
  };
  const retrieved = get("--retrieved");
  if (!retrieved) return "Usage: tsx scripts/fetchInterestRateSources.ts --retrieved YYYY-MM-DD [--out <dir>] [--only sbp|easydata]";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) return `--retrieved must be YYYY-MM-DD, got "${retrieved}"`;
  const only = get("--only");
  if (only !== null && only !== "sbp" && only !== "easydata") return `--only must be sbp or easydata, got "${only}"`;
  return { retrieved, out: get("--out") ?? "data/sources/interest-rates", only };
}

/** True when the bytes really are the file type the link promises (an HTML error page served with status 200 is rejected). */
export function looksLike(kind: "xls" | "xlsx" | "pdf", bytes: Buffer): boolean {
  if (kind === "xls") return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (kind === "xlsx") return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const EASYDATA_CSV_HEADER = "series_key,series_name,unit,observation_date,observation_value,observation_status,status_comments";

/** Turns one EasyData JSON response into verbatim CSV rows (no value is parsed, rounded or dropped). Throws when the response shape is not the documented one. */
export function easydataRows(body: string, expectedKey: string): string[][] {
  const json = JSON.parse(body) as { columns?: string[]; rows?: unknown[][] };
  const cols = json.columns ?? [];
  const need = ["Series Key", "Series Name", "Unit", "Observation Date", "Observation Value", "Observation Status", "Status Comments"];
  const idx = need.map((n) => cols.indexOf(n));
  if (idx.some((i) => i < 0)) throw new Error(`${expectedKey}: unexpected EasyData columns ${JSON.stringify(cols)}`);
  if (!json.rows || json.rows.length === 0) throw new Error(`${expectedKey}: EasyData returned no rows`);
  return json.rows.map((r) => {
    const row = idx.map((i) => (r[i] === null || r[i] === undefined ? "" : String(r[i])));
    if (row[0] !== expectedKey) throw new Error(`${expectedKey}: response contains a row for ${row[0]}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row[3])) throw new Error(`${expectedKey}: unexpected date "${row[3]}"`);
    return row;
  });
}

export function toCsv(rows: string[][]): string {
  const sorted = [...rows].sort((a, b) => (a[0] === b[0] ? (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
  return [EASYDATA_CSV_HEADER, ...sorted.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
}

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function readApiKey(): string {
  const key = process.env.SBP_EASYDATA_API_KEY;
  if (!key) throw new Error("SBP_EASYDATA_API_KEY is not set (expected in .env.local)");
  return key;
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    console.error(args);
    return 2;
  }
  const manifestPath = path.join(args.out, "manifest.json");
  const previous: ManifestEntry[] = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { files: ManifestEntry[] }).files : [];
  const entries = new Map(previous.map((e) => [e.path, e]));

  if (args.only !== "easydata") {
    mkdirSync(path.join(args.out, "sbp"), { recursive: true });
    for (const f of SBP_FILES) {
      const { status, body } = await sbpTransportGetBinary(f.url, TIMEOUT_MS);
      if (status !== 200) throw new Error(`${f.url} returned HTTP ${status}; nothing substituted`);
      if (!looksLike(f.kind, body)) throw new Error(`${f.url} did not return a ${f.kind} file (first bytes ${JSON.stringify(body.subarray(0, 12).toString("latin1"))}); nothing substituted`);
      const rel = `sbp/${f.file}`;
      writeFileSync(path.join(args.out, rel), body);
      entries.set(rel, { path: rel, institution: "State Bank of Pakistan", url: f.url, description: f.description, retrievedOn: args.retrieved, sha256: sha256(body), bytes: body.length });
      console.log(`sbp      ${f.file.padEnd(30)} ${body.length} bytes  sha256 ${sha256(body).slice(0, 16)}…`);
    }
  }

  if (args.only !== "sbp") {
    const key = readApiKey();
    mkdirSync(path.join(args.out, "easydata"), { recursive: true });
    for (const [dataset, codes] of Object.entries(EASYDATA_SERIES)) {
      const rows: string[][] = [];
      for (const code of codes) {
        const seriesKey = `${dataset}.${code}`;
        const params = new URLSearchParams({ api_key: key, start_date: EASYDATA_START, format: "json" });
        const { status, body } = await sbpTransportGet(`${EASYDATA_BASE}/${seriesKey}/data?${params.toString()}`, TIMEOUT_MS);
        if (status !== 200) throw new Error(`EasyData returned HTTP ${status} for ${seriesKey}; nothing substituted`);
        const got = easydataRows(body, seriesKey);
        rows.push(...got);
        console.log(`easydata ${seriesKey.padEnd(36)} ${got.length} rows  ${got.map((r) => r[3]).sort()[0]} .. ${got.map((r) => r[3]).sort().at(-1)}`);
      }
      const csv = toCsv(rows);
      const rel = `easydata/${dataset}.csv`;
      writeFileSync(path.join(args.out, rel), csv, "utf8");
      entries.set(rel, {
        path: rel,
        institution: "State Bank of Pakistan",
        url: `${EASYDATA_BASE}/${dataset}.{${codes.join(",")}}/data?start_date=${EASYDATA_START}&format=json (API key omitted)`,
        description: `SBP EasyData dataset ${dataset}, series ${codes.join(", ")}, verbatim`,
        retrievedOn: args.retrieved,
        sha256: sha256(csv),
        bytes: Buffer.byteLength(csv),
        rows: rows.length,
      });
    }
  }

  const files = [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(manifestPath, JSON.stringify({ purpose: "Official source files behind the Interest Rates & Monetary Policy dashboard. Verified by scripts/buildInterestRates.ts before any parsing.", files }, null, 2) + "\n", "utf8");
  console.log(`wrote ${manifestPath} (${files.length} files)`);
  return 0;
}

runIfEntryPoint({ filename: __filename, requireMain: typeof require !== "undefined" && require.main === module }, () => {
  enterScript("fetch:interest-rate-sources");
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(`fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    },
  );
});
