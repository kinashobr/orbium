import { useState, useMemo, useCallback, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { BillsTrackerList } from "@/components/bills/BillsTrackerList";
import { BillsTrackerMobileList } from "@/components/bills/BillsTrackerMobileList";
import { BillsSidebarKPIs } from "@/components/bills/BillsSidebarKPIs";
import { ManageCommitmentsModal } from "@/components/bills/ManageCommitmentsModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

import { CashFlowTimeline } from "@/components/bills/CashFlowTimeline";
import { Button } from "@/components/ui/button";
import { Settings, ChevronLeft, ChevronRight, CalendarCheck, Activity, ArrowLeft } from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { 
  BillTracker, BillDisplayItem, generateBillId, TransactionLinks, OperationType, generateTransactionId, generateTransferGroupId, TransactionDomain 
} from "@/types/finance";
import { toast } from "sonner";

const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => bill.type === 'tracker';

export default function BillsTracker() {
  const navigate = useNavigate();
  const { 
    getBillsForMonth, 
    updateBill,
    deleteBill,
    setBillsTracker,
    getOtherPaidExpensesForMonth,
    generateInvoiceBills,
    contasMovimento,
    addTransacaoV2,
    setTransacoesV2,
    categoriasV2,
    emprestimos,
    markSeguroParcelPaid,
    markLoanParcelPaid,
    unmarkSeguroParcelPaid,
    unmarkLoanParcelPaid,
    creditCardConfigs,
    autoPopulateFixedBills,
  } = useFinance();

  const isLargeScreen = useMediaQuery("(min-width: 900px)");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  

  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  const externalPaidBills = useMemo(() => getOtherPaidExpensesForMonth(currentDate), [getOtherPaidExpensesForMonth, currentDate]);
  const invoiceBills = useMemo(() => generateInvoiceBills(currentDate), [generateInvoiceBills, currentDate]);
  
  const trackerBillIds = useMemo(() => new Set(trackerManagedBills.map(b => b.id)), [trackerManagedBills]);
  const newInvoiceBills = useMemo(() => invoiceBills.filter(b => !trackerBillIds.has(b.id)), [invoiceBills, trackerBillIds]);

  // Persist generated invoice bills and sync existing unpaid amounts
  const invoiceSyncKey = useMemo(() =>
    invoiceBills.map(b => `${b.id}:${b.expectedAmount}:${b.isPaid}`).join('|'),
    [invoiceBills]
  );

  useEffect(() => {
    if (invoiceBills.length === 0) return;

    setBillsTracker(prev => {
      let updated = false;
      const next = [...prev];
      const existingIds = new Set(prev.map(b => b.id));

      invoiceBills.forEach(invBill => {
        const existingIdx = next.findIndex(b => b.id === invBill.id);
        
        if (existingIdx === -1) {
          // Add new
          next.push(invBill);
          updated = true;
        } else {
          // Sync existing if UNPAID and amount changed
          const existing = next[existingIdx];
          if (!existing.isPaid && existing.expectedAmount !== invBill.expectedAmount) {
            next[existingIdx] = { ...existing, expectedAmount: invBill.expectedAmount };
            updated = true;
          }
          // Also sync payment status if it was detected in context (e.g. transfer detected)
          if (!existing.isPaid && invBill.isPaid) {
            next[existingIdx] = {
              ...existing,
              isPaid: true,
              paymentDate: invBill.paymentDate,
              transactionId: invBill.transactionId
            };
            updated = true;
          }
        }
      });

      return updated ? next : prev;
    });
  }, [invoiceSyncKey, setBillsTracker, invoiceBills]);

  // Auto-populate fixed bills when month changes
  useEffect(() => {
    autoPopulateFixedBills(currentDate);
  }, [currentDate, autoPopulateFixedBills]);

  const combinedBills: BillDisplayItem[] = useMemo(() => {
    // Use fresh invoice amounts for unpaid tracker bills
    const syncedTrackerBills = trackerManagedBills.map(b => {
      if (b.type === 'tracker' && b.sourceType === 'card_invoice' && !b.isPaid) {
        const freshInvoice = invoiceBills.find(inv => inv.id === b.id);
        if (freshInvoice && freshInvoice.expectedAmount !== b.expectedAmount) {
          return { ...b, expectedAmount: freshInvoice.expectedAmount };
        }
      }
      return b;
    });

    const trackerPaidTxIds = new Set(syncedTrackerBills.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
    const filtered = externalPaidBills.filter(eb => !trackerPaidTxIds.has(eb.id));
    return [...syncedTrackerBills, ...newInvoiceBills, ...filtered];
  }, [trackerManagedBills, newInvoiceBills, externalPaidBills, invoiceBills]);

  // M5: Full onTogglePaid implementation (same logic as modal)
  const handleTogglePaid = useCallback((bill: BillDisplayItem, isChecked: boolean) => {
    if (!isBillTracker(bill)) return;
    const trackerBill = bill as BillTracker;
    
    if (isChecked) {
      // M2: Card invoice special handling
      const isCardInvoice = trackerBill.sourceType === 'card_invoice';
      if (isCardInvoice) {
        const cardConfig = creditCardConfigs.find(c => c.id === trackerBill.cardId);
        const paymentAccountId = cardConfig?.defaultPaymentAccountId || trackerBill.suggestedAccountId;
        const paymentAccount = contasMovimento.find(c => c.id === paymentAccountId);
        const cardAccount = contasMovimento.find(c => c.id === cardConfig?.accountId);
        
        if (!paymentAccount || !cardAccount) {
          toast.error("Configure as contas de pagamento e do cartão.");
          return;
        }

        const transferGroupId = generateTransferGroupId();
        
        const txSrc = { 
          id: generateTransactionId(), 
          date: trackerBill.dueDate, 
          accountId: paymentAccount.id, 
          flow: 'transfer_out' as const, 
          operationType: 'transferencia' as const, 
          domain: 'operational' as const, 
          amount: trackerBill.expectedAmount, 
          categoryId: null, 
          description: `Pagamento ${trackerBill.description}`, 
          links: { investmentId: null, loanId: null, transferGroupId, parcelaId: null, vehicleTransactionId: null }, 
          conciliated: true, 
          attachments: [], 
          meta: { createdBy: 'system', source: 'bill_tracker' as const, createdAt: new Date().toISOString() } 
        };

        const txDest = { 
          id: generateTransactionId(), 
          date: trackerBill.dueDate, 
          accountId: cardAccount.id, 
          flow: 'in' as const, 
          operationType: 'transferencia' as const, 
          domain: 'operational' as const, 
          amount: trackerBill.expectedAmount, 
          categoryId: null, 
          description: `Pagamento ${trackerBill.description}`, 
          links: { investmentId: null, loanId: null, transferGroupId, parcelaId: null, vehicleTransactionId: null }, 
          conciliated: false, 
          attachments: [], 
          meta: { createdBy: 'system', source: 'bill_tracker' as const, createdAt: new Date().toISOString() } 
        };

        setTransacoesV2(prev => [...prev, txSrc, txDest]);
        updateBill(trackerBill.id, { isPaid: true, paymentDate: trackerBill.dueDate, transactionId: transferGroupId });
        toast.success("Fatura paga via transferência!");
        return;
      }

      const account = contasMovimento.find(c => c.id === trackerBill.suggestedAccountId);
      let categoryId = trackerBill.suggestedCategoryId;

      // Se não houver categoria sugerida, tenta auto-detectar para seguros
      if (!categoryId && trackerBill.description.toLowerCase().includes('seguro')) {
        const insuranceCategory = categoriasV2.find(c => c.label.toLowerCase().includes('seguro'));
        if (insuranceCategory) {
          categoryId = insuranceCategory.id;
        }
      }

      const category = categoriasV2.find(c => c.id === categoryId);
      const isLoan = trackerBill.sourceType === 'loan_installment';
      
      if (!account || (!category && !isLoan)) {
        toast.error("Configure conta e categoria antes de pagar.");
        return;
      }
      const transactionId = `bill_tx_${trackerBill.id}`;
      const baseLinks: Partial<TransactionLinks> = {};
      let description = trackerBill.description;
      const operationType: OperationType = isLoan ? 'pagamento_emprestimo' : 'despesa';
      const domain = isLoan ? 'financing' : 'operational';

      if (isLoan && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        const loanId = parseInt(trackerBill.sourceRef);
        baseLinks.loanId = `loan_${loanId}`;
        baseLinks.parcelaId = String(trackerBill.parcelaNumber);
        const loan = emprestimos.find(e => e.id === loanId);
        description = `Pagamento Empréstimo ${loan?.contrato || 'N/A'} - P${trackerBill.parcelaNumber}/${loan?.meses || 'N/A'}`;
        markLoanParcelPaid(loanId, trackerBill.expectedAmount, trackerBill.dueDate, trackerBill.parcelaNumber);
      }

      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        baseLinks.vehicleTransactionId = `${trackerBill.sourceRef}_${trackerBill.parcelaNumber}`;
        markSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber, transactionId);
      }

      addTransacaoV2({
        id: transactionId, date: trackerBill.dueDate, accountId: account.id, flow: 'out',
        operationType, domain: domain as TransactionDomain, amount: trackerBill.expectedAmount,
        categoryId: categoryId || null, description,
        links: { investmentId: null, loanId: baseLinks.loanId || null, transferGroupId: null, parcelaId: baseLinks.parcelaId || null, vehicleTransactionId: baseLinks.vehicleTransactionId || null },
        conciliated: true, attachments: [],
        meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() },
      });
      updateBill(trackerBill.id, { isPaid: true, paymentDate: trackerBill.dueDate, transactionId });
      toast.success("Despesa paga e lançada!");
    } else {
      if (trackerBill.transactionId) {
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId && t.links?.transferGroupId !== trackerBill.transactionId));
      }
      if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef) {
        unmarkLoanParcelPaid(parseInt(trackerBill.sourceRef));
      }
      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        unmarkSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber);
      }
      updateBill(trackerBill.id, { isPaid: false, paymentDate: undefined, transactionId: undefined });
      toast.info("Pagamento desfeito.");
    }
  }, [contasMovimento, categoriasV2, emprestimos, creditCardConfigs, addTransacaoV2, updateBill, setTransacoesV2, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid]);

  const handleAddBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid" | "type">) => {
    setBillsTracker(prev => [...prev, { ...bill, id: generateBillId(), type: 'tracker', isPaid: false, isExcluded: false }]);
  }, [setBillsTracker]);

  return (
    <MainLayout>
      <div className="space-y-5 pb-2 w-full max-w-full overflow-hidden">
        {/* Header - Orbium / Movimentação Consistency */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 animate-fade-in w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/10 ring-2 ring-primary/10">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl md:text-2xl leading-none tracking-tight">Contas a Pagar</h1>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wide mt-0.5 uppercase">Gestão de Compromissos</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-start md:justify-end">
            {/* Consistent Tonal Month Selector */}
            <div className="flex items-center h-10 bg-card/50 backdrop-blur-sm rounded-full border border-border/40 px-1.5 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors" 
                onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold uppercase tracking-wider px-3 min-w-[130px] md:min-w-[140px] text-center text-foreground/80 select-none capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors" 
                onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Manage Commitments Button */}
            <Button 
              onClick={() => setIsManageModalOpen(true)} 
              variant="outline"
              className="h-10 rounded-full gap-2 px-4 border-border/40 bg-card/50 backdrop-blur-sm text-xs font-bold hover:bg-muted/40 transition-colors"
            >
              <Settings className="w-4 h-4 text-primary" />
              <span>Gerenciar Compromissos</span>
            </Button>
          </div>
        </header>

        {/* Desktop Top Summary Dashboard (Unified Compact Dashboard) */}
        {isLargeScreen && (
          <div className="bg-card rounded-[1.25rem] border border-border/40 p-5 px-6 shadow-sm w-full animate-fade-in shrink-0">
            <div className="grid grid-cols-12 gap-5 items-center">
              {/* Left Part: KPIs Grid (8 columns for compact vertical flow) */}
              <div className="col-span-8">
                <BillsSidebarKPIs 
                  currentDate={currentDate}
                  combinedBills={combinedBills}
                  totalPendingBills={combinedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
                  totalPaidBills={combinedBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
                  layout="horizontal"
                />
              </div>

              {/* Right Part: Cash Flow Timeline (4 columns for much better readability) */}
              <div className="col-span-4 border-l border-border/40 pl-6">
                <CashFlowTimeline currentDate={currentDate} combinedBills={combinedBills} isCompact={true} />
              </div>
            </div>
          </div>
        )}

        {/* Main Bills List with Dual View Mode for Responsiveness */}
        <div className="w-full min-w-0 max-w-full">
          {/* Desktop / Tablet list view */}
          <div className={cn("bg-card rounded-[2rem] border border-border/40 dark:border-white/5 p-2 shadow-sm w-full overflow-hidden", isLargeScreen ? "block" : "hidden")}>
            <BillsTrackerList 
              bills={combinedBills}
              onUpdateBill={updateBill}
              onDeleteBill={deleteBill}
              onAddBill={handleAddBill}
              onTogglePaid={handleTogglePaid}
              currentDate={currentDate}
            />
          </div>

          {/* Mobile card list view */}
          <div className={cn(isLargeScreen ? "hidden" : "block")}>
            <BillsTrackerMobileList 
              bills={combinedBills}
              onUpdateBill={updateBill}
              onDeleteBill={deleteBill}
              onAddBill={handleAddBill}
              onTogglePaid={handleTogglePaid}
              currentDate={currentDate}
            />
          </div>
        </div>

        {/* Floating Action Button (FAB) for Mobile Summary */}
        {!isLargeScreen && (
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 hover:scale-105 transition-all"
            title="Ver Resumo"
          >
            <Activity className="w-5 h-5" />
          </button>
        )}

        {/* Floating Summary Drawer on Mobile & Tablet */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="right" className="w-[320px] sm:w-[380px] p-6 dark:bg-[hsl(24_8%_10%)] overflow-y-auto border-l border-border/40">
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-black tracking-tight text-foreground">Resumo do Mês</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Visão Consolidada</p>
              </div>
              <BillsSidebarKPIs 
                currentDate={currentDate}
                combinedBills={combinedBills}
                totalPendingBills={combinedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
                totalPaidBills={combinedBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
              />
              <CashFlowTimeline currentDate={currentDate} combinedBills={combinedBills} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Manage Commitments Dialog */}
        <ManageCommitmentsModal
          open={isManageModalOpen}
          onOpenChange={setIsManageModalOpen}
          currentDate={currentDate}
        />

        {/* Footer - Consistent with Review Dialog */}
        <footer className="border-t border-border/40 pt-4 px-1 shrink-0 relative z-20">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="h-10 px-4 rounded-full bg-primary/5 border-primary/20 text-primary font-black text-[10px] uppercase tracking-wider flex items-center justify-center">
                {combinedBills.length} Compromissos
              </Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 hidden md:inline">
                {combinedBills.filter(b => b.isPaid).length} Pagos • {combinedBills.filter(b => !b.isPaid).length} Pendentes
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate("/receitas-despesas")} 
                className="rounded-full h-10 px-6 font-black text-[10.5px] uppercase tracking-widest text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 active:scale-95 transition-all gap-1.5 border-border/60 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                VOLTAR
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </MainLayout>
  );
}