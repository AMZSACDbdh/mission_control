import { InkArt } from "./InkArt";
import { Panel, PanelLabel } from "./Panel";
import { SealStamp } from "./SealStamp";

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Panel as="section" className="animate-rise relative overflow-hidden px-10 py-20 text-center">
      <InkArt
        motif="moon"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-gold/[0.08]"
      />
      <InkArt
        motif="pine"
        className="pointer-events-none absolute right-0 top-0 h-40 w-56 text-gold/[0.05]"
      />
      <div className="relative">
        <PanelLabel>Mission Control</PanelLabel>
        <h1 className="font-display text-4xl text-foreground">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{note}</p>
        <div className="mt-8 flex justify-center">
          <SealStamp characters="近日" size="lg" />
        </div>
        <p className="mt-4 text-[0.6rem] tracking-[0.28em] text-gold-dim/60 uppercase">
          In preparation
        </p>
      </div>
    </Panel>
  );
}
