import dojoImage from "@/assets/hero-dojo.jpg";
import fujiImage from "@/assets/hero-fuji.png";
import { greetingFor, proverbForDay } from "@/data/daily";
import { useNow } from "@/hooks/use-now";
import { useProfileName } from "@/hooks/use-profile";
import { useWeather } from "@/hooks/use-weather";

/**
 * Three moods for one room. The plate and its colour grade shift with the hour,
 * so the page feels like the time of day without ever getting bright enough to
 * fight the text.
 */
type HeroMood = {
  image: string;
  /** Grade applied to the plate itself. */
  filter: string;
  /** Light that washes across it — sunrise gold, flat daylight, moon blue. */
  wash: string;
};

function moodFor(hour: number): HeroMood {
  // Dawn through late morning: low warm sun, the dojo at first light.
  if (hour >= 5 && hour < 12) {
    return {
      image: dojoImage,
      filter: "saturate(1.05) contrast(1.02) brightness(0.95)",
      wash: "linear-gradient(100deg, oklch(0.78 0.11 82 / 18%), transparent 60%)",
    };
  }
  // Midday through late afternoon: open air, cooler and calmer.
  if (hour >= 12 && hour < 17) {
    return {
      image: fujiImage,
      filter: "saturate(0.92) contrast(1.04) brightness(0.88)",
      wash: "linear-gradient(100deg, oklch(0.72 0.04 220 / 12%), transparent 65%)",
    };
  }
  // Dusk: the last warmth draining out of the sky.
  if (hour >= 17 && hour < 21) {
    return {
      image: dojoImage,
      filter: "saturate(1.1) contrast(1.05) brightness(0.7) sepia(0.15)",
      wash: "linear-gradient(100deg, oklch(0.6 0.13 45 / 22%), transparent 60%)",
    };
  }
  // Night: deep, cool, and quiet. Dark enough to rest the eyes.
  return {
    image: fujiImage,
    filter: "saturate(0.7) contrast(1.08) brightness(0.42) hue-rotate(-8deg)",
    wash: "linear-gradient(100deg, oklch(0.45 0.07 250 / 28%), transparent 70%)",
  };
}

export function HeroBanner() {
  // Ticks each minute so the greeting flips over at the hour boundaries.
  const now = useNow(60_000);
  const weather = useWeather();
  const [name] = useProfileName();

  const proverb = now ? proverbForDay(now) : null;
  const WeatherIcon = weather.icon;
  const mood = moodFor(now?.getHours() ?? 9);

  const dateLabel = now
    ? now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "";
  const weekday = now ? now.toLocaleDateString(undefined, { weekday: "long" }) : "";

  return (
    <header className="animate-rise relative min-h-[15rem] overflow-hidden rounded-2xl border border-border/60 bg-surface">
      {/* Cinematic plate, anchored right and dissolved into the panel on the left. */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[78%] lg:w-[68%]" aria-hidden>
        <img
          key={mood.image}
          src={mood.image}
          alt=""
          width={1920}
          height={720}
          className="animate-rise size-full object-cover object-center transition-[filter] duration-1000"
          style={{ filter: mood.filter }}
        />
        {/* The hour's light, laid over the plate */}
        <div className="absolute inset-0" style={{ background: mood.wash }} />
        <div className="absolute inset-0 bg-linear-to-r from-surface via-surface/70 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-surface/70 via-transparent to-surface/25" />
      </div>

      <div className="relative flex min-h-[15rem] flex-col justify-between gap-8 p-8 lg:p-10">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-lg">
            <h1
              className="font-display min-h-[1.15em] text-4xl leading-[1.1] font-medium text-foreground xl:text-[3.25rem]"
              suppressHydrationWarning
            >
              {now ? `${greetingFor(now)}, ${name}.` : ""}
            </h1>

            <p
              className="font-display mt-5 text-2xl leading-none tracking-[0.28em] text-gold"
              suppressHydrationWarning
            >
              {proverb?.japanese ?? ""}
            </p>
            <p className="mt-2.5 text-[0.62rem] tracking-[0.24em] text-gold-dim/70 uppercase">
              {proverb?.romaji ?? ""}
            </p>
            <p
              className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground"
              suppressHydrationWarning
            >
              {proverb?.translation ?? ""}
            </p>
          </div>

          {/* Date · weather, set as plain type rather than a boxed widget. */}
          <div className="hidden shrink-0 items-center gap-6 md:flex">
            <div className="text-right">
              <p
                className="font-display text-lg leading-none text-foreground"
                suppressHydrationWarning
              >
                {dateLabel}
              </p>
              <p
                className="mt-1.5 text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase"
                suppressHydrationWarning
              >
                {weekday}
              </p>
            </div>

            <div className="h-10 w-px bg-border/70" aria-hidden />

            <div className="flex items-center gap-3">
              <WeatherIcon
                className={`size-6 shrink-0 text-gold ${weather.status === "loading" ? "animate-pulse" : ""}`}
                aria-hidden
              />
              <div>
                <p className="font-display text-lg leading-none text-foreground">
                  {weather.temperatureC === null ? "—" : `${weather.temperatureC}°`}
                </p>
                <p className="mt-1.5 text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase">
                  {weather.condition}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute right-0 bottom-0 left-0 h-px bg-linear-to-r from-transparent via-gold/40 to-transparent"
        aria-hidden
      />
    </header>
  );
}
