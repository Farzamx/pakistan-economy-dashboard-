// Phase F.2e-Prep — comparison harness (test/verification support; NOT used by the page).
//
// Proves that two CpiGroupPanels — one built from PBS's live file by the F.1 parser, one assembled from the
// observation ledger — produce the SAME analytical model, value for value. Comparison is EXACT (===), not
// approximate: both paths start from the same published decimal text and the same arithmetic, so any difference at
// all means a source, a precision or a transport problem and must be seen.
//
// What is compared, with how many values each (so "equal" can be read as "N things were actually checked"):
//   months · headline index · 12 group indices · 12 weights ·
//   derived by buildGroupModel: group YoY · group MoM · contributions to headline YoY · contributions to MoM ·
//   "other groups" YoY/MoM · the waterfall between two months.

import { buildWaterfall } from "@/lib/inflation/analytics";
import type { CpiGroupPanel } from "@/lib/inflation/pbsGroups";
import type { MonthKey } from "@/lib/inflation/periods";
import { buildGroupModel, type GroupModel } from "@/lib/inflation/viewModel";

export interface ReconCheck {
  name: string;
  ok: boolean;
  /** Number of individual numbers compared. */
  compared: number;
  /** Largest |difference| seen (0 when everything is bit-identical). */
  maxAbsDiff: number;
  detail?: string;
}

export interface Reconciliation {
  ok: boolean;
  totalCompared: number;
  checks: ReconCheck[];
}

class Tally {
  compared = 0;
  maxAbsDiff = 0;
  firstMismatch: string | null = null;
  add(label: string, a: number | undefined, b: number | undefined): void {
    this.compared++;
    if (a === b) return;
    const diff = a === undefined || b === undefined ? Infinity : Math.abs(a - b);
    this.maxAbsDiff = Math.max(this.maxAbsDiff, diff);
    this.firstMismatch ??= `${label}: ${a} vs ${b}`;
  }
  check(name: string): ReconCheck {
    return { name, ok: this.firstMismatch === null, compared: this.compared, maxAbsDiff: this.maxAbsDiff, detail: this.firstMismatch ?? undefined };
  }
}

function compareMaps(name: string, a: ReadonlyMap<MonthKey, number>, b: ReadonlyMap<MonthKey, number>): ReconCheck {
  const t = new Tally();
  for (const m of new Set([...a.keys(), ...b.keys()])) t.add(m, a.get(m), b.get(m));
  return t.check(name);
}

function compareSeries(name: string, a: readonly { month: MonthKey; value: number }[], b: readonly { month: MonthKey; value: number }[]): ReconCheck {
  const t = new Tally();
  const bm = new Map(b.map((p) => [p.month, p.value]));
  const am = new Map(a.map((p) => [p.month, p.value]));
  for (const m of new Set([...am.keys(), ...bm.keys()])) t.add(m, am.get(m), bm.get(m));
  return t.check(name);
}

function compareContributions(name: string, a: GroupModel["contribYoY"], b: GroupModel["contribYoY"]): ReconCheck {
  const t = new Tally();
  const bm = new Map(b.map((r) => [r.month, r]));
  const am = new Map(a.map((r) => [r.month, r]));
  for (const m of new Set([...am.keys(), ...bm.keys()])) {
    const x = am.get(m);
    const y = bm.get(m);
    t.add(`${m} total`, x?.total, y?.total);
    t.add(`${m} headlinePct`, x?.headlinePct, y?.headlinePct);
    for (const g of new Set([...Object.keys(x?.byGroup ?? {}), ...Object.keys(y?.byGroup ?? {})])) t.add(`${m} group ${g}`, x?.byGroup[Number(g)], y?.byGroup[Number(g)]);
  }
  return t.check(name);
}

/** `reference` is the F.1 file-parsed panel; `candidate` the ledger-assembled one. */
export function reconcilePanels(reference: CpiGroupPanel, candidate: CpiGroupPanel): Reconciliation {
  const checks: ReconCheck[] = [];

  const months = new Tally();
  months.compared = Math.max(reference.months.length, candidate.months.length);
  if (reference.months.length !== candidate.months.length || reference.months.some((m, i) => m !== candidate.months[i])) months.firstMismatch = "month lists differ";
  checks.push(months.check("months"));

  checks.push(compareMaps("headline index", reference.headlineIndex, candidate.headlineIndex));

  const weights = new Tally();
  for (const g of reference.groups) weights.add(`group ${g.groupNo}`, g.weight, candidate.groups.find((x) => x.groupNo === g.groupNo)?.weight);
  weights.compared += Math.abs(reference.groups.length - candidate.groups.length);
  if (reference.groups.length !== candidate.groups.length) weights.firstMismatch ??= "group counts differ";
  checks.push(weights.check("basket weights (12)"));

  const idx = new Tally();
  for (const g of reference.groups) {
    const c = candidate.groups.find((x) => x.groupNo === g.groupNo);
    for (const m of new Set([...g.index.keys(), ...(c?.index.keys() ?? [])])) idx.add(`group ${g.groupNo} ${m}`, g.index.get(m), c?.index.get(m));
  }
  checks.push(idx.check("group indices (12 × months)"));

  const a = buildGroupModel(reference);
  const b = buildGroupModel(candidate);
  if (!a || !b) {
    checks.push({ name: "group model builds", ok: a === null && b === null, compared: 1, maxAbsDiff: a === b ? 0 : Infinity, detail: a === null && b === null ? "neither panel supports a decomposition" : "only one panel supports a decomposition" });
  } else {
    const nos = Object.keys(a.yoy).map(Number);
    for (const [label, pick] of [["group YoY", "yoy"], ["group MoM", "mom"]] as const) {
      const t = new Tally();
      for (const n of nos) {
        const x = a[pick][n];
        const y = b[pick][n] ?? [];
        const ym = new Map(y.map((p) => [p.month, p.value]));
        const xm = new Map(x.map((p) => [p.month, p.value]));
        for (const mo of new Set([...xm.keys(), ...ym.keys()])) t.add(`group ${n} ${mo}`, xm.get(mo), ym.get(mo));
      }
      checks.push(t.check(`${label} (12 groups)`));
    }
    checks.push(compareContributions("group contributions to headline YoY", a.contribYoY, b.contribYoY));
    checks.push(compareContributions("group contributions to headline MoM", a.contribMoM, b.contribMoM));
    checks.push(compareSeries("other-groups YoY", a.otherYoY, b.otherYoY));
    checks.push(compareSeries("other-groups MoM", a.otherMoM, b.otherMoM));

    const w = new Tally();
    const months12 = a.contribYoY.map((r) => r.month);
    const to = a.latestMonth;
    const from = months12.includes(to) ? months12[Math.max(0, months12.indexOf(to) - 12)] : months12[0];
    const wa = buildWaterfall(a.contribYoY, from, to);
    const wb = buildWaterfall(b.contribYoY, from, to);
    if (!wa || !wb) w.firstMismatch = "a waterfall could not be built";
    else {
      w.add("start", wa.start, wb.start);
      w.add("end", wa.end, wb.end);
      wa.steps.forEach((s, i) => w.add(`step group ${s.groupNo}`, s.delta, wb.steps[i]?.delta));
    }
    checks.push(w.check(`waterfall ${from} → ${to}`));
  }

  return { ok: checks.every((c) => c.ok), totalCompared: checks.reduce((s, c) => s + c.compared, 0), checks };
}

/** The three figures the brief names, read OUT of a model (never put into one). */
export function referenceFigures(model: GroupModel, month: MonthKey): { foodContribution: number; totalContribution: number; transportYoY: number } | null {
  const row = model.contribYoY.find((r) => r.month === month);
  const transport = model.yoy[7]?.find((p) => p.month === month);
  if (!row || !transport) return null;
  return { foodContribution: row.byGroup[1], totalContribution: row.total, transportYoY: transport.value };
}
