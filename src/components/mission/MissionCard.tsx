import { useState, useRef, useEffect } from "react";
import {
  Clock,
  Calendar,
  ShieldCheck,
  MoreVertical,
  Edit,
  CheckSquare,
  Copy,
  Archive,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Mission, MissionPriority, calculateProgress } from "@/data/missionsData";

interface MissionCardProps {
  mission: Mission;
  onClick: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isActive: boolean;
}

export function MissionCard({
  mission,
  onClick,
  onEdit,
  onComplete,
  onArchive,
  onDuplicate,
  onDelete,
  onDragStart,
  isActive,
}: MissionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Priority Badge Styling
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

  // Date Formatting
  const getDueDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Circular progress specs
  const subtasksTotal = mission.checklist.length;
  const subtasksCompleted = mission.checklist.filter((s) => s.completed).length;
  const progressPercent =
    subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : mission.progress;

  const size = 32;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - c * (progressPercent / 100);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, mission.id)}
      className={`group relative flex flex-col justify-between rounded-xl border p-4.5 bg-surface/50 shadow-xs transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:bg-surface/85 cursor-grab active:cursor-grabbing select-none ${
        isActive
          ? "border-gold bg-surface-raised shadow-[0_4px_20px_-10px_rgba(198,162,94,0.2)]"
          : "border-border/60 hover:border-gold/30 hover:shadow-[0_8px_30px_-15px_rgba(0,0,0,0.85)]"
      }`}
      onClick={onClick}
    >
      {/* Red Japanese Seal stamp in corner */}
      <div className="absolute top-4.5 right-11 flex size-5 items-center justify-center rounded border border-red-900/40 bg-red-950/10 text-red-600 font-display text-[0.5rem] font-bold select-none pointer-events-none opacity-80 shadow-[0_0_8px_rgba(153,27,27,0.1)]">
        印
      </div>

      {/* Inline SVG Bamboo Ink Painting overlay (faded style) */}
      <svg
        className="absolute right-0 bottom-0 pointer-events-none select-none opacity-[0.08] text-gold-dim group-hover:opacity-[0.12] transition-opacity duration-500"
        width="65"
        height="65"
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden
      >
        <path d="M10,90 Q30,60 50,50 Q70,40 90,10 Q60,30 50,50 Q40,70 10,90 Z" />
        <path d="M40,55 Q55,45 70,30 Q50,40 40,55 Z" />
        <path d="M60,40 Q75,30 85,15 Q70,25 60,40 Z" />
        <path d="M25,70 Q40,60 50,45 Q35,55 25,70 Z" />
      </svg>

      {/* Upper Content */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1 min-w-0">
            <span
              className={`inline-flex rounded-md border px-2 py-0.5 text-[0.62rem] font-semibold tracking-wider uppercase ${getPriorityStyle(mission.priority)}`}
            >
              {mission.priority}
            </span>
            <h3 className="font-sans text-sm font-semibold tracking-wide text-foreground group-hover:text-gold-soft transition-colors duration-300 leading-snug line-clamp-2 pr-4">
              {mission.title}
            </h3>
          </div>

          {/* Action Button & Menu */}
          <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-raised hover:text-foreground border border-transparent hover:border-border/60 transition-all duration-300 cursor-pointer"
            >
              <MoreVertical className="size-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-border/80 bg-surface shadow-xl py-1 text-xs">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onComplete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors duration-200"
                >
                  <ShieldCheck className="size-3.5 text-gold-dim" />
                  {mission.completed ? "Re-open" : "Complete"}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors duration-200"
                >
                  <Edit className="size-3.5 text-muted-foreground" />
                  Edit details
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors duration-200"
                >
                  <Copy className="size-3.5 text-muted-foreground" />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors duration-200"
                >
                  <Archive className="size-3.5 text-muted-foreground" />
                  {mission.archived ? "Unarchive" : "Archive"}
                </button>
                <div className="my-1 border-t border-border/50" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors duration-200"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3 text-[0.68rem] text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-medium">
            <Clock className="size-3" />
            <span>
              {Math.floor(mission.durationMinutes / 60)}h{" "}
              {String(mission.durationMinutes % 60).padStart(2, "0")}m
            </span>
          </div>
          {mission.dueDate && (
            <div className="flex items-center gap-1 font-medium">
              <Calendar className="size-3" />
              <span
                className={
                  new Date(mission.dueDate) < new Date() && !mission.completed
                    ? "text-red-400/90 font-semibold"
                    : ""
                }
              >
                {getDueDateLabel(mission.dueDate)}
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Circular Progress */}
        <div className="flex items-center gap-2">
          <span className="font-display font-medium text-gold-dim">+{mission.xpReward} XP</span>
          <div className="relative size-8 shrink-0 select-none">
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                className="stroke-accent/40"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                className="stroke-gold transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[0.55rem] font-bold text-foreground font-display">
              {progressPercent}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
