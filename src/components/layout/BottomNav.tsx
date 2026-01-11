import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  BarChart3,
  TrendingUp,
  Car,
  Download,
  Upload,
  Menu,
  Bell,
  Settings2,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SidebarAlertas } from "@/components/dashboard/SidebarAlertas";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function BottomNav() {
  const location = useLocation();
  const { exportData, importData } = useFinance();
  const { theme, setTheme, themes } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNavDrawer, setShowNavDrawer] = useState(false);

  const isPathActive = (path: string) => location.pathname === path;

  const handleExport = () => {
    exportData();
    toast.success("Arquivo finance-data.json baixado com sucesso!");
    setShowNavDrawer(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Por favor, selecione um arquivo JSON válido.");
      return;
    }

    const result = await importData(file);
    if (result.success) {
      toast.success(result.message);
      setShowNavDrawer(false);
    } else {
      toast.error(result.message);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex-none w-[76px] flex flex-col items-center justify-center gap-1.5 py-2 transition-all duration-300 snap-center",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <div className={cn(
        "relative flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300 overflow-hidden",
        isPathActive(to) ? "bg-primary/20 scale-105" : "bg-transparent"
      )}>
        <Icon className={cn("h-5 w-5 transition-transform duration-300", isPathActive(to) && "scale-110")} />
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
        isPathActive(to) ? "text-primary opacity-100" : "opacity-70"
      )}>
        {label}
      </span>
    </NavLink>
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center md:hidden px-2 pb-2 pt-0 pointer-events-none">
      <div className="pointer-events-auto bg-card rounded-[2.5rem] border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-[min(100%,480px)] w-full overflow-hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center h-20 px-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <NavItem to="/" icon={LayoutDashboard} label="Início" />
          <NavItem to="/receitas-despesas" icon={Receipt} label="Movimentar" />
          <NavItem to="/emprestimos" icon={CreditCard} label="Financiar" />
          <NavItem to="/relatorios" icon={BarChart3} label="Análise" />
          <NavItem to="/investimentos" icon={TrendingUp} label="Investir" />
          <NavItem to="/veiculos" icon={Car} label="Bens" />

          <Drawer open={showNavDrawer} onOpenChange={setShowNavDrawer}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex-none w-[76px] flex flex-col items-center justify-center gap-1.5 py-2 snap-center transition-all",
                  showNavDrawer ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300",
                  showNavDrawer ? "bg-primary/20 scale-105" : "bg-transparent"
                )}>
                  <Menu className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-all",
                  showNavDrawer ? "text-primary opacity-100" : "opacity-70"
                )}>
                  Mais
                </span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[3rem] border-t-border bg-card max-h-[85vh]">
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">Tema Visual</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 py-4 rounded-[2rem] border-2 transition-all",
                          theme === t.id 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]" 
                            : "bg-muted/30 text-muted-foreground border-transparent hover:border-border/60"
                        )}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {t.id === "system" ? "Auto" : t.id === "brown-light" ? "Claro" : "Escuro"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="opacity-40" />

                <div className="space-y-4">
                  <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">Gestão de Dados</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-14 rounded-[1.75rem] border-border/60 gap-4 group active:scale-[0.98] transition-all"
                      onClick={handleExport}
                    >
                      <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:bg-success/20 transition-colors">
                        <Download className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Exportar Backup</p>
                        <p className="text-[10px] text-muted-foreground">Baixar arquivo .json atualizado</p>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-14 rounded-[1.75rem] border-border/60 gap-4 group active:scale-[0.98] transition-all"
                      onClick={handleImportClick}
                    >
                      <div className="p-2.5 rounded-xl bg-info/10 text-info group-hover:bg-info/20 transition-colors">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Importar Dados</p>
                        <p className="text-[10px] text-muted-foreground">Restaurar de um arquivo externo</p>
                      </div>
                    </Button>
                  </div>
                </div>

                <Separator className="opacity-40" />

                <div className="space-y-4 pb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em]">Alertas Ativos</p>
                  </div>
                  <div className="bg-muted/20 rounded-[2.5rem] p-2 border border-border/30">
                    <SidebarAlertas collapsed={false} />
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
}