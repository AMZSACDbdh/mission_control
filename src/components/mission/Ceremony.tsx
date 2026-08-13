import { useCallback, useEffect, useRef, useState } from "react";

import { SealStamp } from "./SealStamp";
import { InkArt } from "./InkArt";
import { philosophyForDay } from "@/data/daily";
import { rankForLevel } from "@/data/progression";
import { useProgression } from "@/hooks/use-progression";
import { cn } from "@/lib/utils";

/**
 * The three ceremonies.
 *
 * Never flashy, never loud, never arcade-like. The feeling should resemble
 * receiving a martial arts certificate: the room goes quiet, something is
 * drawn, a seal is pressed, and you carry on.
 *
 * Each may be skipped. None can be disabled globally. None ever repeats —
 * acknowledgement is persisted by ref, not by progression value.
 */

/** An enso drawn by the brush, rather than merely appearing. */
function DrawnEnso({ size = 180, durationMs = 2200 }: { size?: number; durationMs?: number }) {
  const circumference = 2 * Math.PI * 44;
  const arc = circumference * 0.92;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="-rotate-[105deg]">
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-gold"
        style={{
          strokeDasharray: `${arc} ${circumference}`,
          strokeDashoffset: arc,
          animation: `ceremony-draw ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
        }}
      />
    </svg>
  );
}

/** Staged reveal — each element waits its turn, nothing arrives at once. */
function Stage({
  at,
  children,
  className,
}: {
  at: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), at);
    return () => clearTimeout(id);
  }, [at]);

  return (
    <div
      className={cn(
        "transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CeremonyOverlay() {
  const { pendingCeremony, acknowledgeCeremony } = useProgression();
  const [dismissing, setDismissing] = useState(false);

  // Tracked so the pending acknowledgement can be cancelled on unmount, and so
  // a second Escape during the fade cannot queue a second one.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    if (closeTimer.current !== null) return;
    setDismissing(true);
    // Let the fade finish before the ceremony is marked seen.
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      acknowledgeCeremony();
      setDismissing(false);
    }, 400);
  }, [acknowledgeCeremony]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    [],
  );

  // Escape always skips — a ceremony must never trap you.
  useEffect(() => {
    if (!pendingCeremony) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingCeremony, handleClose]);

  if (!pendingCeremony) return null;

  /* ---- Level-up: 1–2 seconds, deliberately subtle ---- */
  if (pendingCeremony.type === "level") {
    return (
      <LevelUpToast level={pendingCeremony.level} onDone={handleClose} dismissing={dismissing} />
    );
  }

  const isJourney = pendingCeremony.type === "journey";
  const rank =
    pendingCeremony.type === "promotion" ? rankForLevel(pendingCeremony.level) : rankForLevel(100);
  const quote = philosophyForDay(new Date());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isJourney ? "Journey complete" : `Promoted to ${rank.name}`}
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-background/96 backdrop-blur-sm transition-opacity duration-500",
        dismissing ? "opacity-0" : "opacity-100",
      )}
    >
      <InkArt
        motif="mountains"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full text-gold/[0.06]"
      />

      <div className="relative flex max-w-lg flex-col items-center px-8 text-center">
        {/* 1–4. The enso draws itself */}
        <div className="relative grid place-items-center">
          <DrawnEnso size={isJourney ? 220 : 180} durationMs={isJourney ? 3200 : 2200} />

          {/* 5. The kanji is revealed inside it */}
          <Stage at={isJourney ? 2400 : 1600} className="absolute inset-0 grid place-items-center">
            <span className="font-display text-3xl leading-[1.05] tracking-[0.08em] text-gilded">
              {isJourney
                ? "満"
                : rank.kanji.split("").map((c, i) => (
                    <span key={i} className="block">
                      {c}
                    </span>
                  ))}
            </span>
          </Stage>
        </div>

        {/* 6. The title */}
        <Stage at={isJourney ? 3400 : 2600} className="mt-8">
          <p className="text-[0.58rem] tracking-[0.32em] text-muted-foreground uppercase">
            {isJourney ? "Journey Complete" : "Promoted"}
          </p>
          <h2 className="font-display mt-3 text-4xl leading-none tracking-[0.12em] text-gilded uppercase">
            {isJourney ? `Journey ${pendingCeremony.journey}` : rank.name}
          </h2>
          <p className="mt-3 text-[0.68rem] tracking-[0.2em] text-gold-dim uppercase">
            {isJourney ? "The chapter closes" : rank.meaning}
          </p>
        </Stage>

        {/* 7. A philosophy quote */}
        <Stage at={isJourney ? 4600 : 3600} className="mt-7">
          <p className="font-display max-w-md text-base leading-relaxed text-foreground/80 italic">
            “{quote.text}”
          </p>
          <p className="mt-2 text-[0.62rem] text-muted-foreground">— {quote.author}</p>
        </Stage>

        {/* Journey Chronicle summary */}
        {isJourney && (
          <Stage at={5600} className="mt-7 w-full">
            <dl className="grid grid-cols-3 gap-4 border-y border-border/40 py-5 text-center">
              {[
                ["Journey XP", pendingCeremony.record.journeyXP.toLocaleString()],
                ["Focus Hours", `${pendingCeremony.record.focusHours}`],
                ["Longest Streak", `${pendingCeremony.record.longestStreak}`],
                ["Days", `${pendingCeremony.record.durationDays}`],
                ["Best XP Day", pendingCeremony.record.bestXPDay.toLocaleString()],
                ["Strongest", pendingCeremony.record.strongestArea],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.52rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="font-display mt-1 text-lg text-gilded capitalize">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.62rem] tracking-[0.16em] text-gold-soft uppercase">
              Menkyo Scroll awarded · archived permanently
            </p>
          </Stage>
        )}

        {/* 8. The seal is pressed */}
        <Stage at={isJourney ? 6600 : 4600} className="mt-8">
          <SealStamp characters={isJourney ? "免許" : rank.kanji.slice(0, 2)} size="lg" />
        </Stage>

        {/* 9–10. Continue */}
        <Stage at={isJourney ? 7200 : 5000} className="mt-8">
          <button
            type="button"
            onClick={handleClose}
            className="h-11 cursor-pointer rounded-full border border-gold/50 px-8 text-[0.68rem] font-medium tracking-[0.2em] text-gold-soft uppercase transition-colors duration-300 hover:bg-gold/10"
          >
            Continue
          </button>
          <p className="mt-3 text-[0.55rem] tracking-[0.14em] text-muted-foreground/60 uppercase">
            Esc to skip
          </p>
        </Stage>
      </div>
    </div>
  );
}

/** The quiet one: a level-up is a small ink splash, not an event. */
function LevelUpToast({
  level,
  onDone,
  dismissing,
}: {
  level: number;
  onDone: () => void;
  dismissing: boolean;
}) {
  useEffect(() => {
    const id = setTimeout(onDone, 2000);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-8 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        dismissing ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100",
      )}
    >
      <div className="flex items-center gap-4 rounded-full border border-gold/40 bg-surface/95 px-6 py-3 shadow-[0_18px_50px_-20px_oklch(0_0_0/90%)] backdrop-blur-sm">
        <span className="relative grid size-8 place-items-center">
          <span className="absolute size-8 animate-ping rounded-full bg-gold/20" />
          <span className="size-2 rounded-full bg-gold" />
        </span>
        <span>
          <span className="block text-[0.55rem] tracking-[0.24em] text-muted-foreground uppercase">
            Level
          </span>
          <span className="font-display text-xl leading-none text-gilded">{level}</span>
        </span>
      </div>
    </div>
  );
}
