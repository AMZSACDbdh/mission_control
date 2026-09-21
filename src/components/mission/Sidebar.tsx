import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";

import { InkArt } from "./InkArt";
import { LotusMark } from "./LotusMark";
import {
  BambooIcon,
  BookIcon,
  BrushIcon,
  HomeIcon,
  HourglassIcon,
  KanbanIcon,
  KoyomiIcon,
  PagodaIcon,
  RidgeIcon,
  StoneIcon,
  SwordsIcon,
  WheelIcon,
} from "./JapaneseIcons";
import { useActivity } from "@/hooks/use-activity";
import { useProgression } from "@/hooks/use-progression";

type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const navItems: NavItem[] = [
  { label: "Home", to: "/", icon: HomeIcon },
  { label: "Focus", to: "/focus", icon: HourglassIcon },
  { label: "Missions", to: "/missions", icon: SwordsIcon },
  { label: "Daily Disciplines", to: "/disciplines", icon: BambooIcon },
  { label: "Academy", to: "/academy", icon: BookIcon },
  { label: "Fitness", to: "/fitness", icon: StoneIcon },
  { label: "Projects", to: "/projects", icon: KanbanIcon },
  { label: "Calendar", to: "/calendar", icon: KoyomiIcon },
  { label: "Journal", to: "/journal", icon: BrushIcon },
  { label: "Hall of Mastery", to: "/hall-of-mastery", icon: PagodaIcon },
  { label: "Insights", to: "/insights", icon: RidgeIcon },
  { label: "Settings", to: "/settings", icon: WheelIcon },
];

export function Sidebar() {
  const { progression, nextReward, levelsToNextReward } = useProgression();
  const rank = progression.masterRank;

  return (
    <aside className="sticky top-0 hidden h-screen w-[16.5rem] shrink-0 flex-col overflow-hidden border-r border-border/50 bg-sidebar lg:flex">
      {/* Crest */}
      <div className="px-6 pt-7 pb-6">
        <Link to="/" className="group flex items-center gap-3.5">
          <LotusMark className="size-10 shrink-0 text-gold transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" />
          <span className="min-w-0">
            <span className="font-display block text-[1.05rem] leading-[1.15] font-medium tracking-[0.2em] text-foreground/95 uppercase">
              Mission
              <br />
              Control
            </span>
            <span className="mt-2 block text-[0.5rem] tracking-[0.34em] text-gold-dim/90 uppercase">
              Master Your Path
            </span>
          </span>
        </Link>
      </div>

      <div className="mx-6 h-px bg-linear-to-r from-transparent via-gold/25 to-transparent" />

      {/* Navigation */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3.5 py-5">
        <ul className="space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="group relative flex items-center gap-3.5 overflow-hidden rounded-lg px-3.5 py-2.5 text-[0.82rem] text-muted-foreground/90 transition-all duration-300 hover:bg-sidebar-accent/50 hover:text-foreground data-[status=active]:bg-sidebar-accent/90 data-[status=active]:text-foreground"
              >
                <span className="absolute top-1.5 bottom-1.5 left-0 w-[2px] scale-y-0 rounded-full bg-gold transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[status=active]:scale-y-100" />
                <Icon
                  className="size-[1.05rem] shrink-0 opacity-60 transition-all duration-300 group-hover:opacity-90 group-data-[status=active]:text-gold group-data-[status=active]:opacity-100"
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rank crest */}
      <div className="relative px-4 pb-5">
        <InkArt
          motif="mountains"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-gold-dim/20"
        />

        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background/50 px-4 py-5 text-center">
          {/* Enso behind the rank characters */}
          <div className="relative mx-auto grid size-[4.5rem] place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="250 26"
                className="text-gold/70"
                transform="rotate(-100 50 50)"
              />
            </svg>
            <span className="font-display text-[0.95rem] leading-[1.05] tracking-[0.06em] text-gilded">
              {rank.kanji.split("").map((char, i) => (
                <span key={i} className="block">
                  {char}
                </span>
              ))}
            </span>
          </div>

          <p className="font-display mt-3.5 text-[0.78rem] tracking-[0.3em] text-gold-soft uppercase">
            {rank.name}
          </p>
          <p className="mt-1 text-[0.5rem] leading-relaxed tracking-[0.22em] text-muted-foreground/80 uppercase">
            {rank.meaning}
          </p>

          <div className="mx-auto mt-3.5 h-px w-10 bg-gold/30" />

          <div className="mt-3.5 space-y-2 text-left">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.5rem] tracking-[0.22em] text-muted-foreground uppercase">
                Discipline Level
              </span>
              <span className="font-display text-lg leading-none text-gilded">
                {progression.currentLevel}
              </span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-accent/60">
              <div
                className="h-full rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft transition-[width] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${progression.progressPercent}%` }}
              />
            </div>
            <p className="text-[0.58rem] tabular-nums text-muted-foreground/80">
              {progression.xpIntoLevel.toLocaleString()} /{" "}
              {progression.xpForNextLevel.toLocaleString()} XP
            </p>

            {/* Journey progress — never "Level 948", always chapter and place. */}
            <div className="mt-3 border-t border-border/40 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[0.5rem] tracking-[0.22em] text-muted-foreground uppercase">
                  Journey {progression.currentJourney}
                </span>
                <span className="text-[0.55rem] tabular-nums text-gold-dim">
                  {progression.journeyProgress}%
                </span>
              </div>
              <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-accent/50">
                <div
                  className="h-full rounded-full bg-gold/60 transition-[width] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${progression.journeyProgress}%` }}
                />
              </div>

              {/* "What can I earn next?" must always be answerable. */}
              {nextReward && (
                <p className="mt-2.5 text-[0.52rem] leading-relaxed text-muted-foreground/70">
                  Next: <span className="text-gold-dim">{nextReward.name}</span>
                  {levelsToNextReward !== null && levelsToNextReward > 0
                    ? ` · ${levelsToNextReward} level${levelsToNextReward === 1 ? "" : "s"}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
