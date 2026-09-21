import type { ComponentType } from "react";

import {
  BookIcon,
  BrushIcon,
  MasuIcon,
  MatoIcon,
  MoonIcon,
  ScrollIcon,
  StoneIcon,
  SunriseIcon,
  TeaIcon,
} from "@/components/mission/JapaneseIcons";

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

export type TaskIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

/** Icons live outside the stored plan — a plan must serialise to plain JSON. */
export const iconFor: Record<IconKey, TaskIcon> = {
  study: ScrollIcon,
  write: BrushIcon,
  train: StoneIcon,
  sunrise: SunriseIcon,
  target: MatoIcon,
  break: TeaIcon,
  moon: MoonIcon,
  code: MasuIcon,
  read: BookIcon,
};

export const iconChoices: { key: IconKey; label: string }[] = [
  { key: "study", label: "Study" },
  { key: "write", label: "Write" },
  { key: "train", label: "Train" },
  { key: "code", label: "Build" },
  { key: "read", label: "Read" },
  { key: "target", label: "Focus" },
];
