/**
 * The Reward Engine — collections, cosmetic unlocks and ceremonial seals.
 *
 * Implements docs/03_PROGRESSION_ENGINE.md Part 3.
 *
 * Hard rule, enforced by construction: nothing in this file can influence
 * progression. It reads Level, Master Rank, Journey and achievement counts, and
 * emits unlock state. It never awards XP, never touches Form, never touches
 * Streak, and is never consulted by the XP, Level, Rank or Journey engines.
 *
 * Every unlock has exactly one deterministic requirement. No randomness, no
 * probability, no loot boxes, no paid unlocks.
 */

import { JOURNEY_LEVELS } from "./progression";

export type CosmeticCategory =
  | "enso"
  | "washi"
  | "mountain"
  | "moon"
  | "hanko"
  | "frame"
  | "ambient"
  | "hall"
  | "scroll"
  | "seal";

export type UnlockType = "level" | "achievement" | "journey";

/** What an achievement-gated reward counts. */
export type AchievementMetric =
  "workouts" | "journalEntries" | "focusSessions" | "focusHours" | "objectives" | "longestStreak";

export type RewardDefinition = {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  unlockType: UnlockType;
  /** Level, journey number, or metric threshold depending on unlockType. */
  requirement: number;
  /** Only for achievement unlocks. */
  metric?: AchievementMetric;
  /** Equippable rewards can be worn; historical ones are permanent record. */
  equippable: boolean;
};

export const collectionNames: Record<CosmeticCategory, string> = {
  enso: "Enso",
  washi: "Washi",
  mountain: "Mountain",
  moon: "Moon",
  hanko: "Hanko",
  frame: "Philosophy Frames",
  ambient: "Ambient Themes",
  hall: "Hall Decorations",
  scroll: "Journey Scrolls",
  seal: "Ceremonial Seals",
};

const equippableCategories: CosmeticCategory[] = [
  "enso",
  "mountain",
  "washi",
  "ambient",
  "frame",
  "hanko",
];

export function isEquippableCategory(category: CosmeticCategory): boolean {
  return equippableCategories.includes(category);
}

/* ------------------------------------------------------------------ *
 * The reward database
 * ------------------------------------------------------------------ *
 *
 * Unlock rhythm from the spec:
 *   every  5 levels → a cosmetic unlock
 *   every 10 levels → a major collection unlock (with the promotion)
 *   every 25 levels → a legendary item
 *   level 100       → Menkyo Scroll (handled by the Journey engine)
 */

function levelReward(
  id: string,
  category: CosmeticCategory,
  name: string,
  description: string,
  level: number,
): RewardDefinition {
  return {
    id,
    category,
    name,
    description,
    unlockType: "level",
    requirement: level,
    equippable: isEquippableCategory(category),
  };
}

function achievementReward(
  id: string,
  category: CosmeticCategory,
  name: string,
  description: string,
  metric: AchievementMetric,
  requirement: number,
): RewardDefinition {
  return {
    id,
    category,
    name,
    description,
    unlockType: "achievement",
    requirement,
    metric,
    equippable: isEquippableCategory(category),
  };
}

/** Progression rewards — predictable, unlocked by Levels. */
const progressionRewards: RewardDefinition[] = [
  // Chapter 1 — Shoshin
  levelReward(
    "enso-apprentice",
    "enso",
    "Apprentice Brush",
    "Your first circle. Uneven, and honest.",
    1,
  ),
  levelReward("washi-rice", "washi", "Rice Paper", "Plain, warm, and forgiving.", 5),
  levelReward(
    "mountain-morning-valley",
    "mountain",
    "Morning Valley",
    "First light along the low ground.",
    10,
  ),

  // Chapter 2 — Deshi
  levelReward("hanko-bronze", "hanko", "Bronze Seal", "The disciple's mark.", 15),
  levelReward("enso-temple", "enso", "Temple Circle", "Drawn a thousand times, and once more.", 20),

  // Chapter 3 — Shugyō
  levelReward("frame-bamboo", "frame", "Bamboo Frame", "Bends, and does not break.", 25),
  levelReward(
    "mountain-bamboo-ridge",
    "mountain",
    "Bamboo Ridge",
    "The path narrows and climbs.",
    30,
  ),

  // Chapter 4 — Kenshi
  levelReward("moon-crescent", "moon", "Crescent Moon", "A thin blade of light.", 35),
  levelReward("washi-temple", "washi", "Temple Washi", "Paper that has been somewhere.", 40),

  // Chapter 5 — Bushi
  levelReward("hanko-iron", "hanko", "Iron Seal", "Weight behind the mark.", 45),
  levelReward("enso-weathered", "enso", "Weathered Circle", "Time shows in the stroke.", 50),

  // Chapter 6 — Tatsujin
  levelReward(
    "mountain-mist",
    "mountain",
    "Mist Mountain",
    "What you cannot see, you climb anyway.",
    55,
  ),
  levelReward("ambient-temple-bell", "ambient", "Temple Bell", "One note, allowed to end.", 60),

  // Chapter 7 — Meijin
  levelReward("frame-waves", "frame", "Wave Frame", "Repetition that shapes stone.", 65),
  levelReward("moon-harvest", "moon", "Harvest Moon", "The year's work, lit up.", 70),

  // Chapter 8 — Sōshi
  levelReward(
    "hall-scroll-shelf",
    "hall",
    "Scroll Shelf",
    "Somewhere to keep what you have learned.",
    75,
  ),
  levelReward(
    "washi-ancient-scroll",
    "washi",
    "Ancient Scroll",
    "Older than the hand that holds it.",
    80,
  ),

  // Chapter 9 — Musō
  levelReward(
    "mountain-winter-summit",
    "mountain",
    "Winter Summit",
    "Cold, quiet, and very high.",
    85,
  ),
  levelReward("moon-golden", "moon", "Golden Moon", "Rare, and worth waiting for.", 90),

  // Chapter 10 — Shu-Ha-Ri
  levelReward(
    "hanko-master",
    "hanko",
    "Master's Seal",
    "The mark you have earned the right to make.",
    95,
  ),
  levelReward("enso-golden", "enso", "Golden Enso", "The circle, closed.", 100),
];

/** Legendary items — every 25 levels. */
const legendaryRewards: RewardDefinition[] = [
  levelReward(
    "hall-training-sword",
    "hall",
    "Training Sword",
    "Legendary · worn smooth by use.",
    25,
  ),
  levelReward("hall-lantern", "hall", "Stone Lantern", "Legendary · lights the path back.", 50),
  levelReward("hall-bonsai", "hall", "Bonsai", "Legendary · decades, in miniature.", 75),
  levelReward("hall-shrine", "hall", "Shrine Display", "Legendary · the room's still centre.", 100),
];

/** Mastery rewards — earned by accomplishment, never by leveling. */
const masteryRewards: RewardDefinition[] = [
  achievementReward("seal-iron-body", "seal", "Iron Body", "100 workouts logged.", "workouts", 100),
  achievementReward(
    "seal-year-of-words",
    "seal",
    "A Year of Words",
    "365 journal entries.",
    "journalEntries",
    365,
  ),
  achievementReward(
    "seal-five-hundred",
    "seal",
    "Five Hundred Sessions",
    "500 focus sessions.",
    "focusSessions",
    500,
  ),
  achievementReward(
    "seal-thousand-hours",
    "seal",
    "One Thousand Hours",
    "1,000 hours of focused work.",
    "focusHours",
    1000,
  ),
  achievementReward(
    "seal-hundred-objectives",
    "seal",
    "Hundred Objectives",
    "100 daily objectives completed.",
    "objectives",
    100,
  ),
  achievementReward(
    "seal-unbroken-year",
    "seal",
    "The Unbroken Year",
    "A 365-day streak.",
    "longestStreak",
    365,
  ),
  achievementReward("ambient-rain", "ambient", "Rain", "50 focus sessions.", "focusSessions", 50),
  achievementReward(
    "ambient-river",
    "ambient",
    "River",
    "100 hours of focused work.",
    "focusHours",
    100,
  ),
  achievementReward(
    "frame-crane",
    "frame",
    "Crane Frame",
    "50 journal entries.",
    "journalEntries",
    50,
  ),
  achievementReward("frame-pine", "frame", "Pine Frame", "A 100-day streak.", "longestStreak", 100),
  achievementReward("enso-broken", "enso", "Broken Circle", "25 workouts logged.", "workouts", 25),
  achievementReward(
    "enso-master-stroke",
    "enso",
    "Master Stroke",
    "250 focus sessions.",
    "focusSessions",
    250,
  ),
];

export const rewardDatabase: RewardDefinition[] = [
  ...progressionRewards,
  ...legendaryRewards,
  ...masteryRewards,
];

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

/** Counts the Reward Engine reads. It never reads XP directly. */
export type AchievementCounts = Record<AchievementMetric, number>;

export type RewardState = RewardDefinition & {
  unlocked: boolean;
  /** How close you are, 0–100, for locked rewards. */
  progressPercent: number;
  /** Human-readable requirement. */
  requirementLabel: string;
};

function requirementLabel(reward: RewardDefinition): string {
  if (reward.unlockType === "level") return `Level ${reward.requirement}`;
  if (reward.unlockType === "journey") return `Journey ${reward.requirement}`;

  const metricLabels: Record<AchievementMetric, string> = {
    workouts: "workouts",
    journalEntries: "journal entries",
    focusSessions: "focus sessions",
    focusHours: "focus hours",
    objectives: "objectives completed",
    longestStreak: "day streak",
  };
  return `${reward.requirement.toLocaleString()} ${metricLabels[reward.metric ?? "workouts"]}`;
}

/**
 * Evaluates every reward against current progression.
 *
 * Note the inputs: level, journey and achievement counts only. XP is
 * deliberately not a parameter — a reward can never be a function of XP alone.
 */
export function evaluateRewards(
  levelWithinJourney: number,
  completedJourneys: number,
  counts: AchievementCounts,
): RewardState[] {
  return rewardDatabase.map((reward) => {
    let current = 0;

    if (reward.unlockType === "level") current = levelWithinJourney;
    else if (reward.unlockType === "journey") current = completedJourneys;
    else current = counts[reward.metric ?? "workouts"] ?? 0;

    const unlocked = current >= reward.requirement;

    return {
      ...reward,
      unlocked,
      progressPercent:
        reward.requirement === 0
          ? 100
          : Math.min(100, Math.round((current / reward.requirement) * 100)),
      requirementLabel: requirementLabel(reward),
    };
  });
}

/** The next thing you can earn — answers "what can I earn next?". */
export function nextUnlock(rewards: RewardState[]): RewardState | null {
  const locked = rewards.filter((r) => !r.unlocked);
  if (locked.length === 0) return null;

  // Prefer the nearest level unlock; it is the one with a knowable date.
  const levelUnlocks = locked
    .filter((r) => r.unlockType === "level")
    .sort((a, b) => a.requirement - b.requirement);
  if (levelUnlocks[0]) return levelUnlocks[0];

  return locked.sort((a, b) => b.progressPercent - a.progressPercent)[0] ?? null;
}

/** Levels remaining until the next level-gated reward. */
export function levelsUntilNextUnlock(
  rewards: RewardState[],
  levelWithinJourney: number,
): number | null {
  const next = rewards
    .filter((r) => !r.unlocked && r.unlockType === "level")
    .sort((a, b) => a.requirement - b.requirement)[0];
  if (!next) return null;
  return Math.max(0, next.requirement - levelWithinJourney);
}

export function rewardsByCategory(rewards: RewardState[]): Map<CosmeticCategory, RewardState[]> {
  const map = new Map<CosmeticCategory, RewardState[]>();
  for (const reward of rewards) {
    const list = map.get(reward.category) ?? [];
    list.push(reward);
    map.set(reward.category, list);
  }
  return map;
}

/** Sanity guard used by tests: no reward may sit above the Journey ceiling. */
export function rewardDatabaseIsValid(): boolean {
  const ids = new Set<string>();
  for (const r of rewardDatabase) {
    if (ids.has(r.id)) return false;
    ids.add(r.id);
    if (r.unlockType === "level" && (r.requirement < 1 || r.requirement > JOURNEY_LEVELS)) {
      return false;
    }
    if (r.unlockType === "achievement" && !r.metric) return false;
  }
  return true;
}
