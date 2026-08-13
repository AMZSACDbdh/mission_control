import { Check } from "lucide-react";

import { Panel, SectionLabel } from "./Panel";
import { iconFor } from "@/data/icons";
import type { TimelineBlock } from "@/data/plan";
import { cn } from "@/lib/utils";

function formatMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}`;
}

type Status = "completed" | "current" | "upcoming";

export function FocusTimeline({
  blocks,
  now,
}: {
  blocks: TimelineBlock[];
  /** Local clock; null before hydration so SSR and client agree. */
  now: Date | null;
}) {
  const minutesNow = now ? now.getHours() * 60 + now.getMinutes() : null;
  const ordered = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);

  const statusOf = (block: TimelineBlock): Status => {
    if (minutesNow === null) return "upcoming";
    if (minutesNow >= block.endMinutes) return "completed";
    if (minutesNow >= block.startMinutes) return "current";
    return "upcoming";
  };

  const active = ordered.find((b) => statusOf(b) === "current");
  const nextUp = ordered.find((b) => statusOf(b) === "upcoming");

  return (
    <section aria-labelledby="focus-timeline-heading" className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <SectionLabel id="focus-timeline-heading">Focus Session Timeline</SectionLabel>
        <span className="text-[0.58rem] tracking-[0.14em] text-muted-foreground/70 uppercase">
          {minutesNow === null
            ? ""
            : active
              ? "In session"
              : nextUp
                ? `Next ${formatMinutes(nextUp.startMinutes)}`
                : "Day complete"}
        </span>
      </div>

      <Panel className="flex-1 px-5 py-5">
        <ol className="relative">
          {/* The rail the markers sit on. */}
          <span className="absolute top-3 bottom-3 left-[3.9rem] w-px bg-border/70" aria-hidden />

          {ordered.map((block) => {
            const status = statusOf(block);
            const Icon = iconFor[block.iconKey] ?? iconFor.target;
            const isCurrent = status === "current";
            const isDone = status === "completed";

            const span = Math.max(1, block.endMinutes - block.startMinutes);
            const elapsed =
              isCurrent && minutesNow !== null
                ? Math.min(100, Math.max(0, ((minutesNow - block.startMinutes) / span) * 100))
                : 0;

            return (
              <li
                key={block.id}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative grid grid-cols-[3.1rem_1.6rem_minmax(0,1fr)] items-center gap-x-3 rounded-lg py-3 pr-3 pl-1 transition-colors duration-500",
                  isCurrent && "bg-gold/8",
                )}
              >
                <span
                  className={cn(
                    "text-right text-[0.82rem] tabular-nums",
                    isCurrent ? "font-medium text-gold" : "text-muted-foreground",
                    status === "upcoming" && "text-muted-foreground/60",
                  )}
                >
                  {formatMinutes(block.startMinutes)}
                </span>

                {/* Marker dot on the rail — gold when live, slate when queued. */}
                <span className="relative grid place-items-center">
                  <span
                    className={cn(
                      "z-1 size-2.5 rounded-full ring-4 ring-surface transition-colors duration-500",
                      isDone && "bg-gold/45",
                      isCurrent && "bg-gold shadow-[0_0_10px_oklch(0.78_0.11_82/60%)]",
                      status === "upcoming" && "bg-sky-500/60",
                    )}
                  />
                  {isCurrent && (
                    <span
                      className="absolute size-3.5 animate-ping rounded-full bg-gold/30"
                      aria-hidden
                    />
                  )}
                </span>

                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md transition-colors duration-500",
                      isCurrent ? "text-gold" : "text-muted-foreground/70",
                      isDone && "text-gold-dim/70",
                    )}
                  >
                    {isDone ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <Icon className="size-4" aria-hidden />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[0.92rem] leading-tight",
                        isCurrent ? "font-medium text-foreground" : "text-foreground/85",
                        isDone && "text-muted-foreground line-through decoration-gold/30",
                        status === "upcoming" && "text-foreground/70",
                      )}
                    >
                      {block.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.72rem] text-muted-foreground/70">
                      {block.detail}
                    </span>

                    {isCurrent && (
                      <span className="mt-2 block h-0.5 w-full overflow-hidden rounded-full bg-accent/60">
                        <span
                          className="block h-full rounded-full bg-linear-to-r from-gold-dim to-gold transition-[width] duration-1000 ease-out"
                          style={{ width: `${elapsed}%` }}
                        />
                      </span>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>
    </section>
  );
}
