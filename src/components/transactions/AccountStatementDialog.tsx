import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, TrendingUp, TrendingDown, 
  CheckCircle2, AlertTriangle, Download, RefreshCw, X, ArrowRight
} from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, AccountSummary, 
  formatCurrency, ACCOUNT_TYPE_LABELS, ComparisonDateRanges
} from "@/types/finance";
import { TransactionTable } from "./TransactionTable";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { cn, parseDateLocal } from "@/lib/utils";
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

interface AccountStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ContaCorrente;
  accountSummary: AccountSummary;
  transactions: TransacaoCompleta[];
  categories: Categoria[];
  onEditTransaction: (transaction: TransacaoCompleta) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onReconcileAll: () => void;
}

export function AccountStatementDialog({
  open,
  onOpenChange,
  account,
  accountSummary,
  transactions,
  categories,
  onEditTransaction,
  onDeleteTransaction,
  onToggleConciliated,
  onReconcileAll
}: AccountStatementDialogProps) {
  // Estado de data unificado com o padrão do sistema
  const [localDateRanges, setLocalDateRanges] = useState<ComparisonDateRanges>(() => ({
    range1: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    range2: { from: undefined, to: undefined }
  }));

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setLocalDateRanges(ranges);
  }, []);

  // Filtrar transações pelo range selecionado
  const filteredTransactions = useMemo(() => {
    const { from, to } = localDateRanges.range1;
    if (!from || !to) return transactions.sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());

    const rangeFrom = startOfDay(from);
    const rangeTo = endOfDay(to);

    return transactions
      .filter(t => {
        const transactionDate = parseDateLocal(t.date);
        return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
      })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
  }, [transactions, localDateRanges.range1]);

  const periodSummary = useMemo(() => {
    const conciliatedCount = filteredTransactions.filter(t => t.conciliated).length;
    const pendingCount = filteredTransactions.length - conciliatedCount;
    
    // Cálculo dinâmico baseado no filtro atual
    const totalIn = accountSummary.totalIn;
    const totalOut = accountSummary.totalOut;

    return {
      initialBalance: accountSummary.initialBalance, // Mantemos o inicial da conta ou poderíamos calcular retroativo
      finalBalance: accountSummary.currentBalance,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      conciliatedCount,
      pendingCount,
    };
  }, [accountSummary, filteredTransactions]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-[min(95vw,80rem)] h-[min(90vh,900px)] p-0 overflow-hidden flex flex-col rounded-[3rem] border-none shadow-2xl bg-background",
        "[&>button]:hidden" // Esconde o botão de fechar padrão do DialogContent
      )}>
        <DialogHeader className="px-8 pt-10 pb-6 border-b shrink-0 bg-primary/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-black tracking-tight truncate">{account.name}</DialogTitle>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-muted/50 border-none h-5">{ACCOUNT_TYPE_LABELS[account.accountType]}</Badge>
                  {account.institution && <span className="truncate opacity-60">• {account.institution}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onReconcileAll} className="h-9 rounded-full text-xs font-bold gap-2 px-4 border-border/40 bg-card/50">
                <RefreshCw className="w-3.5 h-3.5" />
                Conciliar
              </Button>
              <Button variant="outline" size="sm" className="h-9 rounded-full text-xs font-bold gap-2 px-4 border-border/40 bg-card/50">
                <Download className="w-3.5 h-3.5" />
                Exportar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9 rounded-full hover:bg-black/5 transition-colors">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 hide-scrollbar-mobile">
          <div className="p-6 space-y-6">
            {/* Barra de Status e Filtro Unificada (Ocupa menos espaço vertical) */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card p-4 rounded-[2rem] border border-border/40 shadow-sm">
              <div className="flex items-center gap-4 px-2">
                <div className={cn("flex items-center gap-2", statusColor)}>
                  {periodSummary.pendingCount === 0 ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <span className="font-black text-[11px] uppercase tracking-widest">
                    {periodSummary.pendingCount === 0 
                      ? "Conciliado" 
                      : `${periodSummary.pendingCount} PENDENTES`}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4 bg-border/50" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                  {periodSummary.conciliatedCount}/{filteredTransactions.length} itens
                </span>
                <Separator orientation="vertical" className="h-4 bg-border/50" />
                <Badge variant="outline" className={cn(
                  "font-black text-[11px] px-3 py-0.5 rounded-lg border-none",
                  periodSummary.netChange >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {periodSummary.netChange >= 0 ? "+" : ""}{formatCurrency(periodSummary.netChange)}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <PeriodSelector 
                  initialRanges={localDateRanges}
                  onDateRangeChange={handlePeriodChange}
                  className="h-9 rounded-xl bg-muted/30 border-none text-xs font-bold"
                />
              </div>
            </div>

            {/* Resumo de Saldos Compacto */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-muted/20 border border-border/40">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Inicial</p>
                <p className="text-sm font-black tabular-nums">{formatCurrency(periodSummary.initialBalance)}</p>
              </div>
              
              <div className="p-3 rounded-2xl bg-success/[0.03] border border-success/20">
                <p className="text-[9px] font-black text-success uppercase tracking-widest mb-0.5">Entradas</p>
                <p className="text-sm font-black text-success tabular-nums">+{formatCurrency(periodSummary.totalIn)}</p>
              </div>

              <div className="p-3 rounded-2xl bg-destructive/[0.03] border border-destructive/20">
                <p className="text-[9px] font-black text-destructive uppercase tracking-widest mb-0.5">Saídas</p>
                <p className="text-sm font-black text-destructive tabular-nums">-{formatCurrency(periodSummary.totalOut)}</p>
              </div>

              <div className="p-3 rounded-2xl bg-primary/[0.03] border border-primary/20">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">Final</p>
                <p className="text-sm font-black text-primary tabular-nums">{formatCurrency(periodSummary.finalBalance)}</p>
              </div>
            </div>

            {/* Tabela de Transações */}
            <div className="glass-card p-0 rounded-[2rem] overflow-hidden">
              <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Movimentações Detalhadas</h3>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground opacity-50 uppercase">{filteredTransactions.length} registros</span>
              </div>
              <div className="overflow-x-auto px-0 pb-6">
                <div className="min-w-[900px] px-6">
                  <TransactionTable
                    transactions={filteredTransactions}
                    accounts={[account]}
                    categories={categories}
                    onEdit={onEditTransaction}
                    onDelete={onDeleteTransaction}
                    onToggleConciliated={onToggleConciliated}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}