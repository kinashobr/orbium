"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  PieChart,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BalanceSheetListProps {
  title: string;
  totalValue: number;
  items: {
    label: string;
    value: number;
    percent: number;
    type: 'circulante' | 'nao_circulante' | 'patrimonio';
    details?: {
      id: string;
      name: string;
      typeLabel: string;
      value: number;
      percent: number;
      icon: React.ElementType;
    }[];
  }[];
  isAsset: boolean;
  plValue?: number;
}

export function BalanceSheetList({ title, totalValue, items, isAsset, plValue }: BalanceSheetListProps) {
  const totalPassivo = items.filter(i => i.type !== 'patrimonio').reduce((acc, i) => acc + i.value, 0);
  const totalGeral = isAsset ? totalValue : (totalValue);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isAsset ? "bg-success" : "bg-destructive"
            )} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-70">
              {isAsset ? "Estrutura de Bens" : "Origens de Capital"}
            </h3>
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tighter text-foreground uppercase">
            {title}
          </h2>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Total Consolidado</p>
          <p className={cn(
            "text-2xl sm:text-3xl font-black tracking-tighter tabular-nums leading-none",
            isAsset ? "text-success" : "text-foreground"
          )}>
            {formatCurrency(totalGeral)}
          </p>
        </div>
      </div>

      {/* Container Principal Expressivo */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
        
        <div className="space-y-12 relative z-10">
          {items.map((section, idx) => {
            const isPL = section.type === 'patrimonio';
            
            return (
              <div key={idx} className="space-y-6">
                {/* Subtotal da Seção - AGORA COM MÁXIMA EXPRESSÃO */}
                {!isPL && (
                  <div className="flex items-center justify-between px-2 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                        <LayoutGrid size={20} />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-xl sm:text-2xl text-foreground tracking-tight uppercase">
                          {section.label}
                        </h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          Subtotal do Grupo
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl sm:text-2xl text-foreground tabular-nums leading-none">
                        {formatCurrency(section.value)}
                      </p>
                      <Badge variant="outline" className="mt-1 rounded-lg border-none bg-primary/10 text-primary font-black text-[10px] px-2 py-0.5">
                        {section.percent.toFixed(1)}% do total
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Lista de Itens (Cards Compactos) */}
                <div className="grid grid-cols-1 gap-2 pl-2 sm:pl-4">
                  {section.details?.map((detail) => (
                    <div 
                      key={detail.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-card/50 border border-border/30 hover:border-primary/20 hover:bg-card transition-all duration-300 group/item cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover/item:text-primary transition-all">
                          <detail.icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate leading-tight">
                            {detail.name}
                          </p>
                          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5 opacity-50">
                            {detail.typeLabel}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm sm:text-base text-foreground tabular-nums leading-none">
                          {formatCurrency(detail.value)}
                        </p>
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase mt-1">
                          {detail.percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Caso seja Patrimônio Líquido (Destaque Especial Mantido) */}
                  {isPL && (
                    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-primary text-white shadow-xl shadow-primary/20 relative overflow-hidden group/pl">
                      <div className="absolute right-0 top-0 p-8 opacity-10 rotate-12 group-hover/pl:scale-125 transition-transform duration-1000">
                        <TrendingUp size={120} />
                      </div>
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Capital Próprio Acumulado</p>
                          <h4 className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums leading-none">
                            {formatCurrency(section.value)}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Participação</p>
                            <p className="text-xl font-black">{section.percent.toFixed(1)}%</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                            <ArrowRight size={24} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Indicador de Fechamento (Total do Lado) */}
        <div className="mt-12 pt-8 border-t border-border/40 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isAsset ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {isAsset ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
              {isAsset ? "Total do Ativo" : "Total do Passivo"}
            </span>
          </div>
          <p className={cn(
            "text-xl sm:text-2xl font-black tabular-nums",
            isAsset ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(isAsset ? totalValue : totalPassivo)}
          </p>
        </div>
      </div>
    </div>
  );
}