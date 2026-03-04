import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Clock, AlertTriangle, Ban, ArrowDownCircle, 
  MoreHorizontal, FileCheck, Percent
} from "lucide-react";
import { 
  FutureIncome, IncomeSettlement, IncomeStatus, 
  INCOME_STATUS_LABELS, INCOME_SOURCE_TYPE_LABELS, 
  INCOME_FINANCIAL_NATURE_LABELS, formatCurrency 
} from "@/types/finance";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";
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

interface IncomeReceivableCardProps {
  income: FutureIncome;
  settlements: IncomeSettlement[];
  onMarkCobrado?: () => void;
  onReceiveTotal?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function IncomeReceivableCard({ 
  income, settlements, onMarkCobrado, onReceiveTotal, onEdit, onDelete 
}: IncomeReceivableCardProps) {
  const statusConfig = STATUS_CONFIG[income.status];
  const StatusIcon = statusConfig.icon;

  const totalReceived = useMemo(() => 
    settlements.reduce((acc, s) => acc + s.receivedAmount, 0), 
    [settlements]
  );

  const remainingAmount = income.netExpectedAmount - totalReceived;
  const isActionable = income.status !== 'recebido' && income.status !== 'cancelado';

  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all group",
      income.status === 'cancelado' ? "opacity-50 border-border/30" : "border-border/50 hover:border-border",
      statusConfig.bg
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm", statusConfig.bg)}>
            <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{income.description}</p>
            {income.counterparty && (
              <p className="text-[10px] text-muted-foreground truncate">{income.counterparty}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4">
                {INCOME_SOURCE_TYPE_LABELS[income.sourceType]}
              </Badge>
              {income.financialNature !== 'receita' && (
                <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4">
                  {INCOME_FINANCIAL_NATURE_LABELS[income.financialNature]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <p className={cn("text-sm font-black tabular-nums", statusConfig.color)}>
            {formatCurrency(income.netExpectedAmount)}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {format(parseDateLocal(income.expectedDueDate), 'dd/MM')}
          </p>
          {totalReceived > 0 && remainingAmount > 0 && (
            <p className="text-[8px] font-bold text-warning">
              Falta: {formatCurrency(remainingAmount)}
            </p>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              income.confidence >= 80 ? "bg-success" : income.confidence >= 50 ? "bg-warning" : "bg-destructive/60"
            )}
            style={{ width: `${income.confidence}%` }}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Percent className="w-2.5 h-2.5 text-muted-foreground/50" />
          <span className="text-[8px] font-black text-muted-foreground/60 tabular-nums">{income.confidence}</span>
        </div>
      </div>

      {/* Actions */}
      {isActionable && (
        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {income.status === 'previsto' && onMarkCobrado && (
            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-wider gap-1 px-2" onClick={onMarkCobrado}>
              <FileCheck className="w-3 h-3" /> Cobrado
            </Button>
          )}
          {onReceiveTotal && (
            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-wider gap-1 px-2 text-success hover:text-success" onClick={onReceiveTotal}>
              <CheckCircle2 className="w-3 h-3" /> Receber Total
            </Button>
          )}
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem className="text-destructive" onClick={onDelete}>Excluir</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
