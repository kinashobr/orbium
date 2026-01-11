"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RadialGaugeProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  status: "success" | "warning" | "danger" | "neutral";
  size?: number;
  className?: string;
}

export function RadialGauge({
  value,
  min = 0,
  max = 100,
  label,
  unit = "%",
  status,
  size = 200,
  className,
}: RadialGaugeProps) {
  const [offset, setOffset] = useState(0);
  const radius = size * 0.4;
  const stroke = size * 0.08;
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Pequeno delay para garantir que a animação ocorra após a montagem
    const timer = setTimeout(() => {
      const progressOffset = circumference - (percentage / 100) * circumference;
      setOffset(progressOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  const statusColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    neutral: "text-primary",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            className="text-muted/20"
          />
          {/* Progress circle animado */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset === 0 ? circumference : offset}
            strokeLinecap="round"
            fill="transparent"
            className={cn("transition-all duration-1000 ease-out", statusColors[status])}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black tracking-tighter tabular-nums">
            {value.toFixed(1)}{unit}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}