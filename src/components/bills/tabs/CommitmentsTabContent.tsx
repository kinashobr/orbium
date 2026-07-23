import { useState, useMemo, useCallback, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { PotentialFixedBill, BillTracker, formatCurrency, generateBillId, BillSourceType } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Building2, Shield, ShoppingCart, Package, CheckCircle2, ChevronDown } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CommitmentCard } from "./CommitmentCard";
import { CommitmentDetailsModal } from "./CommitmentDetailsModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  totalPaid: number;
  paidCount: number;
  totalCount: number;
  isCompleted: boolean;
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
    updateBill,
  } = useFinance();

  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const trackerBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);

  const potentialBills = useMemo(
    () => getPotentialFixedBillsForMonth(currentDate, trackerBills),
    [getPotentialFixedBillsForMonth, currentDate, trackerBills]
  );

  const futureBills = useMemo(
    () => getFutureFixedBills(currentDate, trackerBills),
    [getFutureFixedBills, currentDate, trackerBills]
  );

  const handleAdvanceBill = useCallback((potentialBill: PotentialFixedBill, discountAmount: number = 0) => {
    const effectiveAmount = Math.max(0, potentialBill.expectedAmount - discountAmount);
    const newBill: BillTracker = {
      id: generateBillId(),
      type: 'tracker',
      description: potentialBill.description,
      dueDate: potentialBill.dueDate,
      expectedAmount: effectiveAmount,
      sourceType: potentialBill.sourceType,
      sourceRef: potentialBill.sourceRef,
      parcelaNumber: potentialBill.parcelaNumber,
      isPaid: false,
      isExcluded: false,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
      suggestedCategoryId: categoriasV2.find(c =>
        c.label.toLowerCase().includes(potentialBill.sourceType === 'loan_installment' ? 'emprestimo' : 'seguro')
      )?.id || null,
    };
    setBillsTracker(prev => [...prev, newBill]);
    toast.success("Parcela adiantada para este mês com desconto.");
  }, [setBillsTracker, contasMovimento, categoriasV2]);

  const handleDeleteBill = useCallback((billId: string) => {
    setBillsTracker(prev => prev.filter(b => b.id !== billId));
    toast.success("Compromisso excluído permanentemente.");
  }, [setBillsTracker]);

  // Group all commitments — filter out excluded bills
  const commitmentGroups = useMemo(() => {
    const groups: Record<string, CommitmentGroup> = {};

    billsTracker.filter(b => !b.isExcluded).forEach(bill => {
      if (bill.sourceType === 'fixed_expense' || bill.sourceType === 'ad_hoc' || bill.sourceType === 'variable_expense' || bill.sourceType === 'card_invoice') return;
      
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) {
        groups[key] = {
          id: key, sourceType: bill.sourceType, sourceRef: bill.sourceRef!,
          description: bill.description.split(' (')[0].split(' - ')[0],
          installments: [], totalRemaining: 0, totalPaid: 0, paidCount: 0, totalCount: 0, isCompleted: false
        };
      }
      groups[key].installments.push(bill);
    });

    potentialBills.forEach(bill => {
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) {
        groups[key] = {
          id: key, sourceType: bill.sourceType, sourceRef: bill.sourceRef,
          description: bill.description.split(' (')[0].split(' - ')[0],
          installments: [], totalRemaining: 0, totalPaid: 0, paidCount: 0, totalCount: 0, isCompleted: false
        };
      }
      const exists = groups[key].installments.some(i => (i as any).parcelaNumber === bill.parcelaNumber);
      if (!exists) groups[key].installments.push(bill);
    });

    futureBills.forEach(bill => {
      const key = `${bill.sourceType}_${bill.sourceRef}`;
      if (!groups[key]) {
        groups[key] = {
          id: key, sourceType: bill.sourceType, sourceRef: bill.sourceRef,
          description: bill.description.split(' (')[0].split(' - ')[0],
          installments: [], totalRemaining: 0, totalPaid: 0, paidCount: 0, totalCount: 0, isCompleted: false
        };
      }
      const exists = groups[key].installments.some(i => (i as any).parcelaNumber === bill.parcelaNumber);
      if (!exists) groups[key].installments.push(bill);
    });

    Object.values(groups).forEach(group => {
      group.totalCount = group.installments.length;
      group.paidCount = group.installments.filter(i => i.isPaid).length;
      group.totalRemaining = group.installments.filter(i => !i.isPaid).reduce((acc, i) => acc + i.expectedAmount, 0);
      group.totalPaid = group.installments.filter(i => i.isPaid).reduce((acc, i) => acc + i.expectedAmount, 0);
      group.isCompleted = group.totalCount > 0 && group.paidCount === group.totalCount;
      const sorted = [...group.installments].sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
      group.nextInstallment = sorted.find(i => !i.isPaid);
      if (group.sourceType === 'purchase_installment' && sorted[0]) {
        group.description = sorted[0].description.split(' (')[0];
      }
    });

    return Object.values(groups);
  }, [billsTracker, potentialBills, futureBills]);

  const activeGroups = useMemo(() => commitmentGroups.filter(g => !g.isCompleted), [commitmentGroups]);
  const completedGroups = useMemo(() => commitmentGroups.filter(g => g.isCompleted), [commitmentGroups]);

  // Derive selected commitment reactively from groups
  const selectedCommitment = useMemo(() => {
    if (!selectedCommitmentId) return null;
    return commitmentGroups.find(g => g.id === selectedCommitmentId) || null;
  }, [selectedCommitmentId, commitmentGroups]);

  // Auto-close modal if group becomes empty
  useEffect(() => {
    if (selectedCommitmentId && !selectedCommitment) {
      setSelectedCommitmentId(null);
    }
  }, [selectedCommitmentId, selectedCommitment]);

  const renderCategory = (config: typeof GROUP_CONFIG[number], groups: CommitmentGroup[]) => {
    const Icon = config.icon;
    const categoryGroups = groups.filter(g => g.sourceType === config.key);
    if (categoryGroups.length === 0) return null;

    return (
      <div key={config.key} className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-3 h-3", config.color)} />
          </div>
          <h3 className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground">{config.label}</h3>
          <span className="text-[7.5px] font-bold text-muted-foreground/40">{categoryGroups.length} {categoryGroups.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
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
              totalPaidValue={group.totalPaid}
              paidCount={group.paidCount}
              totalCount={group.totalCount}
              onClick={() => setSelectedCommitmentId(group.id)}
              onAdvance={group.nextInstallment && !('id' in group.nextInstallment) ? () => handleAdvanceBill(group.nextInstallment as PotentialFixedBill) : undefined}
            />
          ))}
        </div>
      </div>
    );
  };

  const hasActiveGroups = activeGroups.length > 0;
  const hasCompletedGroups = completedGroups.length > 0;

  return (
    <div className="space-y-4">
      {/* Active commitments */}
      <div className="space-y-5">
        {GROUP_CONFIG.map(config => renderCategory(config, activeGroups))}
      </div>

      {!hasActiveGroups && !hasCompletedGroups && (
        <div className="flex flex-col items-center justify-center py-8 opacity-30">
          <Package className="w-8 h-8 mb-2" />
          <p className="text-[8px] font-black uppercase tracking-widest">Nenhum compromisso encontrado</p>
        </div>
      )}

      {/* Completed commitments */}
      {hasCompletedGroups && (
        <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-2.5 py-2 border-t border-border/20 group hover:opacity-80 transition-opacity">
              <div className="w-5 h-5 rounded-md flex items-center justify-center bg-emerald-500/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                Quitados ({completedGroups.length})
              </span>
              <ChevronDown className={cn(
                "w-3 h-3 text-muted-foreground/40 ml-auto transition-transform duration-300",
                showCompleted && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5 pt-1">
            {GROUP_CONFIG.map(config => renderCategory(config, completedGroups))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {selectedCommitment && (
        <CommitmentDetailsModal
          open={!!selectedCommitment}
          onOpenChange={(open) => !open && setSelectedCommitmentId(null)}
          title={selectedCommitment.description}
          installments={selectedCommitment.installments}
          onAdvanceBill={handleAdvanceBill}
          onExcludeBill={handleDeleteBill}
          onDeleteBill={handleDeleteBill}
          onUpdateBill={updateBill}
        />
      )}
    </div>
  );
}
