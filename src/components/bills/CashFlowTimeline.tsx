import { useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillDisplayItem, formatCurrency } from "@/types/finance";
import { parseDateLocal } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { format, addDays, startOfMonth, endOfMonth, differenceInDays, isSameMonth, isBefore, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CashFlowTimelineProps {
  currentDate: Date;
  combinedBills: BillDisplayItem[];
}

export function CashFlowTimeline({ currentDate, combinedBills }: CashFlowTimelineProps) {
  const {
    contasMovimento,
    calculateBalanceUpToDate,
    transacoesV2,
    getFutureIncomesForMonth,
  } = useFinance();

  const data = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const today = startOfDay(new Date());
    const isCurrentMonth = isSameMonth(currentDate, today);
    const totalDays = differenceInDays(monthEnd, monthStart) + 1;

    // Liquidity accounts for cash flow
    const liquidityAccountIds = contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType))
      .map(c => c.id);

    // 1. Map UNPAID bills to their due dates
    const unpaidBillsByDay = new Map<number, number>();
    combinedBills
      .filter(b => !b.isPaid)
      .forEach(b => {
        const dueDate = parseDateLocal(b.dueDate);
        const day = dueDate.getDate();
        unpaidBillsByDay.set(day, (unpaidBillsByDay.get(day) || 0) + b.expectedAmount);
      });

    // 2. Map EXPECTED incomes to their receipt dates
    const expectedIncomesByDay = new Map<number, number>();
    getFutureIncomesForMonth(currentDate)
      .filter(inc => inc.status !== 'recebido')
      .forEach(inc => {
        const receiptDate = parseDateLocal(inc.expectedReceiptDate);
        const day = receiptDate.getDate();
        const amount = inc.netExpectedAmount;
        expectedIncomesByDay.set(day, (expectedIncomesByDay.get(day) || 0) + amount);
      });

    // 3. Build daily timeline
    const points: CashFlowPoint[] = [];
    let runningBalance = 0;

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const isFuture = isAfter(date, today);

      if (!isFuture) {
        const balance = liquidityAccountIds.reduce((acc, id) => {
          return acc + Math.max(0, calculateBalanceUpToDate(id, date, transacoesV2, contasMovimento));
        }, 0);
        runningBalance = balance;
        
        points.push({
          day: format(date, 'dd'),
          saldo: Math.round(runningBalance * 100) / 100,
          saldoReal: Math.round(runningBalance * 100) / 100,
          saldoProj: i === today.getDate() ? Math.round(runningBalance * 100) / 100 : null,
          isFuture: false,
          label: format(date, "dd/MM")
        });
      } else {
        const income = expectedIncomesByDay.get(i) || 0;
        const expense = unpaidBillsByDay.get(i) || 0;
        runningBalance += income - expense;
        
        points.push({
          day: format(date, 'dd'),
          saldo: Math.round(runningBalance * 100) / 100,
          saldoReal: null,
          saldoProj: Math.round(runningBalance * 100) / 100,
          isFuture: true,
          label: format(date, "dd/MM")
        });
      }
    }

    return points;
  }, [currentDate, combinedBills, contasMovimento, calculateBalanceUpToDate, transacoesV2, getFutureIncomesForMonth]);

  const minBalance = useMemo(() => Math.min(...data.map(d => d.saldo)), [data]);
  const hasNegative = minBalance < 0;
  
  const todayDayStr = format(new Date(), 'dd');
  const isViewingCurrentMonth = isSameMonth(currentDate, new Date());

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: CashFlowPoint }[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            {data.isFuture ? 'Projeção' : 'Saldo Real'} • {data.label}
          </p>
          <p className={cn(
            "text-sm font-black tabular-nums",
            data.saldo < 0 ? "text-destructive" : "text-foreground"
          )}>
            {formatCurrency(data.saldo)}
          </p>
          {data.isFuture && (
            <div className="mt-2 flex items-center gap-1.5 opacity-50">
              <Info className="w-3 h-3 text-primary" />
              <p className="text-[8px] font-bold uppercase">Baseado em previsões</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest">Fluxo de Caixa Diário</p>
        </div>
        {isViewingCurrentMonth && (
           <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
             <p className="text-[8px] font-black text-primary uppercase tracking-tighter">Hoje: {todayDayStr}/{format(new Date(), 'MM')}</p>
           </div>
        )}
      </div>

      <div className="h-[160px] w-full relative group">
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-border/20 to-transparent" />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="negGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 9, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }} 
              tickLine={false} 
              axisLine={false}
              interval={Math.floor(data.length / 8)}
              dy={10}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
            
            {isViewingCurrentMonth && (
              <ReferenceLine 
                x={todayDayStr} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="4 4" 
                label={{ 
                  position: 'insideTopLeft', 
                  value: 'HOJE', 
                  fontSize: 8, 
                  fontWeight: 900, 
                  fill: 'hsl(var(--primary))', 
                  offset: 5
                }} 
              />
            )}

            {hasNegative && <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />}
            
            {/* Area for Real Data */}
            <Area
              type="monotone"
              dataKey="saldoReal"
              stroke="hsl(var(--primary))"
              fill="url(#realGradient)"
              strokeWidth={3}
              animationDuration={1500}
              connectNulls={false}
            />

            {/* Area for Projected Data */}
            <Area
              type="monotone"
              dataKey="saldoProj"
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              fill="url(#projGradient)"
              strokeWidth={2}
              animationDuration={1500}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-[1.25rem] bg-muted/30 border border-border/40 backdrop-blur-sm transition-all hover:bg-muted/40">
          <div className="flex items-center gap-1.5 mb-1 opacity-60">
            <TrendingUp className="w-3 h-3 text-destructive rotate-180" />
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider leading-none">Mínimo Projetado</p>
          </div>
          <p className={cn("text-xs font-black tabular-nums tracking-tight", minBalance < 0 ? "text-destructive" : "text-foreground")}>
            {formatCurrency(minBalance)}
          </p>
        </div>
        <div className="p-3 rounded-[1.25rem] bg-muted/30 border border-border/40 backdrop-blur-sm transition-all hover:bg-muted/40">
          <div className="flex items-center gap-1.5 mb-1 opacity-60">
            <TrendingUp className="w-3 h-3 text-primary" />
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider leading-none">Saldo Final Estimado</p>
          </div>
          <p className="text-xs font-black tabular-nums tracking-tight">
            {formatCurrency(data[data.length - 1]?.saldo || 0)}
          </p>
        </div>
      </div>

      {hasNegative && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 shadow-sm animate-pulse">
          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
             <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-tight text-destructive">Alerta de Liquidez</p>
            <p className="text-[8px] font-bold text-destructive/80 leading-relaxed">
              Sua projeção indica que o saldo ficará negativo em algum momento deste mês. Revise suas contas a pagar ou antecipe receitas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}