import { useState, useRef, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn, parseDateLocal } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Car, 
  ChevronLeft, 
  ChevronRight, 
  Wallet, 
  Download, 
  Upload, 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Building, 
  Bell, 
  Settings,
  Palette,
  Database,
  Monitor,
  CalendarCheck,
  Sparkles,
  RefreshCw,
  Landmark,
  Cloud,
  CloudDownload,
  CloudUpload,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/contexts/FinanceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { initiateGoogleAuth } from "@/lib/googleDrive";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarAlertas, DEFAULT_ALERTS } from "@/components/dashboard/SidebarAlertas";
import { AlertasConfigDialog, AlertaConfig } from "@/components/dashboard/AlertasConfigDialog";
import { GoogleDriveSync } from "./GoogleDriveSync";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { isAfter, isSameDay, startOfDay, format } from "date-fns";

interface NavItemData {
  title: string;
  path: string;
  icon: React.ElementType;
}

const mainNavItems: NavItemData[] = [
  { title: "Visão Geral", path: "/", icon: LayoutDashboard },
  { title: "Movimentação", path: "/receitas-despesas", icon: Receipt },
  { title: "Financiamentos", path: "/emprestimos", icon: CreditCard },
  { title: "Análise", path: "/relatorios", icon: BarChart3 },
  { title: "Investimentos", path: "/investimentos", icon: PieChart },
  { title: "Bens", path: "/veiculos", icon: Car },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [alertasPopoverOpen, setAlertasPopoverOpen] = useState(false);
  const [alertasConfigOpen, setAlertasConfigOpen] = useState(false);
  const [ajustesPopoverOpen, setAjustesPopoverOpen] = useState(false);
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => JSON.parse(localStorage.getItem("alertas-config-v3") || JSON.stringify(DEFAULT_ALERTS)));
  const location = useLocation();
  const navigate = useNavigate();
  const finance = useFinance();
  const { isConnected: isConnectedDrive, isSyncing: isSyncingDrive, saveToDrive, loadFromDrive } = useGoogleDrive();
  const { 
    exportData, 
    importData,
    transacoesV2, 
    emprestimos, 
    segurosVeiculo,
    contasMovimento,
    getSaldoDevedor,
    alertStartDate,
    setAlertStartDate,
    calculateBalanceUpToDate,
    pluggyConfig,
    syncPluggyData,
    isSyncingPluggy
  } = finance;
  const { theme, setTheme, themes, resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) {
      setCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: collapsed }));
  }, [collapsed]);

  const alertCount = useMemo(() => {
    const parsedAlertStartDate = startOfDay(parseDateLocal(alertStartDate));
    const now = new Date();
    const emprestimosPendentes = emprestimos.filter(e => e.status === 'pendente_config').length;
    
    const transacoesFluxo = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return isAfter(d, parsedAlertStartDate) || isSameDay(d, parsedAlertStartDate);
      } catch { return false; }
    });

    const receitasMes = transacoesFluxo
      .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
      .reduce((acc, t) => acc + t.amount, 0);
    const despesasMes = transacoesFluxo
      .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
      .reduce((acc, t) => acc + t.amount, 0);
    const margemPoupanca = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;
    
    const dataLimiteSeguro = new Date();
    dataLimiteSeguro.setDate(dataLimiteSeguro.getDate() + 60);
    const segurosVencendo = segurosVeiculo.filter(s => {
      try {
        const vigenciaFim = parseDateLocal(s.vigenciaFim);
        return vigenciaFim > now && vigenciaFim <= dataLimiteSeguro;
      } catch { return false; }
    }).length;

    let count = 0;
    if (emprestimosPendentes > 0) count++;
    if (margemPoupanca < 10 && receitasMes > 0) count++;
    if (segurosVencendo > 0) count++;
    
    const contasLiquidez = contasMovimento.filter(c => 
      ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType)
    );
    const saldoLiquidez = contasLiquidez.reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, now, transacoesV2, contasMovimento), 0);
    if (saldoLiquidez < 0) count++;

    return count;
  }, [transacoesV2, emprestimos, segurosVeiculo, alertStartDate, contasMovimento, calculateBalanceUpToDate]);

  const handleExport = () => {
    exportData();
    toast({ title: "Backup Gerado", description: "O arquivo de dados foi baixado." });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".json")) return;
    const result = await importData(file);
    toast({ 
      title: result.success ? "Restauração Completa" : "Erro", 
      description: result.message,
      variant: result.success ? "default" : "destructive"
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleQuickSyncPluggy = async () => {
    if (!pluggyConfig?.itemId) {
      toast({ 
        title: "ITEM_ID Necessário", 
        description: "Configure o ITEM_ID na tela de Open Finance antes de sincronizar.",
        variant: "destructive"
      });
      setAjustesPopoverOpen(false);
      navigate("/open-finance");
      return;
    }

    toast({ 
      title: "Open Finance", 
      description: "Sincronizando dados bancários sob demanda..." 
    });

    const result = await syncPluggyData();
    if (result.success) {
      toast({ 
        title: "Open Finance Atualizado", 
        description: result.message 
      });
    } else {
      toast({ 
        title: "Erro na Atualização", 
        description: result.message,
        variant: "destructive"
      });
    }
  };

  const handleQuickSyncDrive = () => {
    if (!isConnectedDrive) {
      initiateGoogleAuth();
      return;
    }
    const dataToSave = {
      schemaVersion: "2.0", 
      exportedAt: new Date().toISOString(), 
      data: { 
        accounts: contasMovimento, 
        categories: finance.categoriasV2, 
        transactions: transacoesV2, 
        emprestimos: emprestimos, 
        veiculos: finance.veiculos, 
        segurosVeiculo: segurosVeiculo, 
        objetivos: finance.objetivos, 
        billsTracker: finance.billsTracker, 
        standardizationRules: finance.standardizationRules, 
        importedStatements: finance.importedStatements, 
        revenueForecasts: finance.revenueForecasts, 
        alertStartDate: alertStartDate, 
        imoveis: finance.imoveis, 
        terrenos: finance.terrenos,
        metasPersonalizadas: finance.metasPersonalizadas,
        creditCardConfigs: finance.creditCardConfigs,
        cltContracts: finance.cltContracts,
        cltCompetencias: finance.cltCompetencias,
        cltLegislacaoConfigs: finance.cltLegislacaoConfigs,
        cltHolerites: finance.cltHolerites,
        vinculosOcupacionais: finance.vinculosOcupacionais,
        recebiveisParcelados: finance.recebiveisParcelados,
        parcelasRecebiveis: finance.parcelasRecebiveis,
        eventosFerias: finance.eventosFerias,
        eventosRescisao: finance.eventosRescisao,
        historicosContribuicaoINSS: finance.historicosContribuicaoINSS,
        ignoredTxIds: finance.ignoredTxIds,
        pluggyConfig: pluggyConfig,
      },
      lastModified: finance.lastModified,
    };
    saveToDrive(dataToSave);
  };

  const handleQuickLoadDrive = async () => {
    if (!isConnectedDrive) {
      initiateGoogleAuth();
      return;
    }
    await loadFromDrive();
  };

  const NavItem = ({ item }: { item: NavItemData }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const content = (
      <NavLink
        to={item.path}
        className={cn(
          "relative group flex items-center h-10 transition-all duration-300 outline-none",
          collapsed ? "justify-center w-full" : "px-3 gap-2.5"
        )}
      >
        <div className={cn(
          "absolute inset-y-0.5 rounded-xl transition-all duration-300 ease-in-out",
          isActive ? "bg-primary/20 opacity-100" : "bg-transparent opacity-0 group-hover:bg-muted/50 group-hover:opacity-100",
          collapsed ? "left-2 right-2" : "left-0 right-0"
        )} />
        
        <div className={cn(
          "relative z-10 flex items-center justify-center shrink-0 transition-colors duration-300",
          collapsed ? "w-9 h-9" : "w-5 h-5",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          <Icon className={cn("transition-transform duration-300", isActive ? "scale-105" : "scale-100")} size={collapsed ? 19 : 17} />
        </div>

        {!collapsed && (
          <span className={cn(
            "relative z-10 text-[12px] font-bold tracking-tight transition-colors duration-300 truncate",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {item.title}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-bold">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside className={cn(
      "hidden md:flex fixed left-3 top-3 bottom-3 z-40 bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl transition-all duration-500 ease-in-out flex-col rounded-[1.5rem] overflow-hidden",
      collapsed ? "w-16" : "w-40"
    )}>
      {/* Logo */}
      <div className={cn(
        "h-14 flex items-center shrink-0 transition-all duration-500",
        collapsed ? "justify-center" : "px-4 gap-2"
      )}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
          <Wallet size={16} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-black text-sm leading-tight tracking-tighter">ORBIUM</span>
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Finance</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto scrollbar-material py-2 px-2 space-y-0.5">
        {mainNavItems.map(item => <NavItem key={item.path} item={item} />)}
      </div>

      {/* Actions */}
      <div className="px-2 pb-4 space-y-1.5 mt-auto shrink-0">
        <Separator className="mx-2 mb-2 opacity-30" />
        
        {/* Barra de Ações Rápidas: Open Finance & Nuvem Google Drive (Apenas Ícones com Descrição Flutuante) */}
        <div className={cn(
          "grid gap-1.5 p-1 rounded-2xl bg-muted/30 border border-border/40",
          collapsed ? "grid-cols-1" : "grid-cols-3"
        )}>
          {/* 1. Open Finance (Abrir Tela) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate("/open-finance")}
                className={cn(
                  "relative flex items-center justify-center h-9 w-full rounded-xl transition-all duration-200 active:scale-95 group",
                  location.pathname === "/open-finance"
                    ? "bg-primary/15 text-primary border border-primary/40 shadow-xs"
                    : "bg-card/70 hover:bg-card text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/40 shadow-2xs"
                )}
                aria-label="Open Finance"
              >
                <Landmark size={16} />
                {pluggyConfig?.itemId && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-card" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"} className="font-bold text-xs shadow-md">
              Open Finance (Contas Bancárias)
            </TooltipContent>
          </Tooltip>

          {/* 2. Nuvem Google Drive: Sincronizar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleQuickSyncDrive}
                disabled={isSyncingDrive}
                className={cn(
                  "relative flex items-center justify-center h-9 w-full rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 group shadow-2xs",
                  isConnectedDrive 
                    ? "bg-card/70 hover:bg-card text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/40" 
                    : "bg-card/40 hover:bg-card text-muted-foreground/60 hover:text-foreground border border-border/30 hover:border-border/60"
                )}
                aria-label="Sincronizar Nuvem (Google Drive)"
              >
                <CloudUpload size={16} className={cn(isSyncingDrive && "animate-spin text-primary")} />
                {isConnectedDrive && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-card" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"} className="font-bold text-xs shadow-md">
              {isConnectedDrive 
                ? (isSyncingDrive ? "Sincronizando Nuvem..." : "Sincronizar Nuvem (Drive)") 
                : "Conectar Nuvem (Google Drive)"}
            </TooltipContent>
          </Tooltip>

          {/* 3. Nuvem Google Drive: Baixar Dados */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleQuickLoadDrive}
                disabled={isSyncingDrive}
                className={cn(
                  "relative flex items-center justify-center h-9 w-full rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 group shadow-2xs",
                  isConnectedDrive 
                    ? "bg-card/70 hover:bg-card text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/40" 
                    : "bg-card/40 hover:bg-card text-muted-foreground/60 hover:text-foreground border border-border/30 hover:border-border/60"
                )}
                aria-label="Baixar Dados da Nuvem (Google Drive)"
              >
                <CloudDownload size={16} className={cn(isSyncingDrive && "animate-spin text-primary")} />
              </button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"} className="font-bold text-xs shadow-md">
              {isConnectedDrive 
                ? (isSyncingDrive ? "Baixando da Nuvem..." : "Baixar Dados da Nuvem (Drive)") 
                : "Conectar Nuvem (Google Drive)"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Alertas Popover */}
        <Popover open={alertasPopoverOpen} onOpenChange={setAlertasPopoverOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "relative flex items-center h-9 rounded-xl transition-all duration-300 group hover:bg-muted/50",
              collapsed ? "justify-center w-full" : "px-3 gap-2.5 w-full"
            )}>
              <div className="relative flex items-center justify-center w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">
                <Bell size={17} />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-destructive rounded-full border-2 border-card" />
                )}
              </div>
              {!collapsed && <span className="text-[12px] font-bold text-muted-foreground group-hover:text-foreground">Alertas</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" sideOffset={12} className="p-0 border-border/40 shadow-2xl rounded-[1.5rem] w-72 bg-card">
            <div className="px-2 pb-4">
              <SidebarAlertas collapsed={false} onConfigOpen={() => { setAlertasPopoverOpen(false); setAlertasConfigOpen(true); }} />
            </div>
          </PopoverContent>
        </Popover>

        <AlertasConfigDialog 
          open={alertasConfigOpen} 
          onOpenChange={setAlertasConfigOpen} 
          config={alertasConfig} 
          onSave={(newAlerts) => {
            setAlertasConfig(newAlerts);
            localStorage.setItem("alertas-config-v3", JSON.stringify(newAlerts));
          }} 
          initialStartDate={alertStartDate} 
          onStartDateChange={setAlertStartDate} 
        />

        {/* Ajustes Popover */}
        <Popover open={ajustesPopoverOpen} onOpenChange={setAjustesPopoverOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "relative flex items-center h-9 rounded-xl transition-all duration-300 group hover:bg-muted/50",
              collapsed ? "justify-center w-full" : "px-3 gap-2.5 w-full"
            )}>
              <div className="flex items-center justify-center w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">
                <Settings size={17} />
              </div>
              {!collapsed && <span className="text-[12px] font-bold text-muted-foreground group-hover:text-foreground">Ajustes</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" sideOffset={12} className="p-0 border-border/50 shadow-2xl rounded-[1.75rem] w-80 bg-card/95 backdrop-blur-xl">
            <div className="px-5 pt-4 pb-3 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                  Ajustes
                </h3>
              </div>
            </div>
            
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Seção 1: Tema / Aparência */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Aparência</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95",
                        theme === t.id 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-muted/40 text-muted-foreground border-transparent hover:border-border/60 hover:text-foreground"
                      )}
                    >
                      <span className="text-sm">{t.icon}</span>
                      <span className="text-[9px] uppercase tracking-wide">{t.id === 'system' ? 'Auto' : t.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* Seção 2: Sincronização & Backup (Diferenciação clara entre Nuvem e Backup Local, apenas ícones) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Sincronização & Backup</p>
                  </div>
                  {pluggyConfig?.lastSyncAt && (
                    <span className="text-[9px] font-mono text-muted-foreground opacity-75">
                      Sync: {format(parseDateLocal(pluggyConfig.lastSyncAt.substring(0, 10)), "dd/MM")}
                    </span>
                  )}
                </div>

                <TooltipProvider delayDuration={100} skipDelayDuration={0}>
                  <div className="space-y-2.5">
                    {/* Bloco 1: Nuvem (Google Drive & Open Finance) */}
                    <div className="p-2.5 rounded-2xl bg-primary/[0.04] dark:bg-primary/[0.06] border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-1.5 text-primary">
                          <Cloud className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Nuvem & Conexões</span>
                        </div>
                        {isConnectedDrive && (
                          <span className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Drive Ativo
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {/* 1. Open Finance (Navegação) */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                setAjustesPopoverOpen(false);
                                navigate("/open-finance");
                              }}
                              className="relative h-10 w-full rounded-xl border border-primary/20 bg-card hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                              aria-label="Abrir Open Finance"
                            >
                              <Landmark size={17} />
                              {pluggyConfig?.itemId && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-card" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="font-bold text-xs shadow-md">
                            Open Finance (Conexões Bancárias)
                          </TooltipContent>
                        </Tooltip>

                        {/* 2. Sincronizar Open Finance */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleQuickSyncPluggy}
                              disabled={isSyncingPluggy}
                              className="h-10 w-full rounded-xl border border-primary/20 bg-card hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
                              aria-label="Sincronizar Open Finance"
                            >
                              <RefreshCw size={16} className={cn(isSyncingPluggy && "animate-spin text-primary")} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="font-bold text-xs shadow-md">
                            {isSyncingPluggy ? "Sincronizando..." : "Sincronizar Open Finance"}
                          </TooltipContent>
                        </Tooltip>

                        {/* 3. Nuvem: Sincronizar Google Drive */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleQuickSyncDrive}
                              disabled={isSyncingDrive}
                              className={cn(
                                "relative h-10 w-full rounded-xl border border-primary/20 bg-card hover:bg-primary/10 hover:border-primary/40 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-2xs",
                                isConnectedDrive ? "text-primary" : "text-muted-foreground"
                              )}
                              aria-label="Sincronizar com Nuvem Google Drive"
                            >
                              <CloudUpload size={17} className={cn(isSyncingDrive && "animate-spin text-primary")} />
                              {isConnectedDrive && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-card" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="font-bold text-xs shadow-md">
                            {isConnectedDrive 
                              ? (isSyncingDrive ? "Sincronizando Nuvem..." : "Nuvem: Sincronizar Dados (Drive)") 
                              : "Nuvem: Conectar Google Drive"}
                          </TooltipContent>
                        </Tooltip>

                        {/* 4. Nuvem: Baixar dados do Google Drive */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleQuickLoadDrive}
                              disabled={isSyncingDrive}
                              className={cn(
                                "h-10 w-full rounded-xl border border-primary/20 bg-card hover:bg-primary/10 hover:border-primary/40 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-2xs",
                                isConnectedDrive ? "text-primary" : "text-muted-foreground"
                              )}
                              aria-label="Baixar Dados da Nuvem Google Drive"
                            >
                              <CloudDownload size={17} className={cn(isSyncingDrive && "animate-spin text-primary")} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="font-bold text-xs shadow-md">
                            {isConnectedDrive 
                              ? (isSyncingDrive ? "Baixando da Nuvem..." : "Nuvem: Baixar Dados (Drive)") 
                              : "Nuvem: Conectar Google Drive"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Bloco 2: Backup Local (Arquivo JSON no computador) */}
                    <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                      <div className="flex items-center gap-1.5 px-0.5 text-muted-foreground">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Backup Local (Arquivo)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {/* 1. Exportar Arquivo Local */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleExport}
                              className="h-10 w-full rounded-xl border border-border/50 bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-500 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                              aria-label="Exportar Backup Local (.json)"
                            >
                              <Download size={17} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="font-bold text-xs shadow-md">
                            Backup Local: Baixar Arquivo (.json)
                          </TooltipContent>
                        </Tooltip>

                        {/* 2. Restaurar Arquivo Local */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleImportClick}
                              className="h-10 w-full rounded-xl border border-border/50 bg-card hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                              aria-label="Restaurar Backup Local (.json)"
                            >
                              <Upload size={17} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="font-bold text-xs shadow-md">
                            Backup Local: Restaurar Arquivo (.json)
                          </TooltipContent>
                        </Tooltip>
                        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
                      </div>
                    </div>
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center w-full h-8 rounded-xl bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 mt-1",
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"><ChevronLeft size={12} /> Recolher</div>}
        </button>
      </div>
    </aside>
  );
}