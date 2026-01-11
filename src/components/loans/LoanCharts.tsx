import { useMemo } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Emprestimo } from "@/types/finance";
import { PieChart, BarChart3, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartColors } from "@/hooks/useChartColors";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "@/components/ui/badge";

interface LoanChartsProps {
  emprestimos: Emprestimo[];
  className?: string;
}

const formatCurrency = (value: number) => 
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

export function LoanCharts({ emprestimos, className }: LoanChartsProps) {
  const colors = useChartColors();
  const { calculateLoanSchedule, calculatePaidInstallmentsUpToDate } = useFinance();
  
  // Cores consistentes para os contratos
  const palette = [
    colors.primary, 
    colors.accent, 
    colors.success, 
    "hsl(var(--neon-blue))", 
    "hsl(var(--neon-purple))",
    colors.warning
  ];

  // Dados para Distribuição de Peso (Donut)
  const distributionData = useMemo(() => {
    return emprestimos.map((e, index) => {
      const schedule = calculateLoanSchedule(e.id);
      const paidCount = calculatePaidInstallmentsUpToDate(e.id, new Date());
      const lastPaid = schedule.find(item => item.parcela === paidCount);
      const saldo = lastPaid ? lastPaid.saldoDevedor : e.valorTotal;
      
      return {
        name: e.contrato.split(" - ")[0],
        value: saldo,
        color: palette[index % palette.length],
      };
    }).sort((a, b) => b.value - a.value);
  }, [emprestimos, calculateLoanSchedule, calculatePaidInstallmentsUpToDate, palette]);

  const totalSaldo = useMemo(() => distributionData.reduce((acc, d) => acc + d.value, 0), [distributionData]);

  // Dados para Capital vs Juros
  const efficiencyData = useMemo(() => {
    return emprestimos.map(e => {
      const totalAPagar = e.parcela * e.meses;
      const jurosTotais = totalAPagar - e.valorTotal;
      return {
        name: e.contrato.split(' ')[0],
        capital: e.valorTotal,
        juros: jurosTotais,
        total: totalAPagar
      };
    }).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [emprestimos]);

  if (emprestimos.length === 0) return null;

  return (
    <div className={cn("space-y-16", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* 1. DISTRIBUIÇÃO DE PESO (DONUT PREMIUM) */}
        <div className="space-y-6 flex flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-accent/10 rounded-xl text-accent">
              <PieChart className="w-5 h-5" />
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Distribuição de Peso</h4>
          </div>

          <div className="flex-1 bg-muted/20 rounded-[3rem] border border-border/40 p-8 flex flex-col items-center justify-center relative min-h-[400px]">
            <div className="w-full h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius="72%"
                    outerRadius="95%"
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={12}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none', 
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Saldo"]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>

              {/* Valor Centralizado */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Dívida Total</span>
                <p className="text-3xl font-black text-foreground tracking-tighter">
                  {formatCurrency(totalSaldo)}
                </p>
              </div>
            </div>

            {/* Legenda customizada em Badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {distributionData.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/40 shadow-sm"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-foreground truncate max-w-[100px]">{item.name}</span>
                  <span className="text-[9px] font-black text-muted-foreground">
                    {((item.value / totalSaldo) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. CAPITAL VS JUROS (BARRAS PÍLULA) */}
        <div className="space-y-6 flex flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-success/10 rounded-xl text-success">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Eficiência de Crédito</h4>
          </div>

          <div className="flex-1 bg-muted/20 rounded-[3rem] border border-border/40 p-10 flex flex-col min-h-[400px]">
            <div className="mb-6">
              <p className="text-sm font-bold text-foreground">Custo de Capital</p>
              <p className="text-[11px] text-muted-foreground">Principal (Verde) vs Juros contratados (Vermelho)</p>
            </div>

            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={efficiencyData} 
                  layout="vertical"
                  margin={{ left: 10, right: 30 }}
                  barSize={20}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.border} opacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: colors.mutedForeground, fontSize: 10, fontWeight: 'bold' }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="capital" 
                    name="Principal" 
                    stackId="a" 
                    fill={colors.success} 
                    radius={[10, 0, 0, 10]} 
                  />
                  <Bar 
                    dataKey="juros" 
                    name="Juros" 
                    stackId="a" 
                    fill={colors.destructive} 
                    radius={[0, 10, 10, 0]} 
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Resumo de Eficiência */}
            <div className="mt-6 pt-6 border-t border-border/20 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[9px] font-black text-muted-foreground uppercase">Média Principal</span>
                </div>
                <p className="text-sm font-black">
                  {((efficiencyData.reduce((a, b) => a + b.capital, 0) / efficiencyData.reduce((a, b) => a + b.total, 0)) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span className="text-[9px] font-black text-muted-foreground uppercase">Taxa de Juros Real</span>
                </div>
                <p className="text-sm font-black text-destructive">
                  {((efficiencyData.reduce((a, b) => a + b.juros, 0) / efficiencyData.reduce((a, b) => a + b.capital, 0)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}