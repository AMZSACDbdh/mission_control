import { cn } from "@/lib/utils";

type SealSize = "sm" | "md" | "lg";

const sizeClasses: Record<SealSize, string> = {
  sm: "size-5 text-[0.45rem] rounded-[3px]",
  md: "size-6 text-[0.55rem] rounded",
  lg: "size-8 text-[0.7rem] rounded-md",
};

/** Carved cinnabar name seal (hanko) used to sign page headers and card corners. */
export function SealStamp({
  characters,
  size = "md",
  tone = "dark",
  className,
}: {
  characters: string;
  size?: SealSize;
  tone?: "dark" | "paper";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display inline-flex shrink-0 items-center justify-center border leading-none font-bold tracking-tight select-none",
        tone === "dark"
          ? "border-seal/55 bg-seal/15 text-seal shadow-[0_0_8px_oklch(0.45_0.17_27/12%)]"
          : "border-seal/45 bg-seal/10 text-seal/85",
        sizeClasses[size],
        className,
      )}
    >
      {characters}
    </span>
  );
}
