import { useState } from "react";
import { Heart, Star } from "lucide-react";

import { Panel } from "./Panel";
import { SealStamp } from "./SealStamp";
import { philosophies, philosophyForDay } from "@/data/daily";
import { useNow } from "@/hooks/use-now";
import { useFavourites } from "@/hooks/use-favourites";
import { cn } from "@/lib/utils";

export function QuoteCard() {
  // Only needs to re-evaluate across midnight, so an hourly tick is plenty.
  const now = useNow(60 * 60 * 1000);
  const quote = now ? philosophyForDay(now) : null;
  const { favourites, isFavourite, toggle, remove } = useFavourites();
  const [showKept, setShowKept] = useState(false);

  const saved = quote ? isFavourite(quote) : false;

  return (
    <div className="space-y-3">
      <Panel as="section" className="relative overflow-hidden px-10 py-12 lg:px-16 lg:py-14">
        <figure className="relative mx-auto max-w-3xl">
          <blockquote
            className="font-display flex min-h-[4.5rem] gap-4 text-[1.6rem] leading-[1.5] text-foreground/95 lg:text-[2rem]"
            suppressHydrationWarning
          >
            <span className="font-display -mt-2 shrink-0 text-4xl leading-none text-gold/50">
              “
            </span>
            <span>
              {quote?.text}
              {quote && <span className="ml-1 text-3xl leading-none text-gold/50">”</span>}
            </span>
          </blockquote>

          <figcaption
            className="mt-7 flex flex-wrap items-center justify-between gap-4 pl-8"
            suppressHydrationWarning
          >
            {quote && (
              <span className="text-[0.82rem] text-gold-dim">
                — {quote.author}
                <span className="mt-1 block text-[0.68rem] tracking-[0.12em] text-muted-foreground/70 uppercase">
                  {quote.source}
                </span>
              </span>
            )}

            {quote && (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(quote)}
                  aria-pressed={saved}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[0.62rem] tracking-[0.14em] uppercase transition-all duration-300",
                    saved
                      ? "border-gold/60 bg-gold/12 text-gold-soft"
                      : "border-border/60 text-muted-foreground hover:border-gold/40 hover:text-gold",
                  )}
                >
                  <Heart className={cn("size-3.5", saved && "fill-current")} aria-hidden />
                  {saved ? "Kept" : "Keep this"}
                </button>

                {favourites.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowKept((s) => !s)}
                    aria-expanded={showKept}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-2 text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    <Star className="size-3.5" aria-hidden />
                    {favourites.length}
                  </button>
                )}
              </span>
            )}
          </figcaption>
        </figure>

        <SealStamp characters="武士" size="lg" className="absolute right-8 bottom-8" />
      </Panel>

      {/* The lines you chose to keep */}
      {showKept && favourites.length > 0 && (
        <Panel as="section" className="animate-rise p-6" interactive={false}>
          <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="text-[0.62rem] font-medium tracking-[0.28em] text-gold/80 uppercase">
              Kept Words
            </h2>
            <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
              {favourites.length} saved · {philosophies.length} in rotation
            </span>
          </div>

          <ul className="space-y-3">
            {favourites.map((f) => (
              <li
                key={f.id}
                className="group flex items-start gap-4 rounded-lg border border-border/40 bg-background/25 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-display block text-[0.95rem] leading-relaxed text-foreground/90">
                    “{f.text}”
                  </span>
                  <span className="mt-1 block text-[0.62rem] text-muted-foreground">
                    — {f.author} · kept {f.savedOn}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label={`Remove quote by ${f.author}`}
                  className="shrink-0 cursor-pointer text-[0.6rem] tracking-[0.14em] text-muted-foreground/50 uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
