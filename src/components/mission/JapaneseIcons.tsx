import { cn } from "@/lib/utils";

/**
 * Hand-drawn Japanese iconography used across Mission Control.
 *
 * Every glyph is a 24×24 stroke drawing on `currentColor`, so these are
 * drop-in replacements wherever a Lucide icon would otherwise sit.
 */

type IconProps = { className?: string | undefined };

const base = "shrink-0";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn(base, className)}
    >
      {children}
    </svg>
  );
}

/** 鳥居 — torii gate. Thresholds, milestones, sessions entered. */
export function ToriiIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 6h18" />
      <path d="M4.5 8.6h15" />
      <path d="M6.5 8.6V20" />
      <path d="M17.5 8.6V20" />
      <path d="M6.5 12.4h11" />
      <path d="M3 6c2-1.2 16-1.2 18 0" />
    </Svg>
  );
}

/** 塔 — pagoda. Rank, attainment, levels of knowledge. */
export function PagodaIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 2.5 19 7H5l7-4.5Z" />
      <path d="M6.5 7v2.2" />
      <path d="M17.5 7v2.2" />
      <path d="M4 9.4h16" />
      <path d="M6.5 11.6v2.2" />
      <path d="M17.5 11.6v2.2" />
      <path d="M5.2 13.8h13.6" />
      <path d="M8 16v5" />
      <path d="M16 16v5" />
      <path d="M6.4 16h11.2" />
      <path d="M12 21v-3" />
    </Svg>
  );
}

/** 家紋 — eight-petal kamon crest. Achievement, identity, seals. */
export function KamonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn(base, className)}>
      {Array.from({ length: 8 }, (_, i) => i * 45).map((a) => (
        <path
          key={a}
          transform={`rotate(${a} 12 12)`}
          d="M12 3.2c2.2 3 2.6 5.2 0 7.6-2.6-2.4-2.2-4.6 0-7.6Z"
          fill="currentColor"
        />
      ))}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** 円相 — enso. An unclosed brush circle: practice, wholeness, the cycle. */
export function EnsoIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15.6 4.6a8.4 8.4 0 1 0 4 6.2" strokeWidth={1.7} />
    </Svg>
  );
}

/** 富士 — Mount Fuji. Goals, ascent, the long climb. */
export function FujiIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.5 19h19L15 7.5a3.6 3.6 0 0 0-6 0L2.5 19Z" />
      <path d="M9.1 11.4c1 .9 1.7.9 2.5.2s1.6-.6 2.5.3" />
    </Svg>
  );
}

/** 刀 — katana at rest. Discipline, the trained edge. */
export function KatanaIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 17.5c4.6-.4 11-2.6 15.5-6.4" />
      <path d="M3 17.5c4.4.4 11-1.2 15.5-4.6" />
      <path d="m18.5 11.1 1.6-1.3" />
      <path d="M20.1 9.8 22 8.2" />
      <path d="m18.5 13-.9-2" />
    </Svg>
  );
}

/** 蓮 — lotus. Stillness, breath, meditation. */
export function LotusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 19c-3.6 0-6.6-2-8-5 2 .2 3.4.8 4.4 1.7" />
      <path d="M12 19c3.6 0 6.6-2 8-5-2 .2-3.4.8-4.4 1.7" />
      <path d="M12 19c-2-1.6-3-3.5-3-5.6 0-2.4 1.1-4.5 3-6.4 1.9 1.9 3 4 3 6.4 0 2.1-1 4-3 5.6Z" />
    </Svg>
  );
}

/** 竹 — bamboo. Consistency, resilience, growth in segments. */
export function BambooIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 21V3" />
      <path d="M15 21V6" />
      <path d="M7.4 7.2h3.2" />
      <path d="M7.4 12h3.2" />
      <path d="M7.4 16.8h3.2" />
      <path d="M13.4 10.4h3.2" />
      <path d="M13.4 15.6h3.2" />
    </Svg>
  );
}

/** 巻物 — scroll. Study, records, the written way. */
export function ScrollIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 4.5h11a2 2 0 0 1 2 2V18a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V6.5a2 2 0 0 0-2-2Z" />
      <path d="M9 9h6" />
      <path d="M9 12.5h6" />
      <path d="M9 16h3.5" />
    </Svg>
  );
}

/** 筆 — brush. Journalling, reflection, the written hand. */
export function BrushIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14.5 3.5 20.5 9.5" />
      <path d="M16.6 5.6 9.2 13a3 3 0 0 0-.8 1.5l-.7 3.3 3.3-.7a3 3 0 0 0 1.5-.8l7.4-7.4" />
      <path d="M7.7 17.8c-.9.9-2.4 1.3-4.2 1.4.1-1.8.5-3.3 1.4-4.2" />
    </Svg>
  );
}

/** 水 — water drop. Hydration, flow, adaptability. */
export function DropIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.5c3 3.7 5.5 6.6 5.5 9.4A5.5 5.5 0 0 1 6.5 12.9c0-2.8 2.5-5.7 5.5-9.4Z" />
      <path d="M9.4 13.6a2.7 2.7 0 0 0 2.2 3" />
    </Svg>
  );
}

/** 道 — the path winding into the distance. Journey, routine, walking. */
export function PathIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8.5 21c0-4 3-5 3-8.5S8 8 8 5.5 10 2 12 2" />
      <path d="M15.5 21c0-3 2-4.2 2-7" />
      <path d="M4 21h16" />
    </Svg>
  );
}

/** 炎 — flame. Streaks, the fire kept burning. */
export function FlameIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21a5.5 5.5 0 0 0 5.5-5.5c0-4-3.4-5.6-2.6-9.5C12.6 7.4 11 9.3 11 11.4c-1.1-.5-1.6-1.6-1.6-3C7.7 10 6.5 12.4 6.5 15.5A5.5 5.5 0 0 0 12 21Z" />
    </Svg>
  );
}

/** 砂時計 — hourglass. Hours accrued, time given to the work. */
export function HourglassIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.5 3h11" />
      <path d="M6.5 21h11" />
      <path d="M8 3v3.2c0 1.4 1.2 2.4 2.6 3.8 1 1 1 1.4 0 2.4-1.4 1.4-2.6 2.4-2.6 3.8V21" />
      <path d="M16 3v3.2c0 1.4-1.2 2.4-2.6 3.8-1 1-1 1.4 0 2.4 1.4 1.4 2.6 2.4 2.6 3.8V21" />
    </Svg>
  );
}

/** 桜 — cherry blossom. Seasons, impermanence, small joys. */
export function SakuraIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn(base, className)}>
      {Array.from({ length: 5 }, (_, i) => i * 72).map((a) => (
        <path
          key={a}
          transform={`rotate(${a} 12 12)`}
          d="M12 4c1.9 1.7 2.7 3.4 2 5.2-.5 1.3-1.3 2-2 2.6-.7-.6-1.5-1.3-2-2.6-.7-1.8.1-3.5 2-5.2Z"
          fill="currentColor"
          opacity={0.85}
        />
      ))}
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** 山水 — distant ridgeline. Insight, perspective, the wider view. */
export function RidgeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 18h20" />
      <path d="M2.5 14.5 7 9l3.2 3.8L13.5 8l3.4 4.2L21.5 7" />
    </Svg>
  );
}
