"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Check,
  Loader2,
  Settings2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  ImportedTransaction,
  StandardizationRule,
  TransacaoCompleta,
  generateTransactionId,
  generateTransferGroupId,
  getDomainFromOperation,
  getFlowTypeFromOperation,
  DateRange,
  ImportedStatement,
  ComparisonDateRanges,
  TransactionDomain,
  FlowType
} from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { TransactionReviewTable } from "@/components/transactions/TransactionReviewTable";
import { isImportedTransactionReady as isRowReady } from "@/lib/transactionValidator";
import { ContabilizedReviewTable } from "@/components/transactions/ContabilizedReviewTable";
import { StandardizationRuleFormModal } from "@/components/transactions/StandardizationRuleFormModal";
import { StandardizationRuleManagerModal } from "@/components/transactions/StandardizationRuleManagerModal";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cn, parseDateLocal } from "@/lib/utils";

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
    updateStandardizationRule,
    addTransacaoV2,
    updateImportedStatement,
    importedStatements,
    markLoanParcelPaid,
    addEmprestimo,
    addVeiculo,
    standardizationRules,
    uncontabilizeImportedTransaction,
    uncontabilizeTransactionsBatch,
    deleteImportedTransaction,
    updateImportedTransactionDraft,
    transacoesV2
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

  const [activeTab, setActiveTab] = useState<'pending' | 'contabilized'>('pending');
  const [transactionsToReview, setTransactionsToReview] = useState<ImportedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Seleções em lote
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const [selectedContabilizedIds, setSelectedContabilizedIds] = useState<Set<string>>(new Set());

  // Diálogos de Regras
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [txForRule, setTxForRule] = useState<ImportedTransaction | null>(null);
  const [ruleToEdit, setRuleToEdit] = useState<StandardizationRule | null>(null);
  const [showRuleManagerModal, setShowRuleManagerModal] = useState(false);

  // Carregar transações pendentes da conta
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

  // Transações a tratar: exclui duplicatas potenciais
  const pendingTransactions = useMemo(() => {
    return transactionsToReview.filter(tx => !tx.isPotentialDuplicate);
  }, [transactionsToReview]);

  // Transações contabilizadas do período para esta conta
  const contabilizedTransactions = useMemo(() => {
    if (!accountId || !reviewRange.from || !reviewRange.to) return [];
    const from = startOfDay(reviewRange.from);
    const to = endOfDay(reviewRange.to);

    const contabilizedTxIds = new Set<string>();
    importedStatements
      .filter(s => s.accountId === accountId)
      .forEach(s => {
        s.rawTransactions
          .filter(t => t.isContabilized && t.contabilizedTransactionId)
          .forEach(t => contabilizedTxIds.add(t.contabilizedTransactionId!));
      });

    return transacoesV2.filter(t => {
      if (t.accountId !== accountId) return false;
      try {
        const d = parseDateLocal(t.date);
        if (!isWithinInterval(d, { start: from, end: to })) return false;
      } catch {
        return false;
      }
      return contabilizedTxIds.has(t.id) || t.meta?.source === 'import';
    });
  }, [accountId, reviewRange, importedStatements, transacoesV2]);

  // Atualização em tempo real de uma transação pendente com persistência
  const handleUpdateTransaction = useCallback((id: string, updates: Partial<ImportedTransaction>) => {
    setTransactionsToReview(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
    updateImportedTransactionDraft(id, updates);
  }, [updateImportedTransactionDraft]);

  // Excluir transação do extrato importado
  const handleDeleteTransaction = useCallback((txId: string) => {
    deleteImportedTransaction(txId);
    setTransactionsToReview(prev => prev.filter(t => t.id !== txId));
    setSelectedPendingIds(prev => {
      const next = new Set(prev);
      next.delete(txId);
      return next;
    });
    toast.success("Lançamento excluído do extrato importado.");
  }, [deleteImportedTransaction]);

  // Abertura do modal para criar regra
  const handleCreateRule = (tx: ImportedTransaction) => {
    setTxForRule(tx);
    setRuleToEdit(null);
    setShowRuleModal(true);
  };

  // Abertura do modal para editar regra existente
  const handleEditRule = (rule: StandardizationRule) => {
    setRuleToEdit(rule);
    setTxForRule(null);
    setShowRuleModal(true);
  };

  // Salvar regra preservando edições manuais existentes sem perda de dados
  const handleSaveRule = (rule: Omit<StandardizationRule, "id">, ruleId?: string) => {
    if (ruleId) {
      updateStandardizationRule(ruleId, rule);
      toast.success("Regra atualizada com sucesso!");
    } else {
      addStandardizationRule(rule);
      toast.success("Regra cadastrada com sucesso!");
    }

    setTransactionsToReview(prev => prev.map(tx => {
      const originalDesc = tx.originalDescription.toLowerCase();
      if (originalDesc.includes(rule.pattern.toLowerCase())) {
        const updated: ImportedTransaction = {
          ...tx,
          categoryId: rule.categoryId,
          operationType: rule.operationType,
          description: rule.descriptionTemplate,
          isTransfer: rule.operationType === 'transferencia',
        };
        updateImportedTransactionDraft(tx.id, updated);
        return updated;
      }
      return tx;
    }));
  };

  // Alternância de seleção para pendentes
  const handleTogglePendingSelect = (id: string) => {
    setSelectedPendingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTogglePendingSelectAll = () => {
    if (selectedPendingIds.size === pendingTransactions.length) {
      setSelectedPendingIds(new Set());
    } else {
      setSelectedPendingIds(new Set(pendingTransactions.map(t => t.id)));
    }
  };

  // Alternância de seleção para contabilizadas
  const handleToggleContabilizedSelect = (id: string) => {
    setSelectedContabilizedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleContabilizedSelectAll = () => {
    if (selectedContabilizedIds.size === contabilizedTransactions.length) {
      setSelectedContabilizedIds(new Set());
    } else {
      setSelectedContabilizedIds(new Set(contabilizedTransactions.map(t => t.id)));
    }
  };

  const readyCountTotal = useMemo(() => {
    return pendingTransactions.filter(isRowReady).length;
  }, [pendingTransactions]);

  const handleContabilize = () => {
    if (selectedPendingIds.size === 0) {
      toast.error("Selecione pelo menos uma transação pelo checkbox para contabilizar.");
      return;
    }

    const selectedTxs = pendingTransactions.filter(tx => selectedPendingIds.has(tx.id));
    const unreadyTxs = selectedTxs.filter(tx => !isRowReady(tx));
    if (unreadyTxs.length > 0) {
      toast.error(`Existem ${unreadyTxs.length} lançamento(s) selecionado(s) com pendências (categoria ou vínculo). Complete os dados antes de contabilizar.`);
      return;
    }

    setLoading(true);
    const newTransactions: TransacaoCompleta[] = [];
    const updatedStatements = new Map<string, ImportedStatement>();
    const txToStatementMap = new Map<string, string>();
    importedStatements.forEach(s => s.rawTransactions.forEach(t => txToStatementMap.set(t.id, s.id)));

    selectedTxs.forEach(tx => {
      const transactionId = generateTransactionId();
      const currentAcc = accounts.find(a => a.id === tx.accountId);
      const isCreditCard = currentAcc?.accountType === 'cartao_credito';
      const isInvestment = ['renda_fixa', 'poupanca', 'cripto', 'reserva', 'objetivo'].includes(currentAcc?.accountType || '');

      let flow: FlowType = getFlowTypeFromOperation(
        tx.operationType!,
        tx.tempVehicleOperation || tx.tempAssetOperation || undefined
      );

      if (isCreditCard) {
        flow = tx.operationType === 'despesa' ? 'out' : 'in';
      } else if (isInvestment) {
        // Em conta de investimento: Aplicação entra dinheiro (+) e Resgate sai (-)
        if (tx.operationType === 'aplicacao') flow = 'transfer_in';
        if (tx.operationType === 'resgate') flow = 'transfer_out';
      } else {
        // Em conta corrente: Resgate entra dinheiro (+) e Aplicação sai (-)
        if (tx.operationType === 'aplicacao') flow = 'transfer_out';
        if (tx.operationType === 'resgate') flow = 'transfer_in';
      }

      const transferGroupId = (tx.isTransfer || tx.operationType === 'aplicacao' || tx.operationType === 'resgate')
        ? generateTransferGroupId()
        : null;

      const baseTx: TransacaoCompleta = {
        id: transactionId,
        date: tx.date,
        accountId: tx.accountId,
        flow,
        operationType: tx.operationType!,
        domain: getDomainFromOperation(tx.operationType!),
        amount: tx.amount,
        categoryId: tx.categoryId || null,
        description: tx.description || tx.originalDescription,
        links: {
          investmentId: (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') ? tx.tempInvestmentId : null,
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

          const counterFlow: FlowType = (flow === 'out' || flow === 'transfer_out') ? 'transfer_in' : 'transfer_out';
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

        if (tx.operationType === 'liberacao_emprestimo') {
          addEmprestimo({
            contrato: tx.description,
            valorTotal: tx.amount,
            parcela: 0,
            meses: 0,
            taxaMensal: 0,
            status: 'ativo',
            liberacaoTransactionId: baseTx.id,
            contaCorrenteId: baseTx.accountId,
            dataInicio: baseTx.date
          });
        }
        if (tx.operationType === 'pagamento_emprestimo' && tx.tempLoanId) {
          markLoanParcelPaid(
            parseInt(tx.tempLoanId.replace('loan_', '')),
            tx.amount,
            tx.date,
            tx.tempParcelaId ? parseInt(tx.tempParcelaId) : undefined
          );
        }
        if (tx.operationType === 'veiculo' && tx.tempVehicleOperation === 'compra') {
          addVeiculo({
            modelo: tx.description,
            marca: '',
            tipo: 'carro',
            ano: 0,
            dataCompra: tx.date,
            valorVeiculo: tx.amount,
            valorSeguro: 0,
            vencimentoSeguro: "",
            parcelaSeguro: 0,
            valorFipe: 0,
            compraTransactionId: baseTx.id,
            status: 'ativo'
          });
        }
      }

      const sid = txToStatementMap.get(tx.id);
      if (sid) {
        if (!updatedStatements.has(sid)) {
          const originalStmt = importedStatements.find(s => s.id === sid);
          if (originalStmt) updatedStatements.set(sid, { ...originalStmt });
        }
        const s = updatedStatements.get(sid);
        if (s) {
          s.rawTransactions = s.rawTransactions.map(raw =>
            raw.id === tx.id
              ? { ...raw, isContabilized: true, contabilizedTransactionId: transactionId }
              : raw
          );
        }
      }
    });

    newTransactions.forEach(t => addTransacaoV2(t));
    updatedStatements.forEach(s => {
      updateImportedStatement(s.id, {
        rawTransactions: s.rawTransactions,
        status: s.rawTransactions.filter(t => !t.isContabilized).length === 0 ? 'complete' : 'partial'
      });
    });

    // Remove do estado local as transações contabilizadas
    const contabilizedIds = new Set(selectedTxs.map(t => t.id));
    setTransactionsToReview(prev => prev.filter(t => !contabilizedIds.has(t.id)));
    setSelectedPendingIds(new Set());

    setLoading(false);
    toast.success(`${selectedTxs.length} lançamento(s) contabilizado(s) com sucesso!`);
  };

  // Desfazer contabilização individual
  const handleUndoSingleContabilized = (transactionId: string) => {
    uncontabilizeImportedTransaction(transactionId);
    setSelectedContabilizedIds(prev => {
      const next = new Set(prev);
      next.delete(transactionId);
      return next;
    });
    loadTransactions();
    toast.success("Lançamento estornado! Ele retornou para a aba 'A Tratar'.");
  };

  // Desfazer contabilizações selecionadas em lote
  const handleUndoBatchContabilized = () => {
    if (selectedContabilizedIds.size === 0) return;
    const ids = Array.from(selectedContabilizedIds);
    uncontabilizeTransactionsBatch(ids);
    setSelectedContabilizedIds(new Set());
    loadTransactions();
    toast.success(`${ids.length} lançamentos estornados com sucesso para 'A Tratar'.`);
  };

  return (
    <MainLayout>
      <div className="space-y-4 pb-2 flex flex-col w-full max-w-full">
        {/* Header Superior */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-1 animate-fade-in w-full shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20 ring-4 ring-primary/10 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl leading-none tracking-tight">Revisão de Extrato</h1>
              <p className="text-xs text-muted-foreground font-medium tracking-wide mt-1 uppercase">
                Conciliação bancária • <span className="text-foreground font-bold">{account?.name || "Conta"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-start xl:justify-end animate-fade-in">
            {/* Segmented Control / Alternância de Abas na Página */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'pending'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>A Tratar</span>
                <span className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md bg-warning/10 text-warning">
                  {pendingTransactions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('contabilized')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'contabilized'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Contabilizadas</span>
                <span className="text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md bg-success/10 text-success">
                  {contabilizedTransactions.length}
                </span>
              </button>
            </div>

            {/* Seletor de Período */}
            <PeriodSelector
              initialRanges={dummyRanges}
              onDateRangeChange={(r) => setReviewRange(r.range1)}
              className="h-10 text-xs rounded-xl font-bold bg-card border-border/40 shadow-sm"
            />

            {/* Botão Atualizar */}
            <Button
              variant="outline"
              size="icon"
              onClick={loadTransactions}
              disabled={loading}
              className="h-10 w-10 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground shrink-0 bg-card/50"
              title="Recarregar Extrato"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>

            {/* Botão Gerenciar Regras */}
            <Button
              variant="outline"
              onClick={() => setShowRuleManagerModal(true)}
              className="h-10 rounded-xl font-bold text-xs gap-2 border border-border/40 text-muted-foreground hover:text-foreground shrink-0 px-3.5 bg-card/50"
              title="Gerenciar Regras de Padronização"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Regras</span>
            </Button>
          </div>
        </header>

        {/* Conteúdo Principal da Tabela - Altura adaptativa ao conteúdo para evitar áreas em branco */}
        <div className="w-full bg-card rounded-[2rem] border border-border/40 p-4 shadow-soft flex flex-col h-auto max-h-[calc(100vh-220px)] overflow-hidden transition-all duration-300">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center opacity-60">
              <Loader2 className="w-9 h-9 animate-spin mb-3 text-primary" />
              <p className="font-black uppercase tracking-widest text-xs">Carregando dados do extrato...</p>
            </div>
          ) : activeTab === 'pending' ? (
            <div className="w-full overflow-auto scrollbar-thin-custom min-h-0">
              <TransactionReviewTable
                transactions={pendingTransactions}
                accounts={accounts}
                accountType={account?.accountType}
                currentAccountId={accountId}
                categories={categories}
                investments={investments}
                loans={loans}
                standardizationRules={standardizationRules}
                selectedIds={selectedPendingIds}
                onToggleSelect={handleTogglePendingSelect}
                onToggleSelectAll={handleTogglePendingSelectAll}
                onUpdateTransaction={handleUpdateTransaction}
                onCreateRule={handleCreateRule}
                onEditRule={handleEditRule}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>
          ) : (
            <div className="w-full overflow-auto scrollbar-thin-custom min-h-0">
              <ContabilizedReviewTable
                transactions={contabilizedTransactions}
                categories={categories}
                accounts={accounts}
                accountType={account?.accountType}
                selectedIds={selectedContabilizedIds}
                onToggleSelect={handleToggleContabilizedSelect}
                onToggleSelectAll={handleToggleContabilizedSelectAll}
                onUncontabilize={handleUndoSingleContabilized}
                loading={loading}
              />
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <footer className="px-1 bg-transparent py-2 shrink-0 relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/20 pt-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              {activeTab === 'pending' ? (
                <>
                  <span className="text-foreground">{pendingTransactions.length} lançamentos a tratar</span>
                  <span>·</span>
                  <span className="text-success font-black">{readyCountTotal} prontos</span>
                  {selectedPendingIds.size > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-primary font-black">{selectedPendingIds.size} selecionados</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="text-foreground">{contabilizedTransactions.length} contabilizados no período</span>
                  {selectedContabilizedIds.size > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-primary font-black">{selectedContabilizedIds.size} selecionados</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              onClick={() => navigate("/receitas-despesas")}
              className="rounded-full h-11 px-6 font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              VOLTAR
            </Button>

            {activeTab === 'pending' ? (
              <Button
                onClick={handleContabilize}
                disabled={selectedPendingIds.size === 0 || loading}
                className="h-11 rounded-full px-8 font-black text-xs gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all bg-primary hover:bg-primary-dark text-primary-foreground disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> CONTABILIZAR ({selectedPendingIds.size})
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleUndoBatchContabilized}
                disabled={selectedContabilizedIds.size === 0 || loading}
                className="h-11 rounded-full px-8 font-black text-xs gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> DESFAZER SELECIONADAS ({selectedContabilizedIds.size})
              </Button>
            )}
          </div>
        </footer>
      </div>

      {/* Modal de Formulário de Regra */}
      <StandardizationRuleFormModal
        open={showRuleModal}
        onOpenChange={setShowRuleModal}
        initialTransaction={txForRule}
        initialRule={ruleToEdit}
        categories={categories}
        onSave={handleSaveRule}
      />

      {/* Modal de Gerenciamento de Regras */}
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
