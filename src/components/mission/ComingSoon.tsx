import { Panel, PanelLabel } from "./Panel";

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Panel as="section" className="animate-rise px-10 py-20 text-center">
      <PanelLabel>Mission Control</PanelLabel>
      <h1 className="font-display text-4xl text-foreground">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{note}</p>
    </Panel>
  );
}
