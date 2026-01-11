"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Plus, DollarSign, Zap } from "lucide-react";

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
  
  const baseClasses = "flex items-center justify-between py-2 transition-colors";
  
  const style = {
    paddingLeft: `${level * 1.5}rem`,
    fontWeight: isHeader || isFinal ? '900' : isSubtotal ? '700' : '500',
    fontSize: isHeader || isFinal ? '1.125rem' : isSubtotal ? '1rem' : '0.875rem',
    color: isHeader || isFinal ? 'hsl(var(--foreground))' : isSubtotal ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    backgroundColor: isHeader || isFinal ? 'hsl(var(--muted) / 0.3)' : isSubtotal ? 'hsl(var(--muted) / 0.1)' : 'transparent',
    borderBottom: isHeader || isSubtotal ? '1px solid hsl(var(--border) / 0.5)' : 'none',
  };
  
  const valueColor = isHeader || isFinal ? 
    (item.value >= 0 ? 'text-success' : 'text-destructive') : 
    isSubtotal ? 
    (item.value >= 0 ? 'text-success' : 'text-destructive') : 
    (item.value >= 0 ? 'text-success' : 'text-destructive');

  return (
    <React.Fragment key={item.label}>
      <div 
        className={cn(
          baseClasses,
          isHeader && "bg-muted/50 text-lg font-black uppercase tracking-tight",
          isFinal && "bg-primary/10 text-xl font-black border-t-2 border-primary/50",
          isSubtotal && "bg-muted/20 text-base font-bold",
          isDetail && "hover:bg-muted/10"
        )}
        style={style}
      >
        <div className="flex items-center gap-3">
          {item.icon && <item.icon className={cn("w-4 h-4", item.color || "text-muted-foreground")} />}
          <span className={cn(
            "truncate",
            isHeader && "text-foreground",
            isFinal && "text-primary",
            isSubtotal && "text-foreground"
          )}>
            {item.label}
          </span>
        </div>
        <span className={cn(
          "font-black tabular-nums",
          valueColor,
          isHeader && "text-xl",
          isFinal && "text-2xl text-primary",
          isSubtotal && "text-lg"
        )}>
          {formatCurrency(item.value)}
        </span>
      </div>
      
      {item.details && item.details.map(detail => renderItem(detail, level + 1))}
    </React.Fragment>
  );
};

export function DREStatement({ data, title, className }: DREStatementProps) {
  return (
    <div className={cn("glass-card p-0 overflow-hidden", className)}>
      <div className="p-6 bg-muted/30 border-b border-border/40">
        <h3 className="text-lg font-black uppercase tracking-tight text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">Estrutura Contábil Detalhada</p>
      </div>
      <div className="divide-y divide-border/20">
        {data.map(item => renderItem(item))}
      </div>
    </div>
  );
}