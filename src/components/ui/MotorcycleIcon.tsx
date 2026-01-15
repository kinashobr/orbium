import React from "react";
import { cn } from "@/lib/utils";
import { Bike } from "lucide-react";

interface MotorcycleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function MotorcycleIcon({ className, ...props }: MotorcycleIconProps) {
  // Usando o ícone Bike do Lucide React como um substituto padrão para motocicleta
  return (
    <Bike className={cn("w-6 h-6", className)} {...props} />
  );
}