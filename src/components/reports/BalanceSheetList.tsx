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
  ChevronRight
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
  const totalGeral = isAsset ? totalValue : (totalValue); // Ativo ou Passivo + PL

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
        
        <div className="space-y-10 relative z-10">
          {items.map((section, idx) => {
            const isPL = section.type === 'patrimonio';
            
            return (
              <div key={idx} className="space-y-5">
                {/* Label da Categoria */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
                      isPL ? "bg-primary text-white" : "bg-muted/50 text-muted-foreground"
                    )}>
                      {isPL ? <PieChart size={16} /> : <LayoutGrid size={16} />}
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em]",
                      isPL ? "text-primary" : "text-muted-foreground"
                    )}>
                      {section.label}
                    </span>
                  </div>
                  <Badge variant="outline" className="rounded-lg border-none bg-muted/30 font-black text-[10px] px-2 py-0.5">
                    {section.percent.toFixed(1)}%
                  </Badge>
                </div>

                {/* Lista de Itens (Cards Táteis) */}
                <div className="grid grid-cols-1 gap-3">
                  {section.details?.map((detail) => (
                    <div 
                      key={detail.id}
                      className="flex items-center justify-between p-4 sm:p-5 rounded-[2rem] bg-card border border-border/40 hover:border-primary/30 hover:shadow-soft transition-all duration-300 group/item cursor-default"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover/item:scale-110 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-all duration-500">
                          <detail.icon size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base text-foreground truncate leading-tight">
                            {detail.name}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                            {detail.typeLabel}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="font-black text-sm sm:text-lg text-foreground tabular-nums leading-none">
                          {formatCurrency(detail.value)}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Peso:</span>
                          <span className="text-[10px] font-black text-primary">{detail.percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Caso seja Patrimônio Líquido (Destaque Especial) */}
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

                {/* Subtotal da Seção (Visual de Rodapé) */}
                {!isPL && (
                  <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-muted/20 border border-dashed border-border/60">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Subtotal {section.label.split(' ')[1]}
                    </span>
                    <span className="font-black text-sm text-foreground tabular-nums">
                      {formatCurrency(section.value)}
                    </span>
                  </div>
                )}
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