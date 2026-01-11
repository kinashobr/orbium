"use client";

import { cn } from "@/lib/utils";
import { RadialGauge } from "./RadialGauge";

interface IndicatorRadialCardProps {
  title: string;
  value: number;
  label: string;
  unit?: string;
  status: "success" | "warning" | "danger" | "neutral";
  description?: string;
  className?: string;
}

export function IndicatorRadialCard({
  title,
  value,
  label,
  unit = "%",
  status,
  description,
  className
}: IndicatorRadialCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-[1.75rem] p-4 border border-border/40 hover:shadow-lg transition-all group flex flex-col justify-between overflow-hidden",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
          {description && <p className="text-[8px] font-medium text-muted-foreground/60 leading-tight uppercase">{description}</p>}
        </div>
      </div>
      
      <div className="flex items-center justify-center -my-2">
        <RadialGauge 
          value={value} 
          label={label} 
          unit={unit} 
          status={status} 
          size={140} // Aumentado para 140px
        />
      </div>
    </div>
  );
}