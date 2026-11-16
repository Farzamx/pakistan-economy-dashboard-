// A plain inline-SVG sparkline. Server-compatible (no hooks), no chart library.
//
// Plots the values it is given, oldest to newest, scaled to their own range. It stretches to fill its container (the SVG has no fixed size and does
// not preserve its aspect ratio), so the tile decides how much room the line gets. The stroke keeps a constant width at any size.

export default function Sparkline({ values, label, className = "" }: { values: readonly number[]; label: string; className?: string }) {
  const points = values.filter((v) => Number.isFinite(v));
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  const W = 100;
  const H = 32;
  const PAD = 3;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    // A flat series is drawn as a line through the middle rather than along an edge.
    const y = range === 0 ? H / 2 : PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label} className={`block h-full w-full text-pe-accent ${className}`}>
      <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
