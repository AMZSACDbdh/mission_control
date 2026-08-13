import { KEYS, readJson, removeKey, writeJson } from "@/services/store";

/**
 * Who the app is for.
 *
 * The user's name was a constant in `data/mission.ts` — the app greeted whoever
 * happened to be hardcoded there. It lives here instead, editable in Settings,
 * and is deliberately the only thing this store holds: a name is a preference,
 * not an activity, so it never belongs in the ledger.
 */

/** Shown when no name has been set. Addresses the user without inventing one. */
export const DEFAULT_NAME = "friend";

/** Fired after a change so listeners in *this* tab update — `storage` only fires in others. */
export const NAME_EVENT = "mission-control:name-changed";

export async function getName(): Promise<string> {
  const stored = await readJson<unknown>(KEYS.profile, null);
  return typeof stored === "string" && stored.trim() ? stored.trim() : DEFAULT_NAME;
}

export async function setName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed) await writeJson(KEYS.profile, trimmed);
  else await removeKey(KEYS.profile);

  if (typeof window !== "undefined") window.dispatchEvent(new Event(NAME_EVENT));
}
