import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  BarChart3,
  TrendingUp,
  Car
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();
  const isPathActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-300",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <div className={cn(
        "relative flex items-center justify-center h-6 w-10 rounded-full transition-all duration-300 overflow-hidden",
        isPathActive(to) ? "bg-primary/20 scale-105" : "bg-transparent"
      )}>
        <Icon className={cn("h-4 w-4 transition-transform duration-300", isPathActive(to) && "scale-110")} />
      </div>
      <span className={cn(
        "text-[6.5px] font-black uppercase tracking-wider transition-all duration-300",
        isPathActive(to) ? "text-primary opacity-100" : "opacity-60"
      )}>
        {label}
      </span>
    </NavLink>
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center md:hidden px-2 pb-2 pt-0 pointer-events-none">
      <div className="pointer-events-auto bg-card rounded-[2.5rem] border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-[min(100%,480px)] w-full overflow-hidden">
        <div className="flex items-center justify-between h-16 px-2">
          <NavItem to="/" icon={LayoutDashboard} label="Início" />
          <NavItem to="/receitas-despesas" icon={Receipt} label="Movimentar" />
          <NavItem to="/emprestimos" icon={CreditCard} label="Financiar" />
          <NavItem to="/relatorios" icon={BarChart3} label="Análise" />
          <NavItem to="/investimentos" icon={TrendingUp} label="Investir" />
          <NavItem to="/veiculos" icon={Car} label="Bens" />
        </div>
      </div>
    </nav>
  );
}