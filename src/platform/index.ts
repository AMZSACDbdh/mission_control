import type { Platform, PlatformCapabilities } from "./types";
import { createWebStorage } from "./web/storage";
import { createWebNotifications } from "./web/notifications";
import { createWebGeolocation } from "./web/geolocation";
import { createWebPresence } from "./web/presence";
import { createWebFiles } from "./web/files";
import { createTauriPlatform } from "./tauri";

export * from "./types";

/**
 * Which machine the application is running on.
 *
 * **Mission Control's final product is a Windows desktop application built with
 * Tauri.** The browser is the development and UI-testing surface, not the
 * destination. Everything above this file is written once and runs on both; this
 * file is where the two diverge.
 *
 * Adding the desktop implementation later means:
 *   1. `platform/tauri/*.ts` implementing the same contracts,
 *   2. a `tauriCapabilities` block declaring what it can now do,
 *   3. one extra branch in `selectPlatform()`.
 *
 * Nothing else in the codebase should need to know which one it got. Where
 * behaviour must differ, ask `platform.capabilities` rather than sniffing for a
 * global — a feature should be gated on *what is possible*, never on a brand.
 *
 * Deliberately a plain module rather than React context: several callers are not
 * components (backup, the profile store, the YouTube key), and threading a
 * provider through them would buy nothing.
 */

/**
 * True when running inside a Tauri webview.
 *
 * Tauri v2 exposes `__TAURI_INTERNALS__` on the window. Checked by name so this
 * file never imports a Tauri package — the browser build must not pull one in.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const webCapabilities: PlatformCapabilities = {
  name: "web",
  // Storage is a ~5 MB quota the user can clear at any time. The desktop build
  // replaces this with a real file, which is what finally retires TD-3.
  storageIsQuotaLimited: true,
  canNotifyInBackground: false,
  canBlockDistractions: false,
  canObserveSystemPresence: false,
  canAutostart: false,
  canRunInBackground: false,
  canUseSystemTray: false,
  canScheduleInBackground: false,
  canUseGlobalShortcuts: false,
};

function createWebPlatform(): Platform {
  return {
    capabilities: webCapabilities,
    storage: createWebStorage(),
    notifications: createWebNotifications(),
    geolocation: createWebGeolocation(),
    presence: createWebPresence(),
    files: createWebFiles(),
  };
}

function selectPlatform(): Platform {
  if (isTauri()) return createTauriPlatform();
  return createWebPlatform();
}

export const platform: Platform = selectPlatform();
