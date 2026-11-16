// A plain inline-SVG sparkline. Server-compatible (no hooks), no chart library.
//
// Plots the values it is given, oldest to newest, scaled to their own range. It stretches to fill its container (the SVG has no fixed size and does
// not preserve its aspect ratio), so the tile decides how much room the line gets. The stroke keeps a constant width at any size.

/** `step`: draw a step line (hold each value until the next), for a series that moves in discrete steps such as the policy rate. */
export default function Sparkline({ values, label, className = "", step = false }: { values: readonly number[]; label: string; className?: string; step?: boolean }) {
  const points = values.filter((v) => Number.isFinite(v));
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  const W = 100;
  const H = 32;
  const PAD = 3;
  const xy = points.map((v, i) => ({
    x: (i / (points.length - 1)) * W,
    // A flat series is drawn as a line through the middle rather than along an edge.
    y: range === 0 ? H / 2 : PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }));
  const fmt = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  // Step line: each value holds horizontally until the next observation, then the line moves vertically to the new level.
  const coords = step ? xy.flatMap((p, i) => (i === 0 ? [fmt(p)] : [fmt({ x: p.x, y: xy[i - 1].y }), fmt(p)])) : xy.map(fmt);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label} className={`block h-full w-full text-pe-accent ${className}`}>
      <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin={step ? "miter" : "round"} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
