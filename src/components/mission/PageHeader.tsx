import type { ReactNode } from "react";

import { InkArt, type InkMotif } from "./InkArt";
import { SealStamp } from "./SealStamp";
import { useNow } from "@/hooks/use-now";
import { useWeather } from "@/hooks/use-weather";

/**
 * Shared page chrome: display title with its carved seal, a subtitle,
 * and the live clock / weather cluster used across Mission Control.
 */
export function PageHeader({
  title,
  seal,
  subtitle,
  motif = "branch",
  children,
}: {
  title: string;
  seal: string;
  subtitle: string;
  motif?: InkMotif;
  children?: ReactNode;
}) {
  const now = useNow(30_000);
  const weather = useWeather();
  const WeatherIcon = weather.icon;

  const time = now
    ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })
    : "";
  const date = now
    ? now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <header className="relative flex flex-col justify-between gap-6 overflow-hidden border-b border-border/40 pb-6 md:flex-row md:items-start">
      <InkArt
        motif={motif}
        className="pointer-events-none absolute -top-8 right-52 hidden h-32 w-56 text-gold/[0.06] lg:block"
      />

      <div className="relative space-y-2">
        <div className="flex items-center gap-3.5">
          <h1 className="font-display text-[2.75rem] leading-none font-medium text-foreground xl:text-[3.25rem]">
            {title}
          </h1>
          <SealStamp characters={seal} size="lg" />
        </div>
        <p className="text-sm tracking-[0.02em] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="relative flex flex-wrap items-center gap-6">
        {children}

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className="font-display text-lg leading-none text-foreground tabular-nums"
              suppressHydrationWarning
            >
              {time || "—"}
            </p>
            <p
              className="mt-1.5 text-[0.62rem] tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase"
              suppressHydrationWarning
            >
              {date}
            </p>
          </div>

          <div className="h-9 w-px bg-border/70" aria-hidden />

          <div className="flex items-center gap-2.5">
            <WeatherIcon
              className={`size-5 shrink-0 text-gold ${weather.status === "loading" ? "animate-pulse" : ""}`}
              aria-hidden
            />
            <div>
              <p className="font-display text-lg leading-none text-foreground">
                {weather.temperatureC === null ? "—" : `${weather.temperatureC}°`}
              </p>
              <p className="mt-1.5 text-[0.62rem] tracking-[0.1em] whitespace-nowrap text-muted-foreground uppercase">
                {weather.city || weather.condition}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
