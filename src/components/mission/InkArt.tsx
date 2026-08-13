import { cn } from "@/lib/utils";

export type InkMotif = "mountains" | "bamboo" | "branch" | "wave" | "pine" | "moon";

/**
 * Sumi-e brush artwork used as decorative page furniture.
 * Always aria-hidden and pointer-events-none — never carries meaning.
 */
export function InkArt({ motif, className }: { motif: InkMotif; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      fill="none"
    >
      {motif === "mountains" && (
        <>
          <path
            d="M0,140 L38,58 Q46,44 55,58 L84,110 L104,74 Q112,60 121,74 L165,140 Z"
            fill="currentColor"
            opacity="0.55"
          />
          <path
            d="M52,140 L96,66 Q104,52 113,66 L150,124 L168,96 Q175,85 182,96 L200,140 Z"
            fill="currentColor"
            opacity="0.3"
          />
          <path
            d="M0,140 Q54,124 100,132 T200,126"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.4"
          />
        </>
      )}

      {motif === "bamboo" && (
        <>
          <path
            d="M64,140 L64,12 M92,140 L92,30"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M56,104 L72,104 M56,72 L72,72 M56,40 L72,40 M84,112 L100,112 M84,78 L100,78"
            stroke="currentColor"
            strokeWidth="1.6"
            opacity="0.5"
          />
          <path
            d="M64,44 Q40,26 18,36 Q40,44 64,44 Z M92,82 Q118,64 140,74 Q116,84 92,82 Z M64,76 Q42,66 26,76 Q46,82 64,76 Z"
            fill="currentColor"
            opacity="0.6"
          />
        </>
      )}

      {motif === "branch" && (
        <>
          <path
            d="M8,132 Q56,104 88,66 T176,16"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M88,66 Q104,74 116,92 M132,44 Q150,48 160,62"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.55"
          />
          {[
            [176, 16],
            [160, 62],
            [116, 92],
            [132, 44],
            [88, 66],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`} opacity="0.7">
              <circle cx={cx} cy={cy} r="5" fill="currentColor" opacity="0.35" />
              <circle cx={cx} cy={cy} r="2" fill="currentColor" />
            </g>
          ))}
        </>
      )}

      {motif === "wave" && (
        <>
          <path
            d="M0,96 Q26,70 52,96 T104,96 T156,96 T208,96"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M0,116 Q26,92 52,116 T104,116 T156,116 T208,116"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M0,134 Q26,112 52,134 T104,134 T156,134 T208,134"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.25"
          />
        </>
      )}

      {motif === "pine" && (
        <>
          <path
            d="M100,140 L100,52"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M100,58 Q72,44 52,52 M100,58 Q128,44 148,52 M100,86 Q78,74 60,80 M100,86 Q122,74 140,80"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.55"
          />
          <ellipse cx="72" cy="46" rx="20" ry="9" fill="currentColor" opacity="0.4" />
          <ellipse cx="130" cy="46" rx="20" ry="9" fill="currentColor" opacity="0.4" />
          <ellipse cx="100" cy="30" rx="26" ry="11" fill="currentColor" opacity="0.5" />
        </>
      )}

      {motif === "moon" && (
        <>
          <circle cx="100" cy="60" r="38" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <circle cx="100" cy="60" r="38" fill="currentColor" opacity="0.12" />
          <path
            d="M0,128 Q50,112 100,122 T200,116"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.45"
          />
          <path d="M28,140 Q60,96 92,140 Z" fill="currentColor" opacity="0.35" />
        </>
      )}
    </svg>
  );
}
