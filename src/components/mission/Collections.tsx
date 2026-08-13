import { useState } from "react";
import { Check, Lock } from "lucide-react";

import { Panel, PanelLabel } from "./Panel";
import { KamonIcon } from "./JapaneseIcons";
import {
  collectionNames,
  isEquippableCategory,
  rewardsByCategory,
  type CosmeticCategory,
} from "@/data/rewards";
import { useProgression } from "@/hooks/use-progression";
import { cn } from "@/lib/utils";

/**
 * The Collections shelf.
 *
 * Everything here is cosmetic or commemorative. Nothing on this screen can
 * change a single number elsewhere in the app — equipping is a preference, not
 * a modifier.
 */
export function Collections() {
  const { rewards, unlockedCount, unlockedAt, equipped, equip } = useProgression();
  const byCategory = rewardsByCategory(rewards);
  const [open, setOpen] = useState<CosmeticCategory | null>("enso");

  const categories = [...byCategory.keys()];

  return (
    <Panel as="section" className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
        <PanelLabel className="mb-0">Collections</PanelLabel>
        <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
          {unlockedCount} of {rewards.length} earned
        </span>
      </div>

      {/* Category tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {categories.map((category) => {
          const items = byCategory.get(category) ?? [];
          const earned = items.filter((i) => i.unlocked).length;
          const active = open === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setOpen(active ? null : category)}
              aria-pressed={active}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-[0.58rem] tracking-[0.1em] uppercase transition-colors duration-300",
                active
                  ? "border-gold/55 bg-gold/12 text-gold-soft"
                  : "border-border/50 text-muted-foreground hover:border-gold/35 hover:text-foreground",
              )}
            >
              {collectionNames[category]} {earned}/{items.length}
            </button>
          );
        })}
      </div>

      {open && (
        <ul className="animate-rise grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(byCategory.get(open) ?? []).map((reward) => {
            const isEquipped = equipped[reward.category] === reward.id;
            const canEquip = reward.unlocked && isEquippableCategory(reward.category);
            const earnedOn = unlockedAt(reward.id);

            return (
              <li key={reward.id}>
                <button
                  type="button"
                  disabled={!canEquip}
                  onClick={() => canEquip && equip(reward.category, reward.id)}
                  aria-pressed={isEquipped}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    reward.unlocked
                      ? "border-border/50 bg-background/30"
                      : "border-border/30 bg-background/15 opacity-60",
                    canEquip && "cursor-pointer hover:-translate-y-0.5 hover:border-gold/40",
                    isEquipped && "border-gold/60 bg-gold/10",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg border",
                      reward.unlocked
                        ? "border-gold/35 text-gold-dim"
                        : "border-border/40 text-muted-foreground/40",
                    )}
                  >
                    {reward.unlocked ? (
                      <KamonIcon className="size-4" />
                    ) : (
                      <Lock className="size-3.5" aria-hidden />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-[0.8rem] font-medium",
                          reward.unlocked ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {reward.name}
                      </span>
                      {isEquipped && (
                        <Check className="size-3 shrink-0 text-gold" aria-label="Equipped" />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.62rem] text-muted-foreground/80">
                      {reward.description}
                    </span>

                    {reward.unlocked ? (
                      <span className="mt-1.5 block text-[0.55rem] tracking-[0.1em] text-gold-dim/80 uppercase">
                        {earnedOn ? `Earned ${earnedOn.slice(0, 10)}` : "Earned"}
                      </span>
                    ) : (
                      <span className="mt-1.5 block">
                        <span className="block text-[0.55rem] tracking-[0.1em] text-muted-foreground/70 uppercase">
                          {reward.requirementLabel}
                        </span>
                        <span className="mt-1 block h-[2px] w-full overflow-hidden rounded-full bg-accent/50">
                          <span
                            className="block h-full rounded-full bg-gold/40"
                            style={{ width: `${reward.progressPercent}%` }}
                          />
                        </span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 border-t border-border/40 pt-4 text-[0.62rem] leading-relaxed text-muted-foreground/70">
        Collections are permanent and never expire. Nothing here affects XP, Form, streaks or
        progression speed — no loot boxes, no probability, no paid unlocks. Every unlock has one
        deterministic requirement.
      </p>
    </Panel>
  );
}

/** The archive of completed Journeys — historical truth, never editable. */
export function MenkyoShelf() {
  const { menkyo } = useProgression();

  if (menkyo.length === 0) return null;

  return (
    <Panel as="section" className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
        <PanelLabel className="mb-0">Menkyo Scrolls</PanelLabel>
        <span className="text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
          {menkyo.length} awarded
        </span>
      </div>

      <ul className="space-y-3">
        {menkyo.map((scroll) => (
          <li key={scroll.id} className="rounded-xl border border-gold/30 bg-background/25 p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg text-gilded">Journey {scroll.journey}</h3>
              <span className="text-[0.6rem] text-muted-foreground">
                {scroll.record.startedAt} → {scroll.record.completedAt}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Journey XP", scroll.record.journeyXP.toLocaleString()],
                ["Focus Hours", `${scroll.record.focusHours}`],
                ["Longest Streak", `${scroll.record.longestStreak}`],
                ["Days", `${scroll.record.durationDays}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.52rem] tracking-[0.16em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="font-display mt-0.5 text-sm text-foreground tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
