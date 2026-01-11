import { ReactNode } from "react";
import { KpiCard, type KpiStatus, type KpiSize } from "@/components/ui/KpiCard";

export interface ReportCardProps {
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

export function ReportCard({
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
}: ReportCardProps) {
  return (
    <KpiCard
      title={title}
      value={value}
      subtitle={subtitle}
      trend={trend}
      trendLabel={trendLabel}
      status={status}
      icon={icon}
      tooltip={tooltip}
      className={className}
      delay={delay}
      size={size}
    />
  );
}
