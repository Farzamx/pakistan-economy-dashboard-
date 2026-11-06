// Variants of the real PBS CPI file for the F.2b adapter, dry-run and reconciliation
// tests. Each helper starts from REAL data and changes one thing, so a test says
// exactly which defect it introduces. Test-only.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCpiGroupPanel } from "@/lib/inflation/pbsGroups";

/** The full real file: 26 series × 52 months (2022-07 … 2026-10), unmodified apart from a leading comment. */
export const FULL_XML = readFileSync(join(__dirname, "pbsCpiFull.xml"), "utf-8");
/** The trimmed real slice F.1's tests use: 26 series × 17 months. */
export const TRIMMED_XML = readFileSync(join(__dirname, "pbsCpiSample.xml"), "utf-8");

const seriesRe = (indicator: string) => new RegExp(`(<Series [^>]*INDICATOR="${indicator}"[^>]*>)([\\s\\S]*?)(</Series>)`);
const obsRe = /<Obs TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]*)"\/>/g;

/** Rewrite one series' observations. `fn` returns a new value, or null to drop the observation. */
export function editSeries(xml: string, indicator: string, fn: (month: string, value: string) => string | null): string {
  if (!seriesRe(indicator).test(xml)) throw new Error(`fixture: series ${indicator} not found`);
  return xml.replace(seriesRe(indicator), (_m, open: string, body: string, close: string) => {
    const next = body.replace(obsRe, (_o, t: string, v: string) => {
      const out = fn(t, v);
      return out === null ? "" : `<Obs TIME_PERIOD="${t}" OBS_VALUE="${out}"/>`;
    });
    return `${open}${next}${close}`;
  });
}

export const ALL_INDICATORS: string[] = [
  "PCPI_IX",
  ...Array.from({ length: 12 }, (_, i) => `PCPI_CP_${String(i + 1).padStart(2, "0")}_IX`),
  "PCPI_WT",
  ...Array.from({ length: 12 }, (_, i) => `PCPI_CP_${String(i + 1).padStart(2, "0")}_WT`),
];

/** Remove one month from EVERY series — what an earlier edition of the file looks like (a real, consistent file). */
export function withoutMonth(xml: string, month: string): string {
  return ALL_INDICATORS.reduce((acc, ind) => editSeries(acc, ind, (m, v) => (m === month ? null : v)), xml);
}

/** Overwrite a series attribute, e.g. BASE_PER. */
export function setSeriesAttr(xml: string, indicator: string, attr: string, value: string): string {
  // Edit within the whole opening tag: attribute order in the file is not alphabetical or fixed.
  const tagRe = new RegExp(`<Series [^>]*INDICATOR="${indicator}"[^>]*>`);
  const tag = tagRe.exec(xml)?.[0];
  if (!tag) throw new Error(`fixture: series ${indicator} not found`);
  const attrRe = new RegExp(`(${attr}=")[^"]*(")`);
  if (!attrRe.test(tag)) throw new Error(`fixture: ${attr} not found on ${indicator}`);
  return xml.replace(tag, tag.replace(attrRe, `$1${value}$2`));
}

/** Overwrite the same attribute on every series that carries it. */
export function setAllSeriesAttr(xml: string, attr: string, value: string): string {
  return xml.replace(new RegExp(`(<Series [^>]*?${attr}=")[^"]*(")`, "g"), `$1${value}$2`);
}

/** Add a second copy of an observation to a series (a duplicated period). */
export function duplicateObs(xml: string, indicator: string, month: string): string {
  if (!seriesRe(indicator).test(xml)) throw new Error(`fixture: series ${indicator} not found`);
  return xml.replace(seriesRe(indicator), (_m, open: string, body: string, close: string) => {
    const hit = new RegExp(`<Obs TIME_PERIOD="${month}" OBS_VALUE="[^"]*"/>`).exec(body);
    if (!hit) throw new Error("fixture: observation to duplicate not found");
    return `${open}${body}${hit[0]}${close}`;
  });
}

/**
 * A REVISION a real publisher could make: group `groupNo`'s index in `month` moves by
 * `delta`, and the headline index moves by that group's share of the basket, so the
 * fixed-weight identity still holds exactly. It is a coherent file, not a corrupted one.
 */
export function reviseGroupIndex(xml: string, groupNo: number, month: string, delta: number): string {
  const panel = parseCpiGroupPanel(xml).panel;
  if (!panel) throw new Error("fixture: base file must be valid to revise it");
  const wSum = panel.groups.reduce((s, g) => s + g.weight, 0);
  const g = panel.groups.find((x) => x.groupNo === groupNo)!;
  const headlineDelta = (g.weight / wSum) * delta;
  const ind = `PCPI_CP_${String(groupNo).padStart(2, "0")}_IX`;
  const bump = (d: number) => (m: string, v: string) => (m === month ? String(Number(v) + d) : v);
  return editSeries(editSeries(xml, ind, bump(delta)), "PCPI_IX", bump(headlineDelta));
}

/** Replace the header's <Prepared> value (or remove the element when `value` is null). */
export function setPrepared(xml: string, value: string | null): string {
  if (value === null) return xml.replace(/<message:Prepared>[^<]*<\/message:Prepared>\s*/, "");
  return xml.replace(/(<message:Prepared>)[^<]*(<\/message:Prepared>)/, `$1${value}$2`);
}

export function removeDataSetId(xml: string): string {
  return xml.replace(/<message:DataSetID>[^<]*<\/message:DataSetID>\s*/, "");
}

/** Every observation in the file as month → numeric value, read independently of the adapter. */
export function rawValues(xml: string): Map<string, Map<string, { n: number; text: string }>> {
  const out = new Map<string, Map<string, { n: number; text: string }>>();
  for (const s of xml.matchAll(/<Series [^>]*INDICATOR="([^"]+)"[^>]*>([\s\S]*?)<\/Series>/g)) {
    const m = new Map<string, { n: number; text: string }>();
    for (const o of s[2].matchAll(/<Obs TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]+)"\/>/g)) m.set(o[1], { n: Number(o[2]), text: o[2] });
    out.set(s[1], m);
  }
  return out;
}
