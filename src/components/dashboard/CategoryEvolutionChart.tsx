"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  format,
  eachMonthOfInterval
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { cn, parseDateLocal } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "motion/react";

const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", 
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#64748b"
];

export const CategoryEvolutionChart = () => {
  const { transacoesV2, categoriasV2 } = useFinance();
  const [period, setPeriod] = useState("6");
  const [disabledKeys, setDisabledKeys] = useState<Record<string, boolean>>({});

  const { chartData, activeCategories } = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, parseInt(period) - 1);
    const months = eachMonthOfInterval({ start, end });

    // Find active categories (expense nature)
    const activeCats = categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel');

    const data = months.map(month => {
      const monthEnd = endOfMonth(month);
      const monthStart = startOfMonth(month);
      const monthKey = format(month, "MMM/yy", { locale: ptBR });

      const point: Record<string, string | number> = { name: monthKey };
      
      activeCats.forEach(cat => {
        const total = transacoesV2
          .filter(tx => tx.categoryId === cat.id && parseDateLocal(tx.date) >= monthStart && parseDateLocal(tx.date) <= monthEnd)
          .reduce((acc, tx) => acc + tx.amount, 0);
        
        point[cat.label] = total;
      });

      return point;
    });

    // Only keep categories that had at least one transaction in these months
    const filteredCats = activeCats.filter(cat => 
      data.some(point => point[cat.label] > 0)
    ).slice(0, 8); // Top 8 to keep it readable

    return { chartData: data, activeCategories: filteredCats };
  }, [transacoesV2, categoriasV2, period]);

  const hasFilters = useMemo(() => Object.values(disabledKeys).some(Boolean), [disabledKeys]);

  const handleLegendClick = (o: any) => {
    const { dataKey, value } = o;
    const key = dataKey || value;
    setDisabledKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Record<string, unknown>[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-xl p-4 rounded-2xl shadow-soft border border-border/40 space-y-2 min-w-[200px]">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border/20 pb-2 mb-2">{label}</p>
          {payload.sort((a, b) => (b.value as number) - (a.value as number)).map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name}</span>
              </div>
              <span className="text-xs font-extrabold text-foreground tabular-nums">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Evolução das Despesas</h3>
          {hasFilters && (
            <button 
              onClick={() => setDisabledKeys({})}
              className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer animate-fade-in"
            >
              Exibir Todas
            </button>
          )}
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] h-8 text-[10px] font-black uppercase tracking-widest bg-surface-light dark:bg-surface-dark border-border/40">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3" className="text-[10px] font-bold uppercase tracking-widest">Últimos 3 meses</SelectItem>
            <SelectItem value="6" className="text-[10px] font-bold uppercase tracking-widest">Últimos 6 meses</SelectItem>
            <SelectItem value="12" className="text-[10px] font-bold uppercase tracking-widest">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative overflow-hidden bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/60 dark:border-white/5">
        <div className="relative z-10 h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                onClick={handleLegendClick}
                wrapperStyle={{ paddingTop: '0', paddingBottom: '30px', cursor: 'pointer' }}
                formatter={(value, entry: any) => {
                  const key = entry.dataKey || value;
                  const isDisabled = disabledKeys[key];
                  return (
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest select-none transition-all duration-200 hover:text-foreground",
                      isDisabled ? "opacity-30 line-through text-muted-foreground" : "text-muted-foreground font-black"
                    )}>
                      {value}
                    </span>
                  );
                }}
              />
              {activeCategories.map((cat, index) => (
                <Line 
                  key={cat.id}
                  type="monotone" 
                  dataKey={cat.label} 
                  stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  hide={disabledKeys[cat.label]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
