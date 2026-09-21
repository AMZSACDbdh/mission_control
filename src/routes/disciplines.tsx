import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code, Sparkles, ArrowUpRight } from "lucide-react";
import {
  BookIcon,
  BrushIcon,
  CheckIcon,
  DropIcon,
  LotusIcon,
  MatoIcon,
  PathIcon,
  ScrollIcon,
  StoneIcon,
  SunriseIcon,
} from "@/components/mission/JapaneseIcons";

import { previousDay, XP } from "@/data/activity";
import { useWeather } from "@/hooks/use-weather";
import {
  consistencyOver,
  defaultDisciplines,
  disciplineRef,
  disciplineStreak,
  isDoneOn,
  personalBest,
  streakFor,
  trendOver,
} from "@/data/disciplines";
import { useActivity } from "@/hooks/use-activity";

const title = "Daily Disciplines — Mission Control";
const description = "Train every day. Master yourself.";

export const Route = createFileRoute("/disciplines")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DailyDisciplinesPage,
});

/* Definitions live in @/data/disciplines; completion is a dated ledger entry. */

function DailyDisciplinesPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const [focusMode, setFocusMode] = useState(false);

  const { events, today, toggle } = useActivity();
  const weather = useWeather();
  const WeatherIcon = weather.icon;

  /**
   * Completion is never stored on the discipline. It is a dated ledger entry,
   * so a new day simply has no entries yet — the board resets itself, and
   * yesterday's ticks can never carry over.
   */
  const disciplines = defaultDisciplines.map((d) => ({
    ...d,
    completed: isDoneOn(events, today, d.id),
  }));

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleDiscipline = (id: string) => {
    const discipline = defaultDisciplines.find((d) => d.id === id);
    if (!discipline) return;
    const done = isDoneOn(events, today, id);

    toggle(!done, {
      ref: disciplineRef(today, id),
      kind: "discipline",
      area: discipline.area,
      xp: XP.discipline,
      label: `${discipline.name} — ${discipline.target} ${discipline.unit}`,
    });
  };

  const completedCount = disciplines.filter((d) => d.completed).length;
  const totalCount = disciplines.length;
  const overallPercentage = Math.round((completedCount / totalCount) * 100);

  /* ---- Every figure below is folded from the ledger ---- */
  const weeklyConsistency = consistencyOver(events, today, 7, totalCount);
  const monthlyConsistency = consistencyOver(events, today, 28, totalCount);
  const previousWeek = consistencyOver(events, previousDay(today), 14, totalCount);
  const weeklyDelta = weeklyConsistency - previousWeek;
  const streak = disciplineStreak(events, today);
  const best = personalBest(events);
  const weeklyTrend = trendOver(events, today, 7);
  const monthlyTrend = trendOver(events, today, 28);

  /** Turns daily counts into an SVG polyline across a 200×40 box. */
  const toPath = (points: { count: number }[]) => {
    if (points.length === 0) return { d: "", dots: [] as { x: number; y: number }[] };
    const max = Math.max(1, totalCount);
    const step = points.length > 1 ? 190 / (points.length - 1) : 0;
    const dots = points.map((p, i) => ({
      x: 5 + i * step,
      y: 36 - (Math.min(p.count, max) / max) * 32,
    }));
    return { d: dots.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" "), dots };
  };

  const weeklyChart = toPath(weeklyTrend);
  const monthlyChart = toPath(
    // Four weekly buckets rather than 28 cramped points
    Array.from({ length: 4 }, (_, w) => ({
      count: Math.round(monthlyTrend.slice(w * 7, w * 7 + 7).reduce((s, p) => s + p.count, 0) / 7),
    })),
  );

  const displayTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const displayDate = time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="select-none animate-rise min-h-screen bg-[#F2ECE1] text-[#2D241B] p-4 md:p-6 lg:p-8 rounded-3xl relative overflow-hidden font-sans border border-[#D9CDBA]">
      {/* Background Japanese Ink Mountain Overlay on Bottom-Right */}
      <div className="absolute bottom-0 right-0 w-[450px] h-[220px] pointer-events-none opacity-20 z-0">
        <svg viewBox="0 0 500 250" className="w-full h-full text-[#4F5E4E]">
          <path d="M0,250 Q100,80 200,160 T400,40 T500,250 Z" fill="currentColor" opacity="0.4" />
          <path d="M120,250 Q240,110 320,180 T500,90 Z" fill="currentColor" opacity="0.6" />
        </svg>
      </div>

      {/* Background Bamboo Botanical Ornament on Top-Right */}
      <div className="absolute top-0 right-0 w-[240px] h-[200px] pointer-events-none opacity-15 z-0">
        <svg viewBox="0 0 200 200" className="w-full h-full text-[#4F5E4E]">
          <path d="M150,0 Q130,60 180,120" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M170,30 Q120,80 190,150" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* bamboo leaves */}
          <path d="M135,55 Q115,45 105,58 C115,50 128,52 135,55 Z" fill="currentColor" />
          <path d="M142,75 Q120,70 112,85 C122,78 132,77 142,75 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Right-edge Calligraphy Vertical Ribbon */}
      <div className="absolute right-3 top-28 hidden lg:flex flex-col items-center gap-2 pointer-events-none opacity-70 z-10">
        <span className="font-display text-sm tracking-widest text-[#2D241B] writing-vertical select-none font-medium">
          継続は力なり
        </span>
        <div className="flex size-5 items-center justify-center rounded border border-red-900/60 bg-red-950/20 text-red-700 font-display text-[0.45rem] font-bold shadow-[0_0_6px_rgba(153,27,27,0.15)]">
          継続
        </div>
      </div>

      {/* 1. TOP HEADER */}
      <header className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-start pb-6 border-b border-[#D9CDBA]/60">
        {/* Title & Red Seal Stamp */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl md:text-5xl font-medium tracking-wide text-[#2D241B]">
              Daily Disciplines
            </h1>
            <div className="flex size-6 items-center justify-center rounded border border-red-900/60 bg-red-950/20 text-red-700 font-display text-[0.65rem] font-bold shadow-[0_0_8px_rgba(153,27,27,0.15)]">
              印
            </div>
          </div>
          <p className="font-sans text-xs tracking-wider text-[#6E6254] font-medium">
            Train every day. Master yourself.
          </p>
        </div>

        {/* Right-Side Control Widgets */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Time & Date */}
          <div className="flex items-center gap-2.5">
            <SunriseIcon className="size-4 text-[#B38A3D]" aria-hidden />
            <div>
              <p className="font-semibold text-sm leading-none text-[#2D241B]">
                {isMounted ? displayTime : "07:12 AM"}
              </p>
              <p className="text-[0.62rem] text-[#6E6254] mt-0.5">
                {isMounted ? displayDate : "May 17, 2025"}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-[#D9CDBA]" />

          {/* Weather — real data from the weather hook */}
          <div className="flex items-center gap-2">
            <WeatherIcon className="size-4 text-[#B38A3D]" aria-hidden />
            <div>
              <p className="font-semibold text-xs leading-none text-[#2D241B]">
                {weather.temperatureC === null ? "—" : `${weather.temperatureC}°`}
              </p>
              <p className="text-[0.62rem] text-[#6E6254] mt-0.5">
                {weather.city || weather.condition}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-[#D9CDBA]" />

          {/* Focus Mode Pill Toggle */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer text-xs font-medium shadow-xs ${
              focusMode
                ? "bg-[#4F5E4E] text-[#F2ECE1] border-[#4F5E4E]"
                : "bg-[#F8F5EE] text-[#2D241B] border-[#D9CDBA] hover:border-[#B38A3D]"
            }`}
          >
            <div className="size-3 rounded-full bg-[#B38A3D] flex items-center justify-center">
              <MatoIcon className="size-2.5 text-[#F2ECE1]" aria-hidden />
            </div>
            <span>Focus Mode</span>
          </button>
        </div>
      </header>

      {/* 2. STATISTICS SECTION (4 Cards) */}
      <section
        aria-label="Overview Statistics"
        className="relative z-10 my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Card 1: Weekly Consistency */}
        <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 shadow-xs flex flex-col justify-between h-[130px] hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#6E6254]">
              Weekly Consistency
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-bold text-[#2D241B]">
                {weeklyConsistency}%
              </span>
              <span className="text-[0.65rem] font-semibold text-[#4F5E4E]">
                {weeklyDelta === 0
                  ? "holding steady"
                  : `${weeklyDelta > 0 ? "↑" : "↓"} ${Math.abs(weeklyDelta)}% vs last week`}
              </span>
            </div>
          </div>

          {/* Weekly trend, drawn from real completions */}
          <div className="w-full h-8 pt-1">
            <svg viewBox="0 0 200 40" className="w-full h-full overflow-visible">
              <path
                d={weeklyChart.d}
                fill="none"
                stroke="#4F5E4E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {weeklyChart.dots.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="2.5"
                  fill="#4F5E4E"
                  stroke="#F8F5EE"
                  strokeWidth="1"
                />
              ))}
            </svg>
            <div className="flex justify-between text-[0.55rem] text-[#6E6254] font-medium pt-1">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>TH</span>
              <span>F</span>
              <span>S</span>
              <span>SU</span>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Consistency */}
        <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 shadow-xs flex flex-col justify-between h-[130px] hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#6E6254]">
              Monthly Consistency
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-3xl font-bold text-[#2D241B]">
                {monthlyConsistency}%
              </span>
              <span className="text-[0.65rem] font-semibold text-[#4F5E4E]">across four weeks</span>
            </div>
          </div>

          {/* Monthly trend, four weekly averages from the ledger */}
          <div className="w-full h-8 pt-1">
            <svg viewBox="0 0 200 40" className="w-full h-full overflow-visible">
              <path
                d={monthlyChart.d}
                fill="none"
                stroke="#4F5E4E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {monthlyChart.dots.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="2.5"
                  fill="#4F5E4E"
                  stroke="#F8F5EE"
                  strokeWidth="1"
                />
              ))}
            </svg>
            <div className="flex justify-between text-[0.55rem] text-[#6E6254] font-medium pt-1">
              <span>W1</span>
              <span>W2</span>
              <span>W3</span>
              <span>W4</span>
              <span>W5</span>
            </div>
          </div>
        </div>

        {/* Card 3: Current Streaks */}
        <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 shadow-xs flex items-center justify-between h-[130px] hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#6E6254]">
              Current Streaks
            </p>
            <p className="font-display text-4xl font-bold text-[#2D241B] mt-1">{streak}</p>
            <p className="text-[0.62rem] text-[#6E6254]">
              {streak === 0 ? "begin one today" : streak === 1 ? "day unbroken" : "days unbroken"}
            </p>
          </div>

          {/* Sumi-e Bamboo Circular Ornament */}
          <div className="size-16 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="size-full text-[#4F5E4E]">
              {/* Brush stroke circle */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#D9CDBA" strokeWidth="3" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray="260"
                strokeDashoffset="30"
                strokeLinecap="round"
              />
              {/* Bamboo artwork */}
              <path
                d="M45,70 L45,30 M55,70 L55,30"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M45,50 L55,50 M45,38 L55,38" stroke="currentColor" strokeWidth="1" />
              <path
                d="M45,38 Q35,30 25,35 M55,38 Q65,30 75,35"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Personal Bests */}
        <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 shadow-xs flex items-center justify-between h-[130px] hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#6E6254]">
              Personal Bests
            </p>
            <p className="font-display text-4xl font-bold text-[#2D241B] mt-1">{best}</p>
            <p className="text-[0.62rem] text-[#6E6254]">best disciplines in a single day</p>
          </div>

          {/* Sumi-e Bonsai Circular Ornament */}
          <div className="size-16 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="size-full text-[#4F5E4E]">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#D9CDBA" strokeWidth="3" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray="260"
                strokeDashoffset="15"
                strokeLinecap="round"
              />
              {/* Bonsai artwork */}
              <path
                d="M50,70 Q45,55 35,48 M50,60 Q60,50 68,45"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="33" cy="45" r="9" fill="currentColor" opacity="0.6" />
              <circle cx="68" cy="42" r="8" fill="currentColor" opacity="0.6" />
              <circle cx="50" cy="35" r="10" fill="currentColor" opacity="0.8" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. TODAY'S DISCIPLINES SECTION */}
      <section aria-label="Today's Disciplines" className="relative z-10 my-8 space-y-6">
        {/* Section Header Divider */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-px bg-[#D9CDBA] flex-1" />
            <h2 className="font-display text-sm font-bold tracking-widest text-[#2D241B] uppercase whitespace-nowrap flex items-center gap-2">
              <span className="text-[#B38A3D] text-xs">◆</span> TODAY'S DISCIPLINES{" "}
              <span className="text-[#B38A3D] text-xs">◆</span>
            </h2>
            <div className="h-px bg-[#D9CDBA] flex-1" />
          </div>

          <div className="pl-4 flex items-center gap-1.5 text-xs font-semibold text-[#4F5E4E]">
            <span>
              {completedCount} of {totalCount} Completed
            </span>
            <LotusIcon className="size-4 text-[#B38A3D]" aria-hidden />
          </div>
        </div>

        {/* 8 Discipline Cards (2 Rows of 4 Cards) */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {disciplines.map((item) => {
            const isDone = item.completed;
            const percentage = isDone ? 100 : 0;
            // How many days running this one has been kept — real, from the ledger.
            const ownStreak = streakFor(events, today, item.id);

            // SVG Enso Ring Dimensions
            const ringSize = 110;
            const strokeWidth = 8;
            const radius = (ringSize - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (circumference * percentage) / 100;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleDiscipline(item.id)}
                className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-5 shadow-xs flex flex-col justify-between items-center text-center relative transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group overflow-hidden"
              >
                {/* Background Faint Japanese Corner Motif */}
                <svg
                  className="absolute -bottom-2 -left-2 size-20 text-[#4F5E4E]/5 pointer-events-none"
                  viewBox="0 0 100 100"
                >
                  <path
                    d="M0,50 Q30,20 60,40 T100,20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>

                {/* Title */}
                <h3 className="font-display text-xs font-bold tracking-widest text-[#2D241B] uppercase group-hover:text-[#B38A3D] transition-colors">
                  {item.name}
                </h3>

                {/* Circular Enso Progress Ring */}
                <div className="relative size-28 my-3 flex items-center justify-center">
                  <svg width={ringSize} height={ringSize} className="-rotate-90">
                    {/* Background faint ring */}
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="#EFE6D7"
                      strokeWidth={strokeWidth}
                    />
                    {/* Sumi-e Muted Olive Progress Ring */}
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="#4F5E4E"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  {/* Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center text-[#2D241B]">
                    {item.iconType === "hydration" && (
                      <DropIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                    {item.iconType === "workout" && (
                      <StoneIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                    {item.iconType === "reading" && (
                      <BookIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                    {item.iconType === "meditation" && (
                      <LotusIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                    {item.iconType === "coding" && <Code className="size-7 text-[#4F5E4E]" />}
                    {item.iconType === "study" && (
                      <ScrollIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                    {item.iconType === "journal" && (
                      <BrushIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                    {item.iconType === "walking" && (
                      <PathIcon className="size-7 text-[#4F5E4E]" aria-hidden />
                    )}
                  </div>
                </div>

                {/* Target details */}
                <p className="font-display text-xs font-semibold text-[#2D241B]">
                  {(isDone ? item.target : 0).toLocaleString()} /{" "}
                  {item.target >= 1000 ? `${item.target / 1000}K` : item.target} {item.unit}
                </p>

                {/* Footer elapsed time & completion check badge */}
                <div className="w-full flex justify-between items-center mt-3 pt-2.5 border-t border-[#D9CDBA]/50 text-[0.65rem] text-[#6E6254] font-medium">
                  <span className="flex items-center gap-1">
                    {ownStreak > 0 ? `${ownStreak}-day streak` : "not yet today"}
                  </span>

                  {/* Checkmark circle badge */}
                  <div
                    className={`size-5 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-[#4F5E4E] text-[#F2ECE1] shadow-xs"
                        : "border border-[#D9CDBA] bg-transparent text-transparent"
                    }`}
                  >
                    <CheckIcon className="size-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BOTTOM QUOTE SECTION */}
      <footer className="relative z-10 mt-10 pt-6 border-t border-[#D9CDBA]/60 text-center flex flex-col items-center justify-center space-y-2">
        <blockquote className="max-w-2xl space-y-1.5">
          <p className="font-display italic text-sm md:text-base text-[#2D241B] leading-relaxed">
            <span className="text-[#B38A3D] font-serif text-xl font-bold mr-1">“</span>
            Discipline is choosing between what you want now and what you want most.
          </p>
          <cite className="font-sans text-[0.65rem] uppercase tracking-widest text-[#6E6254] font-bold not-italic">
            — Miyamoto Musashi
          </cite>
        </blockquote>

        {/* Small Red Calligraphy Seal Stamp */}
        <div className="flex size-5 items-center justify-center rounded border border-red-900/60 bg-red-950/20 text-red-700 font-display text-[0.45rem] font-bold shadow-[0_0_6px_rgba(153,27,27,0.15)] pointer-events-none mt-1">
          武士
        </div>
      </footer>
    </div>
  );
}
