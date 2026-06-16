import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Counts from 0 to `target` over `duration` ms using an ease-out curve.
 * Only runs when `shouldPlay` is true (set true on viewport entry).
 * Returns the current animated value; snaps to exact `target` at completion.
 */
export function useCountUp(
  target: number,
  duration: number,
  shouldPlay: boolean,
): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldPlay) return;

    let startTime: number | null = null;

    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCurrent(easeOutCubic(progress) * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, shouldPlay]);

  return current;
}
