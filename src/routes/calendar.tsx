import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ClockIcon } from "@/components/mission/JapaneseIcons";
import { InkArt } from "@/components/mission/InkArt";
import { PageHeader } from "@/components/mission/PageHeader";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { SealStamp } from "@/components/mission/SealStamp";
import {
  deriveCalendar,
  groupByDay,
  type CalendarCategory,
  type CalendarEntry,
} from "@/data/calendar";
import { dayKey } from "@/data/daily";
import { useActivity } from "@/hooks/use-activity";
import { useDayPlan } from "@/hooks/use-day-plan";
import { useMissionsRead } from "@/hooks/use-missions-read";

const title = "Calendar — Mission Control";
const description = "A calm month view of commitments and focus blocks.";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CalendarPage,
});

const categories: Record<CalendarCategory, { label: string; dot: string; text: string }> = {
  study: { label: "Study", dot: "bg-gold", text: "text-gold" },
  training: { label: "Training", dot: "bg-emerald-500/80", text: "text-emerald-400" },
  project: { label: "Projects", dot: "bg-sky-500/80", text: "text-sky-400" },
  personal: { label: "Personal", dot: "bg-rose-500/70", text: "text-rose-400" },
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** `YYYY-MM-DD` for a day number in the viewed month. */
function keyFor(year: number, month: number, day: number): string {
  return `${year}-${`${month + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function CalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { events } = useActivity();
  const { plans } = useDayPlan(null);
  const { missions } = useMissionsRead();

  useEffect(() => {
    setMounted(true);
    setSelectedDay(new Date().getDate());
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const today = new Date();
  const viewingCurrentMonth = mounted && today.getFullYear() === year && today.getMonth() === month;

  const grid = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday-first offset: JS getDay() is Sunday-first.
    const leading = (firstOfMonth.getDay() + 6) % 7;

    const cells: (number | null)[] = Array.from({ length: leading }, () => null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  /**
   * The month's contents, folded out of the ledger, the day plans and mission
   * due dates. Nothing here is stored — change any of those three and this
   * follows automatically.
   */
  const entriesByDay = useMemo(() => {
    if (!mounted) return new Map<string, CalendarEntry[]>();
    return groupByDay(deriveCalendar({ events, plans, missions, today: dayKey(new Date()), year }));
  }, [mounted, events, plans, missions, year]);

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedEvents =
    selectedDay !== null ? (entriesByDay.get(keyFor(year, month, selectedDay)) ?? []) : [];

  /** Everything still ahead in the viewed month, soonest first. */
  const upcoming = useMemo(() => {
    const todayKey = dayKey(new Date());
    const out: (CalendarEntry & { dayNumber: number })[] = [];
    for (const [day, list] of entriesByDay) {
      if (!day.startsWith(`${year}-${`${month + 1}`.padStart(2, "0")}`)) continue;
      if (day < todayKey) continue;
      for (const entry of list) {
        if (entry.happened) continue;
        out.push({ ...entry, dayNumber: Number(day.slice(8)) });
      }
    }
    return out
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99"),
      )
      .slice(0, 5);
  }, [entriesByDay, year, month]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  return (
    <div className="animate-rise space-y-6 select-none">
      <PageHeader title="Calendar" seal="暦" subtitle={description} motif="pine" />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Month grid */}
        <Panel as="section" className="relative overflow-hidden p-6">
          <InkArt
            motif="mountains"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-gold-dim/8"
          />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl leading-none text-foreground">
                {mounted ? monthLabel : ""}
              </h2>
              <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-surface/40 p-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-gold"
                  title="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="cursor-pointer rounded-md px-3 py-1 text-[0.62rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:bg-surface-raised hover:text-foreground"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-gold"
                  title="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekdayLabels.map((day) => (
                <div
                  key={day}
                  className="pb-2 text-center text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase"
                >
                  {day}
                </div>
              ))}

              {grid.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-[5.5rem] rounded-lg" />;
                }

                const dayEvents = entriesByDay.get(keyFor(year, month, day)) ?? [];
                const isToday = viewingCurrentMonth && day === today.getDate();
                const isSelected = day === selectedDay;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`group flex min-h-[5.5rem] cursor-pointer flex-col gap-1 rounded-lg border p-2 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-gold/40 ${
                      isSelected ? "border-gold/60 bg-gold/10" : "border-border/40 bg-background/25"
                    }`}
                  >
                    <span
                      className={`font-display text-sm leading-none tabular-nums ${
                        isToday
                          ? "grid size-6 place-items-center rounded-full bg-gold text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map((event, i) => (
                        <span
                          key={`${event.time}-${event.label}-${i}`}
                          className="flex items-center gap-1"
                        >
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${categories[event.category].dot} ${
                              event.happened ? "" : "opacity-45"
                            }`}
                            aria-hidden
                          />
                          <span className="truncate text-[0.55rem] text-muted-foreground">
                            {event.label}
                          </span>
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[0.52rem] text-gold-dim">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <ul className="mt-5 flex flex-wrap items-center gap-4 border-t border-border/40 pt-4">
              {Object.entries(categories).map(([key, { label, dot }]) => (
                <li key={key} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${dot}`} aria-hidden />
                  <span className="text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <div className="space-y-5">
          {/* Selected day schedule */}
          <Panel as="section" className="p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
              <PanelLabel className="mb-0">
                {selectedDay ? `Day ${selectedDay}` : "Select a day"}
              </PanelLabel>
              <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
                {selectedEvents.length} block{selectedEvents.length === 1 ? "" : "s"}
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground italic">
                {selectedDay
                  ? "An open day. Rest, or claim it."
                  : "Choose a day to see its focus blocks."}
              </p>
            ) : (
              <ol className="space-y-3">
                {selectedEvents.map((event, i) => (
                  <li key={`${event.time}-${event.label}-${i}`} className="flex items-start gap-3">
                    <span className="font-display w-12 shrink-0 pt-0.5 text-right text-xs tabular-nums text-gold-soft">
                      {event.time ?? "—"}
                    </span>
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${categories[event.category].dot} ${
                        event.happened ? "" : "opacity-45"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-foreground">
                        {event.label}
                      </span>
                      <span
                        className={`block text-[0.58rem] tracking-[0.12em] uppercase ${categories[event.category].text}`}
                      >
                        {categories[event.category].label}
                        <span className="ml-1.5 text-muted-foreground/70 normal-case tracking-normal">
                          {event.happened ? "· done" : "· planned"}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {/* Upcoming */}
          <Panel as="section" className="p-6">
            <PanelLabel>Upcoming This Month</PanelLabel>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground italic">
                Nothing committed for the rest of this month. Plan a day, or give a mission a due
                date.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {upcoming.map((event, i) => (
                  <li
                    key={`${event.day}-${event.label}-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/25 px-3 py-2.5"
                  >
                    <span className="font-display grid size-8 shrink-0 place-items-center rounded-lg border border-gold/35 bg-surface-raised text-[0.7rem] tabular-nums text-gold-soft">
                      {event.dayNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.7rem] font-medium text-foreground">
                        {event.label}
                      </span>
                      <span className="block text-[0.58rem] text-muted-foreground">
                        {categories[event.category].label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[0.58rem] tabular-nums text-muted-foreground">
                      <ClockIcon className="size-3" aria-hidden />
                      {event.time ?? "—"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 pt-1 pb-4">
        <p className="font-display text-[0.72rem] tracking-widest text-muted-foreground italic">
          一期一会 — Every meeting, a once-in-a-lifetime encounter.
        </p>
        <SealStamp characters="暦" size="sm" />
      </footer>
    </div>
  );
}
