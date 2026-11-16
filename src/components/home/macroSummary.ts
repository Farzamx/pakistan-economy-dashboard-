// The Overview's Macro Intelligence summary. Pure functions, no I/O, no model call.
//
// A deterministic template over what the engine already produced (each dimension's own state and direction) and the latest values the page already
// holds. It classifies nothing itself: every word about a dimension is the engine's state, made readable.

import type { IntelligenceSignal, SignalDirection } from "@/lib/intelligence/types";
import { DIRECTION_GLYPH, type ChangeDirection } from "./overviewFormat";

const INSUFFICIENT = "insufficient-data";

/** What a dimension's row says it rests on. Supplied by the page from figures it already displays. */
export interface DimensionInput {
  /** "CPI 9.6% · Oct 2026" */
  text: string;
  /** A note shown in the warning colour, e.g. "annual data". */
  note?: string;
  /**
   * The page's status for the series named in `text`: the SAME statusFor() result its tile, strip cell or table row shows. The card never judges
   * freshness on its own, so it cannot call an input stale that the rest of the page calls current.
   */
  status?: { tone: "current" | "due" | "delayed" | "stale" };
}

const CAUTION_BY_TONE: Partial<Record<"current" | "due" | "delayed" | "stale", string>> = { stale: "stale input", delayed: "delayed input" };

/** States that describe no direction: they take the neutral glyph whatever the engine's arithmetic direction field says. */
const NON_DIRECTIONAL_STATES = new Set(["mixed", "held"]);

export interface MacroRow {
  id: string;
  label: string;
  input: string | null;
  /** "stale input", "annual data", or both; null when the input is current. */
  caution: string | null;
  state: string;
  glyph: string;
}

export interface MacroSummary {
  ratedCount: number;
  totalCount: number;
  headline: string;
  sentences: string[];
  rows: MacroRow[];
  unrated: string[];
}

export interface MacroFacts {
  cpi?: { value: string; period: string };
  policyRate?: { value: string };
  /** Policy rate minus CPI, already formatted ("+2.4"). */
  realRate?: string;
  remittances?: { value: string; unit: string; period: string };
}

const DIRECTION: Record<SignalDirection, ChangeDirection> = { Rising: "up", Falling: "down", Flat: "flat", Unknown: "flat" };

/** "pressure-easing" -> "Pressure easing" */
export function readableState(state: string): string {
  const s = state.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Liquidity & Credit" -> "Liquidity & credit" (sentence case, as the page's other labels are). */
function sentenceCase(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

const POLICY_PHRASE: Record<string, string> = { tightening: "policy is tightening", easing: "policy is easing", held: "policy is on hold" };

function headlineFor(rated: IntelligenceSignal[]): string {
  const inflation = rated.find((s) => s.id === "inflation");
  const policy = rated.find((s) => s.id === "monetary-policy");
  if (inflation) {
    const policyPhrase = policy ? POLICY_PHRASE[policy.state] : undefined;
    return policyPhrase ? `Inflation is ${inflation.state} while ${policyPhrase}.` : `Inflation is ${inflation.state}.`;
  }
  const first = rated[0];
  if (!first) return "No dimension can be rated right now.";
  return `${sentenceCase(first.label)} is ${first.state.replace(/-/g, " ")}.`;
}

function sentencesFor(rated: IntelligenceSignal[], facts: MacroFacts): string[] {
  const out: string[] = [];
  if (facts.cpi && facts.policyRate) {
    const real = facts.realRate ? `, a real policy rate of ${facts.realRate} pp` : "";
    out.push(`CPI inflation was ${facts.cpi.value}% in ${facts.cpi.period} against a ${facts.policyRate.value}% policy rate${real}.`);
  } else if (facts.cpi) {
    out.push(`CPI inflation was ${facts.cpi.value}% in ${facts.cpi.period}.`);
  }
  const external = rated.find((s) => s.id === "external-sector");
  if (external) {
    const rem = facts.remittances ? `; remittances were ${facts.remittances.value} ${facts.remittances.unit} in ${facts.remittances.period}` : "";
    out.push(`The external sector is classified as ${external.state.replace(/-/g, " ")}${rem}.`);
  }
  return out.slice(0, 2);
}

export function buildMacroSummary(signals: readonly IntelligenceSignal[], inputs: Record<string, DimensionInput | undefined>, facts: MacroFacts): MacroSummary {
  const rated = signals.filter((s) => s.state !== INSUFFICIENT);
  const unrated = signals.filter((s) => s.state === INSUFFICIENT);

  const rows: MacroRow[] = rated.map((signal) => {
    const input = inputs[signal.id];
    // Not signal.evidence[].availability: a dimension rests on several series (external sector: six) and the engine leaves stale ones out of the
    // rating altogether, so "any evidence stale" flagged series the row does not show and the rating did not use.
    const statusCaution = input?.status ? CAUTION_BY_TONE[input.status.tone] : undefined;
    const cautions = [input?.note, statusCaution].filter((c): c is string => Boolean(c));
    const direction: ChangeDirection = NON_DIRECTIONAL_STATES.has(signal.state) ? "flat" : (DIRECTION[signal.direction] ?? "flat");
    return {
      id: signal.id,
      label: sentenceCase(signal.label),
      input: input?.text ?? null,
      caution: cautions.length > 0 ? cautions.join(" · ") : null,
      state: readableState(signal.state),
      glyph: DIRECTION_GLYPH[direction],
    };
  });

  return {
    ratedCount: rated.length,
    totalCount: signals.length,
    headline: headlineFor(rated),
    sentences: sentencesFor(rated, facts),
    rows,
    unrated: unrated.map((s) => sentenceCase(s.label)),
  };
}
