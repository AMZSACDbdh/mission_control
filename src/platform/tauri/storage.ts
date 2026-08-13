import { LazyStore } from "@tauri-apps/plugin-store";
import type { StorageAdapter, StorageUsage, WriteResult } from "../types";

/**
 * Storage backed by Tauri's plugin-store — a JSON file on disk at
 * `%APPDATA%\com.missioncontrol.app\mission-control.json` on Windows.
 *
 * Replaces the localStorage implementation for the desktop build.
 * No quota. No 5 MB cliff. Data persists across reboots and browser clears.
 * Returning null from usage() tells the UI to hide the storage warning.
 */

const store = new LazyStore("mission-control.json", { autoSave: false });

const inFlight = new Map<string, Promise<unknown>>();

function serialise<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = inFlight.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  inFlight.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

export function createTauriStorage(): StorageAdapter {
  return {
    async read(key) {
      const value = await store.get<string>(key);
      return value ?? null;
    },

    write(key, value) {
      return serialise(key, async (): Promise<WriteResult> => {
        try {
          await store.set(key, value);
          await store.save();
          return { ok: true };
        } catch (e) {
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
        try {
          await store.delete(key);
          await store.save();
        } catch {
          // Best-effort; a remove failure is not worth breaking the caller.
        }
      });
    },

    async keys(prefix) {
      const all = await store.keys();
      if (!prefix) return all;
      return all.filter((k) => k.startsWith(prefix));
    },

    async usage(_prefix?: string): Promise<StorageUsage | null> {
      return null;
    },
  };
}
