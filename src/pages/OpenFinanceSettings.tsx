"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { PluggyAccount, PluggySyncPayload, DetectedCardInstallment } from "@/types/pluggy";
import { formatCurrency } from "@/types/finance";
import { format } from "date-fns";
import { parseDateLocal, cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Building2, 
  CreditCard, 
  ArrowLeftRight, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  PlusCircle, 
  Terminal, 
  Copy, 
  Download, 
  Trash2, 
  Settings2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Landmark,
  ShoppingBag,
  RotateCcw,
  Send,
  FileText,
  Tag,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  groupTransactionsForDisplay, 
  GroupedDisplayTransaction 
} from "@/lib/pluggyAdapter";
import { InstallmentReviewModal } from "@/components/bills/InstallmentReviewModal";
import { EditableCell } from "@/components/EditableCell";
import { AccountSearchSelector } from "@/components/bills/AccountSearchSelector";
import { CategorySearchSelector } from "@/components/bills/CategorySearchSelector";

export default function OpenFinanceSettings() {
  const navigate = useNavigate();
  const { 
    pluggyConfig, 
    updatePluggyConfig, 
    pluggyLastPayload,
    contasMovimento, 
    addContaMovimento,
    syncPluggyData,
    isSyncingPluggy,
    undoPluggyCardTransactions,
    generateCheckingStatementsFromPluggy,
    commitPluggyTransactions,
    categoriasV2,
    transacoesV2,
    importedStatements,
    billsTracker,
    creditCardConfigs,
    standardizationRules
  } = useFinance();

  const [inputItemId, setInputItemId] = useState(pluggyConfig?.itemId || "");
  const [data, setData] = useState<PluggySyncPayload | null>(() => pluggyLastPayload || null);
  const [selectedTxAccount, setSelectedTxAccount] = useState<string>("all");
  const [pendingInstallments, setPendingInstallments] = useState<DetectedCardInstallment[]>([]);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [assignedCategories, setAssignedCategories] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('open_finance_assigned_categories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [assignedDescriptions, setAssignedDescriptions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('open_finance_assigned_descriptions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('open_finance_assigned_categories', JSON.stringify(assignedCategories));
    } catch {}
  }, [assignedCategories]);

  useEffect(() => {
    try {
      localStorage.setItem('open_finance_assigned_descriptions', JSON.stringify(assignedDescriptions));
    } catch {}
  }, [assignedDescriptions]);
  const configuredItemIds = useMemo(() => {
    if (pluggyConfig?.itemIds && pluggyConfig.itemIds.length > 0) {
      return pluggyConfig.itemIds;
    }
    if (pluggyConfig?.itemId) {
      return [pluggyConfig.itemId];
    }
    return [];
  }, [pluggyConfig?.itemIds, pluggyConfig?.itemId]);

  const [newItemId, setNewItemId] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [showAddConnectionForm, setShowAddConnectionForm] = useState(false);

  // Console oculto por padrão
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Painel Open Finance iniciado.`,
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pluggyLastPayload) {
      setData(pluggyLastPayload);
    }
  }, [pluggyLastPayload]);

  useEffect(() => {
    if (logs.length > 0 && showLogs) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  // Adicionar nova conexão (Item ID)
  const handleAddItemId = () => {
    const cleanId = newItemId.trim();
    if (!cleanId) {
      toast.error("Informe um Item ID válido.");
      return;
    }
    if (configuredItemIds.includes(cleanId)) {
      toast.warning("Este Item ID já está cadastrado.");
      return;
    }

    const updatedItemIds = [...configuredItemIds, cleanId];
    const updatedLabels = {
      ...(pluggyConfig?.itemLabels || {}),
      [cleanId]: newItemLabel.trim() || `Banco ${updatedItemIds.length}`,
    };

    updatePluggyConfig({
      itemId: updatedItemIds[0],
      itemIds: updatedItemIds,
      itemLabels: updatedLabels,
    });

    setNewItemId("");
    setNewItemLabel("");
    setShowAddConnectionForm(false);
    toast.success("Nova conexão de banco cadastrada com sucesso!");
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [CONFIG] Nova conexão adicionada: ${cleanId.substring(0, 8)}... (${updatedLabels[cleanId]})`
    ]);
  };

  // Remover conexão
  const handleRemoveItemId = (idToRemove: string) => {
    const updatedItemIds = configuredItemIds.filter(id => id !== idToRemove);
    const updatedLabels = { ...(pluggyConfig?.itemLabels || {}) };
    delete updatedLabels[idToRemove];

    updatePluggyConfig({
      itemId: updatedItemIds[0] || "",
      itemIds: updatedItemIds,
      itemLabels: updatedLabels,
    });

    toast.success("Conexão removida.");
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [CONFIG] Conexão removida: ${idToRemove.substring(0, 8)}...`
    ]);
  };

  // Sincronizar todas as conexões
  const handleTriggerSyncAll = async () => {
    if (configuredItemIds.length === 0) {
      setShowAddConnectionForm(true);
      toast.error("Cadastre ao menos uma conexão bancária (Item ID) antes de sincronizar.");
      return;
    }

    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [INÍCIO] Buscando dados de ${configuredItemIds.length} conexão(ões)...`
    ]);

    const result = await syncPluggyData();

    if (result.logs && Array.isArray(result.logs)) {
      setLogs(prev => [...prev, ...result.logs]);
    }

    if (result.payload) {
      setData(result.payload);
    }

    if (result.detectedInstallments && result.detectedInstallments.length > 0) {
      setPendingInstallments(result.detectedInstallments);
      setShowInstallmentsModal(true);
    }

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleTriggerSync = handleTriggerSyncAll;

  // Sincronizar uma conexão específica
  const handleTriggerSyncSingle = async (targetId: string) => {
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [INÍCIO] Sincronizando conexão ${targetId.substring(0, 8)}...`
    ]);

    const result = await syncPluggyData(targetId);

    if (result.logs && Array.isArray(result.logs)) {
      setLogs(prev => [...prev, ...result.logs]);
    }

    if (result.payload) {
      setData(result.payload);
    }

    if (result.detectedInstallments && result.detectedInstallments.length > 0) {
      setPendingInstallments(result.detectedInstallments);
      setShowInstallmentsModal(true);
    }

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  // Disponibilizar extrato bancário de contas correntes para a tela de Revisão de Extrato (permanece na tela com toast breve)
  const handleGenerateCheckingStatements = (targetPluggyAccountId?: string) => {
    const targetAccId = targetPluggyAccountId || (selectedTxAccount !== "all" ? selectedTxAccount : undefined);
    const result = generateCheckingStatementsFromPluggy(targetAccId);
    if (result.logs) {
      setLogs(prev => [...prev, ...result.logs]);
    }

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.info(result.message);
    }
  };

  // Lançar transações no sistema (execução direta em 1 clique sem modal)
  const handleCommitTransactions = () => {
    const targetAccId = selectedTxAccount !== "all" ? selectedTxAccount : undefined;
    const result = commitPluggyTransactions(targetAccId, assignedCategories, assignedDescriptions);

    if (result.logs) {
      setLogs(prev => [...prev, ...result.logs]);
    }

    if (result.success) {
      if (result.count > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } else {
      toast.error(result.message);
    }
  };

  // Desfazer lançamentos importados do cartão de crédito (execução direta em 1 clique sem modal)
  const handleUndoCardTransactions = () => {
    const targetAccId = selectedTxAccount !== "all" ? selectedTxAccount : undefined;
    const { count: removedCount, restoredDescriptions, restoredCategories } = undoPluggyCardTransactions(targetAccId);

    if (removedCount > 0) {
      if (restoredDescriptions && Object.keys(restoredDescriptions).length > 0) {
        setAssignedDescriptions(prev => {
          const updated = { ...prev, ...restoredDescriptions };
          try {
            localStorage.setItem('open_finance_assigned_descriptions', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      if (restoredCategories && Object.keys(restoredCategories).length > 0) {
        setAssignedCategories(prev => {
          const updated = { ...prev, ...restoredCategories };
          try {
            localStorage.setItem('open_finance_assigned_categories', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      toast.success(`${removedCount} lançamento(s) de cartão desfeito(s) com sucesso!`);
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [DESFAZER] ${removedCount} lançamento(s) de cartão de crédito removido(s) do sistema. Descrições personalizadas preservadas.`
      ]);
    } else {
      toast.info("Nenhum lançamento do cartão de crédito do Open Finance encontrado para remover.");
    }
  };

  // Linkar conta da Pluggy a uma conta do Orbium
  const handleLinkAccount = (pluggyAccId: string, orbiumAccId: string) => {
    const current = { ...(pluggyConfig?.linkedAccounts || {}) };
    if (!orbiumAccId || orbiumAccId === "none") {
      delete current[pluggyAccId];
    } else {
      current[pluggyAccId] = orbiumAccId;
    }
    updatePluggyConfig({ linkedAccounts: current });
    toast.success("Vínculo de conta atualizado!");
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [VÍNCULO] Conta associada: ${orbiumAccId}`
    ]);
  };

  // Criar nova conta no Orbium para a conta da Pluggy selecionada
  const handleCreateOrbiumAccountFromPluggy = (pluggyAcc: PluggyAccount) => {
    const isCredit = pluggyAcc.type === 'CREDIT';
    const newName = `${pluggyAcc.name || 'Conta Bancária'} (${pluggyAcc.number || 'Open Finance'})`;

    const exists = contasMovimento.some(c => c.name.toLowerCase() === newName.toLowerCase());
    if (exists) {
      toast.warning("Já existe uma conta com este nome.");
      return;
    }

    const createdAccount = addContaMovimento({
      name: newName,
      initialBalance: pluggyAcc.balance || 0,
      accountType: isCredit ? 'cartao_credito' : 'corrente',
      color: pluggyAcc.bankData?.primaryColor || '#6366f1',
      hidden: false,
    });

    if (createdAccount?.id) {
      handleLinkAccount(pluggyAcc.id, createdAccount.id);
      toast.success(`Conta "${newName}" criada e vinculada!`);
    }
  };

  // Contas disponíveis da Pluggy
  const availableAccounts = useMemo(() => {
    return data?.accounts || [];
  }, [data]);

  // Transações brutas combinadas ou da conta selecionada
  const displayedTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (selectedTxAccount === "all") {
      const all: { tx: any; pluggyAccId: string }[] = [];
      Object.entries(data.transactions).forEach(([accId, list]) => {
        list.forEach(t => all.push({ tx: t, pluggyAccId: accId }));
      });
      return all.sort((a, b) => (b.tx.date || "").localeCompare(a.tx.date || ""));
    }
    const list = data.transactions[selectedTxAccount] || [];
    return list.map(t => ({ tx: t, pluggyAccId: selectedTxAccount }));
  }, [data, selectedTxAccount]);

  // Categorias oficiais do sistema ordenadas alfabeticamente
  const sortedCategories = useMemo(() => {
    return [...categoriasV2].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [categoriasV2]);

  // Opções formatadas para o AccountSearchSelector de filtro por conta
  const filterAccountOptions = useMemo(() => {
    return availableAccounts.map(a => ({
      id: a.id,
      name: `${a.name} (${a.type === 'CREDIT' ? 'Cartão' : 'Corrente'})`,
      accountType: a.type === 'CREDIT' ? 'cartao_credito' : 'corrente',
      currency: 'BRL',
      initialBalance: 0,
      createdAt: new Date().toISOString(),
      meta: {},
    } as any));
  }, [availableAccounts]);

  // Conta selecionada atualmente no filtro de transações
  const selectedAccountObj = useMemo(() => {
    if (selectedTxAccount === "all") return null;
    return availableAccounts.find(a => a.id === selectedTxAccount) || null;
  }, [selectedTxAccount, availableAccounts]);

  // Se a conta selecionada é uma Conta Corrente
  const isCheckingAccountSelected = useMemo(() => {
    if (!selectedAccountObj) return false;
    const linkedId = pluggyConfig?.linkedAccounts?.[selectedAccountObj.id];
    const linkedAcc = contasMovimento.find(c => c.id === linkedId);
    return selectedAccountObj.type !== 'CREDIT' && linkedAcc?.accountType !== 'cartao_credito';
  }, [selectedAccountObj, pluggyConfig?.linkedAccounts, contasMovimento]);

  // Se a conta selecionada é um Cartão de Crédito
  const isCreditCardSelected = useMemo(() => {
    if (!selectedAccountObj) return false;
    const linkedId = pluggyConfig?.linkedAccounts?.[selectedAccountObj.id];
    const linkedAcc = contasMovimento.find(c => c.id === linkedId);
    return selectedAccountObj.type === 'CREDIT' || linkedAcc?.accountType === 'cartao_credito';
  }, [selectedAccountObj, pluggyConfig?.linkedAccounts, contasMovimento]);

  // Transações agrupadas para o grid: deduplicadas e filtradas para exibir estritamente valores a tratar
  const groupedDisplayItems = useMemo(() => {
    return groupTransactionsForDisplay({
      items: displayedTransactions,
      availableAccounts,
      linkedAccounts: pluggyConfig?.linkedAccounts || {},
      existingTxs: transacoesV2,
      importedStatements,
      billsTracker,
      creditCardConfigs,
      rules: standardizationRules
    });
  }, [
    displayedTransactions, 
    availableAccounts, 
    pluggyConfig?.linkedAccounts, 
    transacoesV2, 
    importedStatements, 
    billsTracker, 
    creditCardConfigs, 
    standardizationRules
  ]);

  // Alteração manual de categoria inline
  const handleCategoryChange = (key: string, categoryId: string, txIds?: string[]) => {
    setAssignedCategories(prev => {
      const updated = { ...prev, [key]: categoryId };
      if (txIds && Array.isArray(txIds)) {
        txIds.forEach(id => { updated[id] = categoryId; });
      }
      try {
        localStorage.setItem('open_finance_assigned_categories', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Alteração manual de descrição antes de lançar
  const handleDescriptionChange = (key: string, newDesc: string, txIds?: string[]) => {
    const trimmed = newDesc.trim();
    if (!trimmed) return;
    setAssignedDescriptions(prev => {
      const updated = { ...prev, [key]: trimmed };
      if (txIds && Array.isArray(txIds)) {
        txIds.forEach(id => { updated[id] = trimmed; });
      }
      try {
        localStorage.setItem('open_finance_assigned_descriptions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Ações de logs
  const handleCopyLogs = () => {
    if (!logs.length) return;
    navigator.clipboard.writeText(logs.join("\n"));
    toast.success("Logs copiados.");
  };

  const handleDownloadLogs = () => {
    if (!logs.length) return;
    const blob = new Blob([logs.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `open-finance-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Logs baixados.");
  };

  return (
    <MainLayout>
      <div className="space-y-8 pb-12 animate-fade-in">
        
        {/* Header do Sistema Padrão */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10">
              <Landmark size={26} />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl leading-none tracking-tight">Open Finance</h1>
              <p className="text-sm text-muted-foreground font-bold tracking-widest mt-1 uppercase opacity-60">Sincronização Bancária</p>
            </div>
          </div>
        </header>

        {/* GERENCIADOR DE MÚLTIPLAS CONEXÕES (ITEM IDs) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border/50 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Conexões Bancárias ({configuredItemIds.length})</h3>
                <p className="text-[11px] text-muted-foreground">Cada banco integrado no Pluggy possui seu próprio Item ID</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddConnectionForm(!showAddConnectionForm)}
                className="h-8 text-xs font-semibold gap-1.5 border-border/70"
              >
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                <span>Nova Conexão</span>
              </Button>

              <Button
                onClick={handleTriggerSyncAll}
                disabled={isSyncingPluggy || configuredItemIds.length === 0}
                size="sm"
                className="h-8 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPluggy && "animate-spin")} />
                <span>{isSyncingPluggy ? "Sincronizando..." : "Sincronizar Todas"}</span>
              </Button>
            </div>
          </div>

          {/* FORMULÁRIO DE ADIÇÃO DE NOVO ITEM ID */}
          {showAddConnectionForm && (
            <div className="p-3.5 rounded-xl bg-muted/30 border border-primary/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary" />
                  Cadastrar Conexão (Item ID)
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowAddConnectionForm(false)} className="h-6 text-[10px] text-muted-foreground">
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <Input
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    placeholder="Nome do Banco (ex: Nubank, Itaú)..."
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="sm:col-span-5">
                  <Input
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                    placeholder="Informe o Item ID..."
                    className="font-mono text-xs h-9 bg-background"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button
                    onClick={handleAddItemId}
                    disabled={!newItemId.trim()}
                    className="w-full h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* LISTA DE CONEXÕES CADASTRADAS */}
          {configuredItemIds.length === 0 ? (
            <div className="py-6 text-center space-y-2 border border-dashed rounded-xl border-border/60">
              <p className="text-xs font-medium text-muted-foreground">Nenhuma conexão cadastrada no momento.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddConnectionForm(true)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                Cadastrar Primeiro Item ID
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {configuredItemIds.map((itemId) => {
                const label = pluggyConfig?.itemLabels?.[itemId] || "Conexão Bancária";
                return (
                  <div key={itemId} className="p-3 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground truncate max-w-[130px]">{label}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          Ativo
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        ID: {itemId.substring(0, 8)}••••••••
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTriggerSyncSingle(itemId)}
                        disabled={isSyncingPluggy}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                        title="Sincronizar apenas esta conexão"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPluggy && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItemId(itemId)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                        title="Remover conexão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BANNER DE COMPRAS PARCELADAS IDENTIFICADAS */}
        {pendingInstallments.length > 0 && (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {pendingInstallments.length} {pendingInstallments.length === 1 ? "Compra Parcelada Nova Identificada" : "Compras Parceladas Novas Identificadas"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Cadastre no Gerenciar Compromissos para agendar faturas futuras com precisão e manter o extrato limpo.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowInstallmentsModal(true)}
              className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm"
            >
              Revisar e Cadastrar
            </Button>
          </div>
        )}

        {/* GRID PRINCIPAL: PROPORÇÃO REAJUSTADA EM 30% (CONTAS: 4 / TRANSAÇÕES: 8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PAINEL 1: CONTAS BANCÁRIAS (LARGURA REDUZIDA EM 30% -> lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] p-5 shadow-soft border border-border/40 flex flex-col min-h-[460px]">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground leading-tight">Contas Bancárias</h2>
                    <p className="text-xs text-muted-foreground">Contas identificadas</p>
                  </div>
                </div>
                {availableAccounts.length > 0 && (
                  <Badge variant="secondary" className="font-bold text-xs">
                    {availableAccounts.length}
                  </Badge>
                )}
              </div>

              <div className="flex-1 py-3">
                {availableAccounts.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-50">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      Nenhuma conta carregada.
                    </p>
                    <Button
                      onClick={handleTriggerSync}
                      disabled={isSyncingPluggy || !pluggyConfig?.itemId}
                      size="sm"
                      className="rounded-xl font-bold gap-2 text-xs"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPluggy && "animate-spin")} />
                      Buscar Contas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableAccounts.map((acc) => {
                      const isCredit = acc.type === 'CREDIT';
                      const linkedOrbiumId = pluggyConfig?.linkedAccounts?.[acc.id];

                      return (
                        <div 
                          key={acc.id}
                          className="p-3 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                isCredit ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              )}>
                                {isCredit ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-xs text-foreground truncate max-w-[130px]">
                                    {acc.name || "Conta Bancária"}
                                  </h4>
                                  <Badge className={cn(
                                    "text-[9px] py-0 px-1 font-medium",
                                    isCredit 
                                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" 
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  )}>
                                    {isCredit ? "Cartão" : "Corrente"}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-mono truncate">
                                  {acc.bankData?.name || "Banco"} • {acc.number || "S/N"}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-foreground block font-mono tabular-nums">
                                {formatCurrency(acc.balance || 0)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">Saldo</span>
                            </div>
                          </div>

                          {/* Seletor de Vínculo */}
                          <div className="pt-2 border-t border-border/30 space-y-1.5">
                            <AccountSearchSelector
                              value={linkedOrbiumId}
                              accounts={contasMovimento}
                              onSelect={(val) => handleLinkAccount(acc.id, val)}
                              allowClear
                              clearLabel="-- Não vinculada --"
                              placeholder="Vincular à conta..."
                              size="sm"
                            />

                            {!linkedOrbiumId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateOrbiumAccountFromPluggy(acc)}
                                className="w-full text-[11px] h-7 gap-1 border-dashed"
                              >
                                <PlusCircle className="w-3 h-3 text-primary" />
                                Criar Conta no Orbium
                              </Button>
                            ) : (
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Vinculada
                                </span>
                                <span>{isCredit ? "Cartão de Crédito" : "Conta Corrente"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAINEL 2: TRANSAÇÕES COM COLUNA DE CATEGORIA E BOTÃO LANÇAR (LARGURA EXPANDIDA EM 30% -> lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] p-5 sm:p-6 shadow-soft border border-border/40 flex flex-col min-h-[460px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground leading-tight">Transações</h2>
                    <p className="text-xs text-muted-foreground">Movimentações identificadas na sincronização</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Se for Conta Corrente: exibe o botão Disponibilizar Extrato e oculta Lançar/Desfazer */}
                  {isCheckingAccountSelected ? (
                    <Button
                      size="sm"
                      onClick={() => handleGenerateCheckingStatements(selectedTxAccount)}
                      disabled={groupedDisplayItems.length === 0}
                      className="h-8 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl transition-all shadow-sm"
                      title="Disponibiliza o extrato bancário desta conta corrente na tela de Revisão de Extrato"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Disponibilizar Extrato</span>
                    </Button>
                  ) : (
                    <>
                      {/* BOTÃO LANÇAR (Disponível para Cartão de Crédito ou Todas as Contas) */}
                      <Button
                        size="sm"
                        onClick={handleCommitTransactions}
                        disabled={groupedDisplayItems.length === 0}
                        className="h-8 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl transition-all shadow-sm"
                        title="Lança as movimentações de cartão diretamente no sistema sem modal de confirmação"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Lançar</span>
                      </Button>

                      {/* BOTÃO DESFAZER (Disponível para Cartão de Crédito ou Todas as Contas) */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndoCardTransactions}
                        className="h-8 px-3 text-xs font-semibold border-border/70 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-foreground gap-1.5 rounded-xl transition-all shadow-2xs"
                        title="Desfaz instantaneamente os lançamentos importados do cartão de crédito"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Desfazer</span>
                      </Button>

                      {/* Se "Todas as Contas", disponibiliza também o botão de extrato */}
                      {selectedTxAccount === "all" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateCheckingStatements()}
                          disabled={availableAccounts.filter(a => a.type !== 'CREDIT').length === 0}
                          className="h-8 px-3 text-xs font-semibold border-border/70 hover:border-primary/40 text-foreground gap-1.5 rounded-xl transition-all shadow-2xs"
                          title="Disponibiliza os extratos bancários de todas as contas correntes"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>Extratos</span>
                        </Button>
                      )}
                    </>
                  )}

                  {/* Filtro por conta com busca padronizada */}
                  {availableAccounts.length > 0 && (
                    <div className="w-48 sm:w-56">
                      <AccountSearchSelector
                        value={selectedTxAccount === "all" ? null : selectedTxAccount}
                        accounts={filterAccountOptions}
                        onSelect={(val) => setSelectedTxAccount(val === "none" ? "all" : val)}
                        allowClear
                        clearLabel="Todas as Contas"
                        placeholder="Todas as Contas"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* CABEÇALHO DA TABELA CONTEXTUAL: SIMPLIFICADO PARA CONTA CORRENTE / DETALHADO PARA CARTÃO */}
              {groupedDisplayItems.length > 0 && (
                isCheckingAccountSelected ? (
                  <div className="pt-3 pb-1.5 px-3 grid grid-cols-12 gap-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <div className="col-span-3">Data</div>
                    <div className="col-span-6">Histórico</div>
                    <div className="col-span-3 text-right">Valor</div>
                  </div>
                ) : (
                  <div className="pt-3 pb-1.5 px-3 grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <div className="col-span-5 sm:col-span-5">Data / Descrição</div>
                    <div className="col-span-4 sm:col-span-4">Categoria</div>
                    <div className="col-span-3 sm:col-span-3 text-right">Valor</div>
                  </div>
                )
              )}

              <div className="flex-1 py-1">
                {groupedDisplayItems.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Tudo em dia!</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {isCheckingAccountSelected 
                          ? "Nenhuma movimentação pendente a tratar nesta conta corrente. Todas já foram disponibilizadas em extratos ou lançadas."
                          : "Nenhuma movimentação pendente a tratar no momento. Todos os valores já foram lançados ou conciliados."}
                      </p>
                    </div>
                    {availableAccounts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerSync}
                        disabled={isSyncingPluggy}
                        className="text-xs rounded-xl font-semibold gap-1.5 mt-2"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPluggy && "animate-spin")} />
                        <span>Buscar Novas Movimentações</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto divide-y divide-border/30 scrollbar-thin pr-1">
                    {groupedDisplayItems.map((item) => {
                      // Se for Conta Corrente selecionada: mostra apenas Data, Histórico e Valor para visualização rápida
                      if (isCheckingAccountSelected) {
                        return (
                          <div key={item.key} className="py-2.5 px-3 hover:bg-muted/20 transition-colors grid grid-cols-12 gap-3 items-center text-xs">
                            {/* Data */}
                            <div className="col-span-3 text-muted-foreground font-mono text-xs">
                              {item.date ? format(parseDateLocal(item.date), "dd/MM/yyyy") : "--"}
                            </div>

                            {/* Histórico */}
                            <div className="col-span-6 min-w-0 pr-2">
                              <p className="font-semibold text-foreground truncate" title={item.originalDescription}>
                                {item.originalDescription || item.displayDescription}
                              </p>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.accountName}
                              </span>
                            </div>

                            {/* Valor */}
                            <div className="col-span-3 text-right shrink-0">
                              <span className={cn(
                                "font-bold block text-xs font-mono tabular-nums",
                                item.isExpense ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                              )}>
                                {item.isExpense ? "- " : "+ "}{formatCurrency(item.totalAmount)}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Se for Cartão de Crédito ou visão geral: exibe detalhamento com seletor de categorias do sistema
                      const effectiveCategoryId = assignedCategories[item.key] !== undefined 
                        ? assignedCategories[item.key] 
                        : (item.txIds && item.txIds.some(id => assignedCategories[id] !== undefined)
                            ? assignedCategories[item.txIds.find(id => assignedCategories[id] !== undefined)!]
                            : (item.suggestedCategoryId || ""));

                      const customDescValue = assignedDescriptions[item.key] !== undefined 
                        ? assignedDescriptions[item.key] 
                        : (item.txIds && item.txIds.some(id => assignedDescriptions[id] !== undefined)
                            ? assignedDescriptions[item.txIds.find(id => assignedDescriptions[id] !== undefined)!]
                            : item.displayDescription);

                      const isItemFromChecking = availableAccounts.find(a => a.id === item.pluggyAccId)?.type !== 'CREDIT';

                      return (
                        <div key={item.key} className="py-2.5 px-2 hover:bg-muted/20 transition-colors grid grid-cols-12 gap-2 items-center text-xs">
                          
                          {/* COLUNA 1: DATA E DESCRIÇÃO (COM PARCELAMENTO COMPACTO) */}
                          <div className="col-span-5 sm:col-span-5 min-w-0 pr-1">
                            <div className="flex items-center gap-1">
                              <EditableCell
                                value={customDescValue}
                                type="text"
                                onSave={(v) => handleDescriptionChange(item.key, String(v), item.txIds)}
                                className="font-semibold text-foreground truncate text-xs px-1.5 py-0.5 h-7 rounded bg-background/40 hover:bg-background border border-transparent hover:border-border/60 transition-colors cursor-pointer"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {item.isInstallmentGroup ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono text-purple-600 dark:text-purple-400 border-purple-500/30">
                                  {item.totalInstallments} parcelas de {formatCurrency(item.installmentAmount)}
                                </Badge>
                              ) : null}

                              {item.isCardPayment ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                  Pagamento Fatura
                                </Badge>
                              ) : null}

                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.date ? format(parseDateLocal(item.date), "dd/MM/yyyy") : item.date} • {item.accountName}
                              </span>
                            </div>
                          </div>

                          {/* COLUNA 2: CATEGORIA COM DADOS REAIS DO SISTEMA OU INDICADOR DE TRANSFERÊNCIA */}
                          <div className="col-span-4 sm:col-span-4 min-w-0">
                            {item.isCardPayment ? (
                              <span className="text-[11px] text-muted-foreground italic font-medium px-2 py-1 rounded bg-muted/30">
                                Transferência
                              </span>
                            ) : isItemFromChecking ? (
                              <span className="text-[11px] text-muted-foreground italic font-medium px-2 py-1 rounded bg-muted/30" title="Movimentações de conta corrente são categorizadas na Revisão de Extrato">
                                Via Extrato
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 min-w-0">
                                <CategorySearchSelector
                                  value={effectiveCategoryId}
                                  categories={sortedCategories}
                                  onSelect={(val) => handleCategoryChange(item.key, val, item.txIds)}
                                  allowClear
                                  clearLabel="-- Sem Categoria --"
                                  placeholder="Categorizar..."
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>

                          {/* COLUNA 3: VALOR TOTAL E DETALHE DA PARCELA */}
                          <div className="col-span-3 sm:col-span-3 text-right shrink-0">
                            {item.isInstallmentGroup ? (
                              <div>
                                <span className="font-bold block text-xs text-destructive font-mono tabular-nums">
                                  - {formatCurrency(item.totalAmount)}
                                </span>
                                <span className="text-[10px] text-muted-foreground block font-mono tabular-nums">
                                  {item.totalInstallments}x {formatCurrency(item.installmentAmount)}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className={cn(
                                  "font-bold block text-xs font-mono tabular-nums",
                                  item.isExpense ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                                  )}>
                                  {item.isExpense ? "- " : "+ "}{formatCurrency(item.totalAmount)}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {item.isCardPayment ? "Crédito Fatura" : (item.isExpense ? "Despesa" : "Entrada")}
                                </span>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONSOLE DE LOGS (OCULTÁVEL POR PADRÃO) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showLogs ? "Ocultar Diagnóstico" : "Ver Diagnóstico"}</span>
              {showLogs ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </Button>

            {showLogs && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLogs}
                  disabled={!logs.length}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadLogs}
                  disabled={!logs.length}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                >
                  <Download className="w-3 h-3" />
                  Baixar .txt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {showLogs && (
            <div className="p-3 rounded-2xl bg-slate-950 text-slate-200 border border-slate-800 shadow-md font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="py-3 text-center text-slate-500 text-xs">
                  Nenhum registro no momento.
                </div>
              ) : (
                logs.map((logLine, index) => {
                  let lineStyle = "text-slate-300";
                  if (logLine.includes("[SUCESSO") || logLine.includes("[200]")) {
                    lineStyle = "text-emerald-400 font-medium";
                  } else if (logLine.includes("[ERRO") || logLine.includes("[FALHA")) {
                    lineStyle = "text-rose-400 font-bold bg-rose-950/40 px-1 py-0.5 rounded";
                  } else if (logLine.includes("[AVISO]") || logLine.includes("[INFO]")) {
                    lineStyle = "text-amber-300";
                  } else if (logLine.includes("[CONFIG]") || logLine.includes("[VÍNCULO]") || logLine.includes("[PAGAMENTO FATURA]")) {
                    lineStyle = "text-cyan-300 font-medium";
                  }

                  return (
                    <div key={index} className={`flex items-start gap-2 break-all ${lineStyle}`}>
                      <span className="text-slate-600 select-none text-[10px] w-6 shrink-0 text-right font-mono">
                        {index + 1}
                      </span>
                      <span>{logLine}</span>
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Modal de Revisão de Compras Parceladas Detectadas */}
        <InstallmentReviewModal
          isOpen={showInstallmentsModal}
          onClose={() => setShowInstallmentsModal(false)}
          items={pendingInstallments}
          onItemsChange={setPendingInstallments}
        />

      </div>
    </MainLayout>
  );
}
