/**
 * Training: the session you intend to do, and whether you did it.
 *
 * The split mirrors the day plan. The **exercise list is a plan** — durable,
 * yours, editable. **Whether you trained is a ledger event** — one `workout`
 * per day, and the only thing any statistic reads.
 *
 * Ticks against individual exercises are neither: they are a cursor marking
 * your place in today's session. They drive the progress bar and nothing else,
 * they hold only today, and losing them costs a few taps. No statistic reads
 * them, so they cannot desynchronise from anything.
 */

import { previousDay, type ActivityEvent } from "./activity";

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
};

/** One workout per day. The ref is the day, so a session counts exactly once. */
export const workoutRef = (day: string) => `workout:${day}`;

/**
 * Today's place in the session.
 *
 * Holds a single day on purpose: yesterday's ticks are not a record — the
 * ledger event is — so keeping them would be storing a second, weaker copy of
 * something already true elsewhere. A new day arrives with an empty list, the
 * same way Daily Disciplines resets by having no events yet.
 */
export type SessionCursor = {
  day: string;
  doneIds: string[];
};

export const emptySession = (day: string): SessionCursor => ({ day, doneIds: [] });

/** The cursor, but only if it belongs to today. Otherwise a fresh one. */
export function sessionForDay(cursor: SessionCursor | null, day: string): SessionCursor {
  return cursor && cursor.day === day ? cursor : emptySession(day);
}

export type FitnessStore = {
  exercises: Exercise[];
  session: SessionCursor | null;
};

/**
 * A session counts when every exercise on the list is ticked.
 *
 * An empty list is never complete — otherwise deleting your last exercise would
 * silently award a workout.
 */
export function isSessionComplete(exercises: Exercise[], doneIds: string[]): boolean {
  return exercises.length > 0 && exercises.every((e) => doneIds.includes(e.id));
}

/* ------------------------------------------------------------------ *
 * Derived from the ledger — never stored
 * ------------------------------------------------------------------ */

export function workoutDays(events: ActivityEvent[]): Set<string> {
  const days = new Set<string>();
  for (const e of events) if (e.kind === "workout") days.add(e.day);
  return days;
}

/** Sessions logged in the last `days` days, today included. */
export function sessionsInLast(events: ActivityEvent[], today: string, days = 7): number {
  const logged = workoutDays(events);
  let cursor = today;
  let count = 0;
  for (let i = 0; i < days; i += 1) {
    if (logged.has(cursor)) count += 1;
    cursor = previousDay(cursor);
  }
  return count;
}

/**
 * Consecutive training days ending today.
 *
 * Counts from yesterday when today has no session yet, so the streak you built
 * does not appear to vanish every morning before you train.
 */
export function trainingStreak(events: ActivityEvent[], today: string): number {
  const logged = workoutDays(events);
  let cursor = logged.has(today) ? today : previousDay(today);
  let streak = 0;
  while (logged.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/**
 * Sessions per week for the last `weeks` weeks, oldest first.
 *
 * Replaces a fixed six-bar chart that showed the same invented figures forever.
 * Counting *sessions* rather than kilograms is deliberate: nothing in the app
 * records the weight you lift, so a volume chart could only ever be fiction.
 */
export function sessionsByWeek(
  events: ActivityEvent[],
  today: string,
  weeks = 6,
): { label: string; value: number }[] {
  const logged = workoutDays(events);
  const buckets: number[] = [];
  let cursor = today;

  for (let w = 0; w < weeks; w += 1) {
    let count = 0;
    for (let d = 0; d < 7; d += 1) {
      if (logged.has(cursor)) count += 1;
      cursor = previousDay(cursor);
    }
    buckets.unshift(count);
  }

  return buckets.map((value, i) => ({ label: `W${i + 1}`, value }));
}

export const defaultExercises: Exercise[] = [
  { id: "e-squat", name: "Back Squat", sets: 4, reps: "6", weight: "90 kg" },
  { id: "e-rdl", name: "Romanian Deadlift", sets: 3, reps: "8", weight: "70 kg" },
  { id: "e-press", name: "Leg Press", sets: 3, reps: "10", weight: "140 kg" },
  { id: "e-curl", name: "Hamstring Curl", sets: 3, reps: "12", weight: "35 kg" },
  { id: "e-calf", name: "Standing Calf Raise", sets: 4, reps: "15", weight: "60 kg" },
];
