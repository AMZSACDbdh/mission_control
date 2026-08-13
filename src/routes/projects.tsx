import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, CircleDot, GitBranch } from "lucide-react";

import { EnsoRing } from "@/components/mission/EnsoRing";
import { InkArt } from "@/components/mission/InkArt";
import { PageHeader } from "@/components/mission/PageHeader";
import { Panel, PanelLabel } from "@/components/mission/Panel";
import { SealStamp } from "@/components/mission/SealStamp";
import { StatTile } from "@/components/mission/StatTile";
import { FujiIcon, KamonIcon, ScrollIcon, ToriiIcon } from "@/components/mission/JapaneseIcons";

const title = "Projects — Mission Control";
const description = "Build with intent. Ship with pride.";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProjectsPage,
});

type Status = "active" | "planning" | "shipped";

type Milestone = { label: string; done: boolean };

type Project = {
  id: string;
  name: string;
  kanji: string;
  domain: string;
  summary: string;
  status: Status;
  progress: number;
  due: string;
  milestones: Milestone[];
};

const statusStyles: Record<Status, { label: string; className: string }> = {
  active: { label: "In Forge", className: "border-gold/45 bg-gold/12 text-gold-soft" },
  planning: { label: "Drafting", className: "border-sky-800/60 bg-sky-950/30 text-sky-400" },
  shipped: {
    label: "Shipped",
    className: "border-emerald-800/60 bg-emerald-950/30 text-emerald-400",
  },
};

const projects: Project[] = [
  {
    id: "p-portfolio",
    name: "Portfolio Website",
    kanji: "作",
    domain: "Personal Brand",
    summary: "A quiet, typography-led home for the work worth showing.",
    status: "active",
    progress: 68,
    due: "Aug 24",
    milestones: [
      { label: "Design system", done: true },
      { label: "Case study layouts", done: true },
      { label: "Writing section", done: false },
      { label: "Deploy to production", done: false },
    ],
  },
  {
    id: "p-ml",
    name: "ML Recommender",
    kanji: "智",
    domain: "AI / Research",
    summary: "Collaborative filtering engine trained on personal reading history.",
    status: "active",
    progress: 42,
    due: "Sep 10",
    milestones: [
      { label: "Data pipeline", done: true },
      { label: "Baseline model", done: true },
      { label: "Embedding rework", done: false },
      { label: "Evaluation harness", done: false },
    ],
  },
  {
    id: "p-mission",
    name: "Mission Control",
    kanji: "統",
    domain: "Product",
    summary: "The personal operating system you are reading right now.",
    status: "active",
    progress: 81,
    due: "Ongoing",
    milestones: [
      { label: "Design language", done: true },
      { label: "Core pages", done: true },
      { label: "Hall of Mastery", done: true },
      { label: "Backend persistence", done: false },
    ],
  },
  {
    id: "p-writing",
    name: "Essay Collection",
    kanji: "文",
    domain: "Writing",
    summary: "Twelve essays on discipline, craft, and the long game.",
    status: "planning",
    progress: 15,
    due: "Dec 01",
    milestones: [
      { label: "Outline twelve themes", done: true },
      { label: "First draft — three", done: false },
      { label: "Editing pass", done: false },
      { label: "Publish", done: false },
    ],
  },
  {
    id: "p-dsa",
    name: "Algorithms Handbook",
    kanji: "解",
    domain: "Study",
    summary: "A distilled reference built while grinding data structures.",
    status: "shipped",
    progress: 100,
    due: "Jul 02",
    milestones: [
      { label: "Core structures", done: true },
      { label: "Graph algorithms", done: true },
      { label: "Complexity tables", done: true },
      { label: "Published", done: true },
    ],
  },
];

const filters: { id: Status | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In Forge" },
  { id: "planning", label: "Drafting" },
  { id: "shipped", label: "Shipped" },
];

function ProjectsPage() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [selectedId, setSelectedId] = useState(projects[0]!.id);

  const visible = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.status === filter)),
    [filter],
  );

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0]!;

  const activeCount = projects.filter((p) => p.status === "active").length;
  const shippedCount = projects.filter((p) => p.status === "shipped").length;
  const allMilestones = projects.flatMap((p) => p.milestones);
  const doneMilestones = allMilestones.filter((m) => m.done).length;
  const averageProgress = Math.round(
    projects.reduce((sum, p) => sum + p.progress, 0) / projects.length,
  );

  const iconClass = "size-5";
  const stats = [
    {
      label: "In Forge",
      value: `${activeCount}`,
      caption: "active builds",
      icon: <ToriiIcon className={iconClass} />,
    },
    {
      label: "Shipped",
      value: `${shippedCount}`,
      caption: "delivered",
      icon: <KamonIcon className={iconClass} />,
    },
    {
      label: "Milestones",
      value: `${doneMilestones}/${allMilestones.length}`,
      caption: "completed",
      icon: <ScrollIcon className={iconClass} />,
    },
    {
      label: "Avg Progress",
      value: `${averageProgress}`,
      unit: "%",
      caption: "across all work",
      icon: <FujiIcon className={iconClass} />,
    },
  ];

  return (
    <div className="animate-rise space-y-6 select-none">
      <PageHeader title="Projects" seal="工房" subtitle={description} motif="bamboo" />

      <section aria-label="Project statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel as="section" className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <PanelLabel className="mb-0">The Workshop</PanelLabel>
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-surface/40 p-1">
              {filters.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                  className={`cursor-pointer rounded-md px-3 py-1 text-[0.6rem] font-semibold tracking-[0.12em] uppercase transition-colors duration-300 ${
                    filter === id
                      ? "bg-gold/15 text-gold-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground italic">
              Nothing in this stage yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((project) => {
                const isSelected = project.id === selectedId;
                const status = statusStyles[project.status];
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(project.id)}
                      aria-pressed={isSelected}
                      className={`group flex w-full cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${
                        isSelected
                          ? "border-gold/55 bg-gold/8"
                          : "border-border/50 bg-background/30 hover:border-gold/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-display grid size-10 shrink-0 place-items-center rounded-lg border border-gold/35 bg-surface-raised text-base text-gold-soft transition-colors duration-500 group-hover:border-gold/60">
                          {project.kanji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-medium text-foreground">
                              {project.name}
                            </h3>
                            <span
                              className={`shrink-0 rounded border px-1.5 py-0.5 text-[0.52rem] font-bold tracking-[0.1em] uppercase ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[0.62rem] text-muted-foreground">
                            {project.domain} · due {project.due}
                          </p>
                        </div>
                        <span className="font-display shrink-0 text-sm tabular-nums text-gold">
                          {project.progress}%
                        </span>
                      </div>

                      <div className="h-1 w-full overflow-hidden rounded-full bg-accent/60">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-gold-dim via-gold to-gold-soft transition-[width] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Detail */}
        <Panel as="section" className="relative overflow-hidden p-6">
          <InkArt
            motif="branch"
            className="pointer-events-none absolute -top-4 -right-6 h-28 w-48 text-gold-dim/10"
          />
          <div className="relative">
            <PanelLabel>Project Detail</PanelLabel>

            <div className="flex flex-col items-center text-center">
              <EnsoRing
                value={selected.progress}
                size={132}
                stroke={6}
                label={`${selected.name} is ${selected.progress} percent complete`}
              >
                <span className="text-center">
                  <span className="font-display block text-2xl leading-none text-gilded">
                    {selected.progress}%
                  </span>
                  <span className="mt-1 block text-[0.5rem] tracking-[0.18em] text-muted-foreground uppercase">
                    Complete
                  </span>
                </span>
              </EnsoRing>

              <h3 className="font-display mt-5 text-xl leading-none text-foreground">
                {selected.name}
              </h3>
              <p className="mt-2 text-[0.6rem] tracking-[0.16em] text-gold-dim uppercase">
                {selected.domain}
              </p>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">
                {selected.summary}
              </p>
            </div>

            <div className="mt-6 border-t border-border/40 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <PanelLabel className="mb-0 text-[0.55rem]">Milestones</PanelLabel>
                <span className="text-[0.58rem] tabular-nums text-muted-foreground">
                  {selected.milestones.filter((m) => m.done).length} / {selected.milestones.length}
                </span>
              </div>
              <ol className="space-y-2">
                {selected.milestones.map((milestone) => (
                  <li key={milestone.label} className="flex items-center gap-2.5">
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                        milestone.done
                          ? "border-gold bg-gold/20 text-gold"
                          : "border-border/60 text-transparent"
                      }`}
                      aria-hidden
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                    <span
                      className={`text-[0.7rem] ${
                        milestone.done
                          ? "text-muted-foreground line-through decoration-gold/40"
                          : "text-foreground"
                      }`}
                    >
                      {milestone.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4 text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase">
              <span className="flex items-center gap-1.5">
                <GitBranch className="size-3" aria-hidden />
                {statusStyles[selected.status].label}
              </span>
              <span className="flex items-center gap-1.5">
                <CircleDot className="size-3" aria-hidden />
                Due {selected.due}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <footer className="flex items-center justify-center gap-3 pt-1 pb-4">
        <p className="font-display text-[0.72rem] tracking-widest text-muted-foreground italic">
          千里の道も一歩から — Even a journey of a thousand miles begins with one step.
        </p>
        <SealStamp characters="工房" size="sm" />
      </footer>
    </div>
  );
}
