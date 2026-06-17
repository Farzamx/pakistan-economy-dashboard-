"use client";

import { useTheme } from "@/components/ThemeProvider";

// ── Dark mode: deterministic stars + nebula blobs ────────────────────────────
// Pseudo-random generator so star positions are identical on server and client
// (avoids hydration mismatches that Math.random would cause).
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
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
    const seed = seedOffset + i * 7;
    return {
      top: seededRandom(seed * 12.9898) * 100,
      left: seededRandom(seed * 78.233) * 100,
      size: minSize + seededRandom(seed * 37.719) * (maxSize - minSize),
      duration: 2.5 + seededRandom(seed * 15.234) * 3.5,
      delay: -seededRandom(seed * 51.456) * 6,
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

export default function GalaxyBackground() {
  const { theme } = useTheme();

  // Light mode: static dot-grid via CSS class (defined in globals.css)
  if (theme === "light") {
    return <div className="light-bg" aria-hidden="true" />;
  }

  // Dark mode: animated galaxy
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
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
  );
}
