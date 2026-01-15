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

  // Métricas resumidas do mês
  const monthSummary = useMemo(() => {
    const validDays = calendarDays.filter((d): d is DayData => d !== null && d.volume > 0);
    const totalEntradas = validDays.reduce((acc, d) => acc + d.receitas, 0);
    const totalSaidas = validDays.reduce((acc, d) => acc + d.despesas, 0);
    const diaMaiorVolume = validDays.length > 0 
      ? validDays.reduce((max, d) => d.volume > max.volume ? d : max, validDays[0])
      : null;
    const diasComMovimento = validDays.length;
    
    return { totalEntradas, totalSaidas, diaMaiorVolume, diasComMovimento };
  }, [calendarDays]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDayStyle = (day: DayData | null) => {
    if (!day) return "bg-transparent";
    if (day.volume === 0) return "bg-neutral-100 dark:bg-neutral-800 text-neutral-400";
    
    const intensity = day.volume / maxVolume;
    
    if (intensity < 0.25) return "bg-primary/10 text-primary-dark border border-primary/5";
    if (intensity < 0.5) return "bg-primary/30 text-primary-dark";
    if (intensity < 0.75) return "bg-primary/60 text-white shadow-md";
    
    return "bg-primary text-white shadow-lg shadow-primary/30 scale-105 z-10";
  };

  return (
    <TooltipProvider>
      <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 shadow-soft border border-white/60 dark:border-white/5">
        {/* Header com Métricas Resumidas */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-display font-bold text-2xl text-foreground">Movimentação Diária</h3>
              <p className="text-sm text-muted-foreground mt-1">Quanto mais escuro, maior o volume de entradas e saídas no dia</p>
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

          {/* Cards de Resumo do Mês */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Entradas</p>
              <p className="text-lg font-black text-green-700 dark:text-green-300 tabular-nums">{formatCurrency(monthSummary.totalEntradas)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Saídas</p>
              <p className="text-lg font-black text-red-700 dark:text-red-300 tabular-nums">{formatCurrency(monthSummary.totalSaidas)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Dia Pico</p>
              <p className="text-lg font-black text-foreground tabular-nums">
                {monthSummary.diaMaiorVolume ? `Dia ${monthSummary.diaMaiorVolume.day}` : '-'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Dias Ativos</p>
              <p className="text-lg font-black text-foreground tabular-nums">{monthSummary.diasComMovimento}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3 text-center mb-4 pb-4 border-b border-neutral-100 dark:border-white/5">
          {weekDays.map((d, index) => (
            <span key={`weekday-${index}`} className="text-xs font-bold text-muted-foreground uppercase">{d}</span>
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
                  {day && day.despesas > day.receitas && day.despesas > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  )}
                </div>
              </TooltipTrigger>
              {day && day.volume > 0 && (
                <TooltipContent className="rounded-xl p-4 border-border shadow-2xl min-w-[180px]">
                  <p className="font-bold text-sm mb-2">Dia {day.day}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Entradas:</span>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(day.receitas)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Saídas:</span>
                      <span className="text-sm font-bold text-red-600">{formatCurrency(day.despesas)}</span>
                    </div>
                    <div className="pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Saldo do dia:</span>
                        <span className={cn(
                          "text-sm font-bold",
                          day.receitas - day.despesas >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(day.receitas - day.despesas)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">Volume total:</span>
                        <span className="text-[10px] font-medium text-muted-foreground">{formatCurrency(day.volume)}</span>
                      </div>
                    </div>
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