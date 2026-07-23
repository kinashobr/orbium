"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from "recharts";
import { useMemo } from "react";
import { useChartColors } from "@/hooks/useChartColors";

export const FinancialDistributionChart = () => {
  const { 
    contasMovimento, 
    transacoesV2, 
    calculateBalanceUpToDate,
    veiculos,
    imoveis,
    terrenos
  } = useFinance();
  const colors = useChartColors();
  
  const { chartData, totalPatrimonio } = useMemo(() => {
    const now = new Date();
    const dataPoints: { name: string, value: number, color: string }[] = [];

    // Contas
    contasMovimento.forEach(acc => {
        if (acc.hidden) return; // Skip system accounts
        const balance = Math.max(0, calculateBalanceUpToDate(acc.id, now, transacoesV2, contasMovimento));
        if (balance <= 0) return;

        let name = acc.name;
        // Grouping: Corrente, Aplicação, Poupança, Reserva, Cripto
        if (acc.accountType === 'renda_fixa') name = `Aplic.: ${acc.name}`;
        else if (acc.accountType === 'poupanca') name = `Poup.: ${acc.name}`;
        else if (acc.accountType === 'reserva') name = `Reserva: ${acc.name}`;
        else if (acc.accountType === 'cripto') name = `Cripto: ${acc.name}`;
        // Para conta corrente mantemos o nome original, pois o usuário quer detalhar contas correntes

        dataPoints.push({ name, value: balance, color: acc.color || colors.primary });
    });

    // Veículos
    veiculos.forEach(v => {
        dataPoints.push({ name: `Veículo: ${v.modelo}`, value: v.valorFipe, color: colors.accent });
    });

    // Imóveis e Terrenos
    imoveis.forEach(i => {
        dataPoints.push({ name: `Imóvel: ${i.descricao}`, value: i.valorAvaliacao, color: colors.destructive });
    });
    terrenos.forEach(t => {
         dataPoints.push({ name: `Terreno: ${t.descricao}`, value: t.valorAvaliacao, color: colors.destructive });
    });

    const total = dataPoints.reduce((acc, item) => acc + item.value, 0);

    return { chartData: dataPoints, totalPatrimonio: total };
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate, veiculos, imoveis, terrenos, colors]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Record<string, unknown>[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-[24px] shadow-soft-xl border border-border/40 backdrop-blur-md z-[999] relative">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-lg font-display font-black text-foreground tabular-nums">{formatCurrency(payload[0].value as number)}</p>
          <p className="text-[10px] font-bold text-primary mt-1">
            {((payload[0].value as number / totalPatrimonio) * 100).toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Distribuição Patrimonial</h3>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-[48px] p-10 shadow-soft border border-white/60 dark:border-white/5 flex flex-col items-center relative overflow-hidden">
        {/* Decorative background elements for Material 3 look */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary blur-[100px]" />
        </div>

        <div className="h-[400px] w-full relative flex flex-col items-center justify-center">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Geral</span>
            <span className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tighter">
              {formatCurrency(totalPatrimonio)}
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="72%"
                outerRadius="95%"
                paddingAngle={6}
                dataKey="value"
                stroke="none"
                cornerRadius={12}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity duration-300 cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};
