import { useMemo } from "react";
import { 
  AlertTriangle, 
  Calendar, 
  TrendingDown,
  Sparkles,
  Settings,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { cn, getDueDate } from "@/lib/utils";
import { Emprestimo } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { differenceInDays, isBefore, isToday, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AlertItem {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  icon: React.ElementType;
  title: string;
  description: string;
  statusLabel: string;
  value?: string; 
  action?: () => void;
}

interface LoanAlertsProps {
  emprestimos: Emprestimo[];
  className?: string;
  onOpenPendingConfig?: () => void;
}

export function LoanAlerts({ emprestimos, className, onOpenPendingConfig }: LoanAlertsProps) {
  const { calculateLoanSchedule, calculatePaidInstallmentsUpToDate } = useFinance();
  const hoje = new Date();
  const activeLoans = useMemo(() => emprestimos.filter(e => e.status === 'ativo' || e.status === 'pendente_config'), [emprestimos]);

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    let totalJurosRestantes = 0;
    let nextDueDate: Date | null = null;
    let hasOverdue = false;

    activeLoans.forEach(loan => {
      if (loan.status === 'pendente_config') return;
      const schedule = calculateLoanSchedule(loan.id);
      const paidCount = calculatePaidInstallmentsUpToDate(loan.id, hoje);
      schedule.forEach(item => { if (item.parcela > paidCount) totalJurosRestantes += item.juros; });
      for (let i = 1; i <= loan.meses; i++) {
        if (i > paidCount) {
          const dueDate = getDueDate(loan.dataInicio!, i);
          if (!nextDueDate || isBefore(dueDate, nextDueDate)) nextDueDate = dueDate;
          if (isPast(dueDate) && !isToday(dueDate)) hasOverdue = true;
          break;
        }
      }
    });

    const pendingLoans = emprestimos.filter(e => e.status === 'pendente_config');
    
    if (pendingLoans.length > 0) items.push({ 
        id: "pend", type: "info", icon: Settings, title: "CONFIGURAÇÃO", statusLabel: "PENDENTE", 
        description: "Contratos novos detectados aguardando definição de prazos.", 
        action: onOpenPendingConfig 
    });
    
    if (hasOverdue) items.push({ 
        id: "over", type: "danger", icon: AlertTriangle, title: "PAGAMENTOS", statusLabel: "CRÍTICO", 
        description: "Há parcelas vencidas em seu portfólio de crédito. Revise o cronograma." 
    });
    
    if (nextDueDate && differenceInDays(nextDueDate, hoje) <= 7) items.push({ 
        id: "next", type: "warning", icon: Calendar, title: "VENCIMENTO", statusLabel: "ATENÇÃO", 
        description: `Próxima fatura de empréstimo vence em ${differenceInDays(nextDueDate, hoje)} dias.` 
    });
    
    if (totalJurosRestantes > 1000) {
      items.push({ 
        id: "save", type: "success", icon: Zap, title: "AMORTIZAÇÃO", statusLabel: "SAUDÁVEL", 
        description: "Economia potencial ao quitar o principal antecipadamente.",
        value: `R$ ${totalJurosRestantes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
      });
    }
    
    if (items.length === 0) {
        items.push({
            id: "ok", type: "success", icon: ShieldCheck, title: "PORTFÓLIO", statusLabel: "EXCELENTE",
            description: "Todos os contratos de financiamento estão em dia e operando normalmente."
        });
    }
    
    return items;
  }, [activeLoans, emprestimos, calculateLoanSchedule, calculatePaidInstallmentsUpToDate, onOpenPendingConfig]);

  const statusStyles = {
    danger: { color: "text-red-800", bg: "bg-red-50/80 dark:bg-red-900/10", border: "border-red-100 dark:border-red-900/20", badge: "bg-red-100 text-red-700" },
    warning: { color: "text-orange-800", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badge: "bg-orange-100 text-orange-700" },
    info: { color: "text-blue-800", bg: "bg-blue-50/80 dark:bg-blue-900/10", border: "border-blue-100 dark:border-blue-900/20", badge: "bg-blue-100 text-blue-700" },
    success: { color: "text-green-800", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badge: "bg-green-100 text-green-700" },
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-xl text-foreground">Motor de Análise</h3>
        </div>
        <Badge variant="outline" className="rounded-full px-4 py-1 font-bold text-[10px] uppercase tracking-widest border-primary/20 text-primary bg-primary/5">Insights Ativos</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {alerts.map((alert) => {
          const style = statusStyles[alert.type];

          return (
            <div
              key={alert.id}
              className={cn(
                "rounded-[2.5rem] p-7 border transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden",
                style.bg,
                style.border
              )}
            >
              {/* Ícone Decorativo de Fundo */}
              <alert.icon className={cn("absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6", style.color)} />

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-black/20 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <alert.icon className={cn("w-6 h-6", style.color)} />
                </div>
                <Badge className={cn("text-[9px] font-black px-3 py-1 rounded-full border border-black/5 dark:border-white/5", style.badge)}>
                  {alert.statusLabel}
                </Badge>
              </div>

              <div className="space-y-2 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{alert.title}</p>
                {alert.value ? (
                  <div className="space-y-1">
                    <p className={cn("text-4xl font-display font-black tracking-tighter", style.color)}>{alert.value}</p>
                    <p className="text-xs font-bold text-muted-foreground leading-relaxed max-w-[180px]">{alert.description}</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-foreground leading-tight">{alert.description}</p>
                )}
              </div>

              {alert.action && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={alert.action}
                  className={cn("mt-8 w-full justify-between rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] h-12 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 border border-black/5 relative z-10", style.color)}
                >
                  Configurar Agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}