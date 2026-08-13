import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Download, Upload } from "lucide-react";

import { PageHeader } from "@/components/mission/PageHeader";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { SealStamp } from "@/components/mission/SealStamp";
import { StatTile } from "@/components/mission/StatTile";
import { HourglassIcon, KamonIcon, ScrollIcon } from "@/components/mission/JapaneseIcons";
import {
  DAY_BOUNDARY_HOUR,
  FOCUS_TIERS,
  FORM_TARGET_30,
  GRACE,
  MVD,
  OBJECTIVE_POT,
  RATE_VERSION,
  TASK_POT,
} from "@/data/activity";
import { downloadBackup, restoreBackup } from "@/lib/backup";
import { getApiKey, setApiKey } from "@/lib/youtube";
import { DEFAULT_NAME } from "@/lib/profile";
import { useActivity } from "@/hooks/use-activity";
import { useProgression } from "@/hooks/use-progression";
import { useProfileName } from "@/hooks/use-profile";

const title = "Settings — Mission Control";
const description = "Your data, and the rules it runs on.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { events, stats, replaceAll } = useActivity();
  const { progression } = useProgression();
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [youtubeKey, setYoutubeKey] = useState("");
  const [name, saveName] = useProfileName();
  const [nameDraft, setNameDraft] = useState("");

  // Read the stored key on mount only — it must not reach the server render.
  useEffect(() => {
    void getApiKey().then(setYoutubeKey);
  }, []);
  useEffect(() => setNameDraft(name === DEFAULT_NAME ? "" : name), [name]);

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = await restoreBackup(text, events);
    if (result.mergedEvents) replaceAll(result.mergedEvents);
    setNotice({ ok: result.ok, message: result.message });
  };

  const oldest = events.length > 0 ? [...events].map((e) => e.day).sort()[0] : null;

  return (
    <div className="animate-rise space-y-6 select-none">
      <PageHeader title="Settings" seal="設定" subtitle={description} motif="pine" />

      {/* Name */}
      <Panel as="section" className="p-6">
        <PanelLabel>Your Name</PanelLabel>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Used for the greeting on the home page. Stored only in this browser, and never sent
          anywhere.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={DEFAULT_NAME}
            aria-label="Your name"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-gold/50 placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={() => {
              saveName(nameDraft);
              setNotice({
                ok: true,
                message: nameDraft.trim()
                  ? `You will be greeted as ${nameDraft.trim()}.`
                  : "Name cleared.",
              });
            }}
            className="h-10 cursor-pointer rounded-lg border border-border/60 px-5 text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold"
          >
            Save name
          </button>
        </div>
      </Panel>

      <section aria-label="Ledger summary" className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={<ScrollIcon className="size-5" />}
          label="Events Recorded"
          value={events.length.toLocaleString()}
          caption={oldest ? `since ${oldest}` : "nothing logged yet"}
        />
        <StatTile
          icon={<KamonIcon className="size-5" />}
          label="Lifetime XP"
          value={stats.totalXp.toLocaleString()}
          caption={`level ${progression.currentLevel} · ${progression.masterRank.name}`}
        />
        <StatTile
          icon={<HourglassIcon className="size-5" />}
          label="Measured Time"
          value={`${Math.round((stats.totalMinutes / 60) * 10) / 10}`}
          unit="h"
          caption="focus sessions only"
        />
      </section>

      {/* Backup */}
      <Panel as="section" className="p-6">
        <PanelLabel>Your Data</PanelLabel>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Everything lives in this browser and nowhere else. Clearing site data erases it
          permanently. Export regularly — the file is plain JSON you can read, keep anywhere, and
          restore into any browser.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void downloadBackup()}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft px-6 text-[0.7rem] font-bold tracking-[0.16em] text-primary-foreground uppercase shadow-[0_0_20px_oklch(0.78_0.11_82/25%)] transition-all duration-300 hover:brightness-110"
          >
            <Download className="size-4" />
            Export Everything
          </button>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border/60 px-6 text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase transition-colors duration-300 hover:border-gold/50 hover:text-gold"
          >
            <Upload className="size-4" />
            Restore From File
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = "";
            }}
          />
        </div>

        {notice && (
          <p
            className={`mt-4 flex items-center gap-2 text-sm ${notice.ok ? "text-gold-soft" : "text-rose-400"}`}
          >
            {!notice.ok && <AlertTriangle className="size-4 shrink-0" aria-hidden />}
            {notice.message}
          </p>
        )}

        <p className="mt-4 border-t border-border/40 pt-4 text-[0.7rem] leading-relaxed text-muted-foreground/80">
          Restoring <span className="text-foreground">merges</span> the ledger by event id rather
          than overwriting it, so importing an old backup can never delete newer work.
        </p>
      </Panel>

      {/* YouTube key */}
      <Panel as="section" className="p-6">
        <PanelLabel>YouTube Playlist Import</PanelLabel>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          To import a playlist as a series, paste a Google API key with{" "}
          <span className="text-foreground">YouTube Data API v3</span> enabled. It is stored only in
          this browser and only ever used to read public playlist contents.
        </p>
        <p className="mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-muted-foreground/70">
          Worth knowing: YouTube stopped exposing watch history through its API in 2016, so nothing
          can detect what you actually watched. The import pulls the episode list; ticking them off
          is yours.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="password"
            value={youtubeKey}
            onChange={(e) => setYoutubeKey(e.target.value)}
            placeholder="AIza…"
            aria-label="YouTube Data API key"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-gold/50 placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={() => {
              void setApiKey(youtubeKey);
              setNotice({ ok: true, message: youtubeKey.trim() ? "Key saved." : "Key cleared." });
            }}
            className="h-10 cursor-pointer rounded-lg border border-border/60 px-5 text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-gold/50 hover:text-gold"
          >
            Save key
          </button>
        </div>
      </Panel>

      {/* The rules, stated plainly */}
      <Panel as="section" className="p-6">
        <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
          <PanelLabel className="mb-0">How Progress Is Counted</PanelLabel>
          <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
            Rate version {RATE_VERSION}
          </span>
        </div>

        <dl className="grid gap-5 md:grid-cols-2">
          <div>
            <dt className="text-[0.6rem] tracking-[0.2em] text-gold-dim uppercase">Tasks</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A task is worth a fixed amount — Critical {TASK_POT.critical}, High {TASK_POT.high},
              Standard {TASK_POT.standard}. Half is split across its steps, half is paid on
              completion, so slicing a task into more steps never earns more. The daily objective
              works the same way at {OBJECTIVE_POT}.
            </dd>
          </div>

          <div>
            <dt className="text-[0.6rem] tracking-[0.2em] text-gold-dim uppercase">Focus</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              1 XP per measured minute for the first {FOCUS_TIERS[0]!.upToMinutes} minutes each day,
              then ×{FOCUS_TIERS[1]!.multiplier} up to {FOCUS_TIERS[1]!.upToMinutes}, then ×
              {FOCUS_TIERS[2]!.multiplier}. Hour eight is not worth what hour one was. Rest earns
              nothing, and time estimates never count as measured hours.
            </dd>
          </div>

          <div>
            <dt className="text-[0.6rem] tracking-[0.2em] text-gold-dim uppercase">
              What Counts As A Day
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A day keeps your streak if you log {MVD.focusMinutes}+ minutes of focus, complete the
              objective, or earn {MVD.xp}+ XP. One tap at midnight is not a day. Days roll over at{" "}
              {DAY_BOUNDARY_HOUR}:00, so late-night work belongs to the day you experienced it as.
            </dd>
          </div>

          <div>
            <dt className="text-[0.6rem] tracking-[0.2em] text-gold-dim uppercase">Grace</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You earn one grace token every {GRACE.earnEvery} unbroken days, holding at most{" "}
              {GRACE.max}. A missed day spends one instead of erasing weeks of real work, and shows
              as recovered rather than earned. You currently hold{" "}
              <span className="text-gold-soft">{stats.streakTokens}</span>.
            </dd>
          </div>

          <div className="md:col-span-2">
            <dt className="text-[0.6rem] tracking-[0.2em] text-gold-dim uppercase">
              Form vs. Rank
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Rank and level come from lifetime XP and never fall — what you earned is yours. Form
              is a rolling 30-day measure against a sustainable cadence (Discipline{" "}
              {FORM_TARGET_30.discipline}, Mind {FORM_TARGET_30.mind}, Body {FORM_TARGET_30.body},
              Knowledge {FORM_TARGET_30.knowledge}, Spirit {FORM_TARGET_30.spirit} XP per 30 days)
              and falls when you stop. One is a record; the other is a mirror.
            </dd>
          </div>
        </dl>
      </Panel>

      <footer className="flex items-center justify-center gap-3 pt-1 pb-4">
        <p className="font-display text-[0.72rem] tracking-widest text-muted-foreground italic">
          記録は嘘をつかない — The record does not lie.
        </p>
        <SealStamp characters="設定" size="sm" />
      </footer>
    </div>
  );
}
