// The chart palette and class-break colour scales for PEIC's analytical pages.
//
// This is the SOURCE OF TRUTH for the `--pe-viz-*` and `--pe-heat-*` tokens in
// globals.css; vizPalette.test.ts asserts the stylesheet matches it and runs the
// colour checks (contrast, colour-blind separation, ramp order) on these values,
// so a palette edit that breaks readability fails a test instead of shipping.
//
// Design rules (the same for every future indicator page):
//   - Categorical series colours are assigned in this FIXED order and follow the
//     ENTITY, never its rank: Pakistan / headline is always series 1.
//   - Magnitude uses one hue, light-to-dark; sign uses two hues around a neutral.
//     Class BREAKS (not a continuous gradient) are used for heatmaps, so no
//     colour implies a value that was not observed, and a legend can name every
//     colour.
//   - Red/green are NOT used for good/bad: more inflation is not "good" or "bad"
//     in a colour sense, and the pair fails for common colour blindness.
//   - Dark mode is its own set of steps (brighter = more intense), not an inversion.
//   - A missing observation has no colour at all: it is drawn as a hatched cell.

export type Theme = "light" | "dark";

/** The card/chart surface each theme draws on (--pe-surface). */
export const SURFACE: Record<Theme, string> = { light: "#FFFFFF", dark: "#0B0B0B" };

export const SERIES_ORDER = ["blue", "orange", "teal", "purple", "amber", "slate"] as const;
export type SeriesName = (typeof SERIES_ORDER)[number];

export const SERIES_COLORS: Record<Theme, Record<SeriesName, string>> = {
  light: { blue: "#1F4FA3", orange: "#C2410C", teal: "#0F7B84", purple: "#7E3FB0", amber: "#9A6700", slate: "#8A8F98" },
  dark: { blue: "#7FB0FF", orange: "#FF8A66", teal: "#35C7C2", purple: "#B88AF0", amber: "#EDC24A", slate: "#A9B4C2" },
};

/** Text colours used on heat cells (chosen per class so each pairing clears 4.5:1). */
export const INK = { dark: "#0F1B2D", light: "#FFFFFF" } as const;

export interface HeatClass {
  id: string;
  /** Inclusive lower bound; null = unbounded. */
  min: number | null;
  /** Exclusive upper bound; null = unbounded. */
  max: number | null;
  /** Legend text, e.g. "6 to < 9". */
  label: string;
  fill: Record<Theme, string>;
  ink: Record<Theme, string>;
}

export interface HeatScale {
  id: "yoy" | "mom";
  kind: "sequential" | "diverging";
  /** What a cell's colour means — repeated in the legend. */
  unit: string;
  classes: HeatClass[];
}

const D = INK.dark;
const L = INK.light;

/** Year-on-year rates: magnitude (one orange ramp) with a separate blue class for the rare below-zero reading. */
export const YOY_SCALE: HeatScale = {
  id: "yoy",
  kind: "sequential",
  unit: "% year on year",
  classes: [
    { id: "yoy-neg", min: null, max: 0, label: "below 0", fill: { light: "#7FB2DD", dark: "#2B5F8E" }, ink: { light: D, dark: L } },
    { id: "yoy-0", min: 0, max: 3, label: "0 to < 3", fill: { light: "#FEF0D9", dark: "#2A2018" }, ink: { light: D, dark: L } },
    { id: "yoy-1", min: 3, max: 6, label: "3 to < 6", fill: { light: "#FDD49E", dark: "#4A3320" }, ink: { light: D, dark: L } },
    { id: "yoy-2", min: 6, max: 9, label: "6 to < 9", fill: { light: "#FCAB6B", dark: "#6E4A26" }, ink: { light: D, dark: L } },
    { id: "yoy-3", min: 9, max: 12, label: "9 to < 12", fill: { light: "#FC8D59", dark: "#9A6A2C" }, ink: { light: D, dark: L } },
    { id: "yoy-4", min: 12, max: 18, label: "12 to < 18", fill: { light: "#EF6548", dark: "#CF8A3A" }, ink: { light: D, dark: D } },
    { id: "yoy-5", min: 18, max: 25, label: "18 to < 25", fill: { light: "#D7301F", dark: "#F2A65A" }, ink: { light: L, dark: D } },
    { id: "yoy-6", min: 25, max: null, label: "25 and above", fill: { light: "#990000", dark: "#FFD08F" }, ink: { light: L, dark: D } },
  ],
};

/** Month-on-month changes: both signs matter, so two hues diverge from a neutral middle. */
export const MOM_SCALE: HeatScale = {
  id: "mom",
  kind: "diverging",
  unit: "% month on month",
  classes: [
    { id: "mom-n2", min: null, max: -2, label: "below −2", fill: { light: "#2B6CB0", dark: "#5B9BDD" }, ink: { light: L, dark: D } },
    { id: "mom-n1", min: -2, max: -0.5, label: "−2 to < −0.5", fill: { light: "#A9CBE8", dark: "#29507A" }, ink: { light: D, dark: L } },
    { id: "mom-0", min: -0.5, max: 0.5, label: "−0.5 to < 0.5", fill: { light: "#EEF0F3", dark: "#26292E" }, ink: { light: D, dark: L } },
    { id: "mom-p1", min: 0.5, max: 1.5, label: "0.5 to < 1.5", fill: { light: "#FDD49E", dark: "#5A3C22" }, ink: { light: D, dark: L } },
    { id: "mom-p2", min: 1.5, max: 3, label: "1.5 to < 3", fill: { light: "#F28B52", dark: "#CC7A35" }, ink: { light: D, dark: D } },
    { id: "mom-p3", min: 3, max: null, label: "3 and above", fill: { light: "#B8321A", dark: "#FFA566" }, ink: { light: L, dark: D } },
  ],
};

export const SCALES: Record<HeatScale["id"], HeatScale> = { yoy: YOY_SCALE, mom: MOM_SCALE };

/** The class a value falls in. Throws on NaN — a non-number must never be coloured as if it were a reading. */
export function classify(scale: HeatScale, value: number): HeatClass {
  if (!Number.isFinite(value)) throw new Error(`Cannot colour a non-finite value: ${value}`);
  for (const c of scale.classes) {
    if ((c.min === null || value >= c.min) && (c.max === null || value < c.max)) return c;
  }
  throw new Error(`No class for ${value} in scale ${scale.id}`); // unreachable: the bounds tile the real line
}

/** The CSS custom-property names that carry a class's colours (defined in globals.css). */
export function heatTokenNames(classId: string): { fill: string; ink: string } {
  return { fill: `--pe-heat-${classId}`, ink: `--pe-heat-${classId}-ink` };
}

export function seriesVar(name: SeriesName): string {
  return `var(--pe-viz-${name})`;
}
