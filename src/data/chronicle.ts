/**
 * Journey Chronicles and Menkyo Scrolls.
 *
 * Implements docs/03_PROGRESSION_ENGINE.md Parts 2 and 3.
 *
 * Both are generated automatically from the ledger — **no AI, no editing**.
 * Once written they are historical truth: immutable, undeletable, never
 * overwritten. A Journey produces exactly one Chronicle and exactly one Scroll.
 */

import {
  activeDays,
  bestDay,
  eventsOfKind,
  longestStreakOf,
  sumMinutes,
  sumXp,
  type ActivityEvent,
  type Area,
} from "./activity";
import { JOURNEY_XP, xpAtJourneyLevel } from "./progression";

export type JourneyRecord = {
  id: string;
  journey: number;
  startedAt: string;
  completedAt: string;
  durationDays: number;
  journeyXP: number;
  lifetimeXP: number;
  focusHours: number;
  studyHours: number;
  workouts: number;
  journalEntries: number;
  objectivesCompleted: number;
  tasksCompleted: number;
  bestXPDay: number;
  longestFocusSession: number;
  longestStreak: number;
  favouriteQuote?: string;
  strongestArea: Area;
  mostImprovedArea: Area;
  levelsEarned: number;
  ranksEarned: number;
  promotionTimeline: { level: number; day: string }[];
};

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy!, fm! - 1, fd!).getTime();
  const b = new Date(ty!, tm! - 1, td!).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/**
 * The events belonging to one Journey, in order.
 *
 * A Journey owns a contiguous band of lifetime XP. We replay the ledger
 * chronologically and take the events whose running total falls in that band —
 * derived from history, never stored.
 */
export function eventsForJourney(events: ActivityEvent[], journey: number): ActivityEvent[] {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const out: ActivityEvent[] = [];
  let running = 0;

  for (const event of ordered) {
    running += event.xp;

    // Each event belongs to exactly ONE Journey — the one its XP landed in.
    // An earlier version asked whether an event *touched* a Journey's band,
    // which counted boundary-straddling events in two Chronicles and inflated
    // the permanent record. Chronicles are immutable, so that error could
    // never be repaired; assignment must be exclusive.
    const landedIn = Math.floor(Math.max(0, running - 1) / JOURNEY_XP) + 1;

    if (landedIn === journey) out.push(event);
    else if (landedIn > journey) break;
  }

  return out;
}

/** When each promotion in a Journey was actually reached, by replay. */
export function promotionTimelineFor(
  events: ActivityEvent[],
  journey: number,
  promotionLevels: number[],
): { level: number; day: string }[] {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const timeline: { level: number; day: string }[] = [];
  const remaining = [...promotionLevels];
  let running = 0;

  for (const event of ordered) {
    running += event.xp;
    while (remaining.length > 0) {
      const level = remaining[0]!;
      if (running >= xpAtJourneyLevel(journey, level)) {
        timeline.push({ level, day: event.day });
        remaining.shift();
      } else break;
    }
    if (remaining.length === 0) break;
  }

  return timeline;
}

function areaTotals(events: ActivityEvent[]): Record<Area, number> {
  const totals: Record<Area, number> = {
    discipline: 0,
    mind: 0,
    body: 0,
    knowledge: 0,
    spirit: 0,
  };
  for (const e of events) totals[e.area] += e.xp;
  return totals;
}

function strongest(totals: Record<Area, number>): Area {
  return (Object.entries(totals) as [Area, number][]).sort((a, b) => b[1] - a[1])[0]![0];
}

/**
 * Builds the Chronicle for a completed Journey. Deterministic: the same ledger
 * always produces the same Chronicle.
 */
export function generateChronicle(
  allEvents: ActivityEvent[],
  journey: number,
  promotionLevels: number[],
  favouriteQuote?: string,
): JourneyRecord {
  const events = eventsForJourney(allEvents, journey);
  const days = activeDays(events).sort();
  const startedAt = days[0] ?? "";
  const completedAt = days[days.length - 1] ?? startedAt;

  const totals = areaTotals(events);
  const firstHalf = events.slice(0, Math.floor(events.length / 2));
  const secondHalf = events.slice(Math.floor(events.length / 2));
  const improvement = areaTotals(secondHalf);
  const baseline = areaTotals(firstHalf);
  const mostImproved = (Object.keys(improvement) as Area[]).sort(
    (a, b) => improvement[b] - baseline[b] - (improvement[a] - baseline[a]),
  )[0]!;

  const focusEvents = eventsOfKind(events, "focus");

  return {
    id: `journey-${journey}`,
    journey,
    startedAt,
    completedAt,
    durationDays: startedAt && completedAt ? daysBetween(startedAt, completedAt) : 0,
    journeyXP: sumXp(events),
    lifetimeXP: journey * JOURNEY_XP,
    focusHours: Math.round((sumMinutes(events, "focus") / 60) * 10) / 10,
    studyHours: Math.round((sumMinutes(events, "study") / 60) * 10) / 10,
    workouts: eventsOfKind(events, "workout").length,
    journalEntries: eventsOfKind(events, "journal").length,
    objectivesCompleted: eventsOfKind(events, "objective").length,
    tasksCompleted: eventsOfKind(events, "task").length,
    bestXPDay: bestDay(events, (e) => e.xp),
    longestFocusSession: focusEvents.reduce((best, e) => Math.max(best, e.minutes ?? 0), 0),
    longestStreak: longestStreakOf(events),
    ...(favouriteQuote ? { favouriteQuote } : {}),
    strongestArea: strongest(totals),
    mostImprovedArea: mostImproved,
    levelsEarned: 100,
    ranksEarned: promotionLevels.length + 1,
    promotionTimeline: promotionTimelineFor(allEvents, journey, promotionLevels),
  };
}

/**
 * The Menkyo Scroll — a certificate, not a collectible.
 * It is the Chronicle sealed: same data, permanent, unmodifiable.
 */
export type MenkyoScroll = {
  id: string;
  journey: number;
  awardedOn: string;
  record: JourneyRecord;
};

export function generateMenkyo(record: JourneyRecord): MenkyoScroll {
  return {
    id: `menkyo-${record.journey}`,
    journey: record.journey,
    awardedOn: record.completedAt,
    record,
  };
}
