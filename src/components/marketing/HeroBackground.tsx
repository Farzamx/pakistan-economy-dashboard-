"use client";

// The marketing site's three-layer background — entirely code-generated
// (no image files): (1) an inline-SVG "night lights" map built from real
// city coordinates, (2) a CSS hairline reference grid, (3) a radial
// vignette for text contrast. See src/data/pakistanNightLights.ts for the
// city data itself (kept separate so it's easy to edit later).
//
// Rendered ONCE at the marketing page's root (see LandingPage.tsx), not
// inside Hero — position: fixed with inset:0 (never height:100vh) keeps it
// pinned to the actual viewport rectangle as the page scrolls, so every
// section reads as sitting on one continuous living background rather than
// the hero being glued onto an otherwise-flat page. inset:0 sidesteps the
// classic iOS Safari "100vh + fixed" bug entirely: that bug only bites
// elements sized with the vh unit (which iOS historically computed against
// the LARGEST possible viewport, with browser chrome hidden, causing a gap
// or jump as the address bar shows/hides) — an inset-based fixed element has
// no vh dependency, so it's simply resized to whatever the live viewport
// rectangle is at every repaint, chrome state included.
//
// Rendered twice — one SVG sized/cropped for desktop, one for mobile (see
// DESKTOP_BOUNDS/MOBILE_BOUNDS below) — and toggled with plain CSS
// (`hidden md:block` / `block md:hidden`), not JavaScript, so both are
// present in the server-rendered, crawlable markup and there is no
// hydration-dependent swap. Only 4 shared <radialGradient> defs (by
// population tier) back every city dot, keeping total SVG markup a few KB
// rather than one gradient per city.
import { useEffect, useRef } from "react";
import { PAKISTAN_NIGHT_LIGHTS, PAKISTAN_NIGHT_LIGHTS_BY_SIZE, type NightLightCity } from "@/data/pakistanNightLights";

const MOBILE_CITY_COUNT = 20;
// The 8 largest cities get the ambient pulse (desktop only, see globals.css's
// .mkt-city-pulse-* rules) — Karachi, Lahore, Faisalabad, Rawalpindi,
// Gujranwala, Peshawar, Multan, Hyderabad. Raised from 4 after the initial
// pulse read as too subtle; each of the 8 needs its own named CSS rule
// (animation-duration/delay), so this and globals.css must stay in sync.
const PULSE_CITY_COUNT = 8;

interface Bounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

// Full country extent, gently padded — used for the desktop map so every
// city in the data file is visible.
const DESKTOP_BOUNDS: Bounds = { latMin: 23.0, latMax: 36.5, lngMin: 60.5, lngMax: 77.0 };
const DESKTOP_VIEWBOX = { width: 1000, height: 940 };

// A tighter crop on the country's core north-south spine — chosen so
// Karachi (south) and Lahore (northeast) both sit safely inside frame with
// margin on a tall, narrow viewport, per the brief's mobile requirement.
const MOBILE_BOUNDS: Bounds = { latMin: 24.0, latMax: 34.5, lngMin: 65.5, lngMax: 75.5 };
const MOBILE_VIEWBOX = { width: 700, height: 845 };

function project(city: NightLightCity, bounds: Bounds, viewBox: { width: number; height: number }) {
  const refLatRad = (((bounds.latMin + bounds.latMax) / 2) * Math.PI) / 180;
  const lngRangeEffective = (bounds.lngMax - bounds.lngMin) * Math.cos(refLatRad);
  const latRange = bounds.latMax - bounds.latMin;
  const x = ((city.lng - bounds.lngMin) * Math.cos(refLatRad)) / lngRangeEffective * viewBox.width;
  const y = ((bounds.latMax - city.lat) / latRange) * viewBox.height;
  return { x, y };
}

type Tier = "xl" | "lg" | "md" | "sm";

function tierFor(population: number): Tier {
  if (population >= 5_000_000) return "xl";
  if (population >= 1_000_000) return "lg";
  if (population >= 300_000) return "md";
  return "sm";
}

const TIER_RADIUS_FRACTION: Record<Tier, number> = { xl: 0.064, lg: 0.042, md: 0.026, sm: 0.014 };

function CityDots({ cities, bounds, viewBox, pulseNames }: { cities: NightLightCity[]; bounds: Bounds; viewBox: { width: number; height: number }; pulseNames: Set<string> }) {
  return (
    <>
      {cities.map((city) => {
        const { x, y } = project(city, bounds, viewBox);
        const tier = tierFor(city.population);
        const r = TIER_RADIUS_FRACTION[tier] * viewBox.width;
        const pulse = pulseNames.has(city.name);
        return (
          <circle
            key={city.name}
            cx={x.toFixed(1)}
            cy={y.toFixed(1)}
            r={r.toFixed(1)}
            fill={`url(#mkt-glow-${tier})`}
            className={pulse ? `mkt-city-pulse mkt-city-pulse-${city.name.replace(/\s+/g, "")}` : undefined}
          />
        );
      })}
    </>
  );
}

function GlowDefs() {
  // Warm off-white glow (from --paper) at four intensities, rather than a
  // per-city gradient — real satellite night-lights read amber/white, not
  // the product's cyan accent, and --cyan is reserved for a single accent
  // use elsewhere per the brief. There is no feGaussianBlur anywhere in this
  // background — the glow's entire softness comes from these gradients'
  // stop offsets, so "reduce the blur" tunes here: each tier's middle stop
  // moved ~20% closer to the core (was 35/35/45/55%, now 28/28/36/44%),
  // tightening the bright center a touch without touching the 100%-to-0%
  // outer fade, which is what keeps these reading as glows, not hard dots.
  return (
    <defs>
      <radialGradient id="mkt-glow-xl">
        <stop offset="0%" stopColor="#E8EAF2" stopOpacity="0.95" />
        <stop offset="28%" stopColor="#E8EAF2" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#E8EAF2" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="mkt-glow-lg">
        <stop offset="0%" stopColor="#E8EAF2" stopOpacity="0.8" />
        <stop offset="28%" stopColor="#E8EAF2" stopOpacity="0.38" />
        <stop offset="100%" stopColor="#E8EAF2" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="mkt-glow-md">
        <stop offset="0%" stopColor="#E8EAF2" stopOpacity="0.6" />
        <stop offset="36%" stopColor="#E8EAF2" stopOpacity="0.24" />
        <stop offset="100%" stopColor="#E8EAF2" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="mkt-glow-sm">
        <stop offset="0%" stopColor="#E8EAF2" stopOpacity="0.42" />
        <stop offset="44%" stopColor="#E8EAF2" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#E8EAF2" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export default function HeroBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Ambient pulse pause: stop the (desktop-only) city-glow animation when
  // the tab/window is hidden, so it never burns GPU/battery off-screen.
  // Purely a class toggle — no layout or paint work of its own. No
  // IntersectionObserver here anymore: this layer is now position:fixed and
  // covers the full viewport for as long as the page is open, so "scrolled
  // out of view" is no longer a real state for it to be in — the only way
  // the whole page is actually off-screen is a hidden tab/minimized window,
  // which the Page Visibility API already reports directly.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    function setPaused(paused: boolean) {
      el?.classList.toggle("mkt-hero-bg--paused", paused);
    }

    function handleVisibility() {
      setPaused(document.visibilityState === "hidden");
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const pulseNames = new Set(PAKISTAN_NIGHT_LIGHTS_BY_SIZE.slice(0, PULSE_CITY_COUNT).map((c) => c.name));
  const mobileCities = PAKISTAN_NIGHT_LIGHTS_BY_SIZE.slice(0, MOBILE_CITY_COUNT);

  return (
    <div ref={rootRef} aria-hidden="true" className="mkt-hero-bg pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Shared gradient defs, rendered once in a zero-size (but NOT
          display:none) SVG. Both visual SVGs below reference these same
          ids — defining <GlowDefs> separately inside each one created
          duplicate ids, and Chrome resolves url(#...) to the FIRST
          matching id in the document regardless of which copy is actually
          visible. On mobile that first copy sat inside the display:none
          desktop <svg>, so every fill="url(#mkt-glow-*)" silently painted
          nothing. Hoisting one definition avoids duplicate ids entirely. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <GlowDefs />
      </svg>

      {/* Layer 1: night lights (desktop) */}
      <svg
        className="hidden h-full w-full min-[1024px]:block"
        viewBox={`0 0 ${DESKTOP_VIEWBOX.width} ${DESKTOP_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.35 }}
      >
        <CityDots cities={PAKISTAN_NIGHT_LIGHTS} bounds={DESKTOP_BOUNDS} viewBox={DESKTOP_VIEWBOX} pulseNames={pulseNames} />
      </svg>
      {/* Layer 1: night lights (mobile — fewer cities, tighter crop) */}
      <svg
        className="block h-full w-full min-[1024px]:hidden"
        viewBox={`0 0 ${MOBILE_VIEWBOX.width} ${MOBILE_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.35 }}
      >
        <CityDots cities={mobileCities} bounds={MOBILE_BOUNDS} viewBox={MOBILE_VIEWBOX} pulseNames={new Set<string>()} />
      </svg>

      {/* Layer 2: hairline grid */}
      <div className="mkt-hero-grid absolute inset-0" />

      {/* Layer 3: vignette */}
      <div className="mkt-hero-vignette absolute inset-0" />
    </div>
  );
}
