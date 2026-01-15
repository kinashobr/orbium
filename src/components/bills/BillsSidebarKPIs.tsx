import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Wallet, RefreshCw, Calculator, TrendingDown, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { startOfMonth, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface BillsSidebarKPIsProps {
  currentDate: Date;
  totalPendingBills: number;
  totalPaidBills?: number;
}

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

export function BillsSidebarKPIs({ currentDate, totalPendingBills, totalPaidBills = 0 }: BillsSidebarKPIsProps) {
  const { 
    revenueForecasts, 
    setMonthlyRevenueForecast, 
    getRevenueForPreviousMonth,
    calculateBalanceUpToDate,
    contasMovimento,
    transacoesV2,
  } = useFinance();
  
  const monthKey = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate]);
  const currentForecast = revenueForecasts[monthKey] || 0;
  
  const [forecastInput, setForecastInput] = useState(() => formatToBR(currentForecast));
  
  useEffect(() => {
      setForecastInput(formatToBR(currentForecast));
  }, [currentForecast, monthKey]);

  const highLiquidityAccountIds = useMemo(() => 
    contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType))
      .map(c => c.id)
  , [contasMovimento]);

  const calculos = useMemo(() => {
    const startOfCurrentMonth = startOfMonth(currentDate);
    const dayBeforeStart = subDays(startOfCurrentMonth, 1);
    
    const initialBalance = highLiquidityAccountIds.reduce((acc, accountId) => {
      const balance = calculateBalanceUpToDate(accountId, dayBeforeStart, transacoesV2, contasMovimento);
      return acc + balance;
    }, 0);

    const totalExpensesForMonth = totalPendingBills + totalPaidBills;
    const netFlowProjected = currentForecast - totalExpensesForMonth;
    const projectedBalance = initialBalance + netFlowProjected;
    
    return { initialBalance, projectedBalance, netFlowProjected, totalExpensesForMonth };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, currentForecast, totalPendingBills, totalPaidBills]);
  
  const handleBlur = () => {
    const parsed = parseFromBR(forecastInput);
    if (parsed !== currentForecast) {
        setMonthlyRevenueForecast(monthKey, parsed);
    }
  };

  const handleSuggest = () => {
    const sugg = getRevenueForPreviousMonth(currentDate);
    setForecastInput(formatToBR(sugg));
    setMonthlyRevenueForecast(monthKey, sugg);
    toast.info(`Previsão sugerida com base no mês anterior.`);
  };

  return (
    <div className="flex flex-col h-full space-y-8 bg-transparent">
      {/* Saldo Projetado - O Grande KPI */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Saldo Previsto no Final do Mês</p>
        <div className={cn(
          "p-6 rounded-[2.5rem] border-2 transition-all",
          calculos.projectedBalance >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
        )}>
          <p className={cn(
            "text-3xl font-black tracking-tighter",
            calculos.projectedBalance >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(calculos.projectedBalance)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Calculator className="w-3.5 h-3.5 opacity-40" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projeção de Caixa</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Caixa Inicial */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border/40 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Inicial do Mês</p>
              <p className="text-sm font-black text-foreground">{formatCurrency(calculos.initialBalance)}</p>
            </div>
          </div>
        </div>

        {/* Previsão de Entradas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Previsão de Receitas</Label>
            </div>
            <button onClick={handleSuggest} className="text-[9px] font-black text-primary hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> SUGERIR
            </button>
          </div>
          <div className="relative group">
            <Input 
              type="text"
              value={forecastInput}
              onChange={(e) => setForecastInput(e.target.value)}
              onBlur={handleBlur}
              className="h-12 pl-4 pr-10 text-lg font-black border-2 rounded-xl bg-card dark:bg-white/5 dark:border-white/10 focus:border-success/50 transition-all"
            />
            <ArrowUpRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success/40 group-focus-within:text-success transition-colors" />
          </div>
        </div>

        <Separator className="opacity-40" />

        {/* Compromissos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Contas a Pagar</Label>
          </div>
          
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border/40 dark:border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Pendentes + Faturas</span>
              <span className="text-sm font-black text-destructive">{formatCurrency(totalPendingBills)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Já Pago no Período</span>
              <span className="text-sm font-black text-success">{formatCurrency(totalPaidBills)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Atenção */}
      {calculos.projectedBalance < 0 && (
        <div className="mt-auto p-4 rounded-2xl bg-warning/10 border border-warning/20 flex gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0" />
          <p className="text-[11px] leading-tight text-warning-foreground font-bold uppercase tracking-tight">
            Atenção: Saldo projetado negativo. Revise seus custos fixos.
          </p>
        </div>
      )}
    </div>
  );
}