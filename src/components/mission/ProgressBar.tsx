import { useAnimatedProgress } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const animated = useAnimatedProgress(value);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-accent/70", className)}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-gold-dim to-gold-soft transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${Math.max(0, Math.min(100, animated))}%` }}
      />
    </div>
  );
}
