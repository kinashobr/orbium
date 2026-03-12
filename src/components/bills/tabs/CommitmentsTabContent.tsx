import { useState, useMemo, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { PotentialFixedBill, BillTracker, formatCurrency, generateBillId, BillSourceType } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Shield, ShoppingCart, Package, Plus, Trash2 } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, isSameMonth, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { RecurringExpenseTabContent } from "./RecurringExpenseTabContent";
import { PurchaseInstallmentTabContent } from "./PurchaseInstallmentTabContent";
import { CommitmentCard } from "./CommitmentCard";
import { CommitmentDetailsModal } from "./CommitmentDetailsModal";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";

interface CommitmentsTabContentProps {
  currentDate: Date;
}

const GROUP_CONFIG = [
  { key: 'loan_installment', label: 'Empréstimos', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { key: 'insurance_installment', label: 'Seguros', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'purchase_installment', label: 'Compras Parceladas', icon: ShoppingCart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
] as const;

interface CommitmentGroup {
  id: string;
  sourceType: BillSourceType;
  sourceRef: string;
  description: string;
  installments: (BillTracker | PotentialFixedBill)[];
  nextInstallment?: BillTracker | PotentialFixedBill;
  totalRemaining: number;
  paidCount: number;
  totalCount: number;
}

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
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<CommitmentGroup | null>(null);

  const trackerBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);

  const potentialBills = useMemo(
    () => getPotentialFixedBillsForMonth(currentDate, trackerBills),
    [getPotentialFixedBillsForMonth, currentDate, trackerBills]
  );

  const futureBills = useMemo(
    () => getFutureFixedBills(currentDate, trackerBills),
    [getFutureFixedBills, currentDate, trackerBills]
  );

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

  // Group all commitments
  const commitmentGroups = useMemo(() => {
    const groups: Record<string, CommitmentGroup> = {};

    // 1. Process all bills in tracker
    billsTracker.forEach(bill => {
      if (bill.sourceType === 'fixed_expense' || bill.sourceType === 'ad_hoc' || bill.sourceType === 'variable_expense' || bill.sourceType === 'card_invoice') return;
      
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          sourceType: bill.sourceType,
          sourceRef: bill.sourceRef!,
          description: bill.description.split(' (')[0].split(' - ')[0], // Clean description
          installments: [],
          totalRemaining: 0,
          paidCount: 0,
          totalCount: 0
        };
      }
      groups[key].installments.push(bill);
    });

    // 2. Process potential bills for current month
    potentialBills.forEach(bill => {
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          sourceType: bill.sourceType,
          sourceRef: bill.sourceRef,
          description: bill.description.split(' (')[0].split(' - ')[0],
          installments: [],
          totalRemaining: 0,
          paidCount: 0,
          totalCount: 0
        };
      }
      // Only add if not already in tracker (to avoid duplicates)
      const exists = groups[key].installments.some(i => (i as BillTracker | PotentialFixedBill).parcelaNumber === bill.parcelaNumber);
      if (!exists) {
        groups[key].installments.push(bill);
      }
    });

    // 3. Process future bills
    futureBills.forEach(bill => {
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          sourceType: bill.sourceType,
          sourceRef: bill.sourceRef,
          description: bill.description.split(' (')[0].split(' - ')[0],
          installments: [],
          totalRemaining: 0,
          paidCount: 0,
          totalCount: 0
        };
      }
      const exists = groups[key].installments.some(i => (i as BillTracker | PotentialFixedBill).parcelaNumber === bill.parcelaNumber);
      if (!exists) {
        groups[key].installments.push(bill);
      }
    });

    // 4. Calculate summaries for each group
    Object.values(groups).forEach(group => {
      group.totalCount = group.installments.length;
      group.paidCount = group.installments.filter(i => i.isPaid).length;
      group.totalRemaining = group.installments
        .filter(i => !i.isPaid)
        .reduce((acc, i) => acc + i.expectedAmount, 0);
      
      // Find next installment (not paid, closest to today)
      const sorted = [...group.installments].sort((a, b) => 
        parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime()
      );
      group.nextInstallment = sorted.find(i => !i.isPaid);
      
      // Update description if it's a purchase installment to be more specific
      if (group.sourceType === 'purchase_installment') {
        const first = sorted[0];
        if (first) {
          group.description = first.description.split(' (')[0];
        }
      }
    });

    return Object.values(groups);
  }, [billsTracker, potentialBills, futureBills]);

  const renderCategory = (config: typeof GROUP_CONFIG[number]) => {
    const Icon = config.icon;
    const categoryGroups = commitmentGroups.filter(g => g.sourceType === config.key);

    if (categoryGroups.length === 0) return null;

    return (
      <div key={config.key} className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-4 h-4", config.color)} />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {config.label}
          </h3>
          <span className="text-[9px] font-bold text-muted-foreground/40">
            {categoryGroups.length} {categoryGroups.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {categoryGroups.map(group => (
            <CommitmentCard
              key={group.id}
              title={group.description}
              icon={Icon}
              iconColor={config.color}
              iconBg={config.bg}
              nextInstallmentDate={group.nextInstallment ? format(parseDateLocal(group.nextInstallment.dueDate), "dd 'de' MMM", { locale: ptBR }) : undefined}
              nextInstallmentValue={group.nextInstallment?.expectedAmount || 0}
              totalRemainingValue={group.totalRemaining}
              paidCount={group.paidCount}
              totalCount={group.totalCount}
              onClick={() => setSelectedCommitment(group)}
              onAdvance={group.nextInstallment && !('id' in group.nextInstallment) ? () => handleToggleBill(group.nextInstallment as PotentialFixedBill, true) : undefined}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="space-y-10">
        {GROUP_CONFIG.map(config => renderCategory(config))}
      </div>

      {/* No items fallback */}
      {commitmentGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 opacity-30">
          <Package className="w-12 h-12 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest">Nenhum compromisso encontrado</p>
        </div>
      )}

      {/* Excluded items restore */}
      {excludedBills.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
            Removidos do mês ({excludedBills.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
            {excludedBills.map(bill => (
              <div
                key={bill.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/30 w-full opacity-50 hover:opacity-80 transition-opacity bg-muted/5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold truncate line-through">{bill.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] font-black" onClick={() => handleRestoreBill(bill.id)}>
                    Restaurar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBill(bill.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring expense modal */}
      <Dialog open={showRecurringModal} onOpenChange={setShowRecurringModal}>
        <ResizableDialogContent 
          storageKey="recurring_expense_modal"
          initialWidth={500}
          initialHeight={600}
          minWidth={400}
          minHeight={550}
          maxWidth={800}
          maxHeight={900}
          hideCloseButton
          className="rounded-[2.25rem] bg-card border-none shadow-2xl p-0 overflow-hidden flex flex-col"
        >
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 bg-card">
            <DialogTitle className="text-xl font-black tracking-tight">Nova Despesa Recorrente</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <RecurringExpenseTabContent currentDate={currentDate} onClose={() => setShowRecurringModal(false)} />
          </div>
        </ResizableDialogContent>
      </Dialog>

      {/* Purchase installment modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <ResizableDialogContent 
          storageKey="purchase_installment_modal"
          initialWidth={500}
          initialHeight={650}
          minWidth={400}
          minHeight={550}
          maxWidth={800}
          maxHeight={900}
          hideCloseButton
          className="rounded-[2.25rem] bg-card border-none shadow-2xl p-0 overflow-hidden flex flex-col"
        >
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 bg-card">
            <DialogTitle className="text-xl font-black tracking-tight">Nova Compra Parcelada</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <PurchaseInstallmentTabContent currentDate={currentDate} onClose={() => setShowPurchaseModal(false)} />
          </div>
        </ResizableDialogContent>
      </Dialog>

      {/* Details Modal */}
      {selectedCommitment && (
        <CommitmentDetailsModal
          open={!!selectedCommitment}
          onOpenChange={(open) => !open && setSelectedCommitment(null)}
          title={selectedCommitment.description}
          installments={selectedCommitment.installments}
          onToggleBill={handleToggleBill}
          onExcludeBill={handleExcludeCurrentMonthBill}
          onDeleteBill={handleDeleteBill}
        />
      )}
    </div>
  );
}
