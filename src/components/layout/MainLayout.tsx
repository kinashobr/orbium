import { useState, useEffect, useRef, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { cn, parseDateLocal } from "@/lib/utils";
import { BottomNav } from "./BottomNav";
import { 
  Bell, 
  Menu, 
  Settings2, 
  Palette, 
  Cloud, 
  Download, 
  Upload, 
  X 
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SidebarAlertas, DEFAULT_ALERTS, DEFAULT_METAS } from "@/components/dashboard/SidebarAlertas";
import { AlertasConfigDialog, AlertaConfig, MetaConfig } from "@/components/dashboard/AlertasConfigDialog";
import { GoogleDriveSync } from "./GoogleDriveSync";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isAfter, isSameDay, startOfDay } from "date-fns";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({
  children
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const { 
    exportData, 
    importData, 
    alertStartDate, 
    setAlertStartDate,
    transacoesV2,
    emprestimos,
    segurosVeiculo,
    contasMovimento,
    calculateBalanceUpToDate
  } = useFinance();
  
  const { theme, setTheme, themes } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  
  const [alertasConfigOpen, setAlertasConfigOpen] = useState(false);
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => 
    JSON.parse(localStorage.getItem("alertas-config-v3") || JSON.stringify(DEFAULT_ALERTS))
  );
  const [metasConfig, setMetasConfig] = useState<MetaConfig[]>(() => 
    JSON.parse(localStorage.getItem("metas-config-v3") || JSON.stringify(DEFAULT_METAS))
  );

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail);
    };
    window.addEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    return () => {
      window.removeEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    };
  }, []);

  const handleExport = () => {
    exportData();
    toast.success("Backup baixado com sucesso!");
    setShowNavDrawer(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    if (result.success) {
      toast.success(result.message);
      setShowNavDrawer(false);
    } else {
      toast.error(result.message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const alertCount = useMemo(() => {
    const parsedAlertStartDate = startOfDay(parseDateLocal(alertStartDate));
    const now = new Date();
    const empPend = emprestimos.filter(e => e.status === 'pendente_config').length;
    
    const receitasMes = transacoesV2
      .filter(t => (t.operationType === "receita" || t.operationType === "rendimento") && (isAfter(parseDateLocal(t.date), parsedAlertStartDate) || isSameDay(parseDateLocal(t.date), parsedAlertStartDate)))
      .reduce((acc, t) => acc + t.amount, 0);
    
    const despesasMes = transacoesV2
      .filter(t => (t.operationType === "despesa" || t.operationType === "pagamento_emprestimo") && (isAfter(parseDateLocal(t.date), parsedAlertStartDate) || isSameDay(parseDateLocal(t.date), parsedAlertStartDate)))
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
    if (empPend > 0) count++;
    if (margemPoupanca < 10 && receitasMes > 0) count++;
    if (segurosVencendo > 0) count++;
    
    const saldoLiquidez = contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType))
      .reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, now, transacoesV2, contasMovimento), 0);
    if (saldoLiquidez < 0) count++;

    return count;
  }, [transacoesV2, emprestimos, segurosVeiculo, alertStartDate, contasMovimento, calculateBalanceUpToDate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Header Mobile */}
      <header className="fixed top-0 right-0 z-50 md:hidden flex items-center gap-2 p-3">
        {/* Alertas - Novo Design Superior (Top Sheet) */}
        <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
          <DialogTrigger asChild>
            <button className="relative flex items-center justify-center w-12 h-12 rounded-[1.25rem] bg-card/80 backdrop-blur-xl border border-border/40 shadow-soft-lg active:scale-90 transition-all duration-300">
              <Bell className="h-5 w-5 text-foreground/80" />
              {alertCount > 0 && (
                <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/40 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card"></span>
                </span>
              )}
            </button>
          </DialogTrigger>
          <DialogContent hideCloseButton className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[400px] rounded-[2.5rem] bg-card/95 backdrop-blur-2xl border-border/40 shadow-2xl animate-in slide-in-from-top-8 duration-500 p-0 overflow-hidden translate-y-0">
            <div className="p-6 max-h-[80vh] overflow-y-auto hide-scrollbar-mobile">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-left text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-destructive/10">
                      <Bell className="w-5 h-5 text-destructive" />
                    </div>
                    Central de Alertas
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-10 w-10 bg-muted/50 hover:bg-muted" 
                    onClick={() => setShowAlertsDialog(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <SidebarAlertas 
                collapsed={false} 
                onConfigOpen={() => { 
                  setShowAlertsDialog(false); 
                  setAlertasConfigOpen(true); 
                }} 
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Painel de Controle (Mantido Drawer para diferenciar ações) */}
        <Drawer open={showNavDrawer} onOpenChange={setShowNavDrawer}>
          <DrawerTrigger asChild>
            <button className="flex items-center justify-center w-12 h-12 rounded-[1.25rem] bg-card/80 backdrop-blur-xl border border-border/40 shadow-soft-lg active:scale-90 transition-all duration-300">
              <Menu className="h-5 w-5 text-foreground/80" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="rounded-t-[3rem] border-t-border bg-card max-h-[90vh]">
            <div className="mx-auto w-12 h-1.5 bg-muted/50 rounded-full mt-4 mb-2" />
            <DrawerHeader className="px-8 pb-4">
              <DrawerTitle className="text-left text-xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-primary/10">
                  <Settings2 className="w-6 h-6 text-primary" />
                </div>
                Painel de Controle
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-8 py-4 space-y-8 overflow-y-auto hide-scrollbar-mobile pb-12">
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">Tema Visual</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {themes.map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={cn("flex flex-col items-center justify-center gap-2 py-4 rounded-[2rem] border-2 transition-all", theme === t.id ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]" : "bg-muted/30 text-muted-foreground border-transparent hover:border-border/60")}>
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t.id === "system" ? "Auto" : t.id === "brown-light" ? "Claro" : "Escuro"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Separator className="opacity-40" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">Sincronização na Nuvem</p>
                </div>
                <GoogleDriveSync />
              </div>
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">Backup Local</p>
                <div className="grid grid-cols-1 gap-3">
                  <Button variant="outline" className="w-full justify-start h-14 rounded-[1.75rem] border-border/60 gap-4 group active:scale-[0.98] transition-all" onClick={handleExport}>
                    <div className="p-2.5 rounded-xl bg-success/10 text-success"><Download className="w-5 h-5" /></div>
                    <div className="text-left"><p className="text-sm font-bold">Exportar .json</p><p className="text-[10px] text-muted-foreground">Baixar arquivo de segurança</p></div>
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-14 rounded-[1.75rem] border-border/60 gap-4 group active:scale-[0.98] transition-all" onClick={handleImportClick}>
                    <div className="p-2.5 rounded-xl bg-info/10 text-info"><Upload className="w-5 h-5" /></div>
                    <div className="text-left"><p className="text-sm font-bold">Importar .json</p><p className="text-[10px] text-muted-foreground">Restaurar dados antigos</p></div>
                  </Button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <div className="flex-1 flex w-full relative">
        <Sidebar />
        <main className={cn("flex-1 min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 md:px-8 lg:px-10 pb-24 md:pb-8 pt-4 sm:pt-6 transition-all duration-300 w-full mx-auto", sidebarCollapsed ? "md:ml-20" : "md:ml-[168px]")}>
          <div className="max-w-[1400px] mx-auto w-full space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>
      <BottomNav />
      <AlertasConfigDialog open={alertasConfigOpen} onOpenChange={setAlertasConfigOpen} config={alertasConfig} metas={metasConfig} onSave={(newAlerts, newMetas) => { setAlertasConfig(newAlerts); setMetasConfig(newMetas); localStorage.setItem("alertas-config-v3", JSON.stringify(newAlerts)); localStorage.setItem("metas-config-v3", JSON.stringify(newMetas)); }} initialStartDate={alertStartDate} onStartDateChange={setAlertStartDate} />
    </div>
  );
}