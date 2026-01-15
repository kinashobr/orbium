import React from "react";
import { cn } from "@/lib/utils";

interface MotorcycleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function MotorcycleIcon({ className, ...props }: MotorcycleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-6 h-6", className)}
      {...props}
    >
      {/* Roda Traseira */}
      <circle cx="5" cy="18" r="3" />
      {/* Roda Dianteira */}
      <circle cx="19" cy="18" r="3" />
      {/* Chassi e Corpo (Estilo Sport/Custom) */}
      <path d="M10 18h4" />
      <path d="M12 18l-1.5-5h3l1.5 2.5" />
      <path d="M19 15l-2.5-7.5-4 1-1.5 2.5" />
      {/* Guidão e Tanque */}
      <path d="M13 7l1.5-2.5h3.5l-1 2.5" />
      <path d="M11 10.5h3" />
    </svg>
  );
}