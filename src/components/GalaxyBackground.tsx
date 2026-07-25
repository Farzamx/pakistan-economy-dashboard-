"use client";

// Atmospheric System — PEIC v4 "Sovereign Terminal" Phase 3.
//
// Six independent layers, stacked inside one fixed, pointer-events:none
// wrapper (`.atm`) so there is exactly one new fixed-positioning context,
// not six. Every layer animates transform and/or opacity only — never a
// layout- or paint-triggering property — so the whole system composites
// on the GPU and costs nothing per frame regardless of page content.
//
//   1. Base ink fill + a top vignette for depth (static)
//   2. Monochrome film-grain texture, anti-banding (static)
//   3. Longitude/latitude reference grid — very slow drift (~110s)
//   4. Topographic "macro terrain" contour lines — slow drift + an
//      irregular, non-metronomic opacity breathe (~150s)
//   5. Global economic network mesh — sparse nodes + thin connecting
//      paths (inline SVG, so individual nodes can pulse independently)
//   6. Ambient macro-flow — two large radial light fields drifting
//      continuously (carried over from Phase 1's .ambient-drift)
//
// Every animated layer is disabled under prefers-reduced-motion (media
// query lives in globals.css) — layers 1/2 stay (they were always static)
// and every other layer freezes at its resting frame rather than vanishing,
// so reduced-motion still gets the same depth, just no movement.
//
// No per-instance randomness needed (node positions/delays are fixed,
// authored values) — same reasoning as the Phase 1 header this replaces:
// nothing here needs a hydration-safe seeded PRNG.
const MESH_NODES: { x: number; y: number; delay: number; r: number }[] = [
  { x: 90,  y: 140, delay: 0,    r: 2.4 },
  { x: 250, y: 90,  delay: 3.2,  r: 1.8 },
  { x: 430, y: 190, delay: 7.5,  r: 2.2 },
  { x: 610, y: 110, delay: 1.6,  r: 1.6 },
  { x: 760, y: 210, delay: 9.8,  r: 2.6 },
  { x: 940, y: 130, delay: 4.4,  r: 1.8 },
  { x: 1120,y: 220, delay: 12.1, r: 2.0 },
  { x: 1280,y: 100, delay: 6.0,  r: 1.6 },
  { x: 340, y: 320, delay: 14.3, r: 1.8 },
  { x: 720, y: 360, delay: 2.7,  r: 2.2 },
  { x: 1040,y: 330, delay: 10.9, r: 1.8 },
  { x: 180, y: 280, delay: 5.3,  r: 1.6 },
];

// Sparse, mostly-nearest-neighbour connections — a network, not a mesh of
// every-node-to-every-node (which would read as a spiderweb, not "sparse").
const MESH_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
  [0, 11], [11, 8], [2, 8], [4, 9], [6, 10], [9, 10], [8, 9],
];

export default function GalaxyBackground() {
  return (
    <div className="atm" aria-hidden="true">
      <div className="atm-grid" />
      <div className="atm-contour" />
      <svg className="atm-mesh" viewBox="0 0 1400 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="atm-mesh-edges" fill="none" stroke="currentColor">
          {MESH_EDGES.map(([a, b], i) => {
            const from = MESH_NODES[a];
            const to = MESH_NODES[b];
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
        </g>
        <g className="atm-mesh-nodes" fill="currentColor">
          {MESH_NODES.map((n, i) => (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={n.r}
              className="atm-mesh-node"
              style={{ animationDelay: `${n.delay}s` }}
            />
          ))}
        </g>
      </svg>
      <div className="atm-flow" />
    </div>
  );
}
