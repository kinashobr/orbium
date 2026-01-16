"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Wallet, Receipt, DollarSign } from "lucide-react";

interface CockpitData {
  patrimonioTotal: number;
  variacaoPatrimonio: number;
  variacaoPercentual: number;
  liquidezImediata: number;
  compromissosMes: number;
  compromissosPercent: number;
  totalAtivos: number;
  projecao30Dias: number;
}

interface CockpitCardsProps {
  data: CockpitData;
}

export function CockpitCards({ data }: CockpitCardsProps) {
  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toLocaleString('pt-BR');
  };

  const liquidezPercent = useMemo(() => {
    if (data.totalAtivos === 0) return 0;
    return Math.min(100, (data.liquidezImediata / data.totalAtivos) * 100);
  }, [data.liquidezImediata, data.totalAtivos]);

  const CIRCUMFERENCE = 339.29;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6 h-full">
        {/* Card de Liquidez */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex items-center justify-between relative overflow-hidden min-h-[180px] h-full hover:shadow-soft-lg hover:-translate-y-1 transition-all group cursor-help animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {/* Ícone Decorativo de Fundo */}
              <Wallet className="absolute -right-6 -bottom-6 w-32 h-32 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
              
              <div className="flex flex-col h-full justify-between z-10 space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Capital Disponível</p>
                    <Info className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                  <p className="font-display font-bold text-2xl lg:text-4xl text-foreground tracking-tight">R$ {formatCompact(data.liquidezImediata)}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1">Dinheiro livre para usar</p>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <span className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    data.liquidezImediata > 0 ? "bg-primary" : "bg-neutral-300"
                  )}></span>
                  <span className={cn(
                    "text-[10px] sm:text-xs font-bold uppercase tracking-wider",
                    data.liquidezImediata > 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {data.liquidezImediata > 0 ? "Com saldo" : "Zerado"}
                  </span>
                </div>
              </div>
              <div className="relative w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center shrink-0 z-10">
                <svg className="transform -rotate-90 w-full h-full">
                  <circle 
                    className="text-neutral-100 dark:text-neutral-800" 
                    cx="50%" cy="50%" r="42%" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="10"
                  />
                  <circle 
                    className="text-primary transition-all duration-1000 ease-out" 
                    cx="50%" cy="50%" r="42%" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="10"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE - (CIRCUMFERENCE * liquidezPercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xl lg:text-3xl font-black text-foreground tabular-nums">{liquidezPercent.toFixed(0)}%</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px] p-4 rounded-2xl border-border shadow-xl">
            <p className="text-xs leading-relaxed">
              <strong>O que é:</strong> Soma de todo dinheiro disponível em contas correntes, poupança, reserva e aplicações de fácil resgate.<br/><br/>
              <strong>Para que serve:</strong> Mostra quanto você tem de dinheiro acessível para usar quando precisar.
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Card de Compromissos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex items-center justify-between relative overflow-hidden min-h-[180px] h-full hover:shadow-soft-lg hover:-translate-y-1 transition-all group cursor-help animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              {/* Ícone Decorativo de Fundo */}
              <Receipt className="absolute -right-6 -bottom-6 w-32 h-32 text-indigo-500 opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
              
              <div className="flex flex-col h-full justify-between z-10 space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Contas do Mês</p>
                    <Info className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                  <p className="font-display font-bold text-2xl lg:text-4xl text-foreground tracking-tight">R$ {formatCompact(data.compromissosMes)}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1">Valor comprometido</p>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    data.totalAtivos === 0 ? "bg-neutral-300" :
                    data.compromissosPercent <= 70 ? "bg-green-400" : "bg-red-400"
                  )}></span>
                  <span className={cn(
                    "text-[10px] sm:text-xs font-bold uppercase tracking-wider",
                    data.totalAtivos === 0 ? "text-muted-foreground" :
                    data.compromissosPercent <= 70 ? "text-green-600" : "text-red-600"
                  )}>
                    {data.totalAtivos === 0 ? "Sem movimentação" :
                    data.compromissosPercent <= 70 ? "Situação: OK" : "Situação: Atenção"}
                  </span>
                </div>
              </div>
              <div className="relative w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center shrink-0 z-10">
                <svg className="transform -rotate-90 w-full h-full">
                  <circle 
                    className="text-neutral-100 dark:text-neutral-800" 
                    cx="50%" cy="50%" r="42%" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="10"
                  />
                  <circle 
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      data.totalAtivos === 0 ? "text-neutral-200" :
                      data.compromissosPercent <= 70 ? "text-indigo-400" : "text-red-400"
                    )}
                    cx="50%" cy="50%" r="42%" 
                    fill="transparent" 
                    stroke="currentColor" 
                    strokeWidth="10"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE - (CIRCUMFERENCE * Math.min(100, data.compromissosPercent) / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xl lg:text-3xl font-black text-foreground tabular-nums">{data.compromissosPercent.toFixed(0)}%</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px] p-4 rounded-2xl border-border shadow-xl">
            <p className="text-xs leading-relaxed">
              <strong>O que é:</strong> Total de saídas do período, incluindo contas pagas, faturas de cartão e parcelas.<br/><br/>
              <strong>Para que serve:</strong> Mostra quanto você está gastando ou comprometendo da sua renda.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}