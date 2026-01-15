import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AccountCard } from "./AccountCard";
import { AccountSummary } from "@/types/finance";
import { cn } from "@/lib/utils";

interface SortableAccountCardProps {
  summary: AccountSummary;
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onEdit?: (accountId: string) => void;
  onImport?: (accountId: string) => void;
}

export function SortableAccountCard({
  summary,
  onMovimentar,
  onViewHistory,
  onEdit,
  onImport,
}: SortableAccountCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: summary.accountId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    // touch-action: none é necessário apenas durante o drag, 
    // mas o dnd-kit gerencia isso através dos sensores configurados.
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "shrink-0 transition-all duration-300 ease-out",
        "animate-fade-in",
        isDragging && "scale-[1.05] shadow-2xl"
      )}
      {...attributes}
      {...listeners}
    >
      <AccountCard
        summary={summary}
        onMovimentar={onMovimentar}
        onViewHistory={onViewHistory}
        onEdit={onEdit}
        onImport={onImport}
      />
    </div>
  );
}