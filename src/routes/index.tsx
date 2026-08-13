import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Moon, Sparkles, Trophy } from "lucide-react";

import { HeroBanner } from "@/components/mission/HeroBanner";
import { IntentionCard } from "@/components/mission/IntentionCard";
import { ObjectiveCard } from "@/components/mission/ObjectiveCard";
import { EssentialTasks } from "@/components/mission/EssentialTasks";
import { FocusTimeline } from "@/components/mission/FocusTimeline";
import { StatCard } from "@/components/mission/StatCard";
import { QuoteCard } from "@/components/mission/QuoteCard";
import { NightlyPlanner } from "@/components/mission/NightlyPlanner";
import { PLAN_HOUR, useNightlyReminder } from "@/hooks/use-nightly-reminder";
import { dayKey } from "@/data/daily";
import {
  completionXpFor,
  stepXpFor,
  focusBonusXp,
  focusXpForTask,
  OBJECTIVE_POT,
  TASK_POT,
} from "@/data/activity";
import { areaForIcon } from "@/data/icons";
import { isTaskComplete, planRef, subtaskProgress, type DayPlan, type StepDone } from "@/data/plan";
import { tomorrowKey, useDayPlan } from "@/hooks/use-day-plan";
import { useActivity } from "@/hooks/use-activity";
import { useProgression } from "@/hooks/use-progression";
import { useNow } from "@/hooks/use-now";
import { platform } from "@/platform";

const title = "Mission Control — Master Your Mission";
const description =
  "A calm, handcrafted daily command center: intentions, essential tasks, focus timeline, and discipline stats.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  const now = useNow(30_000);
  const today = now ? dayKey(now) : null;
  const { hydrated, todayPlan, planFor, savePlan, updateToday, hasPlan } = useDayPlan(today);
  const { stats, transact, events, has } = useActivity();
  const { progression } = useProgression();

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (platform.notifications.permission() === "granted") setNotificationsEnabled(true);
  }, []);

  const nextKey = now ? tomorrowKey(now) : null;
  const tomorrowLabel = now
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  useNightlyReminder(now, notificationsEnabled, tomorrowLabel);

  // After the planning hour, prompt once per night until tomorrow is planned.
  const isPlanningTime = now !== null && now.getHours() >= PLAN_HOUR;
  const tomorrowPlanned = nextKey ? hasPlan(nextKey) : false;
  const showPrompt = isPlanningTime && !tomorrowPlanned && dismissedFor !== today && hydrated;

  const requestNotifications = useCallback(async () => {
    setNotificationsEnabled(await platform.notifications.request());
  }, []);

  /**
   * Whether a step is done is a question for the ledger, not for the plan.
   * These lookups are the only way the UI learns what is ticked.
   */
  const stepDoneFor = useCallback(
    (taskId: string): StepDone =>
      (subtaskId) =>
        today !== null && has(planRef.taskSubtask(today, taskId, subtaskId)),
    [has, today],
  );

  const objectiveStepDone = useCallback<StepDone>(
    (subtaskId) => today !== null && has(planRef.objectiveStep(today, subtaskId)),
    [has, today],
  );

  /**
   * Ticking a step records it in the ledger — and nowhere else. Finishing every
   * step also banks the task's completion bonus; unticking removes exactly
   * those entries, so XP can never drift.
   *
   * All three writes go through one `transact` so "is the task finished?" is
   * answered against the same ledger the step is being written into.
   */
  const toggleTaskSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      if (!today || !todayPlan) return;
      const task = todayPlan.tasks.find((t) => t.id === taskId);
      const subtask = task?.subtasks.find((s) => s.id === subtaskId);
      if (!task || !subtask) return;

      const area = areaForIcon[task.iconKey] ?? "discipline";

      // The task is worth a fixed pot: half split across however many steps it
      // has, half on completion. Slicing a task finely cannot inflate its value.
      const pot = TASK_POT[task.priority];
      const perStep = stepXpFor(pot, task.subtasks.length);

      transact((has) => {
        const nowDone = !has(planRef.taskSubtask(today, taskId, subtaskId));

        // The step being toggled is read from `nowDone`; the rest from what is
        // already recorded.
        const finished =
          task.subtasks.length > 0 &&
          task.subtasks.every((s) =>
            s.id === subtaskId ? nowDone : has(planRef.taskSubtask(today, taskId, s.id)),
          );

        // Focus that fed a task finished the same day is worth a quarter more —
        // the one place the economy links effort to outcome. Logged separately
        // so history stays immutable and it reverses with the task. Matched by
        // `taskId`, so renaming a task cannot redirect the bonus.
        const focusXp = focusXpForTask(events, today, taskId);

        return [
          {
            on: nowDone,
            event: {
              ref: planRef.taskSubtask(today, taskId, subtaskId),
              kind: "subtask",
              area,
              xp: perStep,
              label: subtask.label,
            },
          },
          {
            on: finished,
            event: {
              ref: planRef.task(today, taskId),
              kind: "task",
              area,
              xp: completionXpFor(pot),
              label: task.title,
            },
          },
          {
            on: finished && focusXp > 0,
            event: {
              ref: planRef.focusBonus(today, taskId),
              kind: "focus-bonus",
              area: "mind",
              xp: focusBonusXp(focusXp),
              label: `Focus paid off — ${task.title}`,
            },
          },
        ];
      });
    },
    [today, todayPlan, transact, events],
  );

  const toggleObjectiveSubtask = useCallback(
    (subtaskId: string) => {
      if (!today || !todayPlan) return;
      const objective = todayPlan.objective;
      const subtask = objective.subtasks.find((s) => s.id === subtaskId);
      if (!subtask) return;

      const perStep = stepXpFor(OBJECTIVE_POT, objective.subtasks.length);

      transact((has) => {
        const nowDone = !has(planRef.objectiveStep(today, subtaskId));
        const finished =
          objective.subtasks.length > 0 &&
          objective.subtasks.every((s) =>
            s.id === subtaskId ? nowDone : has(planRef.objectiveStep(today, s.id)),
          );

        return [
          {
            on: nowDone,
            event: {
              ref: planRef.objectiveStep(today, subtaskId),
              kind: "subtask",
              area: "discipline",
              xp: perStep,
              label: subtask.label,
            },
          },
          {
            on: finished,
            event: {
              ref: planRef.objective(today),
              kind: "objective",
              area: "discipline",
              xp: completionXpFor(OBJECTIVE_POT),
              label: objective.title,
            },
          },
        ];
      });
    },
    [today, todayPlan, transact],
  );

  const reorderTasks = useCallback(
    (fromId: string, toId: string) =>
      updateToday((plan) => {
        if (fromId === toId) return plan;
        const next = [...plan.tasks];
        const from = next.findIndex((t) => t.id === fromId);
        const to = next.findIndex((t) => t.id === toId);
        if (from < 0 || to < 0) return plan;
        const [moved] = next.splice(from, 1);
        if (!moved) return plan;
        next.splice(to, 0, moved);
        return { ...plan, tasks: next };
      }),
    [updateToday],
  );

  const setIntention = useCallback(
    (next: string) => updateToday((plan) => ({ ...plan, intention: next })),
    [updateToday],
  );

  const handleSaveTomorrow = useCallback(
    (plan: DayPlan) => {
      if (!nextKey) return;
      savePlan(nextKey, plan);
      setPlannerOpen(false);
    },
    [nextKey, savePlan],
  );

  const { streak, longest, xpToday, streakTokens, todayQualifies } = stats;
  const rank = progression.masterRank;
  const nextRank = progression.nextRank;
  const plannerVisible = plannerOpen || showPrompt;

  // How much of today's plan is actually done, for an honest caption.
  const tasksDone =
    todayPlan?.tasks.filter((t) => isTaskComplete(t, stepDoneFor(t.id))).length ?? 0;
  const taskCount = todayPlan?.tasks.length ?? 0;
  const objectivePercent = todayPlan
    ? subtaskProgress(todayPlan.objective.subtasks, objectiveStepDone)
    : 0;

  return (
    <div className="space-y-8">
      <HeroBanner />

      {plannerVisible && nextKey && (
        <NightlyPlanner
          dateLabel={tomorrowLabel}
          existing={planFor(nextKey)}
          onSave={handleSaveTomorrow}
          onDismiss={() => {
            setPlannerOpen(false);
            setDismissedFor(today);
          }}
          notificationsEnabled={notificationsEnabled}
          onEnableNotifications={requestNotifications}
        />
      )}

      {!plannerVisible && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPlannerOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Moon className="size-3.5" aria-hidden />
            {tomorrowPlanned ? "Edit tomorrow's plan" : "Plan tomorrow"}
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <IntentionCard value={todayPlan?.intention ?? ""} onChange={setIntention} />
        {todayPlan && (
          <ObjectiveCard
            objective={todayPlan.objective}
            stepDone={objectiveStepDone}
            onToggleSubtask={toggleObjectiveSubtask}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {todayPlan && (
          <EssentialTasks
            tasks={todayPlan.tasks}
            stepDoneFor={stepDoneFor}
            onToggleSubtask={toggleTaskSubtask}
            onReorder={reorderTasks}
          />
        )}
        <FocusTimeline blocks={todayPlan?.timeline ?? []} now={now} />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <span className="text-[0.62rem] tracking-[0.28em] text-gold/80 uppercase">
          Rank &amp; Progression
        </span>
        <span className="text-[0.65rem] text-muted-foreground">
          {taskCount > 0 && (
            <>
              Today: {tasksDone} of {taskCount} tasks done · objective {objectivePercent}%
            </>
          )}
        </span>
      </div>

      <section aria-label="Discipline summary" className="grid gap-6 md:grid-cols-3">
        <StatCard
          label="Discipline Level"
          value={progression.currentLevel}
          suffix={rank.name}
          caption={
            nextRank
              ? `${nextRank.name} awaits at level ${nextRank.fromLevel}.`
              : "The highest rank. Hold it."
          }
          icon={Trophy}
          motif="kamon"
        />
        <StatCard
          label="XP Progress"
          value={progression.xpIntoLevel}
          suffix={`/ ${progression.xpForNextLevel.toLocaleString()} XP`}
          caption={
            xpToday > 0
              ? `${xpToday.toLocaleString()} XP earned today · ${(progression.xpForNextLevel - progression.xpIntoLevel).toLocaleString()} to level ${progression.currentLevel + 1}.`
              : `${(progression.xpForNextLevel - progression.xpIntoLevel).toLocaleString()} XP to level ${progression.currentLevel + 1}.`
          }
          progress={progression.progressPercent}
          icon={Sparkles}
          motif="kamon"
        />
        <StatCard
          label="Current Streak"
          value={streak}
          suffix={streak === 1 ? "Day" : "Days"}
          caption={
            !todayQualifies
              ? `Today needs 25m focus, the objective, or 100 XP.${streakTokens > 0 ? ` ${streakTokens} grace in hand.` : ""}`
              : streak >= longest
                ? "Your longest streak yet. Protect it."
                : `Your best is ${longest} days.${streakTokens > 0 ? ` ${streakTokens} grace in hand.` : ""}`
          }
          progress={longest > 0 ? Math.min(100, (streak / longest) * 100) : 0}
          icon={Flame}
          motif="bamboo"
        />
      </section>

      <QuoteCard />
    </div>
  );
}
