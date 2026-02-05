"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { 
  TrendingUp,
  TrendingDown,
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
  /**
   * Controla se a seção de Patrimônio Líquido (type === 'patrimonio') deve ser
   * exibida. No Balanço Patrimonial mantemos esse card; na DRE podemos ocultá-lo.
   */
  showEquity?: boolean;
}

export function BalanceSheetList({ title, totalValue, items, isAsset, plValue, showEquity = true }: BalanceSheetListProps) {
  // Mantemos a assinatura (title/totalValue) por compatibilidade com chamadas existentes.
  void title;

  const sideTone = isAsset
    ? {
        barBg: "bg-success/10",
        barText: "text-success",
        iconBg: "bg-success/10",
        iconText: "text-success",
      }
    : {
        barBg: "bg-destructive/10",
        barText: "text-destructive",
        iconBg: "bg-destructive/10",
        iconText: "text-destructive",
      };

  const plTone =
    (plValue ?? 0) >= 0
      ? { bg: "bg-accent/10", ring: "ring-accent/10", text: "text-accent" }
      : { bg: "bg-destructive/10", ring: "ring-destructive/10", text: "text-destructive" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-6">
        {items.map((section, idx) => {
          const isPL = section.type === 'patrimonio';
          // No lado do Passivo, usamos a faixa do item PL como "Total do Passivo" (o PL fica no card separado abaixo).
          const showPassivoTotalInEquityRow = !isAsset && isPL;
          const passivoPlusPL = showPassivoTotalInEquityRow ? (totalValue + section.value) : 0;
          const passivoPercent = showPassivoTotalInEquityRow && passivoPlusPL > 0 ? (totalValue / passivoPlusPL) * 100 : 0;
          // Na DRE, não exibimos o card visual de Patrimônio Líquido; no Balanço,
          // ele continua aparecendo normalmente no lado do Passivo + PL.
          if (isPL && !showEquity) return null;

          return (
            <div key={idx} className="space-y-3">
              {/* Faixa da seção */}
              {(
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 border border-border/40",
                    sideTone.barBg,
                    sideTone.barText,
                  )}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] truncate">
                      {showPassivoTotalInEquityRow ? "Total do Passivo" : section.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        sideTone.barBg,
                        sideTone.barText,
                      )}
                    >
                      {(showPassivoTotalInEquityRow ? passivoPercent : section.percent).toFixed(1)}%
                    </Badge>
                  </div>
                  <span className="shrink-0 text-sm sm:text-base font-black tabular-nums tracking-tighter">
                    {formatCurrency(showPassivoTotalInEquityRow ? totalValue : section.value)}
                  </span>
                </div>
              )}

              {/* Linhas */}
              {!!section.details?.length && (
                <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30">
                  {section.details.map((detail, detailIdx) => (
                    <div
                      key={detail.id}
                      className={cn(
                        "flex items-center gap-3 px-3.5 sm:px-4 py-3",
                        detailIdx !== section.details!.length - 1 && "border-b border-dashed border-border/40",
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", sideTone.iconBg, sideTone.iconText)}>
                        <detail.icon size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate leading-tight">
                          {detail.name}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 opacity-60 truncate">
                          {detail.typeLabel}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm sm:text-base font-black tabular-nums tracking-tighter leading-none text-foreground">
                          {formatCurrency(detail.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Patrimônio Líquido (somente quando showEquity = true) */}
              {isPL && showEquity && (
                <div
                  className={cn(
                    "rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm px-4 py-4 flex items-center justify-between",
                    "ring-1",
                    plTone.bg,
                    plTone.ring,
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-1">
                      Patrimônio Líquido
                    </p>
                    <p className="text-base sm:text-lg font-black tabular-nums text-foreground leading-none">
                      {formatCurrency(section.value)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-2 py-0.5 border border-border/30">
                      {section.value >= 0 ? (
                        <TrendingUp size={12} className={plTone.text} />
                      ) : (
                        <TrendingDown size={12} className={plTone.text} />
                      )}
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                        {section.percent.toFixed(1)}% do total
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.18em]">
                      Capital próprio
                    </span>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}