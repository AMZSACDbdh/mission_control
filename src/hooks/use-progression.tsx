import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { eventsOfKind, sumMinutes, sumXp, type ActivityEvent } from "@/data/activity";
import {
  journeyCompletionsBetween,
  progressionFor,
  PROMOTION_LEVELS,
  promotionId,
  promotionsBetween,
  type ProgressionState,
} from "@/data/progression";
import {
  evaluateRewards,
  levelsUntilNextUnlock,
  nextUnlock,
  type AchievementCounts,
  type CosmeticCategory,
  type RewardState,
} from "@/data/rewards";
import {
  generateChronicle,
  generateMenkyo,
  type JourneyRecord,
  type MenkyoScroll,
} from "@/data/chronicle";
import { KEYS, readJson, writeJson } from "@/services/store";
import { useActivity } from "./use-activity";

/**
 * The celebration layer: ceremonies, unlocks and archives.
 *
 * Progression itself is never stored — this hook persists only the things the
 * specification explicitly permits:
 *
 *   • the last acknowledged promotion, so a ceremony fires exactly once
 *   • unlock timestamps, which are immutable once written
 *   • Journey Chronicles and Menkyo Scrolls, which are historical truth
 *   • which cosmetics are equipped
 *
 * It never stores level, rank, XP or Journey progress. Delete this store
 * entirely and every number in the app is unchanged — only the record of what
 * you have already *seen* is lost.
 */

type ProgressionStore = {
  /** Promotion ids already shown. */
  acknowledgedPromotions: string[];
  /** rewardId → ISO timestamp. Immutable once set. */
  unlocks: Record<string, string>;
  /** One per completed Journey. Never overwritten. */
  chronicles: JourneyRecord[];
  menkyo: MenkyoScroll[];
  equipped: Partial<Record<CosmeticCategory, string>>;
  /** Highest level already celebrated, so level-ups fire once. */
  acknowledgedLevel: number;
  acknowledgedJourney: number;
};

const emptyStore: ProgressionStore = {
  acknowledgedPromotions: [],
  unlocks: {},
  chronicles: [],
  menkyo: [],
  equipped: {},
  acknowledgedLevel: 1,
  acknowledgedJourney: 1,
};

export type Ceremony =
  | { type: "level"; level: number }
  | { type: "promotion"; id: string; level: number; journey: number }
  | { type: "journey"; journey: number; record: JourneyRecord };

type ProgressionContextValue = {
  hydrated: boolean;
  progression: ProgressionState;
  rewards: RewardState[];
  unlockedCount: number;
  nextReward: RewardState | null;
  levelsToNextReward: number | null;
  unlockedAt: (rewardId: string) => string | undefined;
  chronicles: JourneyRecord[];
  menkyo: MenkyoScroll[];
  equipped: Partial<Record<CosmeticCategory, string>>;
  equip: (category: CosmeticCategory, rewardId: string) => void;
  /** The ceremony waiting to be shown, if any. */
  pendingCeremony: Ceremony | null;
  acknowledgeCeremony: () => void;
  /** Non-null when a progression save has failed — unlock timestamps and chronicles are at risk. */
  progressionWriteError: string | null;
};

const ProgressionContext = createContext<ProgressionContextValue | null>(null);

function achievementCountsFrom(events: ActivityEvent[], longestStreak: number): AchievementCounts {
  return {
    workouts: eventsOfKind(events, "workout").length,
    journalEntries: eventsOfKind(events, "journal").length,
    focusSessions: eventsOfKind(events, "focus").length,
    focusHours: Math.floor(sumMinutes(events, "focus") / 60),
    objectives: eventsOfKind(events, "objective").length,
    longestStreak,
  };
}

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { events, stats, hydrated: ledgerReady } = useActivity();
  const [store, setStore] = useState<ProgressionStore>(emptyStore);
  const [hydrated, setHydrated] = useState(false);
  const [progressionWriteError, setProgressionWriteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readJson<Partial<ProgressionStore>>(KEYS.progression, {}).then((saved) => {
      if (cancelled) return;
      setStore({ ...emptyStore, ...saved });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      const result = await writeJson(KEYS.progression, store);
      setProgressionWriteError(result.ok ? null : result.message);
    })();
  }, [store, hydrated]);

  const lifetimeXP = stats.totalXp;
  const progression = useMemo(() => progressionFor(lifetimeXP), [lifetimeXP]);

  const rewards = useMemo(() => {
    const counts = achievementCountsFrom(events, stats.longest);
    return evaluateRewards(progression.levelWithinJourney, progression.completedJourneys, counts);
  }, [events, stats.longest, progression.levelWithinJourney, progression.completedJourneys]);

  /* ---- Unlock detection: runs after every ledger change ---- */
  useEffect(() => {
    if (!hydrated || !ledgerReady) return;

    const stamped = new Date().toISOString();

    // Which rewards are new is decided *inside* the updater, against the state
    // being replaced. Reading `store.unlocks` out here would put the effect's
    // own output in its dependencies — a loop that happens to terminate because
    // of a guard rather than because it was designed to. Returning `prev`
    // unchanged makes React bail out, so the cycle cannot start.
    setStore((prev) => {
      const newlyUnlocked = rewards.filter((r) => r.unlocked && !prev.unlocks[r.id]);
      if (newlyUnlocked.length === 0) return prev;

      const unlocks = { ...prev.unlocks };
      // Never overwrite an existing timestamp — unlock times are immutable.
      for (const reward of newlyUnlocked) unlocks[reward.id] = stamped;
      return { ...prev, unlocks };
    });
  }, [rewards, hydrated, ledgerReady]);

  /* ---- Journey completion: archive exactly once ---- */
  useEffect(() => {
    if (!hydrated || !ledgerReady) return;
    if (progression.completedJourneys <= store.chronicles.length) return;

    // Every Journey the lifetime total has completed, minus those already
    // archived. A Chronicle is written exactly once and never overwritten.
    const journeysToArchive: number[] = [];
    for (let j = 1; j <= progression.completedJourneys; j += 1) {
      if (!store.chronicles.some((c) => c.journey === j)) journeysToArchive.push(j);
    }

    if (journeysToArchive.length === 0) return;

    setStore((prev) => {
      const chronicles = [...prev.chronicles];
      const menkyo = [...prev.menkyo];
      for (const journey of journeysToArchive) {
        if (chronicles.some((c) => c.journey === journey)) continue;
        const record = generateChronicle(events, journey, PROMOTION_LEVELS);
        chronicles.push(record);
        menkyo.push(generateMenkyo(record));
      }
      return { ...prev, chronicles, menkyo };
    });
  }, [
    progression.completedJourneys,
    store.chronicles,
    store.menkyo,
    lifetimeXP,
    events,
    hydrated,
    ledgerReady,
  ]);

  /* ---- The ceremony queue ---- */
  const pendingCeremony = useMemo<Ceremony | null>(() => {
    if (!hydrated || !ledgerReady) return null;

    // A completed Journey outranks everything else.
    const unseenJourney = store.chronicles.find((c) => c.journey >= store.acknowledgedJourney);
    if (unseenJourney && progression.currentJourney > store.acknowledgedJourney) {
      return { type: "journey", journey: unseenJourney.journey, record: unseenJourney };
    }

    // Then promotions, oldest first.
    const id = promotionId(progression.currentJourney, progression.currentLevel);
    if (
      PROMOTION_LEVELS.includes(progression.currentLevel) &&
      !store.acknowledgedPromotions.includes(id)
    ) {
      return {
        type: "promotion",
        id,
        level: progression.currentLevel,
        journey: progression.currentJourney,
      };
    }

    // Then a plain level-up.
    if (progression.currentLevel > store.acknowledgedLevel) {
      return { type: "level", level: progression.currentLevel };
    }

    return null;
  }, [hydrated, ledgerReady, progression, store]);

  /**
   * Marks as seen exactly the ceremony that was on screen.
   *
   * This used to re-derive progression from lifetime XP at click time. If XP
   * changed between the ceremony rendering and the user dismissing it — a focus
   * session landing, say — it would acknowledge whatever ceremony was current
   * *then*, marking a ceremony the user never saw as seen while leaving the one
   * they did see pending. `pendingCeremony` and `progression` both come from the
   * same render, so acknowledging from them is consistent by construction.
   */
  const acknowledgeCeremony = useCallback(() => {
    const ceremony = pendingCeremony;
    if (!ceremony) return;

    setStore((prev) => {
      switch (ceremony.type) {
        case "journey":
          return {
            ...prev,
            // Past this Journey, so its Chronicle stops matching. Level is taken
            // from the same render: after a completion it has already restarted
            // low, and leaving it at 100 would silently swallow every level-up
            // of the new Journey.
            acknowledgedJourney: Math.max(prev.acknowledgedJourney, ceremony.journey + 1),
            acknowledgedLevel: progression.currentLevel,
          };

        case "promotion":
          return {
            ...prev,
            acknowledgedPromotions: prev.acknowledgedPromotions.includes(ceremony.id)
              ? prev.acknowledgedPromotions
              : [...prev.acknowledgedPromotions, ceremony.id],
            acknowledgedLevel: Math.max(prev.acknowledgedLevel, ceremony.level),
          };

        case "level":
          return {
            ...prev,
            acknowledgedLevel: Math.max(prev.acknowledgedLevel, ceremony.level),
          };
      }
    });
  }, [pendingCeremony, progression.currentLevel]);

  const equip = useCallback((category: CosmeticCategory, rewardId: string) => {
    setStore((prev) => ({ ...prev, equipped: { ...prev.equipped, [category]: rewardId } }));
  }, []);

  const unlockedAt = useCallback((rewardId: string) => store.unlocks[rewardId], [store.unlocks]);

  const value = useMemo<ProgressionContextValue>(
    () => ({
      hydrated,
      progression,
      rewards,
      unlockedCount: rewards.filter((r) => r.unlocked).length,
      nextReward: nextUnlock(rewards),
      levelsToNextReward: levelsUntilNextUnlock(rewards, progression.levelWithinJourney),
      unlockedAt,
      chronicles: store.chronicles,
      menkyo: store.menkyo,
      equipped: store.equipped,
      equip,
      pendingCeremony,
      acknowledgeCeremony,
      progressionWriteError,
    }),
    [
      hydrated,
      progression,
      rewards,
      unlockedAt,
      store.chronicles,
      store.menkyo,
      store.equipped,
      equip,
      pendingCeremony,
      acknowledgeCeremony,
      progressionWriteError,
    ],
  );

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

export function useProgression(): ProgressionContextValue {
  const ctx = useContext(ProgressionContext);
  if (!ctx) throw new Error("useProgression must be used inside a ProgressionProvider");
  return ctx;
}

/** Exported for tests: total XP that produced a given state. */
export { promotionsBetween, sumXp };
