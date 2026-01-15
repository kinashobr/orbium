import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateLocal } from "@/lib/utils";

interface EvolucaoData {
  mes: string;
  patrimonioTotal: number;
  receitas: number;
  despesas: number;
  investimentos: number;
  dividas: number;
}

interface EvolucaoPatrimonialChartProps {
  // Removed unused 'data' prop
}

const lineOptions = [
  { id: "patrimonioTotal", label: "Capital Próprio", color: "hsl(199, 89%, 48%)" },
  { id: "receitas", label: "Entradas", color: "hsl(142, 76%, 36%)" },
  { id: "despesas", label: "Saídas", color: "hsl(0, 72%, 51%)" },
];

export function EvolucaoPatrimonialChart({}: EvolucaoPatrimonialChartProps) {
  const { 
    transacoesV2, 
    getPatrimonioLiquido,
  } = useFinance();
  
  const [periodo, setPeriodo] = useState("12m");
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(["patrimonioTotal", "receitas", "despesas"])
  );

  const toggleLine = (lineId: string) => {
    setActiveLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) newSet.delete(lineId);
      else newSet.add(lineId);
      return newSet;
    });
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    const result: EvolucaoData[] = [];

    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);
      const mesLabel = format(data, 'MMM', { locale: ptBR });

      // 1. Calcular PL no final do mês (fim)
      // Usando getPatrimonioLiquido diretamente, que é period-aware
      const patrimonioLiquido = getPatrimonioLiquido(fim);

      // 2. Calcular Receitas e Despesas DENTRO do mês
      const transacoesMes = transacoesV2.filter(t => {
        try {
          const dataT = parseDateLocal(t.date);
          return isWithinInterval(dataT, { start: inicio, end: fim });
        } catch {
          return false;
        }
      });

      const receitas = transacoesMes
        .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
        .reduce((acc, t) => acc + t.amount, 0);
      
      const despesas = transacoesMes
        .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
        .reduce((acc, t) => acc + t.amount, 0);
      
      result.push({ 
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), 
        patrimonioTotal: patrimonioLiquido, 
        receitas, 
        despesas, 
        investimentos: 0, 
        dividas: 0, 
      });
    }
    return result;
  }, [transacoesV2, getPatrimonioLiquido]);

  const dataToShow = useMemo(() => {
    switch (periodo) {
      case "3m": return filteredData.slice(-3);
      case "6m": return filteredData.slice(-6);
      case "12m": return filteredData;
      default: return filteredData;
    }
  }, [filteredData, periodo]);

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Evolução do Patrimônio</h3>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-28 bg-muted border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-1">
            {lineOptions.map(line => (
              <Button
                key={line.id}
                variant="outline"
                size="icon"
                onClick={() => toggleLine(line.id)}
                className={cn(
                  "h-8 w-8 text-xs",
                  activeLines.has(line.id) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[min(320px,45vh)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataToShow}>
            <defs>
              {lineOptions.map(line => (
                <linearGradient key={line.id} id={`gradient-${line.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }}
              formatter={(value: number, name: string) => [`R$ ${value.toLocaleString("pt-BR")}`, lineOptions.find(l => l.id === name)?.label || name]}
            />
            <Legend />
            {lineOptions.map(line => (
              activeLines.has(line.id) && (
                <Area key={line.id} type="monotone" dataKey={line.id} stroke={line.color} strokeWidth={2} fillOpacity={1} fill={`url(#gradient-${line.id})`} />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}