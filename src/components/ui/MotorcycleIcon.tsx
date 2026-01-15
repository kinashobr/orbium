import React from "react";
import { cn } from "@/lib/utils";
import { Motorcycle } from "lucide-react";

interface MotorcycleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function MotorcycleIcon({ className, ...props }: MotorcycleIconProps) {
  // Usando o ícone Motorcycle do Lucide React
  return (
    <Motorcycle className={cn("w-6 h-6", className)} {...props} />
  );
}