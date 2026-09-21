import { useMemo, useState } from "react";
import { BellRing, X } from "lucide-react";
import { CheckIcon, MoonIcon } from "./JapaneseIcons";

import { Panel, PanelLabel } from "./Panel";
import { SealStamp } from "./SealStamp";
import { iconChoices } from "@/data/icons";
import {
  createDefaultPlan,
  makeSubtasks,
  priorityMeaning,
  priorityOrder,
  sortByPriority,
  type DayPlan,
  type IconKey,
  type Priority,
} from "@/data/plan";
import { cn } from "@/lib/utils";
import { platform } from "@/platform";

type Draft = {
  title: string;
  description: string;
  priority: Priority;
  iconKey: IconKey;
  durationMinutes: number;
  steps: string;
};

const emptyDraft = (priority: Priority): Draft => ({
  title: "",
  description: "",
  priority,
  iconKey: "study",
  durationMinutes: 60,
  steps: "",
});

const priorityStyle: Record<Priority, string> = {
  critical: "border-gold/60 bg-gold/10 text-gold",
  high: "border-gold/25 text-gold-dim",
  standard: "border-border text-muted-foreground",
};

export function NightlyPlanner({
  dateLabel,
  existing,
  onSave,
  onDismiss,
  notificationsEnabled,
  onEnableNotifications,
}: {
  dateLabel: string;
  existing: DayPlan | null;
  onSave: (plan: DayPlan) => void;
  onDismiss: () => void;
  notificationsEnabled: boolean;
  onEnableNotifications: () => void;
}) {
  const base = useMemo(() => existing ?? createDefaultPlan(), [existing]);

  const [intention, setIntention] = useState(base.intention);
  const [objectiveTitle, setObjectiveTitle] = useState(base.objective.title);
  const [objectiveSteps, setObjectiveSteps] = useState(
    base.objective.subtasks.map((s) => s.label).join("\n"),
  );
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    priorityOrder.map((priority, i) => {
      const source = base.tasks[i];
      return source
        ? {
            title: source.title,
            description: source.description,
            priority: source.priority,
            iconKey: source.iconKey,
            durationMinutes: source.durationMinutes,
            steps: source.subtasks.map((s) => s.label).join("\n"),
          }
        : emptyDraft(priority);
    }),
  );

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const canSave = drafts.some((d) => d.title.trim().length > 0);

  const handleSave = () => {
    const tasks = drafts
      .filter((d) => d.title.trim())
      .map((d, i) => ({
        id: `task-${i}-${d.title.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24)}`,
        title: d.title.trim(),
        description: d.description.trim() || "—",
        durationMinutes: Number.isFinite(d.durationMinutes) ? d.durationMinutes : 60,
        priority: d.priority,
        iconKey: d.iconKey,
        subtasks: makeSubtasks(d.steps.split("\n"), `t${i}`),
      }));

    onSave({
      intention: intention.trim() || base.intention,
      objective: {
        title: objectiveTitle.trim() || base.objective.title,
        subtitle: base.objective.subtitle,
        subtasks: makeSubtasks(objectiveSteps.split("\n"), "obj"),
      },
      // Critical first, so tomorrow opens with the right task at number one.
      tasks: sortByPriority(tasks),
      timeline: base.timeline,
    });
  };

  const field =
    "w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-gold/50 placeholder:text-muted-foreground/50";

  return (
    <Panel as="section" className="animate-rise p-6" interactive={false}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-start gap-3">
          <MoonIcon className="mt-0.5 size-5 shrink-0 text-gold animate-glow" aria-hidden />
          <div>
            <PanelLabel className="mb-1">Plan Tomorrow</PanelLabel>
            <p className="text-sm text-muted-foreground">
              Set the three tasks, the objective and the intention for{" "}
              <span className="text-foreground">{dateLabel}</span>.
            </p>
            {notificationsEnabled && !platform.capabilities.canScheduleInBackground && (
              // Said plainly rather than implied: this reminder cannot reach you
              // once the app is closed. The desktop build lifts the limit, and
              // this line disappears on its own when the capability turns on.
              <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground/70">
                Reminders arrive only while Mission Control is open.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!notificationsEnabled && (
            <button
              type="button"
              onClick={onEnableNotifications}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold"
            >
              <BellRing className="size-3" aria-hidden />
              Enable reminders
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss the planner for tonight"
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {drafts.map((draft, index) => (
          <div
            key={index}
            className="space-y-2.5 rounded-xl border border-border/50 bg-background/25 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl text-gold-dim tabular-nums">{index + 1}</span>
              <div className="flex gap-1">
                {priorityOrder.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => update(index, { priority: p })}
                    aria-pressed={draft.priority === p}
                    title={priorityMeaning[p].blurb}
                    className={cn(
                      "cursor-pointer rounded-full border px-2 py-0.5 text-[0.55rem] tracking-[0.12em] uppercase transition-colors",
                      draft.priority === p
                        ? priorityStyle[p]
                        : "border-border/50 text-muted-foreground/60 hover:text-foreground",
                    )}
                  >
                    {priorityMeaning[p].label}
                  </button>
                ))}
              </div>
            </div>

            <input
              className={field}
              placeholder="Task title"
              value={draft.title}
              onChange={(e) => update(index, { title: e.target.value })}
            />
            <input
              className={field}
              placeholder="One line of why it matters"
              value={draft.description}
              onChange={(e) => update(index, { description: e.target.value })}
            />

            <div className="flex gap-2">
              <select
                className={cn(field, "cursor-pointer")}
                value={draft.iconKey}
                onChange={(e) => update(index, { iconKey: e.target.value as IconKey })}
                aria-label="Task icon"
              >
                {iconChoices.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={5}
                step={5}
                className={cn(field, "w-24")}
                value={draft.durationMinutes}
                onChange={(e) => update(index, { durationMinutes: Number(e.target.value) })}
                aria-label="Estimated minutes"
              />
            </div>

            <textarea
              className={cn(field, "resize-none")}
              rows={3}
              placeholder={"Steps — one per line\nThese drive the progress bar"}
              value={draft.steps}
              onChange={(e) => update(index, { steps: e.target.value })}
            />
            <p className="text-[0.6rem] text-muted-foreground/70">
              {draft.steps.split("\n").filter((s) => s.trim()).length} steps · each one moves the
              bar
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-2.5">
          <PanelLabel className="mb-0 text-[0.6rem]">Tomorrow&apos;s Objective</PanelLabel>
          <input
            className={field}
            placeholder="The one thing that defines the day"
            value={objectiveTitle}
            onChange={(e) => setObjectiveTitle(e.target.value)}
          />
          <textarea
            className={cn(field, "resize-none")}
            rows={3}
            placeholder={"Steps — one per line"}
            value={objectiveSteps}
            onChange={(e) => setObjectiveSteps(e.target.value)}
          />
        </div>
        <div className="space-y-2.5">
          <PanelLabel className="mb-0 text-[0.6rem]">Tomorrow&apos;s Intention</PanelLabel>
          <textarea
            className={cn(field, "resize-none")}
            rows={5}
            placeholder="How you intend to meet the day"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
        <span className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
          <SealStamp characters="明日" size="sm" />
          Saved to tomorrow — tonight&apos;s board stays untouched.
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft px-6 text-[0.7rem] font-bold tracking-[0.16em] text-primary-foreground uppercase shadow-[0_0_20px_oklch(0.78_0.11_82/25%)] transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckIcon className="size-4" />
          Set Tomorrow
        </button>
      </div>
    </Panel>
  );
}
