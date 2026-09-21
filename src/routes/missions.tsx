import { useState, useEffect, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  DollarSign,
  GripVertical,
  X,
  Trash2,
} from "lucide-react";
import {
  BookIcon,
  CheckIcon,
  ClockIcon,
  KamonIcon,
  KanbanIcon,
  KoyomiIcon,
  SealIcon,
  StoneIcon,
} from "@/components/mission/JapaneseIcons";

import { useWeather } from "@/hooks/use-weather";
import {
  Mission,
  MissionCategory,
  MissionPriority,
  BoardColumn,
  initialMissions,
  calculateProgress,
} from "@/data/missionsData";
import { KEYS, readJson, writeJson } from "@/services/store";

const title = "Missions — Mission Control";
const description = "Execute with focus. Win the day.";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const weather = useWeather();
  const WeatherIcon = weather.icon;

  // Database state
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [writeError, setWriteError] = useState<string | null>(null);

  // Filter & View State
  const [activeView, setActiveView] = useState<"board" | "list" | "calendar">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  // The mini-calendar used to be a mockup: a fixed "May 2025", a hardcoded grid
  // of dates, and a default selection of the 17th left over from the design.
  // Both the month shown and the day selected now come from the real clock.
  const [monthCursor, setMonthCursor] = useState<Date | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<number | null>(null);

  // Drag State
  const [draggedMissionId, setDraggedMissionId] = useState<string | null>(null);

  // Inspector / Edit Modal State
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<MissionCategory>("Study");
  const [newPriority, setNewPriority] = useState<MissionPriority>("Medium");
  const [newColumn, setNewColumn] = useState<BoardColumn>("inbox");
  const [newDuration, setNewDuration] = useState(60);

  // Sync timing
  useEffect(() => {
    void readJson<Mission[]>(KEYS.missions, initialMissions).then(setMissions);
    setIsMounted(true);

    // Client-only, so the server and the first client render agree.
    const today = new Date();
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateFilter(today.getDate());

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    void (async () => {
      const result = await writeJson(KEYS.missions, missions);
      setWriteError(result.ok ? null : result.message);
    })();
  }, [missions, isMounted]);

  /**
   * A real Monday-first month grid for the cursor's month, with the leading and
   * trailing days of the neighbouring months filled in so the grid is square.
   */
  const calendarCells = (() => {
    if (!monthCursor) return [];
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { day: number; inMonth: boolean }[] = [];
    for (let i = firstWeekday; i > 0; i -= 1) {
      cells.push({ day: daysInPrev - i + 1, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) cells.push({ day: d, inMonth: true });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length % 31, inMonth: false });
    return cells;
  })();

  const monthLabel = monthCursor
    ? monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";

  const isCurrentMonthShown =
    monthCursor !== null &&
    monthCursor.getFullYear() === time.getFullYear() &&
    monthCursor.getMonth() === time.getMonth();

  const shiftMonth = (delta: number) =>
    setMonthCursor((c) => (c ? new Date(c.getFullYear(), c.getMonth() + delta, 1) : c));

  /**
   * `dueDate` is a display string like "May 24", so a selected day matches by
   * formatting it the same way rather than by parsing the stored text.
   */
  const selectedDueLabel =
    monthCursor && selectedDateFilter !== null
      ? new Date(
          monthCursor.getFullYear(),
          monthCursor.getMonth(),
          selectedDateFilter,
        ).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : null;

  const missionsOnSelectedDay = selectedDueLabel
    ? missions.filter((m) => m.dueDate === selectedDueLabel && !m.archived)
    : [];

  // Filtering calculation
  const filteredMissions = missions.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subcategory && m.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    const matchesPriority = selectedPriority === "All" || m.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Column arrays
  const inboxMissions = filteredMissions.filter((m) => m.boardColumn === "inbox" && !m.completed);
  const todayMissions = filteredMissions.filter((m) => m.boardColumn === "today" && !m.completed);
  const upcomingMissions = filteredMissions.filter(
    (m) => m.boardColumn === "upcoming" && !m.completed,
  );
  const completedMissions = filteredMissions.filter(
    (m) => m.completed || m.boardColumn === "completed",
  );

  // Drag and Drop handlers
  const handleDragStart = (id: string) => {
    setDraggedMissionId(id);
  };

  const handleDropToColumn = (targetColumn: BoardColumn) => {
    if (!draggedMissionId) return;

    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === draggedMissionId) {
          const isCompletedCol = targetColumn === "completed";
          return {
            ...m,
            boardColumn: targetColumn,
            completed: isCompletedCol,
            progress: isCompletedCol ? 100 : m.progress === 100 ? 0 : m.progress,
            history: [
              {
                timestamp: new Date().toISOString(),
                action: `Moved to column: ${targetColumn}`,
              },
              ...m.history,
            ],
          };
        }
        return m;
      }),
    );
    setDraggedMissionId(null);
  };

  // Toggle subtask completion
  const handleToggleSubtask = (missionId: string, subtaskId: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === missionId) {
          const updatedChecklist = m.checklist.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st,
          );
          const progress = calculateProgress(updatedChecklist);
          return {
            ...m,
            checklist: updatedChecklist,
            progress,
            completed: progress === 100,
            boardColumn: progress === 100 ? "completed" : m.boardColumn,
          };
        }
        return m;
      }),
    );

    if (selectedMission && selectedMission.id === missionId) {
      const updatedChecklist = selectedMission.checklist.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st,
      );
      const progress = calculateProgress(updatedChecklist);
      setSelectedMission({
        ...selectedMission,
        checklist: updatedChecklist,
        progress,
        completed: progress === 100,
      });
    }
  };

  // Add subtask
  const handleAddSubtask = (missionId: string, subTitle: string) => {
    if (!subTitle.trim()) return;
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === missionId) {
          const newSub = { id: `sub-${Date.now()}`, title: subTitle.trim(), completed: false };
          const updatedChecklist = [...m.checklist, newSub];
          const progress = calculateProgress(updatedChecklist);
          return { ...m, checklist: updatedChecklist, progress };
        }
        return m;
      }),
    );
  };

  // Create Mission
  const handleCreateMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newM: Mission = {
      id: `m-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      boardColumn: newColumn,
      description: "",
      durationMinutes: Number(newDuration),
      completed: newColumn === "completed",
      progress: newColumn === "completed" ? 100 : 0,
      xpReward: 150,
      disciplineReward: 2,
      checklist: [],
      notes: "",
      attachments: [],
      history: [{ timestamp: new Date().toISOString(), action: "Mission formulated" }],
      archived: false,
      cornerArt: "bamboo",
    };

    setMissions((prev) => [...prev, newM]);
    setNewTitle("");
    setIsCreateModalOpen(false);
  };

  // Delete Mission
  const handleDeleteMission = (id: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    if (selectedMission?.id === id) setSelectedMission(null);
  };

  // Category & Priority counts
  const countCategory = (cat: MissionCategory) =>
    missions.filter((m) => m.category === cat && !m.completed).length;

  const countPriority = (pri: MissionPriority) =>
    missions.filter((m) => m.priority === pri && !m.completed).length;

  // Format header time & date
  const displayTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="select-none animate-rise min-h-screen bg-[#F2ECE1] text-[#2D241B] p-4 md:p-6 lg:p-8 rounded-3xl relative overflow-hidden font-sans border border-[#D9CDBA]">
      {writeError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border border-rose-800/60 bg-rose-950/25 p-3"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden />
          <p className="text-sm text-rose-200">Mission data is not being saved — {writeError}</p>
        </div>
      )}
      {/* 1. TOP HEADER BAR */}
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center pb-5 border-b border-[#D9CDBA]/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl md:text-5xl font-medium tracking-wide text-[#2D241B]">
              Missions
            </h1>
            <div className="flex size-6 items-center justify-center rounded border border-red-900/60 bg-red-950/20 text-red-700 font-display text-[0.65rem] font-bold shadow-[0_0_8px_rgba(153,27,27,0.15)]">
              住民
            </div>
          </div>
          <p className="font-sans text-xs tracking-wider text-[#6E6254] font-medium">
            Execute with focus. Win the day.
          </p>
        </div>

        {/* Top Control Icons & Weather */}
        <div className="flex items-center gap-4 text-xs">
          {/* Focus Emblem Button */}
          <div className="flex size-8 items-center justify-center rounded-full border border-[#D9CDBA] bg-[#F8F5EE] text-[#B38A3D] shadow-xs cursor-pointer hover:border-[#B38A3D] transition-colors">
            <KamonIcon className="size-4" aria-hidden />
          </div>

          {/* Search Trigger Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 size-3.5 text-[#6E6254]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search missions..."
              className="h-8 rounded-full border border-[#D9CDBA] bg-[#F8F5EE] pl-8 pr-3 text-xs text-[#2D241B] focus:border-[#B38A3D] focus:outline-hidden transition-all w-36 sm:w-44"
            />
          </div>

          {/* Weather Widget */}
          <div className="flex items-center gap-2 rounded-full border border-[#D9CDBA] bg-[#F8F5EE] px-3.5 py-1 text-xs">
            <WeatherIcon className="size-4 text-[#B38A3D]" aria-hidden />
            <div>
              <p className="font-semibold text-xs leading-none text-[#2D241B]">
                {isMounted ? displayTime : "—"}
              </p>
              <p className="text-[0.6rem] text-[#6E6254] mt-0.5">
                {weather.temperatureC === null
                  ? weather.condition
                  : `${weather.temperatureC}° · ${weather.city || weather.condition}`}
              </p>
            </div>
          </div>

          {/* Gold Kanji Emblem */}
          <span className="font-display text-xl font-bold text-[#B38A3D] px-1">侍</span>
        </div>
      </header>

      {/* 2. TOOLBAR & VIEW CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 my-5">
        {/* Left View Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#D9CDBA] bg-[#F8F5EE] p-1 shadow-xs">
            <button
              onClick={() => setActiveView("board")}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeView === "board"
                  ? "bg-[#2D241B] text-[#F2ECE1] shadow-xs"
                  : "text-[#6E6254] hover:text-[#2D241B]"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView("list")}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeView === "list"
                  ? "bg-[#2D241B] text-[#F2ECE1] shadow-xs"
                  : "text-[#6E6254] hover:text-[#2D241B]"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeView === "calendar"
                  ? "bg-[#2D241B] text-[#F2ECE1] shadow-xs"
                  : "text-[#6E6254] hover:text-[#2D241B]"
              }`}
            >
              Calendar
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#4F5E4E] text-[#F2ECE1] hover:bg-[#3D4B3C] font-semibold text-xs tracking-wider uppercase transition-all shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5" />
            Add Mission
          </button>
        </div>

        {/* Right Filter Dropdowns */}
        <div className="flex items-center gap-3 text-xs">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6E6254] font-medium">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-8 rounded-xl border border-[#D9CDBA] bg-[#F8F5EE] px-2.5 text-xs text-[#2D241B] focus:border-[#B38A3D] focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6E6254] font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 rounded-xl border border-[#D9CDBA] bg-[#F8F5EE] px-2.5 text-xs text-[#2D241B] focus:border-[#B38A3D] focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Study">Study</option>
              <option value="Projects">Projects</option>
              <option value="Fitness">Fitness</option>
              <option value="Personal">Personal</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT (BOARD + RIGHT SIDEBAR) */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-12 items-start">
        {/* LEFT KANBAN / LIST AREA (Takes 9 Cols) */}
        <div className="xl:col-span-9 space-y-6">
          {activeView === "board" && (
            <div className="grid gap-4.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* COL 1: MISSION INBOX */}
              <KanbanColumn
                title="MISSION INBOX"
                count={inboxMissions.length}
                columnId="inbox"
                icon={<BookIcon className="size-4 text-[#6E6254]" aria-hidden />}
                missions={inboxMissions}
                onDragStart={handleDragStart}
                onDrop={handleDropToColumn}
                onCardClick={setSelectedMission}
              />

              {/* COL 2: TODAY'S MISSIONS */}
              <KanbanColumn
                title="TODAY'S MISSIONS"
                count={todayMissions.length}
                columnId="today"
                icon={<ClockIcon className="size-4 text-[#6E6254]" aria-hidden />}
                missions={todayMissions}
                onDragStart={handleDragStart}
                onDrop={handleDropToColumn}
                onCardClick={setSelectedMission}
                showProgressRings
              />

              {/* COL 3: UPCOMING MISSIONS */}
              <KanbanColumn
                title="UPCOMING MISSIONS"
                count={upcomingMissions.length}
                columnId="upcoming"
                icon={<KoyomiIcon className="size-4 text-[#6E6254]" aria-hidden />}
                missions={upcomingMissions}
                onDragStart={handleDragStart}
                onDrop={handleDropToColumn}
                onCardClick={setSelectedMission}
                showDueDates
              />

              {/* COL 4: COMPLETED */}
              <KanbanColumn
                title="COMPLETED"
                count={completedMissions.length}
                columnId="completed"
                icon={<SealIcon className="size-4 text-[#6E6254]" aria-hidden />}
                missions={completedMissions}
                onDragStart={handleDragStart}
                onDrop={handleDropToColumn}
                onCardClick={setSelectedMission}
                isCompletedColumn
              />
            </div>
          )}

          {activeView === "list" && (
            <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#2D241B] uppercase border-b border-[#D9CDBA] pb-2">
                All Active Missions
              </h3>
              <div className="divide-y divide-[#D9CDBA]/40">
                {filteredMissions.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMission(m)}
                    className="py-3 flex items-center justify-between hover:bg-[#F2ECE1]/60 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          m.completed
                            ? "bg-[#4F5E4E] border-[#4F5E4E] text-[#F2ECE1]"
                            : "border-[#D9CDBA]"
                        }`}
                      >
                        {m.completed && <CheckIcon className="size-3" />}
                      </div>
                      <div>
                        <h4
                          className={`text-xs font-semibold ${m.completed ? "line-through text-[#6E6254]" : "text-[#2D241B]"}`}
                        >
                          {m.title}
                        </h4>
                        <p className="text-[0.6rem] text-[#6E6254]">
                          {m.category} {m.subcategory && `/ ${m.subcategory}`} • {m.durationMinutes}
                          m
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[0.55rem] font-bold px-2 py-0.5 rounded ${
                        m.priority === "High"
                          ? "bg-red-800/10 text-red-800 border border-red-800/30"
                          : m.priority === "Medium"
                            ? "bg-[#B38A3D]/10 text-[#B38A3D] border border-[#B38A3D]/30"
                            : "bg-blue-800/10 text-blue-800 border border-blue-800/30"
                      }`}
                    >
                      {m.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "calendar" && (
            <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-6 space-y-4 text-center">
              <h3 className="font-display text-base font-semibold text-[#2D241B]">
                Interactive Missions Calendar
              </h3>
              <p className="text-xs text-[#6E6254]">
                All missions scheduled for May 2025 are mapped to dates. Click dates on the right
                sidebar to filter view.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (Takes 3 Cols) */}
        <div className="xl:col-span-3 space-y-5">
          {/* 1. MISSION CALENDAR */}
          <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#D9CDBA] pb-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[#2D241B]">
                Mission Calendar
              </h3>
              <div className="flex items-center gap-1 text-[#6E6254]">
                <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="size-3.5 cursor-pointer hover:text-[#2D241B]" />
                </button>
                <span className="text-[0.65rem] font-semibold text-[#2D241B]">{monthLabel}</span>
                <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="size-3.5 cursor-pointer hover:text-[#2D241B]" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 text-center text-[0.55rem] font-bold text-[#6E6254] uppercase">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold">
              {calendarCells.map((cell, i) => {
                const isSelected = cell.inMonth && cell.day === selectedDateFilter;
                const isToday = cell.inMonth && isCurrentMonthShown && cell.day === time.getDate();

                return (
                  <div
                    key={i}
                    onClick={() => cell.inMonth && setSelectedDateFilter(cell.day)}
                    className={`h-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#B38A3D] text-[#F2ECE1] font-bold shadow-xs"
                        : isToday
                          ? "ring-1 ring-[#B38A3D] text-[#2D241B]"
                          : cell.inMonth
                            ? "hover:bg-[#F2ECE1] text-[#2D241B]"
                            : "text-[#6E6254]/40"
                    }`}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SCHEDULE FOR THE SELECTED DAY — real missions, not a sample list */}
          <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 space-y-3 shadow-xs">
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[#2D241B] border-b border-[#D9CDBA] pb-2">
              {selectedDueLabel ? `Due ${selectedDueLabel}` : "Schedule"}
            </h3>
            <div className="space-y-2.5 text-[0.65rem] text-[#2D241B]">
              {missionsOnSelectedDay.length === 0 ? (
                <p className="text-[0.62rem] leading-relaxed text-[#6E6254]">
                  Nothing due on this day. Give a mission a due date and it will appear here.
                </p>
              ) : (
                missionsOnSelectedDay
                  .slice()
                  .sort((a, b) =>
                    (a.scheduleTime ?? "99:99").localeCompare(b.scheduleTime ?? "99:99"),
                  )
                  .map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 leading-none">
                      <span className="font-mono text-[0.6rem] text-[#6E6254] font-semibold">
                        {m.scheduleTime ?? "—"}
                      </span>
                      <div className="size-1.5 rounded-full bg-[#B38A3D]" />
                      <span
                        className={`font-medium truncate ${m.completed ? "line-through opacity-60" : ""}`}
                      >
                        {m.title}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* 3. PROJECT CATEGORIES */}
          <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 space-y-3 shadow-xs">
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[#2D241B] border-b border-[#D9CDBA] pb-2">
              Project Categories
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { name: "Study", icon: BookIcon, cat: "Study" as MissionCategory },
                { name: "Projects", icon: KanbanIcon, cat: "Projects" as MissionCategory },
                { name: "Fitness", icon: StoneIcon, cat: "Fitness" as MissionCategory },
                { name: "Personal", icon: User, cat: "Personal" as MissionCategory },
                { name: "Finance", icon: DollarSign, cat: "Finance" as MissionCategory },
              ].map((catItem) => {
                const Icon = catItem.icon;
                const count = countCategory(catItem.cat);
                return (
                  <div
                    key={catItem.name}
                    onClick={() =>
                      setSelectedCategory(selectedCategory === catItem.cat ? "All" : catItem.cat)
                    }
                    className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                      selectedCategory === catItem.cat
                        ? "bg-[#F2ECE1] font-bold"
                        : "hover:bg-[#F2ECE1]/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[#2D241B]">
                      <Icon className="size-3.5 text-[#B38A3D]" />
                      <span>{catItem.name}</span>
                    </div>
                    <span className="size-4.5 rounded-full bg-[#D9CDBA]/40 flex items-center justify-center text-[0.55rem] font-bold text-[#6E6254]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. PRIORITY LEVELS */}
          <div className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-4 space-y-3 shadow-xs">
            <h3 className="font-display text-xs font-bold uppercase tracking-widest text-[#2D241B] border-b border-[#D9CDBA] pb-2">
              Priority Levels
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { name: "High Priority", val: "High" as MissionPriority, color: "bg-red-800" },
                {
                  name: "Medium Priority",
                  val: "Medium" as MissionPriority,
                  color: "bg-[#B38A3D]",
                },
                { name: "Low Priority", val: "Low" as MissionPriority, color: "bg-blue-800" },
              ].map((pri) => (
                <div
                  key={pri.name}
                  onClick={() =>
                    setSelectedPriority(selectedPriority === pri.val ? "All" : pri.val)
                  }
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                    selectedPriority === pri.val
                      ? "bg-[#F2ECE1] font-bold"
                      : "hover:bg-[#F2ECE1]/60"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[#2D241B]">
                    <div className={`size-2.5 rounded-full ${pri.color}`} />
                    <span>{pri.name}</span>
                  </div>
                  <span className="size-4.5 rounded-full bg-[#D9CDBA]/40 flex items-center justify-center text-[0.55rem] font-bold text-[#6E6254]">
                    {countPriority(pri.val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM QUOTE */}
      <footer className="relative z-10 mt-10 pt-6 border-t border-[#D9CDBA]/60 text-center flex flex-col items-center justify-center space-y-2">
        <blockquote className="max-w-2xl space-y-1.5">
          <p className="font-display italic text-sm md:text-base text-[#2D241B] leading-relaxed">
            <span className="text-[#B38A3D] font-serif text-xl font-bold mr-1">“</span>
            Discipline is the bridge between goals and accomplishment.
          </p>
          <cite className="font-sans text-[0.65rem] uppercase tracking-widest text-[#6E6254] font-bold not-italic">
            — Miyamoto Musashi
          </cite>
        </blockquote>

        {/* Small Red Calligraphy Seal Stamp */}
        <div className="flex size-5 items-center justify-center rounded border border-red-900/60 bg-red-950/20 text-red-700 font-display text-[0.45rem] font-bold shadow-[0_0_6px_rgba(153,27,27,0.15)] pointer-events-none mt-1">
          決断
        </div>
      </footer>

      {/* 5. CREATE MISSION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-5 shadow-2xl space-y-4 animate-rise">
            <div className="flex justify-between items-center border-b border-[#D9CDBA] pb-2">
              <h3 className="font-display text-base font-bold text-[#2D241B]">
                Formulate New Mission
              </h3>
              <X
                className="size-4 cursor-pointer text-[#6E6254]"
                onClick={() => setIsCreateModalOpen(false)}
              />
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#6E6254] uppercase text-[0.6rem]">
                  Mission Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Research Transformer Architectures..."
                  className="w-full h-8 rounded-lg border border-[#D9CDBA] bg-[#F2ECE1] px-3 text-xs text-[#2D241B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#6E6254] uppercase text-[0.6rem]">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MissionCategory)}
                    className="w-full h-8 rounded-lg border border-[#D9CDBA] bg-[#F2ECE1] px-2 text-xs text-[#2D241B]"
                  >
                    <option value="Study">Study</option>
                    <option value="Projects">Projects</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Personal">Personal</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6E6254] uppercase text-[0.6rem]">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as MissionPriority)}
                    className="w-full h-8 rounded-lg border border-[#D9CDBA] bg-[#F2ECE1] px-2 text-xs text-[#2D241B]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#6E6254] uppercase text-[0.6rem]">
                    Kanban Column
                  </label>
                  <select
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value as BoardColumn)}
                    className="w-full h-8 rounded-lg border border-[#D9CDBA] bg-[#F2ECE1] px-2 text-xs text-[#2D241B]"
                  >
                    <option value="inbox">Mission Inbox</option>
                    <option value="today">Today's Missions</option>
                    <option value="upcoming">Upcoming Missions</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#6E6254] uppercase text-[0.6rem]">
                    Duration (Min)
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full h-8 rounded-lg border border-[#D9CDBA] bg-[#F2ECE1] px-2 text-xs text-[#2D241B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9CDBA]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#D9CDBA] text-[#6E6254] font-semibold uppercase text-[0.6rem]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F5E4E] text-[#F2ECE1] font-semibold uppercase text-[0.6rem]"
                >
                  Formulate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MISSION INSPECTOR MODAL */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-6 shadow-2xl space-y-4 animate-rise max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#D9CDBA] pb-3">
              <div>
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-[#B38A3D]">
                  {selectedMission.category}{" "}
                  {selectedMission.subcategory && `/ ${selectedMission.subcategory}`}
                </span>
                <h3 className="font-display text-lg font-bold text-[#2D241B]">
                  {selectedMission.title}
                </h3>
              </div>
              <X
                className="size-4 cursor-pointer text-[#6E6254]"
                onClick={() => setSelectedMission(null)}
              />
            </div>

            {/* Details */}
            <div className="space-y-3 text-xs text-[#2D241B]">
              <p className="text-[#6E6254]">
                {selectedMission.description || "No specific description provided."}
              </p>

              {/* Progress ring if applicable */}
              <div className="flex items-center gap-4 bg-[#F2ECE1] p-3 rounded-xl border border-[#D9CDBA]">
                <span className="font-bold">Progress: {selectedMission.progress}%</span>
                <div className="flex-1 bg-[#D9CDBA]/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#4F5E4E] h-full transition-all duration-500"
                    style={{ width: `${selectedMission.progress}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <p className="font-bold uppercase text-[0.6rem] text-[#6E6254]">
                  Subtasks Checklist
                </p>
                {selectedMission.checklist.map((st) => (
                  <label key={st.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(selectedMission.id, st.id)}
                      className="accent-[#4F5E4E]"
                    />
                    <span
                      className={st.completed ? "line-through text-[#6E6254]" : "text-[#2D241B]"}
                    >
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#D9CDBA]">
              <button
                onClick={() => handleDeleteMission(selectedMission.id)}
                className="text-red-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
              <button
                onClick={() => setSelectedMission(null)}
                className="px-4 py-1.5 rounded-lg bg-[#2D241B] text-[#F2ECE1] text-xs font-semibold uppercase tracking-wider"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// SUBCOMPONENT: KANBAN COLUMN
function KanbanColumn({
  title,
  count,
  columnId,
  icon,
  missions,
  onDragStart,
  onDrop,
  onCardClick,
  showProgressRings = false,
  showDueDates = false,
  isCompletedColumn = false,
}: {
  title: string;
  count: number;
  columnId: BoardColumn;
  /** A rendered icon element, not the component — callers pass `<Icon />`. */
  icon: ReactNode;
  missions: Mission[];
  onDragStart: (id: string) => void;
  onDrop: (col: BoardColumn) => void;
  onCardClick: (m: Mission) => void;
  showProgressRings?: boolean;
  showDueDates?: boolean;
  isCompletedColumn?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(columnId)}
      className="rounded-2xl border border-[#D9CDBA] bg-[#F8F5EE] p-3.5 flex flex-col justify-between min-h-[580px] shadow-xs"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D9CDBA]">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display text-xs font-bold tracking-widest text-[#2D241B] uppercase">
            {title}
          </h3>
        </div>
        <span className="size-5 rounded-full bg-[#D9CDBA]/40 flex items-center justify-center text-[0.6rem] font-bold text-[#6E6254]">
          {count}
        </span>
      </div>

      {/* Cards List */}
      <div className="flex-1 py-3 space-y-3 overflow-y-auto max-h-[480px]">
        {missions.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => onDragStart(item.id)}
            onClick={() => onCardClick(item)}
            className={`rounded-xl border border-[#D9CDBA] bg-[#F8F5EE] p-3.5 shadow-xs relative transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group overflow-hidden ${
              isCompletedColumn ? "opacity-75 bg-[#F2ECE1]/50" : ""
            }`}
          >
            {/* Corner Ink Artwork Mockup */}
            <svg
              className="absolute -bottom-1 -right-1 size-14 text-[#4F5E4E]/10 pointer-events-none"
              viewBox="0 0 100 100"
            >
              {item.cornerArt === "crane" && (
                <path d="M10,80 Q50,20 90,60" fill="none" stroke="currentColor" strokeWidth="2" />
              )}
              {item.cornerArt === "bamboo" && (
                <path
                  d="M40,90 L40,10 M60,90 L60,10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              )}
              {item.cornerArt === "mountain" && (
                <path d="M0,90 Q40,30 90,80 Z" fill="currentColor" opacity="0.5" />
              )}
              {item.cornerArt === "samurai" && (
                <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.3" />
              )}
            </svg>

            {/* Drag Handle Icon */}
            <GripVertical className="absolute top-2.5 right-2.5 size-3.5 text-[#6E6254]/40 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Title & Category */}
            <div className="pr-4 space-y-1">
              <h4
                className={`font-display text-xs font-bold text-[#2D241B] leading-tight ${isCompletedColumn ? "line-through text-[#6E6254]" : ""}`}
              >
                {item.title}
              </h4>
              <p className="text-[0.6rem] text-[#6E6254] font-medium">
                {item.category} {item.subcategory && `/ ${item.subcategory}`}
              </p>
            </div>

            {/* Progress Ring if Today's Column */}
            {showProgressRings && !isCompletedColumn && (
              <div className="absolute top-3 right-3 size-9">
                <svg viewBox="0 0 36 36" className="-rotate-90 size-full">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#EFE6D7" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#4F5E4E"
                    strokeWidth="3"
                    strokeDasharray="88"
                    strokeDashoffset={88 - (88 * item.progress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold text-[#2D241B]">
                  {item.progress}%
                </span>
              </div>
            )}

            {/* Footer Metadata */}
            <div className="mt-3 pt-2 border-t border-[#D9CDBA]/40 flex items-center justify-between text-[0.6rem] text-[#6E6254]">
              {/* Priority badge */}
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[0.55rem] uppercase ${
                  item.priority === "High"
                    ? "bg-red-800/10 text-red-800 border border-red-800/30"
                    : item.priority === "Medium"
                      ? "bg-[#B38A3D]/10 text-[#B38A3D] border border-[#B38A3D]/30"
                      : "bg-blue-800/10 text-blue-800 border border-blue-800/30"
                }`}
              >
                {item.priority}
              </span>

              {/* Time or Due date */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-medium">
                  <ClockIcon className="size-2.5" aria-hidden />
                  {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}m
                </span>

                {showDueDates && item.dueDate && (
                  <span className="flex items-center gap-1 font-semibold text-[#B38A3D]">
                    <KoyomiIcon className="size-2.5" aria-hidden />
                    {item.dueDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Drop Zone Target */}
      <div className="mt-2 border border-dashed border-[#D9CDBA] rounded-xl p-2.5 text-center text-[0.6rem] text-[#6E6254] font-medium hover:border-[#B38A3D] transition-colors">
        Drag mission here to schedule
      </div>
    </div>
  );
}
