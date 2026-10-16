"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { PluggySyncPayload, PluggyAccount, PluggyTransaction, PluggyIdentity } from "@/types/pluggy";
import { buildPluggyImportedStatement, convertPluggyTransactionToOrbium } from "@/lib/pluggyAdapter";
import { parseDateLocal } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { toast } from "sonner";
import { 
  Building2, 
  ArrowLeftRight, 
  UserCheck, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  FileCheck2, 
  ShieldCheck, 
  HelpCircle,
  Sparkles,
  Link2,
  Database,
  Key,
  Eye,
  EyeOff,
  Terminal,
  Copy,
  FileCode,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function PluggyLab() {
  const { 
    pluggyConfig, 
    updatePluggyConfig, 
    contasMovimento, 
    addContaMovimento, 
    importedStatements, 
    updateImportedStatement, 
    standardizationRules 
  } = useFinance();

  const [inputItemId, setInputItemId] = useState(pluggyConfig?.itemId || "");
  const [loading, setLoading] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);
  const [data, setData] = useState<PluggySyncPayload | null>(null);
  const [activeTab, setActiveTab] = useState<string>("identity");
  const [selectedTxAccount, setSelectedTxAccount] = useState<string>("");
  const [convertedPreviewModal, setConvertedPreviewModal] = useState(false);
  const [convertedStatementsCount, setConvertedStatementsCount] = useState(0);

  // Credenciais temporárias em memória (NÃO persistentes)
  const [customClientId, setCustomClientId] = useState("");
  const [customClientSecret, setCustomClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showCredentialsPanel, setShowCredentialsPanel] = useState(true);

  // Console de Logs em tempo real
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Console de Diagnóstico do Laboratório Pluggy ativo.`,
    `[${new Date().toLocaleTimeString()}] [INFO] Pronto para receber credenciais temporárias para teste em tempo real.`,
  ]);
  const [rawJsonModalOpen, setRawJsonModalOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll nos logs
  useEffect(() => {
    if (logs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Sincroniza o input com o estado salvo caso alterado externamente
  useEffect(() => {
    if (pluggyConfig?.itemId) {
      setInputItemId(pluggyConfig.itemId);
    }
  }, [pluggyConfig?.itemId]);

  // Busca dados na API proxy da Pluggy
  const fetchPluggyData = useCallback(async (itemIdToFetch: string) => {
    if (!itemIdToFetch.trim()) {
      toast.error("Informe um ITEM_ID válido da Pluggy.");
      return;
    }

    setLoading(true);
    const timeStr = new Date().toLocaleTimeString();
    const isUsingCustom = Boolean(customClientId.trim() && customClientSecret.trim());

    setLogs(prev => [
      ...prev,
      `[${timeStr}] Disparando consulta para Item ID: "${itemIdToFetch.trim()}"...`,
      isUsingCustom 
        ? `[${timeStr}] [AUTENTICAÇÃO] Utilizando Client ID personalizado em memória (${customClientId.trim().substring(0, 8)}...).` 
        : `[${timeStr}] [AUTENTICAÇÃO] Utilizando variáveis de ambiente do servidor (ou fallback sandbox).`
    ]);

    try {
      const response = await fetch('/api/pluggy/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemIdToFetch.trim(),
          clientId: customClientId.trim() || undefined,
          clientSecret: customClientSecret.trim() || undefined,
        }),
      });

      const payload: PluggySyncPayload = await response.json().catch(() => ({}));

      if (payload.logs && Array.isArray(payload.logs)) {
        setLogs(prev => [...prev, ...payload.logs!]);
      }

      if (!response.ok) {
        throw new Error((payload as any).error || `Erro HTTP ${response.status}`);
      }

      setData(payload);

      // Define conta padrão de transações se houver
      if (payload.accounts && payload.accounts.length > 0 && !selectedTxAccount) {
        setSelectedTxAccount(payload.accounts[0].id);
      }

      // Atualiza timestamp da última sincronização
      updatePluggyConfig({ 
        itemId: itemIdToFetch.trim(),
        lastSyncAt: new Date().toISOString() 
      });

      toast.success(
        payload.isSandboxOrDemo 
          ? "Dados simulados (Sandbox / Demonstração) carregados com sucesso!" 
          : "Dados obtidos diretamente da API Pluggy!"
      );
    } catch (err: any) {
      console.error("[PluggyLab] Erro ao buscar dados:", err);
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [FALHA] ${err.message || 'Erro de conexão com a API'}`
      ]);
      toast.error(`Falha ao conectar: ${err.message || 'Verifique o ITEM_ID'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedTxAccount, updatePluggyConfig, customClientId, customClientSecret]);

  // Carrega automaticamente se já houver um itemId salvo anteriormente e chaves configuradas
  useEffect(() => {
    if (pluggyConfig?.itemId && (pluggyConfig.itemId.startsWith("sandbox_") || pluggyConfig.itemId.startsWith("demo_") || customClientId.trim())) {
      fetchPluggyData(pluggyConfig.itemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvar Item ID no estado e persistir no Google Drive / LocalStorage
  const handleSaveItemId = () => {
    if (!inputItemId.trim()) {
      toast.error("Preencha o campo de ITEM_ID.");
      return;
    }
    updatePluggyConfig({ itemId: inputItemId.trim() });
    toast.success("ITEM_ID salvo com sucesso! Será sincronizado no próximo backup do Google Drive.");
    fetchPluggyData(inputItemId.trim());
  };

  const handleCopyLogs = () => {
    if (!logs.length) {
      toast.info("Nenhum log registrado ainda.");
      return;
    }
    navigator.clipboard.writeText(logs.join("\n"));
    toast.success("Logs copiados para a área de transferência!");
  };

  const handleCopyRawJson = () => {
    if (!data) {
      toast.info("Nenhum dado retornado para copiar.");
      return;
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("JSON bruto copiado para a área de transferência!");
  };

  const handleClearLogs = () => {
    setLogs([]);
    toast.info("Logs limpos.");
  };

  const handleDownloadLogs = () => {
    if (!logs.length) {
      toast.info("Nenhum log para baixar.");
      return;
    }
    const blob = new Blob([logs.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pluggy-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo de logs baixado com sucesso!");
  };

  const handleClearCredentials = () => {
    setCustomClientId("");
    setCustomClientSecret("");
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [INFO] Credenciais temporárias removidas da memória da aba.`
    ]);
    toast.info("Credenciais em memória removidas.");
  };

  const handleTestAuth = async () => {
    if (!customClientId.trim() || !customClientSecret.trim()) {
      toast.error("Informe tanto o Client ID quanto o Client Secret para testar a autenticação.");
      return;
    }

    setTestingAuth(true);
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      `[${timeStr}] [INÍCIO TESTE] Validando credenciais na Pluggy API...`,
      `[${timeStr}] [INFO] Client ID: ${customClientId.trim().substring(0, 8)}... (Secret: ${customClientSecret.trim().length} chars)`,
    ]);

    try {
      const response = await fetch('/api/pluggy/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-auth',
          clientId: customClientId.trim(),
          clientSecret: customClientSecret.trim(),
        }),
      });

      const res = await response.json().catch(() => ({}));

      if (res.logs && Array.isArray(res.logs)) {
        setLogs(prev => [...prev, ...res.logs]);
      }

      if (!response.ok || !res.success) {
        throw new Error(res.error || `Erro HTTP ${response.status}`);
      }

      toast.success("Autenticação com a Pluggy bem-sucedida! Chave de acesso temporária validada.");
    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [FALHA TESTE] ${err.message || 'Falha ao autenticar'}`,
      ]);
      toast.error(`Falha no teste: ${err.message}`);
    } finally {
      setTestingAuth(false);
    }
  };

  // Linkagem de contas bancárias
  const handleLinkAccount = (pluggyAccId: string, orbiumAccId: string) => {
    const current = { ...(pluggyConfig?.linkedAccounts || {}) };
    if (!orbiumAccId || orbiumAccId === "none") {
      delete current[pluggyAccId];
    } else {
      current[pluggyAccId] = orbiumAccId;
    }
    updatePluggyConfig({ linkedAccounts: current });
    toast.success("Vínculo de conta atualizado!");
  };

  // Criar nova conta no Orbium diretamente dos dados da Pluggy
  const handleCreateOrbiumAccountFromPluggy = (pluggyAcc: PluggyAccount) => {
    const isCredit = pluggyAcc.type === 'CREDIT';
    const newName = `${pluggyAcc.name || 'Conta Conectada'} (${pluggyAcc.number || 'API'})`;
    
    // Evita duplicatas com o mesmo nome
    const exists = contasMovimento.some(c => c.name.toLowerCase() === newName.toLowerCase());
    if (exists) {
      toast.warning("Já existe uma conta com este nome no Orbium.");
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
      toast.success(`Conta "${newName}" criada e vinculada com sucesso!`);
    }
  };

  // Transações da conta selecionada
  const activeAccountTransactions = useMemo(() => {
    if (!data?.transactions || !selectedTxAccount) return [];
    return data.transactions[selectedTxAccount] || [];
  }, [data, selectedTxAccount]);

  // Transações convertidas para o padrão do Orbium (OFX / partidas dobradas)
  const convertedTransactions = useMemo(() => {
    const targetAccountId = pluggyConfig?.linkedAccounts?.[selectedTxAccount] || contasMovimento[0]?.id || 'acc_temp';
    const selectedAccount = data?.accounts?.find(a => a.id === selectedTxAccount);
    const isCredit = selectedAccount?.type === 'CREDIT';
    return activeAccountTransactions.map((tx, idx) => 
      convertPluggyTransactionToOrbium(tx, targetAccountId, idx, isCredit)
    );
  }, [activeAccountTransactions, selectedTxAccount, pluggyConfig, contasMovimento, data]);

  // Importar o lote de transações da Pluggy como um ImportedStatement isolado
  const handleImportConvertedBatch = () => {
    if (!activeAccountTransactions.length) {
      toast.error("Nenhuma transação disponível para conversão.");
      return;
    }

    const targetAccountId = pluggyConfig?.linkedAccounts?.[selectedTxAccount];
    if (!targetAccountId) {
      toast.error("Vincule esta conta da Pluggy a uma conta do Orbium na aba 'Contas Bancárias' antes de importar.");
      return;
    }

    const selectedPluggyAccount = data?.accounts?.find(a => a.id === selectedTxAccount);
    const orbiumAccount = contasMovimento.find(a => a.id === targetAccountId);

    const statement = buildPluggyImportedStatement(
      activeAccountTransactions,
      targetAccountId,
      orbiumAccount?.name || selectedPluggyAccount?.name,
      standardizationRules
    );

    // Salva no estado de importedStatements do FinanceContext
    updateImportedStatement(statement.id, statement);
    setConvertedStatementsCount(prev => prev + 1);

    toast.success(
      `Lote com ${statement.rawTransactions.length} transações convertido e gerado com sucesso! Pronto para conciliação.`,
      { duration: 5000 }
    );
    setConvertedPreviewModal(false);
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header e Banner de Laboratório Isolado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                Módulo Experimental
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <Database className="w-3 h-3" />
                Vercel Serverless + Google Drive
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Laboratório Open Finance (Pluggy API)
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Ambiente isolado para validação e linkagem de contas bancárias e transações da Pluggy convertidas para o método padrão de partidas dobradas do Orbium.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 1: CREDENCIAIS TEMPORÁRIAS EM MEMÓRIA (NÃO PERSISTENTES) */}
        {/* ========================================================= */}
        <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 pt-4 px-4 md:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Credenciais Temporárias para Teste em Memória
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Não Persistente
                    </span>
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Insira o <code>CLIENT_ID</code> e <code>CLIENT_SECRET</code> da sua conta Pluggy para puxar dados reais. As chaves <strong>não são salvas</strong> no disco nem no backup; residem apenas na memória temporária desta sessão para validação.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {customClientId.trim() && customClientSecret.trim() ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Chaves em Memória Ativas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                    Modo Padrão (Vercel Env / Mock)
                  </span>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowCredentialsPanel(prev => !prev)}
                  className="text-xs h-8 gap-1"
                >
                  {showCredentialsPanel ? (
                    <>
                      Recolher
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      {customClientId ? "Editar Chaves" : "Configurar Chaves"}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {showCredentialsPanel && (
            <CardContent className="px-4 md:px-6 pb-5 pt-0 space-y-4 border-t border-border/40 mt-3 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-client-id" className="text-xs font-medium flex items-center justify-between">
                    <span>CLIENT_ID da Pluggy</span>
                    <span className="text-[10px] text-muted-foreground font-mono">X-CLIENT-ID</span>
                  </Label>
                  <Input
                    id="custom-client-id"
                    placeholder="Ex: 8a4c1092-234b-4c56-8a9d-123456789abc"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    className="font-mono text-xs bg-background/80 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom-client-secret" className="text-xs font-medium flex items-center justify-between">
                    <span>CLIENT_SECRET da Pluggy</span>
                    <button
                      type="button"
                      onClick={() => setShowSecret(prev => !prev)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSecret ? "Ocultar" : "Mostrar"}
                    </button>
                  </Label>
                  <div className="relative">
                    <Input
                      id="custom-client-secret"
                      type={showSecret ? "text" : "password"}
                      placeholder="Ex: 9f8e7d6c-5b4a-3210-fedc-ba9876543210"
                      value={customClientSecret}
                      onChange={(e) => setCustomClientSecret(e.target.value)}
                      className="font-mono text-xs bg-background/80 h-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(prev => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTestAuth}
                    disabled={testingAuth || !customClientId.trim() || !customClientSecret.trim()}
                    className="text-xs h-8 gap-1.5 font-semibold"
                  >
                    {testingAuth ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Testando Autenticação...
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        Testar Autenticação Pluggy
                      </>
                    )}
                  </Button>

                  {(customClientId || customClientSecret) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearCredentials}
                      className="text-xs h-8 text-muted-foreground hover:text-destructive gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar Credenciais da Memória
                    </Button>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>As credenciais em memória são enviadas diretamente via proxy HTTPS e descartadas ao recarregar.</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* ========================================================= */}
        {/* CARD 2: BARRA DE CONTROLE DO ITEM_ID & SINCRONIZAÇÃO */}
        {/* ========================================================= */}
        <Card className="border border-border/70 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="item-id-input" className="text-sm font-semibold flex items-center gap-1.5">
                    Identificador da Conexão Bancária (ITEM_ID)
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" title="ID do item gerado pela Pluggy após o vínculo bancário" />
                  </Label>
                  {pluggyConfig?.lastSyncAt && (
                    <span className="text-xs text-muted-foreground">
                      Última consulta: {format(new Date(pluggyConfig.lastSyncAt), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  )}
                </div>
                <Input
                  id="item-id-input"
                  placeholder="Ex: 800096c5-febb-4101-97c9-cbebb892f34f"
                  value={inputItemId}
                  onChange={(e) => setInputItemId(e.target.value)}
                  className="font-mono text-sm bg-background/80"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <Button 
                  onClick={handleSaveItemId}
                  disabled={loading || !inputItemId.trim()}
                  className="flex-1 h-10 font-semibold gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Consultando API...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar & Puxar Dados
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => fetchPluggyData(inputItemId)}
                  disabled={loading || !inputItemId.trim()}
                  title="Atualizar dados da API agora"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Aviso sobre persistência segura */}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  O <strong>ITEM_ID</strong> e as configurações de linkagem ficam gravados localmente e no backup do <strong>Google Drive</strong>.
                </span>
              </div>
              {customClientId.trim() && customClientSecret.trim() && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  ⚡ Consulta usando credenciais temporárias ativas
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* CARD 3: CONSOLE DE LOGS EM TEMPO REAL (VISUALIZAR E COPIAR) */}
        {/* ========================================================= */}
        <Card className="border border-border/80 shadow-md bg-slate-950 text-slate-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <Terminal className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-slate-200">
                Console de Logs & Diagnóstico da API Pluggy
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {logs.length} eventos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLogs}
                disabled={!logs.length}
                className="text-xs h-7 px-2.5 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
                title="Copiar todo o histórico de logs para a área de transferência"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Logs
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadLogs}
                disabled={!logs.length}
                className="text-xs h-7 px-2.5 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
                title="Baixar arquivo de log (.txt)"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar .txt
              </Button>

              {data && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRawJsonModalOpen(true)}
                  className="text-xs h-7 px-2.5 text-cyan-300 hover:text-cyan-100 hover:bg-slate-800 gap-1.5"
                  title="Ver o JSON completo da resposta retornada pela Pluggy"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  Ver JSON Bruto
                </Button>
              )}

              {logs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLogs}
                  className="text-xs h-7 px-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  title="Limpar logs da tela"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <CardContent className="p-3">
            <div className="font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto space-y-1 p-2 rounded bg-slate-950/90 border border-slate-900 scrollbar-thin scrollbar-thumb-slate-800">
              {logs.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Aguardando requisição... Clique em <strong>"Testar Autenticação"</strong> ou <strong>"Salvar & Puxar Dados"</strong> para visualizar os passos, latência e payloads da Pluggy.
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
                  } else if (logLine.includes("[TESTE AUTH]") || logLine.includes("[INÍCIO TESTE]") || logLine.includes("[AUTENTICAÇÃO]")) {
                    lineStyle = "text-cyan-300 font-medium";
                  } else if (logLine.includes("[ITEM") || logLine.includes("[PLUGGY]")) {
                    lineStyle = "text-purple-300";
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
          </CardContent>
        </Card>

        {/* Abas Segregadas de Validação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-1 sm:grid-cols-3 h-auto p-1 bg-muted/60 border border-border/60">
            <TabsTrigger value="identity" className="py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
              <UserCheck className="w-4 h-4" />
              1. Titular ({data?.identity ? "1" : "0"})
            </TabsTrigger>
            <TabsTrigger value="accounts" className="py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4" />
              2. Contas Bancárias ({data?.accounts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              3. Transações & OFX ({activeAccountTransactions.length})
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* ABA 1: INFORMAÇÕES PESSOAIS / IDENTIDADE */}
          {/* ========================================================= */}
          <TabsContent value="identity" className="space-y-4">
            <Card className="border border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Informações Pessoais do Titular
                </CardTitle>
                <CardDescription>
                  Dados cadastrais extraídos da instituição financeira via Open Finance Brasil
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!data?.identity ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Nenhuma informação de identidade carregada. Insira um ITEM_ID válido e clique em "Salvar & Buscar".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Nome Completo</span>
                      <p className="text-base font-bold text-foreground">{data.identity.fullName}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Documento ({data.identity.documentType})</span>
                      <p className="text-base font-mono font-bold text-foreground">{data.identity.taxNumber}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Instituição de Origem</span>
                      <p className="text-base font-bold text-foreground">{data.identity.institutionName || "Conexão Bancária Ativa"}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">E-mails Cadastrados</span>
                      <p className="text-sm text-foreground">
                        {data.identity.emails?.length ? data.identity.emails.join(", ") : "Não informado"}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Telefones</span>
                      <p className="text-sm text-foreground">
                        {data.identity.phoneNumbers?.length ? data.identity.phoneNumbers.join(", ") : "Não informado"}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Status do Vínculo</span>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Vínculo Validado na API
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 2: CONTAS BANCÁRIAS COM LINKAGEM */}
          {/* ========================================================= */}
          <TabsContent value="accounts" className="space-y-4">
            <Card className="border border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Contas Bancárias & Vínculo com o Orbium
                </CardTitle>
                <CardDescription>
                  Faça o pareamento entre as contas retornadas pelo Open Finance e as contas do seu plano de contas interno.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!data?.accounts?.length ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Nenhuma conta bancária encontrada para este ITEM_ID.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Banco / Instituição</TableHead>
                          <TableHead>Tipo da Conta</TableHead>
                          <TableHead>Agência / Número</TableHead>
                          <TableHead className="text-right">Saldo Informado</TableHead>
                          <TableHead className="min-w-[240px]">Vincular à Conta do Orbium</TableHead>
                          <TableHead className="text-center">Ações Rápidas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.accounts.map((acc) => {
                          const linkedId = pluggyConfig?.linkedAccounts?.[acc.id] || "none";
                          const isLinked = linkedId !== "none";

                          return (
                            <TableRow key={acc.id} className="hover:bg-muted/30">
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: acc.bankData?.primaryColor || '#6366f1' }}
                                  />
                                  <span>{acc.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs font-mono uppercase bg-muted px-2 py-0.5 rounded">
                                  {acc.type}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {acc.agency ? `Ag. ${acc.agency} / ` : ''}{acc.number}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-foreground">
                                {formatCurrency(acc.balance)}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={linkedId}
                                  onValueChange={(val) => handleLinkAccount(acc.id, val)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Selecione a conta do app..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-- Não vinculada --</SelectItem>
                                    {contasMovimento.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name} ({formatCurrency(c.balance)})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center">
                                {!isLinked ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCreateOrbiumAccountFromPluggy(acc)}
                                    className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    Criar no App
                                  </Button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Vinculada
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 3: TRANSAÇÕES & CONVERSOR DE PARTIDAS DOBRADAS (OFX) */}
          {/* ========================================================= */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className="border border-border/70">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowLeftRight className="w-5 h-5 text-primary" />
                      Transações Bancárias & Conversão para o Formato Orbium
                    </CardTitle>
                    <CardDescription>
                      As transações obtidas via API são normalizadas para o modelo de partidas dobradas (estilo OFX) com valores absolutos e indicação de fluxo.
                    </CardDescription>
                  </div>

                  {activeAccountTransactions.length > 0 && (
                    <Button 
                      onClick={() => setConvertedPreviewModal(true)}
                      className="gap-2 font-semibold shadow-sm"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      Visualizar & Importar Lote OFX ({activeAccountTransactions.length})
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Seletor de Conta para visualização */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                  <Label htmlFor="tx-account-select" className="text-xs font-semibold whitespace-nowrap">
                    Selecionar Conta Bancária da Pluggy:
                  </Label>
                  <Select
                    value={selectedTxAccount}
                    onValueChange={setSelectedTxAccount}
                  >
                    <SelectTrigger id="tx-account-select" className="h-9 max-w-md bg-background text-xs">
                      <SelectValue placeholder="Selecione uma conta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.accounts?.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.number}) — Saldo: {formatCurrency(acc.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTxAccount && pluggyConfig?.linkedAccounts?.[selectedTxAccount] && (
                    <div className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Link2 className="w-3.5 h-3.5" />
                      Vinculada ao Orbium em: {contasMovimento.find(c => c.id === pluggyConfig.linkedAccounts[selectedTxAccount])?.name}
                    </div>
                  )}
                </div>

                {!activeAccountTransactions.length ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Nenhuma transação carregada para a conta selecionada.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição Original</TableHead>
                          <TableHead>Categoria Pluggy</TableHead>
                          <TableHead>Fluxo Contábil</TableHead>
                          <TableHead className="text-right">Valor Original</TableHead>
                          <TableHead className="text-right">Valor Convertido Orbium</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeAccountTransactions.map((tx, idx) => {
                          const converted = convertedTransactions[idx];
                          const isCredit = tx.amount > 0 || tx.type === 'CREDIT';

                          return (
                            <TableRow key={tx.id || idx} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {tx.date ? tx.date.substring(0, 10) : "-"}
                              </TableCell>
                              <TableCell className="font-medium text-xs max-w-[280px] truncate" title={tx.description}>
                                {tx.description}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {tx.category || "-"}
                              </TableCell>
                              <TableCell>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${isCredit ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                  {isCredit ? 'Receita (Entrada)' : 'Despesa (Saída)'}
                                </span>
                              </TableCell>
                              <TableCell className={`text-right font-mono font-medium text-xs ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.amount < 0 ? `- R$ ${Math.abs(tx.amount).toFixed(2)}` : `+ R$ ${Math.abs(tx.amount).toFixed(2)}`}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                                {formatCurrency(converted?.amount || Math.abs(tx.amount))}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Pré-visualização do Lote Convertido (Partidas Dobradas / OFX) */}
        <Dialog open={convertedPreviewModal} onOpenChange={setConvertedPreviewModal}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-primary" />
                Pré-visualização do Lote OFX Padronizado
              </DialogTitle>
              <DialogDescription>
                Confirmação das transações mapeadas para o contrato contábil do Orbium antes da criação do lote no histórico.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <p><strong>Conta Destino no Orbium:</strong> {contasMovimento.find(c => c.id === pluggyConfig?.linkedAccounts?.[selectedTxAccount])?.name || "Não vinculada (selecione na aba Contas)"}</p>
                <p><strong>Total de Lançamentos:</strong> {convertedTransactions.length} itens prontos para análise</p>
                <p className="text-muted-foreground">Cada item recebeu um <code>fitId</code> único rastreável e foi classificado em operação de crédito ou débito com partidas dobradas.</p>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">ID (fitId)</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Descrição Padronizada</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {convertedTransactions.slice(0, 10).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px]">{tx.id}</TableCell>
                        <TableCell className="text-xs font-mono">{tx.date}</TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[200px]">{tx.description}</TableCell>
                        <TableCell className="text-xs uppercase">{tx.operationType}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-right">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {convertedTransactions.length > 10 && (
                <p className="text-xs text-center text-muted-foreground">
                  ... e mais {convertedTransactions.length - 10} transações neste lote.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
              <Button variant="outline" onClick={() => setConvertedPreviewModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImportConvertedBatch}
                className="gap-2 font-semibold"
                disabled={!pluggyConfig?.linkedAccounts?.[selectedTxAccount]}
              >
                <CheckCircle2 className="w-4 h-4" />
                Gerar Extrato Padronizado no Orbium
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Resposta Bruta JSON (Raw JSON Modal) */}
        <Dialog open={rawJsonModalOpen} onOpenChange={setRawJsonModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-slate-950 text-slate-100 border-slate-800">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="flex items-center gap-2 text-slate-100 text-base">
                  <FileCode className="w-5 h-5 text-cyan-400" />
                  Resposta Bruta da API Pluggy (JSON Payload)
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRawJson}
                  className="text-xs h-8 bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar JSON
                </Button>
              </div>
              <DialogDescription className="text-slate-400 text-xs">
                Exibição estruturada dos dados brutos retornados pela Pluggy para análise de campos, IDs e integridade contábil.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2">
              <pre className="font-mono text-xs text-emerald-400 bg-slate-900/90 p-4 rounded-lg overflow-x-auto border border-slate-800 max-h-[60vh] select-text">
                {data ? JSON.stringify(data.rawResponse || data, null, 2) : "Nenhum dado retornado ainda."}
              </pre>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setRawJsonModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white hover:bg-slate-900"
              >
                Fechar
              </Button>
              <Button 
                onClick={handleCopyRawJson}
                className="text-xs font-semibold gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar JSON Completo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
