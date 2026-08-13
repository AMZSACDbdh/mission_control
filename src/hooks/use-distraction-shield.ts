import { useEffect, useRef, useState } from "react";

import { platform, type PresenceFidelity } from "@/platform";

/**
 * The Distraction Shield.
 *
 * On the web this cannot block other apps or websites — no browser will let a
 * page reach outside its own tab. What it *can* do is notice, honestly, every
 * time you leave. So the shield does the one useful thing available to it: it
 * keeps count and measures how long you were gone. A fake "blocker" that blocks
 * nothing would be worse than none.
 *
 * Presence comes from `platform.presence`, which also reports its own
 * `fidelity` — how much it can actually see. The web implementation observes
 * only this tab, and the UI is expected to say so rather than imply it knows
 * where your attention really went.
 */

export type ShieldState = {
  /** Times you left the tab during the current session. */
  breaks: number;
  /** Total seconds spent away. */
  awaySeconds: number;
  /** True while the tab is hidden. */
  away: boolean;
  /** Longest unbroken stretch of presence this session, in seconds. */
  longestStretchSeconds: number;
  /** How much the current platform can actually observe. */
  fidelity: PresenceFidelity;
};

const empty: ShieldState = {
  breaks: 0,
  awaySeconds: 0,
  away: false,
  longestStretchSeconds: 0,
  fidelity: platform.presence.fidelity,
};

export function useDistractionShield(active: boolean) {
  const [state, setState] = useState<ShieldState>(empty);
  const leftAt = useRef<number | null>(null);
  const presentSince = useRef<number>(Date.now());

  useEffect(() => {
    if (!active) return;

    presentSince.current = Date.now();

    // Emit the current state immediately so a page that loads while already
    // hidden (e.g. session restored in a background tab) is correctly counted
    // as away from the start. The visibilitychange event only fires on
    // *transitions*, so a page that begins hidden never gets that first event.
    if (!platform.presence.isPresent()) {
      leftAt.current = Date.now();
      setState((s) => ({ ...s, away: true, breaks: s.breaks + 1 }));
    }

    return platform.presence.subscribe((present) => {
      if (!present) {
        leftAt.current = Date.now();
        const stretch = Math.floor((Date.now() - presentSince.current) / 1000);
        setState((s) => ({
          ...s,
          away: true,
          breaks: s.breaks + 1,
          longestStretchSeconds: Math.max(s.longestStretchSeconds, stretch),
        }));
      } else {
        const gone = leftAt.current ? Math.floor((Date.now() - leftAt.current) / 1000) : 0;
        leftAt.current = null;
        presentSince.current = Date.now();
        setState((s) => ({ ...s, away: false, awaySeconds: s.awaySeconds + gone }));
      }
    });
  }, [active]);

  const reset = () => {
    leftAt.current = null;
    presentSince.current = Date.now();
    setState(empty);
  };

  return { ...state, reset };
}

/**
 * Focus quality: presence as a share of the session.
 *
 * A 50-minute block you sat through unbroken is not the same as a 50-minute
 * block you left nine times, and the number should say so.
 */
export function focusQuality(sessionSeconds: number, awaySeconds: number, breaks: number): number {
  if (sessionSeconds <= 0) return 100;
  const presence = Math.max(0, sessionSeconds - awaySeconds) / sessionSeconds;
  // Each departure costs a little beyond the time itself — regaining depth is
  // slower than losing it.
  const switchPenalty = Math.min(0.4, breaks * 0.04);
  return Math.max(0, Math.round((presence - switchPenalty) * 100));
}
