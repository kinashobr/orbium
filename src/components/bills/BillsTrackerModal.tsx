"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsTrackerMobileList } from "./BillsTrackerMobileList";
import { BillsSidebarKPIs } from "./BillsSidebarKPIs";
import { ManageCommitmentsModal } from "./ManageCommitmentsModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  CalendarCheck, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Settings,
  Zap,
} from "lucide-react";
import { 
  BillTracker, 
  formatCurrency, 
  generateBillId, 
  TransactionLinks, 
  OperationType, 
  BillDisplayItem 
} from "@/types/finance";
import { format, startOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn, parseDateLocal } from "@/lib/utils";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
    generateInvoiceBills,
    creditCardConfigs,
    autoPopulateFixedBills,
  } = useFinance();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [showManageCommitments, setShowManageCommitments] = useState(false);
  const [showNewBillModal, setShowNewBillModal] = useState(false);

  const [newBillData, setNewBillData] = useState({
    description: "",
    amount: "0,00",
    dueDate: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobile, open]);

  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  const externalPaidBills = useMemo(() => getOtherPaidExpensesForMonth(currentDate), [getOtherPaidExpensesForMonth, currentDate]);
  const invoiceBills = useMemo(() => generateInvoiceBills(currentDate), [generateInvoiceBills, currentDate]);
  
  useEffect(() => {
    if (invoiceBills.length > 0) {
      setBillsTracker(prev => {
        const existingIds = new Set(prev.map(b => b.id));
        const toAdd = invoiceBills.filter(b => !existingIds.has(b.id));
        let hasChanges = toAdd.length > 0;
        const updated = prev.map(existing => {
          const matchingInvoice = invoiceBills.find(ib => ib.id === existing.id);
          if (matchingInvoice && matchingInvoice.isPaid && !existing.isPaid) {
            hasChanges = true;
            return { ...existing, isPaid: true, paymentDate: matchingInvoice.paymentDate, transactionId: matchingInvoice.transactionId };
          }
          return existing;
        });
        return hasChanges ? (toAdd.length > 0 ? [...updated, ...toAdd] : updated) : prev;
      });
    }
  }, [invoiceBills, setBillsTracker]);

  // Auto-populate fixed bills when month changes
  useEffect(() => {
    autoPopulateFixedBills(currentDate);
  }, [currentDate]);

  const combinedBills: BillDisplayItem[] = useMemo(() => {
    const trackerPaidTxIds = new Set(trackerManagedBills.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
    const externalBills: BillDisplayItem[] = externalPaidBills.filter(eb => !trackerPaidTxIds.has(eb.id));
    return [...trackerManagedBills, ...externalBills];
  }, [trackerManagedBills, externalPaidBills]);

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
    if (!isBillTracker(bill)) return;
    const trackerBill = bill as BillTracker;
    
    if (isChecked) {
      const isCardInvoice = trackerBill.sourceType === 'card_invoice';
      if (isCardInvoice) {
        const cardConfig = creditCardConfigs.find(c => c.id === trackerBill.cardId);
        const paymentAccountId = cardConfig?.defaultPaymentAccountId || trackerBill.suggestedAccountId;
        const paymentAccount = contasMovimento.find(c => c.id === paymentAccountId);
        if (!paymentAccount) { toast.error("Configure a conta de pagamento do cartão."); return; }
        const cardAccount = contasMovimento.find(c => c.id === cardConfig?.accountId);
        if (!cardAccount) { toast.error("Conta do cartão não encontrada."); return; }
        const transferGroupId = `invoice_transfer_${trackerBill.id}_${Date.now()}`;
        addTransacaoV2({ id: `bill_tx_src_${trackerBill.id}`, date: trackerBill.dueDate, accountId: paymentAccount.id, flow: 'transfer_out', operationType: 'transferencia', domain: 'operational', amount: trackerBill.expectedAmount, categoryId: null, description: `Pagamento ${trackerBill.description}`, links: { investmentId: null, loanId: null, transferGroupId, parcelaId: null, vehicleTransactionId: null }, conciliated: true, attachments: [], meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() } });
        addTransacaoV2({ id: `bill_tx_dest_${trackerBill.id}`, date: trackerBill.dueDate, accountId: cardAccount.id, flow: 'transfer_in', operationType: 'transferencia', domain: 'operational', amount: trackerBill.expectedAmount, categoryId: null, description: `Pagamento ${trackerBill.description}`, links: { investmentId: null, loanId: null, transferGroupId, parcelaId: null, vehicleTransactionId: null }, conciliated: true, attachments: [], meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() } });
        updateBill(trackerBill.id, { isPaid: true, paymentDate: trackerBill.dueDate, transactionId: transferGroupId });
        toast.success("Fatura paga via transferência!");
        return;
      }
      const account = contasMovimento.find(c => c.id === trackerBill.suggestedAccountId);
      const category = categoriasV2.find(c => c.id === trackerBill.suggestedCategoryId);
      const isLoan = trackerBill.sourceType === 'loan_installment';
      if (!account || (!category && !isLoan)) { toast.error("Configure conta e categoria antes de pagar."); return; }
      const transactionId = `bill_tx_${trackerBill.id}`;
      const baseLinks: Partial<TransactionLinks> = {};
      let description = trackerBill.description;
      const operationType: OperationType = trackerBill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa';
      const domain = trackerBill.sourceType === 'loan_installment' ? 'financing' : 'operational';
      if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        const loanId = parseInt(trackerBill.sourceRef);
        baseLinks.loanId = `loan_${loanId}`; baseLinks.parcelaId = String(trackerBill.parcelaNumber);
        const loan = emprestimos.find(e => e.id === loanId);
        description = `Pagamento Empréstimo ${loan?.contrato || 'N/A'} - P${trackerBill.parcelaNumber}/${loan?.meses || 'N/A'}`;
        markLoanParcelPaid(loanId, trackerBill.expectedAmount, trackerBill.dueDate, trackerBill.parcelaNumber);
      }
      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        baseLinks.vehicleTransactionId = `${trackerBill.sourceRef}_${trackerBill.parcelaNumber}`;
        markSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber, transactionId);
      }
      addTransacaoV2({ id: transactionId, date: trackerBill.dueDate, accountId: account.id, flow: 'out', operationType, domain: domain as any, amount: trackerBill.expectedAmount, categoryId: trackerBill.suggestedCategoryId || null, description, links: { investmentId: null, loanId: baseLinks.loanId || null, transferGroupId: null, parcelaId: baseLinks.parcelaId || null, vehicleTransactionId: baseLinks.vehicleTransactionId || null }, conciliated: true, attachments: [], meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() } });
      updateBill(trackerBill.id, { isPaid: true, paymentDate: trackerBill.dueDate, transactionId });
      toast.success("Despesa paga e lançada!");
    } else {
      if (trackerBill.transactionId) {
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId && t.links?.transferGroupId !== trackerBill.transactionId && t.id !== `bill_tx_src_${trackerBill.id}` && t.id !== `bill_tx_dest_${trackerBill.id}`));
      }
      if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef) { unmarkLoanParcelPaid(parseInt(trackerBill.sourceRef)); }
      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) { unmarkSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber); }
      updateBill(trackerBill.id, { isPaid: false, paymentDate: undefined, transactionId: undefined });
      toast.info("Pagamento desfeito.");
    }
  }, [contasMovimento, categoriasV2, emprestimos, addTransacaoV2, updateBill, setTransacoesV2, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, creditCardConfigs]);

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setNewBillData(prev => ({ ...prev, amount: "0,00" })); return; }
    const val = parseInt(digits) / 100;
    setNewBillData(prev => ({ ...prev, amount: val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
  };

  const handleAddAdHocBill = () => {
    const amount = parseFloat(newBillData.amount.replace(/\./g, "").replace(",", "."));
    if (!newBillData.description || isNaN(amount) || amount <= 0 || !newBillData.dueDate) { toast.error("Preencha todos os campos corretamente."); return; }
    setBillsTracker(prev => [...prev, { id: generateBillId(), type: 'tracker', description: newBillData.description, dueDate: newBillData.dueDate, expectedAmount: amount, sourceType: "ad_hoc", suggestedAccountId: contasMovimento.find(c => c.accountType === "corrente")?.id, suggestedCategoryId: null, isPaid: false, isExcluded: false }]);
    setNewBillData({ description: "", amount: "0,00", dueDate: format(currentDate, "yyyy-MM-dd") });
    setShowNewBillModal(false);
    toast.success("Adicionado!");
  };
  
  const handleAddBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid" | "type">) => {
    setBillsTracker(prev => [...prev, { ...bill, id: generateBillId(), type: 'tracker', isPaid: false, isExcluded: false }]);
  }, [setBillsTracker]);

  if (isMobile && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton fullscreen className="p-0 flex flex-col">
          <header className="shrink-0 bg-card border-b px-6 pb-4 shadow-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => onOpenChange(false)}><ArrowLeft className="w-6 h-6" /></Button>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Contas a Pagar</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fluxo Mensal</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-muted/50" onClick={() => setShowManageCommitments(true)}><Settings className="w-5 h-5" /></Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-y-auto hide-scrollbar-mobile">
            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between bg-muted/30 p-2 rounded-[2rem] border border-border/40">
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => handleMonthChange("prev")}><ChevronLeft className="w-6 h-6" /></Button>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Período</p>
                  <p className="text-lg font-black text-foreground capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => handleMonthChange("next")}><ChevronRight className="w-6 h-6" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[2rem] bg-destructive/5 border border-destructive/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-destructive/60 mb-1">A Pagar</p>
                  <p className="text-xl font-black text-destructive tabular-nums">{formatCurrency(totalUnpaidBills)}</p>
                </div>
                <div className="p-5 rounded-[2rem] bg-success/5 border border-success/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-success/60 mb-1">Pago</p>
                  <p className="text-xl font-black text-success tabular-nums">{formatCurrency(totalPaidBills)}</p>
                </div>
              </div>
              <div className="pb-32">
                <BillsTrackerMobileList bills={combinedBills} onTogglePaid={handleTogglePaid} onUpdateBill={updateBill} onDeleteBill={deleteBill} onAddBill={handleAddBill} currentDate={currentDate} />
              </div>
              <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-[60]">
                <Button size="icon" className="h-14 w-14 rounded-[1.25rem] shadow-2xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all" onClick={() => setShowNewBillModal(true)}><Plus className="w-7 h-7" /></Button>
              </div>
            </div>
          </main>
          <ManageCommitmentsModal open={showManageCommitments} onOpenChange={setShowManageCommitments} currentDate={currentDate} />
        </DialogContent>
      </Dialog>
    );
  }

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent
          storageKey="bills_tracker_modal_v3"
          initialWidth={1100} initialHeight={850} minWidth={1000} minHeight={600} hideCloseButton={true}
          className="rounded-[3rem] bg-card border-none shadow-2xl p-0 overflow-hidden"
        >
          <div className="modal-viewport flex flex-col h-full">
            <DialogHeader className="px-8 pt-8 pb-6 bg-card shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                    <CalendarCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tighter">Contas a Pagar</DialogTitle>
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2 mt-0.5 uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-primary" /> Planejamento e Fluxo
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-1 justify-center sm:justify-end gap-3">
                  <div className="flex items-center bg-muted/40 rounded-full p-1 border border-border/40 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleMonthChange("prev")}><ChevronLeft className="w-4 h-4" /></Button>
                    <div className="px-4 min-w-[140px] text-center"><span className="text-[11px] font-black uppercase tracking-widest text-foreground">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</span></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleMonthChange("next")}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                  <Button onClick={() => setShowManageCommitments(true)} className="rounded-full h-10 px-6 font-black text-[11px] uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"><Settings className="w-4 h-4" /> Gerenciar Compromissos</Button>
                </div>
              </div>
            </DialogHeader>

            {/* ESTRUTURA UNIFICADA: Removido o container intermediário que causava a "caixa dentro de caixa" */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <aside className="w-[280px] shrink-0 border-r border-border/40 bg-card p-6 flex flex-col h-full overflow-hidden">
                <BillsSidebarKPIs currentDate={currentDate} combinedBills={combinedBills} totalPendingBills={totalUnpaidBills} totalPaidBills={totalPaidBills} />
              </aside>
              <main className="flex-1 flex flex-col min-h-0 bg-muted/5 dark:bg-card">
                <BillsTrackerList 
                  bills={combinedBills} onUpdateBill={updateBill} onDeleteBill={deleteBill} 
                  onAddBill={handleAddBill} 
                  onTogglePaid={handleTogglePaid} currentDate={currentDate} 
                />
              </main>
            </div>

            <DialogFooter className="p-6 bg-muted/10 border-t shrink-0">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
            </DialogFooter>
          </div>
        </ResizableDialogContent>
      </Dialog>
      <ManageCommitmentsModal open={showManageCommitments} onOpenChange={setShowManageCommitments} currentDate={currentDate} />
      <Dialog open={showNewBillModal} onOpenChange={setShowNewBillModal}>
        <DialogContent hideCloseButton className="max-w-[400px] rounded-[2rem] p-0 overflow-hidden z-[120]">
          <DialogHeader className="p-6 bg-muted/50 border-b"><DialogTitle className="text-xl font-black tracking-tight">Nova Despesa</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Descrição</Label><Input placeholder="Ex: Manutenção" className="h-11 border-2 rounded-xl font-bold" value={newBillData.description} onChange={e => setNewBillData(prev => ({ ...prev, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor</Label><Input type="text" inputMode="numeric" placeholder="0,00" className="h-11 border-2 rounded-xl font-black" value={newBillData.amount} onChange={e => handleAmountChange(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Vencimento</Label><Input type="date" className="h-11 border-2 rounded-xl font-bold" value={newBillData.dueDate} onChange={e => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/10 border-t flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setShowNewBillModal(false)} className="rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground order-2 sm:order-1">FECHAR</Button>
            <Button className="flex-1 h-12 rounded-xl font-black order-1 sm:order-2" onClick={handleAddAdHocBill}>ADICIONAR CONTA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}