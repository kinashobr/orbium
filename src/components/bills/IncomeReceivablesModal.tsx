import { useState, useMemo, useEffect, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, TrendingUp, Plus, LayoutGrid, 
  Wallet, ChevronRight, Calendar, BarChart3,
  AlertCircle
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { 
  FutureIncome, formatCurrency,
} from "@/types/finance";
import { format, isSameMonth, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";

import { IncomeReceivableCard } from "./IncomeReceivableCard";
import { IncomeFormSheet } from "./IncomeFormSheet";
import { IncomeSettlementDialog } from "./IncomeSettlementDialog";
import { CLTCockpitModal } from "./CLTCockpitModal";

interface IncomeReceivablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  onDateChange?: (date: Date) => void;
}

export function IncomeReceivablesModal({ open, onOpenChange, currentDate, onDateChange }: IncomeReceivablesModalProps) {
  const { 
    futureIncomes, incomeSettlements, categoriasV2,
    updateFutureIncome, deleteFutureIncome,
    getFutureIncomesForMonth, getIncomeEventsForIncome 
  } = useFinance();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState("fluxo");
  const [editingIncome, setEditingIncome] = useState<FutureIncome | undefined>();
  const [settlementTarget, setSettlementTarget] = useState<{ income: FutureIncome; mode: 'partial' | 'total' } | null>(null);
  const [showCLTCockpit, setShowCLTCockpit] = useState(false);

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobile, open]);

  const monthIncomes = useMemo(() => getFutureIncomesForMonth(currentDate), [getFutureIncomesForMonth, currentDate]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, FutureIncome[]> = {};
    monthIncomes.forEach(fi => {
      const catId = fi.categoryId || 'sem_categoria';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(fi);
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

  const handleOpenSettlement = useCallback((income: FutureIncome, mode: 'partial' | 'total') => {
    setSettlementTarget({ income, mode });
  }, []);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deletingId) {
      deleteFutureIncome(deletingId);
      toast.success("Recebível removido com sucesso.");
      setDeletingId(null);
    }
  }, [deletingId, deleteFutureIncome]);

  const handleEditSave = useCallback(() => {
    setEditingIncome(undefined);
    setActiveTab("fluxo");
  }, []);

  const handleNewIncome = useCallback(() => {
    setEditingIncome(undefined);
    setActiveTab("registrar");
  }, []);

  const panoramaContent = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(new Date()), i))
      .filter(month => getFutureIncomesForMonth(month).length > 0);
    
    if (months.length === 0) {
      return (
        <div className="text-center py-10 bg-muted/5 rounded-2xl border border-dashed border-border/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma projeção futura encontrada</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map(month => {
            const incomes = getFutureIncomesForMonth(month);
            const total = incomes.filter(fi => fi.status !== 'cancelado').reduce((acc, fi) => acc + fi.netExpectedAmount, 0);
            const received = incomeSettlements
              .filter(s => isSameMonth(parseDateLocal(s.receivedDate), month))
              .reduce((acc, s) => acc + s.receivedAmount, 0);
            const pending = total - received;
            const overdue = incomes.filter(fi => fi.status === 'atrasado').reduce((acc, fi) => acc + fi.netExpectedAmount, 0);
            
            const isCurrent = isSameMonth(month, currentDate);

            return (
              <div 
                key={month.toISOString()} 
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary/50",
                  isCurrent ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-muted/10 border-border/50"
                )}
                onClick={() => {
                  if (onDateChange) {
                    onDateChange(month);
                    setActiveTab("fluxo");
                    toast.success(`Visualizando ${format(month, 'MMMM', { locale: ptBR })}`);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest capitalize">{format(month, 'MMMM yyyy', { locale: ptBR })}</h4>
                  {isCurrent && <Badge variant="default" className="h-4 text-[7px] font-black uppercase">Atual</Badge>}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background/50 rounded-lg p-2">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Prev.</p>
                    <p className="text-[10px] font-black tabular-nums">{formatCurrency(total)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Rec.</p>
                    <p className="text-[10px] font-black text-success tabular-nums">{formatCurrency(received)}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-2">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Pend.</p>
                    <p className="text-[10px] font-black text-warning tabular-nums">{formatCurrency(pending)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [getFutureIncomesForMonth, incomeSettlements, currentDate, onDateChange]);

  const fluxoContent = (
    <div className="space-y-8">
      {/* Grouped by Category */}
      <div className="space-y-6">
        {Object.entries(groupedByCategory).map(([catId, items]) => {
          const category = categoriasV2.find(c => c.id === catId);
          const catTotal = items.reduce((acc, curr) => acc + curr.netExpectedAmount, 0);
          
          return (
            <div key={catId} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center text-sm">
                    {category?.icon || '📁'}
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest">{category?.label || 'Sem Categoria'}</h3>
                    <p className="text-[9px] font-bold text-muted-foreground">{items.length} lançamento(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black tabular-nums">{formatCurrency(catTotal)}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Total Categoria</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {items.sort((a, b) => a.expectedReceiptDate.localeCompare(b.expectedReceiptDate)).map(income => (
                  <IncomeReceivableCard
                    key={income.id}
                    income={income}
                    settlements={incomeSettlements.filter(s => s.futureIncomeId === income.id)}
                    events={getIncomeEventsForIncome(income.id)}
                    onMarkCobrado={() => handleMarkCobrado(income.id)}
                    onReceiveTotal={() => handleOpenSettlement(income, 'total')}
                    onReceivePartial={() => handleOpenSettlement(income, 'partial')}
                    onEdit={() => { setEditingIncome(income); setActiveTab("registrar"); }}
                    onDelete={() => handleDelete(income.id)}
                    onOpenCockpit={() => setShowCLTCockpit(true)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {monthIncomes.length === 0 && (
        <div className="text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed border-border/50">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-base font-black tracking-tight">Nenhuma receita prevista</p>
          <p className="text-xs text-muted-foreground font-medium mt-1">Cadastre suas receitas esperadas para este mês</p>
          <Button variant="default" className="mt-6 gap-2 rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest" onClick={handleNewIncome}>
            <Plus className="w-4 h-4" /> Cadastrar Receita
          </Button>
        </div>
      )}
    </div>
  );

  const modalContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
      <div className="px-4 sm:px-8 pt-2 shrink-0">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-muted/30 p-1 rounded-2xl">
          <TabsTrigger value="fluxo" className="text-[10px] sm:text-xs font-black uppercase tracking-widest gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Fluxo & Panorama</span>
          </TabsTrigger>
          <TabsTrigger value="registrar" className="text-[10px] sm:text-xs font-black uppercase tracking-widest gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <ScrollArea className="flex-1 scrollbar-material">
        <div className="p-4 sm:p-8 pb-32 sm:pb-8">
          <TabsContent value="fluxo" className="mt-0 outline-none space-y-12">
            {fluxoContent}
            
            <Separator className="opacity-50" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Panorama 12 Meses</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Visão geral de recebíveis futuros</p>
                </div>
              </div>
              {panoramaContent}
            </div>
          </TabsContent>
          <TabsContent value="registrar" className="mt-0 outline-none">
            <IncomeFormSheet editingIncome={editingIncome} onSave={handleEditSave} />
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );

  const settlementDialog = settlementTarget && (
    <IncomeSettlementDialog
      open={!!settlementTarget}
      onOpenChange={(v) => { if (!v) setSettlementTarget(null); }}
      income={settlementTarget.income}
      settlements={incomeSettlements.filter(s => s.futureIncomeId === settlementTarget.income.id)}
      mode={settlementTarget.mode}
    />
  );

  const deleteConfirmDialog = (
    <Dialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
      <DialogContent className="max-w-[320px] rounded-[2rem] p-8 border-none shadow-2xl">
        <DialogHeader className="items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertCircle className="w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">Excluir Recebível?</DialogTitle>
          <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest">
            Esta ação não pode ser desfeita. Se for uma receita recorrente, toda a série será removida.
          </p>
        </DialogHeader>
        <div className="mt-8 flex flex-col gap-2">
          <Button 
            variant="destructive" 
            onClick={confirmDelete}
            className="h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-destructive/20"
          >
            Confirmar Exclusão
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setDeletingId(null)}
            className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest text-muted-foreground"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isMobile && open) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent hideCloseButton fullscreen className="p-0 flex flex-col dark:bg-[hsl(24_8%_10%)]">
            <header className="shrink-0 bg-card border-b px-6 pb-4 shadow-sm z-10 dark:bg-black/30 dark:border-white/5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
              <div className="flex items-center gap-4">
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
            {activeTab === 'fluxo' && (
              <div className="fixed bottom-24 right-6 z-[60]">
                <Button size="icon" className="h-14 w-14 rounded-2xl shadow-2xl bg-success text-success-foreground hover:scale-105 active:scale-95 transition-all" onClick={handleNewIncome}>
                  <Plus className="w-7 h-7" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {settlementDialog}
        {deleteConfirmDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          className={cn(
            "p-0 shadow-2xl flex flex-col dark:bg-[hsl(24_8%_10%)]",
            "max-w-[min(95vw,65rem)] h-[min(90vh,900px)] rounded-[2.5rem] border-none"
          )}
        >
          <DialogHeader
            className="px-8 pt-8 pb-6 shrink-0 relative dark:bg-black/30 dark:border-b dark:border-white/5 bg-success/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg bg-success/10 text-success shadow-success/5">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tighter">
                    Receitas e Recebimentos
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2">
                    <span className="capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>Fluxo de Entradas</span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Total Previsto</p>
                  <p className="text-2xl font-black tabular-nums text-success">{formatCurrency(stats.total)}</p>
                </div>
                <div className="h-10 w-px bg-border/50" />
                <div className="text-right">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Pendente</p>
                  <p className="text-2xl font-black tabular-nums text-warning">{formatCurrency(stats.pending)}</p>
                </div>
                <div className="h-10 w-px bg-border/50" />
                <div className="text-right">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Recebido</p>
                  <p className="text-2xl font-black tabular-nums text-primary">{formatCurrency(stats.received)}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {modalContent}

          <DialogFooter className="p-6 bg-muted/5 dark:bg-black/30 border-t dark:border-white/5 shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">ORBIUM FINANCE · GESTÃO DE RECEBÍVEIS</p>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/30"
                variant="ghost"
              >
                FECHAR
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {settlementDialog}
      {deleteConfirmDialog}
      <CLTCockpitModal open={showCLTCockpit} onOpenChange={setShowCLTCockpit} />
    </>
  );
}
