import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Hand-drawn Japanese iconography used across Mission Control.
 *
 * Each glyph is a 24×24 drawing on `currentColor`, so these are drop-in
 * replacements wherever a Lucide icon would otherwise sit.
 *
 * Depth comes from three stacked planes rather than from shadow: a lit face
 * (`a`), a receding plane (`b`), and the ink stroke over both. Because the
 * gradients key off `currentColor`, an icon lights correctly whether it sits on
 * gold, muted foreground, or the rose of an error state.
 */

type IconProps = {
  className?: string | undefined;
  /** Accepted so these drop into slots that pass it; the <svg> is always hidden. */
  "aria-hidden"?: boolean | undefined;
};

const base = "shrink-0";

/**
 * Gradient ids must be unique per instance — two icons on one page would
 * otherwise share a definition and the second would inherit the first's ramp.
 */
function Icon({ className, children }: IconProps & { children: (id: string) => React.ReactNode }) {
  const uid = `mc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn(base, className)}
    >
      <defs>
        <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.07" />
        </linearGradient>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.19" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {children(uid)}
    </svg>
  );
}

/* ---------------------------------------------------------------- structures */

/** 鳥居 — torii gate. Thresholds, milestones, sessions entered. */
export function ToriiIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M6.4 9.8h2.4l.4 10.8H6l.4-10.8Z" fill={`url(#${u}a)`} />
          <path d="M15.2 9.8h2.4l.4 10.8h-3.2l.4-10.8Z" fill={`url(#${u}a)`} />
          <path d="M4.3 7.9h15.4v2H4.3z" fill={`url(#${u}a)`} />
          <path
            d="M2.4 4.5c3.7-1.6 15.5-1.6 19.2 0v2c-3.7-1.4-15.5-1.4-19.2 0v-2Z"
            fill={`url(#${u}a)`}
          />
          <path d="M11.1 6.4h1.8v1.5h-1.8z" fill={`url(#${u}b)`} />
        </>
      )}
    </Icon>
  );
}

/** 塔 — pagoda. Rank, attainment, levels of knowledge. */
export function PagodaIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M12 1.4v2.1" />
          <path
            d="m12 3.4 5.3 3.1c.8.5.5 1.2-.5 1.2H7.2c-1 0-1.3-.7-.5-1.2L12 3.4Z"
            fill={`url(#${u}a)`}
          />
          <path d="M9.2 7.7h5.6v2.2H9.2z" fill={`url(#${u}b)`} />
          <path
            d="m12 9.7 6.6 3.1c1 .5.7 1.2-.5 1.2H5.9c-1.2 0-1.5-.7-.5-1.2L12 9.7Z"
            fill={`url(#${u}a)`}
          />
          <path d="M8.6 14h6.8v2.2H8.6z" fill={`url(#${u}b)`} />
          <path
            d="m12 16 7.8 3.1c1.2.5.9 1.2-.5 1.2H4.7c-1.4 0-1.7-.7-.5-1.2L12 16Z"
            fill={`url(#${u}a)`}
          />
        </>
      )}
    </Icon>
  );
}

/** 庵 — a gasshō farmhouse. Home, the place returned to. */
export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M12 2.6 21.4 11.8h-3.2L12 6 5.8 11.8H2.6L12 2.6Z" fill={`url(#${u}a)`} />
          <path d="M5.8 11.8h12.4v9.6H5.8z" fill={`url(#${u}b)`} />
          <path d="M9.8 21.4v-5.2h4.4v5.2" fill={`url(#${u}a)`} />
        </>
      )}
    </Icon>
  );
}

/** 看板 — a wooden signboard. Projects: work posted where it can be seen. */
export function KanbanIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M4.2 3.4h15.6c.9 0 1.6.7 1.6 1.6v9.4c0 .9-.7 1.6-1.6 1.6H4.2c-.9 0-1.6-.7-1.6-1.6V5c0-.9.7-1.6 1.6-1.6Z"
            fill={`url(#${u}a)`}
          />
          <path d="M7.7 16v5.2M16.3 16v5.2" strokeWidth={1.5} />
          <path d="M8 6.6v6M12 6.6v3.6M16 6.6v5" strokeWidth={1.5} opacity={0.75} />
        </>
      )}
    </Icon>
  );
}

/** 暦 — a hanging almanac. Dates, the shape of the month. */
export function KoyomiIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M8 2.2v3.2M16 2.2v3.2" strokeWidth={1.4} />
          <path
            d="M4.8 4.8h14.4c1 0 1.8.8 1.8 1.8v12.6c0 1-.8 1.8-1.8 1.8H4.8c-1 0-1.8-.8-1.8-1.8V6.6c0-1 .8-1.8 1.8-1.8Z"
            fill={`url(#${u}a)`}
          />
          <path d="M3 9.6h18" />
          <g fill="currentColor" opacity={0.7} stroke="none">
            <circle cx="8" cy="13.4" r="1.05" />
            <circle cx="12" cy="13.4" r="1.05" />
            <circle cx="16" cy="13.4" r="1.05" />
            <circle cx="8" cy="17.2" r="1.05" />
            <circle cx="12" cy="17.2" r="1.05" />
          </g>
        </>
      )}
    </Icon>
  );
}

/* -------------------------------------------------------------------- crests */

/** 家紋 — eight-petal kamon crest. Achievement, identity, seals. */
export function KamonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <circle cx="12" cy="12" r="10" fill={`url(#${u}b)`} strokeWidth={0.9} opacity={0.55} />
          {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
            <path
              key={deg}
              transform={`rotate(${deg} 12 12)`}
              d="M12 3.4c2.2 3 2.6 5.2 0 7.5-2.6-2.3-2.2-4.5 0-7.5Z"
              fill={`url(#${u}a)`}
              strokeWidth={0.85}
            />
          ))}
          <circle cx="12" cy="12" r="2" fill={`url(#${u}a)`} />
        </>
      )}
    </Icon>
  );
}

/** 円相 — ensō. An unclosed brush circle: practice, wholeness, the cycle. */
export function EnsoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {() => (
        <>
          {/* One ring in three arcs: the brush enters thin, swells, and lifts off thin. */}
          <path d="M16.25 4.64A8.5 8.5 0 0 1 20.37 10.52" strokeWidth={1.1} />
          <path d="M20.37 10.52A8.5 8.5 0 0 1 4.64 16.25" strokeWidth={2.6} />
          <path d="M4.64 16.25A8.5 8.5 0 0 1 9.09 4.01" strokeWidth={1.4} />
        </>
      )}
    </Icon>
  );
}

/** 印 — a carved hanko. Awards, the mark pressed on finished work. */
export function SealIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {/* straight grip and collar — a hanko, not a padlock shackle */}
          <path d="M10.6 2.6h2.8v7.3h-2.8z" fill={`url(#${u}b)`} strokeWidth={1.05} />
          <path d="M8.8 9.9h6.4v1.9H8.8z" fill={`url(#${u}a)`} strokeWidth={1.05} />
          {/* the stamp face, wider than tall */}
          <path
            d="M4.6 11.8h14.8v7.8c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6v-7.8Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
          {/* a bordered carved face — bristle-like strokes read as a brush, a border does not */}
          <path d="M7.5 14.3h9v5h-9z" strokeWidth={1} opacity={0.6} />
          <path d="M9.8 16.8h4.4" strokeWidth={1} opacity={0.6} />
        </>
      )}
    </Icon>
  );
}

/** 兜 — a kabuto helmet. Protection, the shield against distraction. */
export function KabutoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {/* kuwagata — two separated prongs, the cue that reads as helmet first */}
          <path d="M9.5 6.8 7.4 2.2M14.5 6.8l2.1-4.6" strokeWidth={1.5} />
          {/* bowl */}
          <path
            d="M6.5 12.5c0-3.5 2.4-6.1 5.5-6.1s5.5 2.6 5.5 6.1H6.5Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.25}
          />
          {/* shikoro — the flared neck guard */}
          <path
            d="M3.6 13.4c0-.5.4-.9.9-.9h15c.5 0 .9.4.9.9 0 3.6-3.8 6-8.4 6s-8.4-2.4-8.4-6Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.25}
          />
          <path d="M7.2 16.3c3.1.9 6.5.9 9.6 0" strokeWidth={1} opacity={0.55} />
        </>
      )}
    </Icon>
  );
}

/** 的 — a kyūdō target. Aim, the thing being trained toward. */
export function MatoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <circle cx="12" cy="12" r="9.2" fill={`url(#${u}b)`} strokeWidth={1.2} />
          <circle cx="12" cy="12" r="5.6" fill={`url(#${u}a)`} strokeWidth={1.1} />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
        </>
      )}
    </Icon>
  );
}

/** 法輪 — an eight-spoke wheel. Settings: the rules the app turns on. */
export function WheelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <circle cx="12" cy="12" r="9.2" fill={`url(#${u}b)`} strokeWidth={1.2} />
          {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
            <path key={deg} transform={`rotate(${deg} 12 12)`} d="M12 3v6" strokeWidth={1.25} />
          ))}
          <circle cx="12" cy="12" r="3" fill={`url(#${u}a)`} strokeWidth={1.15} />
        </>
      )}
    </Icon>
  );
}

/* -------------------------------------------------------------------- nature */

/** 富士 — Mount Fuji. Goals, ascent, the long climb. */
export function FujiIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M1.8 19.8 9 8.2a3.6 3.6 0 0 1 6 0l7.2 11.6H1.8Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
          <path
            d="M6.8 11.8 9 8.2a3.6 3.6 0 0 1 6 0l2.2 3.6c-.9.9-1.7.9-2.5.1-.8-.9-1.8-1-2.6-.2-.7.8-1.5.8-2.6-.1-.9-.7-1.7-.4-2.7.2Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.05}
          />
        </>
      )}
    </Icon>
  );
}

/** 山水 — layered ridgelines. Insight, perspective, the wider view. */
export function RidgeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M2.6 10.2 6.2 4.6l3 4.2 3.2-5 3.4 4.6 3.6-4.8 2 3v14.6H2.6V10.2Z"
            fill={`url(#${u}b)`}
            strokeWidth={1}
            opacity={0.6}
          />
          <path
            d="M2.6 16.4 6.8 9.4l3.4 4.6 3-4 3.6 4.9 3.4-4 1.2 1.6v8.7H2.6v-4.8Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.15}
          />
          <path d="M2.4 21.2h19.2" strokeWidth={1.2} />
        </>
      )}
    </Icon>
  );
}

/** 蓮 — lotus. Stillness, breath, meditation. */
export function LotusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M12 19.8C7.2 19.4 4 17 2.8 13.2c3 .2 5.2 1.1 6.6 2.7L12 19.8Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.05}
          />
          <path
            d="M12 19.8c4.8-.4 8-2.8 9.2-6.6-3 .2-5.2 1.1-6.6 2.7L12 19.8Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.05}
          />
          <path
            d="M12 19.8c-3.4-1.2-5.4-3.5-5.8-6.5 2.4.3 4.2 1.4 5.8 3.4v3.1Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.05}
          />
          <path
            d="M12 19.8c3.4-1.2 5.4-3.5 5.8-6.5-2.4.3-4.2 1.4-5.8 3.4v3.1Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.05}
          />
          <path
            d="M12 19.8c-2.2-1.8-3.3-3.9-3.3-6.2 0-2.4 1.1-4.6 3.3-6.6 2.2 2 3.3 4.2 3.3 6.6 0 2.3-1.1 4.4-3.3 6.2Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
        </>
      )}
    </Icon>
  );
}

/** 桜 — cherry blossom. Seasons, impermanence, small joys. */
export function SakuraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {Array.from({ length: 5 }, (_, i) => i * 72).map((deg) => (
            <path
              key={deg}
              transform={`rotate(${deg} 12 12)`}
              d="M12 4.6 10.8 3.2c-1.6 2.1-1.9 4-1 5.9.5 1.2 1.3 2.1 2.2 2.8.9-.7 1.7-1.6 2.2-2.8.9-1.9.6-3.8-1-5.9L12 4.6Z"
              fill={`url(#${u}a)`}
              strokeWidth={0.95}
            />
          ))}
          <circle cx="12" cy="12" r="1.5" fill={`url(#${u}a)`} strokeWidth={0.95} />
        </>
      )}
    </Icon>
  );
}

/** 竹 — bamboo. Consistency, resilience, growth in segments. */
export function BambooIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {/* back culm */}
          <path
            d="M14.6 21.6V9.2c0-.8.6-1.5 1.4-1.5h1.2c.8 0 1.4.7 1.4 1.5v12.4"
            fill={`url(#${u}b)`}
            strokeWidth={1.05}
          />
          <path d="M14.1 12.8h6.2M14.1 17.4h6.2" strokeWidth={1} opacity={0.75} />
          {/* front culm */}
          <path
            d="M5.8 21.6V5c0-1 .8-1.8 1.8-1.8h1c1 0 1.8.8 1.8 1.8v16.6"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
          {/* nodes overhang the culm — the cue that reads as bamboo */}
          <path d="M5.2 8.8h7M5.2 14h7M5.2 19.2h7" strokeWidth={1.15} />
          {/* leaves */}
          <path
            d="M10.4 6.4c2.4-1.8 4.6-2.2 6.6-1.2-1.7 2-3.9 2.4-6.6 1.2Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.05}
          />
          <path
            d="M5.6 8.4C3.4 7.8 2 6.8 1.4 5.4c2.2-.4 3.8.2 4.8 1.6Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.05}
          />
        </>
      )}
    </Icon>
  );
}

/** 水 — a water drop. Hydration, flow, adaptability. */
export function DropIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M12 2.8c3.4 4.2 6 7.4 6 10.4a6 6 0 0 1-12 0c0-3 2.6-6.2 6-10.4Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
          <path d="M9.2 13.7a3 3 0 0 0 2.4 3.2" strokeWidth={1.05} opacity={0.75} />
          <ellipse
            cx="9.5"
            cy="9.7"
            rx="0.95"
            ry="1.7"
            transform="rotate(-26 9.5 9.7)"
            fill="currentColor"
            stroke="none"
            opacity={0.3}
          />
        </>
      )}
    </Icon>
  );
}

/** 炎 — flame. Streaks, the fire kept burning. */
export function FlameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M12 21.4c3.6 0 6.4-2.9 6.4-6.4 0-4.7-3.8-6.5-2.9-10.9-3 2.2-4.9 4.5-4.9 6.9-1.3-.6-1.9-1.9-1.9-3.6-2 1.9-3.1 4.7-3.1 7.6 0 3.5 2.8 6.4 6.4 6.4Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.15}
          />
          <path
            d="M12 21.4a3.5 3.5 0 0 0 3.5-3.5c0-2.4-2.4-3.3-1.8-6-2 1.3-3.1 2.7-3.1 4.3-.8-.4-1.1-1.2-1.1-2.1-1.3 1.1-2 2.5-2 3.8a3.5 3.5 0 0 0 3.5 3.5Z"
            fill={`url(#${u}a)`}
            strokeWidth={1}
          />
        </>
      )}
    </Icon>
  );
}

/** 月 — the moon. Night, rest, the quiet hours. */
export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M20.2 14.7A8.7 8.7 0 0 1 9.3 3.8a8.7 8.7 0 1 0 10.9 10.9Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
          <circle cx="9.4" cy="15.4" r="1.1" fill="currentColor" stroke="none" opacity={0.25} />
          <circle cx="13.6" cy="17.4" r="0.75" fill="currentColor" stroke="none" opacity={0.2} />
        </>
      )}
    </Icon>
  );
}

/** 日の出 — sunrise over the horizon. Mornings, beginnings. */
export function SunriseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M2.4 6.6 3.9 8M20.1 8l1.5-1.4M12 2.6v2.1M4.6 12.2H2.4M21.6 12.2h-2.2"
            strokeWidth={1.15}
            opacity={0.7}
          />
          <path d="M6.2 17.4a5.8 5.8 0 0 1 11.6 0H6.2Z" fill={`url(#${u}a)`} strokeWidth={1.2} />
          <path d="M2.2 17.4h19.6" strokeWidth={1.25} />
          <path d="M5.4 20.8h13.2" strokeWidth={1.15} opacity={0.55} />
        </>
      )}
    </Icon>
  );
}

/* ---------------------------------------------------------------- implements */

/** 刀 — a katana at rest. Discipline, the trained edge. */
export function KatanaIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {/* blade, thick enough to hold its shape at 17px */}
          <path
            d="M2.3 20c5.8-.7 11.6-3.1 15.8-6.9l1.9 2.5c-4.7 3.4-11.2 5.1-17.3 4.8L2.3 20Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.15}
          />
          {/* tsuba */}
          <path d="m17.1 12.1 2.8 3.6" strokeWidth={1.9} />
          {/* tsuka */}
          <path d="m19.7 12.7 2.3-1.7" strokeWidth={2.2} />
        </>
      )}
    </Icon>
  );
}

/** 双刀 — crossed blades. Missions taken up. */
export function SwordsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M4.4 2.6 2.9 4.1l11.5 11.5 1.5-1.5L4.4 2.6Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.05}
          />
          <path
            d="M19.6 2.6 21.1 4.1 9.6 15.6l-1.5-1.5L19.6 2.6Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.05}
          />
          <path d="m14.4 15.6 2.7 2.7-1.9 1.9-2.7-2.7" fill={`url(#${u}a)`} strokeWidth={1.05} />
          <path d="m9.6 15.6-2.7 2.7 1.9 1.9 2.7-2.7" fill={`url(#${u}a)`} strokeWidth={1.05} />
        </>
      )}
    </Icon>
  );
}

/** 力石 — a strength stone. Training, load carried on purpose. */
export function StoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {/* grip loop */}
          <path d="M9.8 6.4c0-2.1 1-3.4 2.2-3.4s2.2 1.3 2.2 3.4" strokeWidth={1.4} />
          {/* the stone */}
          <path
            d="M12 6.4c4.9 0 8.4 3.2 8.4 7.5s-3.5 7.3-8.4 7.3-8.4-3-8.4-7.3S7.1 6.4 12 6.4Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.25}
          />
          {/* rope straps bound over the stone — never two level lines, which read as a face */}
          <path d="M12 6.5v14.6" strokeWidth={1.15} opacity={0.7} />
          <path d="M4.3 11.9c5.1 1.8 10.3 1.8 15.4 0" strokeWidth={1.15} opacity={0.7} />
        </>
      )}
    </Icon>
  );
}

/** 巻物 — a hanging scroll. Study, records, the written way. */
export function ScrollIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M5.8 5.8h12.4v12.4H5.8z" fill={`url(#${u}b)`} strokeWidth={1.1} />
          <path
            d="M4.4 3.2h15.2c.8 0 1.4.6 1.4 1.3s-.6 1.3-1.4 1.3H4.4c-.8 0-1.4-.6-1.4-1.3s.6-1.3 1.4-1.3Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.1}
          />
          <path
            d="M4.4 18.2h15.2c.8 0 1.4.6 1.4 1.3s-.6 1.3-1.4 1.3H4.4c-.8 0-1.4-.6-1.4-1.3s.6-1.3 1.4-1.3Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.1}
          />
          <path d="M8.6 9.2h6.8M8.6 12h6.8M8.6 14.8h4.2" strokeWidth={1.05} opacity={0.65} />
        </>
      )}
    </Icon>
  );
}

/** 筆 — a calligraphy brush. Journalling, reflection, the written hand. */
export function BrushIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M20.8 3.2a1.4 1.4 0 0 0-2 0l-5.9 5.9 2 2 5.9-5.9a1.4 1.4 0 0 0 0-2Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.1}
          />
          <path
            d="m12.3 9.6 2.1 2.1-1.3 1.3-2.1-2.1 1.3-1.3Z"
            fill={`url(#${u}a)`}
            strokeWidth={1}
          />
          <path
            d="m11 12.9 2.1 2.1c-1 2.5-3 4.8-5.9 6.8-1.6 1.1-3.3-.6-2.2-2.2 2.2-2.9 4.5-4.9 6-6.7Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.1}
          />
        </>
      )}
    </Icon>
  );
}

/** 茶 — a cup of tea. Rest, the deliberate pause between rounds. */
export function TeaIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M9.4 2.6c-.7 1 -.7 1.9 0 2.8M12.6 2.6c-.7 1-.7 1.9 0 2.8"
            strokeWidth={1.1}
            opacity={0.6}
          />
          <path
            d="M4.4 8.4h13.2v4.9c0 3.4-3 6-6.6 6s-6.6-2.6-6.6-6V8.4Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.2}
          />
          <path
            d="M17.6 9.8h1.2a2.4 2.4 0 0 1 0 4.8h-1.2"
            fill={`url(#${u}b)`}
            strokeWidth={1.15}
          />
          <path d="M3 21.4h16" strokeWidth={1.2} />
        </>
      )}
    </Icon>
  );
}

/** 砂時計 — an hourglass. Hours accrued, time given to the work. */
export function HourglassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M6.1 2.4h11.8c.7 0 1.2.5 1.2 1.1s-.5 1.1-1.2 1.1H6.1c-.7 0-1.2-.5-1.2-1.1s.5-1.1 1.2-1.1Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.1}
          />
          <path
            d="M6.1 19.4h11.8c.7 0 1.2.5 1.2 1.1s-.5 1.1-1.2 1.1H6.1c-.7 0-1.2-.5-1.2-1.1s.5-1.1 1.2-1.1Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.1}
          />
          <path
            d="M7.4 4.6h9.2v2.2c0 1.6-1.3 2.8-2.9 4.2-.9.8-.9 1.2 0 2 1.6 1.4 2.9 2.6 2.9 4.2v2.2H7.4v-2.2c0-1.6 1.3-2.8 2.9-4.2.9-.8.9-1.2 0-2C8.7 9.6 7.4 8.4 7.4 6.8V4.6Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.15}
          />
          <path
            d="M12 13.7c1.5 1.3 2.7 2.4 2.7 3.7v1.6H9.3v-1.6c0-1.3 1.2-2.4 2.7-3.7Z"
            fill={`url(#${u}a)`}
            strokeWidth={0.9}
          />
          <path d="M12 11.2v2.2" strokeWidth={1} opacity={0.7} />
        </>
      )}
    </Icon>
  );
}

/** 時計 — a clock face. Wall time, the hour of the day. */
export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <circle cx="12" cy="12" r="9.2" fill={`url(#${u}a)`} strokeWidth={1.2} />
          <path
            d="M12 3.8v1.6M20.2 12h-1.6M12 20.2v-1.6M3.8 12h1.6"
            strokeWidth={1.05}
            opacity={0.6}
          />
          <path d="M12 6.9V12l3.6 2.3" strokeWidth={1.4} />
        </>
      )}
    </Icon>
  );
}

/** 秤 — a balance. Areas weighed against one another. */
export function BalanceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M12 6.6v13.2" strokeWidth={1.3} />
          <path d="M6.6 20.4h10.8" strokeWidth={1.4} />
          <path d="M4.4 7.4h15.2" strokeWidth={1.3} />
          <circle cx="12" cy="5.2" r="1.5" fill={`url(#${u}a)`} strokeWidth={1.05} />
          <path d="M2.4 11.4h6.2l-3.1 4.6-3.1-4.6Z" fill={`url(#${u}a)`} strokeWidth={1.05} />
          <path d="M15.4 11.4h6.2l-3.1 4.6-3.1-4.6Z" fill={`url(#${u}a)`} strokeWidth={1.05} />
          <path d="M5.5 7.4v4M18.5 7.4v4" strokeWidth={1} opacity={0.65} />
        </>
      )}
    </Icon>
  );
}

/* ------------------------------------------------------------------ movement */

/** 飛石 — stepping stones receding. Journey, routine, the path walked. */
export function PathIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          {/* The zigzag is what makes these read as a path receding, not a stack. */}
          <ellipse
            cx="13.4"
            cy="4.6"
            rx="1.4"
            ry="0.6"
            fill={`url(#${u}b)`}
            strokeWidth={0.9}
            opacity={0.7}
          />
          <ellipse
            cx="9.6"
            cy="7.5"
            rx="2"
            ry="0.85"
            fill={`url(#${u}b)`}
            strokeWidth={0.95}
            opacity={0.85}
          />
          <ellipse cx="14.6" cy="11" rx="2.8" ry="1.15" fill={`url(#${u}a)`} strokeWidth={1} />
          <ellipse cx="8.4" cy="15.2" rx="3.7" ry="1.5" fill={`url(#${u}a)`} strokeWidth={1.05} />
          <ellipse cx="13.8" cy="20.1" rx="4.9" ry="1.95" fill={`url(#${u}a)`} strokeWidth={1.15} />
        </>
      )}
    </Icon>
  );
}

/** 伸 — a rising line over its own shadow. Growth, trend, momentum. */
export function TrendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M2.6 20.4v-6.3l4.5-3.5 4.3 2.7 4.7-5.7 4.9 3.5v9.3H2.6Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.05}
          />
          <path d="m2.6 14.1 4.5-3.5 4.3 2.7 4.7-5.7 4.9 3.5" strokeWidth={1.5} />
          <path d="M16.4 7.6h4.6v4.4" strokeWidth={1.15} opacity={0.7} />
        </>
      )}
    </Icon>
  );
}

/** 印し — a brushed tick. Something finished, marked by hand. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {() => (
        <>
          <path
            d="M4.2 12.4c2.1.7 3.8 2.1 5 4.2 2.5-5.3 5.7-8.9 9.6-10.8"
            strokeWidth={2.6}
            opacity={0.2}
          />
          <path d="M4.2 12.4c2.1.7 3.8 2.1 5 4.2 2.5-5.3 5.7-8.9 9.6-10.8" strokeWidth={1.7} />
        </>
      )}
    </Icon>
  );
}

/** 枡 — a jointed masu box, drawn isometric. Building, the thing constructed. */
export function MasuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path d="M12 2.4 21.4 7 12 11.6 2.6 7 12 2.4Z" fill={`url(#${u}a)`} strokeWidth={1.15} />
          <path d="M2.6 7v9.6l9.4 4.6v-9.6L2.6 7Z" fill={`url(#${u}b)`} strokeWidth={1.15} />
          <path d="M21.4 7v9.6L12 21.2v-9.6L21.4 7Z" fill={`url(#${u}a)`} strokeWidth={1.15} />
          <path d="m7.3 4.7 9.4 4.6M12 11.6v9.6" strokeWidth={1} opacity={0.55} />
        </>
      )}
    </Icon>
  );
}

/** 書 — an open volume. Reading, courses, knowledge taken in. */
export function BookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      {(u) => (
        <>
          <path
            d="M12 6.4C10 4.9 7.6 4.2 4.4 4.2c-.8 0-1.4.6-1.4 1.4v11.6c0 .8.6 1.4 1.4 1.4 3.2 0 5.6.7 7.6 2.2V6.4Z"
            fill={`url(#${u}a)`}
            strokeWidth={1.1}
          />
          <path
            d="M12 6.4c2-1.5 4.4-2.2 7.6-2.2.8 0 1.4.6 1.4 1.4v11.6c0 .8-.6 1.4-1.4 1.4-3.2 0-5.6.7-7.6 2.2V6.4Z"
            fill={`url(#${u}b)`}
            strokeWidth={1.1}
          />
          <path d="M12 6.4v14.4" strokeWidth={1.1} />
        </>
      )}
    </Icon>
  );
}
