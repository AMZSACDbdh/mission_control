import type { PresenceAdapter } from "../types";

/**
 * Presence from the Page Visibility API.
 *
 * Fidelity is `tab`, and that word is doing real work: this can only tell that
 * *this tab* was hidden. It cannot distinguish switching to another tab from
 * switching to another application, from locking the screen, from picking up a
 * phone while the laptop sits open. The last case is invisible to it entirely.
 *
 * The Focus page reports what it measured in those terms rather than claiming
 * to know more. A Tauri build can supply a `system` implementation that knows
 * the foreground application, and the honest description improves with it.
 */
export function createWebPresence(): PresenceAdapter {
  const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

  return {
    fidelity: "tab",

    isPresent() {
      return !hidden();
    },

    subscribe(listener) {
      if (typeof document === "undefined") return () => undefined;
      const handler = () => listener(!hidden());
      document.addEventListener("visibilitychange", handler);
      return () => document.removeEventListener("visibilitychange", handler);
    },
  };
}
