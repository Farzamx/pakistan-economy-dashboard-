// Timing and policy constants for the Overview "Latest News" ticker.
//
// Kept in one pure module so the component, the stylesheet variables it sets,
// and the tests all read the same numbers.
//
// HOW THE TICKER MOVES
// Each headline is a card about 62% of the panel's width. The cards sit in one
// row that slides left continuously. The row is rendered twice, back to back,
// and animated by exactly -50% of its total width, so when the animation wraps
// the second copy is sitting where the first began and nothing visibly jumps.
//
// The cards are deliberately NARROWER than the panel. At full panel width a card
// is wholly visible only at the instant it is aligned; from then on the start of
// every line has already scrolled out of view, so the text is always partly cut
// off. At about 62% a card is fully on screen for roughly ten seconds of each
// pass, with the next one peeking in at the edge.
//
// Speed is defined PER CARD, not per second of travel, so the pace scales with
// the panel's width: a card takes TICKER_SECONDS_PER_ITEM to move one card-width.
// Eighteen seconds is deliberately slow. The text is in motion while someone
// reads it, so slower is more readable, and a moving headline is paused by
// hovering it, by focusing it, or by the Pause control.

/** Seconds one headline card takes to travel one panel-width. */
export const TICKER_SECONDS_PER_ITEM = 18;

/**
 * Below this many headlines the ticker does not move. A single headline sliding
 * past and looping back to itself is motion with no information in it.
 */
export const TICKER_MIN_ITEMS_TO_ANIMATE = 2;

/**
 * When the ticker is not moving (reduced motion, or no container-unit support)
 * it is a static list. Beside Markets the panel's height is fixed by the Markets
 * grid, so only this many rows are shown there; below the desktop breakpoint the
 * panel simply grows and shows all of them. No scrollbar is used either way.
 */
export const TICKER_STATIC_VISIBLE_AT_DESKTOP = 4;

export function shouldAnimateTicker(itemCount: number): boolean {
  return itemCount >= TICKER_MIN_ITEMS_TO_ANIMATE;
}

/** Length of one full loop: one card-time per headline. */
export function tickerDurationSeconds(itemCount: number): number {
  return Math.max(0, itemCount) * TICKER_SECONDS_PER_ITEM;
}

/**
 * The animation time, in milliseconds, at which the card at `index` is aligned
 * with the left edge of the panel. Used to bring a keyboard-focused card into
 * view: the animation is paused on focus, so without this a card that happens to
 * be off-screen would take focus invisibly.
 */
export function tickerAlignTimeMs(index: number): number {
  return Math.max(0, index) * TICKER_SECONDS_PER_ITEM * 1000;
}
