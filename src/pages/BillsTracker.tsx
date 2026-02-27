import { useState, useMemo, useCallback, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { BillsTrackerList } from "@/components/bills/BillsTrackerList";
import { BillsSidebarKPIs } from "@/components/bills/BillsSidebarKPIs";
import { ManageCommitmentsModal } from "@/components/bills/ManageCommitmentsModal";
import { CashFlowTimeline } from "@/components/bills/CashFlowTimeline";
import { Button } from "@/components/ui/button";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  BillTracker, BillDisplayItem, generateBillId, TransactionLinks, OperationType 
} from "@/types/finance";
import { toast } from "sonner";

const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => bill.type === 'tracker';

export default function BillsTracker() {
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
  }, [invoiceSyncKey, setBillsTracker]);

  // Auto-populate fixed bills when month changes
  useEffect(() => {
    autoPopulateFixedBills(currentDate);
  }, [currentDate]);

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
        if (!paymentAccount) {
          toast.error("Configure a conta de pagamento do cartão.");
          return;
        }
        const txId = `bill_tx_${trackerBill.id}`;
        addTransacaoV2({
          id: txId, date: trackerBill.dueDate, accountId: paymentAccount.id, flow: 'out',
          operationType: 'despesa', domain: 'operational', amount: trackerBill.expectedAmount,
          categoryId: null, description: `Pagamento ${trackerBill.description}`,
          links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null },
          conciliated: true, attachments: [],
          meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() },
        });
        updateBill(trackerBill.id, { isPaid: true, paymentDate: trackerBill.dueDate, transactionId: txId });
        toast.success("Fatura paga e lançada!");
        return;
      }

      const account = contasMovimento.find(c => c.id === trackerBill.suggestedAccountId);
      const category = categoriasV2.find(c => c.id === trackerBill.suggestedCategoryId);
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
        operationType, domain: domain as any, amount: trackerBill.expectedAmount,
        categoryId: trackerBill.suggestedCategoryId || null, description,
        links: { investmentId: null, loanId: baseLinks.loanId || null, transferGroupId: null, parcelaId: baseLinks.parcelaId || null, vehicleTransactionId: baseLinks.vehicleTransactionId || null },
        conciliated: true, attachments: [],
        meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() },
      });
      updateBill(trackerBill.id, { isPaid: true, paymentDate: trackerBill.dueDate, transactionId });
      toast.success("Despesa paga e lançada!");
    } else {
      if (trackerBill.transactionId) {
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId));
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-xs md:text-base text-muted-foreground">Gerenciamento de despesas e parcelas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setIsManageModalOpen(true)} className="gap-2 text-xs md:text-sm h-8 md:h-10 px-3 md:px-4">
            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Gerenciar Compromissos</span><span className="sm:hidden">Gerenciar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6 p-6 rounded-2xl bg-card dark:bg-[hsl(24_8%_10%)] border border-border/40 dark:border-white/5">
          {/* M5: Pass combinedBills to KPIs */}
          <BillsSidebarKPIs 
            currentDate={currentDate}
            combinedBills={combinedBills}
            totalPendingBills={combinedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
            totalPaidBills={combinedBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
          />
          {/* M6: Cash Flow Timeline */}
          <CashFlowTimeline currentDate={currentDate} combinedBills={combinedBills} />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-center gap-4 bg-card dark:bg-[hsl(24_8%_14%)] p-4 rounded-xl border dark:border-white/5">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <BillsTrackerList 
            bills={combinedBills}
            onUpdateBill={updateBill}
            onDeleteBill={deleteBill}
            onAddBill={handleAddBill}
            onTogglePaid={handleTogglePaid}
            currentDate={currentDate}
          />
        </div>
      </div>

      <ManageCommitmentsModal
        open={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        currentDate={currentDate}
      />
    </div>
    </MainLayout>
  );
}