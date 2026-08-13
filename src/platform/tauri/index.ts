import type { Platform, PlatformCapabilities } from "../types";
import { createTauriStorage } from "./storage";
import { createWebNotifications } from "../web/notifications";
import { createWebGeolocation } from "../web/geolocation";
import { createWebPresence } from "../web/presence";
import { createWebFiles } from "../web/files";

/**
 * Tauri platform capabilities for Phase 1 (foundation only).
 *
 * storageIsQuotaLimited is the one flag that flips immediately — the store
 * writes to a real file on disk, so the 5 MB localStorage cliff is gone.
 * All other desktop-only capabilities (autostart, tray, global shortcuts)
 * are left false until their respective phases are implemented.
 */
const tauriCapabilities: PlatformCapabilities = {
  name: "tauri",
  storageIsQuotaLimited: false,
  canNotifyInBackground: false,
  canBlockDistractions: false,
  canObserveSystemPresence: false,
  canAutostart: false,
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
  };
}
