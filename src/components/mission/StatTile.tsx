import type { ReactNode } from "react";

import { Panel } from "./Panel";
import { cn } from "@/lib/utils";

/**
 * Horizontal statistic tile: brush icon on the left, label / figure / caption
 * stacked to its right — the row of stats that heads the mockup pages.
 */
export function StatTile({
  icon,
  label,
  value,
  unit,
  caption,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** Small suffix set beside the figure, e.g. `h`, `%`, `Days`. */
  unit?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <Panel as="article" className={cn("flex items-center gap-4 px-5 py-4", className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-gold/25 bg-background/30 text-gold-dim">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.55rem] leading-tight tracking-[0.2em] text-muted-foreground uppercase">
          {label}
        </span>

        <span className="mt-1.5 flex items-baseline gap-1">
          <span className="font-display text-[1.9rem] leading-none tabular-nums text-gilded">
            {value}
          </span>
          {unit && <span className="text-[0.8rem] leading-none text-gold-dim/90">{unit}</span>}
        </span>

        {caption && (
          <span className="mt-1.5 block truncate text-[0.62rem] text-muted-foreground/80">
            {caption}
          </span>
        )}
      </span>
    </Panel>
  );
}
