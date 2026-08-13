/**
 * The day plan: what you intend to do on a given calendar day.
 *
 * A plan holds *intent* only — titles, steps, priorities, the shape of the day.
 * It deliberately holds no completion state.
 *
 * Whether a step is done is answered by the ledger: the step is done exactly
 * when an event with its `ref` exists. An earlier version stored a `done`
 * boolean on the subtask *as well as* logging the event, which meant two
 * writers and no reconciliation — a failed write to either desynchronised them
 * permanently and nothing detected it. There is now one writer and one truth.
 */

export type Priority = "critical" | "high" | "standard";

export type Subtask = {
  id: string;
  label: string;
};

/**
 * The ledger refs a day plan uses.
 *
 * These are the join between intent and record, so they live in one place —
 * the code that ticks a step and the code that reads it back must agree
 * character for character, or work silently stops counting.
 */
export const planRef = {
  taskSubtask: (day: string, taskId: string, subtaskId: string) =>
    `subtask:${day}:${taskId}:${subtaskId}`,
  task: (day: string, taskId: string) => `task:${day}:${taskId}`,
  objectiveStep: (day: string, subtaskId: string) => `objective-step:${day}:${subtaskId}`,
  objective: (day: string) => `objective:${day}`,
  focusBonus: (day: string, taskId: string) => `focus-bonus:${day}:${taskId}`,
};

/**
 * Answers "is this step done?" for one task or objective. Always backed by the
 * ledger — components receive this rather than reading a stored flag.
 */
export type StepDone = (subtaskId: string) => boolean;

export type PlannedTask = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priority: Priority;
  iconKey: IconKey;
  subtasks: Subtask[];
};

export type Objective = {
  title: string;
  subtitle: string;
  subtasks: Subtask[];
};

export type TimelineBlock = {
  id: string;
  /** Minutes from local midnight. */
  startMinutes: number;
  endMinutes: number;
  label: string;
  detail: string;
  iconKey: IconKey;
};

export type DayPlan = {
  intention: string;
  objective: Objective;
  tasks: PlannedTask[];
  timeline: TimelineBlock[];
};

export type IconKey =
  "study" | "write" | "train" | "sunrise" | "target" | "break" | "moon" | "code" | "read";

/** What each priority actually means — surfaced in the UI so the labels aren't arbitrary. */
export const priorityMeaning: Record<Priority, { label: string; blurb: string }> = {
  critical: {
    label: "Critical",
    blurb: "The day fails without it. Do it first, protect it from everything else.",
  },
  high: {
    label: "High",
    blurb: "Real consequences if it slips, but the day survives. Do it after Critical.",
  },
  standard: {
    label: "Standard",
    blurb: "Keeps momentum and compounds over time. Do it if the first two are safe.",
  },
};

export const priorityOrder: Priority[] = ["critical", "high", "standard"];

/** Sorts by priority so the most important task is always task number one. */
export function sortByPriority(tasks: PlannedTask[]): PlannedTask[] {
  return [...tasks].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );
}

export function countDone(subtasks: Subtask[], done: StepDone): number {
  return subtasks.filter((s) => done(s.id)).length;
}

export function subtaskProgress(subtasks: Subtask[], done: StepDone): number {
  if (subtasks.length === 0) return 0;
  return Math.round((countDone(subtasks, done) / subtasks.length) * 100);
}

export function isTaskComplete(task: PlannedTask, done: StepDone): boolean {
  return task.subtasks.length > 0 && task.subtasks.every((s) => done(s.id));
}

export function makeSubtasks(labels: string[], prefix: string): Subtask[] {
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `${prefix}-s${i}`, label }));
}

const defaultTimeline: TimelineBlock[] = [
  {
    id: "morning",
    startMinutes: 6 * 60,
    endMinutes: 7 * 60,
    label: "Morning Routine",
    detail: "Breathwork, cold shower, green tea.",
    iconKey: "sunrise",
  },
  {
    id: "deep-work",
    startMinutes: 7 * 60,
    endMinutes: 10 * 60,
    label: "Deep Work",
    detail: "High focus. No distractions.",
    iconKey: "target",
  },
  {
    id: "break",
    startMinutes: 10 * 60,
    endMinutes: 10 * 60 + 30,
    label: "Break",
    detail: "Rest. Reflect. Reset.",
    iconKey: "break",
  },
  {
    id: "study",
    startMinutes: 10 * 60 + 30,
    endMinutes: 13 * 60,
    label: "Study",
    detail: "Advanced Machine Learning, module 7.",
    iconKey: "study",
  },
  {
    id: "build",
    startMinutes: 14 * 60,
    endMinutes: 17 * 60,
    label: "Build Block",
    detail: "Ship something real.",
    iconKey: "code",
  },
  {
    id: "workout",
    startMinutes: 17 * 60,
    endMinutes: 18 * 60,
    label: "Workout",
    detail: "Lower body strength, 60 minutes.",
    iconKey: "train",
  },
  {
    id: "read",
    startMinutes: 19 * 60 + 30,
    endMinutes: 20 * 60 + 30,
    label: "Reading",
    detail: "Twenty pages, no phone.",
    iconKey: "read",
  },
  {
    id: "evening",
    startMinutes: 21 * 60,
    endMinutes: 22 * 60,
    label: "Evening Review",
    detail: "Journal the day, plan tomorrow.",
    iconKey: "moon",
  },
];

/** The plan used for a day you have not explicitly planned yet. */
export function createDefaultPlan(): DayPlan {
  return {
    intention:
      "I will focus on what matters and let go of what does not. Calm hands, clear mind, one deliberate step at a time.",
    objective: {
      title: "Complete Week 4 Assignment",
      subtitle: "Make it exceptional — submit before the evening review.",
      subtasks: makeSubtasks(
        ["Re-read the brief", "Draft the solution", "Verify the results", "Submit"],
        "obj",
      ),
    },
    tasks: [
      {
        id: "task-study",
        title: "Study Advanced Machine Learning",
        description: "Deep understanding builds mastery.",
        durationMinutes: 150,
        priority: "critical",
        iconKey: "study",
        subtasks: makeSubtasks(["Watch module 7", "Work the examples", "Summarise in notes"], "t1"),
      },
      {
        id: "task-assignment",
        title: "Finish Week 4 Assignment",
        description: "Excellence today, confidence tomorrow.",
        durationMinutes: 120,
        priority: "high",
        iconKey: "write",
        subtasks: makeSubtasks(["Outline answers", "Write it up", "Proofread"], "t2"),
      },
      {
        id: "task-training",
        title: "Strength Training",
        description: "Build the body, strengthen the mind.",
        durationMinutes: 60,
        priority: "standard",
        iconKey: "train",
        subtasks: makeSubtasks(["Warm up", "Main lifts", "Cool down"], "t3"),
      },
    ],
    timeline: defaultTimeline,
  };
}
