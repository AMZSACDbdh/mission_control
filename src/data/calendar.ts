/**
 * The calendar, derived.
 *
 * There is no calendar store, and there must never be one. A month view is not
 * a thing you record — it is a *view* over things already recorded elsewhere:
 *
 *   • the ledger        → what actually happened
 *   • day plans         → what you committed to
 *   • mission due dates → what falls due
 *
 * A parallel store is precisely what produced the bug this replaces: thirteen
 * sample events that reappeared, identically, in every month of every year. It
 * could not be wrong about a *particular* month because it never knew which
 * month it was showing.
 *
 * The rule that keeps this honest: **past is what happened, future is what is
 * committed.** A past day reads from the ledger only — the plan you wrote that
 * morning is not evidence you did it. A future day reads from plans only, since
 * nothing has happened yet. Today shows both.
 */

import type { ActivityEvent, Area } from "./activity";
import type { DayPlan, IconKey } from "./plan";
import type { Mission, MissionCategory } from "./missionsData";
import { areaForIcon } from "./icons";

export type CalendarCategory = "study" | "training" | "project" | "personal";

export type CalendarEntry = {
  /** Local day key, `YYYY-MM-DD`. */
  day: string;
  /** Local `HH:MM`, or null when the commitment has no time of day. */
  time: string | null;
  label: string;
  category: CalendarCategory;
  /** True when this is a record of something done, false when it is a plan. */
  happened: boolean;
};

/* ------------------------------------------------------------------ *
 * Categorisation
 * ------------------------------------------------------------------ */

const areaCategory: Record<Area, CalendarCategory> = {
  knowledge: "study",
  mind: "study",
  body: "training",
  discipline: "personal",
  spirit: "personal",
};

const missionCategory: Record<MissionCategory, CalendarCategory> = {
  Study: "study",
  Projects: "project",
  Fitness: "training",
  Personal: "personal",
  Finance: "personal",
};

/**
 * Event kinds worth a calendar row.
 *
 * `subtask` is excluded deliberately: a step is progress *within* a task, and
 * listing every tick would bury the day it belongs to. `focus-bonus` is
 * excluded for the same reason — it is an adjustment to a task, not a separate
 * thing that happened.
 */
const SHOWN_KINDS = new Set([
  "focus",
  "task",
  "objective",
  "workout",
  "discipline",
  "journal",
  "study",
]);

function localTime(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

function minutesToClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}`;
}

/**
 * Mission due dates are stored as display text like "May 24" — there is no year
 * in them. They are resolved against the year being viewed, which is the only
 * reading that makes a due date mean anything on a month grid.
 */
export function resolveDueDate(dueDate: string, year: number): string | null {
  const parsed = new Date(`${dueDate} ${year}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${`${parsed.getMonth() + 1}`.padStart(2, "0")}-${`${parsed.getDate()}`.padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ *
 * The fold
 * ------------------------------------------------------------------ */

export function deriveCalendar(input: {
  events: ActivityEvent[];
  plans: Record<string, DayPlan>;
  missions: Mission[];
  /** Local day key for today, so past and future can be told apart. */
  today: string;
  /** Year in view, used to resolve year-less mission due dates. */
  year: number;
}): CalendarEntry[] {
  const { events, plans, missions, today, year } = input;
  const entries: CalendarEntry[] = [];

  // 1. What happened. The ledger is the only witness to the past.
  for (const e of events) {
    if (!SHOWN_KINDS.has(e.kind)) continue;
    entries.push({
      day: e.day,
      time: localTime(e.at),
      label: e.label || e.kind,
      category: areaCategory[e.area] ?? "personal",
      happened: true,
    });
  }

  // 2. What is committed. Only today and later — a plan for a past day is an
  //    intention that the ledger has already answered, one way or the other.
  for (const [day, plan] of Object.entries(plans)) {
    if (day < today) continue;

    for (const block of plan.timeline ?? []) {
      entries.push({
        day,
        time: minutesToClock(block.startMinutes),
        label: block.label,
        category: "personal",
        happened: false,
      });
    }

    for (const task of plan.tasks ?? []) {
      entries.push({
        day,
        time: null,
        label: task.title,
        category: areaCategory[areaForIcon[task.iconKey as IconKey] ?? "discipline"],
        happened: false,
      });
    }

    if (plan.objective?.title) {
      entries.push({
        day,
        time: null,
        label: plan.objective.title,
        category: "personal",
        happened: false,
      });
    }
  }

  // 3. What falls due.
  for (const m of missions) {
    if (!m.dueDate || m.archived) continue;
    const day = resolveDueDate(m.dueDate, year);
    if (!day) continue;
    entries.push({
      day,
      time: m.scheduleTime ?? null,
      label: `${m.title} due`,
      category: missionCategory[m.category] ?? "personal",
      happened: m.completed,
    });
  }

  return entries;
}

/** Groups entries by day, each day sorted with timed items first, in clock order. */
export function groupByDay(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.day) ?? [];
    list.push(entry);
    map.set(entry.day, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.label.localeCompare(b.label);
    });
  }
  return map;
}
