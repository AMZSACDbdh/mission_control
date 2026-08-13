import { cn } from "@/lib/utils";

/** Gold lotus kamon — the Mission Control house crest. */
export function LotusMark({ className }: { className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("select-none", className)}>
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.65"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.35"
      />
      {petals.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path
            d="M50,18 C58,28 60,38 50,48 C40,38 42,28 50,18 Z"
            fill="currentColor"
            opacity="0.85"
          />
          <path
            d="M50,20 C55,29 56,37 50,45 C44,37 45,29 50,20 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.5"
          />
        </g>
      ))}
      <circle cx="50" cy="50" r="7" fill="currentColor" />
      <circle
        cx="50"
        cy="50"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.4"
      />
    </svg>
  );
}
