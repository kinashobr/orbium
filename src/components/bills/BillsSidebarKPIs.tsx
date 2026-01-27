import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Wallet, 
  RefreshCw, 
  Calculator, 
  TrendingDown, 
  AlertCircle, 
  ArrowUpRight, 
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { startOfMonth, subDays, format } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    const projecaoOperacional = currentForecast - totalExpensesForMonth;
    const projectedBalance = initialBalance + projecaoOperacional;
    
    return { initialBalance, projectedBalance, projecaoOperacional, totalExpensesForMonth };
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
    <ScrollArea className="h-full pr-4 -mr-4 scrollbar-material">
      <div className="flex flex-col space-y-4 pb-4">
        
        {/* 1. Saldo Inicial do Mês */}
        <div className="px-1">
          <div className="flex items-center gap-2 mb-1 opacity-60">
            <Wallet className="w-3 h-3" />
            <Label className="text-[9px] font-black uppercase tracking-widest">Saldo Inicial</Label>
          </div>
          <p className="text-lg font-black text-foreground tabular-nums leading-none tracking-tight">
            {formatCurrency(calculos.initialBalance)}
          </p>
        </div>

        <Separator className="opacity-20" />

        {/* 2. Previsão de Receitas */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-success" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Previsão Receita</Label>
            </div>
            <button onClick={handleSuggest} className="text-[7px] font-black text-primary hover:opacity-70 flex items-center gap-1 group">
              <RefreshCw className="w-2.5 h-2.5 group-active:rotate-180 transition-transform" /> SUGERIR
            </button>
          </div>
          <div className="relative group">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/40">R$</span>
            <Input 
              type="text"
              value={forecastInput}
              onChange={(e) => setForecastInput(e.target.value)}
              onBlur={handleBlur}
              className="h-9 pl-7 pr-2 text-xs font-black border-2 rounded-xl bg-muted/10 dark:bg-white/[0.03] border-transparent focus:border-primary/40 focus:bg-card transition-all tabular-nums"
            />
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* 3 & 4. Fluxo de Saídas (Agrupado) */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-destructive" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pendentes</Label>
            </div>
            <span className="text-xs font-black text-destructive tabular-nums">{formatCurrency(totalPendingBills)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-success" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Já Pago</Label>
            </div>
            <span className="text-xs font-black text-success tabular-nums">{formatCurrency(totalPaidBills)}</span>
          </div>
        </div>

        {/* 5. Projeção Final (Design Unificado) */}
        <div className="px-1">
          <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl border transition-all",
            calculos.projectedBalance >= 0 
              ? "bg-success/[0.05] border-success/20" 
              : "bg-destructive/[0.05] border-destructive/20"
          )}>
            <div className="space-y-0.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Projeção Final</Label>
              <p className={cn(
                "text-base font-black tabular-nums leading-none",
                calculos.projectedBalance >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(calculos.projectedBalance)}
              </p>
            </div>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
              calculos.projectedBalance >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              <Calculator className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 6. Saldo Operacional (Saldo do Mês) */}
        <div className="px-1">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 dark:bg-white/[0.05] border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Saldo do Mês</Label>
              <p className={cn(
                "text-base font-black tabular-nums leading-none",
                calculos.projecaoOperacional >= 0 ? "text-foreground dark:text-white" : "text-warning-foreground dark:text-warning"
              )}>
                {formatCurrency(calculos.projecaoOperacional)}
              </p>
            </div>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
              calculos.projecaoOperacional >= 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            )}>
              {calculos.projecaoOperacional >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Alerta de Atenção */}
        {calculos.projectedBalance < 0 && (
          <div className="px-1">
            <div className="p-3 rounded-xl bg-warning/5 dark:bg-warning/10 border border-warning/20 flex gap-2 items-center">
              <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="text-[8px] leading-tight text-warning-foreground dark:text-warning font-black uppercase tracking-tighter">
                Cuidado: Saldo final negativo projetado.
              </p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}