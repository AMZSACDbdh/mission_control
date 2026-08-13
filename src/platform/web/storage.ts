import type { StorageAdapter, StorageUsage, WriteResult } from "../types";

/**
 * Storage backed by `localStorage`, with a conscience.
 *
 * localStorage gives roughly 5 MB. At ~271 bytes per event and ~50 events on an
 * active day, a committed user reaches ~4.7 MB inside a year — and early in
 * year two every write starts throwing QuotaExceededError.
 *
 * The dangerous part is not the limit. It is that a `try/catch` around
 * `setItem` which only logs to the console leaves the app looking perfectly
 * healthy: in-memory state is correct, the UI updates, and nothing reaches
 * disk. The user finds out on their next refresh, when a year is gone. So every
 * write reports whether it succeeded.
 *
 * This whole file is the part a Tauri build replaces.
 */

/** Conservative browser allowance. Real limits vary; this is the safe floor. */
export const ASSUMED_QUOTA_BYTES = 5 * 1024 * 1024;

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    // Safari private mode reports a generic error with this text.
    /quota/i.test(e.message)
  );
}

function available(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Writes to the same key are serialised.
 *
 * localStorage is synchronous so ordering is free today, but the contract is
 * async and a future backend will not be. Chaining per key means two rapid
 * saves can never land out of order and silently resurrect stale state.
 */
const inFlight = new Map<string, Promise<unknown>>();

function serialise<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = inFlight.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  // Keep the chain alive but never let a rejection poison later writes.
  inFlight.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

export function createWebStorage(): StorageAdapter {
  return {
    async read(key) {
      if (!available()) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },

    write(key, value) {
      return serialise(key, async (): Promise<WriteResult> => {
        if (!available()) {
          return {
            ok: false,
            reason: "unavailable",
            message: "Storage is unavailable in this browser.",
          };
        }
        try {
          localStorage.setItem(key, value);
          return { ok: true };
        } catch (e) {
          if (isQuotaError(e)) {
            return {
              ok: false,
              reason: "quota",
              message:
                "Storage is full. Your recent changes are not being saved. Export your data now, then clear space.",
            };
          }
          return {
            ok: false,
            reason: "unknown",
            message: e instanceof Error ? e.message : "Could not save your data.",
          };
        }
      });
    },

    remove(key) {
      return serialise(key, async () => {
        if (!available()) return;
        try {
          localStorage.removeItem(key);
        } catch {
          // A remove that cannot happen is not worth failing the caller for.
        }
      });
    },

    async keys(prefix) {
      if (!available()) return [];
      const out: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (prefix && !key.startsWith(prefix)) continue;
          out.push(key);
        }
      } catch {
        // Unreadable storage reports as empty rather than throwing.
      }
      return out;
    },

    async usage(prefix = "mission-control-"): Promise<StorageUsage | null> {
      if (!available()) return null;
      let bytes = 0;
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(prefix)) continue;
          // UTF-16 in most engines, so two bytes per character is honest.
          bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
        }
      } catch {
        return null;
      }

      const percent = Math.min(100, Math.round((bytes / ASSUMED_QUOTA_BYTES) * 100));
      return {
        bytes,
        quota: ASSUMED_QUOTA_BYTES,
        percent,
        nearingLimit: percent >= 70,
        critical: percent >= 90,
      };
    },
  };
}
