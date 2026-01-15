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
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/contexts/FinanceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarAlertas, DEFAULT_ALERTS, DEFAULT_METAS } from "@/components/dashboard/SidebarAlertas";
import { AlertasConfigDialog, AlertaConfig, MetaConfig } from "@/components/dashboard/AlertasConfigDialog";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { isAfter, isSameDay, startOfDay } from "date-fns";

interface NavItemData {
  title: string;
  path: string;
  icon: React.ElementType;
}

const mainNavItems: NavItemData[] = [
  { title: "Início", path: "/", icon: LayoutDashboard },
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
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => JSON.parse(localStorage.getItem("alertas-config-v3") || JSON.stringify(DEFAULT_ALERTS)));
  const [metasConfig, setMetasConfig] = useState<MetaConfig[]>(() => JSON.parse(localStorage.getItem("metas-config-v3") || JSON.stringify(DEFAULT_METAS)));
  const location = useLocation();
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
    calculateBalanceUpToDate
  } = useFinance();
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

  const NavItem = ({ item }: { item: NavItemData }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const content = (
      <NavLink
        to={item.path}
        className={cn(
          "relative group flex items-center h-11 transition-all duration-300 outline-none",
          collapsed ? "justify-center w-full" : "px-3 gap-3"
        )}
      >
        <div className={cn(
          "absolute inset-y-1 rounded-full transition-all duration-300 ease-in-out",
          isActive ? "bg-primary/20 opacity-100" : "bg-transparent opacity-0 group-hover:bg-muted/50 group-hover:opacity-100",
          collapsed ? "left-2 right-2" : "left-0 right-0"
        )} />
        
        <div className={cn(
          "relative z-10 flex items-center justify-center shrink-0 transition-colors duration-300",
          collapsed ? "w-10 h-10" : "w-5 h-5",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          <Icon className={cn("transition-transform duration-300", isActive ? "scale-110" : "scale-100")} size={collapsed ? 20 : 18} />
        </div>

        {!collapsed && (
          <span className={cn(
            "relative z-10 text-[13px] font-bold tracking-tight transition-colors duration-300 truncate",
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
      "hidden md:flex fixed left-4 top-4 bottom-4 z-40 bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl transition-all duration-500 ease-in-out flex-col rounded-[2rem] overflow-hidden",
      collapsed ? "w-20" : "w-44"
    )}>
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center shrink-0 transition-all duration-500",
        collapsed ? "justify-center" : "px-5 gap-2.5"
      )}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
          <Wallet size={18} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-black text-base leading-tight tracking-tighter">ORBIUM</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Finance</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-2.5 space-y-0.5">
        {mainNavItems.map(item => <NavItem key={item.path} item={item} />)}
      </div>

      {/* Actions */}
      <div className="px-2.5 pb-4 space-y-1.5 mt-auto shrink-0">
        <Separator className="mx-2.5 mb-3 opacity-30" />
        
        {/* Alertas Popover */}
        <Popover open={alertasPopoverOpen} onOpenChange={setAlertasPopoverOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "relative flex items-center h-10 rounded-full transition-all duration-300 group hover:bg-muted/50",
              collapsed ? "justify-center w-full" : "px-3 gap-3 w-full"
            )}>
              <div className="relative flex items-center justify-center w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">
                <Bell size={18} />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
                )}
              </div>
              {!collapsed && <span className="text-[13px] font-bold text-muted-foreground group-hover:text-foreground">Alertas</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" sideOffset={12} className="p-0 border-border/40 shadow-2xl rounded-[1.75rem] w-80 bg-card">
            <div className="px-3 pb-5">
              <SidebarAlertas collapsed={false} onConfigOpen={() => { setAlertasPopoverOpen(false); setAlertasConfigOpen(true); }} />
            </div>
          </PopoverContent>
        </Popover>

        <AlertasConfigDialog 
          open={alertasConfigOpen} 
          onOpenChange={setAlertasConfigOpen} 
          config={alertasConfig} 
          metas={metasConfig} 
          onSave={(newAlerts, newMetas) => {
            setAlertasConfig(newAlerts);
            setMetasConfig(newMetas);
            localStorage.setItem("alertas-config-v3", JSON.stringify(newAlerts));
            localStorage.setItem("metas-config-v3", JSON.stringify(newMetas));
          }} 
          initialStartDate={alertStartDate} 
          onStartDateChange={setAlertStartDate} 
        />

        {/* Ajustes Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "relative flex items-center h-10 rounded-full transition-all duration-300 group hover:bg-muted/50",
              collapsed ? "justify-center w-full" : "px-3 gap-3 w-full"
            )}>
              <div className="flex items-center justify-center w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">
                <Settings size={18} />
              </div>
              {!collapsed && <span className="text-[13px] font-bold text-muted-foreground group-hover:text-foreground">Ajustes</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" sideOffset={12} className="p-0 border-border/40 shadow-2xl rounded-[1.75rem] w-80 bg-card">
            <div className="px-5 pt-5 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-foreground">
                <Settings className="w-4 h-4 text-primary" /> Preferências
              </h3>
            </div>
            
            <div className="px-5 pb-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estilo Visual</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95",
                        theme === t.id 
                          ? "bg-primary/10 text-primary border-primary" 
                          : "bg-muted/30 text-muted-foreground border-transparent hover:border-border/60"
                      )}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[9px] font-bold uppercase">{t.id === 'system' ? 'Auto' : t.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-40" />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Dados & Backup</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl justify-start gap-3 border-border/60 group px-3"
                    onClick={handleExport}
                  >
                    <div className="p-1.5 rounded-lg bg-success/10 text-success">
                      <Download size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold">Gerar Backup</p>
                      <p className="text-[9px] text-muted-foreground">Exportar arquivo .json</p>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl justify-start gap-3 border-border/60 group px-3"
                    onClick={handleImportClick}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Upload size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold">Restaurar Backup</p>
                      <p className="text-[9px] text-muted-foreground">Importar de um arquivo</p>
                    </div>
                  </Button>
                  <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center w-full h-9 rounded-full bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 mt-2",
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"><ChevronLeft size={14} /> Recolher</div>}
        </button>
      </div>
    </aside>
  );
}