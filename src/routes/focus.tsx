import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

import { EnsoRing } from "@/components/mission/EnsoRing";
import { InkArt } from "@/components/mission/InkArt";
import { PageHeader } from "@/components/mission/PageHeader";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { SealStamp } from "@/components/mission/SealStamp";
import { SeriesTracker } from "@/components/mission/SeriesTracker";
import { StatTile } from "@/components/mission/StatTile";
import {
  EnsoIcon,
  FlameIcon,
  HourglassIcon,
  KabutoIcon,
  TeaIcon,
  ToriiIcon,
} from "@/components/mission/JapaneseIcons";
import {
  eventsOfKind,
  eventsOn,
  focusBonusXp,
  focusXpFor,
  focusXpForTask,
  streakState,
  sumMinutes,
} from "@/data/activity";
import { focusQuality, useDistractionShield } from "@/hooks/use-distraction-shield";
import { dayKey } from "@/data/daily";
import { iconFor } from "@/data/icons";
import { planRef } from "@/data/plan";
import { useActivity, type LedgerToggle, type NewEvent } from "@/hooks/use-activity";
import { useDayPlan } from "@/hooks/use-day-plan";
import { useNow } from "@/hooks/use-now";
import { KEYS, readJson, removeKey, writeJson } from "@/services/store";

const title = "Focus — Mission Control";
const description = "One thing at a time. Nothing else exists.";

/**
 * A session in progress, so a reload mid-work does not discard it.
 *
 * This is a *cursor*, not a statistic: it records where you are, never what you
 * achieved. Losing it costs you a resume, nothing more, and no number anywhere
 * in the app reads from it.
 */
type SavedSession = {
  presetId: string;
  runStartedAt: number | null;
  bankedMs: number;
  taskId: string | null;
  /** The Pomodoro cycle position so reload does not reset the work/rest rotation. */
  cyclePosition?: number;
  /** Day the session was saved — prevents a stale cyclePosition bleeding into the next day. */
  day?: string;
};

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: FocusPage,
});

type Preset = {
  id: string;
  label: string;
  kanji: string;
  minutes: number;
  detail: string;
  /** Rest blocks are timed but earn nothing — only real focus counts. */
  rest?: boolean;
};

const presets: Preset[] = [
  { id: "deep", label: "Deep Work", kanji: "深", minutes: 50, detail: "Long-form immersion" },
  { id: "sprint", label: "Focus Sprint", kanji: "集", minutes: 25, detail: "A single sharp push" },
  {
    id: "short",
    label: "Short Break",
    kanji: "休",
    minutes: 10,
    detail: "Stand. Breathe. Return.",
    rest: true,
  },
  {
    id: "long",
    label: "Long Rest",
    kanji: "静",
    minutes: 20,
    detail: "Reset the mind fully",
    rest: true,
  },
];

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function FocusPage() {
  const now = useNow(60_000);
  const today = now ? dayKey(now) : null;
  const { events, transact } = useActivity();
  const { todayPlan } = useDayPlan(today);

  const [presetId, setPresetId] = useState(presets[0]!.id);
  const preset = useMemo(() => presets.find((p) => p.id === presetId) ?? presets[0]!, [presetId]);

  /**
   * Time is measured against the wall clock, never by counting ticks.
   * Browsers throttle timers in background tabs, so a tick count would badly
   * under-record a session the moment you switched away.
   *
   * `runStartedAt` marks the current run; `bankedMs` holds everything before it.
   */
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [bankedMs, setBankedMs] = useState(0);
  const [, forceTick] = useState(0);

  const [shield, setShield] = useState(true);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  /** Work blocks finished in this run — a long rest is earned every fourth. */
  const [cyclePosition, setCyclePosition] = useState(0);

  const distraction = useDistractionShield(shield && runStartedAt !== null);

  // A session in progress survives a reload. Because timing is anchored to
  // absolute timestamps, the clock keeps running even while the tab is closed.
  useEffect(() => {
    let cancelled = false;
    void readJson<SavedSession | null>(KEYS.focusSession, null).then((saved) => {
      if (cancelled) return;
      if (saved) {
        const sameDay = saved.day === dayKey();
        // A timer mid-flight may legally span the 04:00 day boundary (started
        // 03:50, reloaded 04:10). Restore it so the work is not lost. Without an
        // active timer, the entire cursor is stale and must be dropped.
        const hasActiveTimer = saved.runStartedAt !== null;

        if (sameDay || hasActiveTimer) {
          setPresetId(saved.presetId);
          setRunStartedAt(saved.runStartedAt);
          setBankedMs(saved.bankedMs);
          if (saved.taskId) setTaskId(saved.taskId);
        }
        // cyclePosition is day-scoped: only restore it when the cursor is today's.
        if (sameDay && saved.cyclePosition !== undefined) {
          setCyclePosition(saved.cyclePosition);
        }
      }
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    if (runStartedAt === null && bankedMs === 0 && cyclePosition === 0)
      void removeKey(KEYS.focusSession);
    else
      void writeJson(KEYS.focusSession, {
        presetId,
        runStartedAt,
        bankedMs,
        taskId,
        cyclePosition,
        day: dayKey(),
      });
  }, [restored, presetId, runStartedAt, bankedMs, taskId, cyclePosition]);

  const running = runStartedAt !== null;
  const elapsedMs = bankedMs + (runStartedAt === null ? 0 : Date.now() - runStartedAt);
  const elapsed = Math.floor(elapsedMs / 1000);
  const secondsLeft = Math.max(0, preset.minutes * 60 - elapsed);

  // Memoised so the selection effect below does not re-run on every render.
  const tasks = useMemo(() => todayPlan?.tasks ?? [], [todayPlan]);
  const activeTask = tasks.find((t) => t.id === taskId) ?? tasks[0] ?? null;

  // Keep the selection valid as the day's plan loads or changes.
  useEffect(() => {
    if (!taskId && tasks[0]) setTaskId(tasks[0].id);
  }, [taskId, tasks]);

  const reset = useCallback(() => {
    setRunStartedAt(null);
    setBankedMs(0);
  }, []);

  const selectPreset = useCallback(
    (id: string) => {
      const next = presets.find((p) => p.id === id);
      if (!next) return;
      setPresetId(id);
      reset();
      distraction.reset();
    },
    [reset, distraction],
  );

  const toggleRunning = useCallback(() => {
    setRunStartedAt((started) => {
      if (started === null) return Date.now();
      // Pausing folds this run into the bank so nothing is lost.
      setBankedMs((ms) => ms + (Date.now() - started));
      return null;
    });
  }, []);

  // Re-render each second so the countdown stays current. Even if the browser
  // throttles this, the displayed time is recomputed from the clock, not the tick.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  /** Minutes already focused today — sets where you sit on the decay curve. */
  const minutesToday = useMemo(
    () => (today ? sumMinutes(eventsOn(eventsOfKind(events, "focus"), today)) : 0),
    [events, today],
  );

  const bankSession = useCallback(
    (minutes: number) => {
      if (!today || preset.rest || minutes < 1) return;

      // Presence scales the reward. A block you sat through is worth more than
      // the same minutes spent bouncing between tabs.
      const quality = shield
        ? focusQuality(minutes * 60, distraction.awaySeconds, distraction.breaks)
        : 100;
      const base = focusXpFor(minutesToday, minutes);
      const earned = Math.max(1, Math.round(base * (quality / 100)));

      const session: NewEvent = {
        ref: `focus:${Date.now()}`,
        kind: "focus",
        area: "mind",
        xp: earned,
        minutes,
        // The task is recorded by id, not by name. Renaming the task later must
        // not change what this session was.
        ...(activeTask ? { taskId: activeTask.id } : {}),
        label: `${activeTask ? `${preset.label} — ${activeTask.title}` : preset.label}${
          shield && distraction.breaks > 0 ? ` · ${distraction.breaks} interruptions` : ""
        }`,
      };

      transact((has) => {
        const toggles: LedgerToggle[] = [{ on: true, event: session }];
        if (!activeTask) return toggles;

        // The completion bonus is only owed once the task is actually finished.
        // Home awards it when the last step is ticked, but focus can also arrive
        // *after* that moment — either a session started once the task was done,
        // or more work on a task finished earlier today. In both cases the bonus
        // Home wrote is now short, and re-logging alone would not fix it: the ref
        // already exists, so an append is a no-op. Clear it, then write the value
        // the whole day's focus now earns.
        if (!has(planRef.task(today, activeTask.id))) return toggles;

        const bonusXp = focusBonusXp(focusXpForTask(events, today, activeTask.id, earned));
        if (bonusXp < 1) return toggles;

        const bonus: NewEvent = {
          ref: planRef.focusBonus(today, activeTask.id),
          kind: "focus-bonus",
          area: "mind",
          xp: bonusXp,
          label: `Focus paid off — ${activeTask.title}`,
        };

        toggles.push({ on: false, event: bonus }, { on: true, event: bonus });
        return toggles;
      });
    },
    [today, preset, activeTask, transact, events, minutesToday, shield, distraction],
  );

  // Bank the session the moment the countdown lands on zero, then hand you the
  // next block in the cycle — work, short rest, and a long rest every fourth.
  useEffect(() => {
    if (secondsLeft > 0 || !running || !today) return;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    setRunStartedAt(null);
    setBankedMs(0);
    bankSession(minutes);
    distraction.reset();

    if (!preset.rest) {
      const done = cyclePosition + 1;
      setCyclePosition(done);
      // Four blocks of work earn the long rest.
      setPresetId(done % 4 === 0 ? "long" : "short");
    } else {
      setPresetId("deep");
    }
  }, [secondsLeft, running, today, elapsed, bankSession, preset, cyclePosition, distraction]);

  /** Stopping early still banks whatever was genuinely worked. */
  const endEarly = useCallback(() => {
    bankSession(Math.floor(elapsed / 60));
    reset();
    distraction.reset();
  }, [elapsed, bankSession, reset, distraction]);

  const total = preset.minutes * 60;
  const progress = ((total - secondsLeft) / total) * 100;

  /* ---- Everything below is derived from the ledger, never stored ---- */
  const focusEvents = useMemo(() => eventsOfKind(events, "focus"), [events]);
  const todaysSessions = useMemo(
    () => (today ? eventsOn(focusEvents, today) : []),
    [focusEvents, today],
  );
  const focusStreak = today ? streakState(focusEvents, today).current : 0;
  const longestSession = focusEvents.reduce((best, e) => Math.max(best, e.minutes ?? 0), 0);

  // Where the next minute sits on the decay curve, so the rate is never a surprise.
  const nextRate =
    minutesToday < 120 ? "full rate" : minutesToday < 240 ? "×0.75 rate" : "×0.5 rate";

  const iconClass = "size-5";
  const stats = [
    {
      label: "Sessions Today",
      value: `${todaysSessions.length}`,
      caption: todaysSessions.length === 0 ? "none yet" : "completed",
      icon: <ToriiIcon className={iconClass} />,
    },
    {
      label: "Focus Time",
      value: minutesToday === 0 ? "0m" : formatMinutes(minutesToday),
      caption: `banked today · ${nextRate}`,
      icon: <HourglassIcon className={iconClass} />,
    },
    {
      label: "Focus Streak",
      value: `${focusStreak}`,
      unit: focusStreak === 1 ? "day" : "days",
      caption: focusStreak === 0 ? "start one today" : "unbroken",
      icon: <FlameIcon className={iconClass} />,
    },
    {
      label: "Longest Session",
      value: longestSession === 0 ? "—" : formatMinutes(longestSession),
      caption: "personal best",
      icon: <EnsoIcon className={iconClass} />,
    },
  ];

  return (
    <div className="animate-rise space-y-6 select-none">
      <PageHeader title="Focus" seal="集中" subtitle={description} motif="wave">
        <button
          type="button"
          onClick={() => setShield((s) => !s)}
          aria-pressed={shield}
          className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[0.7rem] font-medium tracking-wide transition-all duration-300 ${
            shield
              ? "border-gold/60 bg-gold/15 text-gold-soft shadow-[0_0_14px_oklch(0.78_0.11_82/20%)]"
              : "border-border/60 bg-surface/40 text-muted-foreground hover:border-gold/40"
          }`}
        >
          <KabutoIcon className="size-3.5" aria-hidden />
          {shield
            ? distraction.breaks === 0
              ? "Shield on · unbroken"
              : `Shield on · ${distraction.breaks} left`
            : "Shield off"}
        </button>
      </PageHeader>

      <section aria-label="Focus statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Timer */}
        <Panel as="section" className="relative overflow-hidden p-8">
          <InkArt
            motif="mountains"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full text-gold-dim/10"
          />
          <div className="relative flex flex-col items-center">
            <PanelLabel>
              {preset.label} — {preset.detail}
            </PanelLabel>

            {/* Where you are in the work → rest cycle */}
            <div className="mb-5 flex items-center gap-2" aria-label="Cycle position">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full transition-colors duration-500 ${
                    i < cyclePosition % 4 || (cyclePosition > 0 && cyclePosition % 4 === 0)
                      ? "bg-gold"
                      : "bg-border"
                  }`}
                />
              ))}
              <span className="ml-1.5 text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase">
                {cyclePosition % 4 === 3
                  ? "long rest next"
                  : `block ${(cyclePosition % 4) + 1} of 4`}
              </span>
            </div>

            <EnsoRing
              value={progress}
              size={260}
              stroke={8}
              label={`${Math.round(progress)} percent of the session elapsed`}
              className={running ? "animate-glow" : ""}
            >
              <div className="text-center">
                <p className="font-display text-6xl leading-none tabular-nums text-gilded">
                  {formatClock(secondsLeft)}
                </p>
                <p className="mt-3 text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase">
                  {running ? "In Progress" : secondsLeft === 0 ? "Complete" : "Ready"}
                </p>
                {elapsed > 0 && (
                  <p className="mt-1.5 text-[0.58rem] tabular-nums text-gold-dim/80">
                    {Math.floor(elapsed / 60)}m worked
                    {preset.rest
                      ? " · rest earns nothing"
                      : ` · +${Math.max(
                          1,
                          Math.round(
                            focusXpFor(minutesToday, Math.floor(elapsed / 60)) *
                              (shield
                                ? focusQuality(
                                    elapsed,
                                    distraction.awaySeconds,
                                    distraction.breaks,
                                  ) / 100
                                : 1),
                          ),
                        )} XP`}
                  </p>
                )}
                {shield && !preset.rest && elapsed > 0 && (
                  <p className="mt-1 text-[0.55rem] tracking-[0.14em] text-muted-foreground uppercase">
                    {distraction.breaks === 0
                      ? "Presence 100%"
                      : `Presence ${focusQuality(elapsed, distraction.awaySeconds, distraction.breaks)}% · ${distraction.breaks} away`}
                  </p>
                )}
              </div>
            </EnsoRing>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={toggleRunning}
                disabled={secondsLeft === 0}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft px-7 text-[0.7rem] font-bold tracking-[0.16em] text-primary-foreground uppercase shadow-[0_0_20px_oklch(0.78_0.11_82/25%)] transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
                {running ? "Pause" : "Begin"}
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  distraction.reset();
                }}
                className="grid size-11 cursor-pointer place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors duration-300 hover:border-gold/50 hover:text-gold"
                title="Reset — discards this session"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                onClick={endEarly}
                disabled={elapsed < 60}
                className="grid size-11 cursor-pointer place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors duration-300 hover:border-gold/50 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                title="Finish now and bank the minutes worked"
              >
                <SkipForward className="size-4" />
              </button>
            </div>

            <div className="mt-8 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
              {presets.map((p) => {
                const active = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    aria-pressed={active}
                    className={`group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${
                      active
                        ? "border-gold/60 bg-gold/12 shadow-[0_0_14px_oklch(0.78_0.11_82/18%)]"
                        : "border-border/50 bg-background/30 hover:border-gold/35"
                    }`}
                  >
                    <span
                      className={`font-display text-base leading-none ${active ? "text-gold" : "text-gold-dim/70 group-hover:text-gold"}`}
                    >
                      {p.kanji}
                    </span>
                    <span className="text-[0.62rem] font-medium text-foreground">{p.label}</span>
                    <span className="text-[0.55rem] tracking-[0.12em] text-muted-foreground uppercase">
                      {p.minutes} min
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          {/* Focus target — today's actual planned tasks */}
          <Panel as="section" className="p-6">
            <PanelLabel>Focusing On</PanelLabel>
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground italic">
                No tasks planned for today yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => {
                  const active = task.id === (activeTask?.id ?? null);
                  const Icon = iconFor[task.iconKey] ?? iconFor.study;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => setTaskId(task.id)}
                        aria-pressed={active}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          active
                            ? "border-gold/55 bg-gold/10"
                            : "border-border/50 bg-background/30 hover:border-gold/30"
                        }`}
                      >
                        <Icon
                          className={`size-4 shrink-0 ${active ? "text-gold" : "text-muted-foreground"}`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {task.title}
                          </span>
                          <span className="block truncate text-[0.6rem] text-muted-foreground">
                            {task.description}
                          </span>
                        </span>
                        {active && (
                          <span className="shrink-0 text-[0.55rem] tracking-[0.14em] text-gold uppercase">
                            Active
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Session log — straight from the ledger */}
          <Panel as="section" className="p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
              <PanelLabel className="mb-0">Today&apos;s Sessions</PanelLabel>
              <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
                {todaysSessions.length} logged
              </span>
            </div>
            {todaysSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground italic">
                No sessions yet. Begin the first one.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {[...todaysSessions].reverse().map((entry) => (
                  <li
                    key={entry.ref}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/25 px-3 py-2.5"
                  >
                    <TeaIcon className="size-3.5 shrink-0 text-gold-dim" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.7rem] font-medium text-foreground">
                        {entry.label}
                      </span>
                      <span className="block truncate text-[0.58rem] text-muted-foreground">
                        +{entry.xp} XP
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="font-display block text-xs tabular-nums text-gold-soft">
                        {entry.minutes}m
                      </span>
                      <span className="block text-[0.55rem] tabular-nums text-muted-foreground">
                        {new Date(entry.at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {today && <SeriesTracker today={today} />}

      <footer className="flex items-center justify-center gap-3 pt-1 pb-4">
        <p className="font-display text-[0.72rem] tracking-widest text-muted-foreground italic">
          一点集中 — Concentrate on a single point, and the world grows quiet.
        </p>
        <SealStamp characters="集中" size="sm" />
      </footer>
    </div>
  );
}
