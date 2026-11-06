"use client";

// Overview "Latest News" ticker.
//
// The motion is pure CSS (see the .pe-newsticker block in globals.css): this
// component renders the markup and handles the two things CSS cannot:
//
//   1. A Pause/Play control. Hovering pauses the ticker, but a touch screen has
//      no hover, and moving content that cannot be stopped is an accessibility
//      failure (WCAG 2.2.2), so there is a real button.
//   2. Keyboard focus. Focusing a headline pauses the ticker; if that headline
//      happened to be off-screen it would take focus invisibly, so on focus the
//      animation is moved to the point where that card sits at the left edge.
//
// It renders no data of its own. Rows arrive already selected, ranked, dated
// and formatted by the server (LatestNewsBody), so this adds no fetch, no
// timezone-dependent formatting on the client, and no hydration mismatch.
//
// Until the stylesheet's motion rules apply — reduced motion requested, or the
// browser lacks container-query units — the same markup is a plain static list.

import { useRef, useState, type CSSProperties, type FocusEvent } from "react";
import { TICKER_SECONDS_PER_ITEM, TICKER_STATIC_VISIBLE_AT_DESKTOP, shouldAnimateTicker, tickerAlignTimeMs } from "@/lib/newsTicker";

export interface TickerRow {
  title: string;
  url: string;
  source: string;
  /** "6 Nov · 13:00 PKT", formatted on the server; null when the date is unusable. */
  published: string | null;
  /** A valid ISO timestamp for the <time> element; null when the date is unusable. */
  iso: string | null;
  category?: string;
}

/** Name of the CSS animation in globals.css; used to find it through the Web Animations API. */
const ANIMATION_NAME = "pe-newsticker-scroll";

function TickerItem({ row, index, duplicate = false }: { row: TickerRow; index: number; duplicate?: boolean }) {
  return (
    <li
      className="pe-newsticker-item"
      data-ticker-index={index}
      // Rows past this are hidden only in the static desktop presentation.
      data-extra={index >= TICKER_STATIC_VISIBLE_AT_DESKTOP ? "" : undefined}
    >
      <a
        href={row.url}
        target="_blank"
        rel="noopener noreferrer"
        className="pe-newsticker-card"
        // The duplicate set is also inert; this keeps it out of the tab order
        // for any browser that predates the inert attribute.
        tabIndex={duplicate ? -1 : undefined}
      >
        <span className="pe-newsticker-title">{row.title}</span>
        <span className="pe-newsticker-meta">
          <span className="pe-newsticker-byline">
            <span className="pe-newsticker-src">{row.source}</span>
            {row.published && (
              <>
                <span className="pe-newsticker-bsep" aria-hidden="true"> · </span>
                {row.iso ? (
                  <time dateTime={row.iso} className="pe-newsticker-time font-mono text-[11px]">
                    {row.published}
                  </time>
                ) : (
                  <span className="pe-newsticker-time font-mono text-[11px]">{row.published}</span>
                )}
              </>
            )}
          </span>
          {row.category && (
            <>
              <span className="pe-newsticker-sep" aria-hidden="true">
                ·
              </span>
              <span className="pe-newsticker-cat">{row.category}</span>
            </>
          )}
        </span>
      </a>
    </li>
  );
}

export default function LatestNewsTicker({ rows }: { rows: TickerRow[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const animate = shouldAnimateTicker(rows.length);

  function revealFocusedCard(event: FocusEvent<HTMLElement>) {
    if (!animate) return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-ticker-index]");
    if (!card) return;
    const index = Number(card.dataset.tickerIndex);
    const track = trackRef.current;
    if (!Number.isInteger(index) || !track || typeof track.getAnimations !== "function") return;
    const animation = track.getAnimations().find((a) => (a as CSSAnimation).animationName === ANIMATION_NAME);
    // Card i sits at the panel's left edge when the loop is i card-times in.
    if (animation) animation.currentTime = tickerAlignTimeMs(index);
  }

  const style = {
    "--pe-newsticker-count": rows.length,
    "--pe-newsticker-seconds": `${TICKER_SECONDS_PER_ITEM}s`,
  } as CSSProperties;

  return (
    <div
      className="pe-newsticker"
      role="group"
      aria-label="Latest news headlines"
      data-animated={animate ? "true" : "false"}
      data-paused={paused ? "true" : "false"}
      style={style}
      onFocusCapture={revealFocusedCard}
    >
      <div className="pe-newsticker-viewport">
        <div className="pe-newsticker-track" ref={trackRef}>
          <ul className="pe-newsticker-set" data-set="primary">
            {rows.map((row, i) => (
              <TickerItem key={row.url} row={row} index={i} />
            ))}
          </ul>
          {animate && (
            // An identical second copy makes the loop seamless. It is inert and
            // hidden from assistive technology so nobody meets a headline twice.
            <ul className="pe-newsticker-set" data-set="duplicate" aria-hidden="true" inert>
              {rows.map((row, i) => (
                <TickerItem key={`dup-${row.url}`} row={row} index={i} duplicate />
              ))}
            </ul>
          )}
        </div>
      </div>

      {animate && (
        // Under the belt rather than over it, so it can never cover a passing
        // card's category label.
        <div className="pe-newsticker-controls">
          <button
            type="button"
            className="pe-newsticker-toggle"
            aria-label={paused ? "Play headline ticker" : "Pause headline ticker"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      )}
    </div>
  );
}
