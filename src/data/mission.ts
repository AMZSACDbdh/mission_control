import {
  BookOpen,
  Dumbbell,
  PenLine,
  Coffee,
  Sunrise,
  Target,
  Moon,
  type LucideIcon,
} from "lucide-react";

export type Priority = "critical" | "high" | "standard";

export type EssentialTask = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priority: Priority;
  progress: number; // 0-100
  completed: boolean;
  icon: LucideIcon;
};

export const initialTasks: EssentialTask[] = [
  {
    id: "task-study",
    title: "Study Advanced Machine Learning",
    description: "Deep understanding builds mastery.",
    durationMinutes: 150,
    priority: "critical",
    progress: 60,
    completed: false,
    icon: BookOpen,
  },
  {
    id: "task-assignment",
    title: "Finish Week 4 Assignment",
    description: "Excellence today, confidence tomorrow.",
    durationMinutes: 120,
    priority: "high",
    progress: 25,
    completed: false,
    icon: PenLine,
  },
  {
    id: "task-training",
    title: "Strength Training",
    description: "Build the body, strengthen the mind.",
    durationMinutes: 60,
    priority: "standard",
    progress: 0,
    completed: false,
    icon: Dumbbell,
  },
];

export type TimelineStatus = "completed" | "current" | "upcoming";

export type TimelineBlock = {
  id: string;
  time: string;
  label: string;
  detail: string;
  status: TimelineStatus;
  icon: LucideIcon;
};

export const timeline: TimelineBlock[] = [
  {
    id: "morning",
    time: "06:00",
    label: "Morning Routine",
    detail: "Breathwork, cold shower, green tea.",
    status: "completed",
    icon: Sunrise,
  },
  {
    id: "deep-work",
    time: "07:00",
    label: "Deep Work",
    detail: "High focus • No distractions.",
    status: "completed",
    icon: Target,
  },
  {
    id: "break",
    time: "10:00",
    label: "Break",
    detail: "Rest. Reflect. Reset.",
    status: "current",
    icon: Coffee,
  },
  {
    id: "study",
    time: "10:30",
    label: "Study",
    detail: "Advanced Machine Learning, module 7.",
    status: "upcoming",
    icon: BookOpen,
  },
  {
    id: "workout",
    time: "17:00",
    label: "Workout",
    detail: "Lower body strength, 60 minutes.",
    status: "upcoming",
    icon: Dumbbell,
  },
  {
    id: "evening",
    time: "21:00",
    label: "Evening Review",
    detail: "Journal the day, plan tomorrow.",
    status: "upcoming",
    icon: Moon,
  },
];

/**
 * Legacy mockup figures from before the Activity Ledger existed.
 *
 * Nothing reads these any more: rank, level, XP and streak are folded from the
 * ledger, and the user's name lives in Settings (`lib/profile.ts`) rather than
 * being compiled into the app. Kept out of the export surface deliberately —
 * anything importing a hardcoded statistic is a bug.
 */

export const dailyQuote = {
  text: "The swordsman does not seek the sword. The sword seeks the swordsman.",
  author: "Miyamoto Musashi",
  source: "The Book of Five Rings",
};

export const proverb = {
  japanese: "一日一生",
  translation: "Live each day as if it were an entire lifetime.",
};

export const defaultIntention =
  "I will focus on what matters and let go of what does not. Calm hands, clear mind, one deliberate step at a time.";

export const mainObjective = {
  title: "Complete Week 4 Assignment",
  subtitle: "Make it exceptional — submit before the evening review.",
  progress: 45,
};

export const todayWeather = {
  condition: "Clear Sky",
  temperatureC: 23,
};

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? `${h}h ` : ""}${m.toString().padStart(2, "0")}m`;
}
