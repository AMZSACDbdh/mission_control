import type { ComponentType } from "react";

import { Panel, PanelLabel } from "./Panel";
import { ProgressBar } from "./ProgressBar";
import { InkArt, type InkMotif } from "./InkArt";
import { useCountUp } from "@/hooks/use-count-up";

export type StatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  caption?: string;
  progress?: number;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Decorative watermark bleeding off the card's right edge. */
  motif?: InkMotif | "kamon";
};

function Kamon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      {Array.from({ length: 8 }, (_, i) => i * 45).map((a) => (
        <path
          key={a}
          transform={`rotate(${a} 50 50)`}
          d="M50,16 C59,29 61,40 50,51 C39,40 41,29 50,16 Z"
          fill="currentColor"
        />
      ))}
      <circle cx="50" cy="50" r="6" fill="currentColor" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  caption,
  progress,
  icon: Icon,
  motif = "kamon",
}: StatCardProps) {
  const animated = useCountUp(value);

  return (
    <Panel as="article" className="relative overflow-hidden p-6">
      {motif === "kamon" ? (
        <Kamon className="pointer-events-none absolute -right-4 top-1/2 size-28 -translate-y-1/2 text-gold/[0.06]" />
      ) : (
        <InkArt
          motif={motif}
          className="pointer-events-none absolute -right-2 bottom-0 h-24 w-36 text-gold/[0.07]"
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <PanelLabel className="mb-0 text-[0.58rem] tracking-[0.26em]">{label}</PanelLabel>
        {Icon && <Icon className="size-4 shrink-0 text-gold-dim" aria-hidden />}
      </div>

      <p className="relative mt-5 flex items-baseline gap-2.5">
        <span className="font-display text-[2.75rem] leading-none tabular-nums text-gilded">
          {Math.round(animated).toLocaleString()}
        </span>
        {suffix && (
          <span className="text-[0.62rem] tracking-[0.22em] text-muted-foreground uppercase">
            {suffix}
          </span>
        )}
      </p>

      {caption && (
        <p className="relative mt-3 text-[0.78rem] leading-relaxed text-muted-foreground">
          {caption}
        </p>
      )}

      {progress !== undefined && (
        <ProgressBar value={progress} className="relative mt-4" label={`${label} progress`} />
      )}
    </Panel>
  );
}
