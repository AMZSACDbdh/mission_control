import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Mission } from "@/data/missionsData";

interface MissionsCalendarProps {
  missions: Mission[];
  activeMissionId: string | null;
  setActiveMissionId: (id: string | null) => void;
}

export function MissionsCalendar({
  missions,
  activeMissionId,
  setActiveMissionId,
}: MissionsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get the first day of the month
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Get the number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate calendar days
  const days = [];
  // Padding for empty spots before the 1st of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const getMissionsForDay = (date: Date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return missions.filter((m) => m.dueDate === dateStr && !m.archived);
  };

  const isToday = (date: Date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/20 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4.5 text-gold-dim" />
          <h3 className="font-display text-xl font-medium text-foreground tracking-wide">
            {monthName} {year}
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 hover:bg-surface-raised hover:text-foreground transition-all cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={nextMonth}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 hover:bg-surface-raised hover:text-foreground transition-all cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Labels */}
      <div className="grid grid-cols-7 gap-2 text-center text-[0.62rem] font-bold tracking-widest text-gold-dim uppercase">
        {weekdays.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, idx) => {
          const dayMissions = date ? getMissionsForDay(date) : [];
          const currentIsToday = date ? isToday(date) : false;

          return (
            <div
              key={idx}
              className={`min-h-[90px] rounded-xl border p-2 flex flex-col justify-between transition-all duration-300 ${
                date
                  ? currentIsToday
                    ? "border-gold/50 bg-gold/5/40 shadow-[0_0_15px_rgba(198,162,94,0.05)]"
                    : "border-border/40 bg-surface/30 hover:border-gold/25"
                  : "border-transparent bg-transparent pointer-events-none"
              }`}
            >
              {/* Day Number */}
              {date && (
                <span
                  className={`text-[0.68rem] font-bold font-display ${
                    currentIsToday
                      ? "text-gold bg-gold/15 flex size-5 items-center justify-center rounded-full"
                      : "text-muted-foreground"
                  }`}
                >
                  {date.getDate()}
                </span>
              )}

              {/* Day Missions */}
              <div className="mt-1.5 flex-1 flex flex-col gap-1 overflow-y-auto max-h-[60px] scrollbar-thin">
                {dayMissions.map((mission) => {
                  const isSelected = activeMissionId === mission.id;
                  const priorityDot =
                    mission.priority === "High"
                      ? "bg-red-500"
                      : mission.priority === "Medium"
                        ? "bg-amber-500"
                        : "bg-slate-400";

                  return (
                    <button
                      key={mission.id}
                      onClick={() => setActiveMissionId(mission.id)}
                      className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[0.58rem] font-medium transition-all flex items-center gap-1 leading-none ${
                        isSelected
                          ? "bg-gold text-primary-foreground font-semibold"
                          : mission.completed
                            ? "bg-emerald-950/20 text-emerald-400/80 border border-emerald-900/20 line-through"
                            : "bg-surface-raised hover:bg-secondary border border-border/40 text-foreground"
                      }`}
                    >
                      {!isSelected && (
                        <span className={`size-1 shrink-0 rounded-full ${priorityDot}`} />
                      )}
                      <span className="truncate">{mission.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
