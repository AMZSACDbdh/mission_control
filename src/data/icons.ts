import {
  BookOpen,
  Code2,
  Coffee,
  Dumbbell,
  Moon,
  PenLine,
  Sunrise,
  Target,
  type LucideIcon,
} from "lucide-react";

import type { Area } from "./activity";
import type { IconKey } from "./plan";

/**
 * Which face of practice a task belongs to, inferred from its icon.
 * Keeps the mastery rings meaningful without asking you to tag every task.
 */
export const areaForIcon: Record<IconKey, Area> = {
  study: "knowledge",
  read: "knowledge",
  write: "knowledge",
  code: "knowledge",
  train: "body",
  sunrise: "discipline",
  target: "discipline",
  break: "discipline",
  moon: "spirit",
};

/** Icons live outside the stored plan — a plan must serialise to plain JSON. */
export const iconFor: Record<IconKey, LucideIcon> = {
  study: BookOpen,
  write: PenLine,
  train: Dumbbell,
  sunrise: Sunrise,
  target: Target,
  break: Coffee,
  moon: Moon,
  code: Code2,
  read: BookOpen,
};

export const iconChoices: { key: IconKey; label: string }[] = [
  { key: "study", label: "Study" },
  { key: "write", label: "Write" },
  { key: "train", label: "Train" },
  { key: "code", label: "Build" },
  { key: "read", label: "Read" },
  { key: "target", label: "Focus" },
];
