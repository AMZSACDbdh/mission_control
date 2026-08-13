import { Swords, CalendarClock, AlertCircle, CheckCircle, Percent } from "lucide-react";
import { Panel, PanelLabel } from "./Panel";
import { useCountUp, useAnimatedProgress } from "@/hooks/use-count-up";
import { Mission } from "@/data/missionsData";

interface MissionsStatsProps {
  missions: Mission[];
}

export function MissionsStats({ missions }: MissionsStatsProps) {
  // Calculations
  const activeCount = missions.filter((m) => !m.completed && !m.archived).length;

  // Due this week: due date is within next 7 days or past due and not completed
  const now = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(now.getDate() + 7);

  const dueThisWeekCount = missions.filter((m) => {
    if (m.completed || m.archived) return false;
    if (!m.dueDate) return false;
    const dueDate = new Date(m.dueDate);
    return dueDate <= oneWeekFromNow;
  }).length;

  const highPriorityCount = missions.filter(
    (m) => !m.completed && !m.archived && m.priority === "High",
  ).length;

  const completedCount = missions.filter((m) => m.completed && !m.archived).length;

  const totalRelevant = missions.filter((m) => !m.archived).length;
  const rawCompletionRate = totalRelevant > 0 ? (completedCount / totalRelevant) * 100 : 0;
  const completionRate = Math.round(rawCompletionRate);

  // Animated values
  const animActive = useCountUp(activeCount);
  const animDue = useCountUp(dueThisWeekCount);
  const animHigh = useCountUp(highPriorityCount);
  const animCompleted = useCountUp(completedCount);
  const animRate = useCountUp(completionRate);
  const animRingProgress = useAnimatedProgress(completionRate / 100);

  // Circular progress specs
  const size = 52;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <section aria-label="Missions overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Active Missions */}
      <Panel
        as="article"
        className="p-5 flex flex-col justify-between h-32 transition-all duration-300 hover:border-gold/30"
      >
        <div>
          <div className="flex items-start justify-between">
            <PanelLabel className="mb-0">Active Missions</PanelLabel>
            <Swords className="size-4 text-gold-dim" aria-hidden />
          </div>
          <p className="mt-3 font-display text-3.5xl font-medium text-foreground leading-none tabular-nums">
            {Math.round(animActive)}
          </p>
        </div>
        <p className="text-[0.68rem] text-muted-foreground">Campaigns currently in progress.</p>
      </Panel>

      {/* Due This Week */}
      <Panel
        as="article"
        className="p-5 flex flex-col justify-between h-32 transition-all duration-300 hover:border-gold/30"
      >
        <div>
          <div className="flex items-start justify-between">
            <PanelLabel className="mb-0">Due This Week</PanelLabel>
            <CalendarClock className="size-4 text-gold-dim" aria-hidden />
          </div>
          <p className="mt-3 font-display text-3.5xl font-medium text-foreground leading-none tabular-nums">
            {Math.round(animDue)}
          </p>
        </div>
        <p className="text-[0.68rem] text-muted-foreground">Approaching final thresholds.</p>
      </Panel>

      {/* High Priority */}
      <Panel
        as="article"
        className="p-5 flex flex-col justify-between h-32 transition-all duration-300 hover:border-gold/30"
      >
        <div>
          <div className="flex items-start justify-between">
            <PanelLabel className="mb-0">High Priority</PanelLabel>
            <AlertCircle className="size-4 text-gold-dim" aria-hidden />
          </div>
          <p className="mt-3 font-display text-3.5xl font-medium text-foreground leading-none tabular-nums">
            {Math.round(animHigh)}
          </p>
        </div>
        <p className="text-[0.68rem] text-muted-foreground">Critical objectives requiring focus.</p>
      </Panel>

      {/* Completed */}
      <Panel
        as="article"
        className="p-5 flex flex-col justify-between h-32 transition-all duration-300 hover:border-gold/30"
      >
        <div>
          <div className="flex items-start justify-between">
            <PanelLabel className="mb-0">Completed</PanelLabel>
            <CheckCircle className="size-4 text-gold-dim" aria-hidden />
          </div>
          <p className="mt-3 font-display text-3.5xl font-medium text-foreground leading-none tabular-nums">
            {Math.round(animCompleted)}
          </p>
        </div>
        <p className="text-[0.68rem] text-muted-foreground">Successful deployments archived.</p>
      </Panel>

      {/* Completion Rate */}
      <Panel
        as="article"
        className="p-5 flex flex-col justify-between h-32 transition-all duration-300 hover:border-gold/30"
      >
        <div>
          <div className="flex items-start justify-between">
            <PanelLabel className="mb-0">Completion Rate</PanelLabel>
            <Percent className="size-4 text-gold-dim" aria-hidden />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="font-display text-3.5xl font-medium text-foreground leading-none tabular-nums">
              {Math.round(animRate)}%
            </p>
            {/* Elegant Circular Progress */}
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  className="stroke-accent/50"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c - c * animRingProgress}
                  className="stroke-gold transition-[stroke-dashoffset] duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-gold-soft font-display">
                {Math.round(animRate)}%
              </div>
            </div>
          </div>
        </div>
        <p className="text-[0.68rem] text-muted-foreground">Overall execution productivity.</p>
      </Panel>
    </section>
  );
}
