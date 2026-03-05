import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Clock, AlertTriangle, Ban, ArrowDownCircle, 
  MoreHorizontal, FileCheck, Percent, ChevronDown, ChevronUp,
  History, AlertCircle, Landmark
} from "lucide-react";
import { 
  FutureIncome, IncomeSettlement, IncomeEvent, IncomeStatus, 
  INCOME_STATUS_LABELS, INCOME_SOURCE_TYPE_LABELS, 
  INCOME_FINANCIAL_NATURE_LABELS, INCOME_EVENT_TYPE_LABELS,
  INCOME_SETTLEMENT_METHOD_LABELS,
  formatCurrency, isOperationalIncome
} from "@/types/finance";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STATUS_CONFIG: Record<IncomeStatus, { icon: React.ElementType; color: string; bg: string }> = {
  previsto: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
  cobrado_ou_faturado: { icon: FileCheck, color: "text-primary", bg: "bg-primary/10" },
  recebido_parcial: { icon: ArrowDownCircle, color: "text-warning", bg: "bg-warning/10" },
  recebido: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  atrasado: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  renegociado: { icon: Clock, color: "text-accent-foreground", bg: "bg-accent/10" },
  cancelado: { icon: Ban, color: "text-muted-foreground/50", bg: "bg-muted/30" },
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
}

export function IncomeReceivableCard({ 
  income, settlements, events, onMarkCobrado, onReceiveTotal, onReceivePartial, onEdit, onDelete 
}: IncomeReceivableCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[income.status];
  const StatusIcon = statusConfig.icon;

  const totalReceived = useMemo(() => 
    settlements.reduce((acc, s) => acc + s.receivedAmount, 0), 
    [settlements]
  );

  const remainingAmount = income.netExpectedAmount - totalReceived;
  const isActionable = income.status !== 'recebido' && income.status !== 'cancelado';
  const isNonOperational = !isOperationalIncome(income);
  const isInformal = income.sourceType === 'informal' && !income.notes;
  const hasLiability = income.requiresLiabilityTracking;

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), 
    [events]
  );

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
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4">
                {INCOME_SOURCE_TYPE_LABELS[income.sourceType]}
              </Badge>
              {isNonOperational && (
                <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {INCOME_FINANCIAL_NATURE_LABELS[income.financialNature]}
                </Badge>
              )}
              {isInformal && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="text-[7px] font-black uppercase tracking-wider px-1 py-0 h-3.5 gap-0.5">
                      <AlertCircle className="w-2 h-2" /> Pendência
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="z-[160]">
                    <p className="text-xs">Entrada informal sem observação/nota preenchida</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasLiability && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-[7px] font-black uppercase tracking-wider px-1 py-0 h-3.5 gap-0.5 border-orange-500/30 text-orange-600">
                      <Landmark className="w-2 h-2" /> Passivo
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="z-[160]">
                    <p className="text-xs">Esta entrada gera obrigação futura (passivo)</p>
                  </TooltipContent>
                </Tooltip>
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
          {onReceivePartial && (
            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-wider gap-1 px-2 text-warning hover:text-warning" onClick={onReceivePartial}>
              <ArrowDownCircle className="w-3 h-3" /> Parcial
            </Button>
          )}
          {onReceiveTotal && (
            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-wider gap-1 px-2 text-success hover:text-success" onClick={onReceiveTotal}>
              <CheckCircle2 className="w-3 h-3" /> Total
            </Button>
          )}
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[140]">
              {onEdit && <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem className="text-destructive" onClick={onDelete}>Excluir</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* History section */}
      {(sortedEvents.length > 0 || settlements.length > 0) && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2 h-6 text-[8px] font-black uppercase tracking-widest gap-1 text-muted-foreground hover:text-foreground">
              <History className="w-3 h-3" /> Histórico ({sortedEvents.length})
              {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {/* Settlements */}
            {settlements.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Recebimentos</p>
                {settlements.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-success/5 border border-success/10 text-[9px]">
                    <div>
                      <span className="font-black text-success">{formatCurrency(s.receivedAmount)}</span>
                      <span className="text-muted-foreground ml-2">{format(parseDateLocal(s.receivedDate), 'dd/MM/yy')}</span>
                      {s.method && (
                        <Badge variant="outline" className="ml-1.5 text-[7px] px-1 py-0 h-3.5">
                          {INCOME_SETTLEMENT_METHOD_LABELS[s.method]}
                        </Badge>
                      )}
                    </div>
                    {s.transactionId && (
                      <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 text-primary">Vinculado</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Events timeline */}
            {sortedEvents.length > 0 && (
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Eventos</p>
                {sortedEvents.slice(0, 10).map(event => {
                  const EventIcon = EVENT_ICONS[event.type] || Clock;
                  return (
                    <div key={event.id} className="flex items-start gap-2 py-1 text-[9px]">
                      <EventIcon className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-muted-foreground">{INCOME_EVENT_TYPE_LABELS[event.type]}</span>
                        <span className="text-muted-foreground/60 ml-1.5">{event.details}</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground/40 shrink-0 tabular-nums">
                        {format(new Date(event.timestamp), 'dd/MM HH:mm')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
