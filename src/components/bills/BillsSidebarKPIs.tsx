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
  CreditCard,
  Target
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency, BillTracker, BillDisplayItem } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { startOfMonth, subDays, format, isSameMonth } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CashFlowTimeline } from "@/components/bills/CashFlowTimeline";


interface BillsSidebarKPIsProps {
  currentDate: Date;
  totalPendingBills: number; // Somado via combinedBills no modal
  totalPaidBills?: number;
  combinedBills?: BillDisplayItem[]; // Adicionado para cálculos internos
  layout?: "vertical" | "horizontal";
}

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};



export function BillsSidebarKPIs({ currentDate, combinedBills = [], layout = "vertical" }: BillsSidebarKPIsProps) {
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

  // Contas de Liquidez
  const liquidityAccountIds = useMemo(() => 
    contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType))
      .map(c => c.id)
  , [contasMovimento]);

  // Contas de Cartão
  const creditCardAccountIds = useMemo(() => 
    new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id))
  , [contasMovimento]);

  const stats = useMemo(() => {
    const startOfCurrentMonth = startOfMonth(currentDate);
    const dayBeforeStart = subDays(startOfCurrentMonth, 1);
    
    // 1. Saldo Inicial Contas Correntes
    const initialBalance = liquidityAccountIds.reduce((acc, accountId) => {
      const balance = calculateBalanceUpToDate(accountId, dayBeforeStart, transacoesV2, contasMovimento);
      return acc + Math.max(0, balance);
    }, 0);

    // 2. Receita Atual (Lançamentos reais de receita no mês)
    const realizedRevenue = transacoesV2
        .filter(t => isSameMonth(parseDateLocal(t.date), currentDate) && (t.operationType === 'receita' || t.operationType === 'rendimento'))
        .reduce((acc, t) => acc + t.amount, 0);

    // 3. Divisão de Saídas
    // Pendentes (incluir todos, inclusive cartões de crédito)
    const pendingAmount = combinedBills
        .filter(b => !b.isPaid)
        .reduce((acc, b) => acc + b.expectedAmount, 0);

    // Pagos com Cartão de Crédito: somar transações reais flow='out' da conta CC no mês (indicador DRE)
    const paidViaCreditCard = transacoesV2
        .filter(t => 
          creditCardAccountIds.has(t.accountId) && 
          t.flow === 'out' && 
          isSameMonth(parseDateLocal(t.date), currentDate)
        )
        .reduce((acc, t) => acc + t.amount, 0);
    
    // Já Pagos (Caixa/Débito)
    const paidDirectly = combinedBills
        .filter(b => b.isPaid && (!b.suggestedAccountId || !creditCardAccountIds.has(b.suggestedAccountId)))
        .reduce((acc, b) => acc + b.expectedAmount, 0);

    // Total Despesas: incluir card_invoice (fatura = desembolso real no fluxo de caixa)
    const totalExpenses = combinedBills
        .reduce((acc, b) => acc + b.expectedAmount, 0);

    // 4. Saldo (Receita Prevista - Despesas)
    const monthBalance = currentForecast - totalExpenses;

    // 5. Projeção (Saldo Inicial + Receita Prevista - Despesas)
    const projectedFinal = initialBalance + monthBalance;
    
    return { initialBalance, realizedRevenue, pendingAmount, paidViaCreditCard, paidDirectly, totalExpenses, monthBalance, projectedFinal };
  }, [currentDate, liquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, currentForecast, combinedBills, creditCardAccountIds]);
  
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

  if (layout === "horizontal") {
    return (
      <div className="grid grid-cols-3 gap-6 w-full py-0.5">
        {/* Column 1: Saldo Inicial + Rec. Prevista (Vertical Flow) */}
        <div className="flex flex-col justify-between h-[116px] py-1">
          {/* Saldo Inicial (Top) */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 opacity-90 mb-0.5">
              <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-none">Saldo Inicial</span>
            </div>
            <p className="text-[22px] font-black text-foreground tabular-nums tracking-tight leading-none my-1">
              {formatCurrency(stats.initialBalance)}
            </p>
          </div>

          <div className="border-t border-border/10 my-1" />

          {/* Receita Prevista (Bottom) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between opacity-90 mb-1">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-none">Rec. Prevista</span>
              </div>
              <button 
                onClick={handleSuggest} 
                className="text-[8px] font-black text-primary hover:opacity-80 flex items-center gap-0.5 bg-primary/10 px-1.5 py-0.5 rounded-full transition-colors leading-none"
              >
                <RefreshCw className="w-2.5 h-2.5 group-active:rotate-180 transition-transform" /> SUGERIR
              </button>
            </div>
            <div className="relative group flex items-center h-6">
              <span className="absolute left-0 text-[11px] font-black text-muted-foreground/40">R$</span>
              <Input 
                type="text"
                value={forecastInput}
                onChange={(e) => setForecastInput(e.target.value)}
                onBlur={handleBlur}
                className="h-6 pl-6 pr-1 text-[15px] font-black border-0 border-b border-border/40 hover:border-primary/40 focus:border-primary/80 rounded-none bg-transparent focus:ring-0 transition-all tabular-nums py-0 text-foreground w-full"
              />
            </div>
          </div>
        </div>

        {/* Column 2: Fluxo de Saídas */}
        <div className="flex flex-col justify-between h-[116px] py-1 border-l border-border/20 pl-6">
          <div className="flex items-center gap-1.5 opacity-90 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-none">Fluxo de Saídas</span>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 leading-none">Pendentes:</span>
              <span className="text-[14px] font-black text-destructive tabular-nums leading-none">{formatCurrency(stats.pendingAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 leading-none">Cartão:</span>
              <span className="text-[14px] font-black text-warning tabular-nums leading-none">{formatCurrency(stats.paidViaCreditCard)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 leading-none">Débito Pago:</span>
              <span className="text-[14px] font-black text-success tabular-nums leading-none">{formatCurrency(stats.paidDirectly)}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Resultado do Mês + Saldo Final Previsto */}
        <div className="flex flex-col justify-between h-[116px] py-1 border-l border-border/20 pl-6">
          {/* Resultado do Mês (Top) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between opacity-90 mb-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-none">Resultado do Mês</span>
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                stats.monthBalance >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {stats.monthBalance >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </div>
            </div>
            <p className={cn(
              "text-[22px] font-black tabular-nums tracking-tight leading-none my-1",
              stats.monthBalance >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(stats.monthBalance)}
            </p>
          </div>

          <div className="border-t border-border/10 my-1" />

          {/* Saldo Final Previsto (Bottom) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between opacity-90 mb-0.5">
              <span className={cn(
                "text-[11px] font-black uppercase tracking-wider leading-none",
                stats.projectedFinal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              )}>Saldo Final Previsto</span>
              <div className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                stats.projectedFinal >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
              )}>
                <Calculator className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className={cn(
              "text-[22px] font-black tabular-nums tracking-tight leading-none my-1",
              stats.projectedFinal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}>
              {formatCurrency(stats.projectedFinal)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4 -mr-4 scrollbar-material">
      <div className="flex flex-col space-y-6 pb-4">
        
        {/* 1. Saldo Inicial Contas Correntes */}
        <div className="px-1">
          <div className="flex items-center gap-2 mb-1.5 opacity-60">
            <Wallet className="w-3.5 h-3.5" />
            <Label className="text-[9px] font-black uppercase tracking-widest">Saldo Inicial Contas Correntes</Label>
          </div>
          <p className="text-xl font-black text-foreground tabular-nums leading-none tracking-tight">
            {formatCurrency(stats.initialBalance)}
          </p>
        </div>

        <Separator className="opacity-20" />

        {/* 2. Receita Prevista */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Receita Prevista</Label>
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
              className="h-10 pl-7 pr-2 text-sm font-black border-2 rounded-xl bg-muted/10 dark:bg-white/[0.03] border-transparent focus:border-primary/40 focus:bg-card transition-all tabular-nums"
            />
          </div>
          
          {/* Receita Atual (Realizada) */}
          {stats.realizedRevenue > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-success/5 border border-success/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-[9px] font-black uppercase tracking-widest text-success/70">Receita Atual</span>
              </div>
              <span className="text-xs font-black text-success tabular-nums">{formatCurrency(stats.realizedRevenue)}</span>
            </div>
          )}
        </div>

        <Separator className="opacity-20" />

        {/* 3. Fluxo de Saídas Detalhado */}
        <div className="space-y-3 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-destructive" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pendentes</Label>
            </div>
            <span className="text-xs font-black text-destructive tabular-nums">{formatCurrency(stats.pendingAmount)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-warning" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pagos com Cartão</Label>
            </div>
            <span className="text-xs font-black text-warning tabular-nums">{formatCurrency(stats.paidViaCreditCard)}</span>
          </div>

          <div className="flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Já Pago (Débito)</Label>
            </div>
            <span className="text-xs font-black text-success tabular-nums">{formatCurrency(stats.paidDirectly)}</span>
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* 4. Saldo em Contas Previsto (Design Unificado) */}
        <div className="px-1">
          <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm",
            stats.projectedFinal >= 0 
              ? "bg-success/[0.05] border-success/20" 
              : "bg-destructive/[0.05] border-destructive/20"
          )}>
            <div className="space-y-0.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Saldo em Contas Previsto</Label>
              <p className={cn(
                "text-lg font-black tabular-nums leading-none",
                stats.projectedFinal >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(stats.projectedFinal)}
              </p>
            </div>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
              stats.projectedFinal >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              <Calculator className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 5. Resultado Previsto do Mês */}
        <div className="px-1">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 dark:bg-white/[0.05] border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Resultado Previsto do Mês</Label>
              <p className={cn(
                "text-lg font-black tabular-nums leading-none",
                stats.monthBalance >= 0 ? "text-foreground" : "text-destructive"
              )}>
                {formatCurrency(stats.monthBalance)}
              </p>
              <p className="text-[7px] font-bold text-muted-foreground uppercase opacity-50">(Receita Prev. - Despesas)</p>
            </div>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
              stats.monthBalance >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            )}>
              {stats.monthBalance >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Alerta de Atenção */}
        {stats.projectedFinal < 0 && (
          <div className="px-1">
            <div className="p-3 rounded-xl bg-warning/5 dark:bg-warning/10 border border-warning/20 flex gap-2 items-center">
              <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="text-[8px] leading-tight text-warning-foreground dark:text-warning font-black uppercase tracking-tighter">
                Cuidado: Projeção de caixa negativa ao final do mês.
              </p>
            </div>
          </div>
        )}




        {/* CashFlow Timeline */}
        {combinedBills.length > 0 && (
          <>
            <Separator className="opacity-20" />
            <div className="px-1">
              <CashFlowTimeline currentDate={currentDate} combinedBills={combinedBills} />
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
