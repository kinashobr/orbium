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
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "shrink-0 select-none",
        isDragging && "scale-[1.03] shadow-2xl z-50 cursor-grabbing"
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