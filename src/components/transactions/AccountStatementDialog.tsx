import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, TrendingUp, TrendingDown, 
  CheckCircle2, AlertTriangle, Download, RefreshCw, X, ArrowRight, ArrowLeft
} from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, AccountSummary, 
  formatCurrency, ACCOUNT_TYPE_LABELS, ComparisonDateRanges
} from "@/types/finance";
import { TransactionTable } from "./TransactionTable";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { cn, parseDateLocal } from "@/lib/utils";
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const [localDateRanges, setLocalDateRanges] = useState<ComparisonDateRanges>(() => ({
    range1: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    range2: { from: undefined, to: undefined }
  }));

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setLocalDateRanges(ranges);
  }, []);

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
    
    return {
      initialBalance: accountSummary.initialBalance, 
      finalBalance: accountSummary.currentBalance,
      totalIn: accountSummary.totalIn,
      totalOut: accountSummary.totalOut,
      netChange: accountSummary.totalIn - accountSummary.totalOut,
      conciliatedCount,
      pendingCount,
    };
  }, [accountSummary, filteredTransactions]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 overflow-hidden flex flex-col shadow-2xl bg-card",
          !isMobile && "max-w-[min(95vw,80rem)] h-[min(90vh,900px)] rounded-[2rem]"
        )}
      >
        <DialogHeader className={cn(
          "px-4 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6 border-b shrink-0 bg-muted/50 relative",
          isMobile && "pt-4"
        )}>
          {isMobile && (
            <Button variant="ghost" size="icon" className="absolute left-4 top-4 rounded-full h-10 w-10" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          
          <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", isMobile && "pl-12")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shrink-0 text-white shadow-xl shadow-primary/30">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-black tracking-tight truncate">{account.name}</DialogTitle>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-muted/50 border-none h-5">{ACCOUNT_TYPE_LABELS[account.accountType]}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onReconcileAll} className="h-9 rounded-full text-xs font-bold gap-2 px-4 border-border/40 bg-card/50">
                <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Conciliar Tudo</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 bg-muted/20 p-4 rounded-[2rem] border border-border/40">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className={cn("flex items-center gap-2", statusColor)}>
                  {periodSummary.pendingCount === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span className="font-black text-[10px] uppercase tracking-widest">{periodSummary.pendingCount === 0 ? "Em Dia" : `${periodSummary.pendingCount} PENDENTES`}</span>
                </div>
                <Separator orientation="vertical" className="h-4 bg-border/50 hidden sm:block" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">{periodSummary.conciliatedCount}/{filteredTransactions.length} ITENS</span>
              </div>
              <PeriodSelector initialRanges={localDateRanges} onDateRangeChange={handlePeriodChange} className="h-9 rounded-xl bg-card border-none text-[10px] font-black" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { l: 'Inicial', v: periodSummary.initialBalance, c: '' },
                { l: 'Entradas', v: periodSummary.totalIn, c: 'text-success' },
                { l: 'Saídas', v: periodSummary.totalOut, c: 'text-destructive' },
                { l: 'Final', v: periodSummary.finalBalance, c: 'text-primary' }
              ].map((x, i) => (
                <div key={i} className="p-4 rounded-[1.75rem] bg-card border border-border/40 shadow-sm">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{x.l}</p>
                  <p className={cn("text-base font-black tabular-nums", x.c)}>{formatCurrency(x.v)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-border/40 overflow-hidden bg-card shadow-sm">
              <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">Extrato Detalhado</h3>
                </div>
              </div>
              {/* O container abaixo gerencia o scroll horizontal de forma única */}
              <div className="overflow-x-auto scrollbar-material">
                <div className="min-w-[900px] p-6 pt-2">
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

        {!isMobile && (
          <DialogFooter className="p-6 bg-muted/10 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}