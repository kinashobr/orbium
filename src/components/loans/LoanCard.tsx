import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KpiCard, type KpiStatus, type KpiSize } from "@/components/ui/KpiCard";

interface LoanCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  status?: KpiStatus;
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
  delay?: number;
  size?: KpiSize;
}

export function LoanCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  status = "neutral",
  icon,
  tooltip,
  className,
  delay = 0,
  size = "md",
}: LoanCardProps) {
  const content = (
    <KpiCard
      title={title}
      value={value}
      subtitle={subtitle}
      trend={trend}
      trendLabel={trendLabel}
      status={status}
      icon={icon}
      className={className}
      delay={delay}
      size={size}
    />
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs bg-popover border-border">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
