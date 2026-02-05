"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Plus, DollarSign, Zap, Receipt } from "lucide-react";

interface DREItem {
  label: string;
  value: number;
  type: 'header' | 'subtotal' | 'detail' | 'final';
  details?: DREItem[];
  icon?: React.ElementType;
  color?: string;
}

interface DREStatementProps {
  data: DREItem[];
  title: string;
  className?: string;
}

const renderItem = (item: DREItem, level: number = 0) => {
  const isHeader = item.type === 'header';
  const isSubtotal = item.type === 'subtotal';
  const isFinal = item.type === 'final';
  const isDetail = item.type === 'detail';
  
  const baseClasses = "flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 transition-colors";
  
  const style = {
    paddingLeft: `${level * 1.5}rem`,
    fontWeight: isHeader || isFinal ? '900' : isSubtotal ? '700' : '500',
    fontSize: isHeader || isFinal ? '1.125rem' : isSubtotal ? '1rem' : '0.875rem',
    color: isHeader || isFinal ? 'hsl(var(--foreground))' : isSubtotal ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    backgroundColor: isHeader || isFinal ? 'hsl(var(--muted) / 0.3)' : isSubtotal ? 'hsl(var(--muted) / 0.1)' : 'transparent',
    borderBottom: isHeader || isSubtotal ? '1px solid hsl(var(--border) / 0.5)' : 'none',
  };
  
  const valueColor =
    item.color ||
    (item.value >= 0 ? "text-success" : "text-destructive");

  // Nível de topo: tratamos como blocos, similar ao Balanço (faixa + card interno de linhas)
  if (level === 0) {
    // Bloco de resultado final destacado
    if (isFinal) {
      return (
        <div
          key={item.label}
          className={cn(
            "rounded-2xl border border-primary/50 bg-primary/5 px-4 sm:px-5 py-4 sm:py-5",
            "flex items-center justify-between gap-4",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {item.icon && (
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary",
                  item.color,
                )}
              >
                <item.icon className="w-4 h-4" />
              </div>
            )}
            <span className="text-sm sm:text-base font-black uppercase tracking-[0.18em] text-muted-foreground truncate">
              {item.label}
            </span>
          </div>
          <span
            className={cn(
              "text-xl sm:text-2xl font-black tabular-nums tracking-tight", 
              valueColor,
            )}
          >
            {formatCurrency(item.value)}
          </span>
        </div>
      );
    }

    // Demais blocos (Receitas, Despesas, Resultado Financeiro, etc.)
    return (
      <div key={item.label} className="space-y-3">
        {/* Faixa da seção, inspirada no cabeçalho de seção do Balanço */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl px-3.5 sm:px-4 py-2 border border-border/40",
            "bg-muted/40 text-foreground",
          )}
        >
          <div className="min-w-0 flex items-center gap-2">
            {item.icon && (
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center bg-card/60 text-muted-foreground",
                  item.color,
                )}
              >
                <item.icon className="w-4 h-4" />
              </div>
            )}
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] truncate">
              {item.label}
            </span>
          </div>
          <span className={cn("shrink-0 text-sm sm:text-base font-black tabular-nums tracking-tighter", valueColor)}>
            {formatCurrency(item.value)}
          </span>
        </div>

        {/* Card com itens internos da seção, visualmente igual ao corpo do Balanço */}
        {!!item.details?.length && (
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30">
             {item.details.map((detail, detailIdx) => {
               const detailValueColor = detail.color || (detail.value >= 0 ? "text-success" : "text-destructive");

              return (
                <div
                  key={detail.label}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3",
                    detailIdx !== item.details!.length - 1 && "border-b border-dashed border-border/40",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {detail.icon && (
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center bg-card/60 text-muted-foreground",
                          detail.color,
                        )}
                      >
                        <detail.icon className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-sm font-bold text-foreground truncate">
                      {detail.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm sm:text-base font-black tabular-nums tracking-tighter", 
                       detailValueColor,
                    )}
                  >
                    {formatCurrency(detail.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Níveis internos (se existirem): mantemos linha simples, usada apenas como fallback
  return (
    <React.Fragment key={item.label}>
      <div
        className={cn(
          baseClasses,
          isHeader && "bg-muted/50 text-lg font-black uppercase tracking-tight",
          isFinal && "bg-primary/10 text-xl font-black border-t-2 border-primary/50",
          isSubtotal && "bg-muted/20 text-base font-bold",
          isDetail && "hover:bg-muted/10",
        )}
        style={style}
      >
        <div className="flex items-center gap-3">
          {item.icon && (
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center bg-card/60 text-muted-foreground",
                item.color,
              )}
            >
              <item.icon className="w-4 h-4" />
            </div>
          )}
          <span
            className={cn(
              "truncate",
              isHeader && "text-foreground",
              isFinal && "text-primary",
              isSubtotal && "text-foreground",
            )}
          >
            {item.label}
          </span>
        </div>
        <span
          className={cn(
            "font-black tabular-nums",
            valueColor,
            isHeader && "text-xl",
            isFinal && "text-2xl text-primary",
            isSubtotal && "text-lg",
          )}
        >
          {formatCurrency(item.value)}
        </span>
      </div>

      {item.details && item.details.map((detail) => renderItem(detail, level + 1))}
    </React.Fragment>
  );
};

export function DREStatement({ data, title, className }: DREStatementProps) {
  return (
    <div
      className={cn(
        "bg-surface-light dark:bg-surface-dark rounded-[3rem] border border-white/60 dark:border-white/5 shadow-soft overflow-hidden",
        className
      )}
    >
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">(Regime de Caixa)</p>
          </div>
        </div>
      </div>
      <div className="px-3.5 sm:px-5 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {data.map((item) => renderItem(item))}
      </div>
    </div>
  );
}