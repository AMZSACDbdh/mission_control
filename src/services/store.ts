import { platform, type StorageUsage, type WriteResult } from "@/platform";

/**
 * The data-access layer.
 *
 * Every persistent thing the app owns is named here once, and every read and
 * write goes through these helpers. Before this existed, ten different modules
 * each held their own key constant and repeated the same
 * `try { JSON.parse(localStorage.getItem(...)) } catch` dance — which is how a
 * key gets mistyped in one place, or a store gets forgotten by the backup.
 *
 * Storage itself lives behind `platform.storage`, so swapping localStorage for
 * a desktop store later is a change to one file, not to every hook.
 */

/** Everything persisted, in one place. These strings are data — never edit them casually. */
export const KEYS = {
  activity: "mission-control-activity-v1",
  progression: "mission-control-progression-v1",
  dayPlans: "mission-control-day-plans-v1",
  series: "mission-control-series-v1",
  focusSession: "mission-control-focus-session-v1",
  favouriteQuotes: "mission-control-favourite-quotes-v1",
  missions: "mission-control-missions-v3",
  journal: "mission-control-journal-db",
  youtubeKey: "mission-control-youtube-key-v1",
  profile: "mission-control-profile-v1",
  fitness: "mission-control-fitness-v1",
  // Per-device UI flag — not user data, not backed up.
  desktopWelcomed: "mission-control-desktop-welcomed-v1",
} as const;

export type StoreKey = (typeof KEYS)[keyof typeof KEYS];

/** The shared prefix, used for usage measurement and enumeration. */
export const KEY_PREFIX = "mission-control-";

/**
 * Reads and parses JSON.
 *
 * Returns `fallback` for missing *and* corrupt data. A half-written store
 * should degrade to empty rather than crash the page that reads it — the
 * ledger's own integrity pass is the thing that repairs damage, and it cannot
 * run if the app never mounts.
 */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await platform.storage.read(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Could not parse stored data for ${key}`, e);
    return fallback;
  }
}

/** Writes JSON, reporting honestly whether it reached disk. */
export function writeJson(key: string, value: unknown): Promise<WriteResult> {
  return platform.storage.write(key, JSON.stringify(value));
}

export function removeKey(key: string): Promise<void> {
  return platform.storage.remove(key);
}

/** Approximate consumption, or `null` where the platform has no real quota. */
export function measureUsage(): Promise<StorageUsage | null> {
  return platform.storage.usage(KEY_PREFIX);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
