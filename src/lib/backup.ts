import { migrateEvent, type ActivityEvent, type ActivityKind } from "@/data/activity";
import { platform } from "@/platform";
import { KEYS, readJson, writeJson } from "@/services/store";

/**
 * Export and restore.
 *
 * Years of ledger are one cleared-cache away from gone, and nothing else in the
 * app matters if that happens. This is deliberately dumb: plain JSON, every key
 * we own, no server.
 *
 * Because events are append-only with stable ids, importing *merges* by id
 * rather than overwriting — restoring an old backup can never delete newer work.
 */

/**
 * Every store that travels with a backup.
 *
 * Built from the central key registry so a new store cannot be added to the app
 * and silently left out of the export — §9 rule 19 requires export to include
 * everything. The two deliberate omissions are the in-flight focus session
 * (worthless once the session ends) and the YouTube API key (a secret; it should
 * not sit in a file you email to yourself).
 */
const BACKED_UP_KEYS = [
  KEYS.activity,
  // Unlock timestamps, Chronicles and Menkyo Scrolls are historical truth — if
  // this is lost, timestamps are re-stamped with today's date and the record
  // of what you have already been shown disappears. It must travel with the ledger.
  KEYS.progression,
  KEYS.dayPlans,
  KEYS.series,
  KEYS.favouriteQuotes,
  KEYS.missions,
  KEYS.journal,
  KEYS.profile,
  KEYS.fitness,
] as const;

/**
 * Human names for the stores, used when a restore cannot write one of them.
 * A user told "could not save: missions, journal" can act; one told
 * "mission-control-missions-v3" cannot.
 */
const SECTION_LABELS: Record<string, string> = {
  [KEYS.activity]: "ledger",
  [KEYS.progression]: "progression",
  [KEYS.dayPlans]: "day plans",
  [KEYS.series]: "series",
  [KEYS.favouriteQuotes]: "favourite quotes",
  [KEYS.missions]: "missions",
  [KEYS.journal]: "journal",
  [KEYS.profile]: "profile",
  [KEYS.fitness]: "training",
};

export type Backup = {
  format: "mission-control-backup";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
};

export async function buildBackup(): Promise<Backup> {
  const data: Record<string, unknown> = {};
  for (const key of BACKED_UP_KEYS) {
    const value = await readJson<unknown>(key, null);
    if (value !== null) data[key] = value;
  }
  return {
    format: "mission-control-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  await platform.files.saveText(
    `mission-control-${backup.exportedAt.slice(0, 10)}.json`,
    JSON.stringify(backup, null, 2),
  );
}

/**
 * Kinds whose XP is *recomputed* rather than recorded.
 *
 * Almost every event is the record of a discrete action: you ticked a step, you
 * finished a session. Its XP is fixed the moment it happens, and re-ticking
 * writes the same amount again — so keeping the earliest copy is right, and it
 * is what stops an import from moving when something happened.
 *
 * The focus completion bonus is the exception. Its value is a function of the
 * whole day's focus, so it is legitimately rewritten as the day goes on: finish
 * a task after 50 XP of focus and the bonus is 13; focus another 20 XP against
 * the same task and it becomes 17. Same ref, new id, later timestamp, larger
 * value. Under earliest-wins, restoring any backup taken before that rewrite
 * reinstated the smaller number and permanently destroyed the difference.
 *
 * For these kinds the newest computation is authoritative by definition — it was
 * derived from strictly more of the day than the one it replaced.
 */
const RECOMPUTED_KINDS: ReadonlySet<ActivityKind> = new Set(["focus-bonus"]);

/** True when `candidate` should replace `existing` for the same ref. */
function supersedes(candidate: ActivityEvent, existing: ActivityEvent): boolean {
  if (candidate.at !== existing.at) {
    return RECOMPUTED_KINDS.has(candidate.kind)
      ? candidate.at > existing.at
      : candidate.at < existing.at;
  }
  // Same instant — two clocks agreeing, or one action written twice inside a
  // millisecond. Falling back to the id keeps this a total order, so merging A
  // into B and B into A cannot disagree.
  return candidate.id < existing.id;
}

/**
 * Merges two ledgers safely.
 *
 * Two passes, and both are necessary:
 *
 *   1. **Union by `id`** — the merge identity. Two devices can union without
 *      conflict because ids are unique per event.
 *   2. **Collapse by `ref`** — the action identity. This is the pass an earlier
 *      version lacked, and its absence let one action count twice: undo then
 *      re-tick creates a new id for the same ref, so exporting and re-importing
 *      doubled the XP.
 *
 * Which copy survives depends on what the event *is*: an action record keeps the
 * earliest, so an import can never move history; a recomputed value keeps the
 * newest, so an import can never revert a valid rewrite. See RECOMPUTED_KINDS.
 *
 * Both rules are total orders on `at`, so the result does not depend on import
 * direction or on how many times the same file is applied.
 */
export function mergeLedgers(current: ActivityEvent[], incoming: ActivityEvent[]): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();
  for (const e of [...current, ...incoming]) byId.set(e.id, e);

  const byRef = new Map<string, ActivityEvent>();
  for (const e of byId.values()) {
    const existing = byRef.get(e.ref);
    if (!existing || supersedes(e, existing)) byRef.set(e.ref, e);
  }

  // Sorted by instant, then by id so events sharing a timestamp cannot come out
  // in an order that depends on which ledger was passed first. Two devices
  // folding the same history land on byte-identical output.
  return [...byRef.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

/** Removes any duplicate refs already present in a ledger, keeping the earliest. */
export function dedupeLedger(events: ActivityEvent[]): ActivityEvent[] {
  return mergeLedgers(events, []);
}

export type ImportResult = {
  ok: boolean;
  message: string;
  /** Events after merging, when the ledger was part of the file. */
  mergedEvents?: ActivityEvent[];
};

/**
 * Restores a backup. The ledger is merged by event id (set union — the property
 * that makes multi-device sync free later); every other store is replaced.
 */
export async function restoreBackup(
  text: string,
  currentEvents: ActivityEvent[],
): Promise<ImportResult> {
  let parsed: Backup;
  try {
    parsed = JSON.parse(text) as Backup;
  } catch {
    return { ok: false, message: "That file isn't valid JSON." };
  }

  if (parsed?.format !== "mission-control-backup") {
    return { ok: false, message: "That doesn't look like a Mission Control backup." };
  }

  let mergedEvents: ActivityEvent[] | undefined;
  const failed: string[] = [];

  for (const [key, value] of Object.entries(parsed.data ?? {})) {
    if (!(BACKED_UP_KEYS as readonly string[]).includes(key)) continue;

    if (key === KEYS.activity && Array.isArray(value)) {
      const incoming = (value as (Partial<ActivityEvent> & { ref: string })[]).map(migrateEvent);
      mergedEvents = mergeLedgers(currentEvents, incoming);
      continue;
    }

    const result = await writeJson(key, value);
    if (!result.ok) {
      console.error(`Could not restore ${key}: ${result.message}`);
      failed.push(SECTION_LABELS[key] ?? key);
    }
  }

  /**
   * A restore that could not write must never report success.
   *
   * This previously logged failures to the console and returned `ok: true`
   * regardless — the exact silent-write-failure this codebase refuses to accept
   * everywhere else, and worst of all on the browser-to-desktop migration path,
   * where the user has every reason to believe their history moved across.
   *
   * `mergedEvents` is still returned: the ledger merge happens in memory and is
   * persisted by the caller through the activity hook, which reports its own
   * write failures. Re-importing the same file is idempotent, so telling the
   * user to try again is safe advice.
   */
  if (failed.length > 0) {
    return {
      ok: false,
      message: `Restore incomplete — could not save: ${failed.join(", ")}. Nothing was deleted, but those sections are unchanged. Free up space or check permissions, then import the same file again.`,
      ...(mergedEvents ? { mergedEvents } : {}),
    };
  }

  const added = mergedEvents ? mergedEvents.length - currentEvents.length : 0;
  return {
    ok: true,
    message: mergedEvents
      ? `Restored. ${added} new event${added === 1 ? "" : "s"} merged into your ledger.`
      : "Restored.",
    ...(mergedEvents ? { mergedEvents } : {}),
  };
}
