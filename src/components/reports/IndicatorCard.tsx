"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Info, LucideIcon, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MiniSparkline } from "./MiniSparkline";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type IndicatorStatus = "success" | "warning" | "danger" | "neutral";

interface IndicatorCardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  status: IndicatorStatus;
  icon: LucideIcon;
  sparklineData?: number[];
  description?: string;
  formula?: string;
  idealRange?: string;
  className?: string;
}

export function IndicatorCard({
  title,
  value,
  trend,
  trendLabel,
  status,
  icon: Icon,
  sparklineData,
  description,
  formula,
  idealRange,
  className
}: IndicatorCardProps) {
  const statusConfig = {
    success: { color: "text-success", bg: "bg-success/10", label: "Saudável" },
    warning: { color: "text-warning", bg: "bg-warning/10", label: "Atenção" },
    danger: { color: "text-destructive", bg: "bg-destructive/10", label: "Crítico" },
    neutral: { color: "text-primary", bg: "bg-primary/10", label: "Neutro" },
  };

  const config = statusConfig[status];

  const hasTooltipContent = description || formula || idealRange;

  return (
    <div className={cn(
      "bg-gradient-to-br from-neutral-800 to-neutral-900 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 border border-white/5",
      className
    )}>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-primary border border-white/10">
            <Icon size={20} />
          </div>
          <Badge variant="outline" className={cn("rounded-lg border-none font-black text-[9px] px-2 py-0.5 uppercase tracking-widest", config.bg, config.color)}>
            {config.label}
          </Badge>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] truncate" title={title}>
              {title}
            </p>
            <h3 className="text-3xl font-black tracking-tighter tabular-nums leading-none">
              {value}
            </h3>
          </div>
          
          {sparklineData && (
            <div className="pb-1">
              <MiniSparkline 
                data={sparklineData} 
                color={trend && trend >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
              />
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          {trend !== undefined ? (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-black uppercase tracking-tight",
              trend >= 0 ? "text-success" : "text-destructive"
            )}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend).toFixed(1)}% {trendLabel || "vs anterior"}
            </div>
          ) : (
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              Estável
            </div>
          )}
          
          {hasTooltipContent ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-neutral-500 hover:text-white transition-colors">
                    <HelpCircle size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="max-w-[280px] p-4 rounded-2xl bg-popover border border-border/40 shadow-2xl"
                >
                  <div className="space-y-2">
                    {description && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">O que é?</p>
                        <p className="text-xs text-popover-foreground leading-relaxed">{description}</p>
                      </div>
                    )}
                    {formula && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Fórmula</p>
                        <p className="text-xs text-primary font-mono">{formula}</p>
                      </div>
                    )}
                    {idealRange && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ideal</p>
                        <p className="text-xs text-success">{idealRange}</p>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button className="text-neutral-500 hover:text-white transition-colors">
              <Info size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}