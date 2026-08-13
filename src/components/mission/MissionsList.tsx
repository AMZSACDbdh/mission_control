import {
  Clock,
  Calendar,
  CheckSquare,
  ShieldCheck,
  Trash2,
  Archive,
  Play,
  AlertCircle,
} from "lucide-react";
import { Mission, MissionPriority, MissionCategory } from "@/data/missionsData";
import { ProgressBar } from "./ProgressBar";

interface MissionsListProps {
  missions: Mission[];
  activeMissionId: string | null;
  setActiveMissionId: (id: string | null) => void;
  onCompleteMission: (id: string) => void;
  onArchiveMission: (id: string) => void;
  onDeleteMission: (id: string) => void;
}

export function MissionsList({
  missions,
  activeMissionId,
  setActiveMissionId,
  onCompleteMission,
  onArchiveMission,
  onDeleteMission,
}: MissionsListProps) {
  const getPriorityStyle = (priority: MissionPriority) => {
    switch (priority) {
      case "High":
        return "border-red-900/30 bg-red-950/20 text-red-400";
      case "Medium":
        return "border-amber-900/30 bg-amber-950/20 text-amber-400";
      case "Low":
        return "border-slate-800/40 bg-slate-900/20 text-slate-400";
    }
  };

  const getDueDateLabel = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Filter out archived for normal list view
  const activeMissions = missions.filter((m) => !m.archived);

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/20 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-surface/40 text-[0.68rem] font-bold tracking-widest text-gold-dim uppercase">
              <th className="p-4 lg:pl-6">Mission</th>
              <th className="p-4">Category</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Duration</th>
              <th className="p-4 w-48">Progress</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {activeMissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No active missions found.
                </td>
              </tr>
            ) : (
              activeMissions.map((mission) => {
                const subtasksTotal = mission.checklist.length;
                const subtasksCompleted = mission.checklist.filter((s) => s.completed).length;
                const progressPercent =
                  subtasksTotal > 0
                    ? Math.round((subtasksCompleted / subtasksTotal) * 100)
                    : mission.progress;
                const isPastDue =
                  mission.dueDate && new Date(mission.dueDate) < new Date() && !mission.completed;
                const isSelected = activeMissionId === mission.id;

                return (
                  <tr
                    key={mission.id}
                    onClick={() => setActiveMissionId(mission.id)}
                    className={`group transition-all duration-200 cursor-pointer ${
                      isSelected ? "bg-surface-raised/80" : "hover:bg-surface/50"
                    }`}
                  >
                    <td className="p-4 lg:pl-6 font-medium text-foreground group-hover:text-gold-soft transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-2 shrink-0 rounded-full ${mission.completed ? "bg-emerald-500" : "bg-gold-dim animate-pulse"}`}
                        />
                        <span
                          className={mission.completed ? "line-through text-muted-foreground" : ""}
                        >
                          {mission.title}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className="rounded-md bg-background/50 border border-border/50 px-2 py-1 uppercase text-[0.6rem] tracking-wider font-semibold">
                        {mission.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider uppercase ${getPriorityStyle(mission.priority)}`}
                      >
                        {mission.priority}
                      </span>
                    </td>
                    <td
                      className={`p-4 font-medium ${isPastDue ? "text-red-400 font-semibold" : "text-muted-foreground"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {getDueDateLabel(mission.dueDate)}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {Math.floor(mission.durationMinutes / 60)}h{" "}
                        {String(mission.durationMinutes % 60).padStart(2, "0")}m
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={progressPercent} className="w-28" />
                        <span className="text-[0.68rem] font-semibold text-foreground w-8 text-right font-display tabular-nums">
                          {progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5 opacity-65 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => onCompleteMission(mission.id)}
                          title={mission.completed ? "Re-open mission" : "Complete mission"}
                          className="flex size-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-surface/80 hover:text-foreground hover:border-gold/30 transition-all duration-200 cursor-pointer"
                        >
                          <ShieldCheck
                            className={`size-4 ${mission.completed ? "text-emerald-500" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => onArchiveMission(mission.id)}
                          title="Archive mission"
                          className="flex size-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-surface/80 hover:text-foreground hover:border-gold/30 transition-all duration-200 cursor-pointer"
                        >
                          <Archive className="size-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMission(mission.id)}
                          title="Delete mission"
                          className="flex size-7 items-center justify-center rounded-lg border border-border/60 text-red-400/80 hover:bg-red-950/20 hover:text-red-300 hover:border-red-900/30 transition-all duration-200 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
