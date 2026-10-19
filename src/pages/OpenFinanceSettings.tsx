"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  ShoppingBag
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isCardInvoicePayment, parseInstallmentPattern } from "@/lib/pluggyAdapter";
import { InstallmentReviewModal } from "@/components/bills/InstallmentReviewModal";

export default function OpenFinanceSettings() {
  const { 
    pluggyConfig, 
    updatePluggyConfig, 
    pluggyLastPayload,
    contasMovimento, 
    addContaMovimento,
    syncPluggyData,
    isSyncingPluggy
  } = useFinance();

  const [inputItemId, setInputItemId] = useState(pluggyConfig?.itemId || "");
  const [data, setData] = useState<PluggySyncPayload | null>(() => pluggyLastPayload || null);
  const [selectedTxAccount, setSelectedTxAccount] = useState<string>("all");
  const [pendingInstallments, setPendingInstallments] = useState<DetectedCardInstallment[]>([]);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  
  // Controle de visibilidade do Item ID (oculto por padrão se já configurado)
  const [showItemIdConfig, setShowItemIdConfig] = useState(!pluggyConfig?.itemId);

  // Console oculto por padrão
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Painel Open Finance iniciado.`,
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pluggyConfig?.itemId) {
      setInputItemId(pluggyConfig.itemId);
    }
  }, [pluggyConfig?.itemId]);

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

  // Salvar Item ID no contexto
  const handleSaveItemId = () => {
    const cleanId = inputItemId.trim();
    if (!cleanId) {
      toast.error("Informe um Item ID válido.");
      return;
    }
    updatePluggyConfig({ itemId: cleanId });
    setShowItemIdConfig(false);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [CONFIG] Item ID salvo com sucesso.`
    ]);
    toast.success("Item ID configurado com sucesso!");
  };

  // Disparar sincronização sob demanda
  const handleTriggerSync = async () => {
    const targetId = inputItemId.trim() || pluggyConfig?.itemId;
    if (!targetId) {
      setShowItemIdConfig(true);
      toast.error("Informe o Item ID antes de sincronizar.");
      return;
    }

    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [INÍCIO] Sincronizando dados bancários...`
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

  // Transações combinadas ou da conta selecionada
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

        {/* BARRA OU CARD SIMPLIFICADO DO ITEM ID (OCULTÁVEL POR PADRÃO) */}
        {!showItemIdConfig && pluggyConfig?.itemId ? (
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border/40 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Conexão Bancária Ativa</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground">
                    ID: {pluggyConfig.itemId.substring(0, 8)}••••••••
                  </Badge>
                </div>
                {pluggyConfig.lastSyncAt && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Última sincronização: {format(parseDateLocal(pluggyConfig.lastSyncAt.substring(0, 10)), "dd/MM/yyyy")} às {new Date(pluggyConfig.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowItemIdConfig(true)}
                className="text-xs h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Alterar ID</span>
              </Button>
              <Button
                onClick={handleTriggerSync}
                disabled={isSyncingPluggy}
                size="sm"
                className="h-9 px-4 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPluggy && "animate-spin")} />
                <span>{isSyncingPluggy ? "Sincronizando..." : "Sincronizar"}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border/50 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Configuração da Conexão</h3>
              </div>
              {pluggyConfig?.itemId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowItemIdConfig(false)}
                  className="text-xs h-8 text-muted-foreground"
                >
                  Ocultar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-8">
                <Input
                  value={inputItemId}
                  onChange={(e) => setInputItemId(e.target.value)}
                  placeholder="Informe o Item ID da conexão..."
                  className="font-mono text-xs h-10 bg-background"
                />
              </div>
              <div className="sm:col-span-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveItemId}
                  className="w-full text-xs h-10 font-semibold gap-1.5 border-border/70"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </Button>
                <Button
                  onClick={handleTriggerSync}
                  disabled={isSyncingPluggy || !inputItemId.trim()}
                  className="w-full text-xs h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPluggy && "animate-spin")} />
                  Sincronizar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* BANNER DE COMPRAS PARCELADAS IDENTIFICADAS */}
        {pendingInstallments.length > 0 && (
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
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
              className="h-9 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0 shadow-sm"
            >
              Revisar e Cadastrar
            </Button>
          </div>
        )}

        {/* GRID PRINCIPAL: CONTAS BANCÁRIAS E TRANSAÇÕES PRIORIZADAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PAINEL 1: CONTAS BANCÁRIAS DETECTADAS */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] p-5 sm:p-6 shadow-soft border border-border/40 flex flex-col min-h-[440px]">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground leading-tight">Contas Bancárias</h2>
                    <p className="text-xs text-muted-foreground">Contas identificadas na conexão</p>
                  </div>
                </div>
                {availableAccounts.length > 0 && (
                  <Badge variant="secondary" className="font-bold text-xs">
                    {availableAccounts.length}
                  </Badge>
                )}
              </div>

              <div className="flex-1 py-4">
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
                          className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                isCredit ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              )}>
                                {isCredit ? <CreditCard className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-foreground truncate">
                                    {acc.name || "Conta Bancária"}
                                  </h4>
                                  <Badge className={cn(
                                    "text-[9px] py-0 px-1.5",
                                    isCredit 
                                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" 
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  )}>
                                    {isCredit ? "Cartão" : "Corrente"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {acc.bankData?.name || "Banco"} • {acc.number || "S/N"}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-foreground block">
                                {formatCurrency(acc.balance || 0)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Saldo</span>
                            </div>
                          </div>

                          {/* Seletor de Vínculo */}
                          <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-8">
                              <Select
                                value={linkedOrbiumId || "none"}
                                onValueChange={(val) => handleLinkAccount(acc.id, val)}
                              >
                                <SelectTrigger className="h-8.5 text-xs">
                                  <SelectValue placeholder="Vincular à conta..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Não vinculada --</SelectItem>
                                  {contasMovimento.map((cm) => (
                                    <SelectItem key={cm.id} value={cm.id} className="text-xs">
                                      {cm.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="sm:col-span-4 flex items-center justify-end">
                              {!linkedOrbiumId ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCreateOrbiumAccountFromPluggy(acc)}
                                  className="w-full text-xs h-8.5 gap-1 border-dashed"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 text-primary" />
                                  Criar Conta
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] py-1 px-2 text-emerald-600 dark:text-emerald-400 gap-1 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isCredit ? "Lançamento Automático" : "Extrato Pendente"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAINEL 2: TRANSAÇÕES PRIORIZADAS */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] p-5 sm:p-6 shadow-soft border border-border/40 flex flex-col min-h-[440px]">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground leading-tight">Transações</h2>
                    <p className="text-xs text-muted-foreground">Movimentações identificadas</p>
                  </div>
                </div>

                {availableAccounts.length > 0 && (
                  <Select value={selectedTxAccount} onValueChange={setSelectedTxAccount}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="Filtrar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas as Contas</SelectItem>
                      {availableAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex-1 py-2">
                {displayedTransactions.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Nenhuma transação para exibir no momento.
                    </p>
                    {availableAccounts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerSync}
                        disabled={isSyncingPluggy}
                        className="text-xs rounded-xl"
                      >
                        Carregar Transações
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto divide-y divide-border/40 scrollbar-thin pr-1">
                    {displayedTransactions.map(({ tx, pluggyAccId }) => {
                      const rawAmt = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
                      const desc = tx.description || "Transação";
                      const isCardPayment = isCardInvoicePayment(desc);
                      const acc = availableAccounts.find(a => a.id === pluggyAccId);
                      const isCredit = acc?.type === 'CREDIT';
                      
                      const isExpense = isCredit ? !isCardPayment : rawAmt < 0;
                      const cleanAmt = Math.abs(rawAmt);
                      const installmentInfo = parseInstallmentPattern(desc);

                      return (
                        <div key={tx.id} className="py-2.5 px-2 hover:bg-muted/20 transition-colors flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-foreground truncate" title={desc}>
                                {desc}
                              </p>
                              {installmentInfo.isInstallment && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono text-purple-600 dark:text-purple-400 border-purple-500/30">
                                  {installmentInfo.currentInstallment}/{installmentInfo.totalInstallments}
                                </Badge>
                              )}
                              {isCardPayment && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                  Pagamento
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {tx.date ? tx.date.substring(0, 10) : "Data não informada"} • {acc?.name || "Conta"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={cn(
                              "font-bold block text-xs",
                              isExpense ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {isExpense ? "- " : "+ "}{formatCurrency(cleanAmt)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {isCredit 
                                ? (isCardPayment ? "Pagamento Fatura" : "Despesa Cartão") 
                                : (isExpense ? "Débito" : "Crédito")}
                            </span>
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
                  } else if (logLine.includes("[CONFIG]") || logLine.includes("[VÍNCULO]")) {
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
