import { useState, useEffect } from "react";
import { X, Sparkles, Trophy, Calendar, Clock, AlertCircle } from "lucide-react";
import { Mission, MissionPriority, MissionCategory } from "@/data/missionsData";

interface MissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (missionData: Partial<Mission>) => void;
  mission?: Mission | null; // If provided, we are editing
  defaultCategory?: MissionCategory;
}

export function MissionDialog({
  isOpen,
  onClose,
  onSave,
  mission,
  defaultCategory,
}: MissionDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MissionCategory>("Study");
  const [priority, setPriority] = useState<MissionPriority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(30);
  const [xpReward, setXpReward] = useState(150);
  const [disciplineReward, setDisciplineReward] = useState(2);

  // Initialize form fields when editing or opening
  useEffect(() => {
    if (mission) {
      setTitle(mission.title);
      setDescription(mission.description);
      setCategory(mission.category);
      setPriority(mission.priority);
      setDueDate(mission.dueDate ?? "");
      setHours(Math.floor(mission.durationMinutes / 60));
      setMinutes(mission.durationMinutes % 60);
      setXpReward(mission.xpReward);
      setDisciplineReward(mission.disciplineReward);
    } else {
      setTitle("");
      setDescription("");
      setCategory(defaultCategory || "Study");
      setPriority("Medium");
      setDueDate(new Date().toISOString().slice(0, 10));
      setHours(1);
      setMinutes(30);
      setXpReward(150);
      setDisciplineReward(2);
    }
  }, [mission, isOpen, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const durationMinutes = hours * 60 + minutes;

    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      dueDate,
      durationMinutes,
      xpReward: Number(xpReward),
      disciplineReward: Number(disciplineReward),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      {/* Modal Box */}
      <div className="texture-paper relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-rise">
        {/* Top header */}
        <div className="p-5 border-b border-border/60 flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-surface border border-border/70 text-gold-dim">
              <Sparkles className="size-4" />
            </div>
            <h3 className="font-display text-lg font-medium text-foreground tracking-wide">
              {mission ? "Edit Mission Dossier" : "Draft New Mission"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-raised hover:text-foreground border border-transparent hover:border-border/60 transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Mission Title */}
          <div className="space-y-1.5">
            <label className="text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
              Mission Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Advanced SVM Proofs"
              className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-3.5 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
              Description / Directives
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline specific objectives, constraints, or references..."
              className="w-full min-h-16 rounded-xl border border-border/60 bg-surface/50 p-3.5 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200 font-sans"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MissionCategory)}
                className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-3 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200 cursor-pointer"
              >
                <option value="Study">Academic</option>
                <option value="Personal">Personal</option>
                <option value="Health">Health</option>
                <option value="Growth">Growth</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MissionPriority)}
                className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-3 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200 cursor-pointer"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Due Date & Estimated Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
                <Calendar className="size-3 text-gold-dim" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-3 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200 cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
                <Clock className="size-3 text-gold-dim" />
                Estimated Duration
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
                    className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-2 text-center text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200"
                  />
                  <span className="text-[0.68rem] text-muted-foreground font-semibold">hr</span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-2 text-center text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200"
                  />
                  <span className="text-[0.68rem] text-muted-foreground font-semibold">min</span>
                </div>
              </div>
            </div>
          </div>

          {/* XP & Discipline Rewards */}
          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
                <Sparkles className="size-3 text-gold-dim" />
                XP Reward
              </label>
              <input
                type="number"
                min={10}
                max={2000}
                value={xpReward}
                onChange={(e) => setXpReward(Math.max(10, Number(e.target.value)))}
                className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-3.5 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[0.62rem] tracking-wider text-muted-foreground uppercase font-bold">
                <Trophy className="size-3 text-gold-dim" />
                Discipline Reward
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={disciplineReward}
                onChange={(e) => setDisciplineReward(Math.max(1, Number(e.target.value)))}
                className="w-full h-10 rounded-xl border border-border/60 bg-surface/50 px-3.5 text-xs text-foreground focus:border-gold/45 focus:outline-hidden transition-all duration-200"
              />
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-border/60 hover:bg-surface-raised hover:text-foreground text-muted-foreground px-5 text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-xl bg-gold/90 hover:bg-gold text-primary-foreground font-semibold px-5 text-xs tracking-wider uppercase shadow-[0_2px_8px_rgba(198,162,94,0.15)] transition-all duration-200 cursor-pointer"
            >
              {mission ? "Save Changes" : "Deploy Mission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
