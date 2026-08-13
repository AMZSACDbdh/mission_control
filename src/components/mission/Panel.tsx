import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
  interactive?: boolean;
};

/** Reusable handcrafted surface: warm charcoal panel, hairline border, soft lift. */
export function Panel({ children, className, as: Tag = "div", interactive = true }: PanelProps) {
  return (
    <Tag
      className={cn(
        "texture-paper relative rounded-xl border border-border/70 bg-surface shadow-[0_1px_0_0_oklch(1_0_0/4%)_inset,0_18px_40px_-32px_oklch(0_0_0/90%)]",
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset,0_28px_60px_-34px_oklch(0_0_0/95%)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "mb-3 text-[0.68rem] font-medium tracking-[0.22em] text-gold-dim uppercase",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Caption that sits *outside* a panel, above it — the mockup's section titles. */
export function SectionLabel({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "mb-3 ml-1 text-[0.62rem] font-medium tracking-[0.28em] text-gold/80 uppercase",
        className,
      )}
    >
      {children}
    </h2>
  );
}
