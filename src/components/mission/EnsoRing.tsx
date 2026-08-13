import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useAnimatedProgress } from "@/hooks/use-count-up";

/**
 * Enso (円相) progress ring — an ink-brush circle whose stroke tapers at the ends.
 * The gap at the top mirrors the unclosed brush stroke of a real enso.
 */
export function EnsoRing({
  value,
  size = 120,
  stroke = 7,
  label,
  trackClassName = "stroke-accent/45",
  strokeClassName = "stroke-gold",
  children,
  className,
}: {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  trackClassName?: string;
  strokeClassName?: string;
  children?: ReactNode;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const animated = useAnimatedProgress(pct);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // Leave a 10% opening so the circle reads as a brush stroke, not a gauge.
  const arc = circumference * 0.9;

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)} percent complete`}
    >
      <svg width={size} height={size} className="-rotate-[105deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc * animated} ${circumference}`}
          className={cn(
            "transition-[stroke-dasharray] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            strokeClassName,
          )}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
