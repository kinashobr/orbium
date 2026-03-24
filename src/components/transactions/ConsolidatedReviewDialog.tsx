"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Check, Loader2, Sparkles, ChevronLeft, Settings2 } from "lucide-react";
import { 
  ContaCorrente, Categoria, ImportedTransaction, StandardizationRule, 
  TransacaoCompleta, generateTransactionId, generateTransferGroupId, 
  getDomainFromOperation, getFlowTypeFromOperation, DateRange,
  ImportedStatement
} from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { TransactionReviewTable } from "./TransactionReviewTable";
import { StandardizationRuleFormModal } from "./StandardizationRuleFormModal";
import { ReviewContextSidebar } from "./ReviewContextSidebar";
import { StandardizationRuleManagerModal } from "./StandardizationRuleManagerModal";
import { ResizableSidebar } from "./ResizableSidebar";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

interface LoanInfo {
  id: string;
  institution: string;
  parcelas: { numero: number; paga: boolean; }[];
}

interface InvestmentInfo {
  id: string;
  name: string;
}

interface ConsolidatedReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
}

export function ConsolidatedReviewDialog({
  open,
  onOpenChange,
  accountId,
  accounts,
  categories,
  investments,
  loans,
}: ConsolidatedReviewDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const {
    getTransactionsForReview,
    addStandardizationRule,
    addTransacaoV2,
    updateImportedStatement,
    importedStatements,
    markLoanParcelPaid,
    addEmprestimo,
    addVeiculo,
    uncontabilizeImportedTransaction,
    standardizationRules
  } = useFinance();
  
  const account = accounts.find(a => a.id === accountId);
  const [reviewRange, setReviewRange] = useState<DateRange>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  
  const [transactionsToReview, setTransactionsToReview] = useState<ImportedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [txForRule, setTxForRule] = useState<ImportedTransaction | null>(null);
  const [showRuleManagerModal, setShowRuleManagerModal] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'filters'>('list');

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobile, open]);

  const loadTransactions = useCallback(() => {
    if (!reviewRange.from || !reviewRange.to) {
      setTransactionsToReview([]);
      return;
    }
    setLoading(true);
    const consolidatedTxs = getTransactionsForReview(accountId, reviewRange);
    setTransactionsToReview(consolidatedTxs.map(tx => ({ ...tx })));
    setLoading(false);
  }, [accountId, reviewRange, getTransactionsForReview]);

  useEffect(() => { if (open) loadTransactions(); }, [open, loadTransactions]);
  
  const handleUpdateTransaction = useCallback((id: string, updates: Partial<ImportedTransaction>) => {
    setTransactionsToReview(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
  }, []);
  
  const handleCreateRule = (tx: ImportedTransaction) => { setTxForRule(tx); setShowRuleModal(true); };
  
  const handleSaveRule = (rule: Omit<StandardizationRule, "id">) => {
    addStandardizationRule(rule);
    toast.success("Regra aplicada!");
    loadTransactions();
  };

  const handleContabilize = () => {
    const txsToContabilize = transactionsToReview.filter(tx => {
      if (tx.isPotentialDuplicate) return false; 
      
      const basicCat = !!tx.categoryId;
      const isTransf = tx.operationType === 'transferencia' && !!tx.destinationAccountId;
      const isInvest = (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId;
      const isLoan = tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId && !!tx.tempParcelaId;
      const isLiberation = tx.operationType === 'liberacao_emprestimo';
      const isAsset = (tx.operationType === 'veiculo' || tx.operationType === 'imobilizado') && !!tx.tempAssetOperation;

      return basicCat || isTransf || isInvest || isLoan || isLiberation || isAsset;
    });
    
    if (txsToContabilize.length === 0) {
      toast.error("Nenhuma transação pronta para contabilização.");
      return;
    }
    
    setLoading(true);
    const newTransactions: TransacaoCompleta[] = [];
    const updatedStatements = new Map<string, ImportedStatement>();
    const txToStatementMap = new Map<string, string>();
    importedStatements.forEach(s => s.rawTransactions.forEach(t => txToStatementMap.set(t.id, s.id)));

    txsToContabilize.forEach(tx => {
      const transactionId = generateTransactionId();
      let flow = getFlowTypeFromOperation(
        tx.operationType!,
        tx.tempVehicleOperation || tx.tempAssetOperation || undefined
      );
      
      // Ajuste para fluxo de cartão de crédito
      const isCreditCard = accounts.find(a => a.id === tx.accountId)?.accountType === 'cartao_credito';
      if (isCreditCard) flow = tx.operationType === 'despesa' ? 'out' : 'in';

      const transferGroupId = (tx.isTransfer || tx.operationType === 'aplicacao' || tx.operationType === 'resgate') ? generateTransferGroupId() : null;

      const baseTx: TransacaoCompleta = {
        id: transactionId,
        date: tx.date,
        accountId: tx.accountId,
        flow,
        operationType: tx.operationType!,
        domain: getDomainFromOperation(tx.operationType!),
        amount: tx.amount,
        categoryId: tx.categoryId || null,
        description: tx.description,
        links: {
          investmentId: (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') ? tx.tempInvestmentId : tx.tempInvestmentId,
          loanId: tx.tempLoanId || null,
          transferGroupId,
          parcelaId: tx.tempParcelaId || null,
          vehicleTransactionId: null,
        },
        conciliated: true,
        attachments: [],
        meta: {
          createdBy: "system",
          source: "import",
          createdAt: new Date().toISOString(),
          originalDescription: tx.originalDescription,
          vehicleOperation: tx.operationType === "veiculo" ? tx.tempVehicleOperation || undefined : undefined,
          assetType: tx.tempAssetType,
          assetId: tx.tempAssetId,
          assetOperation: tx.tempAssetOperation,
        },
      };
      
      if (transferGroupId) {
        const targetId = tx.isTransfer ? tx.destinationAccountId : tx.tempInvestmentId;
        if (targetId && targetId !== tx.accountId) {
          newTransactions.push(baseTx);
          
          // Inverte o fluxo para a contrapartida
          const counterFlow = (flow === 'out' || flow === 'transfer_out') ? 'transfer_in' : 'transfer_out';
          const counterDomain = (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') ? 'investment' : baseTx.domain;

          newTransactions.push({ 
            ...baseTx, 
            id: generateTransactionId(), 
            accountId: targetId, 
            flow: counterFlow, 
            domain: counterDomain as any,
            description: tx.description || (tx.isTransfer ? "Transferência" : (tx.operationType === 'aplicacao' ? 'Aplicação' : 'Resgate')),
            links: { 
              ...baseTx.links, 
              investmentId: (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') ? baseTx.accountId : baseTx.links.investmentId 
            }, 
            conciliated: false 
          });
        } else {
          newTransactions.push(baseTx);
        }
      } else {
        newTransactions.push(baseTx);
        
        // Lógica de Ativos Específicos
        if (tx.operationType === 'liberacao_emprestimo') addEmprestimo({ contrato: tx.description, valorTotal: tx.amount, parcela: 0, meses: 0, taxaMensal: 0, status: 'ativo', liberacaoTransactionId: baseTx.id, contaCorrenteId: baseTx.accountId, dataInicio: baseTx.date });
        if (tx.operationType === 'pagamento_emprestimo' && tx.tempLoanId) markLoanParcelPaid(parseInt(tx.tempLoanId.replace('loan_', '')), tx.amount, tx.date, tx.tempParcelaId ? parseInt(tx.tempParcelaId) : undefined);
        if (tx.operationType === 'veiculo' && tx.tempVehicleOperation === 'compra') addVeiculo({ modelo: tx.description, marca: '', tipo: 'carro', ano: 0, dataCompra: tx.date, valorVeiculo: tx.amount, valorSeguro: 0, vencimentoSeguro: "", parcelaSeguro: 0, valorFipe: 0, compraTransactionId: baseTx.id, status: 'ativo' });
      }
      
      const sid = txToStatementMap.get(tx.id);
      if (sid) {
          if (!updatedStatements.has(sid)) updatedStatements.set(sid, { ...importedStatements.find(s => s.id === sid)! });
          const s = updatedStatements.get(sid)!;
          s.rawTransactions = s.rawTransactions.map(raw => raw.id === tx.id ? { ...raw, isContabilized: true, contabilizedTransactionId: transactionId } : raw);
      }
    });
    
    newTransactions.forEach(t => addTransacaoV2(t));
    updatedStatements.forEach(s => updateImportedStatement(s.id, { rawTransactions: s.rawTransactions, status: s.rawTransactions.filter(t => !t.isContabilized).length === 0 ? 'complete' : 'partial' }));
    
    setLoading(false);
    toast.success(`${txsToContabilize.length} lançamentos contabilizados.`);
    onOpenChange(false);
  };
  
   const readyCount = useMemo(
     () =>
       transactionsToReview.filter(
         (tx) => {
           if (tx.isPotentialDuplicate) return false;
           
           const basicCat = !!tx.categoryId;
           const isTransf = tx.operationType === 'transferencia' && !!tx.destinationAccountId;
           const isInvest = (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId;
           const isLoan = tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId && !!tx.tempParcelaId;
           const isLiberation = tx.operationType === 'liberacao_emprestimo';
           const isAsset = (tx.operationType === 'veiculo' || tx.operationType === 'imobilizado') && !!tx.tempAssetOperation;

           return basicCat || isTransf || isInvest || isLoan || isLiberation || isAsset;
         }
       ).length,
     [transactionsToReview]
   );

   const pendingCount = useMemo(
     () =>
       transactionsToReview.filter(
         (tx) =>
           !tx.isPotentialDuplicate &&
           !(tx.categoryId ||
             (tx.operationType === 'transferencia' && tx.destinationAccountId) ||
             ((tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && tx.tempInvestmentId) ||
             (tx.operationType === 'pagamento_emprestimo' && tx.tempLoanId && tx.tempParcelaId) ||
             (tx.operationType === 'veiculo' && tx.tempAssetOperation) ||
             (tx.operationType === 'imobilizado' && tx.tempAssetOperation) ||
             tx.operationType === "liberacao_emprestimo")
       ).length,
     [transactionsToReview]
   );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent 
          storageKey="consolidated_review_modal_v3"
          initialWidth={isMobile ? 100 : 1300} 
          initialHeight={isMobile ? 100 : 800} 
          minWidth={isMobile ? 100 : 900} 
          minHeight={isMobile ? 100 : 500} 
          hideCloseButton={true}
          fullscreen={isMobile}
          className={cn(
            "p-0 overflow-hidden flex flex-col shadow-2xl bg-background",
            !isMobile && "rounded-[2.5rem] border-none"
          )}
        >
          <div className="modal-viewport flex flex-col h-full overflow-hidden">
            <DialogHeader className={cn(
              "px-8 py-5 bg-card shrink-0 border-b border-border/40 relative z-20",
              isMobile && "pt-6 px-6"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isMobile ? (
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 -ml-2" onClick={() => onOpenChange(false)}>
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter">Revisão de Extrato</DialogTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-black text-[9px] uppercase px-2 py-0.5 rounded-lg">
                        {transactionsToReview.length} LANÇAMENTOS
                      </Badge>
                      {!isMobile && (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-accent" /> {account?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isMobile && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("rounded-full h-10 w-10", mobileView === 'filters' && "bg-primary/10 text-primary")}
                      onClick={() => setMobileView(mobileView === 'list' ? 'filters' : 'list')}
                    >
                      <Settings2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex overflow-hidden bg-muted/20">
              {!isMobile && (
                <ResizableSidebar initialWidth={280} minWidth={240} maxWidth={350} storageKey="review_sidebar_width_v3">
                  <ReviewContextSidebar
                    accountId={accountId} 
                    pendingCount={pendingCount} readyToContabilizeCount={readyCount} totalCount={transactionsToReview.length}
                    reviewRange={reviewRange} onPeriodChange={r => setReviewRange(r.range1)} onApplyFilter={loadTransactions}
                    onContabilize={handleContabilize} onClose={() => onOpenChange(false)} onManageRules={() => setShowRuleManagerModal(true)}
                  />
                </ResizableSidebar>
              )}

              <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {isMobile && mobileView === 'filters' ? (
                  <div className="flex-1 bg-card">
                    <ReviewContextSidebar
                      accountId={accountId} 
                      pendingCount={pendingCount} readyToContabilizeCount={readyCount} totalCount={transactionsToReview.length}
                      reviewRange={reviewRange} onPeriodChange={r => setReviewRange(r.range1)} onApplyFilter={() => { loadTransactions(); setMobileView('list'); }}
                      onContabilize={handleContabilize} onClose={() => onOpenChange(false)} onManageRules={() => setShowRuleManagerModal(true)}
                    />
                  </div>
                ) : (
                  <div className="flex-1 bg-card sm:rounded-tl-[2.5rem] border-l border-border/40 shadow-sm overflow-hidden flex flex-col">
                    {loading ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Filtrando dados...</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto scrollbar-material">
                        <div className="p-4 sm:p-6 min-w-full">
                          <TransactionReviewTable
                            transactions={transactionsToReview} accounts={accounts} categories={categories}
                            investments={investments} loans={loans} onUpdateTransaction={handleUpdateTransaction} onCreateRule={handleCreateRule}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isMobile && (
              <DialogFooter className="px-10 py-5 bg-card border-t border-border/40 shrink-0 relative z-20">
                <div className="flex items-center justify-between w-full">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    A listagem reflete as regras de automação aplicadas
                  </p>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground">FECHAR</Button>
                    <Button onClick={handleContabilize} disabled={readyCount === 0 || loading} className="rounded-full h-11 px-10 font-black text-xs gap-2 shadow-xl shadow-primary/20">
                      <Check className="w-4 h-4" /> CONTABILIZAR ({readyCount})
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            )}
            
            {isMobile && mobileView === 'list' && transactionsToReview.length > 0 && (
              <div className="p-4 bg-card border-t border-border/40 safe-area-bottom relative z-20">
                <Button onClick={handleContabilize} disabled={readyCount === 0 || loading} className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 gap-2">
                  <Check className="w-5 h-5" /> CONTABILIZAR ({readyCount})
                </Button>
              </div>
            )}
          </div>
        </ResizableDialogContent>
      </Dialog>
      
      <StandardizationRuleFormModal open={showRuleModal} onOpenChange={setShowRuleModal} initialTransaction={txForRule} categories={categories} onSave={handleSaveRule} />
      <StandardizationRuleManagerModal open={showRuleManagerModal} onOpenChange={(s) => { setShowRuleManagerModal(s); if (!s && isMobile) setMobileView('list'); }} rules={standardizationRules} onDeleteRule={() => {}} categories={categories} />
    </>
  );
}