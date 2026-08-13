import type { StartupAdapter } from "../types";

/**
 * A web page cannot register itself to launch when Windows starts, and there is
 * no approximation worth shipping — a service worker or a pinned tab is not the
 * same promise. So this reports false and stays false.
 *
 * `capabilities.canAutostart` is the flag the interface reads; this adapter
 * exists so that callers never have to branch on which platform they got, and
 * so the setting simply is not offered here rather than being offered and
 * quietly doing nothing.
 */
export function createWebStartup(): StartupAdapter {
  return {
    async isEnabled() {
      return false;
    },
    async setEnabled() {
      return false;
    },
  };
}
