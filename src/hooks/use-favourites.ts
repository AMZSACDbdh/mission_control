import { useCallback, useEffect, useState } from "react";

import type { Philosophy } from "@/data/daily";
import { KEYS, readJson, writeJson } from "@/services/store";

export type FavouriteQuote = Philosophy & {
  /** Identity: text is unique enough and survives pool reordering. */
  id: string;
  savedOn: string;
};

/** The lines worth keeping, so the good ones don't disappear with the day. */
export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteQuote[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readJson<FavouriteQuote[]>(KEYS.favouriteQuotes, []).then((saved) => {
      if (cancelled) return;
      setFavourites(saved);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeJson(KEYS.favouriteQuotes, favourites);
  }, [favourites, hydrated]);

  const isFavourite = useCallback(
    (quote: Philosophy) => favourites.some((f) => f.id === quote.text),
    [favourites],
  );

  const toggle = useCallback((quote: Philosophy) => {
    setFavourites((prev) => {
      if (prev.some((f) => f.id === quote.text)) {
        return prev.filter((f) => f.id !== quote.text);
      }
      return [
        { ...quote, id: quote.text, savedOn: new Date().toISOString().slice(0, 10) },
        ...prev,
      ];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFavourites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { favourites, hydrated, isFavourite, toggle, remove };
}
