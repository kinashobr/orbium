import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Clock, AlertTriangle, Ban, ArrowDownCircle, 
  MoreHorizontal, FileCheck,
  Landmark, Briefcase, ShoppingBag, HandCoins, Zap
} from "lucide-react";
import { 
  FutureIncome, IncomeSettlement, IncomeEvent, IncomeStatus, 
  INCOME_STATUS_LABELS,
  formatCurrency 
} from "@/types/finance";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<IncomeStatus, { icon: React.ElementType; color: string; bg: string }> = {
  previsto: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
  cobrado_ou_faturado: { icon: FileCheck, color: "text-primary", bg: "bg-primary/10" },
  recebido_parcial: { icon: ArrowDownCircle, color: "text-warning", bg: "bg-warning/10" },
  recebido: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  atrasado: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  renegociado: { icon: Clock, color: "text-accent-foreground", bg: "bg-accent/10" },
  cancelado: { icon: Ban, color: "text-muted-foreground/50", bg: "bg-muted/30" },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  clt: Briefcase,
  freelance: Zap,
  sales: ShoppingBag,
  loan: HandCoins,
  generic: Landmark,
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  created: CheckCircle2,
  status_changed: ArrowDownCircle,
  settlement_added: CheckCircle2,
  settlement_removed: Ban,
  edited: FileCheck,
  renegotiated: Clock,
  cancelled: Ban,
};

interface IncomeReceivableCardProps {
  income: FutureIncome;
  settlements: IncomeSettlement[];
  events: IncomeEvent[];
  onMarkCobrado?: () => void;
  onReceiveTotal?: () => void;
  onReceivePartial?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenCockpit?: () => void;
}

export function IncomeReceivableCard({ 
  income, settlements, events, onMarkCobrado, onReceiveTotal, onReceivePartial, onEdit, onDelete, onOpenCockpit
}: IncomeReceivableCardProps) {
  const { categoriasV2 } = useFinance();
  const statusConfig = STATUS_CONFIG[income.status];
  const StatusIcon = statusConfig.icon;
  const TypeIcon = TYPE_ICONS[income.specificType] || Landmark;

  const category = useMemo(() => 
    categoriasV2.find(c => c.id === income.categoryId),
    [categoriasV2, income.categoryId]
  );

  const totalReceived = useMemo(() => 
    settlements.reduce((acc, s) => acc + s.receivedAmount, 0), 
    [settlements]
  );

  const remainingAmount = income.netExpectedAmount - totalReceived;
  const isActionable = income.status !== 'recebido' && income.status !== 'cancelado';

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), 
    [events]
  );

  return (
    <div 
      className={cn(
        "p-4 rounded-2xl border transition-all group",
        income.status === 'cancelado' ? "opacity-50 border-border/30" : "border-border/50 hover:border-border",
        statusConfig.bg,
        income.specificType === 'clt' && "cursor-pointer hover:ring-2 hover:ring-primary/20"
      )}
      onClick={() => income.specificType === 'clt' && onOpenCockpit?.()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105", statusConfig.bg)}>
            <TypeIcon className={cn("w-4 h-4", statusConfig.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black truncate">{income.description}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0 h-3.5 bg-background/50 border-border/30">
                {category ? `${category.icon} ${category.label}` : 'Sem Categoria'}
              </Badge>
              <Badge variant="outline" className={cn("text-[7px] font-black uppercase tracking-wider px-1.5 py-0 h-3.5", statusConfig.color, "border-current/20")}>
                {INCOME_STATUS_LABELS[income.status]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
          <p className={cn("text-sm font-black tabular-nums tracking-tight", statusConfig.color)}>
            {formatCurrency(income.netExpectedAmount)}
          </p>
          <p className="text-[9px] font-bold text-muted-foreground tabular-nums">
            {format(parseDateLocal(income.expectedReceiptDate), 'dd/MM')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {isActionable ? (
          <>
            {income.status === 'previsto' && onMarkCobrado && (income.specificType === 'freelance' || income.specificType === 'sales' || income.specificType === 'generic') && (
              <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase tracking-wider gap-1 px-2.5 rounded-lg border-primary/20 hover:bg-primary/5" onClick={onMarkCobrado}>
                <FileCheck className="w-3 h-3" /> Cobrado
              </Button>
            )}
            {onReceivePartial && (
              <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase tracking-wider gap-1 px-2.5 rounded-lg border-warning/20 text-warning hover:bg-warning/5" onClick={onReceivePartial}>
                <ArrowDownCircle className="w-3 h-3" /> Parcial
              </Button>
            )}
            {onReceiveTotal && (
              <Button variant="default" size="sm" className="h-7 text-[8px] font-black uppercase tracking-wider gap-1 px-2.5 rounded-lg bg-success hover:bg-success/90 text-success-foreground" onClick={onReceiveTotal}>
                <CheckCircle2 className="w-3 h-3" /> Total
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase tracking-wider gap-1 px-2.5 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/5" onClick={onDelete}>
              <Ban className="w-3 h-3" /> Desfazer
            </Button>
          </div>
        )}
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[140] rounded-xl">
            {onEdit && <DropdownMenuItem onClick={onEdit} className="text-[10px] font-bold uppercase tracking-widest">Editar</DropdownMenuItem>}
            {onDelete && <DropdownMenuItem className="text-destructive text-[10px] font-bold uppercase tracking-widest" onSelect={(e) => { e.preventDefault(); onDelete(); }}>Excluir</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* History section removed as per user request */}
    </div>
  );
}
