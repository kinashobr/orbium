import React from 'react';
import { cn } from "@/lib/utils";

interface MotorcycleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const MotorcycleIcon = ({ className, ...props }: MotorcycleIconProps) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={cn("lucide lucide-motorcycle", className)}
      {...props}
    >
      {/* Roda Traseira */}
      <circle cx="5" cy="18" r="3" />
      {/* Roda Dianteira */}
      <circle cx="19" cy="18" r="3" />
      {/* Chassi e Motor */}
      <path d="M5 18l3-9h6l3 9" />
      <path d="M8 9l2-5h4l2 5" />
      {/* Guidão */}
      <path d="M14 4h3" />
      {/* Assento */}
      <path d="M7 11h7" />
      {/* Detalhe do Escapamento/Motor */}
      <path d="M9 18h6" />
    </svg>
  );
};