"use client";

import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  CalendarCheck, 
  Shield, 
  Building2, 
  DollarSign, 
  Settings, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  CheckCircle2,
  Zap,
  ArrowLeft
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  BillTracker, 
  PotentialFixedBill, 
  formatCurrency, 
  generateBillId, 
  TransactionLinks, 
  OperationType, 
  BillDisplayItem 
} from "@/types/finance";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsTrackerMobileList } from "./BillsTrackerMobileList";
import { BillsSidebarKPIs } from "./BillsSidebarKPIs";
import { FixedBillSelectorModal } from "./FixedBillSelectorModal";
import { AddPurchaseInstallmentDialog } from "./AddPurchaseInstallmentDialog";
import { format, startOfMonth, subMonths, addMonths, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn, parseDateLocal } from "@/lib/utils";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => bill.type === 'tracker';

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const {
    billsTracker,
    setBillsTracker,
    updateBill,
    deleteBill,
    getBillsForMonth,
    getPotentialFixedBillsForMonth,
    getFutureFixedBills,
    getOtherPaidExpensesForMonth,
    contasMovimento,
    addTransacaoV2,
    setTransacoesV2,
    categoriasV2,
    emprestimos,
    markSeguroParcelPaid,
    markLoanParcelPaid,
    unmarkSeguroParcelPaid,
    unmarkLoanParcelPaid,
  } = useFinance();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [showFixedBillSelector, setShowFixedBillSelector] = useState(false);
  const [fixedBillSelectorMode, setFixedBillSelectorMode] = useState<'current' | 'future'>('current');
  const [showAddPurchaseDialog, setShowAddPurchaseDialog] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);

  // Form state para nova conta avulsa
  const [newBillData, setNewBillData] = useState({
    description: "",
    amount: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
  });

  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  const externalPaidBills = useMemo(() => getOtherPaidExpensesForMonth(currentDate), [getOtherPaidExpensesForMonth, currentDate]);
  
  const combinedBills: BillDisplayItem[] = useMemo(() => {
    const trackerPaidTxIds = new Set(trackerManagedBills.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
    const trackerBills: BillDisplayItem[] = trackerManagedBills;
    const externalBills: BillDisplayItem[] = externalPaidBills.filter(eb => !trackerPaidTxIds.has(eb.id));
    return [...trackerBills, ...externalBills];
  }, [trackerManagedBills, externalPaidBills]);

  const potentialFixedBills = useMemo(() => getPotentialFixedBillsForMonth(currentDate, trackerManagedBills), [getPotentialFixedBillsForMonth, currentDate, trackerManagedBills]);
  const futureFixedBills = useMemo(() => getFutureFixedBills(currentDate, trackerManagedBills), [getFutureFixedBills, currentDate, trackerManagedBills]);

  const totalUnpaidBills = useMemo(() => {
    const creditCardAccountIds = new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id));
    return combinedBills.reduce((acc, b) => {
      const isCC = b.suggestedAccountId && creditCardAccountIds.has(b.suggestedAccountId);
      if (!b.isPaid || isCC) return acc + b.expectedAmount;
      return acc;
    }, 0);
  }, [combinedBills, contasMovimento]);

  const totalPaidBills = useMemo(() => {
    const creditCardAccountIds = new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id));
    return combinedBills.reduce((acc, b) => {
      const isCC = b.suggestedAccountId && creditCardAccountIds.has(b.suggestedAccountId);
      if (b.isPaid && !isCC) return acc + b.expectedAmount;
      return acc;
    }, 0);
  }, [combinedBills, contasMovimento]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleTogglePaid = useCallback((bill: BillDisplayItem, isChecked: boolean) => {
    if (!isBillTracker(bill)) {
      toast.error("Não é possível alterar o status de pagamento de transações do extrato.");
      return;
    }
    const trackerBill = bill as BillTracker;
    if (isChecked) {
      const account = contasMovimento.find(c => c.id === trackerBill.suggestedAccountId);
      const category = categoriasV2.find(c => c.id === trackerBill.suggestedCategoryId);
      if (!account || !category) {
        toast.error("Conta ou categoria sugerida não encontrada.");
        return;
      }
      const transactionId = `bill_tx_${trackerBill.id}`;
      const baseLinks: Partial<TransactionLinks> = {};
      let description = trackerBill.description;
      const operationType: OperationType = trackerBill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa';
      const domain = trackerBill.sourceType === 'loan_installment' ? 'financing' : 'operational';

      if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        const loanId = parseInt(trackerBill.sourceRef);
        baseLinks.loanId = `loan_${loanId}`;
        baseLinks.parcelaId = String(trackerBill.parcelaNumber);
        const loan = emprestimos.find(e => e.id === loanId);
        description = `Pagamento Empréstimo ${loan?.contrato || 'N/A'} - P${trackerBill.parcelaNumber}/${loan?.meses || 'N/A'}`;
        markLoanParcelPaid(loanId, trackerBill.expectedAmount, format(new Date(), 'yyyy-MM-dd'), trackerBill.parcelaNumber);
      }

      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        baseLinks.vehicleTransactionId = `${trackerBill.sourceRef}_${trackerBill.parcelaNumber}`;
        markSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber, transactionId);
      }

      addTransacaoV2({
        id: transactionId,
        date: format(new Date(), 'yyyy-MM-dd'),
        accountId: account.id,
        flow: 'out',
        operationType,
        domain,
        amount: trackerBill.expectedAmount,
        categoryId: category.id,
        description,
        links: {
          investmentId: null,
          transferGroupId: null,
          vehicleTransactionId: baseLinks.vehicleTransactionId || null,
          loanId: baseLinks.loanId || null,
          parcelaId: baseLinks.parcelaId || null
        },
        conciliated: false,
        attachments: [],
        meta: {
          createdBy: 'bill_tracker',
          source: 'bill_tracker',
          createdAt: new Date().toISOString(),
          notes: `Gerado pelo Contas a Pagar. Bill ID: ${trackerBill.id}`
        }
      });

      updateBill(trackerBill.id, {
        isPaid: true,
        transactionId,
        paymentDate: format(new Date(), 'yyyy-MM-dd')
      });
      toast.success(`Conta "${trackerBill.description}" paga!`);
    } else {
      if (trackerBill.transactionId) {
        if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef) {
          unmarkLoanParcelPaid(parseInt(trackerBill.sourceRef));
        }
        if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
          unmarkSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber);
        }
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId));
        updateBill(trackerBill.id, {
          isPaid: false,
          transactionId: undefined,
          paymentDate: undefined
        });
        toast.info("Conta desmarcada e transação excluída.");
      } else {
        updateBill(trackerBill.id, { isPaid: false, paymentDate: undefined });
      }
    }
  }, [updateBill, addTransacaoV2, contasMovimento, categoriasV2, emprestimos, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, setTransacoesV2]);

  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const { sourceType, sourceRef, parcelaNumber, dueDate, expectedAmount, description } = potentialBill;
    
    if (isChecked) {
      const newBill: BillTracker = {
        id: generateBillId(),
        type: 'tracker',
        description,
        dueDate,
        expectedAmount,
        sourceType,
        sourceRef,
        parcelaNumber,
        suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
        suggestedCategoryId: categoriasV2.find(c => 
          (sourceType === 'loan_installment' && c.label.toLowerCase().includes('emprestimo')) || 
          (sourceType === 'insurance_installment' && c.label.toLowerCase().includes('seguro'))
        )?.id || null,
        isExcluded: false,
        isPaid: false
      };
      setBillsTracker(prev => [...prev, newBill]);
      toast.success("Conta fixa incluída.");
    } else {
      setBillsTracker(prev => prev.filter(b => !(b.sourceType === sourceType && b.sourceRef === sourceRef && b.parcelaNumber === parcelaNumber)));
    }
  }, [setBillsTracker, contasMovimento, categoriasV2]);

  const handleAddAdHocBill = () => {
    const amount = parseFloat(newBillData.amount.replace(".", "").replace(",", "."));
    if (!newBillData.description || isNaN(amount) || amount <= 0 || !newBillData.dueDate) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setBillsTracker(prev => [...prev, {
      id: generateBillId(),
      type: 'tracker',
      description: newBillData.description,
      dueDate: newBillData.dueDate,
      expectedAmount: amount,
      sourceType: "ad_hoc",
      suggestedAccountId: contasMovimento.find(c => c.accountType === "corrente")?.id,
      suggestedCategoryId: null,
      isPaid: false,
      isExcluded: false
    }]);

    setNewBillData({
      description: "",
      amount: "",
      dueDate: format(currentDate, "yyyy-MM-dd"),
    });
    setShowNewBillModal(false);
    toast.success("Conta avulsa adicionada!");
  };

  const renderDesktopContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center bg-muted/50 rounded-2xl p-1 border border-border/40 shadow-sm">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleMonthChange("prev")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="px-6 min-w-[160px] text-center">
            <span className="text-sm font-black uppercase tracking-widest text-foreground">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleMonthChange("next")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowAddPurchaseDialog(true)} className="rounded-full h-10 px-5 font-bold gap-2">
            <ShoppingCart className="w-4 h-4" /> Compra Parcelada
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setFixedBillSelectorMode("current"); setShowFixedBillSelector(true); }} className="rounded-full h-10 px-5 font-bold gap-2">
            <Settings className="w-4 h-4" /> Gerenciar Fixas
          </Button>
          <Button onClick={() => { setFixedBillSelectorMode("future"); setShowFixedBillSelector(true); }} className="rounded-full h-10 px-6 font-bold gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Adiantar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-card rounded-[2.5rem] border border-border/40 shadow-sm">
        <BillsTrackerList 
          bills={combinedBills} 
          onUpdateBill={updateBill} 
          onDeleteBill={deleteBill} 
          onAddBill={(b) => setBillsTracker(prev => [...prev, { ...b, id: generateBillId(), type: 'tracker', isPaid: false, isExcluded: false }])} 
          onTogglePaid={handleTogglePaid} 
          currentDate={currentDate} 
        />
      </div>
    </div>
  );

  const renderMobileContent = () => (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Mobile Expressivo */}
      <div className="flex items-center justify-between bg-muted/30 p-2 rounded-[2rem] border border-border/40">
        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => handleMonthChange("prev")}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Período</p>
          <p className="text-lg font-black text-foreground capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => handleMonthChange("next")}>
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* KPIs Mobile em Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-[2rem] bg-destructive/5 border border-destructive/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-destructive/60 mb-1">A Pagar</p>
          <p className="text-xl font-black text-destructive">{formatCurrency(totalUnpaidBills)}</p>
        </div>
        <div className="p-5 rounded-[2rem] bg-success/5 border border-success/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-success/60 mb-1">Pago</p>
          <p className="text-xl font-black text-success">{formatCurrency(totalPaidBills)}</p>
        </div>
      </div>

      {/* Lista de Contas Mobile */}
      <div className="flex-1 overflow-hidden">
        <BillsTrackerMobileList 
          bills={combinedBills}
          onUpdateBill={updateBill}
          onDeleteBill={deleteBill}
          onAddBill={(b) => setBillsTracker(prev => [...prev, { ...b, id: generateBillId(), type: 'tracker', isPaid: false, isExcluded: false }])}
          onTogglePaid={handleTogglePaid}
          currentDate={currentDate}
        />
      </div>

      {/* FAB Mobile - Corrigido para não sobrepor e acionar corretamente */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[110]">
        <Button 
          size="icon" 
          className="h-12 w-12 rounded-2xl shadow-xl bg-accent text-accent-foreground"
          onClick={() => setShowAddPurchaseDialog(true)}
        >
          <ShoppingCart className="w-5 h-5" />
        </Button>
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-[1.25rem] shadow-2xl bg-primary text-primary-foreground"
          onClick={() => setShowNewBillModal(true)}
        >
          <Plus className="w-7 h-7" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile && open ? (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <header className="px-6 pt-8 pb-4 border-b shrink-0 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => onOpenChange(false)}>
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Contas a Pagar</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gestão de Fluxo</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-muted/50" onClick={() => { setFixedBillSelectorMode("current"); setShowFixedBillSelector(true); }}>
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-hidden relative">
            {renderMobileContent()}
          </main>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <ResizableDialogContent
            storageKey="bills_tracker_modal_v2"
            initialWidth={1300}
            initialHeight={850}
            minWidth={1000}
            minHeight={700}
            hideCloseButton={true}
            className="rounded-[3rem] bg-background border-none shadow-2xl p-0 overflow-hidden"
          >
            <div className="modal-viewport">
              <DialogHeader className="px-10 pt-10 pb-6 bg-background shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                      <CalendarCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-black tracking-tighter">Contas a Pagar</DialogTitle>
                      <p className="text-sm font-bold text-muted-foreground flex items-center gap-2 mt-1 uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-accent" />
                        Planejamento e Execução de Fluxo
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-black/5 transition-colors" onClick={() => onOpenChange(false)}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-[280px] shrink-0 border-r border-border/40 bg-surface-light dark:bg-surface-dark p-8">
                  <BillsSidebarKPIs
                    currentDate={currentDate}
                    totalPendingBills={totalUnpaidBills}
                    totalPaidBills={totalPaidBills}
                  />
                </div>
                <div className="flex-1 p-8 overflow-hidden bg-background">
                  {renderDesktopContent()}
                </div>
              </div>
            </div>
          </ResizableDialogContent>
        </Dialog>
      )}

      {/* Modais Auxiliares */}
      <FixedBillSelectorModal
        open={showFixedBillSelector}
        onOpenChange={setShowFixedBillSelector}
        mode={fixedBillSelectorMode}
        currentDate={currentDate}
        potentialFixedBills={fixedBillSelectorMode === "current" ? potentialFixedBills : futureFixedBills}
        onToggleFixedBill={handleToggleFixedBill}
      />
      
      <AddPurchaseInstallmentDialog
        open={showAddPurchaseDialog}
        onOpenChange={setShowAddPurchaseDialog}
        currentDate={currentDate}
      />

      {/* Modal de Nova Conta Otimizado para Mobile */}
      <Dialog open={showNewBillModal} onOpenChange={setShowNewBillModal}>
        <DialogContent className="max-w-[min(90vw,400px)] rounded-[2rem] p-6 sm:p-8 z-[120]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Nova Despesa</DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground text-xs">Lançamento avulso no planejamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Descrição</Label>
              <Input 
                placeholder="Ex: Manutenção Casa" 
                className="h-11 border-2 rounded-xl font-bold text-sm"
                value={newBillData.description}
                onChange={e => setNewBillData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor</Label>
                <Input 
                  placeholder="0,00" 
                  className="h-11 border-2 rounded-xl font-black text-base"
                  value={newBillData.amount}
                  onChange={e => {
                    const val = e.target.value.replace(/[^\d,]/g, "");
                    setNewBillData(prev => ({ ...prev, amount: val }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Vencimento</Label>
                <Input 
                  type="date" 
                  className="h-11 border-2 rounded-xl font-bold text-xs"
                  value={newBillData.dueDate}
                  onChange={e => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button 
              className="w-full h-12 rounded-xl font-black text-sm shadow-lg shadow-primary/20"
              onClick={handleAddAdHocBill}
            >
              ADICIONAR CONTA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}