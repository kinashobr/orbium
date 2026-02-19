import { useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillDisplayItem, formatCurrency } from "@/types/finance";
import { parseDateLocal } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, addDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
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
    revenueForecasts,
  } = useFinance();

  const data = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const totalDays = differenceInDays(monthEnd, monthStart) + 1;

    // Get current liquidity balance
    const liquidityAccountIds = contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType))
      .map(c => c.id);

    const currentBalance = liquidityAccountIds.reduce((acc, id) => {
      return acc + Math.max(0, calculateBalanceUpToDate(id, monthStart, transacoesV2, contasMovimento));
    }, 0);

    // Distribute revenue forecast evenly across the month
    const monthKey = format(currentDate, 'yyyy-MM');
    const forecastedRevenue = revenueForecasts[monthKey] || 0;
    const dailyRevenue = forecastedRevenue / totalDays;

    // Map unpaid bills to their due dates
    const billsByDay = new Map<number, number>();
    combinedBills
      .filter(b => !b.isPaid)
      .forEach(b => {
        try {
          const dueDate = parseDateLocal(b.dueDate);
          const day = dueDate.getDate();
          billsByDay.set(day, (billsByDay.get(day) || 0) + b.expectedAmount);
        } catch {}
      });

    // Build daily projection
    let runningBalance = currentBalance;
    const points: { day: string; saldo: number; despesa: number }[] = [];

    for (let i = 0; i < totalDays; i++) {
      const date = addDays(monthStart, i);
      const dayNum = date.getDate();
      const expense = billsByDay.get(dayNum) || 0;
      runningBalance += dailyRevenue - expense;
      
      points.push({
        day: format(date, 'dd'),
        saldo: Math.round(runningBalance * 100) / 100,
        despesa: expense,
      });
    }

    return points;
  }, [currentDate, combinedBills, contasMovimento, calculateBalanceUpToDate, transacoesV2, revenueForecasts]);

  const minBalance = useMemo(() => Math.min(...data.map(d => d.saldo)), [data]);
  const hasNegative = minBalance < 0;

  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 opacity-60">
        <TrendingUp className="w-3.5 h-3.5" />
        <p className="text-[9px] font-black uppercase tracking-widest">Projeção de Caixa</p>
      </div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cashFlowNegGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 8, fontWeight: 700 }} 
              tickLine={false} 
              axisLine={false}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ 
                borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Saldo']}
              labelFormatter={(label) => `Dia ${label}`}
            />
            {hasNegative && <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />}
            <Area
              type="monotone"
              dataKey="saldo"
              stroke={hasNegative ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              fill={hasNegative ? "url(#cashFlowNegGradient)" : "url(#cashFlowGradient)"}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hasNegative && (
        <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
          <p className="text-[8px] font-black uppercase tracking-widest text-destructive text-center">
            Projeção negativa: {formatCurrency(minBalance)} no mínimo
          </p>
        </div>
      )}
    </div>
  );
}