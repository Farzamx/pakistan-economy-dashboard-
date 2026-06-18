"use client";

// ── Dark mode: deterministic stars + nebula blobs ────────────────────────────
//
// Star positions must be bit-identical on the server and the client, or
// React's hydration will see mismatched `top`/`left` style values.
//
// A prior version derived "randomness" from `Math.sin(seed) * 10000`. Math.sin
// is a transcendental function — the ECMAScript spec does NOT require it to
// be bit-identical across engines (unlike +, -, *, / which IEEE-754 mandates
// exactly). Node's V8 (server) and the browser's engine can legitimately
// disagree in the last bit of a Math.sin result. That tiny difference, after
// `* 10000` and `Math.floor()`, can flip which integer the floor rounds to
// right at a boundary — turning 0.0000001 into 0.9999999. That is the exact
// mechanism that produced mismatched star coordinates during hydration.
//
// Fix: hash32 below uses only Math.imul (32-bit integer multiply) and
// bitwise ops — both exact and platform-independent per spec — plus a final
// division by 2^32, which is also exact in IEEE-754 (dividing by a power of
// two never rounds). No transcendental functions, so no possible divergence.
function hash32(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface Star {
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

function generateStars(count: number, seedOffset: number, minSize: number, maxSize: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = seedOffset + i * 5197; // wide stride — keeps each star's 5 axis seeds isolated
    return {
      top: hash32(seed) * 100,
      left: hash32(seed + 1) * 100,
      size: minSize + hash32(seed + 2) * (maxSize - minSize),
      duration: 2.5 + hash32(seed + 3) * 3.5,
      delay: -hash32(seed + 4) * 6,
    };
  });
}

const FAR_STARS  = generateStars(50, 1,    1,   1.5);
const MID_STARS  = generateStars(30, 500,  1.5, 2.2);
const NEAR_STARS = generateStars(15, 1000, 2,   3);
const ALL_STARS  = [...FAR_STARS, ...MID_STARS, ...NEAR_STARS];

const NEBULAS = [
  { top: "8%",  left: "12%", size: 480, color: "rgba(168, 85, 247, 0.22)", duration: 70, delay: 0 },
  { top: "55%", left: "72%", size: 420, color: "rgba(56, 189, 248, 0.18)", duration: 85, delay: -25 },
  { top: "82%", left: "18%", size: 380, color: "rgba(139, 92, 246, 0.16)", duration: 95, delay: -45 },
];

// Both backgrounds are always rendered. CSS (driven by data-theme on <html>,
// set synchronously by the inline script in layout.tsx before React hydrates)
// shows the correct one from the very first paint — no React state involved,
// so server HTML and client HTML are always identical.
export default function GalaxyBackground() {
  return (
    <>
      {/* Light mode dot-grid — hidden in dark, shown in light */}
      <div className="light-bg hidden light:block" aria-hidden="true" />

      {/* Dark mode galaxy — shown in dark, hidden in light */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none light:hidden" aria-hidden="true">
        {NEBULAS.map((nebula, i) => (
          <div
            key={i}
            className="nebula-blob"
            style={{
              top: nebula.top,
              left: nebula.left,
              width: nebula.size,
              height: nebula.size,
              background: nebula.color,
              animationDuration: `${nebula.duration}s`,
              animationDelay: `${nebula.delay}s`,
            }}
          />
        ))}
        {ALL_STARS.map((star, i) => (
          <span
            key={i}
            className="star"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
