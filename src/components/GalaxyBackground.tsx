"use client";

// Static ambient background — PEIC v3 "Institutional Slate" direction:
// deep matte black / graphite, restrained lighting, no color-as-decoration.
// Replaces the prior animated galaxy (nebula blobs + twinkling stars) and
// light-mode dot-grid with a single flat fill + soft top vignette. No
// motion and no per-instance randomness, so — unlike the previous
// version — there is nothing that needs a hydration-safe seeded PRNG.
export default function GalaxyBackground() {
  return <div className="ambient-bg" aria-hidden="true" />;
}
