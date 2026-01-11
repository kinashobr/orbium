import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

interface InvestmentEvolutionChartProps {
  height?: number;
}

export function InvestmentEvolutionChart({ height = 300 }: InvestmentEvolutionChartProps) {
  const { calculateTotalInvestmentBalanceAtDate } = useFinance();
  
  const evolutionData = useMemo(() => {
    const now = new Date();
    const result: { mes: string; valor: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const fim = endOfMonth(data);
      const mesLabel = format(data, 'MMM', { locale: ptBR });

      const totalInvestmentBalance = calculateTotalInvestmentBalanceAtDate(fim);
      
      result.push({ 
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), 
        valor: totalInvestmentBalance,
      });
    }
    return result;
  }, [calculateTotalInvestmentBalanceAtDate]);

  return (
    <div className="h-[min(300px,40vh)]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={evolutionData}>
          <defs>
            <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
            tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))", 
              border: "1px solid hsl(var(--border))", 
              borderRadius: "8px" 
            }}
            formatter={(value: number) => [formatCurrency(value), "Total Investido"]}
          />
          <Area 
            type="monotone" 
            dataKey="valor" 
            name="Total Investido"
            stroke="hsl(var(--success))" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorInvestment)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}