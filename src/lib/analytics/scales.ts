// Axis scales and tick selection for the hand-drawn SVG charts (dot plot,
// dumbbell, lollipop, waterfall, box plot, small multiples). Pure and tested, so
// that "a bar is the right length" is a property of a function, not of a render.

/** Linear map from a value domain to a pixel range. A zero-width domain maps everything to the range midpoint. */
export function linearScale(domain: readonly [number, number], range: readonly [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** "Nice" step (1, 2, 2.5, 5 × 10^k) at least as large as raw. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Round-number axis ticks covering [min, max]. The first tick is <= min and the
 * last >= max, so every data value sits inside the axis. Includes 0 whenever the
 * range spans it (so a zero baseline can always be drawn).
 */
export function niceTicks(min: number, max: number, approxCount = 5): number[] {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (lo === hi) {
    // A flat series: give the axis some room either side.
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep((hi - lo) / Math.max(1, approxCount));
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + (String(step).includes(".5") ? 1 : 0));
  const out: number[] = [];
  for (let v = start; v <= end + step * 1e-9; v += step) out.push(Number(v.toFixed(Math.min(decimals + 1, 6))));
  return out;
}

/** The padded extent of `values` including 0 — for charts that must show a zero baseline. */
export function extentWithZero(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  return [Math.min(0, ...values), Math.max(0, ...values)];
}

/** "+1.9", "−0.8" (true minus sign), "12.6": a signed value for a change, a plain one otherwise. */
export function formatValue(value: number, decimals = 1, opts: { signed?: boolean } = {}): string {
  const rounded = Number(value.toFixed(decimals));
  const abs = Math.abs(rounded).toFixed(decimals);
  if (rounded < 0) return `−${abs}`;
  return opts.signed && rounded > 0 ? `+${abs}` : abs;
}

export function formatPercent(value: number, decimals = 1, opts: { signed?: boolean } = {}): string {
  return `${formatValue(value, decimals, opts)}%`;
}

/** Percentage points: "+1.9 pp". */
export function formatPp(value: number, decimals = 1): string {
  return `${formatValue(value, decimals, { signed: true })} pp`;
}
