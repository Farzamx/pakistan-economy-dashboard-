"use client";

// The marketing landing page's hero — eyebrow, two-line H1, sub-headline,
// CTA row, trust line, live indicator tape, scroll cue. The night-lights
// background used to be rendered here; it now lives once at the page root
// (see LandingPage.tsx) as a position:fixed layer shared by every section,
// not just the hero. The H1/sub/CTA/trust-line entrance sequence is pure
// CSS (animation-delay per element, see globals.css) — this component's
// only real JS is the scroll-cue's visibility-aware pause.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LiveIndicatorTape, { type TapeCell } from "@/components/marketing/LiveIndicatorTape";

export default function Hero({ tapeCells }: { tapeCells: TapeCell[] }) {
  const heroRef = useRef<HTMLElement>(null);
  const [cuePaused, setCuePaused] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    let inView = true;
    function update() {
      setCuePaused(!inView || document.visibilityState === "hidden");
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0 },
    );
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <section ref={heroRef} className="relative flex min-h-[100svh] w-full flex-col justify-end overflow-hidden min-[1024px]:min-h-screen">
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-6 px-5 pt-24 pb-8 min-[1024px]:px-10 min-[1024px]:pb-0">
        <span
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}
        >
          Pakistan Economic Intelligence Center
        </span>

        <h1
          className="max-w-[640px] text-[clamp(2.25rem,9vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.02em] min-[768px]:max-w-[700px] min-[768px]:text-[48px] min-[1024px]:max-w-[1000px] min-[1024px]:text-[72px]"
          style={{ fontFamily: "var(--font-marketing-display)", color: "var(--paper)" }}
        >
          {/* Each group's two words are separate DOM spans joined by one
              literal space, so the accessible text content and reading
              order are identical at every breakpoint ("Pakistan's economy,
              in numbers you can act on." — one continuous sentence, no
              aria-label duplication). Only the CSS display toggles: block
              (its own line) below 768px, inline (joins with its sibling)
              at 768px+. Below 768px this renders 4 controlled lines
              (measured to fit 320px with margin at the 36px floor); at
              768px+ it collapses back to the original 2-line break. */}
          <span className="mkt-h1-line mkt-h1-line--1">
            <span className="block min-[768px]:inline">Pakistan&apos;s</span>{" "}
            <span className="block min-[768px]:inline">economy,</span>
          </span>
          <span className="mkt-h1-line mkt-h1-line--2">
            <span className="block min-[768px]:inline">in numbers</span>{" "}
            <span className="block min-[768px]:inline">you can act on.</span>
          </span>
        </h1>

        <p
          className="mkt-sub max-w-[46ch] text-[16px] leading-relaxed min-[1024px]:text-[18px]"
          style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}
        >
          Inflation, reserves, the rupee, PSX and federal and provincial budgets — tracked from source data, with the analysis that comes after it.
        </p>

        <div className="mkt-cta-row flex flex-col gap-3 min-[480px]:flex-row min-[480px]:gap-4">
          <Link
            href="/overview"
            className="flex min-h-[44px] items-center justify-center rounded-lg px-6 py-3 text-[15px] font-semibold"
            style={{ fontFamily: "var(--font-marketing-body)", background: "var(--indigo)", color: "var(--paper)" }}
          >
            Open the platform
          </Link>
          <Link
            href="/methodology"
            className="flex min-h-[44px] items-center justify-center rounded-lg border px-6 py-3 text-[15px] font-semibold"
            style={{ fontFamily: "var(--font-marketing-body)", borderColor: "var(--muted)", color: "var(--paper)", background: "transparent" }}
          >
            How we calculate it
          </Link>
        </div>

        <p className="mkt-trust-line text-[13px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
          Built on data from SBP, PBS, PSX, IMF and the World Bank. Free to use.
        </p>
      </div>

      <div className="relative z-10">
        <LiveIndicatorTape cells={tapeCells} />
      </div>

      {/* Scroll cue — desktop only, per the brief */}
      <div className="relative z-10 hidden justify-center py-4 min-[1024px]:flex">
        <div
          className={`mkt-scroll-cue h-6 w-px${cuePaused ? " mkt-scroll-cue--paused" : ""}`}
          style={{ background: "var(--muted)" }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
