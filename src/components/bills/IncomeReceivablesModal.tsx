"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, TrendingUp, Plus, ListFilter, 
  Wallet, Clock, CheckCircle2, AlertTriangle, Ban
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { 
  FutureIncome, IncomeStatus, INCOME_STATUS_LABELS, formatCurrency,
  IncomeFinancialNature, INCOME_FINANCIAL_NATURE_LABELS
} from "@/types/finance";
import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";

import { IncomeReceivableCard } from "./IncomeReceivableCard";
import { IncomeFormSheet } from "./IncomeFormSheet";

const STATUS_ORDER: IncomeStatus[] = ['atrasado', 'previsto', 'cobrado_ou_faturado', 'recebido_parcial', 'recebido', 'renegociado', 'cancelado'];

interface IncomeReceivablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

export function IncomeReceivablesModal({ open, onOpenChange, currentDate }: IncomeReceivablesModalProps) {
  const { 
    futureIncomes, incomeSettlements, 
    updateFutureIncome, deleteFutureIncome, addIncomeSettlement,
    getFutureIncomesForMonth, contasMovimento 
  } = useFinance();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState("pipeline");
  const [editingIncome, setEditingIncome] = useState<FutureIncome | undefined>();

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobile, open]);

  const monthIncomes = useMemo(() => getFutureIncomesForMonth(currentDate), [getFutureIncomesForMonth, currentDate]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, FutureIncome[]> = {};
    STATUS_ORDER.forEach(s => { groups[s] = []; });
    monthIncomes.forEach(fi => {
      if (groups[fi.status]) groups[fi.status].push(fi);
    });
    return groups;
  }, [monthIncomes]);

  const stats = useMemo(() => {
    const total = monthIncomes.filter(fi => fi.status !== 'cancelado').reduce((acc, fi) => acc + fi.netExpectedAmount, 0);
    const received = incomeSettlements
      .filter(s => isSameMonth(parseDateLocal(s.receivedDate), currentDate))
      .reduce((acc, s) => acc + s.receivedAmount, 0);
    const pending = total - received;
    const overdue = monthIncomes.filter(fi => fi.status === 'atrasado').reduce((acc, fi) => acc + fi.netExpectedAmount, 0);
    return { total, received, pending, overdue };
  }, [monthIncomes, incomeSettlements, currentDate]);

  const handleMarkCobrado = useCallback((id: string) => {
    updateFutureIncome(id, { status: 'cobrado_ou_faturado' });
    toast.success("Status atualizado para Cobrado.");
  }, [updateFutureIncome]);

  const handleReceiveTotal = useCallback((income: FutureIncome) => {
    const defaultAccount = income.accountId || contasMovimento.find(c => c.accountType === 'corrente')?.id;
    if (!defaultAccount) { toast.error("Cadastre uma conta de recebimento."); return; }
    addIncomeSettlement({
      futureIncomeId: income.id,
      receivedAmount: income.netExpectedAmount,
      receivedDate: format(new Date(), 'yyyy-MM-dd'),
      accountId: defaultAccount,
      feesApplied: income.fees,
      taxWithheldApplied: income.taxWithheld,
    });
    toast.success("Recebimento registrado!");
  }, [addIncomeSettlement, contasMovimento]);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Excluir este recebível?")) {
      deleteFutureIncome(id);
      toast.success("Removido.");
    }
  }, [deleteFutureIncome]);

  const handleEditSave = useCallback(() => {
    setEditingIncome(undefined);
    setActiveTab("pipeline");
  }, []);

  const handleNewIncome = useCallback(() => {
    setEditingIncome(undefined);
    setActiveTab("registrar");
  }, []);

  const pipelineContent = (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-[8px] font-black uppercase tracking-widest text-primary/60 mb-0.5">Previsto</p>
          <p className="text-sm font-black text-primary tabular-nums">{formatCurrency(stats.total)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-success/5 border border-success/10">
          <p className="text-[8px] font-black uppercase tracking-widest text-success/60 mb-0.5">Recebido</p>
          <p className="text-sm font-black text-success tabular-nums">{formatCurrency(stats.received)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-warning/5 border border-warning/10">
          <p className="text-[8px] font-black uppercase tracking-widest text-warning/60 mb-0.5">Pendente</p>
          <p className="text-sm font-black text-warning tabular-nums">{formatCurrency(stats.pending)}</p>
        </div>
        {stats.overdue > 0 && (
          <div className="p-3 rounded-2xl bg-destructive/5 border border-destructive/10">
            <p className="text-[8px] font-black uppercase tracking-widest text-destructive/60 mb-0.5">Atrasado</p>
            <p className="text-sm font-black text-destructive tabular-nums">{formatCurrency(stats.overdue)}</p>
          </div>
        )}
      </div>

      {/* Pipeline grouped by status */}
      {STATUS_ORDER.map(status => {
        const items = groupedByStatus[status];
        if (!items || items.length === 0) return null;
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider">
                {INCOME_STATUS_LABELS[status]}
              </Badge>
              <span className="text-[9px] font-bold text-muted-foreground">{items.length} item(ns)</span>
            </div>
            <div className="space-y-2">
              {items.map(income => (
                <IncomeReceivableCard
                  key={income.id}
                  income={income}
                  settlements={incomeSettlements.filter(s => s.futureIncomeId === income.id)}
                  onMarkCobrado={() => handleMarkCobrado(income.id)}
                  onReceiveTotal={() => handleReceiveTotal(income)}
                  onEdit={() => { setEditingIncome(income); setActiveTab("registrar"); }}
                  onDelete={() => handleDelete(income.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {monthIncomes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">Nenhuma receita prevista</p>
          <p className="text-xs opacity-60">Cadastre suas receitas esperadas para este mês</p>
          <Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={handleNewIncome}>
            <Plus className="w-4 h-4" /> Cadastrar Receita
          </Button>
        </div>
      )}
    </div>
  );

  const modalContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
      <div className="px-4 sm:px-8 pt-2 shrink-0">
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="pipeline" className="text-[10px] sm:text-xs font-black uppercase tracking-wider gap-1.5 px-1 sm:px-3">
            <ListFilter className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:inline">Pipeline</span>
            <span className="sm:hidden">Pipeline</span>
          </TabsTrigger>
          <TabsTrigger value="registrar" className="text-[10px] sm:text-xs font-black uppercase tracking-wider gap-1.5 px-1 sm:px-3">
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:inline">Registrar Receita</span>
            <span className="sm:hidden">Registrar</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <ScrollArea className="flex-1 scrollbar-material">
        <div className="p-4 sm:p-8 pb-32 sm:pb-8">
          <TabsContent value="pipeline" className="mt-0">
            {pipelineContent}
          </TabsContent>
          <TabsContent value="registrar" className="mt-0">
            <IncomeFormSheet editingIncome={editingIncome} onSave={handleEditSave} />
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );

  if (isMobile && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton fullscreen className="p-0 flex flex-col z-[130] dark:bg-[hsl(24_8%_10%)]">
          <header className="shrink-0 bg-card border-b px-6 pb-4 shadow-sm z-10 dark:bg-black/30 dark:border-white/5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-muted/30" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="w-11 h-11 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-success/10 text-success shadow-success/5">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Receitas e Recebimentos</h2>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>
          </header>
          {modalContent}
          {activeTab === 'pipeline' && (
            <div className="fixed bottom-24 right-6 z-[60]">
              <Button size="icon" className="h-14 w-14 rounded-2xl shadow-2xl bg-success text-success-foreground hover:scale-105 active:scale-95 transition-all" onClick={handleNewIncome}>
                <Plus className="w-7 h-7" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className={cn(
          "p-0 shadow-2xl flex flex-col z-[130] dark:bg-[hsl(24_8%_10%)]",
          "max-w-[min(95vw,60rem)] h-[min(90vh,850px)] rounded-[2rem]"
        )}
      >
        <DialogHeader
          className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 shrink-0 relative dark:bg-black/30 dark:border-b dark:border-white/5 bg-success/5"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-success/10 text-success shadow-success/5">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter">
                Receitas e Recebimentos
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })} · Pipeline
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {modalContent}

        <DialogFooter className="p-4 sm:p-6 bg-muted/10 dark:bg-black/30 border-t dark:border-white/5 shrink-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            variant="ghost"
          >
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
