import { useCallback, useEffect, useMemo, useState } from "react";

import { dayKeyFor, previousDay, type ActivityEvent } from "@/data/activity";
import type { PlaylistImport } from "@/lib/youtube";
import { KEYS, readJson, writeJson } from "@/services/store";

/**
 * Series: anything you work through one piece at a time — a course, a playlist,
 * a book. Every tick writes to the activity ledger, so a series feeds Knowledge
 * form like any other work.
 *
 * A series stores what you intend to work through. It stores no progress: an
 * episode is done exactly when its ledger event exists, and the day it was done
 * on is that event's frozen day key. Storing `doneOn` alongside the event meant
 * two writers for one fact, which could desynchronise silently.
 */

export type Episode = {
  id: string;
  title: string;
};

/** The ledger ref for one episode. Shared by the writer and every reader. */
export const seriesRef = (seriesId: string, episodeId: string) => `series:${seriesId}:${episodeId}`;

/** "Which day was this episode completed on?" — null when it has not been. */
export type EpisodeDone = (seriesId: string, episodeId: string) => string | null;

/**
 * Builds the completion lookup from the ledger. Cheap enough to rebuild
 * whenever events change, and it cannot disagree with the ledger because it
 * *is* the ledger.
 */
export function episodeCompletions(events: ActivityEvent[]): EpisodeDone {
  const dayByRef = new Map<string, string>();
  for (const e of events) {
    if (e.kind === "study") dayByRef.set(e.ref, e.day);
  }
  return (seriesId, episodeId) => dayByRef.get(seriesRef(seriesId, episodeId)) ?? null;
}

export type Series = {
  id: string;
  title: string;
  source: string;
  /** YouTube playlist id, when imported. */
  playlistId?: string;
  /** Episodes you intend to finish each day. */
  dailyTarget: number;
  /** Minutes credited per episode — used for measured-time stats. */
  minutesPerEpisode: number;
  createdOn: string;
  episodes: Episode[];
};

export function useSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readJson<Series[]>(KEYS.series, []).then((saved) => {
      if (cancelled) return;
      setSeries(saved);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void writeJson(KEYS.series, series);
  }, [series, hydrated]);

  const addFromPlaylist = useCallback((imported: PlaylistImport, minutesPerEpisode = 12) => {
    const next: Series = {
      id: `yt-${imported.playlistId}`,
      title: imported.title,
      source: imported.channel || "YouTube",
      playlistId: imported.playlistId,
      dailyTarget: 1,
      minutesPerEpisode,
      createdOn: dayKeyFor(new Date()),
      episodes: imported.episodes.map((e) => ({
        id: e.videoId,
        title: e.title,
      })),
    };
    setSeries((prev) => [next, ...prev.filter((s) => s.id !== next.id)]);
    return next;
  }, []);

  const addManual = useCallback(
    (title: string, count: number, source = "Manual", minutesPerEpisode = 20) => {
      const id = `manual-${Date.now()}`;
      const next: Series = {
        id,
        title,
        source,
        dailyTarget: 1,
        minutesPerEpisode,
        createdOn: dayKeyFor(new Date()),
        episodes: Array.from({ length: Math.max(1, count) }, (_, i) => ({
          id: `${id}-e${i}`,
          title: `Part ${i + 1}`,
        })),
      };
      setSeries((prev) => [next, ...prev]);
      return next;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setSeries((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const setDailyTarget = useCallback((seriesId: string, target: number) => {
    setSeries((prev) =>
      prev.map((s) => (s.id === seriesId ? { ...s, dailyTarget: Math.max(1, target) } : s)),
    );
  }, []);

  return {
    series,
    hydrated,
    addFromPlaylist,
    addManual,
    remove,
    setDailyTarget,
  };
}

/* ------------------------------------------------------------------ *
 * Derived, never stored
 * ------------------------------------------------------------------ */

export function seriesProgress(s: Series, doneOn: EpisodeDone) {
  const done = s.episodes.filter((e) => doneOn(s.id, e.id) !== null).length;
  return {
    done,
    total: s.episodes.length,
    percent: s.episodes.length === 0 ? 0 : Math.round((done / s.episodes.length) * 100),
    remaining: s.episodes.length - done,
  };
}

export function doneOnDay(s: Series, day: string, doneOn: EpisodeDone) {
  return s.episodes.filter((e) => doneOn(s.id, e.id) === day).length;
}

/** The next unwatched episode — what "continue" means. */
export function nextEpisode(s: Series, doneOn: EpisodeDone): Episode | null {
  return s.episodes.find((e) => doneOn(s.id, e.id) === null) ?? null;
}

/** Consecutive days you hit this series' daily target, ending today. */
export function seriesStreak(s: Series, today: string, doneOn: EpisodeDone): number {
  let cursor = doneOnDay(s, today, doneOn) >= s.dailyTarget ? today : previousDay(today);
  let streak = 0;
  while (doneOnDay(s, cursor, doneOn) >= s.dailyTarget) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** At the current daily pace, when does it finish? */
export function projectedFinish(s: Series, doneOn: EpisodeDone): number | null {
  const { remaining } = seriesProgress(s, doneOn);
  if (remaining === 0) return 0;
  return Math.ceil(remaining / Math.max(1, s.dailyTarget));
}

/** Convenience for hooks that need today's key. */
export function useToday() {
  return useMemo(() => dayKeyFor(new Date()), []);
}
