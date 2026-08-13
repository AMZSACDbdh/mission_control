import type { Platform, PlatformCapabilities } from "../types";
import { createTauriStorage } from "./storage";
import { createTauriStartup } from "./startup";
import { createWebNotifications } from "../web/notifications";
import { createWebGeolocation } from "../web/geolocation";
import { createWebPresence } from "../web/presence";
import { createWebFiles } from "../web/files";

/**
 * Tauri platform capabilities.
 *
 * storageIsQuotaLimited was the first to flip — the store writes to a real file
 * on disk, so the 5 MB localStorage cliff is gone.
 *
 * canAutostart is now true: the app registers itself under the per-user Run key.
 * Note what that flag does *not* claim. The Run key fires at sign-in and only at
 * sign-in. It does not fire on resume from sleep — and it does not need to,
 * because sleep never ended the process; the app the user left open is the app
 * they come back to. Relaunching on wake would mean a Task Scheduler trigger on
 * the power event, which needs elevation to register and would then race the
 * single-instance mutex on every lid-open. The honest mechanism is the one that
 * matches the promise, so this stays at sign-in.
 *
 * Tray, global shortcuts and background scheduling remain false until they are
 * actually built.
 */
const tauriCapabilities: PlatformCapabilities = {
  name: "tauri",
  storageIsQuotaLimited: false,
  canNotifyInBackground: false,
  canBlockDistractions: false,
  canObserveSystemPresence: false,
  canAutostart: true,
  canRunInBackground: false,
  canUseSystemTray: false,
  canScheduleInBackground: false,
  canUseGlobalShortcuts: false,
};

export function createTauriPlatform(): Platform {
  return {
    capabilities: tauriCapabilities,
    storage: createTauriStorage(),
    // Notifications, geolocation, presence, and file download all work through
    // the Edge WebView2 browser APIs — no Tauri plugin needed for Phase 1.
    notifications: createWebNotifications(),
    geolocation: createWebGeolocation(),
    presence: createWebPresence(),
    files: createWebFiles(),
    startup: createTauriStartup(),
  };
}
