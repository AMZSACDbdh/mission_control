import { Check } from "lucide-react";

import { EnsoRing } from "./EnsoRing";
import { Panel, SectionLabel } from "./Panel";
import { ProgressBar } from "./ProgressBar";
import { countDone, subtaskProgress, type Objective, type StepDone } from "@/data/plan";
import { cn } from "@/lib/utils";

export function ObjectiveCard({
  objective,
  stepDone,
  onToggleSubtask,
}: {
  objective: Objective;
  /** Ledger-backed completion lookup for the objective's steps. */
  stepDone: StepDone;
  onToggleSubtask: (subtaskId: string) => void;
}) {
  const progress = subtaskProgress(objective.subtasks, stepDone);
  const doneCount = countDone(objective.subtasks, stepDone);

  return (
    <section className="flex h-full flex-col">
      <SectionLabel>Today&apos;s Main Objective</SectionLabel>

      <Panel className="relative flex flex-1 flex-col justify-between overflow-hidden p-7">
        {/* Kamon watermark bleeding off the right edge. */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden
          className="pointer-events-none absolute -top-6 right-16 size-44 text-gold/[0.05]"
        >
          {Array.from({ length: 8 }, (_, i) => i * 45).map((a) => (
            <path
              key={a}
              transform={`rotate(${a} 50 50)`}
              d="M50,14 C60,28 62,40 50,52 C38,40 40,28 50,14 Z"
              fill="currentColor"
            />
          ))}
        </svg>

        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h3 className="font-display text-[2rem] leading-[1.2] font-medium text-foreground">
              {objective.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {objective.subtitle}
            </p>
          </div>

          {/* 道 — the ring itself reports the objective's progress. */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative grid size-[5.5rem] place-items-center">
              <EnsoRing
                value={progress}
                size={88}
                stroke={2.5}
                label={`Objective ${progress} percent complete`}
                className="absolute inset-0"
              />
              <span className="font-display text-[2rem] leading-none text-gilded">道</span>
            </div>
            <span className="text-[0.5rem] tracking-[0.28em] text-gold-dim/80 uppercase">
              The Way
            </span>
          </div>
        </div>

        <ul className="relative mt-6 space-y-0.5">
          {objective.subtasks.map((subtask) => {
            const done = stepDone(subtask.id);
            return (
              <li key={subtask.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  onClick={() => onToggleSubtask(subtask.id)}
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
                    <Check className="size-2.5 stroke-[3]" />
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

        <div className="relative mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[0.58rem] tracking-[0.24em] text-muted-foreground uppercase">
              Progress
            </span>
            <span className="text-[0.7rem] tabular-nums text-gold-soft">
              {doneCount} of {objective.subtasks.length} steps · {progress}%
            </span>
          </div>
          <ProgressBar value={progress} label="Main objective progress" />
        </div>
      </Panel>
    </section>
  );
}
