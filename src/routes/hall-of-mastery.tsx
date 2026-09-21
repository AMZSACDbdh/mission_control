import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BalanceIcon,
  BookIcon,
  ClockIcon,
  EnsoIcon,
  FlameIcon,
  KabutoIcon,
  KamonIcon,
  MatoIcon,
  MoonIcon,
  PathIcon,
  SealIcon,
  StoneIcon,
  SunriseIcon,
  TrendIcon,
} from "@/components/mission/JapaneseIcons";

import { Collections, MenkyoShelf } from "@/components/mission/Collections";
import { EnsoRing } from "@/components/mission/EnsoRing";
import { InkArt } from "@/components/mission/InkArt";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { SealStamp } from "@/components/mission/SealStamp";
import { useCountUp } from "@/hooks/use-count-up";
import { useActivity } from "@/hooks/use-activity";
import { useProgression } from "@/hooks/use-progression";
import { bestDay, eventsOfKind, sumMinutes } from "@/data/activity";
import {
  buildStatsTimeline,
  firstDayMeeting,
  formatDay,
  milestones as milestoneDefs,
  seals as sealDefs,
  type EarnContext,
} from "@/data/achievements";

const title = "Hall of Mastery — Mission Control";
const description = "A record of discipline. A reflection of the path.";

export const Route = createFileRoute("/hall-of-mastery")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: HallOfMasteryPage,
});

/** Achievement badges, unlocked by the same real statistics as the seals. */
const achievementDefs = [
  { name: "Discipline Defender", icon: KabutoIcon, requirement: "7-day streak", at: 7 },
  { name: "Dawn Warrior", icon: SunriseIcon, requirement: "Log 5 days", at: 5 },
  { name: "Focus Master", icon: MatoIcon, requirement: "10 hours focused", at: 600 },
  { name: "Silent Practitioner", icon: MoonIcon, requirement: "25 hours focused", at: 1500 },
  { name: "Consistency Champion", icon: FlameIcon, requirement: "30-day streak", at: 30 },
  { name: "Knowledge Seeker", icon: BookIcon, requirement: "Reach level 5", at: 5 },
  { name: "Iron Will", icon: StoneIcon, requirement: "Reach level 10", at: 10 },
  { name: "Path of Growth", icon: TrendIcon, requirement: "Reach level 15", at: 15 },
  { name: "Master of Routine", icon: PathIcon, requirement: "60-day streak", at: 60 },
  { name: "Balanced Warrior", icon: BalanceIcon, requirement: "All five areas at 50%", at: 50 },
] as const;

function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const animated = useCountUp(value);
  return (
    <>
      {animated.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

function SectionHeading({ children, action }: { children: React.ReactNode; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
      <PanelLabel className="mb-0">{children}</PanelLabel>
      {action && (
        <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
          {action}
        </span>
      )}
    </div>
  );
}

function HallOfMasteryPage() {
  const { events, stats } = useActivity();
  // Level, rank and Journey come from the progression engine — the one source.
  const { progression } = useProgression();

  const { longest, focusMinutes, bestXpDay } = stats;
  const currentRank = progression.masterRank;
  const nextRank = progression.nextRank;

  // Everything a predicate can ask about: the fold, plus the level.
  const earned: EarnContext = { ...stats, level: progression.currentLevel };

  /**
   * One replay for the whole page. Every "when was this earned?" answer below
   * reads from this rather than re-folding the ledger per predicate.
   */
  const timeline = useMemo(() => buildStatsTimeline(events), [events]);

  // Rolling 30-day form, not lifetime totals — this ring is a mirror, not a trophy.
  const masteryAreas = stats.form;
  const overall = stats.overallForm;

  const seals = sealDefs.map((seal) => ({ ...seal, unlocked: seal.test(earned) }));
  const sealsUnlocked = seals.filter((s) => s.unlocked).length;
  const sealsTotal = seals.length;

  const workoutCount = eventsOfKind(events, "workout").length;
  const bestFocusDayMinutes = bestDay(eventsOfKind(events, "focus"), (e) => e.minutes ?? 0);
  const bestStudyDayMinutes = bestDay(eventsOfKind(events, "study"), (e) => e.minutes ?? 0);

  const progressToNextRank = nextRank
    ? Math.min(
        100,
        Math.round(
          ((progression.currentLevel - currentRank.fromLevel) /
            Math.max(1, nextRank.fromLevel - currentRank.fromLevel)) *
            100,
        ),
      )
    : 100;

  const lifetimeStats = [
    { label: "Lifetime XP", value: stats.totalXp, unit: "XP Earned", icon: KamonIcon, decimals: 0 },
    { label: "Longest Streak", value: longest, unit: "Days", icon: FlameIcon, decimals: 0 },
    {
      label: "Total Hours",
      value: Math.round((stats.totalMinutes / 60) * 10) / 10,
      unit: "Hours",
      icon: ClockIcon,
      decimals: 1,
    },
    {
      label: "Seals Unlocked",
      value: sealsUnlocked,
      unit: `of ${sealsTotal}`,
      icon: SealIcon,
      decimals: 0,
    },
  ];

  // The journey reads out of the milestone definitions, dated by replay.
  const journey = milestoneDefs.map((m, i) => ({
    kanji: ["始", "歩", "鍛", "武", "道", "力"][i] ?? "未",
    label: m.title,
    detail: m.test(earned) ? formatDay(firstDayMeeting(timeline, m.test)) : m.detail,
    reached: m.test(earned),
  }));

  const milestones = milestoneDefs.map((m) => ({
    title: m.title,
    detail: m.detail,
    date: m.test(earned) ? formatDay(firstDayMeeting(timeline, m.test)) : "Not yet",
    reached: m.test(earned),
  }));

  const achievements = achievementDefs.map((a) => {
    const unlocked =
      a.name === "Discipline Defender" ||
      a.name === "Consistency Champion" ||
      a.name === "Master of Routine"
        ? longest >= a.at
        : a.name === "Dawn Warrior"
          ? stats.activeDayCount >= a.at
          : a.name === "Focus Master" || a.name === "Silent Practitioner"
            ? focusMinutes >= a.at
            : a.name === "Balanced Warrior"
              ? masteryAreas.every((area) => area.percent >= a.at)
              : progression.currentLevel >= a.at;
    return { ...a, unlocked };
  });

  const records = [
    { kanji: "連続", label: "Longest Streak", value: longest, unit: "Days", decimals: 0 },
    { kanji: "極", label: "Most XP In A Day", value: bestXpDay, unit: "XP", decimals: 0 },
    {
      kanji: "集",
      label: "Most Focus Hours",
      value: Math.round((bestFocusDayMinutes / 60) * 10) / 10,
      unit: "Hours",
      decimals: 1,
    },
    {
      kanji: "学",
      label: "Most Study Hours",
      value: Math.round((bestStudyDayMinutes / 60) * 10) / 10,
      unit: "Hours",
      decimals: 1,
    },
    { kanji: "鍛", label: "Workouts Logged", value: workoutCount, unit: "Sessions", decimals: 0 },
  ];

  return (
    <div className="animate-rise space-y-5 select-none">
      <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <header className="relative overflow-hidden">
            <InkArt motif="branch" className="absolute -top-4 right-0 h-28 w-56 text-gold-dim/15" />
            <div className="relative flex items-center gap-3">
              <h1 className="font-display text-4xl leading-none font-medium tracking-wide text-foreground uppercase xl:text-5xl">
                Hall of Mastery
              </h1>
              <SealStamp characters="極意" size="lg" />
            </div>
            <p className="font-display mt-2 text-sm tracking-widest text-muted-foreground italic">
              {description}
            </p>
          </header>

          <section
            aria-label="Lifetime statistics"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {lifetimeStats.map(({ label, value, unit, icon: Icon, decimals }) => (
              <Panel key={label} as="article" className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <PanelLabel className="mb-0 text-[0.55rem] tracking-[0.18em]">{label}</PanelLabel>
                  <Icon className="size-4 shrink-0 text-gold-dim" aria-hidden />
                </div>
                <p className="font-display mt-3 text-3xl leading-none tabular-nums text-gilded">
                  <Counter value={value} decimals={decimals} />
                </p>
                <p className="mt-1.5 text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
                  {unit}
                </p>
              </Panel>
            ))}
          </section>
        </div>

        {/* Rank medallion */}
        <Panel as="aside" className="relative overflow-hidden p-6">
          <InkArt motif="moon" className="absolute inset-x-0 -top-2 h-40 w-full text-gold-dim/12" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative grid size-32 place-items-center">
              <EnsoRing
                value={progressToNextRank}
                size={128}
                stroke={3}
                label={`${progressToNextRank}% toward the next rank`}
                className="absolute inset-0 animate-glow"
              />
              <span className="font-display text-2xl leading-none tracking-[0.1em] text-gilded">
                {currentRank.kanji}
              </span>
            </div>

            <p className="mt-5 text-[0.55rem] tracking-[0.24em] text-muted-foreground uppercase">
              Current Discipline Rank
            </p>
            <p className="font-display mt-1.5 text-3xl leading-none tracking-[0.12em] text-gilded uppercase">
              {currentRank.name}
            </p>
            <p className="mt-2 text-[0.6rem] tracking-[0.2em] text-gold-dim uppercase">
              {currentRank.meaning}
            </p>

            <div className="mt-5 w-full">
              <div className="h-1 w-full overflow-hidden rounded-full bg-accent/60">
                <div
                  className="h-full rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft transition-[width] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${progressToNextRank}%` }}
                />
              </div>
              <p className="mt-2 text-right text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
                {nextRank ? `${progressToNextRank}% to ${nextRank.name}` : "Highest rank held"}
              </p>
            </div>

            <div className="mt-5 flex w-full items-center justify-between border-t border-border/50 pt-4 text-left">
              <div>
                <p className="text-[0.55rem] tracking-[0.22em] text-muted-foreground uppercase">
                  Current Level
                </p>
                <p className="font-display mt-1 text-3xl leading-none text-foreground">
                  {progression.currentLevel}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-sm tracking-[0.16em] text-gold uppercase">
                  {progression.xpIntoLevel.toLocaleString()} XP
                </p>
                <p className="text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
                  of {progression.xpForNextLevel.toLocaleString()} to level{" "}
                  {progression.currentLevel + 1}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Journey timeline */}
      <Panel as="section" className="relative overflow-hidden p-6">
        <InkArt
          motif="mountains"
          className="absolute inset-x-0 bottom-0 h-28 w-full text-gold-dim/10"
        />
        <div className="relative">
          <SectionHeading>Journey Timeline</SectionHeading>
          <ol className="relative grid grid-cols-2 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
            <span
              aria-hidden
              className="absolute top-7 right-6 left-6 hidden h-px bg-linear-to-r from-gold/10 via-gold/40 to-gold/10 lg:block"
            />
            {journey.map(({ kanji, label, detail }, index) => {
              const isFinal = index === journey.length - 1;
              return (
                <li
                  key={label}
                  className="group relative flex flex-col items-center gap-2.5 text-center"
                >
                  <span
                    className={`font-display relative grid size-14 place-items-center rounded-full border text-lg transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 ${
                      isFinal
                        ? "animate-glow border-gold bg-gold/15 text-gold-soft shadow-[0_0_18px_oklch(0.78_0.11_82/30%)]"
                        : "border-gold/45 bg-surface-raised text-gold-soft group-hover:border-gold group-hover:shadow-[0_0_14px_oklch(0.78_0.11_82/25%)]"
                    }`}
                  >
                    {kanji}
                  </span>
                  <span className="text-[0.68rem] leading-tight font-medium text-foreground">
                    {label}
                  </span>
                  <span className="text-[0.58rem] leading-none text-muted-foreground">
                    {detail}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Mastery progress */}
        <Panel as="section" className="p-6">
          <SectionHeading action="Last 30 days">Current Form</SectionHeading>
          <div className="flex items-center gap-6">
            <EnsoRing value={overall} size={120} stroke={6} label={`${overall} percent form`}>
              <span className="text-center">
                <span className="font-display block text-2xl leading-none text-gilded">
                  {overall}%
                </span>
                <span className="mt-1 block text-[0.5rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Form
                </span>
              </span>
            </EnsoRing>

            <dl className="min-w-0 flex-1 space-y-2.5">
              {masteryAreas.map(({ label, percent, daysSinceLast }) => {
                // Fires before the ring visibly drops — a nudge, not a verdict.
                const stale = daysSinceLast !== null && daysSinceLast >= 7;
                return (
                  <div key={label}>
                    <div className="flex items-baseline justify-between text-[0.65rem]">
                      <dt className="text-muted-foreground">
                        {label}
                        {stale && (
                          <span className="ml-1.5 text-gold-dim/80">· {daysSinceLast}d quiet</span>
                        )}
                      </dt>
                      <dd className="font-display tabular-nums text-foreground">{percent}%</dd>
                    </div>
                    <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-accent/60">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-gold-dim to-gold transition-[width] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
          <p className="font-display mt-5 border-t border-border/40 pt-4 text-center text-[0.68rem] text-muted-foreground italic">
            Form is what you are doing now. Rank is what you have done.
          </p>
        </Panel>

        {/* Unlocked seals */}
        <Panel as="section" className="p-6">
          <SectionHeading action="View All">Unlocked Seals</SectionHeading>
          <ul className="grid grid-cols-5 gap-3">
            {seals.map(({ kanji, meaning, unlocked }) => (
              <li key={kanji} className="group relative grid place-items-center">
                <span
                  title={`${meaning}${unlocked ? "" : " — locked"}`}
                  className={`font-display grid size-12 place-items-center rounded-full border text-base transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 ${
                    unlocked
                      ? "border-gold/60 bg-linear-to-br from-gold/25 to-gold-dim/10 text-gold-soft shadow-[0_0_12px_oklch(0.78_0.11_82/18%)] group-hover:border-gold"
                      : "border-border/60 bg-surface-raised/60 text-muted-foreground/40"
                  }`}
                >
                  {kanji}
                </span>
                <span className="mt-1.5 text-center text-[0.5rem] leading-none tracking-[0.08em] text-muted-foreground/70 uppercase">
                  {meaning}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-border/40 pt-4">
            <p className="text-[0.62rem] tracking-[0.12em] text-muted-foreground uppercase">
              {sealsUnlocked} / {sealsTotal} Seals Unlocked
            </p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-accent/60">
              <div
                className="h-full rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft transition-[width] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${Math.round((sealsUnlocked / sealsTotal) * 100)}%` }}
              />
            </div>
          </div>
        </Panel>

        {/* Achievement collection */}
        <Panel as="section" className="p-6">
          <SectionHeading action="View All">Achievement Collection</SectionHeading>
          <ul className="grid grid-cols-5 gap-2.5">
            {achievements.map(({ name, icon: Icon, unlocked }) => (
              <li key={name}>
                <div
                  title={`${name}${unlocked ? "" : " — locked"}`}
                  className={`group flex h-full flex-col items-center gap-2 rounded-lg border p-2.5 text-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 ${
                    unlocked
                      ? "border-gold/35 bg-surface-raised/70 hover:border-gold/70 hover:shadow-[0_0_14px_oklch(0.78_0.11_82/18%)]"
                      : "border-border/50 bg-background/30 opacity-45"
                  }`}
                >
                  <Icon
                    className={`size-5 shrink-0 ${unlocked ? "text-gold" : "text-muted-foreground"}`}
                    aria-hidden
                  />
                  <span className="text-[0.5rem] leading-tight tracking-[0.06em] text-muted-foreground uppercase">
                    {name}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        {/* Major milestones */}
        <Panel as="section" className="relative overflow-hidden p-6">
          <InkArt motif="pine" className="absolute -right-6 -bottom-4 h-32 w-48 text-gold-dim/10" />
          <div className="relative">
            <SectionHeading action="View All">Major Milestones</SectionHeading>
            <ol className="space-y-3">
              {milestones.map(({ title: mTitle, detail, date }, index) => (
                <li key={mTitle} className="group flex items-center gap-4">
                  <span className="font-display grid size-9 shrink-0 place-items-center rounded-full border border-gold/45 bg-surface-raised text-[0.7rem] text-gold-soft transition-colors duration-500 group-hover:border-gold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm leading-none text-foreground">
                      {mTitle}{" "}
                      <span className="text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                        {detail}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.6rem] tabular-nums text-muted-foreground">
                    {date}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>

        {/* Personal records */}
        <Panel as="section" className="p-6">
          <SectionHeading>Personal Records</SectionHeading>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {records.map(({ kanji, label, value, unit, decimals }) => (
              <li
                key={label}
                className="group flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-background/30 p-3 text-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-gold/40"
              >
                <span className="font-display text-base leading-none text-gold-dim/70 transition-colors duration-500 group-hover:text-gold">
                  {kanji}
                </span>
                <span className="text-[0.5rem] leading-tight tracking-[0.08em] text-muted-foreground uppercase">
                  {label}
                </span>
                <span className="font-display text-xl leading-none tabular-nums text-gilded">
                  <Counter value={value} decimals={decimals} />
                </span>
                <span className="text-[0.5rem] tracking-[0.14em] text-muted-foreground/70 uppercase">
                  {unit}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <MenkyoShelf />
      <Collections />

      <footer className="flex items-center justify-center gap-3 pt-2 pb-4">
        <EnsoIcon className="size-3.5 text-gold-dim" aria-hidden />
        <p className="font-display text-[0.72rem] tracking-widest text-muted-foreground italic">
          日々鍛錬、一生成長 — Train every day. Grow for a lifetime.
        </p>
        <SealStamp characters="極意" size="sm" />
      </footer>
    </div>
  );
}
