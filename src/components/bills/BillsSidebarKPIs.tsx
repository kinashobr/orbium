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
}

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

// M7: Smart alerts sub-component
function SmartCardAlerts({ combinedBills, currentDate }: { combinedBills: BillDisplayItem[]; currentDate: Date }) {
  const { creditCardConfigs, contasMovimento, calculateBalanceUpToDate, transacoesV2, billsTracker } = useFinance();
  
  const alerts = useMemo(() => {
    const items: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
    
    creditCardConfigs.forEach(config => {
      const account = contasMovimento.find(a => a.id === config.accountId);
      const cardName = account?.name || 'Cartão';
      
      // 1. Invoice without coverage
      const invoiceBill = combinedBills.find(b => 
        b.type === 'tracker' && (b as unknown as BillTracker).sourceType === 'card_invoice' && (b as unknown as BillTracker).cardId === config.id && !b.isPaid
      );
      if (invoiceBill && config.defaultPaymentAccountId) {
        const paymentBalance = calculateBalanceUpToDate(config.defaultPaymentAccountId, undefined, transacoesV2, contasMovimento);
        if (paymentBalance < invoiceBill.expectedAmount) {
          items.push({ type: 'error', message: `${cardName}: saldo insuficiente para fatura (faltam ${formatCurrency(invoiceBill.expectedAmount - paymentBalance)})` });
        }
      }
      
      // 2. Critical limit usage (>80%)
      const usedAmount = Math.abs(Math.min(0, calculateBalanceUpToDate(config.accountId, undefined, transacoesV2, contasMovimento)));
      const usagePercent = config.limit > 0 ? (usedAmount / config.limit) * 100 : 0;
      if (usagePercent > 80) {
        items.push({ type: 'warning', message: `${cardName}: ${Math.round(usagePercent)}% do limite usado` });
      }
      
      // 3. Recurring minimum payment (2+ months)
      const minPayments = billsTracker.filter(b => b.sourceType === 'card_invoice' && b.cardId === config.id && b.isPaid && b.paymentMode === 'minimo');
      if (minPayments.length >= 2) {
        items.push({ type: 'warning', message: `${cardName}: pagamento mínimo recorrente (${minPayments.length} meses)` });
      }
    });
    
    return items;
  }, [creditCardConfigs, combinedBills, contasMovimento, calculateBalanceUpToDate, transacoesV2, billsTracker]);

  if (alerts.length === 0) return null;

  return (
    <>
      <Separator className="opacity-20" />
      <div className="px-1 space-y-2">
        <div className="flex items-center gap-2 opacity-60">
          <AlertCircle className="w-3.5 h-3.5" />
          <p className="text-[9px] font-black uppercase tracking-widest">Alertas de Cartão</p>
        </div>
        {alerts.map((alert, i) => (
          <div key={i} className={cn(
            "p-2.5 rounded-xl flex gap-2 items-start border",
            alert.type === 'error' ? "bg-destructive/5 border-destructive/15" :
            alert.type === 'warning' ? "bg-warning/5 border-warning/15" :
            "bg-primary/5 border-primary/15"
          )}>
            <AlertCircle className={cn(
              "w-3 h-3 shrink-0 mt-0.5",
              alert.type === 'error' ? "text-destructive" :
              alert.type === 'warning' ? "text-warning" : "text-primary"
            )} />
            <p className={cn(
              "text-[8px] font-black uppercase tracking-tighter leading-tight",
              alert.type === 'error' ? "text-destructive" :
              alert.type === 'warning' ? "text-warning" : "text-primary"
            )}>
              {alert.message}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

export function BillsSidebarKPIs({ currentDate, combinedBills = [] }: BillsSidebarKPIsProps) {
  const { 
    revenueForecasts, 
    setMonthlyRevenueForecast, 
    getRevenueForPreviousMonth,
    calculateBalanceUpToDate,
    contasMovimento,
    transacoesV2,
    futureIncomes,
    incomeSettlements,
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

        {/* Income KPIs */}
        {(() => {
          const monthFI = futureIncomes.filter(fi => isSameMonth(parseDateLocal(fi.expectedReceiptDate), currentDate) && fi.status !== 'cancelado');
          const totalPrevisto = monthFI.reduce((acc, fi) => acc + fi.netExpectedAmount, 0);
          const totalRecebido = incomeSettlements
            .filter(s => isSameMonth(parseDateLocal(s.receivedDate), currentDate))
            .reduce((acc, s) => acc + s.receivedAmount, 0);
          
          if (totalPrevisto === 0 && totalRecebido === 0) return null;
          
          return (
            <>
              <Separator className="opacity-20" />
              <div className="px-1 space-y-3">
                <div className="flex items-center gap-2 opacity-60">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Receitas e Recebimentos</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Previsto</span>
                  <span className="text-xs font-black text-primary tabular-nums">{formatCurrency(totalPrevisto)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total Recebido</span>
                  <span className="text-xs font-black text-success tabular-nums">{formatCurrency(totalRecebido)}</span>
                </div>
                {totalPrevisto - totalRecebido > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pendente</span>
                    <span className="text-xs font-black text-warning tabular-nums">{formatCurrency(totalPrevisto - totalRecebido)}</span>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* M7: Smart Credit Card Alerts */}
        <SmartCardAlerts combinedBills={combinedBills} currentDate={currentDate} />

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
