import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Play, ArrowRight, Lock } from "lucide-react";
import {
  BookIcon,
  CheckIcon,
  ClockIcon,
  KoyomiIcon,
  PagodaIcon,
  PathIcon,
  ScrollIcon,
  TrendIcon,
} from "@/components/mission/JapaneseIcons";

import academyHero from "@/assets/academy-hero.png";
import { useWeather } from "@/hooks/use-weather";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { ProgressBar } from "@/components/mission/ProgressBar";
import { useCountUp, useAnimatedProgress } from "@/hooks/use-count-up";
import { XPRing } from "@/components/mission/XPRing";

const title = "Academy — Mission Control";
const description = "Knowledge is the sword that never dulls.";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AcademyPage,
});

// Mock Quotes
const INSPIRATIONAL_QUOTES = [
  {
    text: "The more you learn, the more you realize how much you still have to learn.",
    author: "Miyamoto Musashi",
    source: "The Book of Five Rings",
  },
  {
    text: "Learning without thought is labor lost; thought without learning is perilous.",
    author: "Confucius",
    source: "The Analects",
  },
  {
    text: "The sword must be polished every day; the mind must be refined every moment.",
    author: "Yagyū Munenori",
    source: "The Life-Giving Sword",
  },
  {
    text: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
    source: "Personal Reflection",
  },
];

// Types
interface Course {
  id: string;
  name: string;
  institution: string;
  progress: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  nextLesson: string;
  hoursRemaining: number;
  description: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  progress: number;
  currentChapter: string;
  totalChapters: number;
  hoursRemaining: number;
  bgClass: string;
  borderClass: string;
}

interface Assignment {
  id: string;
  name: string;
  subject: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  durationMinutes: number;
  progress: number;
}

interface Exam {
  id: string;
  name: string;
  subject: string;
  date: string;
  daysRemaining: number;
  revisionProgress: number;
}

// Initial Data
const INITIAL_COURSES: Course[] = [
  {
    id: "course-mlt",
    name: "Machine Learning Techniques",
    institution: "IITM BS Data Science",
    progress: 72,
    difficulty: "Intermediate",
    nextLesson: "Gradient Descent Optimization",
    hoursRemaining: 12,
    description:
      "Deep dive into model optimization, regularizations, SVM formulas, and vector gradients.",
  },
  {
    id: "course-linalg",
    name: "Advanced Linear Algebra",
    institution: "IITM BS Data Science",
    progress: 45,
    difficulty: "Advanced",
    nextLesson: "Eigenvalues & Eigenvectors",
    hoursRemaining: 18,
    description:
      "Understanding vector spaces, linear independence, projections, and matrix decomposition.",
  },
  {
    id: "course-dsa",
    name: "Data Structures & Algorithms",
    institution: "Self Study",
    progress: 68,
    difficulty: "Intermediate",
    nextLesson: "Binary Search Trees",
    hoursRemaining: 8,
    description:
      "Mastering complex data modeling, complexity analysis, heaps, and tree traversals.",
  },
  {
    id: "course-stats",
    name: "Statistics & Probability",
    institution: "IITM BS Data Science",
    progress: 54,
    difficulty: "Intermediate",
    nextLesson: "Central Limit Theorem",
    hoursRemaining: 10,
    description:
      "Formulating random variables, probability distribution tables, and inference tests.",
  },
];

const INITIAL_BOOKS: Book[] = [
  {
    id: "book-deepwork",
    title: "Deep Work",
    author: "Cal Newport",
    progress: 60,
    currentChapter: "The Practice of Deep Focus",
    totalChapters: 8,
    hoursRemaining: 2.5,
    bgClass: "bg-amber-950/40 text-amber-100",
    borderClass: "border-amber-900/60",
  },
  {
    id: "book-thinking",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    progress: 20,
    currentChapter: "Two Systems in Decision Making",
    totalChapters: 24,
    hoursRemaining: 8.5,
    bgClass: "bg-slate-950/40 text-slate-100",
    borderClass: "border-slate-800/60",
  },
  {
    id: "book-discipline",
    title: "The Discipline of Destiny",
    author: "Ryan Holiday",
    progress: 50,
    currentChapter: "Temperance & Action",
    totalChapters: 12,
    hoursRemaining: 1.8,
    bgClass: "bg-red-950/40 text-red-100",
    borderClass: "border-red-900/60",
  },
  {
    id: "book-habits",
    title: "Atomic Habits",
    author: "James Clear",
    progress: 85,
    currentChapter: "The 4th Law: Make it Satisfying",
    totalChapters: 20,
    hoursRemaining: 1.2,
    bgClass: "bg-yellow-950/40 text-yellow-100",
    borderClass: "border-yellow-900/60",
  },
  {
    id: "book-ikigai",
    title: "Ikigai: Kyoto Secrets",
    author: "Héctor García",
    progress: 90,
    currentChapter: "Flow in Daily Work",
    totalChapters: 10,
    hoursRemaining: 0.5,
    bgClass: "bg-emerald-950/40 text-emerald-100",
    borderClass: "border-emerald-900/60",
  },
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: "assign-1",
    name: "Week 4 Assignment",
    subject: "Machine Learning Techniques",
    dueDate: "2026-08-02",
    priority: "High",
    durationMinutes: 90,
    progress: 60,
  },
  {
    id: "assign-2",
    name: "Linear Algebra Problem Set",
    subject: "Advanced Linear Algebra",
    dueDate: "2026-08-03",
    priority: "Medium",
    durationMinutes: 120,
    progress: 0,
  },
  {
    id: "assign-3",
    name: "Statistics Worksheet 3",
    subject: "Statistics & Probability",
    dueDate: "2026-08-05",
    priority: "Low",
    durationMinutes: 60,
    progress: 0,
  },
];

const INITIAL_EXAMS: Exam[] = [
  {
    id: "exam-mlt",
    name: "MLT Term Exam",
    subject: "Machine Learning Techniques",
    date: "2026-08-24",
    daysRemaining: 24,
    revisionProgress: 35,
  },
  {
    id: "exam-linalg",
    name: "Linear Algebra Quiz 2",
    subject: "Advanced Linear Algebra",
    date: "2026-08-29",
    daysRemaining: 29,
    revisionProgress: 50,
  },
  {
    id: "exam-dsa",
    name: "Data Structures Midterm",
    subject: "Data Structures & Algorithms",
    date: "2026-09-11",
    daysRemaining: 42,
    revisionProgress: 10,
  },
];

function AcademyPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [time, setTime] = useState(new Date());
  const weather = useWeather();

  // Storage and State
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [selectedBookId, setSelectedBookId] = useState<string>("book-deepwork");
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);

  const [searchQuery, setSearchQuery] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);

  // Search input focus reference
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener (Ctrl+K to focus search)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Rotate quotes
  const handleRotateQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
  };

  // Clock formatters
  const timeString = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateString = time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const weekday = time.toLocaleDateString("en-US", { weekday: "long" });

  // Get active selected book details
  const activeBook = books.find((b) => b.id === selectedBookId) ?? books[0] ?? null;

  /** Days remaining until a given date string ("YYYY-MM-DD"), computed from the live clock. */
  const daysUntil = (dateStr: string): number => {
    const target = new Date(dateStr);
    const today = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  };

  // Indexing an array yields `T | undefined` under this tsconfig, so the quote
  // is resolved once with a fallback rather than asserted at each use.
  const activeQuote = INSPIRATIONAL_QUOTES[quoteIndex] ?? INSPIRATIONAL_QUOTES[0]!;

  // Drag and Drop Courses
  const handleDragStart = (id: string) => {
    setDraggedCourseId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedCourseId || draggedCourseId === targetId) return;

    const dragIdx = courses.findIndex((c) => c.id === draggedCourseId);
    const dropIdx = courses.findIndex((c) => c.id === targetId);

    const updated = [...courses];
    const [removed] = updated.splice(dragIdx, 1);
    if (!removed) return;
    updated.splice(dropIdx, 0, removed);

    setCourses(updated);
    setDraggedCourseId(null);
  };

  // Resume course triggers (adds progress dynamically for demo)
  const handleResumeCourse = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextProgress = Math.min(100, c.progress + 4);
          return {
            ...c,
            progress: nextProgress,
            hoursRemaining: Math.max(0, Math.round(c.hoursRemaining * 0.9 * 10) / 10),
          };
        }
        return c;
      }),
    );
  };

  // Quick Start Assignment progress simulation
  const handleStartAssignment = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextProgress = Math.min(100, a.progress + 20);
          return { ...a, progress: nextProgress };
        }
        return a;
      }),
    );
  };

  // Quick Revision Exam progress simulation
  const handleReviseExam = (id: string) => {
    setExams((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return { ...e, revisionProgress: Math.min(100, e.revisionProgress + 15) };
        }
        return e;
      }),
    );
  };

  // Resume book reading progress simulation
  const handleResumeBook = (id: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            progress: Math.min(100, b.progress + 5),
            hoursRemaining: Math.max(0, Math.round((b.hoursRemaining - 0.2) * 10) / 10),
          };
        }
        return b;
      }),
    );
  };

  // Filter courses based on search
  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.institution.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-8 select-none">
      {/* 1. TOP HERO BANNER CARD */}
      <header className="animate-rise relative min-h-[220px] overflow-hidden rounded-2xl border border-border/70 bg-surface">
        {/* Visual Kyoto Study Corner Image Backdrop on the Right */}
        <div className="absolute top-0 bottom-0 right-0 w-full md:w-1/2 lg:w-[45%] overflow-hidden h-full z-0">
          <img
            src={academyHero}
            alt="Kyoto study room corner"
            className="size-full object-cover opacity-60 md:opacity-75"
          />
          <div className="absolute inset-0 bg-linear-to-r from-surface via-surface/65 to-transparent pointer-events-none" />
        </div>

        {/* Shadow overlays */}
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent z-0 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between gap-6 p-6 md:p-8 lg:flex-row lg:items-start lg:justify-between h-full min-h-[220px]">
          {/* Left Text details */}
          <div className="max-w-md lg:max-w-xl space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl leading-tight font-medium text-gold xl:text-5xl uppercase tracking-wider">
                Academy
              </h1>
              {/* Red ink character seal */}
              <div className="flex size-7 items-center justify-center rounded bg-red-800 border border-red-700/50 shadow-[0_0_10px_rgba(153,27,27,0.4)] text-red-100 font-display text-[0.7rem] font-bold tracking-widest leading-none">
                書
              </div>
            </div>
            <p className="font-display text-base tracking-widest text-gold-dim">
              "Knowledge is the sword that never dulls."
            </p>

            {/* Rotating Inspirational Quote */}
            <div
              onClick={handleRotateQuote}
              className="mt-6 border-l-2 border-gold/30 pl-4 py-1.5 bg-background/25 rounded-r-lg max-w-lg cursor-pointer group hover:bg-background/40 hover:border-gold/60 transition-all duration-300"
            >
              <p className="font-display italic text-xs leading-relaxed text-foreground/90 group-hover:text-gold-soft transition-colors">
                "{activeQuote.text}"
              </p>
              <p className="text-[0.62rem] text-muted-foreground mt-1.5 uppercase tracking-wider font-bold">
                — {activeQuote.author} • {activeQuote.source}
              </p>
            </div>
          </div>

          {/* Right Clock and Weather Widgets */}
          <div className="flex flex-col gap-3 self-start md:self-auto xl:mr-16">
            <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/65 px-4 py-2.5 backdrop-blur-[2px] shadow-lg">
              <div className="flex items-center gap-2.5">
                <ClockIcon className="size-4.5 text-gold-soft" aria-hidden />
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground tracking-wider leading-none">
                    {isMounted ? timeString : "07:12 AM"}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5 whitespace-nowrap">
                    {isMounted ? dateString : "May 17, 2025"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-border" aria-hidden />
              <div className="flex items-center gap-2">
                {(() => {
                  const WeatherIcon = weather.icon;
                  return (
                    <WeatherIcon
                      className={`size-4.5 text-gold-dim ${weather.status === "loading" ? "animate-pulse" : ""}`}
                      aria-hidden
                    />
                  );
                })()}
                <div>
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {weather.temperatureC === null ? "—" : `${weather.temperatureC}°C`}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5 whitespace-nowrap">
                    {weather.status === "loading" ? "Reading the sky" : weather.city || "—"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-border" aria-hidden />
              <div className="font-display text-lg text-gold font-bold select-none px-1">庵</div>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 left-0 h-px bg-linear-to-r from-transparent via-gold/35 to-transparent" />
      </header>

      {/* 2. THREE COLUMN LAYOUT CONTAINER */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN COMPILATION (Stats, Courses, Bookshelf, Charts) - takes 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. Learning Overview Stats */}
          <section aria-label="Learning Overview" className="grid gap-4 grid-cols-2 md:grid-cols-5">
            {[
              { label: "Hours This Week", value: "18.6", suffix: "h", desc: "12% vs last week" },
              { label: "Total Study", value: "247.8", suffix: "h", desc: "Across all subjects" },
              { label: "Focus Sessions", value: "28", suffix: "", desc: "Completed this week" },
              { label: "Study Streak", value: "47", suffix: "Days", desc: "Maintain consistency" },
              { label: "Knowledge Level", value: "27", suffix: "Bushidō", desc: "Mastery Seeker" },
            ].map((stat, idx) => (
              <Panel
                key={idx}
                as="article"
                className="p-4 flex flex-col justify-between h-28 transition-all hover:border-gold/30"
              >
                <div>
                  <PanelLabel className="mb-0 text-[0.55rem] tracking-[0.2em]">
                    {stat.label}
                  </PanelLabel>
                  <p className="mt-2 font-display text-2.5xl font-medium text-foreground leading-none tabular-nums">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-xs text-muted-foreground ml-1">{stat.suffix}</span>
                    )}
                  </p>
                </div>
                <p className="text-[0.62rem] text-muted-foreground/80 leading-none truncate">
                  {stat.desc}
                </p>
              </Panel>
            ))}
          </section>

          {/* B. Search / Filters & Courses, Roadmap Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Courses Column */}
            <div className="space-y-4 rounded-2xl border border-border/60 bg-surface/20 p-4.5">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <BookIcon className="size-4 text-gold" aria-hidden />
                  <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                    Current Courses
                  </h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search courses... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 w-36 rounded-lg border border-border/50 bg-background/55 pl-7 pr-2.5 text-[0.68rem] text-foreground focus:border-gold/40 focus:outline-hidden transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Course Stack */}
              <div className="flex flex-col gap-3">
                {filteredCourses.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6 italic">
                    No courses match your query.
                  </p>
                ) : (
                  filteredCourses.map((course) => (
                    <div
                      key={course.id}
                      draggable
                      onDragStart={() => handleDragStart(course.id)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(course.id)}
                      className="group/course relative rounded-xl border border-border/50 bg-background/30 p-4 hover:border-gold/30 hover:bg-background/45 cursor-grab active:cursor-grabbing transition-all duration-300 flex flex-col gap-2.5"
                    >
                      {/* Drag Handle cues */}
                      <div className="absolute top-4.5 left-2 flex flex-col gap-0.5 opacity-0 group-hover/course:opacity-40 transition-opacity duration-300">
                        <span className="w-1.5 h-0.5 bg-foreground" />
                        <span className="w-1.5 h-0.5 bg-foreground" />
                        <span className="w-1.5 h-0.5 bg-foreground" />
                      </div>

                      <div className="flex justify-between items-start gap-4 pl-1">
                        <div>
                          <h4 className="text-xs font-semibold tracking-wide text-foreground group-hover/course:text-gold-soft transition-colors duration-200 leading-snug">
                            {course.name}
                          </h4>
                          <p className="text-[0.62rem] text-muted-foreground mt-0.5">
                            {course.institution} •{" "}
                            <span className="italic">{course.difficulty}</span>
                          </p>
                        </div>
                        <span className="font-display font-medium text-xs text-gold">
                          {course.progress}%
                        </span>
                      </div>

                      {/* Micro Progress bar */}
                      <ProgressBar value={course.progress} className="h-1.5" />

                      <div className="flex justify-between items-center text-[0.65rem] border-t border-border/30 pt-2 text-muted-foreground mt-1">
                        <div>
                          <span className="text-[0.58rem] tracking-wider uppercase font-bold text-muted-foreground/60 mr-1.5">
                            Next:
                          </span>
                          <span className="text-foreground/90 font-medium truncate max-w-[120px] inline-block align-bottom">
                            {course.nextLesson}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-medium text-[0.6rem] whitespace-nowrap bg-surface-raised px-1.5 py-0.5 rounded border border-border/40">
                            {course.hoursRemaining}h left
                          </span>
                          <button
                            onClick={() => handleResumeCourse(course.id)}
                            className="text-gold font-semibold uppercase tracking-wider text-[0.58rem] hover:text-gold-soft transition-colors cursor-pointer"
                          >
                            Resume
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Learning Paths Roadmap Column */}
            <div className="space-y-4 rounded-2xl border border-border/60 bg-surface/20 p-4.5">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <PathIcon className="size-4 text-gold" aria-hidden />
                  <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                    Learning Roadmap
                  </h3>
                </div>
                <span className="text-[0.6rem] bg-secondary border border-gold/30 px-2 py-0.5 rounded-full text-gold font-semibold uppercase tracking-widest">
                  AI & ML Path
                </span>
              </div>

              {/* Vertical Path Roadmap Diagram */}
              <div className="flex flex-col gap-4 relative pl-3.5 mt-2">
                {/* Connecting timeline path line */}
                <div className="absolute top-4 bottom-4 left-6.5 w-[2px] bg-border/40 z-0" />

                {[
                  {
                    node: "Programming",
                    status: "completed",
                    skills: "Python, OOP, Data structures",
                  },
                  {
                    node: "Mathematics",
                    status: "completed",
                    skills: "Linear algebra, Calculus, Stats",
                  },
                  {
                    node: "Machine Learning",
                    status: "active",
                    skills: "Regression, SVM, Dec Trees",
                  },
                  {
                    node: "Deep Learning",
                    status: "locked",
                    skills: "PyTorch, Transformers, CNNs",
                  },
                  { node: "AI Architect", status: "locked", skills: "Deployment, RAG, LLM Ops" },
                ].map((item, idx) => {
                  const isActive = item.status === "active";
                  const isCompleted = item.status === "completed";

                  return (
                    <div key={idx} className="flex gap-4 items-start relative z-10">
                      {/* Connector node circle */}
                      <div
                        className={`size-6 rounded-full flex items-center justify-center border shrink-0 transition-all duration-300 ${
                          isCompleted
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                            : isActive
                              ? "bg-gold/15 border-gold text-gold shadow-[0_0_12px_rgba(198,162,94,0.3)] animate-pulse"
                              : "bg-surface-raised border-border/60 text-muted-foreground/50"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckIcon className="size-3.5" />
                        ) : isActive ? (
                          <TrendIcon className="size-3" />
                        ) : (
                          <Lock className="size-2.5" />
                        )}
                      </div>

                      {/* Node Texts */}
                      <div className="space-y-0.5">
                        <h4
                          className={`text-xs font-semibold tracking-wide transition-all ${
                            isCompleted
                              ? "text-foreground/80 line-through decoration-muted-foreground/35"
                              : isActive
                                ? "text-gold font-bold scale-[1.02] origin-left"
                                : "text-muted-foreground/60"
                          }`}
                        >
                          {item.node}
                        </h4>
                        <p className="text-[0.6rem] text-muted-foreground/75 leading-none">
                          {item.skills}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* C. Virtual Bookshelf Section */}
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            {/* Virtual Shelf cabinet */}
            <div className="rounded-2xl border border-border/60 bg-surface/20 p-4.5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <ScrollIcon className="size-4 text-gold" aria-hidden />
                  <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                    Virtual Bookshelf
                  </h3>
                </div>
                <span className="text-[0.62rem] text-muted-foreground font-medium">
                  Click to inspect
                </span>
              </div>

              {/* Wooden Bookshelf Box */}
              <div className="rounded-xl border border-amber-950/70 bg-amber-950/15 p-4 flex flex-col justify-end min-h-[220px] shadow-[inset_0_2px_15px_rgba(0,0,0,0.85)] relative">
                {/* Horizontal bookshelf row */}
                <div className="flex items-end justify-center gap-2.5 border-b-6 border-amber-950/80 pb-1 z-10 h-44">
                  {books.map((book) => {
                    const isSelected = selectedBookId === book.id;
                    return (
                      <button
                        key={book.id}
                        onClick={() => setSelectedBookId(book.id)}
                        className={`h-38 w-8.5 rounded-t-sm border border-b-0 cursor-pointer select-none text-[0.6rem] font-semibold tracking-wider font-display transition-all duration-300 hover:-translate-y-4 hover:shadow-[0_8px_20px_rgba(198,162,94,0.2)] flex flex-col justify-between py-3 items-center ${
                          book.bgClass
                        } ${book.borderClass} ${
                          isSelected
                            ? "border-gold shadow-[0_0_12px_rgba(198,162,94,0.3)] h-40 ring-1 ring-gold/20"
                            : "opacity-85 hover:opacity-100"
                        }`}
                        style={{ writingMode: "vertical-rl" }}
                      >
                        <span className="truncate max-h-[90px]">{book.title}</span>
                        <span className="text-[0.5rem] tracking-normal font-sans opacity-70">
                          {book.progress}%
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Shelf backdrop gradient shadow */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Reading Details & Current Topic stack */}
            <div className="space-y-6">
              {/* Selected Book details — nothing to show if the shelf is empty */}
              {activeBook && (
                <div className="rounded-2xl border border-border/60 bg-surface/20 p-4.5 flex flex-col justify-between min-h-[125px]">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
                        Reading Progress
                      </p>
                      <span className="text-gold font-display text-xs font-semibold">
                        {activeBook.progress}% Complete
                      </span>
                    </div>
                    <h4 className="font-display text-base font-semibold leading-tight text-foreground">
                      {activeBook.title}
                    </h4>
                    <p className="text-[0.62rem] text-muted-foreground">
                      By {activeBook.author} • Chapter{" "}
                      {activeBook.currentChapter ? "Active" : "None"}
                    </p>
                  </div>

                  <div className="space-y-2.5 mt-4">
                    <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                      <span>{activeBook.currentChapter || "No Chapter"}</span>
                      <span className="font-semibold text-foreground">
                        {activeBook.hoursRemaining}h remaining
                      </span>
                    </div>
                    <ProgressBar value={activeBook.progress} className="h-1.5" />

                    <button
                      onClick={() => handleResumeBook(activeBook.id)}
                      className="mt-1 w-full h-7.5 rounded-lg bg-gold/90 hover:bg-gold text-primary-foreground font-semibold tracking-wider uppercase text-[0.58rem] shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play className="size-3 fill-current" />
                      Resume Reading
                    </button>
                  </div>
                </div>
              )}

              {/* Current Topic panel */}
              <div className="relative rounded-2xl border border-border/60 bg-surface/20 p-4.5 overflow-hidden flex flex-col justify-between min-h-[140px]">
                {/* Ink Painting Backdrop */}
                <svg
                  className="absolute right-0 bottom-0 pointer-events-none select-none opacity-[0.06] text-gold"
                  width="130"
                  height="130"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  <path d="M10,90 Q40,40 50,60 T90,30 Q90,65 50,80 Z" />
                  <path
                    d="M30,85 C40,75 50,75 60,85"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <circle cx="75" cy="20" r="5" className="fill-red-800" />
                </svg>

                <div className="space-y-1.5">
                  <PanelLabel className="mb-0">Current Focus Topic</PanelLabel>
                  <h4 className="font-display text-md font-semibold text-foreground">
                    Gradient Descent Optimization
                  </h4>
                  <p className="text-[0.62rem] text-muted-foreground leading-relaxed max-w-[210px] font-sans">
                    Understanding optimization models, loss curves, and learning rate weights inside
                    vector spaces.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
                  <span className="text-[0.6rem] font-semibold text-gold-dim">
                    Machine Learning Techniques
                  </span>
                  <button
                    onClick={() => handleResumeCourse("course-mlt")}
                    className="flex items-center gap-1 text-[0.58rem] font-bold text-gold hover:text-gold-soft transition-all uppercase cursor-pointer"
                  >
                    Continue Learning
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* D. Weekly Analytics Graphs */}
          <div className="rounded-2xl border border-border/60 bg-surface/20 p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <TrendIcon className="size-4 text-gold" aria-hidden />
                <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                  Weekly Analytics
                </h3>
              </div>
              <span className="text-[0.62rem] text-muted-foreground/80 font-medium">
                Last updated: Today
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Daily Bar Chart */}
              <div className="space-y-3">
                <p className="text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold pl-1">
                  Study Hours (Daily)
                </p>
                <div className="rounded-xl border border-border/40 bg-background/25 p-3 h-36 flex items-end justify-between gap-1.5">
                  {[
                    { day: "M", val: 2.5, h: "h-[50%]" },
                    { day: "T", val: 3.2, h: "h-[64%]" },
                    { day: "W", val: 1.8, h: "h-[36%]" },
                    { day: "T", val: 4.0, h: "h-[80%]" },
                    { day: "F", val: 2.1, h: "h-[42%]" },
                    { day: "S", val: 0.0, h: "h-[2%]" },
                    { day: "S", val: 5.0, h: "h-[100%]" },
                  ].map((bar, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group/bar"
                    >
                      <div className="relative w-full flex justify-center items-end h-24">
                        <div
                          className={`w-3.5 rounded-sm bg-gold/45 group-hover/bar:bg-gold transition-all duration-300 ${bar.h} shadow-sm`}
                        />
                        {/* Hover tooltip */}
                        <span className="absolute bottom-full mb-1 opacity-0 group-hover/bar:opacity-100 bg-surface border border-border text-[0.55rem] px-1 rounded font-semibold text-foreground pointer-events-none transition-opacity">
                          {bar.val}h
                        </span>
                      </div>
                      <span className="text-[0.6rem] text-muted-foreground font-bold">
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject Completion horizontal metrics */}
              <div className="space-y-3">
                <p className="text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold pl-1">
                  Subject Distribution
                </p>
                <div className="rounded-xl border border-border/40 bg-background/25 p-3.5 h-36 flex flex-col justify-between text-[0.65rem]">
                  {[
                    { name: "Machine Learning", color: "bg-gold", w: "w-[72%]" },
                    { name: "Linear Algebra", color: "bg-amber-600/70", w: "w-[45%]" },
                    { name: "Algorithms (DSA)", color: "bg-emerald-600/70", w: "w-[68%]" },
                    { name: "Probability", color: "bg-slate-600/70", w: "w-[54%]" },
                  ].map((subj, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-muted-foreground font-medium">
                        <span>{subj.name}</span>
                        <span className="text-foreground">{subj.w.match(/\d+/)?.[0]}%</span>
                      </div>
                      <div className="h-1 w-full bg-accent/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${subj.color} ${subj.w}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap & Consistency info */}
              <div className="space-y-3">
                <p className="text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold pl-1">
                  Consistency Heatmap
                </p>
                <div className="rounded-xl border border-border/40 bg-background/25 p-3.5 h-36 flex flex-col justify-between">
                  {/* Heatmap grid (7 columns, 4 rows for 4 weeks) */}
                  <div className="grid grid-cols-7 gap-1.5 justify-center">
                    {[
                      4, 2, 0, 3, 1, 4, 3, 3, 1, 2, 4, 0, 1, 2, 2, 4, 3, 2, 4, 1, 0, 4, 3, 4, 4, 2,
                      3, 4,
                    ].map((level, idx) => {
                      const color =
                        level === 4
                          ? "bg-gold shadow-[0_0_4px_rgba(198,162,94,0.2)]"
                          : level === 3
                            ? "bg-gold/60"
                            : level === 2
                              ? "bg-gold/35"
                              : level === 1
                                ? "bg-gold/15"
                                : "bg-accent/40";
                      return (
                        <div
                          key={idx}
                          title={`Focus Level: ${level}`}
                          className={`size-3 rounded-xs ${color} transition-all duration-300 hover:scale-110 cursor-pointer`}
                        />
                      );
                    })}
                  </div>
                  <div className="border-t border-border/30 pt-2 flex items-center justify-between text-[0.6rem] text-muted-foreground">
                    <span className="font-semibold text-gold-dim">92% Consistency</span>
                    <span className="font-medium">28 Focus Sessions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE COLUMN (Assignments, Exams, Mastery Indicators) - takes 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* A. Assignments Panel */}
          <div className="rounded-2xl border border-border/60 bg-surface/20 p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <ScrollIcon className="size-4 text-gold" aria-hidden />
                <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                  Assignments
                </h3>
              </div>
              <span className="text-[0.65rem] text-muted-foreground font-semibold">View All</span>
            </div>

            {/* List */}
            <div className="space-y-3">
              {assignments.map((assign) => (
                <div
                  key={assign.id}
                  className="rounded-xl border border-border/50 bg-background/30 p-3 flex flex-col gap-2 hover:border-gold/25 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground leading-snug">
                        {assign.name}
                      </h4>
                      <p className="text-[0.6rem] text-muted-foreground mt-0.5">{assign.subject}</p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[0.58rem] font-bold uppercase tracking-wider ${
                        assign.priority === "High"
                          ? "bg-red-950/30 text-red-400 border border-red-900/40"
                          : assign.priority === "Medium"
                            ? "bg-amber-950/30 text-amber-400 border border-amber-900/40"
                            : "bg-slate-900/30 text-slate-400 border border-slate-800/40"
                      }`}
                    >
                      {assign.priority}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[0.62rem] text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <KoyomiIcon className="size-3" aria-hidden />
                      <span>
                        Due{" "}
                        {new Date(assign.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">
                        {Math.floor(assign.durationMinutes / 60)}h {assign.durationMinutes % 60}m
                      </span>
                      <button
                        onClick={() => handleStartAssignment(assign.id)}
                        className="text-gold font-bold uppercase tracking-wider text-[0.58rem] hover:text-gold-soft transition-colors cursor-pointer"
                      >
                        {assign.progress > 0 ? `${assign.progress}% Start` : "Start"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B. Upcoming Exams Panel */}
          <div className="rounded-2xl border border-border/60 bg-surface/20 p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <KoyomiIcon className="size-4 text-gold" aria-hidden />
                <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                  Upcoming Exams
                </h3>
              </div>
              <span className="text-[0.65rem] text-muted-foreground font-semibold">Schedule</span>
            </div>

            {/* List */}
            <div className="space-y-3">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-xl border border-border/50 bg-background/30 p-3 flex flex-col gap-2 hover:border-gold/25 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground leading-snug">
                        {exam.name}
                      </h4>
                      <p className="text-[0.6rem] text-muted-foreground mt-0.5">{exam.subject}</p>
                    </div>
                    <span className="text-[0.62rem] font-bold text-red-400 font-display">
                      {(() => {
                        const d = daysUntil(exam.date);
                        return d > 0 ? `in ${d} days` : d === 0 ? "today" : "past";
                      })()}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-1">
                    <div className="flex justify-between items-center text-[0.6rem] text-muted-foreground">
                      <span>Revision Progress</span>
                      <span className="text-foreground font-semibold">
                        {exam.revisionProgress}%
                      </span>
                    </div>
                    <ProgressBar value={exam.revisionProgress} className="h-1" />
                  </div>

                  <button
                    onClick={() => handleReviseExam(exam.id)}
                    className="mt-1 w-full h-6.5 rounded-lg border border-border/60 hover:bg-surface-raised hover:text-foreground text-muted-foreground font-bold tracking-wider uppercase text-[0.58rem] transition-colors cursor-pointer"
                  >
                    Quick Revision
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* C. Knowledge Progress card */}
          <div className="rounded-2xl border border-border/60 bg-surface/20 p-4.5 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <PagodaIcon className="size-4 text-gold" aria-hidden />
                <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                  Mastery Progress
                </h3>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 py-3">
              {/* Overall Progress ring */}
              <div className="relative size-32 select-none flex items-center justify-center">
                <svg width={128} height={128} className="-rotate-90">
                  <circle
                    cx={64}
                    cy={64}
                    r={56}
                    fill="none"
                    strokeWidth={5}
                    className="stroke-accent/40"
                  />
                  <circle
                    cx={64}
                    cy={64}
                    r={56}
                    fill="none"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 - 2 * Math.PI * 56 * 0.64}
                    className="stroke-gold transition-all duration-[1600ms] ease-out shadow-sm"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-display">
                  <span className="text-3xl font-medium text-foreground leading-none">64%</span>
                  <span className="text-[0.58rem] tracking-widest text-muted-foreground/80 mt-1 uppercase font-bold">
                    Complete
                  </span>
                </div>
              </div>

              {/* Next Milestone metrics */}
              <div className="w-full text-center space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Next Milestone: AI Scholar
                  </h4>
                  <p className="text-[0.62rem] text-muted-foreground mt-0.5">
                    Complete 80% of current learning paths
                  </p>
                </div>
                <div className="rounded-lg bg-background/30 border border-border/50 p-2 text-[0.62rem] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  <span className="font-semibold text-gold font-display text-xs block mb-0.5">
                    2,920 XP Required
                  </span>
                  Accumulate focus hours in Machine Learning and math to level up.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
