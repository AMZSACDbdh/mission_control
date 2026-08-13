import {
  deriveStats,
  eventsOfKind,
  sumXp,
  type ActivityEvent,
  type ActivityKind,
  type MasteryStats,
} from "./activity";
import { progressionFor } from "./progression";

/**
 * Seals, achievements and milestones are *earned*, never flagged.
 *
 * Each one carries a predicate over your real statistics, so the Hall of
 * Mastery reflects what actually happened rather than a stored boolean.
 */

/**
 * What a predicate gets to look at: everything the ledger fold produces, plus
 * the level.
 *
 * Level is not part of `MasteryStats` — it comes from the progression engine,
 * which is the single source for it — so it is attached here rather than
 * carried around inside the stats object.
 */
export type EarnContext = MasteryStats & { level: number };

export type Earnable = {
  kanji: string;
  name: string;
  meaning: string;
  /** Plain-language unlock condition, shown to the user. */
  requirement: string;
  test: (ctx: EarnContext) => boolean;
};

export const seals: Earnable[] = [
  {
    kanji: "志",
    name: "Aspiration",
    meaning: "The path is chosen",
    requirement: "Log your first day",
    test: (s) => s.activeDayCount >= 1,
  },
  {
    kanji: "忍",
    name: "Perseverance",
    meaning: "Endure without complaint",
    requirement: "Hold a 7-day streak",
    test: (s) => s.longest >= 7,
  },
  {
    kanji: "誠",
    name: "Sincerity",
    meaning: "Do the work honestly",
    requirement: "Earn 1,000 XP",
    test: (s) => s.totalXp >= 1000,
  },
  {
    kanji: "智",
    name: "Wisdom",
    meaning: "Understanding compounds",
    requirement: "Focus for 10 hours",
    test: (s) => s.focusMinutes >= 600,
  },
  {
    kanji: "勇",
    name: "Courage",
    meaning: "Face the hardest thing first",
    requirement: "Reach level 5",
    test: (s) => s.level >= 5,
  },
  {
    kanji: "礼",
    name: "Respect",
    meaning: "Honour the routine",
    requirement: "Hold a 14-day streak",
    test: (s) => s.longest >= 14,
  },
  {
    kanji: "義",
    name: "Righteousness",
    meaning: "Keep your own standard",
    requirement: "Earn 5,000 XP",
    test: (s) => s.totalXp >= 5000,
  },
  {
    kanji: "信",
    name: "Faith",
    meaning: "Trust the long game",
    requirement: "Hold a 30-day streak",
    test: (s) => s.longest >= 30,
  },
  {
    kanji: "静",
    name: "Stillness",
    meaning: "Quiet the noise",
    requirement: "Focus for 50 hours",
    test: (s) => s.focusMinutes >= 3000,
  },
  {
    kanji: "和",
    name: "Harmony",
    meaning: "All parts in balance",
    requirement: "Reach level 10",
    test: (s) => s.level >= 10,
  },
  {
    kanji: "極",
    name: "Mastery",
    meaning: "The summit, and past it",
    requirement: "Reach level 20",
    test: (s) => s.level >= 20,
  },
  {
    kanji: "無",
    name: "Mushin",
    meaning: "No mind. Only the doing",
    requirement: "Hold a 100-day streak",
    test: (s) => s.longest >= 100,
  },
];

export type Milestone = {
  title: string;
  detail: string;
  test: (ctx: EarnContext) => boolean;
};

export const milestones: Milestone[] = [
  { title: "First Day", detail: "The path begins", test: (s) => s.activeDayCount >= 1 },
  { title: "30 Days", detail: "Of discipline", test: (s) => s.longest >= 30 },
  { title: "100 Days", detail: "Of consistency", test: (s) => s.longest >= 100 },
  { title: "1,000 XP", detail: "Milestone", test: (s) => s.totalXp >= 1000 },
  { title: "100 Hours", detail: "Of focused work", test: (s) => s.focusMinutes >= 6000 },
  { title: "Level 10", detail: "Of growth", test: (s) => s.level >= 10 },
];

/* ------------------------------------------------------------------ *
 * Mastery areas
 * ------------------------------------------------------------------ *
 *
 * Note: the mastery *rings* no longer live here. Cumulative XP can only ever
 * rise, so a lifetime total pins at 100% within weeks and then reads the same
 * a year after you stop — a trophy, not a mirror. The rings now show rolling
 * 30-day form (`formFor` in `activity.ts`), which falls when you stop.
 *
 * Lifetime XP still drives level, rank, seals and records, and never falls.
 */

/* ------------------------------------------------------------------ *
 * When something was earned
 * ------------------------------------------------------------------ */

/** Your statistics as they stood at the end of one day. */
export type TimelinePoint = EarnContext & { day: string };

/**
 * Replays the ledger once and reports what your statistics were at the end of
 * every active day.
 *
 * Build this once and answer every "when was this earned?" question from it.
 * The previous approach re-derived the whole history *inside* each predicate —
 * filtering the full event list and folding it again for every day, for each of
 * the twelve seals and six milestones, three times per Hall render. That is
 * O(days² × events) work repeated fifty-four times; here it is one pass, and
 * each predicate is then a linear scan over at most one point per day.
 */
export function buildStatsTimeline(events: ActivityEvent[]): TimelinePoint[] {
  const sorted = [...events].sort((a, b) => a.day.localeCompare(b.day));
  const days = [...new Set(sorted.map((e) => e.day))];

  const timeline: TimelinePoint[] = [];
  const soFar: ActivityEvent[] = [];
  let cursor = 0;

  for (const day of days) {
    // Events arrive in day order, so the running prefix only ever grows.
    while (cursor < sorted.length && sorted[cursor]!.day <= day) {
      soFar.push(sorted[cursor]!);
      cursor += 1;
    }
    const stats = deriveStats(soFar, day);
    timeline.push({ ...stats, level: progressionFor(stats.totalXp).currentLevel, day });
  }

  return timeline;
}

/**
 * The first day a condition held, or null if it never has. Gives every unlock a
 * real date instead of an invented one.
 */
export function firstDayMeeting(
  timeline: TimelinePoint[],
  predicate: (ctx: EarnContext) => boolean,
): string | null {
  for (const point of timeline) {
    if (predicate(point)) return point.day;
  }
  return null;
}

export function formatDay(day: string | null): string {
  if (!day) return "Not yet";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
