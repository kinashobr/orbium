import React from "react";
import { cn } from "@/lib/utils";
import { Motorbike } from "lucide-react";

interface MotorcycleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function MotorcycleIcon({ className, ...props }: MotorcycleIconProps) {
  // Usando o ícone Motorbike do Lucide React
  return (
    <Motorbike className={cn("w-6 h-6", className)} {...props} />
  );
}