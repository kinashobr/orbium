"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Check, Loader2, X, Sparkles, Filter, ChevronLeft, LayoutGrid } from "lucide-react";
import { 
  ContaCorrente, Categoria, ImportedTransaction, StandardizationRule, 
  TransacaoCompleta, generateTransactionId, generateTransferGroupId, 
  getDomainFromOperation, getFlowTypeFromOperation, DateRange,
  ImportedStatement,
  TransactionLinks
} from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { TransactionReviewTable } from "./TransactionReviewTable";
import { StandardizationRuleFormModal } from "./StandardizationRuleFormModal";
import { ReviewContextSidebar } from "./ReviewContextSidebar";
import { StandardizationRuleManagerModal } from "./StandardizationRuleManagerModal";
import { ResizableSidebar } from "./ResizableSidebar";
import { startOfMonth, endOfMonth, format, startOfDay, endOfDay } from "date-fns";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas: {
    numero: number;
    vencimento: string;
    valor: number;
    paga: boolean;
    transactionId?: string;
  }[];
  valorParcela: number;
  totalParcelas: number;
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
    standardizationRules,
    addStandardizationRule,
    deleteStandardizationRule,
    addTransacaoV2,
    updateImportedStatement,
    importedStatements,
    markLoanParcelPaid,
    addEmprestimo,
    addVeiculo,
    uncontabilizeImportedTransaction
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

  // Bloquear scroll do fundo no mobile
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
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
      return tx.categoryId || tx.isTransfer || tx.tempInvestmentId || tx.tempLoanId || tx.tempVehicleOperation || tx.operationType === 'liberacao_emprestimo';
    });
    
    if (txsToContabilize.length === 0) {
      toast.error("Categorize as transações antes de contabilizar.");
      return;
    }
    
    setLoading(true);
    const newTransactions: TransacaoCompleta[] = [];
    const updatedStatements = new Map<string, ImportedStatement>();
    const txToStatementMap = new Map<string, string>();
    importedStatements.forEach(s => s.rawTransactions.forEach(t => txToStatementMap.set(t.id, s.id)));

    txsToContabilize.forEach(tx => {
      const transactionId = generateTransactionId();
      let flow = getFlowTypeFromOperation(tx.operationType!, tx.tempVehicleOperation || undefined);
      const isCreditCard = accounts.find(a => a.id === tx.accountId)?.accountType === 'cartao_credito';
      if (isCreditCard) flow = tx.operationType === 'despesa' ? 'out' : 'in';

      const baseTx: TransacaoCompleta = {
        id: transactionId, date: tx.date, accountId: tx.accountId, flow, operationType: tx.operationType!, domain: getDomainFromOperation(tx.operationType!),
        amount: tx.amount, categoryId: tx.categoryId || null, description: tx.description, links: { investmentId: tx.tempInvestmentId || null, loanId: tx.tempLoanId || null, transferGroupId: null, parcelaId: tx.tempParcelaId || null, vehicleTransactionId: null },
        conciliated: true, attachments: [], meta: { createdBy: 'system', source: 'import', createdAt: new Date().toISOString(), originalDescription: tx.originalDescription, vehicleOperation: tx.operationType === 'veiculo' ? tx.tempVehicleOperation || undefined : undefined }
      };
      
      if (tx.isTransfer && tx.destinationAccountId) {
        const groupId = generateTransferGroupId();
        baseTx.links.transferGroupId = groupId;
        newTransactions.push({ ...baseTx, flow: 'transfer_out' });
        const toAcc = accounts.find(a => a.id === tx.destinationAccountId);
        newTransactions.push({ ...baseTx, id: generateTransactionId(), accountId: tx.destinationAccountId, flow: toAcc?.accountType === 'cartao_credito' ? 'in' : 'transfer_in', description: tx.description || `Transferência para ${toAcc?.name}`, links: { ...baseTx.links, transferGroupId: groupId }, conciliated: false });
      } else if (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') {
        const isApp = tx.operationType === 'aplicacao';
        const gid = `app_${Date.now()}`; baseTx.links.transferGroupId = gid;
        newTransactions.push(baseTx);
        newTransactions.push({ ...baseTx, id: generateTransactionId(), accountId: tx.tempInvestmentId!, flow: isApp ? 'in' : 'out', operationType: isApp ? 'aplicacao' : 'resgate', domain: 'investment', links: { ...baseTx.links, investmentId: baseTx.accountId }, conciliated: false });
      } else {
        newTransactions.push(baseTx);
        if (tx.operationType === 'liberacao_emprestimo') addEmprestimo({ contrato: tx.description, valorTotal: tx.amount, parcela: 0, meses: 0, taxaMensal: 0, status: 'pendente_config', liberacaoTransactionId: baseTx.id, contaCorrenteId: baseTx.accountId, dataInicio: baseTx.date });
        if (tx.operationType === 'pagamento_emprestimo' && tx.tempLoanId) markLoanParcelPaid(parseInt(tx.tempLoanId.replace('loan_', '')), tx.amount, tx.date, tx.tempParcelaId ? parseInt(tx.tempParcelaId) : undefined);
        if (tx.operationType === 'veiculo' && tx.tempVehicleOperation === 'compra') addVeiculo({ modelo: tx.description, marca: '', tipo: 'carro', ano: 0, dataCompra: tx.date, valorVeiculo: tx.amount, valorSeguro: 0, vencimentoSeguro: "", parcelaSeguro: 0, valorFipe: 0, compraTransactionId: baseTx.id, status: 'pendente_cadastro' });
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
    toast.success(`${txsToContabilize.length} transações processadas.`);
    onOpenChange(false);
  };
  
  const readyCount = useMemo(() => transactionsToReview.filter(tx => !tx.isPotentialDuplicate && (tx.categoryId || tx.isTransfer || tx.tempInvestmentId || tx.tempLoanId || tx.tempVehicleOperation || tx.operationType === 'liberacao_emprestimo')).length, [transactionsToReview]);
  const pendingCount = useMemo(() => transactionsToReview.filter(tx => !tx.isPotentialDuplicate && !(tx.categoryId || tx.isTransfer || tx.tempInvestmentId || tx.tempLoanId || tx.tempVehicleOperation || tx.operationType === 'liberacao_emprestimo')).length, [transactionsToReview]);

  const renderContent = () => (
    <div className="flex flex-1 overflow-hidden">
      {!isMobile && (
        <ResizableSidebar initialWidth={340} minWidth={280} maxWidth={420} storageKey="review_sidebar_width">
          <div className="h-full border-r border-border/40 dark:border-white/5">
            <ReviewContextSidebar
              accountId={accountId} statements={importedStatements.filter(s => s.accountId === accountId)}
              pendingCount={pendingCount} readyToContabilizeCount={readyCount} totalCount={transactionsToReview.length}
              reviewRange={reviewRange} onPeriodChange={r => setReviewRange(r.range1)} onApplyFilter={loadTransactions}
              onContabilize={handleContabilize} onClose={() => onOpenChange(false)} onManageRules={() => setShowRuleManagerModal(true)}
            />
          </div>
        </ResizableSidebar>
      )}

      <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-hidden bg-background dark:bg-[hsl(24_8%_10%)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">
                Lançamentos Pendentes
              </h3>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {transactionsToReview.length} transações encontradas
              </p>
            </div>
          </div>
          
          {isMobile && (
            <Button variant="outline" size="sm" className="h-10 rounded-full px-6 font-bold gap-2" onClick={() => setMobileView('filters')}>
              <Filter className="w-4 h-4" /> Filtros
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden bg-card dark:bg-[hsl(24_8%_14%)] rounded-[2.5rem] border border-border/40 dark:border-white/5 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
              <p className="font-black uppercase tracking-widest text-[10px]">Sincronizando dados...</p>
            </div>
          ) : transactionsToReview.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center text-success mb-6">
                <Check className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-black tracking-tight text-foreground mb-2">Tudo em ordem!</h4>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Não há transações pendentes de revisão para este período e conta.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <TransactionReviewTable
                transactions={transactionsToReview} accounts={accounts} categories={categories}
                investments={investments} loans={loans} onUpdateTransaction={handleUpdateTransaction} onCreateRule={handleCreateRule}
              />
            </ScrollArea>
          )}
        </div>

        {isMobile && transactionsToReview.length > 0 && (
          <div className="mt-6 shrink-0">
            <Button 
              onClick={handleContabilize} 
              disabled={readyCount === 0}
              className="w-full h-14 rounded-[1.5rem] font-black shadow-xl shadow-primary/20"
            >
              CONTABILIZAR {readyCount} ITENS
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isMobile && open ? (
        <div className="fixed inset-0 z-[100] bg-background dark:bg-[hsl(24_8%_10%)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <header className="px-6 pt-6 pb-4 border-b dark:border-white/5 shrink-0 bg-card dark:bg-[hsl(24_8%_14%)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={() => onOpenChange(false)}>
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Revisão</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{account?.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-primary/10 text-primary" onClick={() => setShowRuleManagerModal(true)}>
                <Sparkles className="w-6 h-6" />
              </Button>
            </div>
          </header>

          {mobileView === 'filters' ? (
            <div className="flex-1 p-6 bg-background dark:bg-[hsl(24_8%_10%)] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black uppercase tracking-widest text-sm">Ajustes de Período</h3>
                <Button variant="ghost" size="sm" className="font-bold" onClick={() => setMobileView('list')}>Voltar</Button>
              </div>
              <ReviewContextSidebar
                accountId={accountId} statements={importedStatements.filter(s => s.accountId === accountId)}
                pendingCount={pendingCount} readyToContabilizeCount={readyCount} totalCount={transactionsToReview.length}
                reviewRange={reviewRange} onPeriodChange={r => setReviewRange(r.range1)} onApplyFilter={() => { loadTransactions(); setMobileView('list'); }}
                onContabilize={handleContabilize} onClose={() => onOpenChange(false)} onManageRules={() => setShowRuleManagerModal(true)}
              />
            </div>
          ) : renderContent()}
        </div>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <ResizableDialogContent 
            storageKey="consolidated_review_modal"
            initialWidth={1400} initialHeight={900} minWidth={1000} minHeight={700} hideCloseButton={true}
            className="rounded-[3rem] bg-background dark:bg-[hsl(24_8%_10%)] border-none shadow-2xl p-0 overflow-hidden"
          >
            <div className="modal-viewport">
              <DialogHeader className="px-10 pt-10 pb-6 bg-background dark:bg-[hsl(24_8%_10%)] shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-black tracking-tighter">Painel de Revisão</DialogTitle>
                      <DialogDescription className="text-sm font-bold text-muted-foreground flex items-center gap-2 mt-1">
                        <Sparkles className="w-4 h-4 text-accent" />
                        {account?.name} • Inteligência de Extratos
                      </DialogDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-black/5 transition-colors" onClick={() => onOpenChange(false)}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </DialogHeader>

              {renderContent()}
            </div>
          </ResizableDialogContent>
        </Dialog>
      )}
      
      {/* Modais de Regras renderizados fora para evitar travamentos e garantir z-index */}
      <StandardizationRuleFormModal 
        open={showRuleModal} 
        onOpenChange={setShowRuleModal} 
        initialTransaction={txForRule} 
        categories={categories} 
        onSave={handleSaveRule} 
      />
      <StandardizationRuleManagerModal 
        open={showRuleManagerModal} 
        onOpenChange={(openState) => {
          setShowRuleManagerModal(openState);
          if (!openState && isMobile) {
            setMobileView('list'); // Volta para a lista de transações ao fechar o gerenciador de regras no mobile
          }
        }} 
        rules={standardizationRules} 
        onDeleteRule={deleteStandardizationRule} 
        categories={categories} 
        onCloseAndReturn={() => setMobileView('list')} // Garante que volta para a lista
      />
    </>
  );
}