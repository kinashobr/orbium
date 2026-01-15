"use client";

import { cn } from "@/lib/utils";
import { RadialGauge } from "./RadialGauge";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IndicatorRadialCardProps {
  title: string;
  value: number;
  label: string;
  unit?: string;
  status: "success" | "warning" | "danger" | "neutral";
  description?: string;
  formula?: string;
  idealRange?: string;
  className?: string;
}

export function IndicatorRadialCard({
  title,
  value,
  label,
  unit = "%",
  status,
  description,
  formula,
  idealRange,
  className
}: IndicatorRadialCardProps) {
  const hasTooltipContent = description || formula || idealRange;

  return (
    <div className={cn(
      "bg-card rounded-[1.75rem] p-4 border border-border/40 hover:shadow-lg transition-all group flex flex-col justify-between overflow-hidden",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 flex-1">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        </div>
        {hasTooltipContent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-primary transition-colors shrink-0">
                  <HelpCircle size={12} />
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
                      <p className="text-xs text-foreground leading-relaxed">{description}</p>
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
        )}
      </div>
      
      <div className="flex items-center justify-center -my-2">
        <RadialGauge 
          value={value} 
          label={label} 
          unit={unit} 
          status={status} 
          size={140}
        />
      </div>
    </div>
  );
}