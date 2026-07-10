"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { FileText, Check, Loader2, Settings2, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { 
  ImportedTransaction, StandardizationRule, 
  TransacaoCompleta, generateTransactionId, generateTransferGroupId, 
  getDomainFromOperation, getFlowTypeFromOperation, DateRange,
  ImportedStatement, ComparisonDateRanges, TransactionDomain
} from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { TransactionReviewTable } from "@/components/transactions/TransactionReviewTable";
import { StandardizationRuleFormModal } from "@/components/transactions/StandardizationRuleFormModal";
import { StandardizationRuleManagerModal } from "@/components/transactions/StandardizationRuleManagerModal";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function RevisaoExtrato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("accountId") || "";

  const {
    contasMovimento: accounts,
    categoriasV2: categories,
    emprestimos,
    getTransactionsForReview,
    addStandardizationRule,
    addTransacaoV2,
    updateImportedStatement,
    importedStatements,
    markLoanParcelPaid,
    addEmprestimo,
    addVeiculo,
    standardizationRules
  } = useFinance();
  
  const account = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);

  const investments = useMemo(() => {
    return accounts
      .filter(c => ['renda_fixa', 'poupanca', 'reserva', 'objetivo'].includes(c.accountType))
      .map(i => ({ id: i.id, name: i.name }));
  }, [accounts]);

  const loans = useMemo(() => {
    return emprestimos.map(e => ({
      id: `loan_${e.id}`,
      institution: e.contrato,
      numeroContrato: e.contrato,
      parcelas: [],
      valorParcela: e.parcela,
      totalParcelas: e.meses,
    }));
  }, [emprestimos]);

  const [reviewRange, setReviewRange] = useState<DateRange>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  
  const dummyRanges: ComparisonDateRanges = useMemo(() => ({
    range1: reviewRange,
    range2: { from: undefined, to: undefined }
  }), [reviewRange]);
  
  const [transactionsToReview, setTransactionsToReview] = useState<ImportedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [txForRule, setTxForRule] = useState<ImportedTransaction | null>(null);
  const [showRuleManagerModal, setShowRuleManagerModal] = useState(false);

  const loadTransactions = useCallback(() => {
    if (!accountId || !reviewRange.from || !reviewRange.to) {
      setTransactionsToReview([]);
      return;
    }
    setLoading(true);
    const consolidatedTxs = getTransactionsForReview(accountId, reviewRange);
    setTransactionsToReview(consolidatedTxs.map(tx => ({ ...tx })));
    setLoading(false);
  }, [accountId, reviewRange, getTransactionsForReview]);

  useEffect(() => {
    if (accountId) {
      loadTransactions();
    } else {
      toast.error("Conta não especificada para revisão.");
      navigate("/receitas-despesas");
    }
  }, [accountId, loadTransactions, navigate]);
  
  const handleUpdateTransaction = useCallback((id: string, updates: Partial<ImportedTransaction>) => {
    setTransactionsToReview(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
  }, []);
  
  const handleCreateRule = (tx: ImportedTransaction) => {
    setTxForRule(tx);
    setShowRuleModal(true);
  };
  
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
          
          const counterFlow = (flow === 'out' || flow === 'transfer_out') ? 'transfer_in' : 'transfer_out';
          const counterDomain = (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') ? 'investment' : baseTx.domain;

          newTransactions.push({ 
            ...baseTx, 
            id: generateTransactionId(), 
            accountId: targetId, 
            flow: counterFlow, 
            domain: counterDomain as TransactionDomain,
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
    navigate("/receitas-despesas");
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
    <MainLayout>
      <div className="space-y-6 pb-10 flex flex-col h-full overflow-hidden w-full max-w-full">
        {/* Header - Alinhado com as opções de tela padrão */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-1 animate-fade-in w-full shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl leading-none tracking-tight">Revisão de Extrato</h1>
              <p className="text-xs text-muted-foreground font-medium tracking-wide mt-0.5 uppercase">
                Conciliação de Lançamentos • <span className="text-foreground font-bold">{account?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-start xl:justify-end animate-fade-in">
            {/* Status de Pendentes e Lançados */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="flex items-center gap-2 h-10 px-3 md:px-4 rounded-full bg-warning/[0.03] border border-warning/20 text-warning" title="Pendentes">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-xs font-black tabular-nums leading-none">{pendingCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 hidden sm:inline">Pendentes</span>
              </div>

              <div className="flex items-center gap-2 h-10 px-3 md:px-4 rounded-full bg-success/[0.03] border border-success/20 text-success" title="Prontos para Contabilizar">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-black tabular-nums leading-none">{readyCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 hidden sm:inline">Prontos</span>
              </div>
            </div>

            {/* Seletor de Período */}
            <PeriodSelector 
              initialRanges={dummyRanges}
              onDateRangeChange={(r) => setReviewRange(r.range1)}
              className="h-10 text-xs rounded-full font-bold bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm"
            />

            {/* Botão Atualizar Filtros */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={loadTransactions} 
              disabled={loading}
              className="h-10 w-10 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/20 shrink-0 bg-card/50 backdrop-blur-sm"
              title="Atualizar Filtros"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>

            {/* Botão Gerenciar Regras */}
            <Button 
              variant="outline" 
              onClick={() => setShowRuleManagerModal(true)} 
              className="h-10 rounded-full font-bold text-xs gap-2 border border-border/40 text-muted-foreground hover:text-foreground shrink-0 px-4 bg-card/50 backdrop-blur-sm"
              title="Configurações de Regras IA"
            >
              <Settings2 className="w-4 h-4" />
              <span>Regras</span>
            </Button>
          </div>
        </header>

        {/* Tabela Principal */}
        <div className="flex-1 bg-card rounded-[2rem] border border-border/40 dark:border-white/5 p-4 shadow-soft overflow-hidden flex flex-col min-h-[400px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="font-black uppercase tracking-widest text-xs">Filtrando dados...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto scrollbar-material">
              <div className="min-w-full">
                <TransactionReviewTable
                  transactions={transactionsToReview} 
                  accounts={accounts} 
                  categories={categories}
                  investments={investments} 
                  loans={loans} 
                  onUpdateTransaction={handleUpdateTransaction} 
                  onCreateRule={handleCreateRule}
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <footer className="px-1 bg-transparent py-4 shrink-0 relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/20 pt-6">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Badge variant="outline" className="h-10 px-4 rounded-full bg-primary/5 border-primary/20 text-primary font-black text-xs uppercase tracking-wider flex items-center justify-center">
              {transactionsToReview.length} Lançamentos
            </Badge>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 hidden md:inline">
              A listagem reflete as regras de automação aplicadas
            </span>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/receitas-despesas")}
              className="rounded-full h-11 px-6 font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20"
            >
              VOLTAR
            </Button>
            <Button 
              onClick={handleContabilize} 
              disabled={readyCount === 0 || loading} 
              className="h-11 rounded-full px-8 font-black text-xs gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-300 bg-primary hover:bg-primary-dark text-primary-foreground"
            >
              <Check className="w-4 h-4" /> CONTABILIZAR ({readyCount})
            </Button>
          </div>
        </footer>
      </div>

      <StandardizationRuleFormModal 
        open={showRuleModal} 
        onOpenChange={setShowRuleModal} 
        initialTransaction={txForRule} 
        categories={categories} 
        onSave={handleSaveRule} 
      />
      <StandardizationRuleManagerModal 
        open={showRuleManagerModal} 
        onOpenChange={setShowRuleManagerModal} 
        rules={standardizationRules} 
        onDeleteRule={() => {}} 
        categories={categories} 
      />
    </MainLayout>
  );
}
