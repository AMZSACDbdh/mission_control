import { useState, type ComponentType } from "react";
import { Plus } from "lucide-react";
import { Mission, MissionCategory } from "@/data/missionsData";
import { BookIcon, KanbanIcon, LotusIcon, StoneIcon } from "./JapaneseIcons";
import { MissionCard } from "./MissionCard";

interface MissionsBoardProps {
  missions: Mission[];
  activeMissionId: string | null;
  setActiveMissionId: (id: string | null) => void;
  onEditMission: (mission: Mission) => void;
  onCompleteMission: (id: string) => void;
  onArchiveMission: (id: string) => void;
  onDuplicateMission: (mission: Mission) => void;
  onDeleteMission: (id: string) => void;
  onMoveMission: (id: string, targetCategory: MissionCategory) => void;
  onAddMission: (category: MissionCategory) => void;
}

// Names must come from the MissionCategory union in `data/missionsData`. These
// previously read "Academic", "Health" and "Growth" — labels from an earlier
// draft of the board that no longer exist as categories.
type CategoryIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const CATEGORIES: { name: MissionCategory; label: string; icon: CategoryIcon }[] = [
  { name: "Study", label: "Study", icon: BookIcon },
  { name: "Personal", label: "Personal", icon: LotusIcon },
  { name: "Fitness", label: "Fitness", icon: StoneIcon },
  { name: "Projects", label: "Projects", icon: KanbanIcon },
];

export function MissionsBoard({
  missions,
  activeMissionId,
  setActiveMissionId,
  onEditMission,
  onCompleteMission,
  onArchiveMission,
  onDuplicateMission,
  onDeleteMission,
  onMoveMission,
  onAddMission,
}: MissionsBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<MissionCategory | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, category: MissionCategory) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, category: MissionCategory) => {
    e.preventDefault();
    setDragOverColumn(category);
  };

  const handleDragLeave = (category: MissionCategory) => {
    if (dragOverColumn === category) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCategory: MissionCategory) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      onMoveMission(id, targetCategory);
    }
  };

  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 items-start select-none">
      {CATEGORIES.map((col) => {
        const colMissions = missions.filter((m) => m.category === col.name && !m.archived);
        const Icon = col.icon;
        const isDraggingOver = dragOverColumn === col.name;

        return (
          <div
            key={col.name}
            onDragOver={(e) => handleDragOver(e, col.name)}
            onDragEnter={(e) => handleDragEnter(e, col.name)}
            onDragLeave={() => handleDragLeave(col.name)}
            onDrop={(e) => handleDrop(e, col.name)}
            className={`flex flex-col gap-4 rounded-2xl border p-4.5 bg-surface/20 transition-all duration-300 min-h-[500px] ${
              isDraggingOver
                ? "border-gold bg-surface-raised/40 ring-1 ring-gold/25"
                : "border-border/60"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-border/45 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-surface border border-border/70 text-gold-dim">
                  <Icon className="size-4" />
                </div>
                <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
                  {col.label}
                </h3>
              </div>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface border border-border/70 px-1.5 text-[0.68rem] font-bold text-muted-foreground">
                {colMissions.length}
              </span>
            </div>

            {/* Column Body / Mission Cards */}
            <div className="flex flex-1 flex-col gap-3.5 min-h-[300px]">
              {colMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onClick={() => setActiveMissionId(mission.id)}
                  onEdit={() => onEditMission(mission)}
                  onComplete={() => onCompleteMission(mission.id)}
                  onArchive={() => onArchiveMission(mission.id)}
                  onDuplicate={() => onDuplicateMission(mission)}
                  onDelete={() => onDeleteMission(mission.id)}
                  onDragStart={handleDragStart}
                  isActive={activeMissionId === mission.id}
                />
              ))}

              {/* Drag highlight or Column Empty State */}
              {colMissions.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 p-6 text-center">
                  <svg
                    className="mx-auto size-12 text-muted-foreground/30 opacity-40 mb-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-[0.68rem] tracking-wider text-muted-foreground/70 uppercase">
                    Drag mission here
                    <br />
                    to add
                  </p>
                </div>
              )}
            </div>

            {/* Column Footer: Quick Add Button */}
            <button
              onClick={() => onAddMission(col.name)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 bg-transparent py-2.5 text-xs font-medium text-muted-foreground hover:bg-surface/50 hover:text-foreground hover:border-gold/30 transition-all duration-300 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Add Mission
            </button>
          </div>
        );
      })}
    </div>
  );
}
