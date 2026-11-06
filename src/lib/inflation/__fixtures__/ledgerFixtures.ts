// Ledger-shaped test data for the Phase F.2e-Prep reader and harness. Test-only.
//
// Builds "what get_canonical_observation_provenance would return for each of the 26 keys" from PBS XML, WITHOUT
// using the F.2b adapter (a regex read of the raw file, rawValues()), so the reader is tested against an
// independent construction. A separate test pins that this construction equals the adapter's real output
// field-for-field, i.e. that the fixture is faithful to production rows.

import { PBS_CPI_FILE_URL, PBS_CPI_SERIES, baseLabel, monthEnd } from "@/lib/providers/pbsCpiGroupsAdapter";
import type { LedgerReads, LedgerRow, LedgerSeriesRead } from "@/lib/inflation/ledgerPanel";
import { FULL_XML, rawValues } from "@/lib/inflation/__fixtures__/pbsCpiVariants";

export const PREPARED = "2026-11-03T06:38:35+00:00"; // how PostgREST renders the timestamptz the adapter wrote
export const DATASET_ID = "2c92d746-2c93-4d9e-807e-38a79b797c10";
export const FETCHED_AT = "2026-11-06T17:27:24.680+00:00";
export const VINTAGE = "2026-11-06T17:27:25.058+00:00";

export interface LedgerFixtureOptions {
  base?: string;
  preparedAt?: string | null;
  dataSetId?: string;
}

function unit(kind: string, base: string): string {
  if (kind === "headlineIndex" || kind === "groupIndex") return `Index (${baseLabel(base)}=100)`;
  if (kind === "weightTotal") return "% of basket (all groups)";
  return "% of basket";
}

/** One ledger row per observation of every one of the 26 series in `xml`, in the RPC's order (newest first). */
export function ledgerReadsFromXml(xml: string = FULL_XML, options: LedgerFixtureOptions = {}): Record<string, LedgerSeriesRead> {
  const base = options.base ?? "2015/2016";
  const raw = rawValues(xml);
  const reads: Record<string, LedgerSeriesRead> = {};
  for (const def of PBS_CPI_SERIES) {
    const series = raw.get(def.sdmxIndicator);
    const months = series ? [...series.keys()].sort() : [];
    const rows: LedgerRow[] = months
      .map((month) => {
        const { n, text } = (series as NonNullable<typeof series>).get(month) as { n: number; text: string };
        return {
          observationPeriod: monthEnd(month),
          value: n,
          unit: unit(def.kind, base),
          vintage: VINTAGE,
          releaseDate: null,
          sourceUpdatedAt: options.preparedAt === undefined ? PREPARED : options.preparedAt,
          fetchedAt: FETCHED_AT,
          qualityStatus: "official",
          sourceSeriesId: def.sdmxIndicator,
          sourceReference: {
            file: PBS_CPI_FILE_URL,
            dataSetId: options.dataSetId ?? DATASET_ID,
            sdmxIndicator: def.sdmxIndicator,
            dataDomain: "CPI",
            refArea: "PK",
            frequency: "M",
            basePeriod: base,
            sourceValue: text,
          },
        } satisfies LedgerRow;
      })
      .reverse();
    reads[def.indicatorKey] = { ok: true, rows, truncated: false };
  }
  return reads;
}

// ── small, named mutations (each changes ONE thing in an otherwise valid read) ──
type Reads = Record<string, LedgerSeriesRead>;
const rowsOf = (reads: Reads, key: string): LedgerRow[] => {
  const r = reads[key];
  if (!r || !r.ok) throw new Error(`fixture: ${key} has no rows`);
  return [...r.rows];
};
const put = (reads: Reads, key: string, rows: LedgerRow[], truncated = false): Reads => ({ ...reads, [key]: { ok: true, rows, truncated } });

export function mapRows(reads: Reads, key: string, fn: (row: LedgerRow) => LedgerRow | null): Reads {
  return put(reads, key, rowsOf(reads, key).map(fn).filter((r): r is LedgerRow => r !== null));
}
export function dropMonth(reads: Reads, key: string, month: string): Reads {
  return mapRows(reads, key, (r) => (r.observationPeriod.startsWith(month) ? null : r));
}
export function dropKey(reads: Reads, key: string): Reads {
  const next = { ...reads };
  delete next[key];
  return next;
}
export function failKey(reads: Reads, key: string, error = "connection reset"): Reads {
  return { ...reads, [key]: { ok: false, error } };
}
export function emptyKey(reads: Reads, key: string): Reads {
  return put(reads, key, []);
}
export function setValue(reads: Reads, key: string, month: string, value: number, keepText = false): Reads {
  return mapRows(reads, key, (r) =>
    r.observationPeriod.startsWith(month) ? { ...r, value, sourceReference: keepText ? r.sourceReference : { ...(r.sourceReference ?? {}), sourceValue: String(value) } } : r,
  );
}
export function setRefField(reads: Reads, key: string, field: string, value: unknown, month?: string): Reads {
  return mapRows(reads, key, (r) => (month === undefined || r.observationPeriod.startsWith(month) ? { ...r, sourceReference: { ...(r.sourceReference ?? {}), [field]: value } } : r));
}
export function setAllRefField(reads: Reads, field: string, value: unknown): Reads {
  let out = reads;
  for (const def of PBS_CPI_SERIES) out = setRefField(out, def.indicatorKey, field, value);
  return out;
}
export function addRow(reads: Reads, key: string, row: LedgerRow): Reads {
  return put(reads, key, [row, ...rowsOf(reads, key)]);
}
export function truncateKey(reads: Reads, key: string): Reads {
  const r = reads[key];
  if (!r || !r.ok) throw new Error("fixture");
  return { ...reads, [key]: { ...r, truncated: true } };
}
export function asReads(reads: Reads): LedgerReads {
  return reads;
}
/** The newest row of a series (rows are newest first), for building a "next month" row in a test. */
export function newestRow(reads: Reads, key: string): LedgerRow {
  return rowsOf(reads, key)[0];
}
