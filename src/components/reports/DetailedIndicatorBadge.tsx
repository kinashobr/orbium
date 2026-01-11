import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IndicatorBadge } from "./IndicatorBadge";
import { Calculator, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KpiStatus } from "@/components/ui/KpiCard";

// Define o tipo de status esperado pelo IndicatorBadge
type IndicatorStatus = KpiStatus;

interface DetailedIndicatorBadgeProps {
  title: string;
  value: string;
  status: IndicatorStatus;
  trend?: "up" | "down" | "stable";
  trendLabel?: string; // Adicionado trendLabel
  descricao: string;
  formula: string;
  sparklineData?: number[];
  icon?: ReactNode;
}

export function DetailedIndicatorBadge({
  title,
  value,
  status,
  trend,
  trendLabel, // Recebido aqui
  descricao,
  formula,
  sparklineData,
  icon,
}: DetailedIndicatorBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div>
            <IndicatorBadge
              title={title}
              value={value}
              status={status}
              trend={trend}
              trendLabel={trendLabel} // Passado para IndicatorBadge
              sparklineData={sparklineData}
              icon={icon}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" // Alterado para 'top'
          sideOffset={10} // Adicionado um pequeno offset
          className="max-w-xs sm:max-w-md p-4 space-y-3 bg-popover border-border"
        >
          <div>
            <div className="font-semibold text-foreground flex items-center gap-2">
              {icon}
              {title}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{descricao}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              Fórmula:
            </div>
            <code className="text-xs bg-muted px-2 py-1 rounded block whitespace-normal break-words">
              {formula}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs pt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Saudável</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>Atenção</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>Crítico</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}