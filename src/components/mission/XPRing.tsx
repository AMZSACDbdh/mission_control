import { useAnimatedProgress } from "@/hooks/use-count-up";

export function XPRing({
  value,
  max,
  size = 68,
  label,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  label?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const animated = useAnimatedProgress(pct);
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)} percent complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-accent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - c * animated}
          className="stroke-gold transition-[stroke-dashoffset] duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
