"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, parseDateLocal } from "@/lib/utils";

interface DayData {
  day: number;
  receitas: number;
  despesas: number;
  volume: number;
}

interface TransacaoV2 {
  id: string;
  date: string;
  amount: number;
  operationType: string;
}

interface FluxoCaixaHeatmapProps {
  month: string;
  year: number;
  transacoes: TransacaoV2[];
}

export function FluxoCaixaHeatmap({ month, year, transacoes }: FluxoCaixaHeatmapProps) {
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
  
  const monthInt = parseInt(month) - 1;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, monthInt, 1).getDay();
    const daysInMonth = new Date(year, monthInt + 1, 0).getDate();
    const result: (DayData | null)[] = Array(firstDay).fill(null);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTxs = transacoes.filter(t => {
        const txDate = parseDateLocal(t.date);
        return txDate.getDate() === day && 
               txDate.getMonth() === monthInt && 
               txDate.getFullYear() === year;
      });

      const daySummary = dayTxs.reduce((acc, t) => {
        if (t.operationType === "receita" || t.operationType === "rendimento") acc.receitas += t.amount;
        else if (t.operationType === "despesa" || t.operationType === "pagamento_emprestimo") acc.despesas += t.amount;
        return acc;
      }, { day, receitas: 0, despesas: 0, volume: 0 });

      daySummary.volume = daySummary.receitas + daySummary.despesas;
      result.push(daySummary);
    }
    return result;
  }, [transacoes, monthInt, year]);

  const maxVolume = useMemo(() => {
    const volumes = calendarDays.map(d => d ? d.volume : 0);
    return Math.max(...volumes, 1);
  }, [calendarDays]);

  const getDayStyle = (day: DayData | null) => {
    if (!day) return "bg-transparent";
    if (day.volume === 0) return "bg-neutral-100 dark:bg-neutral-800 text-neutral-400";
    
    const intensity = day.volume / maxVolume;
    
    // Escala de intensidade baseada no volume diário em relação ao máximo do mês
    if (intensity < 0.25) return "bg-primary/10 text-primary-dark border border-primary/5";
    if (intensity < 0.5) return "bg-primary/30 text-primary-dark";
    if (intensity < 0.75) return "bg-primary/60 text-white shadow-md";
    
    return "bg-primary text-white shadow-lg shadow-primary/30 scale-105 z-10";
  };

  return (
    <TooltipProvider>
      <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 shadow-soft border border-white/60 dark:border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h3 className="font-display font-bold text-2xl text-foreground">Intensidade de Caixa</h3>
            <p className="text-sm text-muted-foreground mt-1">Visualização de densidade de movimentações financeiras no período</p>
          </div>
          <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-900/50 px-4 py-2 rounded-full border border-neutral-100 dark:border-white/5">
            <span className="text-xs font-bold text-muted-foreground">Volume:</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
              <span>Baixo</span>
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded bg-neutral-200 dark:bg-neutral-700"></span>
                <span className="w-3 h-3 rounded bg-primary/20"></span>
                <span className="w-3 h-3 rounded bg-primary/60"></span>
                <span className="w-3 h-3 rounded bg-primary"></span>
              </div>
              <span>Alto</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3 text-center mb-4 pb-4 border-b border-neutral-100 dark:border-white/5">
          {weekDays.map(d => (
            <span key={d} className="text-xs font-bold text-muted-foreground uppercase">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3 text-sm font-bold">
          {calendarDays.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "aspect-square sm:aspect-[1.5/1] flex items-center justify-center rounded-2xl transition-all duration-300 cursor-default relative",
                  getDayStyle(day)
                )}>
                  {day?.day}
                  {day && day.receitas > day.despesas && day.receitas > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  )}
                </div>
              </TooltipTrigger>
              {day && day.volume > 0 && (
                <TooltipContent className="rounded-xl p-3 border-border shadow-2xl">
                  <p className="font-bold text-xs mb-1">Dia {day.day}</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-green-600 font-bold">Entradas: R$ {day.receitas.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-red-600 font-bold">Saídas: R$ {day.despesas.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground pt-1 border-t mt-1">Volume total: R$ {day.volume.toLocaleString('pt-BR')}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}