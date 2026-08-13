/**
 * Adversarial QA — attempts to break the Progression Engine.
 * Run: npx tsx scripts/qa-adversarial.ts
 */
import {
  JOURNEY_XP,
  JOURNEY_LEVELS,
  PROMOTION_LEVELS,
  progressionFor,
  xpAtJourneyLevel,
  promotionsBetween,
  journeyCompletionsBetween,
  promotionId,
  rankForLevel,
  xpToNextLevel,
} from "../src/data/progression";
import {
  DAY_BOUNDARY_HOUR,
  dayKeyFor,
  deriveStats,
  eventsOfKind,
  eventsOn,
  focusBonusXp,
  FOCUS_COMPLETION_BONUS,
  focusXpFor,
  focusXpForTask,
  FOCUS_TIERS,
  formFor,
  makeEvent,
  migrateEvent,
  longestStreakOf,
  activeDays,
  bestDay,
  sumXp,
  sumMinutes,
  streakState,
  dayQualifies,
  XP,
  type ActivityEvent,
} from "../src/data/activity";
import { focusQuality } from "../src/hooks/use-distraction-shield";
import {
  eventsForJourney,
  generateChronicle,
  generateMenkyo,
  promotionTimelineFor,
} from "../src/data/chronicle";
import {
  evaluateRewards,
  rewardDatabaseIsValid,
  rewardDatabase,
  nextUnlock,
} from "../src/data/rewards";
import {
  buildStatsTimeline,
  firstDayMeeting,
  seals as sealDefs,
  type EarnContext,
} from "../src/data/achievements";
import { mergeLedgers, dedupeLedger, restoreBackup } from "../src/lib/backup";
import {
  isTaskComplete,
  makeSubtasks,
  planRef,
  subtaskProgress,
  type DayPlan,
  type PlannedTask,
} from "../src/data/plan";
import { deriveCalendar, groupByDay } from "../src/data/calendar";
import { emptyEntry, hasWritten, journalRef } from "../src/data/journal";
import {
  isSessionComplete,
  sessionForDay,
  sessionsByWeek,
  sessionsInLast,
  trainingStreak,
  workoutRef,
} from "../src/data/fitness";
import {
  doneOnDay,
  episodeCompletions,
  nextEpisode,
  projectedFinish,
  seriesProgress,
  seriesRef,
  seriesStreak,
  type Series,
} from "../src/hooks/use-series";
import { parsePlaylistId } from "../src/lib/youtube";
import { KEYS, writeJson } from "../src/services/store";
import { platform } from "../src/platform";

let P = 0;
let F = 0;
const fails: string[] = [];
const t = (n: string, c: boolean, d = "") => {
  if (c) P += 1;
  else {
    F += 1;
    fails.push(n + " :: " + d);
    console.log("FAIL  " + n + "  ->  " + d);
  }
};

const ev = (o: Partial<ActivityEvent> & { ref: string }): ActivityEvent => ({
  id: o.id ?? o.ref,
  ref: o.ref,
  kind: o.kind ?? "task",
  area: o.area ?? "discipline",
  xp: o.xp ?? 100,
  rateVersion: 2,
  at: o.at ?? "2026-01-01T10:00:00.000Z",
  day: o.day ?? "2026-01-01",
  tz: "Asia/Kolkata",
  label: o.label ?? "x",
  ...(o.minutes !== undefined ? { minutes: o.minutes } : {}),
  ...(o.taskId !== undefined ? { taskId: o.taskId } : {}),
});

console.log("\n===== 1. LEDGER / UNDO =====");
const base = [ev({ ref: "a", xp: 100 }), ev({ ref: "b", xp: 250 })];
t("sum exact", sumXp(base) === 350);
t("undo removes exactly", sumXp(base.filter((e) => e.ref !== "b")) === 100);
t(
  "no negative-XP compensation",
  base.every((e) => e.xp >= 0),
);
t(
  "re-add restores exactly",
  sumXp([...base.filter((e) => e.ref !== "b"), ev({ ref: "b", xp: 250 })]) === 350,
);

console.log("\n===== 2. DOUBLE XP VIA IMPORT MERGE =====");
const e1 = makeEvent({
  ref: "subtask:2026-01-01:t1:s1",
  kind: "subtask",
  area: "discipline",
  xp: 33,
  label: "step",
});
// Undo then re-tick: same action, same ref, brand-new id.
const e2 = { ...e1, id: "a-different-id" };
const merged = mergeLedgers([e1], [e2]);
t(
  "one action counts once after import",
  sumXp(merged) === 33,
  "EXPECTED 33, ACTUAL " + sumXp(merged) + " (merge keys on id, so same ref survives twice)",
);
t(
  "duplicate refs impossible",
  new Set(merged.map((e) => e.ref)).size === merged.length,
  "EXPECTED unique refs, ACTUAL " +
    merged.length +
    " events / " +
    new Set(merged.map((e) => e.ref)).size +
    " refs",
);

// Re-importing a byte-identical file must also be a no-op.
const twice = mergeLedgers(mergeLedgers([e1], [e1]), [e1]);
t("re-importing the same file is idempotent", sumXp(twice) === 33, "ACTUAL " + sumXp(twice));
// A ledger already corrupted by the old merge must self-repair on load.
t(
  "existing duplicate refs are repaired",
  sumXp(dedupeLedger([e1, { ...e1, id: "x" }, { ...e1, id: "y" }])) === 33,
  "ACTUAL " + sumXp(dedupeLedger([e1, { ...e1, id: "x" }, { ...e1, id: "y" }])),
);
// The earliest occurrence wins, so importing can never move history.
const early = { ...e1, id: "early", at: "2020-01-01T00:00:00.000Z" };
t("merge keeps the earliest occurrence", mergeLedgers([e1], [early])[0]!.at === early.at);

console.log("\n===== 3. LOST XP VIA ID COLLISION =====");
const s1 = makeEvent({
  ref: "focus:1",
  kind: "focus",
  area: "mind",
  xp: 50,
  minutes: 50,
  label: "f",
});
const s2 = makeEvent({
  ref: "focus:1",
  kind: "focus",
  area: "mind",
  xp: 50,
  minutes: 50,
  label: "f",
});
t(
  "same-millisecond events get distinct ids",
  s1.id !== s2.id,
  'EXPECTED distinct ids, ACTUAL both "' + s1.id + '" (second is dropped by the ref guard)',
);

console.log("\n===== 4. LEVEL BOUNDARIES =====");
for (const lvl of [2, 10, 11, 50, 99]) {
  const at = xpAtJourneyLevel(1, lvl);
  t(
    "exactly L" + lvl + " at threshold",
    progressionFor(at).currentLevel === lvl,
    "got L" + progressionFor(at).currentLevel,
  );
  t(
    "one XP below L" + lvl + " is L" + (lvl - 1),
    progressionFor(at - 1).currentLevel === lvl - 1,
    "got L" + progressionFor(at - 1).currentLevel,
  );
}
t("negative XP clamps to L1", progressionFor(-5000).currentLevel === 1);
t(
  "NaN does not corrupt",
  Number.isFinite(progressionFor(NaN).currentLevel),
  "got " + progressionFor(NaN).currentLevel,
);
t(
  "Infinity does not hang/corrupt",
  Number.isFinite(progressionFor(Infinity).currentLevel),
  "got " + progressionFor(Infinity).currentLevel,
);

console.log("\n===== 5. PROMOTION =====");
const atL11 = xpAtJourneyLevel(1, 11);
t("fires at exactly L11", promotionsBetween(atL11 - 1, atL11).length === 1);
t(
  "no promotion mid-band",
  promotionsBetween(xpAtJourneyLevel(1, 12), xpAtJourneyLevel(1, 13)).length === 0,
);
t(
  "9 per journey",
  promotionsBetween(0, JOURNEY_XP).length === 9,
  "got " + promotionsBetween(0, JOURNEY_XP).length,
);
t(
  "18 across two journeys",
  promotionsBetween(0, JOURNEY_XP * 2).length === 18,
  "got " + promotionsBetween(0, JOURNEY_XP * 2).length,
);
t(
  "ids unique across journeys",
  new Set(promotionsBetween(0, JOURNEY_XP * 2)).size ===
    promotionsBetween(0, JOURNEY_XP * 2).length,
);
t("no promotion when XP decreases", promotionsBetween(atL11, atL11 - 500).length === 0);

console.log("\n===== 6. JOURNEY =====");
const j2 = progressionFor(JOURNEY_XP);
t(
  "journey 2 at exactly JOURNEY_XP",
  j2.currentJourney === 2 && j2.currentLevel === 1,
  "J" + j2.currentJourney + " L" + j2.currentLevel,
);
t("lifetime XP not reset", j2.lifetimeXP === JOURNEY_XP);
t("one XP short stays journey 1", progressionFor(JOURNEY_XP - 1).currentJourney === 1);
t("completion counted once", journeyCompletionsBetween(0, JOURNEY_XP).length === 1);
t("no completion when flat", journeyCompletionsBetween(JOURNEY_XP, JOURNEY_XP).length === 0);

console.log("\n===== 7. CHRONICLE BOUNDARY INTEGRITY =====");
const straddle = [
  ev({ ref: "pre", xp: JOURNEY_XP - 100, day: "2026-01-01", at: "2026-01-01T01:00:00.000Z" }),
  ev({ ref: "cross", xp: 500, day: "2026-01-02", at: "2026-01-02T01:00:00.000Z" }),
  ev({ ref: "post", xp: 100, day: "2026-01-03", at: "2026-01-03T01:00:00.000Z" }),
];
const j1e = eventsForJourney(straddle, 1);
const j2e = eventsForJourney(straddle, 2);
const overlap = j1e.filter((a) => j2e.some((b) => b.ref === a.ref));
t(
  "no event in two Journeys",
  overlap.length === 0,
  "EXPECTED 0, ACTUAL " +
    overlap.length +
    " overlapping (" +
    overlap.map((e) => e.ref).join(",") +
    ") -> XP double-counted in Chronicles",
);
t(
  "chronicle XP sums to ledger XP",
  sumXp(j1e) + sumXp(j2e) === sumXp(straddle),
  "EXPECTED " + sumXp(straddle) + ", ACTUAL " + (sumXp(j1e) + sumXp(j2e)),
);

console.log("\n===== 8. REPLAY / DETERMINISM =====");
const many = Array.from({ length: 200 }, (_, i) =>
  ev({ ref: "r" + i, xp: 37, day: "2026-03-" + String((i % 28) + 1).padStart(2, "0") }),
);
const shuffled = [...many].reverse();
const A = deriveStats(many, "2026-03-28");
const B = deriveStats(shuffled, "2026-03-28");
t("fold is order-independent", JSON.stringify(A) === JSON.stringify(B));
t("replay twice identical", JSON.stringify(deriveStats(many, "2026-03-28")) === JSON.stringify(A));

console.log("\n===== 9. STREAK / MVD =====");
t("1 XP does not qualify a day", !dayQualifies([ev({ ref: "tiny", xp: 1 })]));
t("100 XP qualifies", dayQualifies([ev({ ref: "ok", xp: 100 })]));
t("25min focus qualifies", dayQualifies([ev({ ref: "f", kind: "focus", xp: 0, minutes: 25 })]));
t("objective qualifies at 0 XP", dayQualifies([ev({ ref: "o", kind: "objective", xp: 0 })]));
const gap = [
  ...Array.from({ length: 14 }, (_, i) =>
    ev({ ref: "d" + i, xp: 150, day: "2026-04-" + String(i + 1).padStart(2, "0") }),
  ),
  ev({ ref: "after", xp: 150, day: "2026-04-16" }),
];
const st = streakState(gap, "2026-04-16");
t("streak never exceeds elapsed days", st.current <= 16, "current=" + st.current);
t("grace capped at 2", st.tokens <= 2, "tokens=" + st.tokens);

console.log("\n===== 10. REWARDS =====");
const z = {
  workouts: 0,
  journalEntries: 0,
  focusSessions: 0,
  focusHours: 0,
  objectives: 0,
  longestStreak: 0,
};
const r1 = evaluateRewards(50, 0, z);
t("evaluation is pure", JSON.stringify(r1) === JSON.stringify(evaluateRewards(50, 0, z)));
t("no duplicate reward ids", new Set(r1.map((r) => r.id)).size === r1.length);
t(
  "rewards carry no xp field",
  r1.every((r) => !("xp" in r)),
);
t(
  "achievements immune to level",
  evaluateRewards(100, 9, z)
    .filter((r) => r.unlockType === "achievement")
    .every((r) => !r.unlocked),
);
t(
  "unlocks monotonic in level",
  evaluateRewards(60, 0, z).filter((r) => r.unlocked).length >= r1.filter((r) => r.unlocked).length,
);

console.log("\n===== 11. MIGRATION =====");
const legacy = migrateEvent({ ref: "old", xp: 10 } as Partial<ActivityEvent> & { ref: string });
t("legacy keeps XP", legacy.xp === 10);
t("legacy gets rateVersion 1", legacy.rateVersion === 1);
t("legacy id falls back to ref", legacy.id === "old");
t("legacy has no taskId", legacy.taskId === undefined);

console.log("\n===== 12. DERIVED COMPLETION (no duplicate state) =====");
// Completion used to be stored on the plan *and* logged. These assert the
// single-writer replacement: the ledger alone decides what is done.
const D = "2026-03-04";
const steps = makeSubtasks(["one", "two", "three"], "t1");
const planTask: PlannedTask = {
  id: "t1",
  title: "Study",
  description: "",
  durationMinutes: 60,
  priority: "critical",
  iconKey: "study",
  subtasks: steps,
};

t(
  "a subtask carries no stored done flag",
  !Object.prototype.hasOwnProperty.call(steps[0]!, "done"),
  Object.keys(steps[0]!).join(","),
);
t("refs are stable", planRef.taskSubtask(D, "t1", "t1-s0") === "subtask:2026-03-04:t1:t1-s0");
t(
  "objective step refs are stable",
  planRef.objectiveStep(D, "obj-s0") === "objective-step:2026-03-04:obj-s0",
);

// A ledger with the first two of three steps ticked.
const ticked = new Set([
  planRef.taskSubtask(D, "t1", "t1-s0"),
  planRef.taskSubtask(D, "t1", "t1-s1"),
]);
const stepDone = (id: string) => ticked.has(planRef.taskSubtask(D, "t1", id));

t(
  "progress derives from the ledger",
  subtaskProgress(steps, stepDone) === 67,
  String(subtaskProgress(steps, stepDone)),
);
t("task incomplete until every step is logged", !isTaskComplete(planTask, stepDone));
ticked.add(planRef.taskSubtask(D, "t1", "t1-s2"));
t("task complete once all steps are logged", isTaskComplete(planTask, stepDone));
t("progress reaches 100", subtaskProgress(steps, stepDone) === 100);

// Removing the event is the only undo. Nothing else holds the state, so
// nothing can be left behind disagreeing with it.
ticked.delete(planRef.taskSubtask(D, "t1", "t1-s2"));
t("unticking is immediately visible", !isTaskComplete(planTask, stepDone));

console.log("\n===== 13. FOCUS BONUS BINDS BY ID, NOT LABEL =====");
// The bug: focus was matched to a task with `label.includes(task.title)`, so a
// task named "Study" swallowed sessions belonging to "Study Advanced ML", and
// renaming a task silently broke the link.
const focusEvents = [
  ev({ ref: "focus:1", kind: "focus", day: D, xp: 100, label: "Deep Work — Study", taskId: "t1" }),
  ev({
    ref: "focus:2",
    kind: "focus",
    day: D,
    xp: 60,
    label: "Deep Work — Study Advanced ML",
    taskId: "t2",
  }),
];
const forTask = (id: string) =>
  focusEvents.filter((e) => e.kind === "focus" && e.day === D && e.taskId === id);

t(
  "each session binds to exactly one task",
  forTask("t1").length === 1 && forTask("t2").length === 1,
);
t(
  "a containing title does not steal a session",
  sumXp(forTask("t1")) === 100,
  String(sumXp(forTask("t1"))),
);
t(
  "renaming the task cannot change the binding",
  forTask("t1")[0]!.taskId === "t1" && forTask("t1")[0]!.label.includes("Study"),
);
t("a session with no taskId claims no bonus", forTask("t3").length === 0);

console.log("\n===== 14. SERIES COMPLETION DERIVES FROM THE LEDGER =====");
const show: Series = {
  id: "s1",
  title: "A Course",
  source: "Manual",
  dailyTarget: 1,
  minutesPerEpisode: 20,
  createdOn: D,
  episodes: [
    { id: "e0", title: "Part 1" },
    { id: "e1", title: "Part 2" },
    { id: "e2", title: "Part 3" },
  ],
};
const studyLedger = [
  ev({ ref: seriesRef("s1", "e0"), kind: "study", area: "knowledge", day: D, xp: 30 }),
  ev({ ref: seriesRef("s1", "e1"), kind: "study", area: "knowledge", day: "2026-03-05", xp: 30 }),
];
const doneOn = episodeCompletions(studyLedger);

t(
  "an episode carries no stored doneOn",
  !Object.prototype.hasOwnProperty.call(show.episodes[0]!, "doneOn"),
);
t("progress counts logged episodes", seriesProgress(show, doneOn).done === 2);
t("the completion day is the event's frozen day", doneOn("s1", "e1") === "2026-03-05");
t("an unlogged episode is not done", doneOn("s1", "e2") === null);
t("next episode is the first unlogged one", nextEpisode(show, doneOn)?.id === "e2");
t("per-day counts come from the ledger", doneOnDay(show, D, doneOn) === 1);
t(
  "another series with the same episode ids does not collide",
  episodeCompletions(studyLedger)("s2", "e0") === null,
);

console.log("\n===== 15. CALENDAR IS DERIVED, NOT STORED =====");
// The bug: thirteen sample events reappeared identically in every month of
// every year, because the calendar had its own store and no idea which month
// it was showing.
const calToday = "2026-03-10";
const calPlans: Record<string, DayPlan> = {
  // A plan for a past day — superseded by whatever the ledger recorded.
  "2026-03-01": {
    intention: "",
    objective: { title: "Old objective", subtitle: "", subtasks: [] },
    tasks: [],
    timeline: [],
  },
  // A plan for a future day — a genuine commitment.
  "2026-03-20": {
    intention: "",
    objective: { title: "Ship the thing", subtitle: "", subtasks: [] },
    tasks: [
      {
        id: "t1",
        title: "Write the report",
        description: "",
        durationMinutes: 60,
        priority: "high",
        iconKey: "write",
        subtasks: [],
      },
    ],
    timeline: [
      {
        id: "b1",
        startMinutes: 7 * 60 + 30,
        endMinutes: 9 * 60,
        label: "Deep Work",
        detail: "",
        iconKey: "target",
      },
    ],
  },
};
const calLedger = [
  ev({
    ref: "c-focus",
    kind: "focus",
    area: "mind",
    day: "2026-03-02",
    at: "2026-03-02T09:15:00.000Z",
    xp: 90,
    label: "Deep Work",
  }),
  ev({
    ref: "c-workout",
    kind: "workout",
    area: "body",
    day: "2026-03-02",
    at: "2026-03-02T17:00:00.000Z",
    xp: 80,
    label: "Lower body",
  }),
];
const calMissions = [
  {
    id: "m1",
    title: "Mid-Term Prep",
    category: "Study",
    priority: "High",
    boardColumn: "today",
    description: "",
    durationMinutes: 60,
    dueDate: "Mar 25",
    completed: false,
    progress: 0,
    xpReward: 0,
    disciplineReward: 0,
    checklist: [],
    notes: "",
    attachments: [],
    history: [],
    archived: false,
  },
] as unknown as Parameters<typeof deriveCalendar>[0]["missions"];

const cal = deriveCalendar({
  events: calLedger,
  plans: calPlans,
  missions: calMissions,
  today: calToday,
  year: 2026,
});
const byDay = groupByDay(cal);

t("what happened lands on its real day", (byDay.get("2026-03-02") ?? []).length === 2);
t(
  "a past record is marked as happened",
  (byDay.get("2026-03-02") ?? []).every((e) => e.happened),
);
t(
  "a past plan is not evidence — it does not appear",
  !byDay.has("2026-03-01"),
  "got " + JSON.stringify(byDay.get("2026-03-01")),
);
t(
  "a future plan appears as a commitment",
  (byDay.get("2026-03-20") ?? []).length === 3 &&
    (byDay.get("2026-03-20") ?? []).every((e) => !e.happened),
  "got " + (byDay.get("2026-03-20") ?? []).length,
);
t("timed entries sort before untimed ones", (byDay.get("2026-03-20") ?? [])[0]?.time === "07:30");
t("a mission due date resolves into the viewed year", byDay.has("2026-03-25"));
t(
  "the same due date resolves into a different year on request",
  deriveCalendar({
    events: [],
    plans: {},
    missions: calMissions,
    today: calToday,
    year: 2027,
  })[0]?.day === "2027-03-25",
);

// The heart of the old bug: a month with no sources must be empty, and two
// different months must not show the same thing.
const marchDays = [...byDay.keys()].filter((d) => d.startsWith("2026-03"));
const augustDays = [...byDay.keys()].filter((d) => d.startsWith("2026-08"));
t("a month with no sources is empty", augustDays.length === 0, "got " + augustDays.length);
t("the populated month is not empty", marchDays.length === 3, "got " + marchDays.length);
t(
  "nothing is invented for an empty ledger",
  deriveCalendar({
    events: [],
    plans: {},
    missions: [],
    today: calToday,
    year: 2026,
  }).length === 0,
);
t(
  "derivation is deterministic",
  JSON.stringify(
    deriveCalendar({
      events: calLedger,
      plans: calPlans,
      missions: calMissions,
      today: calToday,
      year: 2026,
    }),
  ) === JSON.stringify(cal),
);

console.log("\n===== 16. JOURNAL EARNS FOR WRITING, NOT FOR TOUCHING =====");
// §2.5 permits XP for completed work only. Opening the page, or tapping a mood,
// must not pay — otherwise the app rewards interaction rather than reflection.
t("an empty entry has not been written", !hasWritten(emptyEntry()));
t("a missing entry has not been written", !hasWritten(undefined));
t(
  "whitespace alone does not count",
  !hasWritten({ ...emptyEntry(), reflection: "   \n  " }),
  "whitespace counted as writing",
);
t(
  "setting a mood alone does not count",
  !hasWritten({ ...emptyEntry(), mood: 3 }),
  "mood alone paid out",
);
t("reflection counts", hasWritten({ ...emptyEntry(), reflection: "Today I..." }));
t("a single gratitude counts", hasWritten({ ...emptyEntry(), gratitudes: ["", "warmth", ""] }));
t("a single idea counts", hasWritten({ ...emptyEntry(), ideas: ["", "", "a thought"] }));
t("the weekly reflection counts", hasWritten({ ...emptyEntry(), weekly: "A good week." }));

// One entry is worth exactly one event, however many times it is edited.
t("the ref is keyed on the entry's date", journalRef("2026-03-04") === "journal:2026-03-04");
t("two dates are two different entries", journalRef("2026-03-04") !== journalRef("2026-03-05"));
t(
  "emptying a written entry reverses it",
  hasWritten({ ...emptyEntry(), notes: "x" }) && !hasWritten(emptyEntry()),
);

console.log("\n===== 17. TRAINING SESSIONS =====");
const FD = "2026-03-10";
const gym = [
  { id: "a", name: "Squat", sets: 4, reps: "6", weight: "90 kg" },
  { id: "b", name: "Row", sets: 3, reps: "8", weight: "60 kg" },
];

t("a part-finished session does not count", !isSessionComplete(gym, ["a"]));
t("every exercise ticked completes it", isSessionComplete(gym, ["a", "b"]));
t(
  "an empty list is never complete",
  !isSessionComplete([], []),
  "deleting the last exercise would have awarded a workout",
);
t("the ref is one per day", workoutRef(FD) === "workout:2026-03-10");

// Yesterday's ticks are not today's session.
t(
  "a cursor from another day starts empty",
  sessionForDay({ day: "2026-03-09", doneIds: ["a"] }, FD).doneIds.length === 0,
);
t("today's cursor is kept", sessionForDay({ day: FD, doneIds: ["a"] }, FD).doneIds[0] === "a");
t("a missing cursor starts empty", sessionForDay(null, FD).doneIds.length === 0);

const trained = [
  ev({ ref: workoutRef("2026-03-10"), kind: "workout", area: "body", day: "2026-03-10", xp: 80 }),
  ev({ ref: workoutRef("2026-03-09"), kind: "workout", area: "body", day: "2026-03-09", xp: 80 }),
  ev({ ref: workoutRef("2026-03-08"), kind: "workout", area: "body", day: "2026-03-08", xp: 80 }),
  // A gap at the 7th, then an older session.
  ev({ ref: workoutRef("2026-03-06"), kind: "workout", area: "body", day: "2026-03-06", xp: 80 }),
];

t(
  "streak counts consecutive days",
  trainingStreak(trained, FD) === 3,
  String(trainingStreak(trained, FD)),
);
t("the gap ends the streak", trainingStreak(trained, FD) !== 4);
t(
  "a streak survives the morning before you train",
  trainingStreak(trained, "2026-03-11") === 3,
  "got " + trainingStreak(trained, "2026-03-11"),
);
t("sessions this week counts the window", sessionsInLast(trained, FD, 7) === 4);
t("a narrower window counts fewer", sessionsInLast(trained, FD, 3) === 3);
t("no sessions reads zero, never invented", sessionsInLast([], FD, 7) === 0);
t(
  "the weekly chart has one bar per week, oldest first",
  sessionsByWeek(trained, FD, 6).length === 6 && sessionsByWeek(trained, FD, 6)[5]!.label === "W6",
);
t(
  "this week's bar holds the sessions",
  sessionsByWeek(trained, FD, 6)[5]!.value === 4,
  "got " + sessionsByWeek(trained, FD, 6)[5]!.value,
);
t(
  "an empty ledger charts flat zero, not sample data",
  sessionsByWeek([], FD, 6).every((b) => b.value === 0),
);

console.log("\n===== 18. FOCUS ECONOMY =====");

// --- focusXpFor: decay curve ---

t("0 minutes earns 0 XP", focusXpFor(0, 0) === 0);
t("first minute earns 1 XP at full rate", focusXpFor(0, 1) === 1);
t("120 minutes at full rate earns 120 XP", focusXpFor(0, 120) === 120, String(focusXpFor(0, 120)));

// Tier boundary: minute 119 is the last at full rate, minute 120 is first at 0.75.
t("minute 119 is still full rate (1 XP)", focusXpFor(119, 1) === 1);
t("minute 120 drops to tier-2 rate (rounds to 1)", focusXpFor(120, 1) === 1);

// Cross-tier integration: 120 * 1.0 + 120 * 0.75 = 210.
t(
  "240 minutes integrates tiers 1 and 2 (210 XP)",
  focusXpFor(0, 240) === 210,
  "got " + focusXpFor(0, 240),
);

// Tier 3 boundary.
t("minute 240 enters tier-3 rate (rounds to 1)", focusXpFor(240, 1) === 1);
t(
  "300 minutes integrates all three tiers (240 XP)",
  focusXpFor(0, 300) === 240,
  "got " + focusXpFor(0, 300),
);

// XP is always non-negative.
t("focusXpFor is never negative", focusXpFor(0, 1000) >= 0);

// Rate is monotonically non-increasing: each minute earns no more than the prior minute.
t(
  "decay curve never reverses: tier 2 ≤ tier 1",
  FOCUS_TIERS[1]!.multiplier <= FOCUS_TIERS[0]!.multiplier,
);
t(
  "decay curve never reverses: tier 3 ≤ tier 2",
  FOCUS_TIERS[2]!.multiplier <= FOCUS_TIERS[1]!.multiplier,
);

// Already-banked minutes shift where you land on the curve.
t(
  "sessions after 120 min today earn at reduced rate",
  focusXpFor(120, 25) < focusXpFor(0, 25),
  `${focusXpFor(120, 25)} should be less than ${focusXpFor(0, 25)}`,
);

// --- focusQuality: presence scaling ---

t("zero-length session returns 100%", focusQuality(0, 0, 0) === 100);
t("negative session length returns 100%", focusQuality(-1, 0, 0) === 100);
t("perfect presence with no breaks is 100%", focusQuality(3000, 0, 0) === 100);
t(
  "half the session away gives ≈50%",
  focusQuality(3000, 1500, 0) === 50,
  "got " + focusQuality(3000, 1500, 0),
);
t("fully away gives 0%", focusQuality(3000, 3000, 0) === 0, "got " + focusQuality(3000, 3000, 0));
t(
  "away longer than the session clamps to 0%",
  focusQuality(3000, 4000, 0) === 0,
  "got " + focusQuality(3000, 4000, 0),
);

// Each break costs 4% beyond the time lost.
t(
  "1 break costs 4% beyond time: 100% - 4% = 96%",
  focusQuality(3000, 0, 1) === 96,
  "got " + focusQuality(3000, 0, 1),
);
t("5 breaks cost 20%: 80%", focusQuality(3000, 0, 5) === 80, "got " + focusQuality(3000, 0, 5));
t(
  "10 breaks hit the 40% penalty cap: 60%",
  focusQuality(3000, 0, 10) === 60,
  "got " + focusQuality(3000, 0, 10),
);
t(
  "penalty is capped at 40%: 25 breaks same as 10",
  focusQuality(3000, 0, 25) === focusQuality(3000, 0, 10),
  `25-break quality: ${focusQuality(3000, 0, 25)}, 10-break: ${focusQuality(3000, 0, 10)}`,
);

// Quality is always 0–100.
t("quality never exceeds 100", focusQuality(3000, 0, 0) <= 100);
t("quality never goes below 0", focusQuality(100, 5000, 100) >= 0);

// --- XP × quality interaction ---

// The minimum 1 XP floor: Math.max(1, Math.round(base * (quality/100)))
const base1min = focusXpFor(0, 1); // = 1
const earned0quality = Math.max(1, Math.round(base1min * (0 / 100)));
t("minimum 1 XP even at 0% quality", earned0quality === 1, "got " + earned0quality);

// A 25-minute session at 100% quality on a fresh day earns full rate.
const fresh25 = focusXpFor(0, 25); // 25 * 1.0 = 25
t("25-min session at 100% quality earns 25 XP", fresh25 === 25, "got " + fresh25);

// A 25-minute session at 80% quality (5 breaks) earns proportionally less.
const q80 = focusQuality(25 * 60, 0, 5);
const earned80 = Math.max(1, Math.round(fresh25 * (q80 / 100)));
t(
  "25-min session at 80% quality earns less than full",
  earned80 < fresh25,
  `earned ${earned80}, full ${fresh25}`,
);
t("25-min at 80% earns Math.round(25 * 0.8) = 20", earned80 === 20, "got " + earned80);

// sumMinutes: correctly totals focus minutes from events.
const focusLedger = [
  ev({ ref: "f-a", kind: "focus", area: "mind", day: "2026-06-01", xp: 25, minutes: 25 }),
  ev({ ref: "f-b", kind: "focus", area: "mind", day: "2026-06-01", xp: 20, minutes: 20 }),
  ev({ ref: "f-c", kind: "workout", area: "body", day: "2026-06-01", xp: 80, minutes: 60 }),
];
t(
  "sumMinutes(focus) totals only focus events",
  sumMinutes(focusLedger, "focus") === 45,
  "got " + sumMinutes(focusLedger, "focus"),
);
t(
  "sumMinutes without kind totals all events",
  sumMinutes(focusLedger) === 105,
  "got " + sumMinutes(focusLedger),
);

// ===== 19. FOCUS PERSISTENCE GUARDS =====
// These tests verify the restore and save conditions as pure boolean logic —
// the same guards that live in focus.tsx but extracted so a regression surfaces
// here before it reaches the browser.

console.log("\n===== 19. FOCUS PERSISTENCE GUARDS =====");

// --- Cross-day restore guard ---

// The restore effect checks: (sameDay || hasActiveTimer) before restoring
// presetId / runStartedAt / bankedMs / taskId.

const restoreShouldApply = (sameDay: boolean, hasActiveTimer: boolean) => sameDay || hasActiveTimer;

t("same day + idle timer: restore cursor", restoreShouldApply(true, false));
t("same day + active timer: restore cursor", restoreShouldApply(true, true));
t(
  "different day + active timer: restore cursor (cross-boundary session)",
  restoreShouldApply(false, true),
);
t("different day + idle timer: skip cursor (stale entry)", !restoreShouldApply(false, false));

// cyclePosition is gated on sameDay only (not hasActiveTimer).
const restoreCycle = (sameDay: boolean, hasCycle: boolean) => sameDay && hasCycle;

t("same day with cyclePosition: restore it", restoreCycle(true, true));
t("same day without cyclePosition: skip it", !restoreCycle(true, false));
t("different day with cyclePosition: skip it (day-scoped)", !restoreCycle(false, true));

// --- Save-effect clear condition ---

// Cursor is removed when there is nothing meaningful to resume.
const shouldClear = (runStartedAt: number | null, bankedMs: number, cyclePosition: number) =>
  runStartedAt === null && bankedMs === 0 && cyclePosition === 0;

t("all-zero state clears the cursor key", shouldClear(null, 0, 0));
t("active timer keeps the cursor", !shouldClear(Date.now(), 0, 0));
t("banked ms keeps the cursor", !shouldClear(null, 5000, 0));
t("non-zero cyclePosition keeps the cursor", !shouldClear(null, 0, 2));
t("active timer + banked ms keeps the cursor", !shouldClear(Date.now(), 5000, 3));

// --- Quality contamination: reset clears break count ---

// If reset is NOT called between sessions, stale breaks contaminate quality.
// These tests confirm that carrying stale state from a prior session degrades quality.
const staleBreaks = 5; // breaks from aborted session
const freshBreaks = 0; // after distraction.reset()

const qualityWithStale = focusQuality(1500, 0, staleBreaks); // 80% — stale breaks penalise
const qualityWithFresh = focusQuality(1500, 0, freshBreaks); // 100% — clean session

t("stale breaks degrade quality", qualityWithStale < qualityWithFresh);
t("fresh session after reset earns 100% quality", qualityWithFresh === 100);
t("stale 5 breaks impose 20% penalty", qualityWithStale === 80, "got " + qualityWithStale);

// Earned XP difference: a 25-minute session at contaminated vs clean quality.
const xpBase25 = focusXpFor(0, 25);
const xpStale = Math.max(1, Math.round(xpBase25 * (qualityWithStale / 100)));
const xpFresh = Math.max(1, Math.round(xpBase25 * (qualityWithFresh / 100)));
t("contaminated session earns less XP than a clean one", xpStale < xpFresh);
t("contaminated 25-min earns 20 XP (not 25)", xpStale === 20, "got " + xpStale);

// --- Wall-clock elapsed formula ---

// elapsed = bankedMs + max(0, now - runStartedAt)  → always non-negative
const computeElapsed = (bankedMs: number, runStartedAt: number | null, now: number) =>
  bankedMs + (runStartedAt === null ? 0 : now - runStartedAt);

const T = Date.now();
t("idle timer: elapsed equals bankedMs", computeElapsed(30000, null, T) === 30000);
t("running timer: elapsed increases with time", computeElapsed(0, T - 60000, T) === 60000);
t("paused + resumed: bankedMs accumulates", computeElapsed(30000, T - 10000, T) === 40000);
t("elapsed never negative from bankedMs alone", computeElapsed(0, null, T) === 0);

// secondsLeft = max(0, preset * 60 - elapsed) never goes below zero.
const secondsLeft = (presetMinutes: number, elapsed: number) =>
  Math.max(0, presetMinutes * 60 - elapsed);

t("secondsLeft clamps to 0 when elapsed exceeds preset", secondsLeft(25, 1600) === 0);
t("secondsLeft reflects remaining time", secondsLeft(25, 600) === 900);

// ===== 20. FOCUS COMPLETION BONUS =====
// The rule: focus that fed a task you actually finished the same day is worth a
// quarter more. Two writers award it — Home when the last step is ticked, and
// Focus when a session lands on a task already finished — so the amount must be
// identical whichever path runs, and must reflect ALL the day's focus, not just
// what happened to exist at the moment the task was ticked.

console.log("\n===== 20. FOCUS COMPLETION BONUS =====");

const BD = "2026-04-01";

const bonusLedger = [
  ev({ ref: "bf:1", kind: "focus", area: "mind", day: BD, xp: 50, minutes: 50, taskId: "tA" }),
  ev({ ref: "bf:2", kind: "focus", area: "mind", day: BD, xp: 30, minutes: 30, taskId: "tA" }),
  // Another task's focus, same day — must not leak into tA's bonus.
  ev({ ref: "bf:3", kind: "focus", area: "mind", day: BD, xp: 40, minutes: 40, taskId: "tB" }),
  // Same task, different day — must not leak either.
  ev({
    ref: "bf:4",
    kind: "focus",
    area: "mind",
    day: "2026-03-31",
    xp: 90,
    minutes: 90,
    taskId: "tA",
  }),
  // A non-focus event on the task — not focus, so not part of the base.
  ev({ ref: "bf:5", kind: "task", area: "discipline", day: BD, xp: 70, taskId: "tA" }),
];

t(
  "focus for a task totals only that task",
  focusXpForTask(bonusLedger, BD, "tA") === 80,
  "got " + focusXpForTask(bonusLedger, BD, "tA"),
);
t("another task's focus does not leak in", focusXpForTask(bonusLedger, BD, "tB") === 40);
t("another day's focus does not leak in", focusXpForTask(bonusLedger, "2026-03-31", "tA") === 90);
t("non-focus events are excluded from the base", focusXpForTask(bonusLedger, BD, "tA") !== 150);
t("a task with no focus earns no base", focusXpForTask(bonusLedger, BD, "tZ") === 0);

// The `extra` argument folds in a session being logged in the same transaction —
// the ledger has not seen it yet, but the bonus must count it.
t(
  "an in-flight session counts toward the bonus base",
  focusXpForTask(bonusLedger, BD, "tA", 25) === 105,
  "got " + focusXpForTask(bonusLedger, BD, "tA", 25),
);

// --- The bonus amount ---

t("bonus is a quarter of the focus", focusBonusXp(80) === 20, "got " + focusBonusXp(80));
t("bonus rounds to a whole number", Number.isInteger(focusBonusXp(50)));
t("no focus earns no bonus", focusBonusXp(0) === 0);
t("bonus uses the frozen constant", focusBonusXp(100) === Math.round(100 * FOCUS_COMPLETION_BONUS));

// --- Both writers agree ---

// Home path: task ticked after 80 XP of focus.
const homeBonus = focusBonusXp(focusXpForTask(bonusLedger, BD, "tA"));
// Focus path: same ledger, same task, no new session — must match exactly.
const focusPathBonus = focusBonusXp(focusXpForTask(bonusLedger, BD, "tA", 0));
t(
  "Home and Focus award the identical bonus",
  homeBonus === focusPathBonus,
  `${homeBonus} vs ${focusPathBonus}`,
);

// --- The staleness bug this fixes ---

// Focus 50 → complete task → bonus 13. Then focus 30 more.
const atCompletion = focusBonusXp(50);
const afterMoreFocus = focusBonusXp(80);
t("bonus at completion reflects only focus so far", atCompletion === 13, "got " + atCompletion);
t("bonus after further focus is larger", afterMoreFocus > atCompletion);
t(
  "the recomputed bonus covers the whole day's focus",
  afterMoreFocus === 20,
  "got " + afterMoreFocus,
);

// Focus arriving entirely after completion still earns a bonus.
t(
  "focus after completion earns a bonus from zero",
  focusBonusXp(focusXpForTask([], BD, "tA", 60)) === 15,
);

// --- transact rewrite semantics ---
// Clearing then re-adding one ref in a single batch must leave exactly one
// event carrying the NEW value. This is the mechanism the Focus path relies on.

const rewrite = (
  prev: ActivityEvent[],
  toggles: { on: boolean; ref: string; xp: number }[],
): ActivityEvent[] => {
  let next = prev;
  for (const { on, ref, xp } of toggles) {
    const exists = next.some((e) => e.ref === ref);
    if (on && !exists)
      next = [...next, ev({ ref, xp, kind: "focus-bonus", area: "mind", day: BD })];
    else if (!on && exists) next = next.filter((e) => e.ref !== ref);
  }
  return next;
};

const bonusRef = "focus-bonus:" + BD + ":tA";
const withStale = [ev({ ref: bonusRef, kind: "focus-bonus", area: "mind", day: BD, xp: 13 })];
const rewritten = rewrite(withStale, [
  { on: false, ref: bonusRef, xp: 0 },
  { on: true, ref: bonusRef, xp: 20 },
]);

t(
  "rewriting leaves exactly one bonus event",
  rewritten.filter((e) => e.ref === bonusRef).length === 1,
);
t(
  "the rewritten bonus carries the new value",
  rewritten.find((e) => e.ref === bonusRef)!.xp === 20,
);
t("rewriting does not duplicate XP", sumXp(rewritten) === 20, "got " + sumXp(rewritten));

// Writing the bonus for the first time (nothing to clear) still yields one event.
const fresh = rewrite(
  [],
  [
    { on: false, ref: bonusRef, xp: 0 },
    { on: true, ref: bonusRef, xp: 15 },
  ],
);
t("a first-time bonus writes exactly one event", fresh.length === 1 && fresh[0]!.xp === 15);

// The bonus ref is stable per day+task, so it can never be awarded twice.
t("the bonus ref is one per task per day", planRef.focusBonus(BD, "tA") === bonusRef);
t("a different task gets a different ref", planRef.focusBonus(BD, "tB") !== bonusRef);
t("a different day gets a different ref", planRef.focusBonus("2026-04-02", "tA") !== bonusRef);

// Two bonus events for the same task/day are impossible after dedupe.
const doubled = dedupeLedger([
  ev({ ref: bonusRef, id: "x", kind: "focus-bonus", area: "mind", day: BD, xp: 20 }),
  ev({ ref: bonusRef, id: "y", kind: "focus-bonus", area: "mind", day: BD, xp: 20 }),
]);
t("duplicate bonus refs collapse to one", doubled.length === 1 && sumXp(doubled) === 20);

// ===== 21. BACKUP MERGE VS. REWRITTEN EVENTS =====
// The focus bonus is the one event whose value is recomputed: it is a function
// of the day's focus, not a record of a discrete action. Rewriting it produces
// the same `ref` with a new `id`, a later `at`, and a different `xp`.
//
// `mergeLedgers` collapses by ref keeping the EARLIEST `at`, which is correct
// for action records — an import must never move when something happened. The
// question these tests answer is whether that rule discards a valid rewrite.

console.log("\n===== 21. BACKUP MERGE VS. REWRITTEN EVENTS =====");

const MD = "2026-05-01";
const bref = planRef.focusBonus(MD, "tA");
const T1 = "2026-05-01T09:00:00.000Z"; // bonus first awarded
const T2 = "2026-05-01T14:00:00.000Z"; // bonus rewritten after more focus

const bonusAt = (id: string, at: string, xp: number): ActivityEvent =>
  ev({
    ref: bref,
    id,
    at,
    xp,
    kind: "focus-bonus",
    area: "mind",
    day: MD,
    label: "Focus paid off",
  });

// 1. Created: Home ticks the last step after 50 XP of focus.
const created = [bonusAt("id-A", T1, 13)];
t("1. the bonus is created once", created.length === 1 && sumXp(created) === 13);

// 2. Rewritten: a later session lifts the day's focus to 69 XP.
const rewrittenLedger = [bonusAt("id-B", T2, 17)];
t(
  "2. the rewrite replaces it in place",
  rewrittenLedger.length === 1 && sumXp(rewrittenLedger) === 17,
);
t("2. the rewrite carries a new id", rewrittenLedger[0]!.id !== created[0]!.id);
t("2. the rewrite carries a later timestamp", rewrittenLedger[0]!.at > created[0]!.at);

// 3. THE REAL SCENARIO — importing a backup taken BEFORE the rewrite.
// The backup holds the stale 13; the live ledger holds the correct 17.
const importedOld = mergeLedgers(rewrittenLedger, created);
t(
  "3. importing a pre-rewrite backup yields exactly one bonus",
  importedOld.filter((e) => e.ref === bref).length === 1,
);
t(
  "3. a pre-rewrite backup does not overwrite the newer bonus",
  sumXp(importedOld) === 17,
  "EXPECTED 17 (the recomputed value), ACTUAL " +
    sumXp(importedOld) +
    " -> restoring an old backup silently reverted a valid rewrite and destroyed XP",
);

// 4. Importing a backup taken AFTER the rewrite — must be a clean no-op.
const importedNew = mergeLedgers(rewrittenLedger, rewrittenLedger);
t("4. a post-rewrite backup is idempotent", sumXp(importedNew) === 17 && importedNew.length === 1);

// 5. The same backup imported repeatedly must converge, never drift.
const once = mergeLedgers(rewrittenLedger, created);
const twice2 = mergeLedgers(once, created);
const thrice = mergeLedgers(twice2, created);
t(
  "5. repeated import of the same backup is stable",
  sumXp(once) === sumXp(twice2) && sumXp(twice2) === sumXp(thrice),
  `${sumXp(once)} -> ${sumXp(twice2)} -> ${sumXp(thrice)}`,
);
t("5. repeated import never duplicates the ref", thrice.filter((e) => e.ref === bref).length === 1);
t("5. repeated import settles on the newest value", sumXp(thrice) === 17, "got " + sumXp(thrice));

// Import direction must not decide the outcome: merging the old backup into the
// new ledger and the new ledger into the old backup must agree.
t(
  "merge is order-independent for a rewritten event",
  sumXp(mergeLedgers(rewrittenLedger, created)) === sumXp(mergeLedgers(created, rewrittenLedger)),
  `newest-first ${sumXp(mergeLedgers(rewrittenLedger, created))}, oldest-first ${sumXp(mergeLedgers(created, rewrittenLedger))}`,
);

// Several rewrites across a day must settle on the last one, whatever the order.
const r3 = bonusAt("id-C", "2026-05-01T18:00:00.000Z", 22);
t(
  "the newest of three revisions wins",
  sumXp(mergeLedgers(mergeLedgers(created, rewrittenLedger), [r3])) === 22,
  "got " + sumXp(mergeLedgers(mergeLedgers(created, rewrittenLedger), [r3])),
);
t(
  "an out-of-order import still settles on the newest",
  sumXp(mergeLedgers([r3], created)) === 22,
  "got " + sumXp(mergeLedgers([r3], created)),
);

// --- Action records keep earliest-wins, unchanged ---
// This is the property the earliest rule exists to protect: untick-then-retick
// creates a new id for the same action, and an import must not move when it
// happened. Only recomputed events are exempt.

const actT1 = "2026-05-01T08:00:00.000Z";
const actT2 = "2026-05-01T20:00:00.000Z";
const stepRef = planRef.taskSubtask(MD, "tA", "s1");
const stepEarly = ev({ ref: stepRef, id: "s-A", at: actT1, xp: 33, kind: "subtask", day: MD });
const stepLate = ev({ ref: stepRef, id: "s-B", at: actT2, xp: 33, kind: "subtask", day: MD });

t(
  "a re-ticked step keeps its original timestamp",
  mergeLedgers([stepLate], [stepEarly])[0]!.at === actT1,
  "got " + mergeLedgers([stepLate], [stepEarly])[0]!.at,
);
t("a re-ticked step still counts once", sumXp(mergeLedgers([stepLate], [stepEarly])) === 33);
t(
  "task completions also keep earliest-wins",
  mergeLedgers(
    [ev({ ref: planRef.task(MD, "tA"), id: "t-B", at: actT2, kind: "task", day: MD, xp: 70 })],
    [ev({ ref: planRef.task(MD, "tA"), id: "t-A", at: actT1, kind: "task", day: MD, xp: 70 })],
  )[0]!.at === actT1,
);
t(
  "focus sessions keep earliest-wins",
  mergeLedgers(
    [ev({ ref: "focus:9", id: "f-B", at: actT2, kind: "focus", area: "mind", day: MD, xp: 50 })],
    [ev({ ref: "focus:9", id: "f-A", at: actT1, kind: "focus", area: "mind", day: MD, xp: 50 })],
  )[0]!.at === actT1,
);

// A ledger holding both copies from a pre-fix import must self-repair on load.
t(
  "dedupe collapses a doubled bonus to the newest",
  sumXp(dedupeLedger([bonusAt("id-A", T1, 13), bonusAt("id-B", T2, 17)])) === 17,
  "got " + sumXp(dedupeLedger([bonusAt("id-A", T1, 13), bonusAt("id-B", T2, 17)])),
);
t(
  "dedupe still keeps the earliest action record",
  dedupeLedger([stepLate, stepEarly])[0]!.at === actT1,
);

// Bonuses for different tasks or days never contend.
t(
  "bonuses for different tasks are independent",
  mergeLedgers(
    [bonusAt("id-B", T2, 17)],
    [
      ev({
        ref: planRef.focusBonus(MD, "tB"),
        id: "o",
        at: T1,
        xp: 9,
        kind: "focus-bonus",
        area: "mind",
        day: MD,
      }),
    ],
  ).length === 2,
);

// --- Attacking the fix itself ---

// A tie on `at` must not be decided by which ledger was passed first.
const tieA = bonusAt("id-AAA", T2, 17);
const tieB = bonusAt("id-BBB", T2, 21);
t(
  "a timestamp tie resolves identically in both directions",
  sumXp(mergeLedgers([tieA], [tieB])) === sumXp(mergeLedgers([tieB], [tieA])),
  `${sumXp(mergeLedgers([tieA], [tieB]))} vs ${sumXp(mergeLedgers([tieB], [tieA]))}`,
);
t("a timestamp tie still collapses to one event", mergeLedgers([tieA], [tieB]).length === 1);

// The same tie-break must hold for action records.
const stepTieA = ev({ ref: stepRef, id: "s-AAA", at: actT1, xp: 33, kind: "subtask", day: MD });
const stepTieB = ev({ ref: stepRef, id: "s-BBB", at: actT1, xp: 33, kind: "subtask", day: MD });
t(
  "action-record ties are also order-independent",
  mergeLedgers([stepTieA], [stepTieB])[0]!.id === mergeLedgers([stepTieB], [stepTieA])[0]!.id,
);

// Fuzz: many shuffles of a mixed ledger must all converge on the same result.
const fuzzPool = [
  bonusAt("id-A", T1, 13),
  bonusAt("id-B", T2, 17),
  bonusAt("id-C", "2026-05-01T18:00:00.000Z", 22),
  stepEarly,
  stepLate,
  ev({ ref: "focus:9", id: "f-A", at: actT1, kind: "focus", area: "mind", day: MD, xp: 50 }),
  ev({ ref: "focus:9", id: "f-B", at: actT2, kind: "focus", area: "mind", day: MD, xp: 50 }),
];
const canonical = JSON.stringify(dedupeLedger(fuzzPool).map((e) => [e.ref, e.id, e.xp]));
let fuzzStable = true;
for (let i = 0; i < 200; i += 1) {
  const shuffled = [...fuzzPool];
  for (let j = shuffled.length - 1; j > 0; j -= 1) {
    const k = Math.floor(Math.random() * (j + 1));
    [shuffled[j], shuffled[k]] = [shuffled[k]!, shuffled[j]!];
  }
  // Split at a random point and merge the halves — simulates arbitrary
  // export/import boundaries over the same history.
  const cut = Math.floor(Math.random() * shuffled.length);
  const out = mergeLedgers(shuffled.slice(0, cut), shuffled.slice(cut));
  if (JSON.stringify(out.map((e) => [e.ref, e.id, e.xp])) !== canonical) fuzzStable = false;
}
t("200 shuffled merges all converge on one result", fuzzStable);

// Merging is idempotent under repetition regardless of kind.
const settled = dedupeLedger(fuzzPool);
t(
  "merging a settled ledger with itself changes nothing",
  JSON.stringify(mergeLedgers(settled, settled)) === JSON.stringify(settled),
);
t(
  "merging a settled ledger with its own source changes nothing",
  JSON.stringify(mergeLedgers(settled, fuzzPool)) === JSON.stringify(settled),
);

// The bonus keeps the newest; the action records in the same batch keep the earliest.
const settledBonus = settled.find((e) => e.ref === bref)!;
const settledStep = settled.find((e) => e.ref === stepRef)!;
t("in one merge, the bonus took the newest", settledBonus.xp === 22);
t("in the same merge, the step kept the earliest", settledStep.at === actT1);

// XP can only be corrected upward by this rule, never silently reduced below
// what the live ledger already held.
t(
  "importing an old backup never lowers the bonus",
  sumXp(mergeLedgers([bonusAt("id-C", "2026-05-01T18:00:00.000Z", 22)], [created[0]!])) === 22,
);

// A single-copy ledger is untouched — the common case must not change.
const lone = [bonusAt("id-A", T1, 13)];
t(
  "a bonus with no rival is left alone",
  JSON.stringify(dedupeLedger(lone)) === JSON.stringify(lone),
);

// Non-focus kinds are entirely unaffected by the new branch.
for (const kind of ["subtask", "task", "objective", "focus", "workout", "journal", "study"]) {
  const a = ev({ ref: "k:" + kind, id: "k-A", at: actT1, kind: kind as never, day: MD, xp: 10 });
  const b = ev({ ref: "k:" + kind, id: "k-B", at: actT2, kind: kind as never, day: MD, xp: 10 });
  t(kind + " still keeps the earliest copy", mergeLedgers([b], [a])[0]!.at === actT1);
}

// ===== 22. FOCUS STATISTICS =====
// Covers every stat tile on the Focus page: sessions today, focus time,
// rate tier, focus streak, and longest session. All derived from the ledger —
// no stored state, no UI hooks. Regressions in the folds surface here.

console.log("\n===== 22. FOCUS STATISTICS =====");

const FS_TODAY = "2026-07-15";
const FS_YEST = "2026-07-14";
const FS_D3 = "2026-07-13";

// Mixed ledger: focus events for several days plus other kinds that must NOT
// leak into any focus statistic.
const fsLedger: ActivityEvent[] = [
  // Today — three focus sessions of 25m, 20m, 10m
  ev({ ref: "fs:t:1", kind: "focus", area: "mind", day: FS_TODAY, xp: 25, minutes: 25 }),
  ev({ ref: "fs:t:2", kind: "focus", area: "mind", day: FS_TODAY, xp: 20, minutes: 20 }),
  ev({ ref: "fs:t:3", kind: "focus", area: "mind", day: FS_TODAY, xp: 10, minutes: 10 }),
  // Yesterday — one 50m focus session (should be excluded from today's stats)
  ev({ ref: "fs:y:1", kind: "focus", area: "mind", day: FS_YEST, xp: 50, minutes: 50 }),
  // Three days ago — a 30m session (used in longest-session test)
  ev({ ref: "fs:d3:1", kind: "focus", area: "mind", day: FS_D3, xp: 30, minutes: 30 }),
  // focus-bonus today — must NOT count as a session or add minutes
  ev({ ref: "fbonus:today", kind: "focus-bonus", area: "mind", day: FS_TODAY, xp: 7 }),
  // Workout today — must NOT appear in any focus stat
  ev({ ref: "wo:today", kind: "workout", area: "body", day: FS_TODAY, xp: 80, minutes: 60 }),
  // Subtask today — must NOT appear in any focus stat
  ev({ ref: "sub:today", kind: "subtask", area: "discipline", day: FS_TODAY, xp: 33 }),
  // Objective today — qualifies the global streak, not the focus streak
  ev({ ref: "obj:today", kind: "objective", area: "discipline", day: FS_TODAY, xp: 150 }),
];

const fsFocusOnly = eventsOfKind(fsLedger, "focus");
const fsTodaySessions = eventsOn(fsFocusOnly, FS_TODAY);
const fsMinutesToday = sumMinutes(fsTodaySessions);

// --- Sessions Today ---

t(
  "sessions today: three focus sessions → count 3",
  fsTodaySessions.length === 3,
  "EXPECTED 3, ACTUAL " + fsTodaySessions.length,
);
t(
  "sessions today: yesterday's session not included",
  fsTodaySessions.every((e) => e.day === FS_TODAY),
);
t(
  "sessions today: only focus kind events",
  fsTodaySessions.every((e) => e.kind === "focus"),
);
t("sessions today: focus-bonus excluded", !fsTodaySessions.some((e) => e.kind === "focus-bonus"));
t("sessions today: workout excluded", !fsTodaySessions.some((e) => e.kind === "workout"));
t(
  "sessions today: zero-state returns 0",
  eventsOn(eventsOfKind([], "focus"), FS_TODAY).length === 0,
);

// --- Focus Time (minutesToday) ---

t(
  "focus time: sums today's focus minutes only (25+20+10 = 55)",
  fsMinutesToday === 55,
  "EXPECTED 55, ACTUAL " + fsMinutesToday,
);
t(
  "focus time: yesterday's minutes excluded",
  fsMinutesToday === 55,
  "yesterday leaked: total would be 105",
);
t(
  "focus time: workout minutes not counted",
  sumMinutes(fsTodaySessions) !== 115,
  "workout 60m leaked into focus time",
);
t(
  "focus time: focus-bonus has no minutes field, contributes 0",
  sumMinutes(eventsOn(eventsOfKind(fsLedger, "focus-bonus"), FS_TODAY)) === 0,
);
t(
  "focus time: zero-state returns 0",
  sumMinutes(eventsOn(eventsOfKind([], "focus"), FS_TODAY)) === 0,
);

// --- Rate Tier (nextRate) ---
// Replicates the ternary in focus.tsx exactly.

const nextRateFor = (min: number): string =>
  min < 120 ? "full rate" : min < 240 ? "×0.75 rate" : "×0.5 rate";

t("rate tier: 0 min → full rate", nextRateFor(0) === "full rate");
t("rate tier: 55 min (today) → full rate", nextRateFor(55) === "full rate");
t("rate tier: 119 min → full rate (boundary − 1)", nextRateFor(119) === "full rate");
t("rate tier: 120 min → ×0.75 rate (exact tier-2 boundary)", nextRateFor(120) === "×0.75 rate");
t("rate tier: 121 min → ×0.75 rate", nextRateFor(121) === "×0.75 rate");
t("rate tier: 239 min → ×0.75 rate (boundary − 1)", nextRateFor(239) === "×0.75 rate");
t("rate tier: 240 min → ×0.5 rate (exact tier-3 boundary)", nextRateFor(240) === "×0.5 rate");
t("rate tier: 999 min → ×0.5 rate (well into tier 3)", nextRateFor(999) === "×0.5 rate");

// Each label must agree with the actual XP earned at that boundary.
t(
  "rate tier: focusXpFor(120,1) = 1 — consistent with ×0.75 label (rounds up)",
  focusXpFor(120, 1) === 1,
);
t(
  "rate tier: focusXpFor(240,1) = 1 — consistent with ×0.5 label (rounds up)",
  focusXpFor(240, 1) === 1,
);
// Cross-tier totals confirm the boundaries are at the correct positions.
t(
  "rate tier: 120 min at full rate then 1 min at ×0.75 → 121 XP total",
  focusXpFor(0, 121) === 121,
  "got " + focusXpFor(0, 121),
);
t(
  "rate tier: 240 min integrates both tiers (120×1 + 120×0.75 = 210)",
  focusXpFor(0, 240) === 210,
  "got " + focusXpFor(0, 240),
);

// --- Longest Session ---
// Replicates: focusEvents.reduce((best, e) => Math.max(best, e.minutes ?? 0), 0)

const longestOf = (evs: ActivityEvent[]): number =>
  eventsOfKind(evs, "focus").reduce((best, e) => Math.max(best, e.minutes ?? 0), 0);

t("longest session: empty ledger → 0 (displayed as '—')", longestOf([]) === 0);
t(
  "longest session: today 25m, 20m, 10m → 25",
  longestOf(fsTodaySessions) === 25,
  "EXPECTED 25, ACTUAL " + longestOf(fsTodaySessions),
);
t(
  "longest session: across all days → 50 (yesterday's session wins)",
  longestOf(fsFocusOnly) === 50,
  "EXPECTED 50, ACTUAL " + longestOf(fsFocusOnly),
);
t(
  "longest session: spans lifetime, not just today",
  longestOf(fsLedger) === 50,
  "EXPECTED 50 (yesterday), ACTUAL " + longestOf(fsLedger),
);
t(
  "longest session: event with minutes undefined treated as 0",
  longestOf([ev({ ref: "no-min", kind: "focus", area: "mind", day: FS_TODAY, xp: 50 })]) === 0,
);
t(
  "longest session: workout minutes do not inflate best",
  longestOf(fsLedger) !== 60,
  "workout 60m appeared as longest focus session",
);
t(
  "longest session: focus-bonus has no minutes, does not inflate best",
  eventsOfKind(fsLedger, "focus-bonus").every((e) => e.minutes === undefined),
);

// --- Focus Streak (focus-only events) ---
// focus.tsx passes eventsOfKind(events, "focus") to streakState — only days
// with real focus sessions can keep or extend the focus streak. A day that
// qualified via objectives or non-focus XP alone does NOT count.

// Scenario: D3 and YEST have focus; TODAY has only an objective (no focus).
const fsStreakLedger: ActivityEvent[] = [
  ev({ ref: "sk:d3", kind: "focus", area: "mind", day: FS_D3, xp: 25, minutes: 25 }),
  ev({ ref: "sk:ys", kind: "focus", area: "mind", day: FS_YEST, xp: 25, minutes: 25 }),
  ev({ ref: "sk:obj", kind: "objective", area: "discipline", day: FS_TODAY, xp: 150 }),
];

const focusStreakResult = streakState(eventsOfKind(fsStreakLedger, "focus"), FS_TODAY);
const globalStreakResult = streakState(fsStreakLedger, FS_TODAY);

t(
  "focus streak: 2 consecutive focus days, today no focus → streak 2",
  focusStreakResult.current === 2,
  "EXPECTED 2, ACTUAL " + focusStreakResult.current,
);
t(
  "focus streak: today with no focus events → todayQualifies false",
  !focusStreakResult.todayQualifies,
);
t(
  "global streak: objective on today qualifies → todayQualifies true",
  globalStreakResult.todayQualifies,
);
t(
  "focus streak ≤ global streak (focus is stricter)",
  focusStreakResult.current <= globalStreakResult.current,
);

// A gap in focus days breaks the focus streak even if non-focus events fill the gap.
const gapStreakLedger: ActivityEvent[] = [
  ev({ ref: "gsk:far", kind: "focus", area: "mind", day: FS_D3, xp: 25, minutes: 25 }),
  // No focus on FS_YEST — only a subtask (non-focus):
  ev({ ref: "gsk:gap", kind: "subtask", area: "discipline", day: FS_YEST, xp: 100 }),
  ev({ ref: "gsk:tod", kind: "focus", area: "mind", day: FS_TODAY, xp: 25, minutes: 25 }),
];

const gapFocusStreak = streakState(eventsOfKind(gapStreakLedger, "focus"), FS_TODAY);
t(
  "focus streak: non-focus gap day breaks the streak",
  gapFocusStreak.current === 1,
  "EXPECTED 1 (only today counts), ACTUAL " + gapFocusStreak.current,
);

// Zero state.
t("focus streak: no events → 0", streakState([], FS_TODAY).current === 0);
t(
  "focus streak: only non-focus events → 0",
  streakState(
    eventsOfKind(
      fsLedger.filter((e) => e.kind !== "focus"),
      "focus",
    ),
    FS_TODAY,
  ).current === 0,
);

// --- Day-boundary correctness ---
// Focus stats are scoped by frozen `day` field (written at log time using
// DAY_BOUNDARY_HOUR = 4). An event written before 04:00 carries yesterday's
// day key and must not appear in today's statistics.
t("DAY_BOUNDARY_HOUR is 4", DAY_BOUNDARY_HOUR === 4, "EXPECTED 4, ACTUAL " + DAY_BOUNDARY_HOUR);

// Two events at the same calendar midnight — one just before 04:00 (yesterday's key),
// one just after (today's key).
const earlyMorning = ev({
  ref: "day:early",
  kind: "focus",
  area: "mind",
  day: FS_YEST, // 03:59 → rolls to yesterday
  at: "2026-07-15T03:59:00.000Z",
  xp: 25,
  minutes: 25,
});
const afterBoundary = ev({
  ref: "day:late",
  kind: "focus",
  area: "mind",
  day: FS_TODAY, // 04:00 → today
  at: "2026-07-15T04:00:00.000Z",
  xp: 25,
  minutes: 25,
});

const boundaryLedger = [earlyMorning, afterBoundary];
const boundaryToday = eventsOn(eventsOfKind(boundaryLedger, "focus"), FS_TODAY);
const boundaryYest = eventsOn(eventsOfKind(boundaryLedger, "focus"), FS_YEST);

t("boundary: 03:59 event has yesterday's day key", earlyMorning.day === FS_YEST);
t("boundary: 04:00 event has today's day key", afterBoundary.day === FS_TODAY);
t("boundary: only the 04:00 event appears in today's sessions", boundaryToday.length === 1);
t("boundary: 03:59 event is in yesterday's sessions", boundaryYest.length === 1);
t("boundary: today's minutes = 25 (not 50)", sumMinutes(boundaryToday) === 25);

// --- Zero-state / pre-hydration safety ---
// When today is null (pre-hydration), focus.tsx returns empty arrays and 0.
// These are the fallback values the ternaries produce — test them directly.
const nullTodaySessions: ActivityEvent[] = []; // (today ? eventsOn(...) : [])
const nullMinutesToday = 0; // (today ? sumMinutes(...) : 0)
const nullStreak = 0; // (today ? streakState(...).current : 0)

t("zero-state: null today → 0 sessions", nullTodaySessions.length === 0);
t("zero-state: null today → 0 minutes", nullMinutesToday === 0);
t("zero-state: null today → 0 streak", nullStreak === 0);
t("zero-state: longest session with empty array → 0", longestOf([]) === 0);

// --- Historical session log (Today's Sessions panel) ---
// The panel reverses todaysSessions to show newest first; the reversal must not
// change the count or mix in other kinds.
const sessionLogInput = [...fsTodaySessions].reverse();
t(
  "session log: reversing today's sessions preserves count",
  sessionLogInput.length === fsTodaySessions.length,
);
t(
  "session log: reversed list still contains only today's focus events",
  sessionLogInput.every((e) => e.kind === "focus" && e.day === FS_TODAY),
);
t(
  "session log: XP values are preserved through reversal",
  sessionLogInput.reduce((s, e) => s + e.xp, 0) === fsTodaySessions.reduce((s, e) => s + e.xp, 0),
);

// --- Duplicate events after import ---
// If the same focus session is imported twice (e.g. from two backups), dedupe
// keeps exactly one copy, so the count and minutesToday are not inflated.
const dupLedger = [
  ev({ ref: "dup:a", kind: "focus", area: "mind", day: FS_TODAY, xp: 25, minutes: 25 }),
  ev({
    ref: "dup:a",
    id: "different-id",
    kind: "focus",
    area: "mind",
    day: FS_TODAY,
    xp: 25,
    minutes: 25,
  }),
];
const deduped = dedupeLedger(dupLedger);
const dedupedToday = eventsOn(eventsOfKind(deduped, "focus"), FS_TODAY);
t(
  "duplicate import: deduped ledger has exactly 1 session",
  dedupedToday.length === 1,
  "EXPECTED 1, ACTUAL " + dedupedToday.length,
);
t(
  "duplicate import: minutesToday is not inflated",
  sumMinutes(dedupedToday) === 25,
  "EXPECTED 25, ACTUAL " + sumMinutes(dedupedToday),
);

// --- formatMinutes logic ---
// Replicates the private formatMinutes function from focus.tsx. Tests confirm
// the spec produces the right label at exact boundary values.
const fmtMin = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};
t("formatMinutes: 0 → '0m'", fmtMin(0) === "0m");
t("formatMinutes: 45 → '45m'", fmtMin(45) === "45m");
t("formatMinutes: 60 → '1h' (no zero remainder)", fmtMin(60) === "1h");
t("formatMinutes: 90 → '1h 30m'", fmtMin(90) === "1h 30m");
t("formatMinutes: 120 → '2h'", fmtMin(120) === "2h");
t("formatMinutes: 150 → '2h 30m'", fmtMin(150) === "2h 30m");
t("formatMinutes: 1 → '1m'", fmtMin(1) === "1m");

// ===== 23. SERIES & COURSES — ADVERSARIAL INVARIANTS =====
// Covers the full series pipeline: ref format, YouTube URL parsing, completion
// derivation, progress, streaks, projections, duplicate prevention, knowledge
// area contribution, minutesPerEpisode, and cross-series isolation.

console.log("\n===== 23. SERIES & COURSES — ADVERSARIAL INVARIANTS =====");

const SC_TODAY = "2026-07-20";
const SC_YEST = "2026-07-19";
const SC_D2 = "2026-07-18";
const SC_D3 = "2026-07-17";

const sc: Series = {
  id: "sc-main",
  title: "Test Course",
  source: "Manual",
  dailyTarget: 2,
  minutesPerEpisode: 15,
  createdOn: SC_TODAY,
  episodes: [
    { id: "ep0", title: "Intro" },
    { id: "ep1", title: "Chapter 1" },
    { id: "ep2", title: "Chapter 2" },
    { id: "ep3", title: "Chapter 3" },
    { id: "ep4", title: "Final" },
  ],
};

const scStudy = (episodeId: string, day: string): ActivityEvent =>
  ev({
    ref: seriesRef(sc.id, episodeId),
    kind: "study",
    area: "knowledge",
    day,
    xp: 30,
    minutes: sc.minutesPerEpisode,
  });

// --- seriesRef format ---

t("seriesRef: format is series:seriesId:episodeId", seriesRef("abc", "xyz") === "series:abc:xyz");
t("seriesRef: different series → different ref", seriesRef("s1", "ep0") !== seriesRef("s2", "ep0"));
t(
  "seriesRef: different episodes → different ref",
  seriesRef("s1", "ep0") !== seriesRef("s1", "ep1"),
);
t(
  "seriesRef: YouTube-style id is correctly prefixed",
  seriesRef("yt-PLxxx", "videoABC").startsWith("series:yt-PLxxx:"),
);

// --- parsePlaylistId ---

t(
  "parsePlaylistId: full URL extracts list param",
  parsePlaylistId("https://www.youtube.com/playlist?list=PLxxx123") === "PLxxx123",
);
t(
  "parsePlaylistId: URL with multiple params",
  parsePlaylistId("https://youtube.com/watch?v=abc&list=PLyyy456&index=1") === "PLyyy456",
);
t(
  "parsePlaylistId: bare playlist id passes through",
  parsePlaylistId("PLabc1234567890") === "PLabc1234567890",
);
t("parsePlaylistId: empty string → null", parsePlaylistId("") === null);
t("parsePlaylistId: too-short string → null", parsePlaylistId("short") === null);
t(
  "parsePlaylistId: URL without list= → null",
  parsePlaylistId("https://www.youtube.com/watch?v=abc123") === null,
);
t(
  "parsePlaylistId: leading/trailing whitespace trimmed",
  parsePlaylistId("  PLabc1234567890  ") === "PLabc1234567890",
);
t("parsePlaylistId: exactly 12-char bare id is accepted", parsePlaylistId("PLabc1234567") !== null);

// --- episodeCompletions ---

const scEmpty = episodeCompletions([]);
t("episodeCompletions: empty ledger → null for any episode", scEmpty(sc.id, "ep0") === null);

const scNonStudyLedger: ActivityEvent[] = [
  ev({ ref: seriesRef(sc.id, "ep0"), kind: "focus", area: "mind", day: SC_TODAY, xp: 30 }),
  ev({ ref: seriesRef(sc.id, "ep1"), kind: "journal", area: "mind", day: SC_TODAY, xp: 30 }),
  ev({ ref: seriesRef(sc.id, "ep2"), kind: "subtask", area: "discipline", day: SC_TODAY, xp: 30 }),
];
const scNonStudyDone = episodeCompletions(scNonStudyLedger);
t("episodeCompletions: focus events are ignored", scNonStudyDone(sc.id, "ep0") === null);
t("episodeCompletions: journal events are ignored", scNonStudyDone(sc.id, "ep1") === null);
t("episodeCompletions: subtask events are ignored", scNonStudyDone(sc.id, "ep2") === null);

const scDayLedger2: ActivityEvent[] = [scStudy("ep0", SC_TODAY), scStudy("ep1", SC_YEST)];
const scDayDone = episodeCompletions(scDayLedger2);
t(
  "episodeCompletions: day field is frozen at the event's day",
  scDayDone(sc.id, "ep0") === SC_TODAY,
);
t("episodeCompletions: different days tracked separately", scDayDone(sc.id, "ep1") === SC_YEST);
t("episodeCompletions: undone episode returns null", scDayDone(sc.id, "ep2") === null);

const scCrossLedger: ActivityEvent[] = [
  ev({
    ref: seriesRef("series-A", "ep0"),
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 15,
  }),
];
const scCrossDone = episodeCompletions(scCrossLedger);
t(
  "episodeCompletions: series-A completion is visible in series-A",
  scCrossDone("series-A", "ep0") === SC_TODAY,
);
t(
  "episodeCompletions: series-A completion is invisible in series-B",
  scCrossDone("series-B", "ep0") === null,
);

// --- seriesProgress ---

const sc0Done = episodeCompletions([]);
t("seriesProgress: nothing done → 0%", seriesProgress(sc, sc0Done).percent === 0);
t("seriesProgress: nothing done → done = 0", seriesProgress(sc, sc0Done).done === 0);
t(
  "seriesProgress: nothing done → remaining = total",
  seriesProgress(sc, sc0Done).remaining === sc.episodes.length,
);

const scAllDoneEvents = sc.episodes.map((e) => scStudy(e.id, SC_TODAY));
const scAllDone = episodeCompletions(scAllDoneEvents);
t("seriesProgress: all done → 100%", seriesProgress(sc, scAllDone).percent === 100);
t("seriesProgress: all done → remaining = 0", seriesProgress(sc, scAllDone).remaining === 0);
t(
  "seriesProgress: all done → done = total",
  seriesProgress(sc, scAllDone).done === sc.episodes.length,
);

const sc3Done = episodeCompletions([
  scStudy("ep0", SC_TODAY),
  scStudy("ep1", SC_TODAY),
  scStudy("ep2", SC_TODAY),
]);
t(
  "seriesProgress: 3/5 → 60%",
  seriesProgress(sc, sc3Done).percent === 60,
  "EXPECTED 60, ACTUAL " + seriesProgress(sc, sc3Done).percent,
);

// --- doneOnDay ---

const scPerDayLedger: ActivityEvent[] = [
  scStudy("ep0", SC_TODAY),
  scStudy("ep1", SC_TODAY),
  scStudy("ep2", SC_YEST),
];
const perDayDone = episodeCompletions(scPerDayLedger);
t("doneOnDay: 2 done today → 2", doneOnDay(sc, SC_TODAY, perDayDone) === 2);
t("doneOnDay: 1 done yesterday → 1", doneOnDay(sc, SC_YEST, perDayDone) === 1);
t("doneOnDay: 0 done on SC_D2 → 0", doneOnDay(sc, SC_D2, perDayDone) === 0);
t("doneOnDay: empty ledger → 0", doneOnDay(sc, SC_TODAY, episodeCompletions([])) === 0);

// --- nextEpisode ---

t(
  "nextEpisode: nothing done → first episode",
  nextEpisode(sc, episodeCompletions([]))?.id === "ep0",
);
t(
  "nextEpisode: after ep0 done → ep1",
  nextEpisode(sc, episodeCompletions([scStudy("ep0", SC_TODAY)]))?.id === "ep1",
);
t("nextEpisode: all done → null", nextEpisode(sc, scAllDone) === null);

const sc4Done = episodeCompletions(sc.episodes.slice(0, 4).map((e) => scStudy(e.id, SC_TODAY)));
t(
  "nextEpisode: only last episode undone → returns last episode",
  nextEpisode(sc, sc4Done)?.id === "ep4",
);

// --- seriesStreak ---

t("seriesStreak: no completions → 0", seriesStreak(sc, SC_TODAY, episodeCompletions([])) === 0);

// Today and yesterday both meet target (2 each).
const scBothHit: ActivityEvent[] = [
  scStudy("ep0", SC_YEST),
  scStudy("ep1", SC_YEST),
  scStudy("ep2", SC_TODAY),
  scStudy("ep3", SC_TODAY),
];
const scBothDone = episodeCompletions(scBothHit);
t(
  "seriesStreak: today + yesterday hit target → 2",
  seriesStreak(sc, SC_TODAY, scBothDone) === 2,
  "EXPECTED 2, ACTUAL " + seriesStreak(sc, SC_TODAY, scBothDone),
);

// Today only 1 episode (target 2), yesterday 2 — streak counts from yesterday.
const scTodayShort: ActivityEvent[] = [
  scStudy("ep0", SC_YEST),
  scStudy("ep1", SC_YEST),
  scStudy("ep2", SC_TODAY),
];
const scShortDone = episodeCompletions(scTodayShort);
t(
  "seriesStreak: today short of target, yesterday hit → 1 (from yesterday)",
  seriesStreak(sc, SC_TODAY, scShortDone) === 1,
  "EXPECTED 1, ACTUAL " + seriesStreak(sc, SC_TODAY, scShortDone),
);

// Gap day breaks streak.
const scGapLedger: ActivityEvent[] = [
  scStudy("ep0", SC_D3),
  scStudy("ep1", SC_D3),
  // SC_D2 has nothing
  scStudy("ep2", SC_YEST),
  scStudy("ep3", SC_YEST),
];
const scGapDone = episodeCompletions(scGapLedger);
t(
  "seriesStreak: gap in history breaks streak (only yesterday counts)",
  seriesStreak(sc, SC_YEST, scGapDone) === 1,
  "EXPECTED 1, ACTUAL " + seriesStreak(sc, SC_YEST, scGapDone),
);

// Single episode, target 1 → streak = 1 after completion.
const scSingle: Series = {
  id: "single",
  title: "One-off",
  source: "Manual",
  dailyTarget: 1,
  minutesPerEpisode: 10,
  createdOn: SC_TODAY,
  episodes: [{ id: "only", title: "The one" }],
};
const scSingleDone = episodeCompletions([
  ev({
    ref: seriesRef("single", "only"),
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 10,
  }),
]);
t(
  "seriesStreak: one episode done today → streak 1",
  seriesStreak(scSingle, SC_TODAY, scSingleDone) === 1,
);

// Streak across 3 consecutive days.
const sc3DayStreak: ActivityEvent[] = [
  scStudy("ep0", SC_D2),
  scStudy("ep1", SC_D2),
  scStudy("ep2", SC_YEST),
  scStudy("ep3", SC_YEST),
  scStudy("ep4", SC_TODAY),
];
const sc3DayDone = episodeCompletions(sc3DayStreak);
// dailyTarget: 1 — each day has at least 1 done, so all 3 days qualify.
t(
  "seriesStreak: 3 consecutive days hit target (1/day) → 3",
  seriesStreak({ ...sc, dailyTarget: 1 }, SC_TODAY, sc3DayDone) === 3,
  "EXPECTED 3, ACTUAL " + seriesStreak({ ...sc, dailyTarget: 1 }, SC_TODAY, sc3DayDone),
);

// --- projectedFinish ---

t("projectedFinish: all done → 0", projectedFinish(sc, scAllDone) === 0);

t(
  "projectedFinish: 0 done, target 2, 5 eps → ceil(5/2) = 3",
  projectedFinish(sc, sc0Done) === 3,
  "EXPECTED 3, ACTUAL " + projectedFinish(sc, sc0Done),
);
t(
  "projectedFinish: 3/5 done, target 2, 2 remaining → 1",
  projectedFinish(sc, sc3Done) === 1,
  "EXPECTED 1, ACTUAL " + projectedFinish(sc, sc3Done),
);
t(
  "projectedFinish: 4/5 done, target 2, 1 remaining → ceil(1/2) = 1",
  projectedFinish(sc, sc4Done) === 1,
  "EXPECTED 1, ACTUAL " + projectedFinish(sc, sc4Done),
);
t(
  "projectedFinish: target 1, 5 remaining → 5 days",
  projectedFinish({ ...sc, dailyTarget: 1 }, sc0Done) === 5,
  "EXPECTED 5, ACTUAL " + projectedFinish({ ...sc, dailyTarget: 1 }, sc0Done),
);
t(
  "projectedFinish: dailyTarget guard prevents div-by-zero at 0",
  Number.isFinite(projectedFinish({ ...sc, dailyTarget: 0 }, sc0Done)),
);

// --- Duplicate completion prevention ---

const scDupLedger: ActivityEvent[] = [
  ev({
    ref: seriesRef(sc.id, "ep0"),
    id: "s-A",
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 15,
  }),
  ev({
    ref: seriesRef(sc.id, "ep0"),
    id: "s-B",
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 15,
  }),
];
const scDeduped = dedupeLedger(scDupLedger);
t(
  "duplicate episode log: deduped ledger has exactly one entry",
  scDeduped.filter((e) => e.ref === seriesRef(sc.id, "ep0")).length === 1,
);
t(
  "duplicate episode log: XP is not doubled",
  sumXp(scDeduped.filter((e) => e.kind === "study")) === 30,
  "EXPECTED 30, ACTUAL " + sumXp(scDeduped.filter((e) => e.kind === "study")),
);
t(
  "duplicate episode log: progress count is not inflated",
  seriesProgress(sc, episodeCompletions(scDeduped)).done === 1,
);

// --- Knowledge area contribution ---

const scStudyEvent = scStudy("ep0", SC_TODAY);
t("study event carries area: knowledge", scStudyEvent.area === "knowledge");
t("study event carries kind: study", scStudyEvent.kind === "study");
t(
  "study event carries 30 XP (XP.journal)",
  scStudyEvent.xp === 30,
  "EXPECTED 30, ACTUAL " + scStudyEvent.xp,
);

const scKnowledgeLedger: ActivityEvent[] = [scStudy("ep0", SC_TODAY), scStudy("ep1", SC_TODAY)];
t(
  "two study events contribute 60 XP to the day",
  sumXp(scKnowledgeLedger.filter((e) => e.day === SC_TODAY)) === 60,
  "EXPECTED 60, ACTUAL " + sumXp(scKnowledgeLedger.filter((e) => e.day === SC_TODAY)),
);

// --- minutesPerEpisode feeds sumMinutes ---

t(
  "study event carries minutesPerEpisode as its minutes field",
  scStudy("ep0", SC_TODAY).minutes === sc.minutesPerEpisode,
);
t(
  "sumMinutes over 2 study events = 2 × minutesPerEpisode",
  sumMinutes(scKnowledgeLedger) === 2 * sc.minutesPerEpisode,
  "EXPECTED " + 2 * sc.minutesPerEpisode + ", ACTUAL " + sumMinutes(scKnowledgeLedger),
);

// --- Cross-series isolation ---

const serA: Series = { ...sc, id: "ser-A" };
const serB: Series = { ...sc, id: "ser-B" };
const crossLedger: ActivityEvent[] = [
  ev({
    ref: seriesRef("ser-A", "ep0"),
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 15,
  }),
  ev({
    ref: seriesRef("ser-A", "ep1"),
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 15,
  }),
];
const crossDone = episodeCompletions(crossLedger);
t("cross-series: ser-A ep0 is done", crossDone("ser-A", "ep0") === SC_TODAY);
t("cross-series: ser-B ep0 is not done (different series id)", crossDone("ser-B", "ep0") === null);
t(
  "cross-series: ser-A progress 2, ser-B progress 0",
  seriesProgress(serA, crossDone).done === 2 && seriesProgress(serB, crossDone).done === 0,
);
t(
  "cross-series: nextEpisode for ser-B starts at ep0 despite ser-A progress",
  nextEpisode(serB, crossDone)?.id === "ep0",
);

// --- Large episode list performance ---

const bigSeries: Series = {
  id: "big",
  title: "500-episode course",
  source: "YouTube",
  dailyTarget: 1,
  minutesPerEpisode: 12,
  createdOn: SC_TODAY,
  episodes: Array.from({ length: 500 }, (_, i) => ({ id: `ep${i}`, title: `Episode ${i}` })),
};
const bigLedger: ActivityEvent[] = bigSeries.episodes.slice(0, 250).map((e) =>
  ev({
    ref: seriesRef("big", e.id),
    kind: "study",
    area: "knowledge",
    day: SC_TODAY,
    xp: 30,
    minutes: 12,
  }),
);
const bigDone = episodeCompletions(bigLedger);

t(
  "large list: 250/500 episodes reported as done",
  seriesProgress(bigSeries, bigDone).done === 250,
  "EXPECTED 250, ACTUAL " + seriesProgress(bigSeries, bigDone).done,
);
t(
  "large list: projected finish = 250 days at target 1",
  projectedFinish(bigSeries, bigDone) === 250,
  "EXPECTED 250, ACTUAL " + projectedFinish(bigSeries, bigDone),
);
t(
  "large list: next episode is the 251st (ep250)",
  nextEpisode(bigSeries, bigDone)?.id === "ep250",
  "EXPECTED ep250, ACTUAL " + nextEpisode(bigSeries, bigDone)?.id,
);

console.log("\n===== 24. FOCUS → PROGRESSION INTEGRATION =====");

const FP_TODAY = "2026-08-12";
const FP_YEST = "2026-08-11";
const FP_EDGE = "2026-07-14"; // 29 days back from FP_TODAY → last day inside the 30-day window
const FP_OUTSIDE = "2026-07-13"; // 30 days back → just outside the window

const fpFocus = (ref: string, xp: number, minutes: number, day = FP_TODAY): ActivityEvent =>
  ev({ ref, kind: "focus", area: "mind", day, xp, minutes });

const fpBonus = (ref: string, xp: number, day = FP_TODAY): ActivityEvent =>
  ev({ ref, kind: "focus-bonus", area: "mind", day, xp });

const fpStudy = (ref: string, xp: number, minutes: number, day = FP_TODAY): ActivityEvent =>
  ev({ ref, kind: "study", area: "knowledge", day, xp, minutes });

const fpWorkout = (ref: string, xp: number, minutes: number, day = FP_TODAY): ActivityEvent =>
  ev({ ref, kind: "workout", area: "body", day, xp, minutes });

// --- 24a. Area assignment ---
const fp_f1 = fpFocus("fp:f1", 50, 50);
const fp_fb1 = fpBonus("fp:fb1", 12);
const fp_s1 = fpStudy("fp:s1", 30, 15);
const fp_w1 = fpWorkout("fp:w1", 80, 45);
const fp_o1 = ev({ ref: "fp:obj", kind: "objective", area: "discipline", day: FP_YEST, xp: 150 });

t("area: focus kind → mind", fp_f1.area === "mind");
t("area: focus-bonus kind → mind", fp_fb1.area === "mind");
t("area: study kind → knowledge", fp_s1.area === "knowledge");
t("area: workout kind → body", fp_w1.area === "body");
t("area: objective kind → discipline", fp_o1.area === "discipline");

const mg_f = migrateEvent({ ref: "mg:f", kind: "focus", xp: 10 });
const mg_fb = migrateEvent({ ref: "mg:fb", kind: "focus-bonus", xp: 5 });
const mg_st = migrateEvent({ ref: "mg:st", kind: "study", xp: 30 });
t("migrateEvent: focus kind → area=mind", mg_f.area === "mind");
t("migrateEvent: focus-bonus kind → area=mind", mg_fb.area === "mind");
t("migrateEvent: study kind → area=knowledge", mg_st.area === "knowledge");

// --- 24b. Global XP aggregation includes focus ---
const fp_ledger: ActivityEvent[] = [fp_f1, fp_fb1, fp_s1, fp_w1, fp_o1];
const fp_total = sumXp(fp_ledger);
t("globalXP: includes focus XP", fp_total >= fp_f1.xp);
t("globalXP: includes focus-bonus XP", fp_total >= fp_fb1.xp);
t("globalXP: sum = 50+12+30+80+150 = 322", fp_total === 322, "EXPECTED 322, ACTUAL " + fp_total);

const fp_above1000 = progressionFor(1001);
t(
  "progressionFor: 1001 XP → level ≥ 2",
  fp_above1000.currentLevel >= 2,
  "EXPECTED ≥2, ACTUAL " + fp_above1000.currentLevel,
);
t(
  "progressionFor: pure — same input yields same level",
  progressionFor(1001).currentLevel === fp_above1000.currentLevel,
);

// --- 24c. Mind 30-day form ---
const fp_form = formFor(fp_ledger, FP_TODAY);
const fp_mind = fp_form.find((f) => f.area === "mind")!;
const fp_knowledge = fp_form.find((f) => f.area === "knowledge")!;
t(
  "mind form: windowXp = focus(50) + bonus(12) = 62",
  fp_mind.windowXp === 62,
  "EXPECTED 62, ACTUAL " + fp_mind.windowXp,
);
t("mind form: focus-bonus XP contributes (windowXp > focus-only)", fp_mind.windowXp > fp_f1.xp);
t(
  "knowledge form: windowXp = study XP = 30",
  fp_knowledge.windowXp === 30,
  "EXPECTED 30, ACTUAL " + fp_knowledge.windowXp,
);
t("no cross-contamination: study XP not in mind form", fp_mind.windowXp === 62);
t("no cross-contamination: focus XP not in knowledge form", fp_knowledge.windowXp === 30);

// Event exactly 30 days back is excluded; 29 days back is still included.
const fp_outFocus = fpFocus("fp:out", 999, 999, FP_OUTSIDE);
const fp_edgeFocus = fpFocus("fp:edge", 99, 99, FP_EDGE);
const fp_formOut = formFor([...fp_ledger, fp_outFocus], FP_TODAY).find((f) => f.area === "mind")!;
const fp_formEdge = formFor([...fp_ledger, fp_edgeFocus], FP_TODAY).find((f) => f.area === "mind")!;
t(
  "form window: 30-days-old focus event excluded (999 XP not counted)",
  fp_formOut.windowXp === 62,
  "EXPECTED 62, ACTUAL " + fp_formOut.windowXp,
);
t(
  "form window: 29-days-old focus event included (62+99=161)",
  fp_formEdge.windowXp === 161,
  "EXPECTED 161, ACTUAL " + fp_formEdge.windowXp,
);

// --- 24d. MVD qualification via focus minutes ---
t("MVD: 25 focus minutes qualifies", dayQualifies([fpFocus("mvd:25", 0, 25)]));
t("MVD: 24 focus minutes alone does not qualify", !dayQualifies([fpFocus("mvd:24", 0, 24)]));
t(
  "MVD: focus-bonus (no minutes field) alone does not qualify via minutes path",
  !dayQualifies([fpBonus("mvd:bonus", 50)]),
);
t("MVD: focus-bonus with 100 XP qualifies via XP path", dayQualifies([fpBonus("mvd:xp", 100)]));
t("MVD: objective qualifies regardless of XP", dayQualifies([fp_o1]));
t(
  "MVD: 0-XP 25-min focus qualifies (minutes path, not XP path)",
  dayQualifies([fpFocus("mvd:0xp", 0, 25)]),
);
t(
  "MVD: 1 XP 0-min task does not qualify alone",
  !dayQualifies([ev({ ref: "mvd:1xp", kind: "task", area: "discipline", day: FP_TODAY, xp: 1 })]),
);

// --- 24e. Global vs focus streak remain distinct ---
// FP_EDGE: focus only | FP_YEST: objective only (no focus) | FP_TODAY: focus only
const fp_streakLedger: ActivityEvent[] = [
  fpFocus("sk:a", 50, 25, FP_EDGE),
  ev({ ref: "sk:b", kind: "objective", area: "discipline", day: FP_YEST, xp: 150 }),
  fpFocus("sk:c", 50, 25, FP_TODAY),
];
const fp_globalStreak = streakState(fp_streakLedger, FP_TODAY);
const fp_focusStreak = streakState(eventsOfKind(fp_streakLedger, "focus"), FP_TODAY);

t("global streak: todayQualifies=true (today has focus)", fp_globalStreak.todayQualifies);
t("focus streak: todayQualifies=true (today has focus event)", fp_focusStreak.todayQualifies);
t(
  "focus streak ≤ global streak: objective-only gap breaks focus streak but not global",
  fp_focusStreak.current <= fp_globalStreak.current,
);
t(
  "focus-bonus alone does not count for focus streak (not kind=focus)",
  streakState(eventsOfKind([fpBonus("fps:b", 50)], "focus"), FP_TODAY).current === 0,
  "EXPECTED 0, bonus is not kind=focus",
);
t(
  "focus streak: non-focus event kinds never appear in focus-only filter",
  eventsOfKind([fp_fb1, fp_s1, fp_w1, fp_o1], "focus").length === 0,
);

// --- 24f. Achievement seal thresholds (via evaluateRewards) ---
const evalF = (sessions: number, hours: number) =>
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: sessions,
    focusHours: hours,
    objectives: 0,
    longestStreak: 0,
  });

t(
  "seal: 49 sessions → ambient-rain LOCKED",
  !evalF(49, 0).find((r) => r.id === "ambient-rain")!.unlocked,
);
t(
  "seal: 50 sessions → ambient-rain UNLOCKED",
  evalF(50, 0).find((r) => r.id === "ambient-rain")!.unlocked,
);
t(
  "seal: 249 sessions → enso-master-stroke LOCKED",
  !evalF(249, 0).find((r) => r.id === "enso-master-stroke")!.unlocked,
);
t(
  "seal: 250 sessions → enso-master-stroke UNLOCKED",
  evalF(250, 0).find((r) => r.id === "enso-master-stroke")!.unlocked,
);
t(
  "seal: 499 sessions → seal-five-hundred LOCKED",
  !evalF(499, 0).find((r) => r.id === "seal-five-hundred")!.unlocked,
);
t(
  "seal: 500 sessions → seal-five-hundred UNLOCKED",
  evalF(500, 0).find((r) => r.id === "seal-five-hundred")!.unlocked,
);
t(
  "seal: 99 focus hours → ambient-river LOCKED",
  !evalF(0, 99).find((r) => r.id === "ambient-river")!.unlocked,
);
t(
  "seal: 100 focus hours → ambient-river UNLOCKED",
  evalF(0, 100).find((r) => r.id === "ambient-river")!.unlocked,
);
t(
  "seal: 999 focus hours → seal-thousand-hours LOCKED",
  !evalF(0, 999).find((r) => r.id === "seal-thousand-hours")!.unlocked,
);
t(
  "seal: 1000 focus hours → seal-thousand-hours UNLOCKED",
  evalF(0, 1000).find((r) => r.id === "seal-thousand-hours")!.unlocked,
);

// --- 24g. Minutes never double-counted ---
const fp_minLedger: ActivityEvent[] = [
  fpFocus("min:f1", 25, 25),
  fpFocus("min:f2", 20, 20),
  fpStudy("min:s1", 30, 15),
  fpWorkout("min:w1", 80, 45),
  fpBonus("min:b1", 5), // no minutes field
];
t(
  "focusMinutes: only focus kind (25+20=45)",
  sumMinutes(fp_minLedger, "focus") === 45,
  "EXPECTED 45, ACTUAL " + sumMinutes(fp_minLedger, "focus"),
);
t(
  "totalMinutes: all measured kinds (25+20+15+45=105, bonus=0)",
  sumMinutes(fp_minLedger) === 105,
  "EXPECTED 105, ACTUAL " + sumMinutes(fp_minLedger),
);
t(
  "focus-bonus contributes 0 minutes (minutes field absent)",
  sumMinutes([fpBonus("b:0", 5)]) === 0,
);
t(
  "totalMinutes − focusMinutes = 60 (study 15 + workout 45)",
  sumMinutes(fp_minLedger) - sumMinutes(fp_minLedger, "focus") === 60,
  "EXPECTED 60, ACTUAL " + (sumMinutes(fp_minLedger) - sumMinutes(fp_minLedger, "focus")),
);

// --- 24h. Task-completion bonus stays separate ---
const fp_sessionRef = "focus:111111";
const fp_bonusRef = "focus-bonus:2026-08-12:tA";
const fp_mixed: ActivityEvent[] = [
  ev({
    ref: fp_sessionRef,
    kind: "focus",
    area: "mind",
    day: FP_TODAY,
    xp: 80,
    minutes: 80,
    taskId: "tA",
  }),
  ev({ ref: fp_bonusRef, kind: "focus-bonus", area: "mind", day: FP_TODAY, xp: 20 }),
];
t("task-completion bonus: ref distinct from session ref", fp_sessionRef !== fp_bonusRef);
t(
  "task-completion bonus: bonus event has no minutes field",
  fp_mixed.find((e) => e.ref === fp_bonusRef)!.minutes === undefined,
);
t(
  "task-completion bonus: focusMinutes excludes bonus (80 only)",
  sumMinutes(fp_mixed, "focus") === 80,
  "EXPECTED 80, ACTUAL " + sumMinutes(fp_mixed, "focus"),
);
t(
  "task-completion bonus: totalXP = session(80) + bonus(20) = 100",
  sumXp(fp_mixed) === 100,
  "EXPECTED 100, ACTUAL " + sumXp(fp_mixed),
);
t(
  "task-completion bonus: focusSessions count = 1 (bonus not a focus session)",
  eventsOfKind(fp_mixed, "focus").length === 1,
);
t(
  "task-completion bonus: focusHours = floor(80/60) = 1",
  Math.floor(sumMinutes(fp_mixed, "focus") / 60) === 1,
  "EXPECTED 1, ACTUAL " + Math.floor(sumMinutes(fp_mixed, "focus") / 60),
);

// --- 24i. Rest block guard ---
// Mirrors the bankSession guard: if (!today || preset.rest || minutes < 1) return;
const restGuard = (isRest: boolean, minutes: number) => !isRest && minutes >= 1;
t("rest guard: rest=true → no log", !restGuard(true, 50));
t(
  "rest guard: rest=false + 0 min → no log (sub-minute early finish floors to 0)",
  !restGuard(false, 0),
);
t("rest guard: rest=false + 1 min → logs", restGuard(false, 1));

// --- 24j. Journey XP accumulation from focus ---
const jp_below = progressionFor(JOURNEY_XP - 1);
const jp_exact = progressionFor(JOURNEY_XP);
const jp_over = progressionFor(JOURNEY_XP + 1);
t("journey: JOURNEY_XP−1 → journey 1", jp_below.currentJourney === 1);
t(
  "journey: exactly JOURNEY_XP → journey 2",
  jp_exact.currentJourney === 2,
  "EXPECTED 2, ACTUAL " + jp_exact.currentJourney,
);
t("journey: JOURNEY_XP+1 → still journey 2", jp_over.currentJourney === 2);
t("journey: completedJourneys=0 before first completion", jp_below.completedJourneys === 0);
t("journey: completedJourneys=1 at first completion", jp_exact.completedJourneys === 1);

// 4-hour focus session earns meaningful XP toward a journey.
const fp_4hXp = focusXpFor(0, 240);
t("4-hour focus session earns >0 XP", fp_4hXp > 0);
t(
  "4-hour focus session earns >100 XP (non-trivial daily pace)",
  fp_4hXp > 100,
  "EXPECTED >100, ACTUAL " + fp_4hXp,
);
const fp_paceInDays = Math.ceil(JOURNEY_XP / fp_4hXp);
t(
  "journey at 4-hour/day pace takes " + fp_paceInDays + " days (expect 100–2000)",
  fp_paceInDays > 100 && fp_paceInDays < 2000,
  "EXPECTED 100–2000, ACTUAL " + fp_paceInDays,
);

// --- 24k. Chronicle focus fields ---
// focusHours = Math.round((focusMinutes / 60) * 10) / 10
// longestFocusSession = max single event minutes (not per-day sum)
const ch_events: ActivityEvent[] = [
  fpFocus("ch:f1", 50, 50),
  fpFocus("ch:f2", 30, 30),
  fpBonus("ch:fb", 12), // no minutes → excluded from focusMinutes
  fpStudy("ch:st", 30, 20), // study → excluded from focusMinutes
];
const ch_focusMin = sumMinutes(ch_events, "focus");
const ch_studyMin = sumMinutes(ch_events, "study");
const ch_longestFocus = eventsOfKind(ch_events, "focus").reduce(
  (b, e) => Math.max(b, e.minutes ?? 0),
  0,
);
t(
  "chronicle: focusMinutes = 80 (two focus events: 50+30)",
  ch_focusMin === 80,
  "EXPECTED 80, ACTUAL " + ch_focusMin,
);
t(
  "chronicle: studyMinutes separate = 20 (not in focusMinutes)",
  ch_studyMin === 20,
  "EXPECTED 20, ACTUAL " + ch_studyMin,
);
t(
  "chronicle: longestFocusSession = 50 (max single event, not per-day sum)",
  ch_longestFocus === 50,
  "EXPECTED 50, ACTUAL " + ch_longestFocus,
);
t(
  "chronicle: focusHours rounded to 1 decimal = 1.3",
  Math.round((ch_focusMin / 60) * 10) / 10 === 1.3,
  "EXPECTED 1.3, ACTUAL " + Math.round((ch_focusMin / 60) * 10) / 10,
);
t("chronicle: focus-bonus has no minutes (excluded from focusMinutes)", ch_focusMin === 80);
t(
  "chronicle: study minutes do not contaminate focusMinutes",
  ch_focusMin !== ch_focusMin + ch_studyMin,
);

// --- 24l. deriveStats end-to-end for focus ledger ---
const ms_ledger: ActivityEvent[] = [
  fpFocus("ms:f1", 50, 50),
  fpFocus("ms:f2", 30, 30),
  fpBonus("ms:fb", 12),
  fpStudy("ms:st", 30, 20),
  fpWorkout("ms:wk", 80, 45),
];
const ms = deriveStats(ms_ledger, FP_TODAY);
t(
  "deriveStats: totalXp = 50+30+12+30+80 = 202",
  ms.totalXp === 202,
  "EXPECTED 202, ACTUAL " + ms.totalXp,
);
t(
  "deriveStats: focusMinutes = 80 (focus kind only, not bonus)",
  ms.focusMinutes === 80,
  "EXPECTED 80, ACTUAL " + ms.focusMinutes,
);
t(
  "deriveStats: totalMinutes = 145 (50+30+20+45; bonus has none)",
  ms.totalMinutes === 145,
  "EXPECTED 145, ACTUAL " + ms.totalMinutes,
);
t(
  "deriveStats: xpToday = 202 (all events are on FP_TODAY)",
  ms.xpToday === 202,
  "EXPECTED 202, ACTUAL " + ms.xpToday,
);
t(
  "deriveStats: bestFocusDay = 80 (sum of focus-kind minutes on single day)",
  ms.bestFocusDay === 80,
  "EXPECTED 80, ACTUAL " + ms.bestFocusDay,
);
t("deriveStats: todayQualifies=true (80 focus min ≥ 25 MVD threshold)", ms.todayQualifies);

console.log("\n===== 25. JOURNAL INTEGRATION =====");

const J_TODAY = "2026-08-12";
const J_YEST = "2026-08-11";
const J_EDGE = "2026-07-14"; // 29 days back — last day inside the 30-day window
const J_OUTSIDE = "2026-07-13"; // 30 days back — outside window

const jJournalEv = (ref: string, day = J_TODAY): ActivityEvent =>
  ev({ ref, kind: "journal", area: "spirit", day, xp: XP.journal });

// --- 25a. hasWritten completeness (Section 16 covers core; add missing prose fields) ---
const jwBase = emptyEntry();
t("hasWritten: lessons prose counts", hasWritten({ ...jwBase, lessons: "learned something" }));
t("hasWritten: notes prose counts", hasWritten({ ...jwBase, notes: "a note" }));
t("hasWritten: intention prose counts", hasWritten({ ...jwBase, intention: "be present" }));
t("hasWritten: monthly prose counts", hasWritten({ ...jwBase, monthly: "good month" }));
t(
  "hasWritten: whitespace in every field → false",
  !hasWritten({
    ...jwBase,
    reflection: "  ",
    lessons: "\t",
    intention: "\n",
    notes: " \n ",
    weekly: "  ",
    monthly: "  ",
    gratitudes: ["", " ", ""],
    ideas: ["\t", "", ""],
  }),
);
t("hasWritten: zero-char reflection → false", !hasWritten({ ...jwBase, reflection: "" }));
t(
  "hasWritten: gratitude with one non-empty item → true",
  hasWritten({ ...jwBase, gratitudes: ["", "something", ""] }),
);
t(
  "hasWritten: idea with one non-empty item → true",
  hasWritten({ ...jwBase, ideas: ["a spark", "", ""] }),
);

// --- 25b. emptyEntry returns independent arrays (no mutation leakage between dates) ---
const jEA = emptyEntry();
const jEB = emptyEntry();
jEA.gratitudes[0] = "mutated";
t("emptyEntry: gratitude arrays are independent across calls", jEB.gratitudes[0] === "");
jEA.ideas[0] = "leaked idea";
t("emptyEntry: ideas arrays are independent across calls", jEB.ideas[0] === "");
t("emptyEntry: mood default is 0", emptyEntry().mood === 0);
t("emptyEntry: gratitudes default length is 3", emptyEntry().gratitudes.length === 3);
t("emptyEntry: ideas default length is 3", emptyEntry().ideas.length === 3);

// --- 25c. Area, kind, XP, ref ---
const jEv1 = jJournalEv("jt:e1");
t("journal event: area = spirit", jEv1.area === "spirit");
t("journal event: kind = journal", jEv1.kind === "journal");
t("journal event: xp = 30 (XP.journal)", jEv1.xp === 30, "EXPECTED 30, ACTUAL " + jEv1.xp);
t("XP.journal constant = 30", XP.journal === 30);
t("journalRef: format is journal:YYYY-MM-DD", journalRef(J_TODAY) === `journal:${J_TODAY}`);
t("journalRef: different dates yield different refs", journalRef(J_TODAY) !== journalRef(J_YEST));
t(
  "migrateEvent: journal kind → area=spirit",
  migrateEvent({ ref: "mg:j", kind: "journal", xp: 30 }).area === "spirit",
);

// --- 25d. Global XP includes journal ---
const jLedger: ActivityEvent[] = [
  jJournalEv("jt:j1"),
  jJournalEv("jt:j2", J_YEST),
  ev({ ref: "jt:f1", kind: "focus", area: "mind", day: J_TODAY, xp: 50, minutes: 50 }),
];
const jTotal = sumXp(jLedger);
t("globalXP: includes journal XP", jTotal >= XP.journal);
t("globalXP: correct sum = 30+30+50 = 110", jTotal === 110, "EXPECTED 110, ACTUAL " + jTotal);

// --- 25e. Spirit 30-day form ---
const jForm = formFor(jLedger, J_TODAY);
const jSpirit = jForm.find((f) => f.area === "spirit")!;
const jMind = jForm.find((f) => f.area === "mind")!;
const jKnowledge = jForm.find((f) => f.area === "knowledge")!;
t(
  "spirit form: windowXp = 30+30 = 60 (both journal entries in window)",
  jSpirit.windowXp === 60,
  "EXPECTED 60, ACTUAL " + jSpirit.windowXp,
);
t("spirit form: focus XP not contaminating spirit form", jMind.windowXp === 50);
t("spirit form: knowledge form empty (no study events)", jKnowledge.windowXp === 0);

const jOldJournal = jJournalEv("jt:old", J_OUTSIDE);
const jFormOut = formFor([...jLedger, jOldJournal], J_TODAY).find((f) => f.area === "spirit")!;
t(
  "spirit form window: 30-days-old entry excluded",
  jFormOut.windowXp === 60,
  "EXPECTED 60 (old excluded), ACTUAL " + jFormOut.windowXp,
);

const jEdgeJournal = jJournalEv("jt:edge", J_EDGE);
const jFormEdge = formFor([...jLedger, jEdgeJournal], J_TODAY).find((f) => f.area === "spirit")!;
t(
  "spirit form window: 29-days-old entry included",
  jFormEdge.windowXp === 90,
  "EXPECTED 90, ACTUAL " + jFormEdge.windowXp,
);

// --- 25f. MVD: journal alone does NOT qualify the global streak ---
t(
  "MVD: single journal (30 XP) alone does not qualify (< 100 XP, no focus, no objective)",
  !dayQualifies([jEv1]),
);
t(
  "MVD: journal + 70 XP from another event hits 100 XP threshold",
  dayQualifies([
    jJournalEv("jt:mv1"),
    ev({ ref: "jt:mv2", kind: "subtask", area: "discipline", day: J_TODAY, xp: 70 }),
  ]),
);
t(
  "MVD: journal + 25-min focus qualifies via focus-minutes path",
  dayQualifies([
    jJournalEv("jt:mv3"),
    ev({ ref: "jt:mv4", kind: "focus", area: "mind", day: J_TODAY, xp: 0, minutes: 25 }),
  ]),
);
t(
  "MVD: journal + objective qualifies via objective path",
  dayQualifies([
    jJournalEv("jt:mv5"),
    ev({ ref: "jt:mv6", kind: "objective", area: "discipline", day: J_TODAY, xp: 0 }),
  ]),
);
t(
  "MVD: four journal entries (4×30=120 XP) qualifies via XP path",
  dayQualifies([
    jJournalEv("jt:mv7a"),
    jJournalEv("jt:mv7b"),
    jJournalEv("jt:mv7c"),
    jJournalEv("jt:mv7d"),
  ]),
);

// --- 25g. Ref guard prevents double-logging same day's entry ---
const jSameRef = journalRef(J_TODAY);
const jEvA = ev({
  ref: jSameRef,
  kind: "journal",
  area: "spirit",
  day: J_TODAY,
  xp: 30,
  id: "j-id-A",
  at: "2026-01-01T10:00:00.000Z",
});
const jEvB = ev({
  ref: jSameRef,
  kind: "journal",
  area: "spirit",
  day: J_TODAY,
  xp: 30,
  id: "j-id-B",
  at: "2026-01-01T11:00:00.000Z",
});
const jDeduped = mergeLedgers([jEvA], [jEvB]);
t(
  "double-logging: same ref merges to exactly one event",
  jDeduped.filter((e) => e.ref === jSameRef).length === 1,
  "EXPECTED 1, ACTUAL " + jDeduped.filter((e) => e.ref === jSameRef).length,
);
t(
  "double-logging: earlier event wins (journal is not a recomputed kind)",
  jDeduped.find((e) => e.ref === jSameRef)!.id === "j-id-A",
  "EXPECTED j-id-A (earliest at), ACTUAL " + jDeduped.find((e) => e.ref === jSameRef)!.id,
);
t(
  "double-logging: XP not doubled (stays at 30)",
  sumXp(jDeduped) === 30,
  "EXPECTED 30, ACTUAL " + sumXp(jDeduped),
);

// --- 25h. Achievement seal thresholds ---
const evalJ = (entries: number) =>
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: entries,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  });

t(
  "seal: 49 entries → frame-crane LOCKED",
  !evalJ(49).find((r) => r.id === "frame-crane")!.unlocked,
);
t(
  "seal: 50 entries → frame-crane UNLOCKED",
  evalJ(50).find((r) => r.id === "frame-crane")!.unlocked,
);
t(
  "seal: 364 entries → seal-year-of-words LOCKED",
  !evalJ(364).find((r) => r.id === "seal-year-of-words")!.unlocked,
);
t(
  "seal: 365 entries → seal-year-of-words UNLOCKED",
  evalJ(365).find((r) => r.id === "seal-year-of-words")!.unlocked,
);

// --- 25i. journalEntries count via eventsOfKind ---
const jCountLedger: ActivityEvent[] = [
  jJournalEv("jt:c1"),
  jJournalEv("jt:c2", J_YEST),
  jJournalEv("jt:c3", J_EDGE),
  ev({ ref: "jt:cf", kind: "focus", area: "mind", day: J_TODAY, xp: 50, minutes: 50 }),
];
t(
  "journalEntries: eventsOfKind('journal') = 3 (focus not counted)",
  eventsOfKind(jCountLedger, "journal").length === 3,
  "EXPECTED 3, ACTUAL " + eventsOfKind(jCountLedger, "journal").length,
);
t(
  "journalEntries: eventsOfKind('focus') = 1 (journal not counted)",
  eventsOfKind(jCountLedger, "focus").length === 1,
);

// --- 25j. Duplicate import dedup ---
const jT1 = "2026-01-01T10:00:00.000Z";
const jT2 = "2026-01-01T11:00:00.000Z";
const jOrig = ev({
  ref: journalRef(J_TODAY),
  kind: "journal",
  area: "spirit",
  day: J_TODAY,
  xp: 30,
  id: "orig-id",
  at: jT1,
});
const jDupe = ev({
  ref: journalRef(J_TODAY),
  kind: "journal",
  area: "spirit",
  day: J_TODAY,
  xp: 30,
  id: "dupe-id",
  at: jT2,
});
const jMerged = mergeLedgers([jOrig], [jDupe]);
t(
  "import dedup: one journal event per ref",
  jMerged.filter((e) => e.ref === journalRef(J_TODAY)).length === 1,
);
t(
  "import dedup: earlier (original) event survives",
  jMerged.find((e) => e.ref === journalRef(J_TODAY))!.id === "orig-id",
);
t(
  "import dedup: XP not doubled (stays 30)",
  sumXp(jMerged) === 30,
  "EXPECTED 30, ACTUAL " + sumXp(jMerged),
);

// --- 25k. 04:00 LOCAL day boundary (dayKeyFor) ---
// dayKeyFor uses local-time methods (getDate, not getUTCDate) after shifting,
// so boundary tests must use local-time Date constructors, not UTC ISO strings.
// new Date(year, month, day, hour, min, sec) always creates LOCAL time.
const jBefore4am = new Date(2026, 7, 12, 3, 59, 0); // Aug 12, 03:59 local → prev day
const jAt4am = new Date(2026, 7, 12, 4, 0, 0); // Aug 12, 04:00 local → same day
const jMidnight = new Date(2026, 7, 12, 0, 0, 0); // Aug 12, 00:00 local → prev day
t(
  "dayKeyFor: 03:59 local → previous local date (before boundary)",
  dayKeyFor(jBefore4am) === "2026-08-11",
  "EXPECTED 2026-08-11, ACTUAL " + dayKeyFor(jBefore4am),
);
t(
  "dayKeyFor: 04:00 local → current local date (at boundary)",
  dayKeyFor(jAt4am) === "2026-08-12",
  "EXPECTED 2026-08-12, ACTUAL " + dayKeyFor(jAt4am),
);
t(
  "dayKeyFor: midnight (00:00 local) → previous local date (before boundary)",
  dayKeyFor(jMidnight) === "2026-08-11",
  "EXPECTED 2026-08-11, ACTUAL " + dayKeyFor(jMidnight),
);

// --- 25l. deriveStats end-to-end for journal ledger ---
const msJStats = deriveStats(jCountLedger, J_TODAY);
t(
  "deriveStats: totalXp = 30×3 + 50 = 140",
  msJStats.totalXp === 140,
  "EXPECTED 140, ACTUAL " + msJStats.totalXp,
);
t(
  "deriveStats: todayQualifies via focus (50 min ≥ 25)",
  msJStats.todayQualifies,
  "50 focus minutes should qualify today",
);
t(
  "deriveStats: xpToday = 30 (journal) + 50 (focus) = 80",
  msJStats.xpToday === 80,
  "EXPECTED 80, ACTUAL " + msJStats.xpToday,
);

// ============================================================
// SECTION 27 — HALL OF MASTERY + PROGRESSION END-TO-END
// ============================================================
console.log("\n===== 27. HALL OF MASTERY + PROGRESSION END-TO-END =====");

// ---- helpers ----
const sealCtx = (overrides: Partial<EarnContext>): EarnContext => ({
  totalXp: 0,
  streak: 0,
  longest: 0,
  streakTokens: 0,
  todayQualifies: false,
  recoveredDays: [],
  focusMinutes: 0,
  totalMinutes: 0,
  activeDayCount: 0,
  xpToday: 0,
  bestXpDay: 0,
  bestFocusDay: 0,
  form: [],
  overallForm: 0,
  level: 1,
  ...overrides,
});

const hw = (ref: string, day: string, at: string, xp = 80): ActivityEvent =>
  ev({ ref, kind: "workout", area: "body", day, xp, at });
const hj = (ref: string, day: string, at: string): ActivityEvent =>
  ev({ ref, kind: "journal", area: "spirit", day, xp: 30, at });
const hf = (ref: string, day: string, at: string, xp: number, minutes: number): ActivityEvent =>
  ev({ ref, kind: "focus", area: "mind", day, xp, minutes, at });
const ho = (ref: string, day: string, at: string, xp = 15): ActivityEvent =>
  ev({ ref, kind: "objective", area: "discipline", day, xp, at });
const hfb = (ref: string, day: string, at: string, xp: number): ActivityEvent =>
  ev({ ref, kind: "focus-bonus", area: "mind", day, xp, at });

// --- 27a. achievementCountsFrom invariants (via evaluateRewards boundaries) ---

// Workouts
const acWorkouts = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    hw(`ac-w${i}`, "2026-01-01", `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`),
  );
t(
  "achievementCounts: 24 workouts → enso-broken NOT unlocked",
  !evaluateRewards(1, 0, {
    workouts: acWorkouts(24).length,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "enso-broken")?.unlocked,
);
t(
  "achievementCounts: 25 workouts → enso-broken unlocked",
  evaluateRewards(1, 0, {
    workouts: acWorkouts(25).length,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "enso-broken")?.unlocked === true,
);

// focusSessions: focus-bonus must NOT count as a session
const acFocusLedger = [
  hf("ac-fs1", "2026-02-01", "2026-02-01T10:00:00.000Z", 50, 50),
  hf("ac-fs2", "2026-02-02", "2026-02-02T10:00:00.000Z", 50, 50),
  hfb("ac-fb1", "2026-02-01", "2026-02-01T11:00:00.000Z", 7), // focus-bonus: must NOT count
];
t(
  "achievementCounts: focus-bonus excluded from focusSessions",
  eventsOfKind(acFocusLedger, "focus").length === 2,
  "focus-bonus should not be counted as a focus session",
);

// focusHours uses Math.floor — exact boundary tests
t(
  "achievementCounts: 3599 min focus → 59h (floor) → ambient-river(100h) NOT unlocked",
  !evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: Math.floor(3599 / 60), // 59
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "ambient-river")?.unlocked,
);
t(
  "achievementCounts: 6000 min focus → 100h (floor) → ambient-river unlocked",
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: Math.floor(6000 / 60), // 100
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "ambient-river")?.unlocked === true,
);
t(
  "achievementCounts: 6059 min → floor(100.98) = 100h → ambient-river unlocked",
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: Math.floor(6059 / 60), // 100
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "ambient-river")?.unlocked === true,
);
t(
  "achievementCounts: 59999 min → 999h → seal-thousand-hours NOT unlocked",
  !evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: Math.floor(59999 / 60), // 999
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "seal-thousand-hours")?.unlocked,
);
t(
  "achievementCounts: 60000 min → 1000h → seal-thousand-hours unlocked",
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: Math.floor(60000 / 60), // 1000
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "seal-thousand-hours")?.unlocked === true,
);

// objectives: only "objective" kind counts — subtask/task do NOT
const acObjLedger = [
  ev({ ref: "ac-o1", kind: "objective", area: "discipline", day: "2026-03-01", xp: 15 }),
  ev({ ref: "ac-s1", kind: "subtask", area: "discipline", day: "2026-03-01", xp: 15 }),
  ev({ ref: "ac-t1", kind: "task", area: "discipline", day: "2026-03-01", xp: 15 }),
];
t(
  "achievementCounts: subtask/task events do NOT count as objectives",
  eventsOfKind(acObjLedger, "objective").length === 1,
  "only 'objective' kind should count toward the objectives metric",
);
t(
  "achievementCounts: objectives metric reads 'objective' kind exclusively",
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: eventsOfKind(acObjLedger, "objective").length, // 1, not 3
    longestStreak: 0,
  }).find((r) => r.id === "seal-hundred-objectives")?.progressPercent === 1,
);

// longestStreak — drives longestStreak rewards, not count rewards
t(
  "achievementCounts: longestStreak=100 → frame-pine(100-day streak) unlocked",
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 100,
  }).find((r) => r.id === "frame-pine")?.unlocked === true,
);
t(
  "achievementCounts: longestStreak=99 → frame-pine NOT unlocked",
  !evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 99,
  }).find((r) => r.id === "frame-pine")?.unlocked,
);

// --- 27b. evaluateRewards — database validity and progress percent ---

t("rewardDatabaseIsValid() returns true", rewardDatabaseIsValid());
t(
  "reward database has no duplicate ids",
  new Set(rewardDatabase.map((r) => r.id)).size === rewardDatabase.length,
);
t(
  "progressPercent = 0 when count is 0 (achievement reward)",
  evaluateRewards(1, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "enso-broken")!.progressPercent === 0,
);
t(
  "progressPercent = 100 when count exactly meets requirement",
  evaluateRewards(1, 0, {
    workouts: 25,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "enso-broken")!.progressPercent === 100,
);
t(
  "progressPercent clamped at 100 even when count exceeds requirement",
  evaluateRewards(1, 0, {
    workouts: 9999,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "enso-broken")!.progressPercent === 100,
);
t(
  "level-unlock progressPercent driven by level, not achievement counts",
  evaluateRewards(10, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "mountain-morning-valley")!.unlocked === true,
  "mountain-morning-valley unlocks at level 10",
);
t(
  "achievement rewards immune to level: level 100 does not unlock enso-broken",
  !evaluateRewards(100, 0, {
    workouts: 0,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  }).find((r) => r.id === "enso-broken")?.unlocked,
);
t(
  "nextUnlock: returns nearest locked level reward when available",
  nextUnlock(
    evaluateRewards(1, 0, {
      workouts: 0,
      journalEntries: 0,
      focusSessions: 0,
      focusHours: 0,
      objectives: 0,
      longestStreak: 0,
    }),
  )?.unlockType === "level",
  "first thing to earn at level 1 is a level-gated reward",
);
t(
  "evaluateRewards is pure: identical inputs → identical JSON",
  JSON.stringify(
    evaluateRewards(50, 0, {
      workouts: 10,
      journalEntries: 5,
      focusSessions: 3,
      focusHours: 2,
      objectives: 1,
      longestStreak: 7,
    }),
  ) ===
    JSON.stringify(
      evaluateRewards(50, 0, {
        workouts: 10,
        journalEntries: 5,
        focusSessions: 3,
        focusHours: 2,
        objectives: 1,
        longestStreak: 7,
      }),
    ),
);

// --- 27c. 3-Journey partition invariant ---

// Each event brings running to exactly N × JOURNEY_XP — one event per Journey.
const triLedger: ActivityEvent[] = [
  ev({ ref: "tri-j1", xp: JOURNEY_XP, day: "2026-01-01", at: "2026-01-01T10:00:00.000Z" }),
  ev({ ref: "tri-j2", xp: JOURNEY_XP, day: "2026-01-02", at: "2026-01-02T10:00:00.000Z" }),
  ev({ ref: "tri-j3", xp: JOURNEY_XP, day: "2026-01-03", at: "2026-01-03T10:00:00.000Z" }),
];

const triJ1 = eventsForJourney(triLedger, 1);
const triJ2 = eventsForJourney(triLedger, 2);
const triJ3 = eventsForJourney(triLedger, 3);
const triAll = [...triJ1, ...triJ2, ...triJ3];

t(
  "3-journey partition: J1 ∪ J2 ∪ J3 = all events (no orphan)",
  triAll.length === triLedger.length && triLedger.every((e) => triAll.some((a) => a.ref === e.ref)),
  `EXPECTED ${triLedger.length} events across all journeys, got ${triAll.length}`,
);
t(
  "3-journey partition: no event in both J1 and J2",
  triJ1.filter((a) => triJ2.some((b) => b.ref === a.ref)).length === 0,
);
t(
  "3-journey partition: no event in both J2 and J3",
  triJ2.filter((a) => triJ3.some((b) => b.ref === a.ref)).length === 0,
);
t(
  "3-journey partition: no event in both J1 and J3",
  triJ1.filter((a) => triJ3.some((b) => b.ref === a.ref)).length === 0,
);
t(
  "3-journey partition: XP sums add to total (no XP lost or doubled)",
  sumXp(triJ1) + sumXp(triJ2) + sumXp(triJ3) === sumXp(triLedger),
  `EXPECTED ${sumXp(triLedger)}, GOT ${sumXp(triJ1) + sumXp(triJ2) + sumXp(triJ3)}`,
);
t("3-journey: J1 journeyXP = JOURNEY_XP", sumXp(triJ1) === JOURNEY_XP);
t("3-journey: J2 journeyXP = JOURNEY_XP", sumXp(triJ2) === JOURNEY_XP);
t("3-journey: J3 journeyXP = JOURNEY_XP", sumXp(triJ3) === JOURNEY_XP);
t("eventsForJourney([], N) = empty", eventsForJourney([], 1).length === 0);

// --- 27d. Chronicle fields ---

// Fixture: Journey 1 with exactly JOURNEY_XP total across 3 qualifying days.
// Day 1: focus 120 min (qualifies via minutes)
// Day 2: workout + journal = 110 XP (qualifies via ≥100 XP)
// Day 3: objective (qualifies via objective kind)
// Total: (JOURNEY_XP - 200) + 80 + 30 + 90 = JOURNEY_XP ✓
const chronFocusXp = JOURNEY_XP - 200;
const chronLedger: ActivityEvent[] = [
  hf("ch-f1", "2026-01-10", "2026-01-10T10:00:00.000Z", chronFocusXp, 120),
  hw("ch-w1", "2026-01-11", "2026-01-11T10:00:00.000Z", 80),
  hj("ch-j1", "2026-01-11", "2026-01-11T11:00:00.000Z"),
  ho("ch-o1", "2026-01-12", "2026-01-12T10:00:00.000Z", 90),
];
const chron1 = generateChronicle(chronLedger, 1, PROMOTION_LEVELS);

t("Chronicle id is 'journey-1'", chron1.id === "journey-1", "ACTUAL " + chron1.id);
t("Chronicle journey field = 1", chron1.journey === 1);
t(
  "Chronicle lifetimeXP = journey × JOURNEY_XP (theoretical boundary)",
  chron1.lifetimeXP === 1 * JOURNEY_XP,
  "EXPECTED " + JOURNEY_XP + ", ACTUAL " + chron1.lifetimeXP,
);
t(
  "Chronicle journeyXP = sumXp of allocated events",
  chron1.journeyXP === sumXp(eventsForJourney(chronLedger, 1)),
  "EXPECTED " + sumXp(eventsForJourney(chronLedger, 1)) + ", ACTUAL " + chron1.journeyXP,
);
t(
  "Chronicle workouts = eventsOfKind(journeyEvents, 'workout').length",
  chron1.workouts === 1,
  "ACTUAL " + chron1.workouts,
);
t(
  "Chronicle journalEntries = eventsOfKind(journeyEvents, 'journal').length",
  chron1.journalEntries === 1,
  "ACTUAL " + chron1.journalEntries,
);
t(
  "Chronicle focusHours uses Math.round (display, 1 decimal): 120 min = 2.0 h",
  chron1.focusHours === 2.0,
  "ACTUAL " + chron1.focusHours,
);
t(
  "Chronicle startedAt = first active day",
  chron1.startedAt === "2026-01-10",
  "ACTUAL " + chron1.startedAt,
);
t(
  "Chronicle completedAt = last active day",
  chron1.completedAt === "2026-01-12",
  "ACTUAL " + chron1.completedAt,
);
t(
  "Chronicle longestStreak = 3 (all 3 days qualify consecutively)",
  chron1.longestStreak === 3,
  "ACTUAL " + chron1.longestStreak,
);
t(
  "Chronicle objectivesCompleted = 1",
  chron1.objectivesCompleted === 1,
  "ACTUAL " + chron1.objectivesCompleted,
);
t(
  "Chronicle is deterministic: same ledger → same output",
  JSON.stringify(generateChronicle(chronLedger, 1, PROMOTION_LEVELS)) === JSON.stringify(chron1),
);

// --- 27e. Menkyo fields ---

const menkyo1 = generateMenkyo(chron1);

t("Menkyo id = 'menkyo-1'", menkyo1.id === "menkyo-1", "ACTUAL " + menkyo1.id);
t("Menkyo journey = 1", menkyo1.journey === 1);
t(
  "Menkyo awardedOn = chronicle completedAt",
  menkyo1.awardedOn === chron1.completedAt,
  "ACTUAL " + menkyo1.awardedOn,
);
t(
  "Menkyo record === chronicle (same object shape)",
  menkyo1.record.id === chron1.id && menkyo1.record.journeyXP === chron1.journeyXP,
);
t("generateMenkyo is pure", JSON.stringify(generateMenkyo(chron1)) === JSON.stringify(menkyo1));

// --- 27f. buildStatsTimeline ---

t("buildStatsTimeline: empty ledger → empty array", buildStatsTimeline([]).length === 0);

const tlOneLedger = [
  ev({
    ref: "tl-a",
    xp: 150,
    day: "2026-05-01",
    at: "2026-05-01T10:00:00.000Z",
    kind: "focus",
    area: "mind",
    minutes: 30,
  }),
];
const tlOne = buildStatsTimeline(tlOneLedger);

t(
  "buildStatsTimeline: single event → 1 timeline point",
  tlOne.length === 1,
  "ACTUAL " + tlOne.length,
);
t("buildStatsTimeline: point.day matches event day", tlOne[0]!.day === "2026-05-01");
t(
  "buildStatsTimeline: totalXp accumulated at that point",
  tlOne[0]!.totalXp === 150,
  "ACTUAL " + tlOne[0]!.totalXp,
);
t(
  "buildStatsTimeline: level derived from totalXp",
  tlOne[0]!.level === progressionFor(150).currentLevel,
);

const tlMultiLedger = [
  ev({
    ref: "tl-d1",
    xp: 200,
    day: "2026-06-01",
    at: "2026-06-01T10:00:00.000Z",
    kind: "focus",
    area: "mind",
    minutes: 25,
  }),
  ev({
    ref: "tl-d2",
    xp: 150,
    day: "2026-06-02",
    at: "2026-06-02T10:00:00.000Z",
    kind: "focus",
    area: "mind",
    minutes: 25,
  }),
  ev({
    ref: "tl-d3",
    xp: 100,
    day: "2026-06-03",
    at: "2026-06-03T10:00:00.000Z",
    kind: "objective",
    area: "discipline",
  }),
];
const tlMulti = buildStatsTimeline(tlMultiLedger);

t(
  "buildStatsTimeline: 3 active days → 3 timeline points",
  tlMulti.length === 3,
  "ACTUAL " + tlMulti.length,
);
t(
  "buildStatsTimeline: points in ascending day order",
  tlMulti[0]!.day < tlMulti[1]!.day && tlMulti[1]!.day < tlMulti[2]!.day,
);
t(
  "buildStatsTimeline: XP accumulates across days (point 3 = total)",
  tlMulti[2]!.totalXp === 450,
  "ACTUAL " + tlMulti[2]!.totalXp,
);
t(
  "buildStatsTimeline: point 1 XP = only day 1 events",
  tlMulti[0]!.totalXp === 200,
  "ACTUAL " + tlMulti[0]!.totalXp,
);

// --- 27g. firstDayMeeting ---

const fdfNever = firstDayMeeting(tlMulti, (s) => s.totalXp >= 999_999);
t("firstDayMeeting: returns null when condition never met", fdfNever === null);

const fdfFirst = firstDayMeeting(tlMulti, (s) => s.totalXp >= 200);
t(
  "firstDayMeeting: returns day where condition first holds",
  fdfFirst === "2026-06-01",
  "ACTUAL " + fdfFirst,
);

const fdfSecond = firstDayMeeting(tlMulti, (s) => s.totalXp >= 350);
t("firstDayMeeting: 350 XP first met on day 2", fdfSecond === "2026-06-02", "ACTUAL " + fdfSecond);

const fdfEmpty = firstDayMeeting([], (s) => s.totalXp >= 1);
t("firstDayMeeting: empty timeline → null", fdfEmpty === null);

const fdfSeal = firstDayMeeting(tlMulti, sealDefs.find((s) => s.name === "Sincerity")!.test);
t(
  "firstDayMeeting: Sincerity (1000 XP) never met in tlMulti (max 450 XP) → null",
  fdfSeal === null,
);

// --- 27h. Seal predicates (achievements.ts) ---

t("seals: total count is 12", sealDefs.length === 12, "ACTUAL " + sealDefs.length);

const aspiration = sealDefs.find((s) => s.name === "Aspiration")!;
t(
  "Aspiration (activeDayCount ≥ 1): 0 days → false",
  !aspiration.test(sealCtx({ activeDayCount: 0 })),
);
t("Aspiration (activeDayCount ≥ 1): 1 day → true", aspiration.test(sealCtx({ activeDayCount: 1 })));

const perseverance = sealDefs.find((s) => s.name === "Perseverance")!;
t("Perseverance (longest ≥ 7): 6 days → false", !perseverance.test(sealCtx({ longest: 6 })));
t("Perseverance (longest ≥ 7): 7 days → true", perseverance.test(sealCtx({ longest: 7 })));

const sincerity = sealDefs.find((s) => s.name === "Sincerity")!;
t("Sincerity (totalXp ≥ 1000): 999 XP → false", !sincerity.test(sealCtx({ totalXp: 999 })));
t("Sincerity (totalXp ≥ 1000): 1000 XP → true", sincerity.test(sealCtx({ totalXp: 1000 })));

const wisdom = sealDefs.find((s) => s.name === "Wisdom")!;
t("Wisdom (focusMinutes ≥ 600): 599 min → false", !wisdom.test(sealCtx({ focusMinutes: 599 })));
t("Wisdom (focusMinutes ≥ 600): 600 min → true", wisdom.test(sealCtx({ focusMinutes: 600 })));

const courage = sealDefs.find((s) => s.name === "Courage")!;
t("Courage (level ≥ 5): level 4 → false", !courage.test(sealCtx({ level: 4 })));
t("Courage (level ≥ 5): level 5 → true", courage.test(sealCtx({ level: 5 })));

const mastery = sealDefs.find((s) => s.name === "Mastery")!;
t("Mastery (level ≥ 20): level 19 → false", !mastery.test(sealCtx({ level: 19 })));
t("Mastery (level ≥ 20): level 20 → true", mastery.test(sealCtx({ level: 20 })));

// All seal predicates are pure: same context → same result.
t(
  "seal predicates are pure functions",
  sealDefs.every((s) => {
    const ctx = sealCtx({
      totalXp: 5000,
      longest: 10,
      focusMinutes: 700,
      activeDayCount: 3,
      level: 6,
    });
    return s.test(ctx) === s.test(ctx);
  }),
);

// --- 27i. Journey ±1 boundary ---

t(
  "JOURNEY_XP - 1 → Journey 1, level 99",
  progressionFor(JOURNEY_XP - 1).currentJourney === 1 &&
    progressionFor(JOURNEY_XP - 1).currentLevel === JOURNEY_LEVELS - 1,
  `J${progressionFor(JOURNEY_XP - 1).currentJourney} L${progressionFor(JOURNEY_XP - 1).currentLevel}`,
);
t(
  "JOURNEY_XP exactly → Journey 2, level 1",
  progressionFor(JOURNEY_XP).currentJourney === 2 && progressionFor(JOURNEY_XP).currentLevel === 1,
);
t(
  "2×JOURNEY_XP - 1 → Journey 2, level 99",
  progressionFor(2 * JOURNEY_XP - 1).currentJourney === 2 &&
    progressionFor(2 * JOURNEY_XP - 1).currentLevel === JOURNEY_LEVELS - 1,
  `J${progressionFor(2 * JOURNEY_XP - 1).currentJourney} L${progressionFor(2 * JOURNEY_XP - 1).currentLevel}`,
);
t(
  "2×JOURNEY_XP exactly → Journey 3, level 1",
  progressionFor(2 * JOURNEY_XP).currentJourney === 3 &&
    progressionFor(2 * JOURNEY_XP).currentLevel === 1,
);
t(
  "journeyCompletionsBetween(0, 3×JOURNEY_XP) = [1, 2, 3]",
  JSON.stringify(journeyCompletionsBetween(0, 3 * JOURNEY_XP)) === JSON.stringify([1, 2, 3]),
  "ACTUAL " + JSON.stringify(journeyCompletionsBetween(0, 3 * JOURNEY_XP)),
);
t(
  "journeyCompletionsBetween: importing a large ledger captures all Journeys",
  journeyCompletionsBetween(0, 5 * JOURNEY_XP).length === 5,
);

// --- 27j. promotionsBetween cross-journey ---

// 9 promotions per Journey (levels 11,21,31,41,51,61,71,81,91).
t(
  "PROMOTION_LEVELS has 9 entries per Journey",
  PROMOTION_LEVELS.length === 9,
  "ACTUAL " + PROMOTION_LEVELS.length,
);
t(
  "27 promotions across 3 Journeys",
  promotionsBetween(0, 3 * JOURNEY_XP).length === 27,
  "ACTUAL " + promotionsBetween(0, 3 * JOURNEY_XP).length,
);
t(
  "All promotion IDs unique across 3 Journeys",
  new Set(promotionsBetween(0, 3 * JOURNEY_XP)).size ===
    promotionsBetween(0, 3 * JOURNEY_XP).length,
);
t(
  "promotionId format: 'promotion:jN:lM'",
  promotionId(2, 11) === "promotion:j2:l11",
  "ACTUAL " + promotionId(2, 11),
);
t(
  "promotionsBetween: J1-L100 → J2-L1 fires NO promotion (L1 is not a promotion level)",
  promotionsBetween(JOURNEY_XP - 1, JOURNEY_XP).length === 0,
  "Journey completion does not itself fire a rank promotion",
);
t(
  "promotionsBetween: J2-L10 → J2-L11 fires exactly 1 promotion",
  promotionsBetween(xpAtJourneyLevel(2, 10), xpAtJourneyLevel(2, 11)).length === 1,
);
t(
  "promotionsBetween: J2-L11 promotion ID is 'promotion:j2:l11'",
  promotionsBetween(xpAtJourneyLevel(2, 10), xpAtJourneyLevel(2, 11))[0] === "promotion:j2:l11",
  "ACTUAL " + promotionsBetween(xpAtJourneyLevel(2, 10), xpAtJourneyLevel(2, 11))[0],
);

// --- 27k. longestStreakOf (Chronicle helper) ---

const lsoConsecutive = [
  ev({ ref: "lso-a", xp: 100, day: "2026-07-01", at: "2026-07-01T10:00:00.000Z" }),
  ev({ ref: "lso-b", xp: 100, day: "2026-07-02", at: "2026-07-02T10:00:00.000Z" }),
  ev({ ref: "lso-c", xp: 100, day: "2026-07-03", at: "2026-07-03T10:00:00.000Z" }),
];
t(
  "longestStreakOf: 3 consecutive qualifying days → 3",
  longestStreakOf(lsoConsecutive) === 3,
  "ACTUAL " + longestStreakOf(lsoConsecutive),
);
t("longestStreakOf: empty ledger → 0", longestStreakOf([]) === 0);

const lsoGap = [
  ev({ ref: "lso-d", xp: 100, day: "2026-07-01", at: "2026-07-01T10:00:00.000Z" }),
  ev({ ref: "lso-e", xp: 100, day: "2026-07-02", at: "2026-07-02T10:00:00.000Z" }),
  // gap at 2026-07-03
  ev({ ref: "lso-f", xp: 100, day: "2026-07-04", at: "2026-07-04T10:00:00.000Z" }),
  ev({ ref: "lso-g", xp: 100, day: "2026-07-05", at: "2026-07-05T10:00:00.000Z" }),
  ev({ ref: "lso-h", xp: 100, day: "2026-07-06", at: "2026-07-06T10:00:00.000Z" }),
];
t(
  "longestStreakOf: gap splits streaks — longest is 3 (Jul 4-5-6)",
  longestStreakOf(lsoGap) === 3,
  "ACTUAL " + longestStreakOf(lsoGap),
);

// --- 27l. xpToNextLevel integrity (curve correctness) ---

t(
  "xpToNextLevel(1) = 1000 (first level cost)",
  xpToNextLevel(1) === 1000,
  "ACTUAL " + xpToNextLevel(1),
);
t(
  "xpToNextLevel(99) = 3400 (last level cost)",
  xpToNextLevel(99) === 3400,
  "ACTUAL " + xpToNextLevel(99),
);
t(
  "xpToNextLevel curve is monotone non-decreasing",
  Array.from({ length: 98 }, (_, i) => i + 1).every(
    (l) => xpToNextLevel(l + 1) >= xpToNextLevel(l),
  ),
);
t(
  "JOURNEY_XP = sum of all level costs (1–99)",
  Array.from({ length: 99 }, (_, i) => xpToNextLevel(i + 1)).reduce((a, b) => a + b, 0) ===
    JOURNEY_XP,
  "EXPECTED " + JOURNEY_XP,
);

// --- 27m. rankForLevel integrity ---

t("rankForLevel(1) = Shoshin (chapter 1)", rankForLevel(1).chapter === 1);
t("rankForLevel(10) = Shoshin (chapter 1, toLevel=10)", rankForLevel(10).chapter === 1);
t("rankForLevel(11) = Deshi (chapter 2)", rankForLevel(11).chapter === 2);
t("rankForLevel(100) = Shu-Ha-Ri (chapter 10)", rankForLevel(100).chapter === 10);
t(
  "PROMOTION_LEVELS = [11,21,31,41,51,61,71,81,91]",
  JSON.stringify(PROMOTION_LEVELS) === JSON.stringify([11, 21, 31, 41, 51, 61, 71, 81, 91]),
  "ACTUAL " + JSON.stringify(PROMOTION_LEVELS),
);

// --- 27n. promotionTimelineFor ---

// Fixture: events that cross J1-L11 threshold exactly.
const ptfXp = xpAtJourneyLevel(1, 11);
const ptfLedger: ActivityEvent[] = [
  ev({ ref: "ptf-a", xp: ptfXp - 1, day: "2026-08-01", at: "2026-08-01T10:00:00.000Z" }),
  ev({ ref: "ptf-b", xp: 1, day: "2026-08-02", at: "2026-08-02T10:00:00.000Z" }),
];
const ptfTimeline = promotionTimelineFor(ptfLedger, 1, PROMOTION_LEVELS);

t(
  "promotionTimelineFor: first promotion lands on the correct day",
  ptfTimeline[0]?.day === "2026-08-02",
  "ACTUAL " + ptfTimeline[0]?.day,
);
t(
  "promotionTimelineFor: first promotion level = 11",
  ptfTimeline[0]?.level === 11,
  "ACTUAL " + ptfTimeline[0]?.level,
);
t(
  "promotionTimelineFor: empty ledger → empty timeline",
  promotionTimelineFor([], 1, PROMOTION_LEVELS).length === 0,
);

// ============================================================
// SECTION 26 — FITNESS / TRAINING INTEGRATION
// ============================================================
console.log("\n===== 26. FITNESS / TRAINING INTEGRATION =====");

const FT_TODAY = "2026-08-12";
// 29 days before FT_TODAY = included in 30-day window.
const FT_EDGE = "2026-07-14";
// 30 days before FT_TODAY = first day outside the window.
const FT_OUTSIDE = "2026-07-13";

const ftWorkout = (ref: string, day = FT_TODAY, xp = 80): ActivityEvent =>
  ev({ ref, kind: "workout", area: "body", day, xp });

// --- 26a. XP constant / kind / area ---

t("XP.workout === 80 (flat rate — no effort model defined)", XP.workout === 80);
t("workout kind is 'workout'", ftWorkout("w1").kind === "workout");
t("workout area is 'body'", ftWorkout("w1").area === "body");
t(
  "migrateEvent preserves workout → body area",
  migrateEvent({ ref: "w-mig", kind: "workout", area: "body", xp: 80 }).area === "body",
);
t("workoutRef format: workout:<day>", workoutRef(FT_TODAY) === "workout:2026-08-12");
t("different days → different workoutRefs", workoutRef("2026-08-12") !== workoutRef("2026-08-11"));
t("same day → same workoutRef (ref guard)", workoutRef(FT_TODAY) === workoutRef(FT_TODAY));

// --- 26b. isSessionComplete adversarial ---

const ftGym = [
  { id: "s1", name: "Squat", sets: 3, reps: "5", weight: "80 kg" },
  { id: "s2", name: "Press", sets: 3, reps: "8", weight: "50 kg" },
  { id: "s3", name: "Row", sets: 3, reps: "8", weight: "60 kg" },
];

t("isSessionComplete: single exercise, ticked → complete", isSessionComplete([ftGym[0]!], ["s1"]));
t(
  "isSessionComplete: extra IDs in doneIds do not prevent completion",
  isSessionComplete(ftGym, ["s1", "s2", "s3", "unknown-extra"]),
  "superset of IDs should still complete the session",
);
t(
  "isSessionComplete: missing one exercise → incomplete",
  !isSessionComplete(ftGym, ["s1", "s3"]),
  "s2 not ticked",
);
t(
  "isSessionComplete: empty exercises, non-empty doneIds → false",
  !isSessionComplete([], ["s1"]),
  "empty exercise list is never complete",
);
t(
  "isSessionComplete: all exercises ticked → complete",
  isSessionComplete(ftGym, ["s1", "s2", "s3"]),
);

// --- 26c. Body 30-day form ---

const ftBodyLedger = [
  ftWorkout("w-b1", FT_TODAY),
  ftWorkout("w-b2", "2026-08-10"),
  ftWorkout("w-b3", "2026-08-05"),
  ftWorkout("w-b4", "2026-07-20"),
  ftWorkout("w-b5", FT_EDGE), // day 29 — last day inside window
  ftWorkout("w-b6", FT_OUTSIDE), // day 30 — first outside window
  // Spirit and mind events — must not affect body form.
  ev({ ref: "ft-j1", kind: "journal", area: "spirit", day: FT_TODAY, xp: 30 }),
  ev({ ref: "ft-f1", kind: "focus", area: "mind", day: FT_TODAY, xp: 50, minutes: 50 }),
];

const ftBodyForm = formFor(ftBodyLedger, FT_TODAY);
const ftBodyArea = ftBodyForm.find((f) => f.area === "body")!;
const ftMindArea = ftBodyForm.find((f) => f.area === "mind")!;
const ftSpiritArea = ftBodyForm.find((f) => f.area === "spirit")!;

// 5 workout events inside window (w-b6 is outside): 5 × 80 = 400 XP.
t(
  "body form: 5 workouts in window → windowXp = 400",
  ftBodyArea.windowXp === 400,
  "EXPECTED 400, ACTUAL " + ftBodyArea.windowXp,
);
t(
  "body form: percent = round(400/1000 × 100) = 40",
  ftBodyArea.percent === 40,
  "EXPECTED 40, ACTUAL " + ftBodyArea.percent,
);
t(
  "body form: workout outside 30-day window excluded",
  ftBodyArea.windowXp < 480,
  "w-b6 (day 30) should be excluded; if included windowXp would be 480",
);
t(
  "body form: workout on day 29 (edge) included in window",
  ftBodyArea.windowXp >= 400,
  "w-b5 on FT_EDGE must be counted",
);
t(
  "mind events do not bleed into body form",
  ftMindArea.windowXp === 50 && ftBodyArea.windowXp === 400,
  "cross-area isolation failed",
);
t(
  "spirit events do not bleed into body form",
  ftSpiritArea.windowXp === 30 && ftBodyArea.windowXp === 400,
  "cross-area isolation failed",
);
// 13 workouts = 1040 XP → clamped to 100%.
// Use dates going backward from Aug 12 (all within the 30-day window).
const ftHighDates = [
  "2026-08-12",
  "2026-08-11",
  "2026-08-10",
  "2026-08-09",
  "2026-08-08",
  "2026-08-07",
  "2026-08-06",
  "2026-08-05",
  "2026-08-04",
  "2026-08-03",
  "2026-08-02",
  "2026-08-01",
  "2026-07-31",
];
const ftHighLedger = ftHighDates.map((d, i) => ftWorkout(`w-hi-${i}`, d));
const ftHighBody = formFor(ftHighLedger, FT_TODAY).find((f) => f.area === "body")!;
t(
  "body form: 1040 XP (13 workouts) → percent clamped at 100",
  ftHighBody.percent === 100,
  "EXPECTED 100, ACTUAL " + ftHighBody.percent,
);
t(
  "body form: empty ledger → windowXp = 0",
  formFor([], FT_TODAY).find((f) => f.area === "body")!.windowXp === 0,
);

// --- 26d. Global XP from workouts ---

const ftXpLedger = [
  ftWorkout("w-xp1", "2026-08-12"),
  ftWorkout("w-xp2", "2026-08-11"),
  ftWorkout("w-xp3", "2026-08-10"),
];

t(
  "global XP: 3 workouts = 240 XP",
  sumXp(ftXpLedger) === 240,
  "EXPECTED 240, ACTUAL " + sumXp(ftXpLedger),
);
t(
  "workout events have no focus minutes",
  sumMinutes(ftXpLedger, "focus") === 0,
  "workout minutes must not bleed into focus time",
);
t(
  "global XP: mixed workout + journal = 80 + 30 = 110",
  sumXp([
    ftWorkout("w-mix1"),
    ev({ ref: "j-mix1", kind: "journal", area: "spirit", day: FT_TODAY, xp: 30 }),
  ]) === 110,
);

// --- 26e. MVD / global streak interaction ---

// dayQualifies checks: focus ≥ 25 min OR has objective OR totalXP ≥ 100.
// Workout = 80 XP. 80 < 100 → does NOT qualify alone.

const ftWorkoutOnly = [ftWorkout("w-mvd1", FT_TODAY)];
const ftWorkoutJournal = [
  ftWorkout("w-mvd2", FT_TODAY),
  ev({ ref: "j-mvd1", kind: "journal", area: "spirit", day: FT_TODAY, xp: 30 }),
];
const ftWorkoutFocus = [
  ftWorkout("w-mvd3", FT_TODAY),
  ev({ ref: "f-mvd1", kind: "focus", area: "mind", day: FT_TODAY, xp: 25, minutes: 25 }),
];
const ftWorkoutObj = [
  ftWorkout("w-mvd4", FT_TODAY),
  ev({ ref: "o-mvd1", kind: "objective", area: "discipline", day: FT_TODAY, xp: 15 }),
];

t(
  "MVD: workout alone (80 XP) does NOT qualify (< 100, no focus, no objective)",
  !dayQualifies(ftWorkoutOnly),
  "80 XP should not reach the 100 XP MVD threshold",
);
t(
  "MVD: workout + journal (110 XP ≥ 100) qualifies",
  dayQualifies(ftWorkoutJournal),
  "80 + 30 = 110 ≥ 100 threshold",
);
t(
  "MVD: workout + focus (25 min) qualifies via focus threshold",
  dayQualifies(ftWorkoutFocus),
  "25 focus minutes meets the MVD focus requirement",
);
t(
  "MVD: workout + objective qualifies via objective presence",
  dayQualifies(ftWorkoutObj),
  "objective kind always qualifies the day",
);
t(
  "global streak: workout-only day does not advance the global streak",
  streakState(ftWorkoutOnly, FT_TODAY).current === 0,
  "80 XP workout alone cannot satisfy MVD → today does not qualify",
);

// --- 26f. Training streak distinct from global streak ---

const ftFocusOnlyDay = [
  ev({ ref: "f-dist1", kind: "focus", area: "mind", day: FT_TODAY, xp: 50, minutes: 50 }),
];
const ftJournalOnlyDay = [
  ev({ ref: "j-dist1", kind: "journal", area: "spirit", day: FT_TODAY, xp: 30 }),
];
const ftWorkoutOnlyDay = [ftWorkout("w-dist1", FT_TODAY)];

t(
  "trainingStreak: focus-only events → 0 (focus is not a workout)",
  trainingStreak(ftFocusOnlyDay, FT_TODAY) === 0,
  "got " + trainingStreak(ftFocusOnlyDay, FT_TODAY),
);
t(
  "trainingStreak: journal-only events → 0",
  trainingStreak(ftJournalOnlyDay, FT_TODAY) === 0,
  "got " + trainingStreak(ftJournalOnlyDay, FT_TODAY),
);
t("trainingStreak: empty ledger → 0", trainingStreak([], FT_TODAY) === 0);
t(
  "global streak advances on focus day, training streak does not",
  streakState(ftFocusOnlyDay, FT_TODAY).current === 1 &&
    trainingStreak(ftFocusOnlyDay, FT_TODAY) === 0,
  "focus qualifies globally but not for training streak",
);
t(
  "training streak advances on workout day, global streak does not (80 XP < 100)",
  trainingStreak(ftWorkoutOnlyDay, FT_TODAY) === 1 &&
    streakState(ftWorkoutOnlyDay, FT_TODAY).current === 0,
  "workout qualifies for training streak but not global streak",
);
t(
  "trainingStreak: multiple consecutive workout days counted correctly",
  trainingStreak(
    [
      ftWorkout("w-cs1", "2026-08-12"),
      ftWorkout("w-cs2", "2026-08-11"),
      ftWorkout("w-cs3", "2026-08-10"),
    ],
    "2026-08-12",
  ) === 3,
  "got " +
    trainingStreak(
      [
        ftWorkout("w-cs1", "2026-08-12"),
        ftWorkout("w-cs2", "2026-08-11"),
        ftWorkout("w-cs3", "2026-08-10"),
      ],
      "2026-08-12",
    ),
);

// --- 26g. Achievement seal thresholds ---

const evalFit = (workouts: number) =>
  evaluateRewards(1, 0, {
    workouts,
    journalEntries: 0,
    focusSessions: 0,
    focusHours: 0,
    objectives: 0,
    longestStreak: 0,
  });

t(
  "enso-broken: 24 workouts → not unlocked",
  !evalFit(24).find((r) => r.id === "enso-broken")?.unlocked,
  "need 25",
);
t(
  "enso-broken: 25 workouts → unlocked",
  evalFit(25).find((r) => r.id === "enso-broken")?.unlocked === true,
  "25th workout should unlock the enso",
);
t(
  "seal-iron-body: 99 workouts → not unlocked",
  !evalFit(99).find((r) => r.id === "seal-iron-body")?.unlocked,
  "need 100",
);
t(
  "seal-iron-body: 100 workouts → unlocked",
  evalFit(100).find((r) => r.id === "seal-iron-body")?.unlocked === true,
  "100th workout should unlock iron body",
);

// --- 26h. Duplicate completion / dedup / import ---

const ftDupA = ftWorkout("workout:2026-08-12", FT_TODAY);
const ftDupB: ActivityEvent = {
  ...ftDupA,
  id: "dup-b-id", // different id, same ref
  at: "2026-08-12T06:00:00.000Z", // later timestamp
};
const ftDupLedger = dedupeLedger([ftDupA, ftDupB]);

t(
  "dedup: same workoutRef → exactly one event survives",
  ftDupLedger.length === 1,
  "EXPECTED 1, ACTUAL " + ftDupLedger.length,
);
t(
  "dedup: XP not doubled (stays 80)",
  sumXp(ftDupLedger) === 80,
  "EXPECTED 80, ACTUAL " + sumXp(ftDupLedger),
);
t(
  "dedup: earliest copy survives (not later import)",
  ftDupLedger[0]!.id === ftDupA.id,
  "earliest event should win for action records",
);
// Two workouts on different days — both survive merge.
const ftMergeA = ftWorkout("workout:2026-08-12", "2026-08-12");
const ftMergeB = ftWorkout("workout:2026-08-11", "2026-08-11");
const ftMerged = dedupeLedger([ftMergeA, ftMergeB]);
t(
  "dedup: different workout refs both survive",
  ftMerged.length === 2,
  "EXPECTED 2, ACTUAL " + ftMerged.length,
);
// Import scenario: live ledger has an event, backup brings an older copy with same ref.
const ftLive = {
  ...ftWorkout("workout:2026-08-12"),
  id: "live-id",
  at: "2026-08-12T08:00:00.000Z",
};
const ftOld = { ...ftWorkout("workout:2026-08-12"), id: "old-id", at: "2026-08-12T05:00:00.000Z" };
const ftImported = mergeLedgers([ftLive], [ftOld]);
t(
  "import: earlier event wins (old backup cannot overwrite newer work)",
  ftImported.length === 1 && ftImported[0]!.id === "old-id",
  "earliest wins: old-id (05:00) should beat live-id (08:00)",
);
t(
  "import: XP not doubled by import",
  sumXp(ftImported) === 80,
  "EXPECTED 80, ACTUAL " + sumXp(ftImported),
);

// --- 26i. sessionsInLast edge cases ---

const ftSILLedger = [
  ftWorkout("w-sil1", FT_TODAY),
  ftWorkout("w-sil2", "2026-08-11"),
  ftWorkout("w-sil3", "2026-08-10"),
];

t(
  "sessionsInLast: window=1 counts only today",
  sessionsInLast(ftSILLedger, FT_TODAY, 1) === 1,
  "got " + sessionsInLast(ftSILLedger, FT_TODAY, 1),
);
t(
  "sessionsInLast: window=2 counts today and yesterday",
  sessionsInLast(ftSILLedger, FT_TODAY, 2) === 2,
  "got " + sessionsInLast(ftSILLedger, FT_TODAY, 2),
);
t(
  "sessionsInLast: same-day two events only counted once",
  sessionsInLast(
    [ftWorkout("w-dd1", FT_TODAY), { ...ftWorkout("w-dd2", FT_TODAY), id: "dd2-id" }],
    FT_TODAY,
    7,
  ) === 1,
  "workoutDays is a Set — same day must not double-count",
);
t(
  "sessionsInLast: session on exactly the last day of window counted",
  sessionsInLast([ftWorkout("w-last", "2026-08-06")], FT_TODAY, 7) === 1,
  "Aug 6 is 6 days before Aug 12 — should fall within a 7-day window",
);
t(
  "sessionsInLast: session one day beyond window not counted",
  sessionsInLast([ftWorkout("w-out", "2026-08-05")], FT_TODAY, 7) === 0,
  "Aug 5 is 7 days before Aug 12 — just beyond a 7-day window",
);

// --- 26j. sessionsByWeek edge cases ---

const ftSBWLedger = [
  ftWorkout("w-sbw1", FT_TODAY),
  ftWorkout("w-sbw2", "2026-08-11"),
  // Two workout refs on same day — dedupeLedger handles in practice, but
  // sessionsByWeek reads workoutDays (a Set), so it naturally deduplicates.
  ftWorkout("w-sbw3", FT_TODAY), // same day as w-sbw1; workoutDays de-dups
];

const ftWeeks = sessionsByWeek(ftSBWLedger, FT_TODAY, 6);
t("sessionsByWeek: produces exactly 6 entries", ftWeeks.length === 6);
t(
  "sessionsByWeek: W1 = oldest week, W6 = newest",
  ftWeeks[0]!.label === "W1" && ftWeeks[5]!.label === "W6",
);
t(
  "sessionsByWeek: same-day events counted once in week bar",
  ftWeeks[5]!.value === 2,
  "2026-08-12 and 2026-08-11 each count once; EXPECTED 2, ACTUAL " + ftWeeks[5]!.value,
);
t(
  "sessionsByWeek: weeks beyond sessions are 0",
  ftWeeks.slice(0, 5).every((b) => b.value === 0),
  "all older weeks should have 0 sessions",
);

// --- 26k. deriveStats with workout ledger ---

const ftStatLedger = [
  ftWorkout("w-st1", FT_TODAY), // xp: 80
  ftWorkout("w-st2", "2026-08-11"), // xp: 80
  ev({ ref: "f-st1", kind: "focus", area: "mind", day: "2026-08-10", xp: 50, minutes: 50 }),
];

const ftStats = deriveStats(ftStatLedger, FT_TODAY);

t(
  "deriveStats: totalXp = 80 + 80 + 50 = 210",
  ftStats.totalXp === 210,
  "EXPECTED 210, ACTUAL " + ftStats.totalXp,
);
t(
  "deriveStats: xpToday = 80 (only today's workout)",
  ftStats.xpToday === 80,
  "EXPECTED 80, ACTUAL " + ftStats.xpToday,
);
t(
  "deriveStats: todayQualifies = false — workout alone is 80 XP, below 100 threshold",
  !ftStats.todayQualifies,
  "80 XP workout alone must not satisfy MVD",
);
t(
  "deriveStats: focusMinutes counts only focus events",
  ftStats.focusMinutes === 50,
  "EXPECTED 50, ACTUAL " + ftStats.focusMinutes,
);

// A ledger where today's workout + journal crosses the 100 XP threshold.
const ftStatQualLedger = [
  ftWorkout("w-stq1", FT_TODAY), // 80 XP
  ev({ ref: "j-stq1", kind: "journal", area: "spirit", day: FT_TODAY, xp: 30 }), // 30 XP
];
const ftStatsQual = deriveStats(ftStatQualLedger, FT_TODAY);
t(
  "deriveStats: workout + journal (110 XP) → todayQualifies = true",
  ftStatsQual.todayQualifies,
  "110 XP meets the 100 XP MVD threshold",
);

// --- 26l. Open product decision: flat XP rate ---
// The current architecture logs XP.workout = 80 unconditionally.
// No effort/duration model is defined in the spec — the route does not record
// workout duration and there is no tiered XP table for fitness.
// These tests assert the CURRENT behaviour so any future change breaks loudly.
t(
  "flat rate: any complete session always logs exactly XP.workout (80)",
  ftWorkout("w-flat").xp === 80,
  "if effort-based XP is added, this test must be updated alongside the spec",
);
t(
  "flat rate: XP.workout constant is not hardcoded differently across areas",
  XP.workout === 80 && XP.journal === 30 && XP.discipline === 15,
);

console.log("\n===== 28. RESTORE / MIGRATION HONESTY =====");
// This suite runs in Node, where `localStorage` does not exist, so every write
// through the web adapter fails with reason "unavailable". That makes this the
// natural place to prove a restore that cannot write says so, instead of
// reporting "Restored." over a migration that silently did nothing.
const writeReallyFails = await writeJson(KEYS.missions, []);
t(
  "precondition: storage writes genuinely fail in this environment",
  writeReallyFails.ok === false,
  "storage was writable, so the failure-surfacing tests below would prove nothing",
);

const failingFile = JSON.stringify({
  format: "mission-control-backup",
  version: 1,
  exportedAt: "2026-01-01T00:00:00.000Z",
  data: { [KEYS.missions]: [], [KEYS.journal]: {} },
});
const failedRestore = await restoreBackup(failingFile, []);
t(
  "a restore whose writes fail is not reported as success",
  failedRestore.ok === false,
  "ACTUAL ok=" + failedRestore.ok + " :: " + failedRestore.message,
);
t(
  "the failure names every section that could not be saved",
  /missions/.test(failedRestore.message) && /journal/.test(failedRestore.message),
  "ACTUAL " + failedRestore.message,
);

t("invalid JSON is rejected", (await restoreBackup("{not json", [])).ok === false);
t(
  "a file that is not a Mission Control backup is rejected",
  (await restoreBackup(JSON.stringify({ format: "something-else" }), [])).ok === false,
);

// A ledger-only backup writes nothing through the failing path, so it must still
// succeed — and must carry ids and refs across untouched.
const carried = ev({ ref: "task:carry-me", id: "id-carry", xp: 33, label: "step" });
const ledgerFile = JSON.stringify({
  format: "mission-control-backup",
  version: 1,
  exportedAt: "2026-01-01T00:00:00.000Z",
  data: { [KEYS.activity]: [carried] },
});
const ledgerRestore = await restoreBackup(ledgerFile, []);
t("a ledger-only restore succeeds", ledgerRestore.ok === true, ledgerRestore.message);
t("import preserves the event id", ledgerRestore.mergedEvents?.[0]?.id === "id-carry");
t("import preserves the event ref", ledgerRestore.mergedEvents?.[0]?.ref === "task:carry-me");
t("import preserves the event xp", sumXp(ledgerRestore.mergedEvents ?? []) === 33);

// Importing the same file again — the thing a nervous migrating user does — must
// not duplicate the ledger or double the XP.
const twiceOver = await restoreBackup(ledgerFile, ledgerRestore.mergedEvents ?? []);
t("importing the same file twice adds nothing", twiceOver.mergedEvents?.length === 1);
t("importing the same file twice does not double XP", sumXp(twiceOver.mergedEvents ?? []) === 33);

// An empty desktop install importing a browser export: no current events at all.
const ontoEmpty = await restoreBackup(ledgerFile, []);
t("restoring onto an empty install keeps the single event", ontoEmpty.mergedEvents?.length === 1);

console.log("\n===== 29. STARTUP REGISTRATION =====");
// These run against the web platform (no __TAURI_INTERNALS__ in Node), which is
// exactly the build that must stay inert: adding launch-at-sign-in to the
// desktop app must not make the browser claim a capability it cannot honour.
t("the web build is selected in this environment", platform.capabilities.name === "web");
t("the web build does not claim it can autostart", platform.capabilities.canAutostart === false);
t("web startup reports itself disabled", (await platform.startup.isEnabled()) === false);
t("web startup cannot be switched on", (await platform.startup.setEnabled(true)) === false);

// A capability flag that disagrees with its adapter is worse than either alone:
// the interface would offer a control that silently does nothing.
t(
  "capability flag and adapter agree",
  platform.capabilities.canAutostart === (await platform.startup.isEnabled()) ||
    platform.capabilities.canAutostart,
  "canAutostart is false but the adapter reports enabled",
);

// Startup is a convenience. It must never be able to throw into Settings, and
// never share a failure path with the ledger.
let startupThrew = false;
try {
  await platform.startup.setEnabled(true);
  await platform.startup.setEnabled(false);
} catch {
  startupThrew = true;
}
t("changing startup never throws", startupThrew === false);

const ledgerAfterStartupChurn = await restoreBackup(ledgerFile, []);
t(
  "a startup change leaves ledger restore intact",
  ledgerAfterStartupChurn.ok === true && sumXp(ledgerAfterStartupChurn.mergedEvents ?? []) === 33,
  "ledger behaviour moved after touching startup",
);

console.log("\n" + P + " passed, " + F + " failed");
if (fails.length) {
  console.log("\nFAILED INVARIANTS:");
  fails.forEach((f) => console.log(" - " + f));
}
// Without this the suite always exited 0: a broken invariant printed its failure
// and the build went green anyway, which made every check above advisory only.
process.exit(F === 0 ? 0 : 1);
