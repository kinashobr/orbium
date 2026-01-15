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
      "bg-card rounded-[1.5rem] p-3 sm:p-4 border border-border/40 hover:shadow-lg transition-all group flex flex-col justify-between overflow-hidden min-h-[160px]",
      className
    )}>
      <div className="flex items-start justify-between gap-1">
        <div className="space-y-0.5 flex-1">
          <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-tight">{title}</p>
        </div>
        {hasTooltipContent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-primary transition-colors shrink-0">
                  <HelpCircle size={10} />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[240px] p-3 rounded-2xl bg-popover border border-border/40 shadow-2xl"
              >
                <div className="space-y-2">
                  {description && (
                    <div>
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">O que é?</p>
                      <p className="text-xs text-foreground leading-relaxed">{description}</p>
                    </div>
                  )}
                  {formula && (
                    <div>
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Fórmula</p>
                      <p className="text-[10px] text-primary font-mono">{formula}</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="flex items-center justify-center -my-3">
        <RadialGauge 
          value={value} 
          label={label} 
          unit={unit} 
          status={status} 
          size={120}
        />
      </div>
    </div>
  );
}