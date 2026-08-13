import { useState, useEffect } from "react";
import {
  Sun,
  CloudSun,
  Search,
  Filter,
  CalendarDays,
  Archive,
  LayoutGrid,
  List,
} from "lucide-react";
import heroFuji from "@/assets/hero-fuji.png";
import { MissionCategory } from "@/data/missionsData";

interface MissionsHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string | "All") => void;
  onNewMissionClick: () => void;
}

export function MissionsHeader({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onNewMissionClick,
}: MissionsHeaderProps) {
  const [time, setTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateString = time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Cinematic Banner */}
      <header className="animate-rise relative min-h-[220px] overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <img
          src={heroFuji}
          alt="Mount Fuji morning mist"
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-65 md:opacity-75"
        />
        <div
          className="absolute inset-0 bg-linear-to-r from-background via-background/80 to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col justify-between gap-6 p-6 md:p-8 lg:flex-row lg:items-start lg:justify-between h-full min-h-[220px]">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl leading-tight font-medium text-foreground xl:text-5xl">
                Missions
              </h1>
              {/* Red Japanese Seal stamp */}
              <div className="flex size-7 items-center justify-center rounded bg-red-800 border border-red-700/50 shadow-[0_0_10px_rgba(153,27,27,0.4)] text-red-100 font-display text-[0.7rem] font-bold tracking-widest leading-none select-none">
                命
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">"Execute with focus. Win the day."</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Clock & Date Widget */}
            <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/65 px-4 py-2.5 backdrop-blur-[2px]">
              <div className="flex items-center gap-2">
                <Sun className="size-4.5 text-gold-soft animate-pulse" />
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground tracking-wider leading-none">
                    {isMounted ? timeString : "07:12 AM"}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                    {isMounted ? dateString : "May 17, 2025"}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-border" aria-hidden />
              <div className="flex items-center gap-2">
                <CloudSun className="size-4.5 text-gold-dim" />
                <div>
                  <p className="text-sm font-semibold text-foreground leading-none">23°C</p>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5">Kyoto, JP</p>
                </div>
              </div>
              {/* Samurai Kanji Character Signifier */}
              <div className="h-6 w-px bg-border" aria-hidden />
              <div className="font-display text-lg text-gold font-bold select-none px-1">侍</div>
            </div>
          </div>
        </div>
        <div
          className="absolute right-0 bottom-0 left-0 h-px bg-linear-to-r from-transparent via-gold/45 to-transparent"
          aria-hidden
        />
      </header>

      {/* Subnavigation Bar */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-surface/75 border border-border/60 self-start md:self-auto">
          {[
            { id: "board", label: "Board", icon: LayoutGrid },
            { id: "list", label: "List", icon: List },
            { id: "calendar", label: "Calendar", icon: CalendarDays },
            { id: "archive", label: "Archive", icon: Archive },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                  active
                    ? "bg-secondary text-gold border border-gold/30 shadow-[0_1px_0_0_oklch(1_0_0/4%)_inset]"
                    : "text-muted-foreground hover:bg-surface-raised hover:text-foreground border border-transparent"
                }`}
              >
                <Icon className={`size-3.5 ${active ? "text-gold" : "text-muted-foreground"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters, Search and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search missions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 rounded-xl border border-border/60 bg-surface/60 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold/40 focus:bg-surface focus:outline-hidden transition-all duration-300 md:w-56"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-xl border border-border/60 bg-surface/60 px-3 pr-8 text-xs text-foreground focus:border-gold/40 focus:outline-hidden transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Academic">Academic</option>
              <option value="Personal">Personal</option>
              <option value="Health">Health</option>
              <option value="Growth">Growth</option>
            </select>
            <Filter className="absolute right-3 top-1/2 size-3 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>

          {/* Create Button */}
          <button
            onClick={onNewMissionClick}
            className="h-9 rounded-xl bg-gold/90 hover:bg-gold px-4 text-xs font-semibold text-primary-foreground tracking-wider uppercase shadow-[0_2px_10px_rgba(198,162,94,0.15)] transition-all duration-300 active:scale-97 cursor-pointer"
          >
            + New Mission
          </button>
        </div>
      </div>
    </div>
  );
}
