import { useState } from "react";
import { ChevronDown, GripVertical, Info } from "lucide-react";
import { CheckIcon } from "./JapaneseIcons";

import { Panel, SectionLabel } from "./Panel";
import { ProgressBar } from "./ProgressBar";
import { iconFor } from "@/data/icons";
import {
  countDone,
  isTaskComplete,
  priorityMeaning,
  subtaskProgress,
  type PlannedTask,
  type Priority,
  type StepDone,
} from "@/data/plan";
import { formatDuration } from "@/data/mission";
import { cn } from "@/lib/utils";

const priorityStyle: Record<Priority, string> = {
  critical: "border-gold/60 bg-gold/10 text-gold",
  high: "border-gold/25 text-gold-dim",
  standard: "border-border text-muted-foreground",
};

export function EssentialTasks({
  tasks,
  stepDoneFor,
  onToggleSubtask,
  onReorder,
}: {
  tasks: PlannedTask[];
  /** Ledger-backed completion lookup, scoped to one task. */
  stepDoneFor: (taskId: string) => StepDone;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  return (
    <section aria-labelledby="essential-tasks-heading">
      <div className="flex items-baseline justify-between">
        <SectionLabel id="essential-tasks-heading">Three Essential Tasks</SectionLabel>
        <button
          type="button"
          onClick={() => setShowLegend((s) => !s)}
          aria-expanded={showLegend}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[0.58rem] tracking-[0.12em] text-muted-foreground/70 uppercase transition-colors hover:text-gold"
        >
          <Info className="size-3" aria-hidden />
          What do these mean?
        </button>
      </div>

      {showLegend && (
        <Panel className="animate-rise mb-3 p-4" interactive={false}>
          <dl className="space-y-2">
            {(Object.keys(priorityMeaning) as Priority[]).map((key) => (
              <div key={key} className="flex gap-3">
                <dt
                  className={cn(
                    "h-fit w-20 shrink-0 rounded-full border px-2 py-0.5 text-center text-[0.55rem] tracking-[0.14em] uppercase",
                    priorityStyle[key],
                  )}
                >
                  {priorityMeaning[key].label}
                </dt>
                <dd className="text-xs text-muted-foreground">{priorityMeaning[key].blurb}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      <ul className="space-y-3.5">
        {tasks.map((task, index) => {
          const Icon = iconFor[task.iconKey] ?? iconFor.study;
          const stepDone = stepDoneFor(task.id);
          const progress = subtaskProgress(task.subtasks, stepDone);
          const complete = isTaskComplete(task, stepDone);
          const doneCount = countDone(task.subtasks, stepDone);
          const isOpen = expanded === task.id;

          return (
            <li
              key={task.id}
              draggable
              onDragStart={(e) => {
                setDraggingId(task.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", task.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(task.id);
              }}
              onDragLeave={() => setOverId((c) => (c === task.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/plain") || draggingId;
                if (fromId) onReorder(fromId, task.id);
                setDraggingId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
              className={cn(
                "transition-opacity duration-300",
                draggingId === task.id && "opacity-40",
              )}
            >
              <Panel
                className={cn(
                  "group px-6 py-5",
                  overId === task.id && draggingId !== task.id && "border-gold/50",
                )}
              >
                <div className="flex items-center gap-5">
                  <span
                    className="hidden cursor-grab text-muted-foreground/30 transition-colors group-hover:text-gold-dim active:cursor-grabbing sm:block"
                    aria-hidden
                  >
                    <GripVertical className="size-4" />
                  </span>

                  <span className="font-display w-5 shrink-0 text-[1.75rem] leading-none text-gold/80 tabular-nums">
                    {index + 1}
                  </span>

                  <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-border/60 bg-background/30 text-gold-dim transition-colors duration-500 group-hover:border-gold/40 group-hover:text-gold">
                    <Icon className="size-5" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3
                        className={cn(
                          "font-display relative text-[1.15rem] leading-tight text-foreground",
                          "after:absolute after:top-1/2 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-700 after:ease-[cubic-bezier(0.22,1,0.36,1)] after:content-['']",
                          complete && "text-muted-foreground after:scale-x-100",
                        )}
                      >
                        {task.title}
                      </h3>
                      <span
                        title={priorityMeaning[task.priority].blurb}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[0.52rem] tracking-[0.16em] uppercase",
                          priorityStyle[task.priority],
                        )}
                      >
                        {priorityMeaning[task.priority].label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[0.82rem] text-muted-foreground">
                      {task.description}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <ProgressBar
                        value={progress}
                        className="h-[3px] max-w-sm flex-1"
                        label={`${task.title} progress`}
                      />
                      <span className="shrink-0 text-[0.6rem] tabular-nums text-muted-foreground/70">
                        {doneCount}/{task.subtasks.length} steps
                      </span>
                    </div>
                  </div>

                  <span className="hidden shrink-0 text-[0.95rem] text-muted-foreground tabular-nums md:block">
                    {formatDuration(task.durationMinutes)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : task.id)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Hide" : "Show"} steps for ${task.title}`}
                    className={cn(
                      "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border transition-all duration-500",
                      complete
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border/70 text-muted-foreground/50 hover:border-gold/60 hover:text-gold",
                    )}
                  >
                    {complete ? (
                      <CheckIcon className="size-4" aria-hidden />
                    ) : (
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform duration-300",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                </div>

                {isOpen && (
                  <ul className="animate-rise mt-4 space-y-1 border-t border-border/40 pt-4 pl-[5.5rem]">
                    {task.subtasks.map((subtask) => {
                      const done = stepDone(subtask.id);
                      return (
                        <li key={subtask.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={done}
                            onClick={() => onToggleSubtask(task.id, subtask.id)}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/40"
                          >
                            <span
                              className={cn(
                                "grid size-4 shrink-0 place-items-center rounded-full border transition-all duration-300",
                                done
                                  ? "border-gold bg-gold/20 text-gold"
                                  : "border-border/70 text-transparent",
                              )}
                              aria-hidden
                            >
                              <CheckIcon className="size-3" />
                            </span>
                            <span
                              className={cn(
                                "text-[0.82rem]",
                                done
                                  ? "text-muted-foreground line-through decoration-gold/40"
                                  : "text-foreground/85",
                              )}
                            >
                              {subtask.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
