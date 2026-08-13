import { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { Panel, SectionLabel } from "./Panel";

/** Controlled by the day plan, so each day keeps its own intention. */
export function IntentionCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  // Keep the draft in step when the day (and therefore the intention) changes.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleToggle = () => {
    if (editing) {
      const next = draft.trim();
      if (next) onChange(next);
      else setDraft(value);
    }
    setEditing((e) => !e);
  };

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Today&apos;s Intention</SectionLabel>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[0.62rem] tracking-[0.12em] text-muted-foreground/70 uppercase transition-colors duration-300 hover:text-gold"
        >
          {editing ? <Check className="size-3" /> : <Pencil className="size-3" />}
          {editing ? "Save" : "Edit"}
        </button>
      </div>

      <Panel className="relative flex flex-1 flex-col overflow-hidden p-7">
        {/* Faint enso, echoing the mockup's watermark. */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden
          className="pointer-events-none absolute -right-3 bottom-2 size-24 text-gold/[0.07]"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="230 30"
            transform="rotate(-100 50 50)"
          />
        </svg>

        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            aria-label="Today's intention"
            className="font-display relative flex-1 resize-none rounded-lg border border-border bg-background/50 p-3 text-lg leading-relaxed text-foreground outline-none focus:border-gold/50"
          />
        ) : (
          <p className="font-display relative text-[1.35rem] leading-[1.65] text-foreground/95">
            {value}
          </p>
        )}
      </Panel>
    </section>
  );
}
