import type { NotificationAdapter, NotificationPermission } from "../types";

/**
 * Browser notifications.
 *
 * These only appear while the page is open — a web page cannot wake a closed
 * laptop. A Tauri build replaces this with the OS notification centre, at which
 * point `capabilities.canNotifyInBackground` flips to true and the copy in the
 * UI that admits the limitation stops being needed.
 */
export function createWebNotifications(): NotificationAdapter {
  const supported = () => typeof Notification !== "undefined";

  return {
    permission(): NotificationPermission {
      if (!supported()) return "unsupported";
      return Notification.permission as NotificationPermission;
    },

    async request() {
      if (!supported()) return false;
      try {
        const result = await Notification.requestPermission();
        return result === "granted";
      } catch {
        return false;
      }
    },

    async show(title, options) {
      if (!supported() || Notification.permission !== "granted") return;
      try {
        new Notification(title, options);
      } catch (e) {
        console.error("Could not raise a notification", e);
      }
    },
  };
}
