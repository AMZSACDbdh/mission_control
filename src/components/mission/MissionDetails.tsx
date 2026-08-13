import { useState } from "react";
import {
  Clock,
  Calendar,
  Sparkles,
  Trophy,
  AlertCircle,
  Paperclip,
  History,
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Play,
  CheckCircle,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { Mission, MissionPriority, SubTask } from "@/data/missionsData";
import { ProgressBar } from "./ProgressBar";

interface MissionDetailsProps {
  mission: Mission;
  onClose: () => void;
  onEdit: () => void;
  onToggleSubtask: (missionId: string, subtaskId: string) => void;
  onAddSubtask: (missionId: string, title: string) => void;
  onDeleteSubtask: (missionId: string, subtaskId: string) => void;
  onUpdateNotes: (missionId: string, notes: string) => void;
  onComplete: () => void;
  onDelete: () => void;
  onStartFocus?: (mission: Mission) => void;
}

export function MissionDetails({
  mission,
  onClose,
  onEdit,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onUpdateNotes,
  onComplete,
  onDelete,
  onStartFocus,
}: MissionDetailsProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [notesText, setNotesText] = useState(mission.notes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Math for subtasks
  const subtasksTotal = mission.checklist.length;
  const subtasksCompleted = mission.checklist.filter((s) => s.completed).length;
  const progressPercent =
    subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : mission.progress;

  const getPriorityStyle = (priority: MissionPriority) => {
    switch (priority) {
      case "High":
        return "bg-red-950/30 text-red-400 border border-red-900/40";
      case "Medium":
        return "bg-amber-950/30 text-amber-400 border border-amber-900/40";
      case "Low":
        return "bg-slate-900/30 text-slate-400 border border-slate-800/40";
    }
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(mission.id, newSubtaskTitle.trim());
    setNewSubtaskTitle("");
  };

  const handleSaveNotes = () => {
    onUpdateNotes(mission.id, notesText);
    setIsEditingNotes(false);
  };

  return (
    <aside className="w-full xl:w-[420px] shrink-0 border border-border/70 rounded-2xl bg-surface/40 overflow-y-auto max-h-[calc(100vh-200px)] shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex flex-col justify-between">
      {/* Header Bar */}
      <div className="p-5 border-b border-border/50 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground tracking-wider uppercase font-semibold transition-colors duration-200 cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          Back to Missions
        </button>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg border border-border/60 hover:bg-surface-raised hover:text-foreground text-xs px-2.5 py-1 text-muted-foreground transition-all duration-200 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-950/50 hover:bg-red-950/20 text-xs px-2.5 py-1 text-red-400 transition-all duration-200 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main Metadata Panel */}
      <div className="p-6 flex-1 space-y-6">
        {/* Title and Category */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[0.62rem] font-bold tracking-widest uppercase ${getPriorityStyle(
                mission.priority,
              )}`}
            >
              {mission.priority} Priority
            </span>
            {mission.completed && (
              <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[0.62rem] font-bold tracking-widest uppercase">
                Completed
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight text-foreground">
            {mission.title}
          </h2>
          <p className="text-xs text-gold-dim font-medium tracking-wide">
            {mission.category} / Campaign
          </p>
        </div>

        {/* Description */}
        {mission.description && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
              <AlignLeft className="size-3.5" />
              Description
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-sans bg-background/30 rounded-xl border border-border/40 p-3.5">
              {mission.description}
            </p>
          </div>
        )}

        {/* Meta Grid (Due, Duration, XP, Discipline) */}
        <div className="grid grid-cols-2 gap-3.5 text-xs border-y border-border/40 py-5">
          <div className="flex items-center gap-3">
            <Calendar className="size-4.5 text-gold-dim" />
            <div>
              <p className="text-[0.6rem] tracking-wider text-muted-foreground uppercase font-bold">
                Due Date
              </p>
              <p className="font-medium text-foreground">
                {mission.dueDate
                  ? new Date(mission.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "None"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="size-4.5 text-gold-dim" />
            <div>
              <p className="text-[0.6rem] tracking-wider text-muted-foreground uppercase font-bold">
                Estimated Time
              </p>
              <p className="font-medium text-foreground">
                {Math.floor(mission.durationMinutes / 60)}h{" "}
                {String(mission.durationMinutes % 60).padStart(2, "0")}m
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <Sparkles className="size-4.5 text-gold-dim" />
            <div>
              <p className="text-[0.6rem] tracking-wider text-muted-foreground uppercase font-bold">
                XP Reward
              </p>
              <p className="font-display font-medium text-gold">+{mission.xpReward} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <Trophy className="size-4.5 text-gold-dim" />
            <div>
              <p className="text-[0.6rem] tracking-wider text-muted-foreground uppercase font-bold">
                Discipline
              </p>
              <p className="font-display font-medium text-gold-soft">
                +{mission.disciplineReward} Discipline
              </p>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
              Progress
            </span>
            <span className="font-display text-gold-soft">{progressPercent}%</span>
          </div>
          <ProgressBar value={progressPercent} className="h-2" />
          {subtasksTotal > 0 && (
            <p className="text-[0.65rem] text-muted-foreground text-right">
              {subtasksCompleted} of {subtasksTotal} subtasks completed
            </p>
          )}
        </div>

        {/* Checklist / Subtasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
            <CheckCircle className="size-3.5" />
            Subtasks
          </div>
          <div className="space-y-2">
            {mission.checklist.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center justify-between group/task rounded-lg border border-border/40 bg-background/20 p-2.5 hover:border-gold/20 transition-all duration-200"
              >
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => onToggleSubtask(mission.id, subtask.id)}
                    className="size-4 rounded border-border bg-surface text-gold focus:ring-gold focus:ring-offset-background cursor-pointer accent-gold"
                  />
                  <span
                    className={`text-xs text-foreground/80 leading-tight font-sans transition-all duration-200 select-none ${
                      subtask.completed ? "line-through text-muted-foreground/60" : ""
                    }`}
                  >
                    {subtask.title}
                  </span>
                </label>
                <button
                  onClick={() => onDeleteSubtask(mission.id, subtask.id)}
                  className="opacity-0 group-hover/task:opacity-100 size-6 flex items-center justify-center rounded text-muted-foreground hover:bg-red-950/20 hover:text-red-400 transition-all cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 h-8.5 rounded-xl border border-border/60 bg-surface/50 px-3 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200"
              />
              <button
                type="submit"
                className="flex size-8.5 items-center justify-center rounded-xl bg-gold/90 hover:bg-gold text-primary-foreground font-bold shadow-sm transition-all duration-200 cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
            <Paperclip className="size-3.5" />
            Attachments
          </div>
          {mission.attachments && mission.attachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {mission.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/25 p-2 text-[0.68rem] text-muted-foreground hover:bg-surface/50 hover:text-foreground hover:border-gold/30 transition-all duration-200"
                >
                  <FileText className="size-3.5 text-gold-dim shrink-0" />
                  <span className="truncate">{att.name}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-[0.68rem] text-muted-foreground/60 italic pl-1">No attachments</p>
          )}
        </div>

        {/* Notes Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
            <span>Notes</span>
            {!isEditingNotes ? (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-[0.6rem] text-gold-dim hover:text-gold uppercase tracking-wider font-semibold cursor-pointer"
              >
                Edit Notes
              </button>
            ) : (
              <button
                onClick={handleSaveNotes}
                className="text-[0.6rem] text-gold hover:text-gold-soft uppercase tracking-wider font-semibold cursor-pointer"
              >
                Save
              </button>
            )}
          </div>
          {!isEditingNotes ? (
            <div className="min-h-16 text-xs text-foreground/85 bg-background/20 rounded-xl border border-border/45 p-3.5 font-sans whitespace-pre-wrap">
              {mission.notes || (
                <span className="text-muted-foreground/50 italic">
                  No notes written yet. Click Edit Notes to write.
                </span>
              )}
            </div>
          ) : (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full min-h-24 rounded-xl border border-border bg-surface/50 p-3 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200 font-sans"
              placeholder="Write thoughts, criteria, reminders..."
            />
          )}
        </div>

        {/* Mission History */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[0.65rem] tracking-wider text-muted-foreground uppercase font-bold">
            <History className="size-3.5" />
            Mission History
          </div>
          {mission.history && mission.history.length > 0 ? (
            <div className="relative border-l border-border/40 pl-3.5 ml-1.5 space-y-3.5 pb-2 text-[0.68rem]">
              {mission.history.map((log, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[19.5px] top-1.5 size-2 rounded-full border border-border bg-background" />
                  <p className="text-foreground/90 font-medium">{log.action}</p>
                  <p className="text-[0.58rem] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[0.68rem] text-muted-foreground/60 italic pl-1">No logs recorded</p>
          )}
        </div>
      </div>

      {/* Persistent Bottom Actions */}
      <div className="p-5 border-t border-border/50 space-y-2.5 bg-surface/60">
        <button
          onClick={() => onStartFocus?.(mission)}
          disabled={mission.completed}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold/90 hover:bg-gold disabled:bg-surface-raised disabled:text-muted-foreground/40 disabled:border disabled:border-border/40 disabled:cursor-not-allowed text-primary-foreground font-semibold py-2.5 text-xs tracking-wider uppercase shadow-[0_2px_10px_rgba(198,162,94,0.15)] transition-all duration-300 active:scale-[0.98] cursor-pointer"
        >
          <Play className="size-3.5 fill-current" />
          Continue Mission
        </button>
        <button
          onClick={onComplete}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 hover:bg-surface-raised hover:text-foreground text-muted-foreground py-2 text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer"
        >
          <CheckCircle className="size-3.5" />
          {mission.completed ? "Re-open Mission" : "Complete Mission"}
        </button>
      </div>
    </aside>
  );
}
