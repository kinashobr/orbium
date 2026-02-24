import { useState, useMemo, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { PotentialFixedBill, BillTracker, formatCurrency, generateBillId } from "@/types/finance";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Shield, ShoppingCart, Calendar, ChevronRight, Plus, FastForward, Package, Trash2 } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PurchaseInstallmentTabContent } from "./PurchaseInstallmentTabContent";

interface CommitmentsTabContentProps {
  currentDate: Date;
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  loan_installment: Building2,
  insurance_installment: Shield,
  purchase_installment: ShoppingCart,
};

const GROUP_CONFIG = [
  { key: 'loan_installment', label: 'Empréstimos', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { key: 'insurance_installment', label: 'Seguros', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'purchase_installment', label: 'Compras Parceladas', icon: ShoppingCart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
] as const;

export function CommitmentsTabContent({ currentDate }: CommitmentsTabContentProps) {
  const {
    getPotentialFixedBillsForMonth,
    getFutureFixedBills,
    getBillsForMonth,
    setBillsTracker,
    billsTracker,
    contasMovimento,
    categoriasV2,
  } = useFinance();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const trackerBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);

  const potentialBills = useMemo(
    () => getPotentialFixedBillsForMonth(currentDate, trackerBills),
    [getPotentialFixedBillsForMonth, currentDate, trackerBills]
  );

  const futureBills = useMemo(
    () => getFutureFixedBills(currentDate, trackerBills),
    [getFutureFixedBills, currentDate, trackerBills]
  );

  // Current month purchase installments from tracker
  const currentMonthPurchases = useMemo(() => {
    return trackerBills.filter(b => b.sourceType === 'purchase_installment' && !b.isExcluded);
  }, [trackerBills]);

  // Excluded items from this month (for "restore" action)
  const excludedBills = useMemo(() => {
    return billsTracker.filter(b => {
      const dueDate = parseDateLocal(b.dueDate);
      return isSameMonth(dueDate, currentDate) && b.isExcluded && !b.isPaid;
    });
  }, [billsTracker, currentDate]);

  const handleToggleBill = useCallback((potentialBill: PotentialFixedBill, include: boolean) => {
    if (include) {
      const newBill: BillTracker = {
        id: generateBillId(),
        type: 'tracker',
        description: potentialBill.description,
        dueDate: potentialBill.dueDate,
        expectedAmount: potentialBill.expectedAmount,
        sourceType: potentialBill.sourceType,
        sourceRef: potentialBill.sourceRef,
        parcelaNumber: potentialBill.parcelaNumber,
        isPaid: false,
        isExcluded: false,
        suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
        suggestedCategoryId: categoriasV2.find(c =>
          c.label.toLowerCase().includes(potentialBill.sourceType === 'loan_installment' ? 'emprestimo' : 'seguro')
        )?.id || null,
      };
      setBillsTracker(prev => [...prev, newBill]);
      toast.success("Parcela adiantada para este mês.");
    } else {
      // Remove from tracker
      setBillsTracker(prev => prev.filter(b =>
        !(b.sourceType === potentialBill.sourceType && b.sourceRef === potentialBill.sourceRef && b.parcelaNumber === potentialBill.parcelaNumber)
      ));
      toast.info("Parcela removida.");
    }
  }, [setBillsTracker, contasMovimento, categoriasV2]);

  const handleExcludeCurrentMonthBill = useCallback((billId: string) => {
    setBillsTracker(prev => prev.map(b => b.id === billId ? { ...b, isExcluded: true } : b));
    toast.info("Compromisso removido do mês.");
  }, [setBillsTracker]);

  const handleRestoreBill = useCallback((billId: string) => {
    setBillsTracker(prev => prev.map(b => b.id === billId ? { ...b, isExcluded: false } : b));
    toast.success("Compromisso restaurado.");
  }, [setBillsTracker]);

  const handleDeleteBill = useCallback((billId: string) => {
    setBillsTracker(prev => prev.filter(b => b.id !== billId));
    toast.success("Compromisso excluído permanentemente.");
  }, [setBillsTracker]);

  // Group future bills by sourceType, then by sourceRef
  const groupedFuture = useMemo(() => {
    const groups: Record<string, PotentialFixedBill[]> = {};
    futureBills.forEach(bill => {
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(bill);
    });
    return groups;
  }, [futureBills]);

  const renderGroup = (groupConfig: typeof GROUP_CONFIG[number]) => {
    const Icon = groupConfig.icon;
    const sourceType = groupConfig.key;

    // Current month items (already in tracker or potential)
    const currentItems = potentialBills.filter(b => b.sourceType === sourceType);
    const currentPurchases = sourceType === 'purchase_installment' ? currentMonthPurchases : [];

    // Future items for this source type
    const futureForType = Object.entries(groupedFuture)
      .filter(([key]) => key.startsWith(sourceType))
      .flatMap(([, bills]) => bills);

    if (currentItems.length === 0 && currentPurchases.length === 0 && futureForType.length === 0) return null;

    return (
      <div key={sourceType} className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", groupConfig.bg)}>
            <Icon className={cn("w-4 h-4", groupConfig.color)} />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {groupConfig.label}
          </h3>
          <span className="text-[9px] font-bold text-muted-foreground/40">
            {currentItems.length + currentPurchases.length} este mês
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Current month items */}
          {currentItems.map(bill => (
            <div key={bill.key} className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all",
              bill.isIncluded
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border/40 hover:border-primary/20"
            )}>
              <Checkbox
                checked={bill.isIncluded}
                onCheckedChange={(c) => handleToggleBill(bill, !bill.isIncluded)}
                className="h-5 w-5 rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate">{bill.description}</p>
                <p className="text-[9px] font-bold text-muted-foreground/60">
                  Vence {format(parseDateLocal(bill.dueDate), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <p className={cn("text-sm font-black tabular-nums", bill.isIncluded ? "text-primary" : "text-foreground")}>
                {formatCurrency(bill.expectedAmount)}
              </p>
            </div>
          ))}

          {/* Purchase installments current month */}
          {currentPurchases.map(bill => (
            <div key={bill.id} className="flex items-center gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20">
              <Checkbox checked disabled className="h-5 w-5 rounded-lg opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate">{bill.description}</p>
                <p className="text-[9px] font-bold text-muted-foreground/60">
                  Vence {format(parseDateLocal(bill.dueDate), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <p className="text-sm font-black tabular-nums text-primary">
                {formatCurrency(bill.expectedAmount)}
              </p>
              {!bill.isPaid && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] font-black text-destructive/60 hover:text-destructive" onClick={() => handleExcludeCurrentMonthBill(bill.id)}>
                  ✕
                </Button>
              )}
            </div>
          ))}

          {/* Future items (collapsible) */}
          {futureForType.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors w-full">
                <ChevronRight className="w-3 h-3 transition-transform data-[state=open]:rotate-90" />
                Parcelas futuras ({futureForType.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4 animate-in slide-in-from-top-1">
                {futureForType.slice(0, 6).map(bill => (
                  <div key={bill.key} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate">{bill.description}</p>
                      <p className="text-[9px] text-muted-foreground/50">
                        {format(parseDateLocal(bill.dueDate), "MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-xs font-black tabular-nums text-muted-foreground">
                      {formatCurrency(bill.expectedAmount)}
                    </p>
                    {!bill.isIncluded && !bill.isPaid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[8px] font-black uppercase tracking-wider gap-1 rounded-lg border-accent/30 text-accent hover:bg-accent/10"
                        onClick={() => handleToggleBill(bill, true)}
                      >
                        <FastForward className="w-3 h-3" />
                        Adiantar
                      </Button>
                    )}
                  </div>
                ))}
                {futureForType.length > 6 && (
                  <p className="text-[9px] text-center font-bold text-muted-foreground/40 py-1">
                    +{futureForType.length - 6} parcelas
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action button */}
      <Button
        onClick={() => setShowPurchaseModal(true)}
        className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-primary/10"
      >
        <Plus className="w-4 h-4" />
        Nova Compra Parcelada
      </Button>

      {/* Groups */}
      {GROUP_CONFIG.map(g => renderGroup(g))}

      {/* No items fallback */}
      {potentialBills.length === 0 && currentMonthPurchases.length === 0 && futureBills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 opacity-30">
          <Package className="w-12 h-12 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest">Nenhum compromisso encontrado</p>
        </div>
      )}

      {/* Excluded items restore */}
      {excludedBills.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
            Removidos ({excludedBills.length})
          </p>
          {excludedBills.map(bill => (
            <div
              key={bill.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-border/30 w-full opacity-50 hover:opacity-80 transition-opacity"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold truncate line-through">{bill.description}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] font-black" onClick={() => handleRestoreBill(bill.id)}>
                Restaurar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBill(bill.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Purchase installment modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="max-w-lg rounded-2xl z-[200]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Nova Compra Parcelada</DialogTitle>
          </DialogHeader>
          <PurchaseInstallmentTabContent currentDate={currentDate} onClose={() => setShowPurchaseModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
