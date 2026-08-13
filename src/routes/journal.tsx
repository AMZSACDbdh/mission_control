import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calendar,
  PenTool,
  Check,
  Heart,
  Notebook,
} from "lucide-react";

import { KEYS, readJson, writeJson } from "@/services/store";
import { dayKeyFor, XP } from "@/data/activity";
import { emptyEntry, hasWritten, journalRef, type JournalData } from "@/data/journal";
import { useActivity } from "@/hooks/use-activity";
import { useWeather } from "@/hooks/use-weather";

const title = "Journal — Mission Control";
const description = "A space for reflection. A path to clarity.";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: JournalPage,
});

// Mood definitions
interface MoodState {
  value: number;
  label: string;
  color: string;
}

const MOODS: MoodState[] = [
  { value: 0, label: "Hollow", color: "bg-surface border-border" },
  {
    value: 1,
    label: "Calm",
    color: "bg-gold/20 border-gold/40 shadow-[0_0_4px_rgba(198,162,94,0.1)]",
  },
  {
    value: 2,
    label: "Productive",
    color: "bg-gold/45 border-gold/75 shadow-[0_0_8px_rgba(198,162,94,0.2)]",
  },
  {
    value: 3,
    label: "Energized",
    color: "bg-gold border-gold shadow-[0_0_12px_rgba(198,162,94,0.35)]",
  },
];

function JournalPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const { toggle } = useActivity();
  const weather = useWeather();

  // Date selection state — must use dayKeyFor so it matches the activity system's
  // 04:00 UTC day boundary, not the raw UTC calendar date.
  const [selectedDate, setSelectedDate] = useState(() => dayKeyFor(new Date()));

  // Main entries database
  const [journalDatabase, setJournalDatabase] = useState<Record<string, JournalData>>({});
  const [writeError, setWriteError] = useState<string | null>(null);

  // Sync timing ticking
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);

    void readJson<Record<string, JournalData>>(KEYS.journal, {}).then(setJournalDatabase);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    void (async () => {
      const result = await writeJson(KEYS.journal, journalDatabase);
      setWriteError(result.ok ? null : result.message);
    })();
  }, [journalDatabase, isMounted]);

  // Retrieve data for selected date
  const currentEntry = journalDatabase[selectedDate] ?? emptyEntry();

  /**
   * Writing something earns the journal's XP; emptying the entry takes it back.
   *
   * Keyed on the *entry's* date, so an entry is worth exactly one event however
   * many times it is edited, and backfilling last Tuesday credits last Tuesday.
   * The event's own `day` is still frozen at log time (§2.14) — you did the
   * writing today, and that is what feeds the streak.
   *
   * Deliberately gated on `hasWritten`, not on opening the page or setting a
   * mood: §2.5 permits XP for completed work only.
   */
  useEffect(() => {
    if (!isMounted) return;
    toggle(hasWritten(journalDatabase[selectedDate]), {
      ref: journalRef(selectedDate),
      kind: "journal",
      area: "spirit",
      xp: XP.journal,
      label: `Journal — ${selectedDate}`,
    });
  }, [isMounted, journalDatabase, selectedDate, toggle]);

  // Helper to update specific fields in the database for the selected date.
  // Generic over the field, so the value has to match that field's real type.
  const updateField = <K extends keyof JournalData>(field: K, value: JournalData[K]) => {
    setJournalDatabase((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] ?? emptyEntry()),
        [field]: value,
      },
    }));
  };

  // Bullets lists update
  const updateListField = (field: "gratitudes" | "ideas", index: number, value: string) => {
    const listCopy = [...currentEntry[field]];
    listCopy[index] = value;
    updateField(field, listCopy);
  };

  // Nav dates
  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    setSelectedDate(dayKeyFor(new Date()));
  };

  // Week calculation for Mood Tracker
  const activeDate = new Date(selectedDate);
  const currentDay = activeDate.getDay();
  const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(activeDate);
  monday.setDate(activeDate.getDate() + distanceToMon);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "narrow" }); // M, T, W, etc.
    const isCurrent = dateStr === selectedDate;

    // Get mood for this week day from database
    const dayMood = journalDatabase[dateStr]?.mood || 0;
    return { dateStr, label, mood: dayMood, isCurrent };
  });

  // Cycle mood for a specific date string
  const handleCycleMood = (dateStr: string) => {
    const prevMood = journalDatabase[dateStr]?.mood || 0;
    const nextMood = (prevMood + 1) % MOODS.length;

    setJournalDatabase((prev) => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] ?? emptyEntry()),
        mood: nextMood,
      },
    }));
  };

  // Format headers date
  const displayDateStr = new Date(selectedDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const displayTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="space-y-6 select-none animate-rise min-h-screen text-xs text-foreground/90 relative pb-12">
      {writeError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-800/60 bg-rose-950/25 p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden />
          <p className="text-sm text-rose-200">
            Journal entries are not being saved — {writeError}
          </p>
        </div>
      )}
      {/* Background Subtle Ink Mountains overlay at bottom-left */}
      <svg
        className="absolute bottom-0 left-0 w-full max-w-[360px] h-[150px] opacity-10 pointer-events-none text-gold-dim/40 z-0"
        viewBox="0 0 400 150"
      >
        <path d="M 0,150 Q 80,60 140,110 T 280,30 T 400,150 Z" fill="currentColor" />
        <path
          d="M 50,150 Q 150,90 220,120 T 350,70 T 400,150 Z"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>

      {/* Header section (Matches styling in image) */}
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-border/40 pb-5 z-10 relative">
        <div className="space-y-1">
          <div className="flex items-center gap-3.5">
            <h1 className="font-display text-4xl font-medium tracking-wider text-foreground">
              Journal
            </h1>
            <div className="flex size-6 items-center justify-center rounded border border-red-950/70 bg-red-950/20 text-red-600 font-display text-[0.6rem] font-bold select-none opacity-80 shadow-[0_0_8px_rgba(153,27,27,0.1)]">
              日記
            </div>
          </div>
          <p className="font-display italic text-muted-foreground/80 tracking-widest text-xs">
            A space for reflection. A path to clarity.
          </p>
        </div>

        {/* Date / Time / Weather Widgets */}
        <div className="flex items-center gap-3">
          {/* History Controls */}
          <div className="flex items-center rounded-lg border border-border/50 bg-surface/50 p-1">
            <button
              onClick={handlePrevDate}
              className="flex size-7.5 items-center justify-center rounded-md hover:bg-surface hover:text-gold transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={handleSetToday}
              className="px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-surface/70 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextDate}
              className="flex size-7.5 items-center justify-center rounded-md hover:bg-surface hover:text-gold transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-3.5 rounded-lg border border-border/50 bg-surface/30 px-3.5 py-1.5 shadow-sm">
            <Clock className="size-4 text-gold-soft animate-pulse" />
            <div className="text-right">
              <p className="text-sm font-semibold tracking-wider leading-none">
                {isMounted ? displayTime : ""}
              </p>
              <p className="text-[0.6rem] text-muted-foreground mt-0.5 whitespace-nowrap">
                {isMounted ? displayDateStr : ""}
              </p>
            </div>
            {weather.status !== "error" && (
              <>
                <div className="h-5 w-px bg-border/40" />
                {(() => {
                  const WeatherIcon = weather.icon;
                  return (
                    <WeatherIcon
                      className={`size-4 text-gold-dim ${weather.status === "loading" ? "animate-pulse" : ""}`}
                    />
                  );
                })()}
                <div className="text-left">
                  <p className="text-sm font-semibold leading-none">
                    {weather.temperatureC === null ? "—" : `${weather.temperatureC}°C`}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground mt-0.5 whitespace-nowrap">
                    {weather.status === "loading" ? "Reading the sky" : weather.city}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3D-STYLE LEATHER BOOK CONTAINER LAYOUT */}
      <div className="flex justify-center py-6 px-1 md:px-4 z-10 relative">
        <div className="relative w-full max-w-[1080px]">
          {/* Leather cover frame backing */}
          <div className="absolute inset-0 bg-[#2B1B10] border border-[#1A1009] rounded-3xl shadow-2xl z-0 transform translate-y-1 translate-x-0.5 scale-[1.01]" />

          {/* Left Binder Snap Strap on leather cover */}
          <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-8 h-22 bg-[#2B1B10] rounded-r-2xl border border-l-0 border-[#1A1009] flex items-center justify-center shadow-lg z-0">
            {/* Lotus Seal gold snap button */}
            <div className="size-5 rounded-full bg-gold border border-gold-dim flex items-center justify-center shadow-md animate-pulse">
              <span className="font-display text-[0.45rem] font-bold text-[#1A1009] leading-none">
                庵
              </span>
            </div>
          </div>

          {/* OPEN NOTEBOOK PARCHMENT LAYOUT */}
          <div className="relative rounded-2xl bg-[#F7F1E6] border border-[#D9CDBA]/80 shadow-[inset_0_0_40px_rgba(0,0,0,0.06)] grid grid-cols-1 md:grid-cols-2 p-6 md:p-8 lg:p-10 gap-8 md:gap-12 min-h-[640px] z-10 overflow-hidden">
            {/* Center Gutter Shade Line Overlay */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[24px] bg-gradient-to-r from-transparent via-black/15 to-transparent pointer-events-none z-10" />

            {/* Book Bookmark Ribbon */}
            <div className="absolute left-[calc(50%-5px)] top-0 h-[105%] w-2.5 bg-[#4E2A12] border-r border-[#3A1E0B] shadow-[2px_0_5px_rgba(0,0,0,0.25)] z-10 rounded-b" />

            {/* Sprig of Cherry Blossoms overlay placed elegantly in center spine gutter */}
            <div className="absolute left-[calc(50%-10px)] top-[15%] bottom-[15%] w-5 pointer-events-none z-20 overflow-visible flex items-center justify-center">
              <svg
                className="h-full w-20 overflow-visible filter drop-shadow-[3px_4px_6px_rgba(0,0,0,0.25)]"
                viewBox="0 0 100 600"
                preserveAspectRatio="none"
              >
                {/* Branch */}
                <path
                  d="M 50,0 Q 55,100 45,200 T 52,400 T 48,600"
                  fill="none"
                  stroke="#3A2412"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Small buds branches */}
                <path d="M 51,120 Q 70,110 80,122" fill="none" stroke="#3A2412" strokeWidth="1.8" />
                <path d="M 47,280 Q 25,275 15,290" fill="none" stroke="#3A2412" strokeWidth="1.8" />
                <path d="M 50,420 Q 75,410 85,430" fill="none" stroke="#3A2412" strokeWidth="1.8" />

                {/* Soft gold buds */}
                <circle
                  cx="80"
                  cy="122"
                  r="3.5"
                  fill="#B38A3D"
                  stroke="#D9CDBA"
                  strokeWidth="0.5"
                />
                <circle cx="73" cy="115" r="2.5" fill="#B38A3D" />
                <circle
                  cx="15"
                  cy="290"
                  r="3.5"
                  fill="#B38A3D"
                  stroke="#D9CDBA"
                  strokeWidth="0.5"
                />
                <circle cx="23" cy="281" r="2.5" fill="#B38A3D" />
                <circle
                  cx="85"
                  cy="430"
                  r="3.5"
                  fill="#B38A3D"
                  stroke="#D9CDBA"
                  strokeWidth="0.5"
                />
                <circle cx="78" cy="421" r="2.5" fill="#B38A3D" />
              </svg>
            </div>

            {/* LEFT PAGE OF NOTEBOOK */}
            <div className="space-y-6 flex flex-col justify-between relative pr-2 md:pr-4">
              {/* Corner Bamboo branch illustration in bottom-left */}
              <svg
                className="absolute bottom-[-15px] left-[-15px] size-32 pointer-events-none opacity-[0.06] text-gold-dim"
                viewBox="0 0 100 100"
              >
                <path
                  d="M0,80 Q30,60 50,90 T90,70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M30,70 Q45,50 60,65" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M50,90 Q58,60 65,80" fill="none" stroke="currentColor" strokeWidth="1.2" />
                {/* leaves */}
                <path d="M60,65 Q80,50 90,62 C85,55 70,58 60,65 Z" fill="currentColor" />
                <path d="M65,80 Q85,75 92,85 C84,79 74,80 65,80 Z" fill="currentColor" />
              </svg>

              <div className="space-y-5">
                {/* 1. TODAY'S REFLECTION */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1.5">
                    <PenTool className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-sm font-semibold tracking-wider text-[#2D241B] uppercase">
                      Today's Reflection
                    </h3>
                  </div>
                  <p className="text-[0.62rem] italic text-muted-foreground/75 leading-none pl-1">
                    How was my day?
                  </p>
                  <textarea
                    value={currentEntry.reflection}
                    onChange={(e) => updateField("reflection", e.target.value)}
                    placeholder="Reflect on today's path..."
                    rows={4}
                    className="w-full text-[0.72rem] bg-transparent text-[#2D241B] focus:outline-hidden p-1.5 resize-none leading-[26px] scrollbar-none shadow-none border-0!"
                    style={{
                      backgroundImage:
                        "linear-gradient(transparent 96%, rgba(109, 98, 84, 0.12) 96%)",
                      backgroundSize: "100% 26px",
                    }}
                  />
                </div>

                {/* 2. LESSONS LEARNED */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1.5">
                    <BookOpen className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-sm font-semibold tracking-wider text-[#2D241B] uppercase">
                      Lessons Learned
                    </h3>
                  </div>
                  <p className="text-[0.62rem] italic text-muted-foreground/75 leading-none pl-1">
                    What did I learn today?
                  </p>
                  <textarea
                    value={currentEntry.lessons}
                    onChange={(e) => updateField("lessons", e.target.value)}
                    placeholder="Log insights or mistakes to cultivate craft..."
                    rows={3}
                    className="w-full text-[0.72rem] bg-transparent text-[#2D241B] focus:outline-hidden p-1.5 resize-none leading-[26px] scrollbar-none shadow-none border-0!"
                    style={{
                      backgroundImage:
                        "linear-gradient(transparent 96%, rgba(109, 98, 84, 0.12) 96%)",
                      backgroundSize: "100% 26px",
                    }}
                  />
                </div>

                {/* 3. GRATITUDE */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1.5">
                    <Heart className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-sm font-semibold tracking-wider text-[#2D241B] uppercase">
                      Gratitude
                    </h3>
                  </div>
                  <p className="text-[0.62rem] italic text-muted-foreground/75 leading-none pl-1">
                    What am I grateful for today?
                  </p>
                  <div className="space-y-2 pt-1 pl-1">
                    {currentEntry.gratitudes.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 border-b border-[#D9CDBA]/40 pb-1 font-sans"
                      >
                        <span className="text-gold-dim font-bold font-display">•</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateListField("gratitudes", idx, e.target.value)}
                          placeholder={`Grateful item ${idx + 1}...`}
                          className="w-full text-[0.7rem] bg-transparent text-[#2D241B] focus:outline-hidden border-0! p-0! shadow-none!"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. TOMORROW'S INTENTION */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1.5">
                    <Sparkles className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-sm font-semibold tracking-wider text-[#2D241B] uppercase">
                      Tomorrow's Intention
                    </h3>
                  </div>
                  <p className="text-[0.62rem] italic text-muted-foreground/75 leading-none pl-1">
                    What is my focus for tomorrow?
                  </p>
                  <textarea
                    value={currentEntry.intention}
                    onChange={(e) => updateField("intention", e.target.value)}
                    placeholder="Formulate tomorrow's resolve..."
                    rows={2}
                    className="w-full text-[0.72rem] bg-transparent text-[#2D241B] focus:outline-hidden p-1.5 resize-none leading-[26px] scrollbar-none shadow-none border-0!"
                    style={{
                      backgroundImage:
                        "linear-gradient(transparent 96%, rgba(109, 98, 84, 0.12) 96%)",
                      backgroundSize: "100% 26px",
                    }}
                  />
                </div>
              </div>

              {/* Red calligraphic seal stamp at bottom left page */}
              <div className="flex justify-between items-end pt-4">
                <span className="text-[0.6rem] text-muted-foreground/40 font-mono tracking-widest uppercase">
                  MC - JOURNAL
                </span>
                <div className="flex size-5.5 items-center justify-center rounded border border-red-900/60 bg-red-950/10 text-red-700 font-display text-[0.45rem] font-bold select-none shadow-[0_0_6px_rgba(153,27,27,0.08)] pointer-events-none">
                  自己
                </div>
              </div>
            </div>

            {/* RIGHT PAGE OF NOTEBOOK */}
            <div className="space-y-6 flex flex-col justify-between pl-2 md:pl-4 relative">
              <div className="space-y-5">
                {/* 1. DAILY NOTES */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1.5">
                    <Notebook className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-sm font-semibold tracking-wider text-[#2D241B] uppercase">
                      Daily Notes
                    </h3>
                  </div>
                  <p className="text-[0.62rem] italic text-muted-foreground/75 leading-none pl-1">
                    Free flow thoughts, notes, and anything on my mind.
                  </p>
                  <textarea
                    value={currentEntry.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Write freeform calligraphy thoughts..."
                    rows={6}
                    className="w-full text-[0.72rem] bg-transparent text-[#2D241B] focus:outline-hidden p-1.5 resize-none leading-[26px] scrollbar-none shadow-none border-0!"
                    style={{
                      backgroundImage:
                        "linear-gradient(transparent 96%, rgba(109, 98, 84, 0.12) 96%)",
                      backgroundSize: "100% 26px",
                    }}
                  />
                </div>

                {/* 2. IDEAS */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1.5">
                    <Sparkles className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-sm font-semibold tracking-wider text-[#2D241B] uppercase">
                      Ideas
                    </h3>
                  </div>
                  <p className="text-[0.62rem] italic text-muted-foreground/75 leading-none pl-1">
                    Ideas that can shape my future.
                  </p>
                  <div className="space-y-2 pt-1 pl-1">
                    {currentEntry.ideas.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 border-b border-[#D9CDBA]/40 pb-1 font-sans"
                      >
                        <span className="text-gold-dim font-bold font-display">•</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateListField("ideas", idx, e.target.value)}
                          placeholder={`Idea draft ${idx + 1}...`}
                          className="w-full text-[0.7rem] bg-transparent text-[#2D241B] focus:outline-hidden border-0! p-0! shadow-none!"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Split Weekly & Monthly progress summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <h4 className="font-display text-[0.68rem] font-bold text-muted-foreground tracking-wider uppercase border-b border-[#D9CDBA] pb-1">
                      Weekly Reflection
                    </h4>
                    <p className="text-[0.55rem] italic text-muted-foreground/70 mb-1">
                      My progress this week
                    </p>
                    <textarea
                      value={currentEntry.weekly}
                      onChange={(e) => updateField("weekly", e.target.value)}
                      placeholder="Reflect on weekly trajectory..."
                      rows={2}
                      className="w-full text-[0.65rem] bg-transparent text-[#2D241B] focus:outline-hidden p-1 resize-none leading-5 shadow-none border-0!"
                      style={{
                        backgroundImage:
                          "linear-gradient(transparent 95%, rgba(109, 98, 84, 0.12) 95%)",
                        backgroundSize: "100% 20px",
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display text-[0.68rem] font-bold text-muted-foreground tracking-wider uppercase border-b border-[#D9CDBA] pb-1">
                      Monthly Reflection
                    </h4>
                    <p className="text-[0.55rem] italic text-muted-foreground/70 mb-1">
                      Growth this month
                    </p>
                    <textarea
                      value={currentEntry.monthly}
                      onChange={(e) => updateField("monthly", e.target.value)}
                      placeholder="Reflect on monthly metrics..."
                      rows={2}
                      className="w-full text-[0.65rem] bg-transparent text-[#2D241B] focus:outline-hidden p-1 resize-none leading-5 shadow-none border-0!"
                      style={{
                        backgroundImage:
                          "linear-gradient(transparent 95%, rgba(109, 98, 84, 0.12) 95%)",
                        backgroundSize: "100% 20px",
                      }}
                    />
                  </div>
                </div>

                {/* 3. MOOD TRACKER */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 border-b border-[#D9CDBA] pb-1">
                    <Calendar className="size-3.5 text-gold-dim" />
                    <h3 className="font-display text-[0.68rem] font-bold tracking-wider text-[#2D241B] uppercase">
                      Mood Tracker
                    </h3>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5">
                    {weekDays.map((day) => {
                      // A stored mood outside the known range falls back to the
                      // first, rather than rendering undefined.
                      const activeMood = MOODS[day.mood] ?? MOODS[0]!;
                      return (
                        <div
                          key={day.dateStr}
                          onClick={() => handleCycleMood(day.dateStr)}
                          className="flex flex-col items-center gap-1 cursor-pointer group"
                        >
                          {/* Mood Circle */}
                          <div
                            title={`${day.dateStr}: ${activeMood.label}`}
                            className={`size-4.5 rounded-full border transition-all duration-300 group-hover:scale-115 ${
                              activeMood.color
                            } ${day.isCurrent ? "ring-2 ring-gold/60 ring-offset-2 ring-offset-[#F7F1E6]" : ""}`}
                          />
                          <span
                            className={`text-[0.58rem] font-bold ${day.isCurrent ? "text-gold font-black" : "text-muted-foreground/60"}`}
                          >
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Quote & Red seal stamp */}
              <div className="border-t border-[#D9CDBA] pt-4.5 flex flex-col justify-center items-center text-center space-y-1 relative">
                <p className="font-display text-[#2D241B] text-[0.78rem] font-medium leading-none">
                  日々鍛錬、一生成長
                </p>
                <p className="font-sans text-muted-foreground/80 text-[0.58rem] tracking-wider uppercase font-semibold">
                  Train every day. Grow for a lifetime.
                </p>

                {/* Small red calligraphy seal */}
                <div className="absolute right-1 bottom-0 flex size-5.5 items-center justify-center rounded border border-red-900/60 bg-red-950/10 text-red-700 font-display text-[0.45rem] font-bold select-none shadow-[0_0_6px_rgba(153,27,27,0.08)] pointer-events-none">
                  日記
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
