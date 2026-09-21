import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { EnsoRing } from "@/components/mission/EnsoRing";
import { InkArt } from "@/components/mission/InkArt";
import { PageHeader } from "@/components/mission/PageHeader";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { SealStamp } from "@/components/mission/SealStamp";
import { StatTile } from "@/components/mission/StatTile";
import {
  BambooIcon,
  CheckIcon,
  FlameIcon,
  HourglassIcon,
  KatanaIcon,
  LotusIcon,
  MoonIcon,
} from "@/components/mission/JapaneseIcons";
import { useNow } from "@/hooks/use-now";
import { useActivity } from "@/hooks/use-activity";
import { dayKey } from "@/data/daily";
import { eventsOfKind, XP } from "@/data/activity";
import {
  defaultExercises,
  isSessionComplete,
  sessionForDay,
  sessionsInLast,
  sessionsByWeek,
  trainingStreak,
  workoutRef,
  type Exercise,
  type FitnessStore,
  type SessionCursor,
} from "@/data/fitness";
import { KEYS, readJson, writeJson } from "@/services/store";

const title = "Fitness — Mission Control";
const description = "Forge the body. The mind follows.";

export const Route = createFileRoute("/fitness")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: FitnessPage,
});

/**
 * The weekly split itself is a plan, not a record — which day is *today* is not.
 * That was hardcoded to Thursday, so the highlight lied six days out of seven.
 */
const weekSplit = [
  { day: "Mon", kanji: "力", focus: "Lower Strength" },
  { day: "Tue", kanji: "上", focus: "Upper Push" },
  { day: "Wed", kanji: "走", focus: "Zone 2 Run" },
  { day: "Thu", kanji: "引", focus: "Upper Pull" },
  { day: "Fri", kanji: "力", focus: "Lower Power" },
  { day: "Sat", kanji: "動", focus: "Mobility" },
  { day: "Sun", kanji: "休", focus: "Full Rest" },
];

/** Monday-first index of the day the user is actually living in. */
function weekdayIndex(now: Date): number {
  return (now.getDay() + 6) % 7;
}

/**
 * Past days read as done, the current day as today, the rest as upcoming — with
 * rest days always reading as rest. Derived from the real clock every render.
 */
function splitState(index: number, todayIndex: number, focus: string): string {
  // Today wins over rest: a rest day is still where you are in the week, and
  // the card already says "Full Rest", so nothing is misrepresented.
  if (index === todayIndex) return "today";
  if (focus === "Full Rest") return "rest";
  return index < todayIndex ? "done" : "upcoming";
}

/**
 * Body metrics have no source. Nothing in the app weighs you, reads your heart
 * rate or watches you sleep, so these read "—" until something does. They used
 * to show 74.2 kg, 14.8%, 54 bpm and 7.4 hrs — numbers with no origin at all.
 */
const bodyMetrics = [
  { label: "Weight", unit: "kg" },
  { label: "Body Fat", unit: "%" },
  { label: "Resting HR", unit: "bpm" },
  { label: "Sleep Avg", unit: "hrs" },
];

const stateStyles: Record<string, string> = {
  done: "border-emerald-800/50 bg-emerald-950/20 text-emerald-400",
  today: "border-gold bg-gold/15 text-gold-soft shadow-[0_0_16px_oklch(0.78_0.11_82/22%)]",
  upcoming: "border-border/50 bg-background/30 text-muted-foreground",
  rest: "border-border/40 bg-background/20 text-muted-foreground/60",
};

function FitnessPage() {
  const { events, stats: mastery, toggle } = useActivity();

  // Null on the server, so the split renders with no day highlighted rather
  // than with the server's weekday, which would not survive hydration.
  const now = useNow(60 * 60 * 1000);
  const todayIndex = now === null ? -1 : weekdayIndex(now);
  const today = now ? dayKey(now) : null;

  const [exercises, setExercises] = useState<Exercise[]>(defaultExercises);
  const [session, setSession] = useState<SessionCursor | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readJson<FitnessStore | null>(KEYS.fitness, null).then((saved) => {
      if (cancelled) return;
      if (saved?.exercises?.length) setExercises(saved.exercises);
      setSession(saved?.session ?? null);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      const result = await writeJson(KEYS.fitness, { exercises, session } satisfies FitnessStore);
      setWriteError(result.ok ? null : result.message);
    })();
  }, [exercises, session, hydrated]);

  // A cursor from an earlier day is not today's session — the day starts empty.
  const todaySession = today ? sessionForDay(session, today) : null;
  const doneIds = todaySession?.doneIds ?? [];

  /**
   * A functional update, so ticking several exercises in one go cannot lose
   * any of them — React batches state updates, and reading `session` from the
   * closure would make every tick in a batch see the same stale list.
   */
  const toggleExercise = (id: string) => {
    if (!today) return;
    setSession((prev) => {
      const current = sessionForDay(prev, today);
      return {
        day: today,
        doneIds: current.doneIds.includes(id)
          ? current.doneIds.filter((x) => x !== id)
          : [...current.doneIds, id],
      };
    });
  };

  /**
   * Finishing every exercise logs the session — one `workout` event for the
   * day, at the rate the economy already froze. Unticking reverses it by
   * removing the event, never by compensating for it (§2.6).
   *
   * Driven from the session rather than from the click, so the ledger always
   * agrees with what is actually ticked however the ticks arrived.
   */
  useEffect(() => {
    if (!hydrated || !today) return;
    toggle(isSessionComplete(exercises, sessionForDay(session, today).doneIds), {
      ref: workoutRef(today),
      kind: "workout",
      area: "body",
      xp: XP.workout,
      label: "Training session",
    });
  }, [hydrated, today, session, exercises, toggle]);

  const doneCount = doneIds.length;
  const sessionProgress =
    exercises.length === 0 ? 0 : Math.round((doneCount / exercises.length) * 100);

  /**
   * Every tile below is folded out of the ledger.
   *
   * They previously read 4 sessions, a 23-day streak, 18.4k kg moved and 82%
   * recovery — none of which came from anywhere. Two of those had no possible
   * source at all: nothing records the weight you lift, and nothing measures
   * recovery. They are replaced by things that are true.
   */
  const iconClass = "size-5";
  const bodyForm = mastery.form.find((f) => f.area === "body");
  const sessionsThisWeek = today ? sessionsInLast(events, today, 7) : 0;
  const streak = today ? trainingStreak(events, today) : 0;
  const lifetimeSessions = eventsOfKind(events, "workout").length;

  const stats = [
    {
      label: "Sessions",
      value: `${sessionsThisWeek}`,
      caption: sessionsThisWeek === 0 ? "none this week yet" : "this week",
      icon: <KatanaIcon className={iconClass} />,
    },
    {
      label: "Training Streak",
      value: `${streak}`,
      unit: streak === 1 ? "day" : "days",
      caption: streak === 0 ? "start one today" : "unbroken",
      icon: <FlameIcon className={iconClass} />,
    },
    {
      label: "Sessions Logged",
      value: lifetimeSessions === 0 ? "—" : `${lifetimeSessions}`,
      caption: "lifetime",
      icon: <BambooIcon className={iconClass} />,
    },
    {
      label: "Body Form",
      value: `${bodyForm?.percent ?? 0}`,
      unit: "%",
      caption: "rolling 30 days",
      icon: <LotusIcon className={iconClass} />,
    },
  ];

  const volumeByWeek = today ? sessionsByWeek(events, today, 6) : [];
  const maxVolume = Math.max(1, ...volumeByWeek.map((v) => v.value));

  const todayFocus = todayIndex >= 0 ? weekSplit[todayIndex]?.focus : null;

  return (
    <div className="animate-rise space-y-6 select-none">
      <PageHeader title="Fitness" seal="鍛錬" subtitle={description} motif="pine" />
      {writeError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-800/60 bg-rose-950/25 p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden />
          <p className="text-sm text-rose-200">Training data is not being saved — {writeError}</p>
        </div>
      )}

      <section
        aria-label="Training statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </section>

      {/* Weekly split */}
      <Panel as="section" className="relative overflow-hidden p-6">
        <InkArt
          motif="wave"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-gold-dim/8"
        />
        <div className="relative">
          <PanelLabel>Training Split</PanelLabel>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {weekSplit.map(({ day, kanji, focus }, i) => {
              const state = splitState(i, todayIndex, focus);
              return (
                <li
                  key={day}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 ${stateStyles[state]}`}
                >
                  <span className="text-[0.55rem] tracking-[0.2em] uppercase opacity-80">
                    {day}
                  </span>
                  <span className="font-display text-xl leading-none">{kanji}</span>
                  <span className="text-[0.6rem] leading-tight font-medium">{focus}</span>
                  {state === "today" && (
                    <span className="text-[0.5rem] tracking-[0.16em] text-gold uppercase">
                      Today
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Today's session */}
        <Panel as="section" className="p-6">
          <div className="mb-5 flex items-center justify-between border-b border-border/40 pb-3">
            <PanelLabel className="mb-0">Today{todayFocus ? ` — ${todayFocus}` : ""}</PanelLabel>
            <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
              {doneCount} / {exercises.length} done
            </span>
          </div>

          <ul className="space-y-2.5">
            {exercises.map((exercise) => {
              const done = doneIds.includes(exercise.id);
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => toggleExercise(exercise.id)}
                    aria-pressed={done}
                    className={`group flex w-full cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${
                      done
                        ? "border-gold/40 bg-gold/8"
                        : "border-border/50 bg-background/30 hover:border-gold/30"
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                        done
                          ? "border-gold bg-gold/25 text-gold"
                          : "border-border/60 text-transparent group-hover:border-gold/50"
                      }`}
                      aria-hidden
                    >
                      <CheckIcon className="size-3.5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          done
                            ? "text-muted-foreground line-through decoration-gold/50"
                            : "text-foreground"
                        }`}
                      >
                        {exercise.name}
                      </span>
                      <span className="block text-[0.62rem] text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps} reps
                      </span>
                    </span>

                    <span className="font-display shrink-0 text-sm tabular-nums text-gold-soft">
                      {exercise.weight}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-border/40 pt-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-accent/60">
              <div
                className="h-full rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${sessionProgress}%` }}
              />
            </div>
            <p className="mt-2 flex items-center justify-between text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
              <span className="flex items-center gap-1.5">
                <HourglassIcon className="size-3" aria-hidden />
                Est. 60 minutes
              </span>
              <span>{sessionProgress}% complete</span>
            </p>
          </div>
        </Panel>

        <div className="space-y-5">
          {/* Readiness */}
          <Panel as="section" className="relative overflow-hidden p-6">
            <InkArt
              motif="moon"
              className="pointer-events-none absolute inset-x-0 -top-2 h-32 w-full text-gold-dim/10"
            />
            <div className="relative flex flex-col items-center text-center">
              <PanelLabel>Recovery Readiness</PanelLabel>
              <EnsoRing value={82} size={128} stroke={6} label="82 percent recovery readiness">
                <span className="text-center">
                  <span className="font-display block text-2xl leading-none text-gilded">82%</span>
                  <span className="mt-1 block text-[0.5rem] tracking-[0.18em] text-muted-foreground uppercase">
                    Ready
                  </span>
                </span>
              </EnsoRing>
              <p className="mt-4 flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                <MoonIcon className="size-3 text-gold-dim" aria-hidden />
                7h 24m sleep · HRV steady
              </p>
              <p className="font-display mt-3 border-t border-border/40 pt-3 text-[0.68rem] text-muted-foreground italic">
                Train hard. Recover harder.
              </p>
            </div>
          </Panel>

          {/* Body metrics */}
          <Panel as="section" className="p-6">
            <PanelLabel>Body Metrics</PanelLabel>
            <p className="mb-3 text-[0.62rem] leading-relaxed text-muted-foreground/70">
              Not tracked yet — Mission Control has no way to measure these.
            </p>
            <dl className="grid grid-cols-2 gap-3">
              {bodyMetrics.map(({ label, unit }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/40 bg-background/25 p-3"
                >
                  <dt className="text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="font-display mt-1.5 text-xl leading-none tabular-nums text-muted-foreground/50">
                    —<span className="ml-1 text-[0.6rem] text-muted-foreground/50">{unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      {/* Volume trend */}
      <Panel as="section" className="p-6">
        <div className="mb-5 flex items-center justify-between border-b border-border/40 pb-3">
          <PanelLabel className="mb-0">Volume Trend</PanelLabel>
          <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
            Sessions · last six weeks
          </span>
        </div>
        <div className="flex h-40 items-end justify-between gap-3">
          {volumeByWeek.map(({ label, value }) => (
            <div key={label} className="group flex h-full flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-12 rounded-t-md bg-linear-to-t from-gold-dim/40 to-gold/70 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:from-gold-dim/60 group-hover:to-gold"
                  style={{ height: `${(value / maxVolume) * 100}%` }}
                />
                <span className="absolute -top-1 text-[0.55rem] tabular-nums text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {value}
                </span>
              </div>
              <span className="text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <footer className="flex items-center justify-center gap-3 pt-1 pb-4">
        <p className="font-display text-[0.72rem] tracking-widest text-muted-foreground italic">
          鉄は熱いうちに打て — Strike while the iron is hot.
        </p>
        <SealStamp characters="鍛錬" size="sm" />
      </footer>
    </div>
  );
}
