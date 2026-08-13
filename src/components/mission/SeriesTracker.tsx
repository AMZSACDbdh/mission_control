import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2, Youtube } from "lucide-react";

import { Panel, PanelLabel } from "./Panel";
import { ScrollIcon } from "./JapaneseIcons";
import { XP } from "@/data/activity";
import { useActivity } from "@/hooks/use-activity";
import {
  doneOnDay,
  episodeCompletions,
  nextEpisode,
  projectedFinish,
  seriesProgress,
  seriesRef,
  seriesStreak,
  useSeries,
  type Series,
} from "@/hooks/use-series";
import { getApiKey, importPlaylist } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/**
 * Work through a course, playlist or book one piece a day.
 *
 * Ticking an episode writes to the ledger as measured study time, so a series
 * feeds Knowledge form and your streak exactly like focused work does.
 */
export function SeriesTracker({ today }: { today: string }) {
  const { series, addFromPlaylist, addManual, remove, setDailyTarget } = useSeries();
  const { log, unlog, events } = useActivity();

  // Completion comes from the ledger, so the tick and the record cannot drift.
  const doneOn = useMemo(() => episodeCompletions(events), [events]);

  const [url, setUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCount, setManualCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const imported = await importPlaylist(url, await getApiKey());
      addFromPlaylist(imported);
      setUrl("");
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import that playlist.");
    } finally {
      setBusy(false);
    }
  };

  /** Ticking writes the ledger entry, and nothing else. */
  const toggleEpisode = (s: Series, episodeId: string, done: boolean) => {
    const ref = seriesRef(s.id, episodeId);
    if (done) {
      log({
        ref,
        kind: "study",
        area: "knowledge",
        xp: XP.journal, // one deliberate piece of learning
        minutes: s.minutesPerEpisode,
        label: `${s.title} — ${s.episodes.find((e) => e.id === episodeId)?.title ?? "episode complete"}`,
      });
    } else {
      unlog(ref);
    }
  };

  return (
    <section aria-labelledby="series-heading">
      <div className="flex items-baseline justify-between">
        <h2
          id="series-heading"
          className="mb-3 ml-1 text-[0.62rem] font-medium tracking-[0.28em] text-gold/80 uppercase"
        >
          Series &amp; Courses
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[0.58rem] tracking-[0.12em] text-muted-foreground/70 uppercase transition-colors hover:text-gold"
        >
          <Plus className="size-3" aria-hidden />
          Add a series
        </button>
      </div>

      {showAdd && (
        <Panel className="animate-rise mb-3 p-5" interactive={false}>
          <PanelLabel className="text-[0.6rem]">From a YouTube playlist</PanelLabel>
          <div className="flex flex-wrap gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a public playlist link"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-gold/50 placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={busy || !url.trim()}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 text-[0.65rem] font-medium tracking-[0.12em] text-gold-soft uppercase transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Youtube className="size-3.5" />
              )}
              Import
            </button>
          </div>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-muted-foreground/70">
            Needs a free YouTube Data API key, set in Settings. YouTube has not exposed watch
            history since 2016, so this imports the episode list — you tick what you finish.
          </p>

          <div className="mt-5 border-t border-border/40 pt-4">
            <PanelLabel className="text-[0.6rem]">Or by hand</PanelLabel>
            <div className="flex flex-wrap gap-2">
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="What are you working through?"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-gold/50 placeholder:text-muted-foreground/50"
              />
              <input
                type="number"
                min={1}
                value={manualCount}
                onChange={(e) => setManualCount(Number(e.target.value))}
                aria-label="How many parts"
                className="w-24 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/50"
              />
              <button
                type="button"
                onClick={() => {
                  if (!manualTitle.trim()) return;
                  addManual(manualTitle.trim(), manualCount);
                  setManualTitle("");
                  setShowAdd(false);
                }}
                disabled={!manualTitle.trim()}
                className="h-10 cursor-pointer rounded-lg border border-border/60 px-4 text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
        </Panel>
      )}

      {series.length === 0 ? (
        <Panel className="p-8 text-center" interactive={false}>
          <ScrollIcon className="mx-auto size-7 text-gold-dim/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing in progress. Add a playlist or a course and work it one piece a day.
          </p>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {series.map((s) => {
            const progress = seriesProgress(s, doneOn);
            const todayCount = doneOnDay(s, today, doneOn);
            const streak = seriesStreak(s, today, doneOn);
            const next = nextEpisode(s, doneOn);
            const daysLeft = projectedFinish(s, doneOn);
            const hitToday = todayCount >= s.dailyTarget;
            const nextIdx = next
              ? s.episodes.findIndex((e) => e.id === next.id)
              : s.episodes.length;
            const lastDone = nextIdx > 0 ? (s.episodes[nextIdx - 1] ?? null) : null;

            return (
              <li key={s.id}>
                <Panel className="group p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display truncate text-lg text-foreground">{s.title}</h3>
                      <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                        {s.source} · {progress.done} of {progress.total} done
                        {streak > 0 && ` · ${streak}-day streak`}
                        {daysLeft !== null &&
                          daysLeft > 0 &&
                          ` · ~${daysLeft} day${daysLeft === 1 ? "" : "s"} at this pace`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[0.55rem] tracking-[0.14em] uppercase",
                          hitToday
                            ? "border-gold/50 bg-gold/12 text-gold-soft"
                            : "border-border/60 text-muted-foreground",
                        )}
                      >
                        {todayCount}/{s.dailyTarget} today
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        aria-label={`Remove ${s.title}`}
                        className="cursor-pointer text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-accent/60">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {next ? (
                    <div className="mt-4 border-t border-border/40 pt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleEpisode(s, next.id, true)}
                          className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft px-5 text-[0.62rem] font-bold tracking-[0.14em] text-primary-foreground uppercase transition-all hover:brightness-110"
                        >
                          <Check className="size-3.5" />
                          Mark done
                        </button>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          Next: {next.title}
                        </span>
                        <label className="flex shrink-0 items-center gap-1.5 text-[0.58rem] tracking-[0.12em] text-muted-foreground uppercase">
                          Per day
                          <input
                            type="number"
                            min={1}
                            value={s.dailyTarget}
                            onChange={(e) => setDailyTarget(s.id, Number(e.target.value))}
                            className="w-14 rounded border border-border bg-background/50 px-2 py-1 text-xs text-foreground outline-none focus:border-gold/50"
                          />
                        </label>
                      </div>
                      {lastDone && (
                        <div className="mt-2 flex items-center gap-2 text-[0.58rem] text-muted-foreground/50">
                          <span className="truncate">Last: {lastDone.title}</span>
                          <button
                            type="button"
                            onClick={() => toggleEpisode(s, lastDone.id, false)}
                            className="shrink-0 cursor-pointer text-muted-foreground/40 transition-colors hover:text-rose-400"
                          >
                            undo
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-border/40 pt-4">
                      <p className="text-center text-xs text-gold-soft">
                        Finished. All {progress.total} complete.
                      </p>
                      {lastDone && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-[0.58rem] text-muted-foreground/50">
                          <span className="truncate">Last: {lastDone.title}</span>
                          <button
                            type="button"
                            onClick={() => toggleEpisode(s, lastDone.id, false)}
                            className="shrink-0 cursor-pointer text-muted-foreground/40 transition-colors hover:text-rose-400"
                          >
                            undo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
