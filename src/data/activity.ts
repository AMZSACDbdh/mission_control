/**
 * The activity ledger — the single source of truth for every number in the app.
 *
 * Three rules hold this together. Break any one and the numbers start lying:
 *
 *  1. **Derive everything, store nothing.** No statistic is ever written down.
 *     XP, level, rank, streaks, hours and records are folded from this log.
 *
 *  2. **XP is frozen on the event.** The awarded amount and its `rateVersion`
 *     are recorded at log time. Rebalancing the rates below changes the future
 *     only — two years of history never silently re-prices itself.
 *
 *  3. **The day key is frozen on the event.** Computed once, at log time, in
 *     the zone you were actually in. Flying to another timezone cannot
 *     retroactively reshuffle which day your past work belongs to.
 *
 * Each event also carries a stable `ref`. Ticking a step appends it; unticking
 * removes that exact ref rather than appending a negative-XP compensator, which
 * would pollute history and break per-day analysis.
 */

/** Bump when the rates below change. Existing events keep their old version. */
export const RATE_VERSION = 2;

/**
 * Days roll over at 04:00, not midnight — work logged at 00:30 belongs to the
 * day you experienced it as, which is how you'd describe it to another person.
 */
export const DAY_BOUNDARY_HOUR = 4;

export type ActivityKind =
  | "subtask"
  | "task"
  | "objective"
  | "focus"
  | "focus-bonus"
  | "workout"
  | "discipline"
  | "journal"
  | "study";

/** The five faces of practice. Every event belongs to exactly one. */
export type Area = "discipline" | "mind" | "body" | "knowledge" | "spirit";

export const areas: Area[] = ["discipline", "mind", "body", "knowledge", "spirit"];

export type ActivityEvent = {
  /** Merge identity. Two devices union by this and cannot conflict. */
  id: string;
  /** Stable dedupe key, e.g. `subtask:2026-08-04:t1:t1-s0`. Reversal targets this. */
  ref: string;
  kind: ActivityKind;
  area: Area;
  /** Frozen at log time. Never recomputed. */
  xp: number;
  rateVersion: number;
  /** ISO UTC instant. */
  at: string;
  /** Local day key at the 04:00 boundary, frozen at log time. */
  day: string;
  /** IANA zone at log time. */
  tz: string;
  /** Measured minutes, where the activity represents real elapsed time. */
  minutes?: number;
  /**
   * The planned task this event belongs to, when it has one.
   *
   * Identity, not description. Focus sessions previously linked back to a task
   * by testing whether the label *contained* the task title, which mis-awarded
   * the completion bonus whenever a task was renamed or one title happened to
   * contain another. Labels are for people; this is for the code.
   */
  taskId?: string;
  label: string;
};

/* ------------------------------------------------------------------ *
 * Day keys
 * ------------------------------------------------------------------ */

function pad(n: number) {
  return `${n}`.padStart(2, "0");
}

/** Local `YYYY-MM-DD`, shifted so the day begins at DAY_BOUNDARY_HOUR. */
export function dayKeyFor(date: Date = new Date(), boundaryHour = DAY_BOUNDARY_HOUR): string {
  const shifted = new Date(date.getTime() - boundaryHour * 3_600_000);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

export function currentZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d! - 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nextDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d! + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The last `count` day keys ending at `today`, oldest first. */
export function recentDays(today: string, count: number): string[] {
  const out: string[] = [today];
  for (let i = 1; i < count; i += 1) out.unshift(previousDay(out[0]!));
  return out;
}

/* ------------------------------------------------------------------ *
 * The economy
 * ------------------------------------------------------------------ */

export type Priority = "critical" | "high" | "standard";

/**
 * A task is worth a fixed amount, regardless of how finely you slice it.
 * Half the pot is split across its steps, half is paid on completion — so
 * writing twelve steps instead of three cannot inflate the reward. Steps are
 * progress markers, not currency.
 */
export const TASK_POT: Record<Priority, number> = {
  critical: 200,
  high: 140,
  standard: 80,
};

/** The daily objective follows the same shape. */
export const OBJECTIVE_POT = 150;

/** Per-step value: half the pot, divided by however many steps there are. */
export function stepXpFor(pot: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.max(1, Math.floor(pot / 2 / stepCount));
}

/** The other half, paid once every step is done. */
export function completionXpFor(pot: number): number {
  return Math.round(pot / 2);
}

/**
 * Focus pays per measured minute, on a decaying curve.
 *
 * Hour eight of deep work is not worth what hour one was, and a flat rate makes
 * sitting still the single most profitable activity in the app. Tiers apply to
 * minutes already banked *that day*, so the curve resets each morning.
 */
export const FOCUS_TIERS = [
  { upToMinutes: 120, multiplier: 1 },
  { upToMinutes: 240, multiplier: 0.75 },
  { upToMinutes: Infinity, multiplier: 0.5 },
];

function multiplierAt(minuteIndex: number): number {
  for (const tier of FOCUS_TIERS) if (minuteIndex < tier.upToMinutes) return tier.multiplier;
  return 0.5;
}

/** Integrates the decay curve across the minutes this session actually adds. */
export function focusXpFor(minutesAlreadyToday: number, minutes: number): number {
  let xp = 0;
  for (let i = 0; i < minutes; i += 1) xp += multiplierAt(minutesAlreadyToday + i);
  return Math.round(xp);
}

/**
 * The one place effort and outcome are linked: focus that fed a task you
 * actually finished the same day is worth a quarter more. Awarded as its own
 * event so history stays immutable and the bonus is reversible with the task.
 */
export const FOCUS_COMPLETION_BONUS = 0.25;

/**
 * Focus XP banked against one task on one day.
 *
 * Matched by `taskId`, never by label — renaming a task must not redirect or
 * orphan the bonus it earned.
 */
export function focusXpForTask(
  events: ActivityEvent[],
  day: string,
  taskId: string,
  extra = 0,
): number {
  return (
    events
      .filter((e) => e.kind === "focus" && e.day === day && e.taskId === taskId)
      .reduce((sum, e) => sum + e.xp, 0) + extra
  );
}

/**
 * The bonus owed for that focus.
 *
 * Both writers call this: Home when the last step is ticked, and Focus when a
 * session lands on a task that is already finished. One definition, so the two
 * paths cannot drift into awarding different amounts for the same day's work.
 */
export function focusBonusXp(focusXp: number): number {
  return Math.round(focusXp * FOCUS_COMPLETION_BONUS);
}

/** Legacy flat rates, still used by activities not yet on the pot model. */
export const XP = {
  workout: 80,
  discipline: 15,
  journal: 30,
} as const;

/* ------------------------------------------------------------------ *
 * Progression — lifetime, and monotonic by design
 * ------------------------------------------------------------------ */

/**
 * Levels, Master Ranks and Journeys live in `progression.ts` — one engine, one
 * definition. This module re-exports them so nothing bypasses that engine.
 */
import {
  progressionFor as deriveProgression,
  type MasterRank as MasterRankType,
  type ProgressionState as ProgressionStateType,
} from "./progression";

export {
  JOURNEY_LEVELS,
  JOURNEY_XP,
  masterRanks,
  nextRankAfter,
  progressionFor,
  PROMOTION_LEVELS,
  promotionsBetween,
  rankForLevel,
  xpToNextLevel,
  type MasterRank,
  type ProgressionState,
} from "./progression";

/* ------------------------------------------------------------------ *
 * Folds
 * ------------------------------------------------------------------ */

export function sumXp(events: ActivityEvent[]): number {
  return events.reduce((total, e) => total + e.xp, 0);
}

export function sumMinutes(events: ActivityEvent[], kind?: ActivityKind): number {
  return events
    .filter((e) => (kind ? e.kind === kind : true))
    .reduce((total, e) => total + (e.minutes ?? 0), 0);
}

export function eventsOn(events: ActivityEvent[], day: string): ActivityEvent[] {
  return events.filter((e) => e.day === day);
}

export function eventsOfKind(events: ActivityEvent[], kind: ActivityKind): ActivityEvent[] {
  return events.filter((e) => e.kind === kind);
}

export function eventsInArea(events: ActivityEvent[], area: Area): ActivityEvent[] {
  return events.filter((e) => e.area === area);
}

export function activeDays(events: ActivityEvent[]): string[] {
  return [...new Set(events.map((e) => e.day))].sort().reverse();
}

export function byDay(
  events: ActivityEvent[],
  measure: (e: ActivityEvent) => number,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of events) map.set(e.day, (map.get(e.day) ?? 0) + measure(e));
  return map;
}

export function bestDay(events: ActivityEvent[], measure: (e: ActivityEvent) => number): number {
  let best = 0;
  for (const total of byDay(events, measure).values()) best = Math.max(best, total);
  return best;
}

/* ------------------------------------------------------------------ *
 * Streaks — a Minimum Viable Day, plus grace
 * ------------------------------------------------------------------ */

/**
 * A day counts only if it clears a real bar. "Any logged event" means one tap
 * at 23:58 preserves a 90-day streak, and a streak you can fake is a streak
 * that stops meaning anything.
 */
export const MVD = {
  focusMinutes: 25,
  xp: 100,
};

export function dayQualifies(dayEvents: ActivityEvent[]): boolean {
  if (dayEvents.length === 0) return false;
  const focus = sumMinutes(dayEvents, "focus");
  if (focus >= MVD.focusMinutes) return true;
  if (dayEvents.some((e) => e.kind === "objective")) return true;
  return sumXp(dayEvents) >= MVD.xp;
}

/** One token per 7 unbroken days, held at most two. */
export const GRACE = { earnEvery: 7, max: 2 };

export type StreakState = {
  current: number;
  longest: number;
  /** Unspent grace tokens. */
  tokens: number;
  /** Days the streak survived by spending a token — shown hollow, not solid. */
  recovered: string[];
  /** True once today itself clears the bar. */
  todayQualifies: boolean;
};

/**
 * Walks the whole history forward, because grace tokens are earned and spent in
 * order. Today never breaks a streak just for being unfinished.
 */
export function streakState(events: ActivityEvent[], today: string): StreakState {
  if (events.length === 0) {
    return { current: 0, longest: 0, tokens: 0, recovered: [], todayQualifies: false };
  }

  const perDay = new Map<string, ActivityEvent[]>();
  for (const e of events) {
    const list = perDay.get(e.day) ?? [];
    list.push(e);
    perDay.set(e.day, list);
  }

  const qualifies = (day: string) => dayQualifies(perDay.get(day) ?? []);

  const firstDay = [...perDay.keys()].sort()[0]!;
  let current = 0;
  let longest = 0;
  let tokens = 0;
  let sinceToken = 0;
  const recovered: string[] = [];

  for (let day = firstDay; day < today; day = nextDay(day)) {
    if (qualifies(day)) {
      current += 1;
      sinceToken += 1;
      if (sinceToken >= GRACE.earnEvery) {
        tokens = Math.min(GRACE.max, tokens + 1);
        sinceToken = 0;
      }
    } else if (tokens > 0) {
      // A missed day spends grace rather than erasing weeks of real work.
      tokens -= 1;
      current += 1;
      recovered.push(day);
    } else {
      current = 0;
      sinceToken = 0;
    }
    longest = Math.max(longest, current);
  }

  const todayQualifies = qualifies(today);
  if (todayQualifies) {
    current += 1;
    longest = Math.max(longest, current);
  }

  return { current, longest, tokens, recovered, todayQualifies };
}

/**
 * Longest streak contained in a set of events, without needing a "today" —
 * used by Journey Chronicles, which describe a closed period.
 */
export function longestStreakOf(events: ActivityEvent[]): number {
  if (events.length === 0) return 0;
  const lastDay = [...new Set(events.map((e) => e.day))].sort().pop()!;
  return streakState(events, lastDay).longest;
}

/* ------------------------------------------------------------------ *
 * Form — the rolling mirror, distinct from the lifetime trophy
 * ------------------------------------------------------------------ */

/**
 * XP per area over 30 days that reads as 100%. Set to a sustainable cadence,
 * not a heroic one — the ring should be reachable and should fall when you stop.
 */
export const FORM_TARGET_30: Record<Area, number> = {
  discipline: 1500,
  mind: 1200,
  body: 1000,
  knowledge: 1200,
  spirit: 600,
};

export const FORM_WINDOW_DAYS = 30;

export type AreaForm = {
  area: Area;
  label: string;
  /** XP earned in this area across the rolling window. */
  windowXp: number;
  target: number;
  /** 0–100, clamped. */
  percent: number;
  /** Days since anything was logged here, or null if never. */
  daysSinceLast: number | null;
};

const areaLabels: Record<Area, string> = {
  discipline: "Discipline",
  mind: "Mind",
  body: "Body",
  knowledge: "Knowledge",
  spirit: "Spirit",
};

export function formFor(events: ActivityEvent[], today: string): AreaForm[] {
  const window = new Set(recentDays(today, FORM_WINDOW_DAYS));

  return areas.map((area) => {
    const inArea = eventsInArea(events, area);
    const windowXp = sumXp(inArea.filter((e) => window.has(e.day)));

    const lastDay =
      inArea
        .map((e) => e.day)
        .sort()
        .pop() ?? null;
    let daysSinceLast: number | null = null;
    if (lastDay) {
      daysSinceLast = 0;
      let cursor = today;
      while (cursor > lastDay && daysSinceLast < 400) {
        cursor = previousDay(cursor);
        daysSinceLast += 1;
      }
    }

    const target = FORM_TARGET_30[area];
    return {
      area,
      label: areaLabels[area],
      windowXp,
      target,
      percent: Math.min(100, Math.round((windowXp / target) * 100)),
      daysSinceLast,
    };
  });
}

export function overallForm(form: AreaForm[]): number {
  if (form.length === 0) return 0;
  return Math.round(form.reduce((sum, f) => sum + f.percent, 0) / form.length);
}

/* ------------------------------------------------------------------ *
 * The single fold every dashboard reads
 * ------------------------------------------------------------------ */

/**
 * What the ledger says about you, excluding progression.
 *
 * Level, rank and Journey are deliberately *not* here. They used to be, which
 * meant two ways to reach one value — `stats.progression` and
 * `useProgression()` — both calling the same pure function today, but two
 * access paths to one number is how divergence starts. There is now exactly
 * one: `useProgression()`. This type owns everything else the fold produces.
 */
export type MasteryStats = {
  totalXp: number;
  /** Current streak, grace included. */
  streak: number;
  longest: number;
  streakTokens: number;
  todayQualifies: boolean;
  recoveredDays: string[];
  focusMinutes: number;
  totalMinutes: number;
  activeDayCount: number;
  xpToday: number;
  bestXpDay: number;
  bestFocusDay: number;
  form: AreaForm[];
  overallForm: number;
};

export function deriveStats(events: ActivityEvent[], today: string): MasteryStats {
  const totalXp = sumXp(events);
  const streak = streakState(events, today);
  const form = formFor(events, today);

  return {
    totalXp,
    streak: streak.current,
    longest: streak.longest,
    streakTokens: streak.tokens,
    todayQualifies: streak.todayQualifies,
    recoveredDays: streak.recovered,
    focusMinutes: sumMinutes(events, "focus"),
    totalMinutes: sumMinutes(events),
    activeDayCount: activeDays(events).length,
    xpToday: sumXp(eventsOn(events, today)),
    bestXpDay: bestDay(events, (e) => e.xp),
    bestFocusDay: bestDay(eventsOfKind(events, "focus"), (e) => e.minutes ?? 0),
    form,
    overallForm: overallForm(form),
  };
}

/* ------------------------------------------------------------------ *
 * Migration
 * ------------------------------------------------------------------ */

const kindToArea: Record<string, Area> = {
  subtask: "discipline",
  task: "discipline",
  objective: "discipline",
  focus: "mind",
  "focus-bonus": "mind",
  workout: "body",
  discipline: "discipline",
  journal: "spirit",
  study: "knowledge",
};

/** Brings pre-v2 events up to the current shape without altering their XP. */
export function migrateEvent(raw: Partial<ActivityEvent> & { ref: string }): ActivityEvent {
  return {
    id: raw.id ?? raw.ref,
    ref: raw.ref,
    kind: (raw.kind ?? "subtask") as ActivityKind,
    area: raw.area ?? kindToArea[raw.kind ?? "subtask"] ?? "discipline",
    xp: raw.xp ?? 0,
    rateVersion: raw.rateVersion ?? 1,
    at: raw.at ?? new Date().toISOString(),
    day: raw.day ?? dayKeyFor(new Date()),
    tz: raw.tz ?? currentZone(),
    ...(raw.minutes === undefined ? {} : { minutes: raw.minutes }),
    // Events logged before `taskId` existed simply do not have one. They stay
    // valid; they just cannot claim a focus completion bonus.
    ...(raw.taskId === undefined ? {} : { taskId: raw.taskId }),
    label: raw.label ?? "",
  };
}

/**
 * A genuinely unique id.
 *
 * An earlier version derived the id from `ref + Date.now()`, which collided for
 * two events created in the same millisecond — the second was then silently
 * dropped by the ref guard, losing real work. Identity must not depend on the
 * clock.
 */
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the manual path.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Creates a fully-formed event, freezing XP, day and zone at this instant. */
export function makeEvent(input: {
  ref: string;
  kind: ActivityKind;
  area: Area;
  xp: number;
  label: string;
  minutes?: number;
  taskId?: string;
  at?: Date;
}): ActivityEvent {
  const at = input.at ?? new Date();
  return {
    id: newId(),
    ref: input.ref,
    kind: input.kind,
    area: input.area,
    xp: input.xp,
    rateVersion: RATE_VERSION,
    at: at.toISOString(),
    day: dayKeyFor(at),
    tz: currentZone(),
    ...(input.minutes === undefined ? {} : { minutes: input.minutes }),
    ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
    label: input.label,
  };
}
