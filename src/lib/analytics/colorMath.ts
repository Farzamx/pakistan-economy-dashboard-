// Colour maths for validating the chart palette. Used by tests, not at runtime.
//
// - WCAG 2.x relative luminance and contrast ratio.
// - OKLab (Björn Ottosson), so "how different do two colours look" is a distance.
// - Colour-vision-deficiency simulation (Machado, Oliveira & Fernandes 2009,
//   severity 1.0) applied in linear RGB, so a palette can be checked for the
//   readers who would otherwise confuse two series.

export type Rgb = [number, number, number]; // 0..255

export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a #rrggbb colour: "${hex}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (l: number): number => {
  const c = Math.min(1, Math.max(0, l));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
};

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

type Lab = [number, number, number];

function linearToOklab([r, g, b]: Rgb): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Rgb;
  return linearToOklab([r, g, b]);
}

/** OKLab lightness, 0..1 — used to check a ramp is monotonic. */
export function lightness(hex: string): number {
  return oklab(hex)[0];
}

/** Euclidean OKLab distance × 100 (≈ "ΔE"; ~2 is just noticeable, 8+ is clearly different). */
export function deltaE(a: string, b: string): number {
  const x = oklab(a);
  const y = oklab(b);
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export type CvdType = "protanopia" | "deuteranopia" | "tritanopia";

const CVD: Record<CvdType, number[][]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

/** What a viewer with the given deficiency sees for `hex`, as a hex colour. */
export function simulateCvd(hex: string, type: CvdType): string {
  const lin = hexToRgb(hex).map(toLinear);
  const mat = CVD[type];
  const out = mat.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
  const to255 = out.map((v) => Math.round(fromLinear(v)));
  return `#${to255.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Smallest ΔE between two colours over normal vision and all three deficiencies. */
export function worstCaseDeltaE(a: string, b: string): { value: number; under: "normal" | CvdType } {
  let worst = { value: deltaE(a, b), under: "normal" as "normal" | CvdType };
  for (const t of ["protanopia", "deuteranopia", "tritanopia"] as const) {
    const d = deltaE(simulateCvd(a, t), simulateCvd(b, t));
    if (d < worst.value) worst = { value: d, under: t };
  }
  return worst;
}
