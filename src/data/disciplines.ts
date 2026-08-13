import {
  eventsOfKind,
  eventsOn,
  previousDay,
  recentDays,
  type ActivityEvent,
  type Area,
} from "./activity";

/**
 * Daily disciplines.
 *
 * The crucial separation: a discipline's *definition* (what it is, its target)
 * is durable, but its *completion* is never stored on the definition. Completion
 * is a dated ledger event, so today starts empty on its own — no reset logic to
 * forget, and yesterday's ticks can never bleed into today.
 */

export type DisciplineIcon =
  "hydration" | "workout" | "reading" | "meditation" | "coding" | "study" | "journal" | "walking";

export type Discipline = {
  id: string;
  name: string;
  target: number;
  unit: string;
  iconType: DisciplineIcon;
  area: Area;
};

/** The starting set. Editable, and only a seed — not a source of truth. */
export const defaultDisciplines: Discipline[] = [
  {
    id: "d-hydration",
    name: "HYDRATION",
    target: 8,
    unit: "Glasses",
    iconType: "hydration",
    area: "body",
  },
  { id: "d-workout", name: "WORKOUT", target: 60, unit: "Min", iconType: "workout", area: "body" },
  {
    id: "d-reading",
    name: "READING",
    target: 30,
    unit: "Min",
    iconType: "reading",
    area: "knowledge",
  },
  {
    id: "d-meditation",
    name: "MEDITATION",
    target: 20,
    unit: "Min",
    iconType: "meditation",
    area: "spirit",
  },
  {
    id: "d-coding",
    name: "CODING",
    target: 90,
    unit: "Min",
    iconType: "coding",
    area: "knowledge",
  },
  { id: "d-study", name: "STUDY", target: 120, unit: "Min", iconType: "study", area: "knowledge" },
  {
    id: "d-journal",
    name: "JOURNAL",
    target: 1,
    unit: "Entry",
    iconType: "journal",
    area: "spirit",
  },
  {
    id: "d-walking",
    name: "WALKING",
    target: 8000,
    unit: "Steps",
    iconType: "walking",
    area: "body",
  },
];

/** The ledger ref that records one discipline done on one day. */
export function disciplineRef(day: string, id: string): string {
  return `discipline:${day}:${id}`;
}

export function isDoneOn(events: ActivityEvent[], day: string, id: string): boolean {
  const ref = disciplineRef(day, id);
  return events.some((e) => e.ref === ref);
}

export function completedOn(events: ActivityEvent[], day: string): number {
  return eventsOn(eventsOfKind(events, "discipline"), day).length;
}

/* ------------------------------------------------------------------ *
 * Consistency — measured, not asserted
 * ------------------------------------------------------------------ */

/**
 * Share of possible discipline-completions actually achieved over a window.
 * Days before you started are excluded, so a new user isn't told they're at 3%.
 */
export function consistencyOver(
  events: ActivityEvent[],
  today: string,
  days: number,
  total: number,
): number {
  if (total === 0) return 0;
  const disciplineEvents = eventsOfKind(events, "discipline");
  if (disciplineEvents.length === 0) return 0;

  const firstDay = [...disciplineEvents].map((e) => e.day).sort()[0]!;
  const window = recentDays(today, days).filter((d) => d >= firstDay);
  if (window.length === 0) return 0;

  const achieved = window.reduce((sum, day) => sum + completedOn(events, day), 0);
  return Math.round((achieved / (window.length * total)) * 100);
}

/** Per-day completion counts across a window, oldest first — for the trend line. */
export function trendOver(
  events: ActivityEvent[],
  today: string,
  days: number,
): { day: string; count: number }[] {
  return recentDays(today, days).map((day) => ({ day, count: completedOn(events, day) }));
}

/** Consecutive days ending today where at least one discipline was completed. */
export function disciplineStreak(events: ActivityEvent[], today: string): number {
  let cursor = completedOn(events, today) > 0 ? today : previousDay(today);
  let streak = 0;
  while (completedOn(events, cursor) > 0) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** The most disciplines ever completed in a single day. */
export function personalBest(events: ActivityEvent[]): number {
  const perDay = new Map<string, number>();
  for (const e of eventsOfKind(events, "discipline")) {
    perDay.set(e.day, (perDay.get(e.day) ?? 0) + 1);
  }
  let best = 0;
  for (const count of perDay.values()) best = Math.max(best, count);
  return best;
}

/** How many days this specific discipline has been kept, ending today. */
export function streakFor(events: ActivityEvent[], today: string, id: string): number {
  let cursor = isDoneOn(events, today, id) ? today : previousDay(today);
  let streak = 0;
  while (isDoneOn(events, cursor, id)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}
