// "What the data shows": plain statements of fact computed from the view model, each with its period and source.
//
// Rules this file keeps (and findings.test.ts pins):
//   - every sentence states something the numbers say; none says WHY (no causes, no forecasts, no advice);
//   - the real policy rate is always called ex-post and headline-based, never "the" real interest rate;
//   - a figure that cannot be computed is omitted, never estimated or softened into a guess.

import { pct, signedPp, formatDate } from "@/lib/policyRate/format";
import { monthLabel } from "@/lib/inflation/periods";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

export interface Finding {
  id: string;
  text: string;
  /** Period the statement is about. */
  period: string;
  source: string;
}

const SBP = "SBP EasyData (policy rate)";

export function buildFindings(m: PolicyRateViewModel): Finding[] {
  const s = m.stats;
  if (!s) return [];
  const out: Finding[] = [];

  out.push({
    id: "current",
    text: s.previous
      ? `The policy rate is ${pct(s.current.value)}, in effect since ${formatDate(s.current.since)}; the change on that date was ${signedPp(s.current.value - s.previous.value)} pp from ${pct(s.previous.value)}.`
      : `The policy rate is ${pct(s.current.value)} (the only level in the series).`,
    period: formatDate(s.current.since),
    source: SBP,
  });

  const latest = m.cycles[m.cycles.length - 1];
  if (latest) {
    out.push({
      id: "latest-cycle",
      text: `The latest run of changes is ${latest.direction === "tightening" ? "a tightening" : "an easing"} run: ${latest.changes} ${latest.direction === "tightening" ? (latest.changes === 1 ? "increase" : "increases") : latest.changes === 1 ? "cut" : "cuts"} between ${formatDate(latest.startDate)} and ${formatDate(latest.endDate)}, ${signedPp(latest.totalChange)} pp in total (${pct(latest.startRate)} to ${pct(latest.endRate)}).`,
      period: `${formatDate(latest.startDate)} – ${formatDate(latest.endDate)}`,
      source: SBP,
    });
  }

  out.push({
    id: "history",
    text: `Since ${formatDate(s.firstDate)} the series records ${s.changeCount} rate changes: ${s.hikes} increases and ${s.cuts} cuts, in ${m.cycles.length} runs (${m.cycles.filter((c) => c.direction === "tightening").length} tightening, ${m.cycles.filter((c) => c.direction === "easing").length} easing). Meetings that left the rate unchanged are not in the series.`,
    period: `${formatDate(s.firstDate)} – ${formatDate(s.current.since)}`,
    source: SBP,
  });

  out.push({
    id: "peak",
    text: `The highest rate in the series is ${pct(s.highest.value)}, from ${formatDate(s.highest.from)}${s.highest.until ? ` until ${formatDate(s.highest.until)}` : " to the present"}. The lowest is ${pct(s.lowest.value)}, from ${formatDate(s.lowest.from)}${s.lowest.until ? ` until ${formatDate(s.lowest.until)}` : " to the present"}.`,
    period: `${formatDate(s.firstDate)} – ${formatDate(s.asOf)}`,
    source: SBP,
  });

  if (s.largestHike && s.largestCut) {
    out.push({
      id: "largest",
      text: `The largest single increase was ${signedPp(s.largestHike.change)} pp on ${formatDate(s.largestHike.date)} (${pct(s.largestHike.from)} to ${pct(s.largestHike.to)}); the largest single cut was ${signedPp(s.largestCut.change)} pp on ${formatDate(s.largestCut.date)} (${pct(s.largestCut.from)} to ${pct(s.largestCut.to)}).`,
      period: `${formatDate(s.firstDate)} – ${formatDate(s.current.since)}`,
      source: SBP,
    });
  }

  out.push({
    id: "average",
    text: `Weighted by how long each rate was in effect, the average policy rate from ${formatDate(s.firstDate)} to ${formatDate(s.asOf)} is ${pct(s.timeWeightedMean)}.`,
    period: `${formatDate(s.firstDate)} – ${formatDate(s.asOf)}`,
    source: SBP,
  });

  const r = m.realHeadline[m.realHeadline.length - 1];
  if (r) {
    out.push({
      id: "real-now",
      text: `Against headline inflation of ${pct(r.inflation, 1)} in ${monthLabel(r.month)}, the real policy rate is ${pct(r.real)} (${r.real >= 0 ? "positive" : "negative"}). This is the policy rate set against inflation that has already happened, not a market or expected real rate.`,
      period: monthLabel(r.month),
      source: "SBP EasyData (policy rate, headline CPI inflation)",
    });
    const low = m.realHeadline.reduce((a, b) => (b.real < a.real ? b : a));
    const high = m.realHeadline.reduce((a, b) => (b.real > a.real ? b : a));
    out.push({
      id: "real-range",
      text: `Over the ${m.realHeadline.length} months for which both exist (${monthLabel(m.realHeadline[0].month)} – ${monthLabel(r.month)}), the real policy rate was lowest at ${pct(low.real)} in ${monthLabel(low.month)} (policy rate ${pct(low.policy)}, inflation ${pct(low.inflation, 1)}) and highest at ${pct(high.real)} in ${monthLabel(high.month)} (policy rate ${pct(high.policy)}, inflation ${pct(high.inflation, 1)}).`,
      period: `${monthLabel(m.realHeadline[0].month)} – ${monthLabel(r.month)}`,
      source: "SBP EasyData (policy rate, headline CPI inflation)",
    });
  }

  if (m.tbillLatest) {
    const diff = m.tbillLatest.value - s.current.value;
    out.push({
      id: "tbill",
      text: `The latest 3-month T-bill auction yield in the data (${formatDate(m.tbillLatest.date)}) was ${pct(m.tbillLatest.value)}, ${Math.abs(diff).toFixed(2)} pp ${diff >= 0 ? "above" : "below"} the current policy rate. These are different instruments: the yield is set at auction, the policy rate by the Monetary Policy Committee.`,
      period: formatDate(m.tbillLatest.date),
      source: "SBP EasyData (3M T-bill yield, policy rate)",
    });
  }

  const lastUs = m.usDifferential[m.usDifferential.length - 1];
  if (lastUs) {
    out.push({
      id: "us-gap",
      text: `In ${monthLabel(lastUs.month)} Pakistan's policy rate was ${Math.abs(lastUs.value).toFixed(2)} pp ${lastUs.value >= 0 ? "above" : "below"} the US effective federal funds rate.`,
      period: monthLabel(lastUs.month),
      source: "SBP EasyData (policy rate), FRED (federal funds)",
    });
  }

  return out;
}
