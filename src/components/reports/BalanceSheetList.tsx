"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              isAsset ? "bg-success" : "bg-destructive"
            )} />
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
              {isAsset ? "Estrutura de Bens" : "Origens de Capital"}
            </h3>
          </div>
          <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground uppercase">
            {title}
          </h2>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Total Consolidado</p>
          <p className={cn(
            "text-lg sm:text-xl font-black tracking-tighter tabular-nums leading-none",
            isAsset ? "text-success" : "text-foreground"
          )}>
            {formatCurrency(totalGeral)}
          </p>
        </div>
      </div>

      {/* Conteúdo Integrado (Sem balão externo) */}
      <div className="space-y-12 relative">
        {items.map((section, idx) => {
          const isPL = section.type === 'patrimonio';
          
          return (
            <div key={idx} className="space-y-4">
              {/* Subtotal da Seção */}
              {!isPL && (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-2 ring-primary/5">
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-base sm:text-lg text-foreground tracking-tight uppercase leading-none">
                        {section.label}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="rounded-md border-none bg-primary/10 text-primary font-black text-[8px] px-1.5 py-0 uppercase tracking-tighter">
                          {section.percent.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base sm:text-lg text-foreground tabular-nums tracking-tighter leading-none">
                      {formatCurrency(section.value)}
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de Itens */}
              <div className="grid grid-cols-1 gap-2 pl-2 sm:pl-6">
                {section.details?.map((detail) => (
                  <div 
                    key={detail.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-card transition-all duration-300 group/item cursor-default"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground group-hover/item:text-primary transition-all">
                        <detail.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate leading-tight">
                          {detail.name}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">
                          {detail.typeLabel}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm sm:text-base text-foreground tabular-nums leading-none">
                        {formatCurrency(detail.value)}
                      </p>
                      <p className="text-[9px] font-black text-primary/60 uppercase mt-1 tracking-tighter">
                        {detail.percent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}

                {/* Patrimônio Líquido */}
                {isPL && (
                  <div className="p-6 sm:p-8 rounded-[2rem] bg-primary text-white shadow-xl shadow-primary/20 relative overflow-hidden group/pl mt-2">
                    <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover/pl:scale-110 transition-transform duration-1000">
                      <TrendingUp size={100} />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/60">Capital Próprio</p>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-black tracking-tighter tabular-nums leading-none">
                          {formatCurrency(section.value)}
                        </h4>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-0.5">Participação</p>
                          <p className="text-lg font-black">{section.percent.toFixed(1)}%</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner">
                          <ArrowRight size={20} />
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

      {/* Indicador de Fechamento */}
      <div className="mt-12 pt-6 border-t border-border/30 flex items-center justify-between relative z-10 px-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shadow-inner",
            isAsset ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {isAsset ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground block">
              {isAsset ? "Total Ativo" : "Total Passivo"}
            </span>
          </div>
        </div>
        <p className={cn(
          "text-xl sm:text-2xl font-black tabular-nums tracking-tighter",
          isAsset ? "text-success" : "text-destructive"
        )}>
          {formatCurrency(isAsset ? totalValue : totalPassivo)}
        </p>
      </div>
    </div>
  );
}