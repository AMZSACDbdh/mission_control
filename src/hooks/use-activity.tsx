import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  dayKeyFor,
  deriveStats,
  makeEvent,
  migrateEvent,
  type ActivityEvent,
  type MasteryStats,
} from "@/data/activity";
import { dedupeLedger } from "@/lib/backup";
import type { StorageUsage } from "@/platform";
import { KEYS, measureUsage, readJson, writeJson } from "@/services/store";
import { useNow } from "./use-now";

export type NewEvent = Parameters<typeof makeEvent>[0];

/** One intended toggle: the event, and whether it should be present. */
export type LedgerToggle = { on: boolean; event: NewEvent };

type ActivityContextValue = {
  /** False until stored data has been read, so pages can avoid flashing zeros. */
  hydrated: boolean;
  events: ActivityEvent[];
  today: string;
  stats: MasteryStats;
  /** Appends an event, freezing its XP, day and zone. No-op if the ref exists. */
  log: (event: NewEvent) => void;
  /** Removes the event with this ref, exactly reversing its XP. */
  unlog: (ref: string) => void;
  /** Convenience for checkbox-style actions. */
  toggle: (on: boolean, event: NewEvent) => void;
  /**
   * Applies related toggles as one transaction, all decided against the same
   * ledger. Use this when one toggle's condition depends on another's — such as
   * "did that step complete the task?".
   */
  transact: (build: (has: (ref: string) => boolean) => LedgerToggle[]) => void;
  has: (ref: string) => boolean;
  /** Non-null when a save has failed — the user must be told. */
  writeError: string | null;
  usage: StorageUsage | null;
  /** Replaces the whole ledger — used by import. */
  replaceAll: (events: ActivityEvent[]) => void;
  clear: () => void;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  /** Set when a save fails — surfaced to the user, never swallowed. */
  const [writeError, setWriteError] = useState<string | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  // Hourly is enough to roll "today" over at the 04:00 boundary.
  const now = useNow(60 * 60 * 1000);
  const today = useMemo(() => dayKeyFor(now ?? new Date()), [now]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Older events predate id/area/tz/rateVersion — bring them forward
      // without touching the XP they were originally awarded.
      const parsed = await readJson<(Partial<ActivityEvent> & { ref: string })[]>(
        KEYS.activity,
        [],
      );
      if (cancelled) return;

      const migrated = parsed.map(migrateEvent);

      // Integrity pass: a ledger that already contains duplicate refs — from
      // an import made before the merge was fixed — would over-report XP
      // forever. Repair it once, on load, keeping the earliest of each.
      const repaired = dedupeLedger(migrated);
      if (repaired.length !== migrated.length) {
        console.warn(
          `Activity ledger: removed ${migrated.length - repaired.length} duplicate event(s).`,
        );
      }
      setEvents(repaired);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    // A failed write must never be silent. If this fails and we only log, the
    // UI keeps showing correct in-memory state while nothing reaches disk —
    // and the loss is only discovered on the next refresh.
    void (async () => {
      const result = await writeJson(KEYS.activity, events);
      if (cancelled) return;
      setWriteError(result.ok ? null : result.message);
      setUsage(await measureUsage());
    })();

    return () => {
      cancelled = true;
    };
  }, [events, hydrated]);

  const log = useCallback((input: NewEvent) => {
    setEvents((prev) =>
      prev.some((e) => e.ref === input.ref) ? prev : [...prev, makeEvent(input)],
    );
  }, []);

  const unlog = useCallback((ref: string) => {
    // Returning `prev` untouched when there is nothing to remove makes React
    // bail out. Without it, any caller that re-asserts "this should be absent"
    // on every render — the journal does, on every keystroke — would produce a
    // new array each time and rewrite the entire ledger to disk.
    setEvents((prev) =>
      prev.some((e) => e.ref === ref) ? prev.filter((e) => e.ref !== ref) : prev,
    );
  }, []);

  const toggle = useCallback(
    (on: boolean, input: NewEvent) => {
      if (on) log(input);
      else unlog(input.ref);
    },
    [log, unlog],
  );

  /**
   * Several toggles, one consistent view of the ledger.
   *
   * `toggle` decides from the last render's events. That is fine alone, but
   * ticking the final step of a task asks two questions at once — "flip this
   * step" and "is the task now finished?" — and React batches state updates, so
   * two ticks in quick succession would both read a ledger that predates the
   * other. The completion bonus was then silently skipped, and only an untick
   * and re-tick would recover it.
   *
   * `build` receives a lookup over the ledger being replaced, so every decision
   * in the batch is made against the same, current truth.
   */
  const transact = useCallback((build: (has: (ref: string) => boolean) => LedgerToggle[]) => {
    setEvents((prev) => {
      const present = new Set(prev.map((e) => e.ref));
      let next = prev;

      for (const { on, event } of build((ref) => present.has(ref))) {
        const exists = next.some((e) => e.ref === event.ref);
        if (on && !exists) next = [...next, makeEvent(event)];
        else if (!on && exists) next = next.filter((e) => e.ref !== event.ref);
      }

      return next;
    });
  }, []);

  const has = useCallback((ref: string) => events.some((e) => e.ref === ref), [events]);

  const replaceAll = useCallback((next: ActivityEvent[]) => setEvents(next.map(migrateEvent)), []);

  const clear = useCallback(() => setEvents([]), []);

  const stats = useMemo(() => deriveStats(events, today), [events, today]);

  const value = useMemo<ActivityContextValue>(
    () => ({
      hydrated,
      events,
      today,
      stats,
      log,
      unlog,
      toggle,
      transact,
      has,
      replaceAll,
      clear,
      writeError,
      usage,
    }),
    [
      hydrated,
      events,
      today,
      stats,
      log,
      unlog,
      toggle,
      transact,
      has,
      replaceAll,
      clear,
      writeError,
      usage,
    ],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used inside an ActivityProvider");
  return ctx;
}
