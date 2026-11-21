// Pure rules behind PEIC's numeric input (components/ui/NumericInput.tsx). Kept free of React so every edge case is unit-tested.
//
// The old per-tool inputs were <input type="number"> with `value={x === 0 ? "" : x}` and `onChange={parseFloat -> isNaN ? 0 : clamp}`. That cannot work: typing "0"
// stores 0 and the field immediately shows "" again (so 0, 0.5 and 0.25 could never be typed), "-" and "." are not numbers so they reset the field, and a field
// that clamps on every keystroke cannot be emptied. The fix is to let the field keep the TEXT the user is typing (the draft) and to tell the tool a number only
// when the text is one:
//   - the draft is never rewritten while it is being typed;
//   - an intermediate draft ("", "-", ".", "0.", "-0.") is allowed and, where it is not yet a number, tells the tool nothing;
//   - a number is clamped to min/max before it reaches the tool (so calculations always see a valid value), but the draft stays as typed until the field loses focus;
//   - an empty field tells the tool `emptyValue` (default 0: what the tools already treat as "not entered") or, for fields that always need a value (years), nothing.

export interface NumericRules {
  min?: number;
  max?: number;
  /** Whole numbers only (years, periods, household size). */
  integer?: boolean;
  /** Defaults to "yes unless min is 0 or more". */
  allowNegative?: boolean;
  /** What the tool receives when the field is emptied. Default 0. */
  emptyValue?: number;
  /** "commit": an emptied field tells the tool `emptyValue`. "keep": it tells the tool nothing and the last value comes back on blur (years, household size). */
  emptyBehavior?: "commit" | "keep";
  /** Digits allowed after the decimal point (default: no limit). */
  maxDecimals?: number;
  /** Show a tool-set 0 as "0" instead of a blank placeholder (fields where 0 is a real, visible value: formula examples, years). */
  showZero?: boolean;
}

export type Parsed = { kind: "empty" } | { kind: "partial" } | { kind: "number"; value: number };

export function allowsNegative(r: NumericRules): boolean {
  return r.allowNegative ?? (r.min === undefined || r.min < 0);
}

/**
 * The draft after a keystroke or a paste, or null when the keystroke must be ignored (a letter, a second decimal point, a minus where negatives are not allowed...).
 * Thousands separators are dropped so "1,000" can be pasted.
 */
export function sanitizeDraft(raw: string, r: NumericRules): string | null {
  const s = raw.replace(/[\s,]/g, "");
  if (s === "") return "";
  const neg = allowsNegative(r);
  const pattern = r.integer ? (neg ? /^-?\d*$/ : /^\d*$/) : neg ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
  if (!pattern.test(s)) return null;
  if (r.maxDecimals !== undefined && !r.integer) {
    const dot = s.indexOf(".");
    if (dot >= 0 && s.length - dot - 1 > r.maxDecimals) return null;
  }
  return s;
}

/** Empty, a half-typed number ("-", ".", "-."), or a number. */
export function parseDraft(s: string): Parsed {
  if (s === "") return { kind: "empty" };
  if (s === "-" || s === "." || s === "-.") return { kind: "partial" };
  const n = Number(s); // "1." -> 1, ".5" -> 0.5, "007" -> 7
  if (!Number.isFinite(n)) return { kind: "partial" };
  return { kind: "number", value: n === 0 ? 0 : n }; // never -0
}

export function clampValue(n: number, r: NumericRules): number {
  let v = n;
  if (r.min !== undefined) v = Math.max(r.min, v);
  if (r.max !== undefined) v = Math.min(r.max, v);
  return v === 0 ? 0 : v;
}

/** What to tell the tool after a keystroke. undefined = nothing (the text is not a number yet, or the field is "keep" and empty). */
export function commitFor(draft: string, r: NumericRules): number | undefined {
  const p = parseDraft(draft);
  if (p.kind === "partial") return undefined;
  if (p.kind === "empty") return r.emptyBehavior === "keep" ? undefined : clampValue(r.emptyValue ?? 0, r);
  return clampValue(p.value, r);
}

/** Without binary noise: 0.1 + 0.2 shows as 0.3, 150000 as 150000. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(parseFloat(value.toPrecision(12)));
}

/** The text shown for a value the TOOL set (initial value, reset, profile sync): an unset 0 stays blank so the placeholder shows, exactly as before. */
export function displayFor(value: number, r: NumericRules): string {
  if (value === 0 && !r.showZero && (r.emptyValue ?? 0) === 0 && r.emptyBehavior !== "keep") return "";
  return formatNumber(value);
}

/** True while the draft is a number outside min/max (shown as invalid until the field loses focus and is corrected). */
export function isOutOfRange(draft: string, r: NumericRules): boolean {
  const p = parseDraft(draft);
  if (p.kind !== "number") return false;
  return clampValue(p.value, r) !== p.value;
}

/** The text the field settles on when it loses focus: the number the tool holds (a typed 0 stays "0"; an emptied or half-typed field returns to the tool's value). */
export function settledText(draft: string, toolValue: number, r: NumericRules): string {
  const p = parseDraft(draft);
  if (p.kind === "number") return formatNumber(clampValue(p.value, r));
  if (p.kind === "empty" && r.emptyBehavior !== "keep") return displayFor(toolValue, r);
  return displayFor(toolValue, r) || (r.emptyBehavior === "keep" ? formatNumber(toolValue) : "");
}

/** ArrowUp / ArrowDown: step the number the tool holds, clamped, without floating-point noise (0.1 steps stay 0.1 steps). */
export function stepValue(current: number, direction: 1 | -1, step: number, r: NumericRules): number {
  const decimals = (String(step).split(".")[1] ?? "").length;
  const next = Number((current + direction * step).toFixed(Math.min(decimals + 2, 10)));
  return clampValue(next, r);
}

// ── The field's state machine (used by the component, and unit-tested without a DOM) ────────────────────────────────────────────────────────────────────
export interface FieldState {
  /** The text in the box. */
  draft: string;
  /** The tool value this draft was last reconciled with. */
  seen: number;
}

export function initialState(value: number, r: NumericRules): FieldState {
  return { draft: displayFor(value, r), seen: value };
}

/** The tool changed the value (reset, profile sync, its own clamp): show it, unless the text already means that value. */
export function syncState(state: FieldState, value: number, r: NumericRules): FieldState {
  if (value === state.seen) return state;
  return { seen: value, draft: commitFor(state.draft, r) === value ? state.draft : displayFor(value, r) };
}

/** A keystroke or paste: the new text, and the number to tell the tool (only when it is a number and differs from what the tool holds). */
export function typeInto(state: FieldState, raw: string, toolValue: number, r: NumericRules): { state: FieldState; commit?: number } {
  const next = sanitizeDraft(raw, r);
  if (next === null) return { state };
  const c = commitFor(next, r);
  return { state: { ...state, draft: next }, commit: c !== undefined && c !== toolValue ? c : undefined };
}

export function blurState(state: FieldState, toolValue: number, r: NumericRules): FieldState {
  return { ...state, draft: settledText(state.draft, toolValue, r) };
}

/** ArrowUp / ArrowDown. */
export function arrowState(state: FieldState, toolValue: number, direction: 1 | -1, step: number, r: NumericRules): { state: FieldState; commit?: number } {
  const base = commitFor(state.draft, r) ?? toolValue;
  const next = stepValue(base, direction, step, r);
  return { state: { ...state, draft: formatNumber(next) }, commit: next !== toolValue ? next : undefined };
}
