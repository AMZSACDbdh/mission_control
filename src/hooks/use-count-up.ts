import { useEffect, useRef, useState } from "react";

/** True when animating would be wasted or unwelcome — hidden tabs, reduced motion. */
function shouldSkipAnimation() {
  if (typeof window === "undefined") return true;
  if (document.visibilityState === "hidden") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Smoothly counts a number up from 0 once the component mounts. */
export function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // requestAnimationFrame is paused in a background tab, which would otherwise
    // leave the figure frozen at zero. Show the real number instead.
    if (shouldSkipAnimation()) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setValue(target); // always land exactly on the value
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}

/** Animates a progress value from 0 to `target` after mount (for bars/rings). */
export function useAnimatedProgress(target: number, delayMs = 120) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setValue(target), delayMs);
    return () => clearTimeout(id);
  }, [target, delayMs]);
  return value;
}
