import { cn } from "@/lib/utils";

interface MotorcycleIconProps {
  className?: string;
  size?: number;
}

export function MotorcycleIcon({ className, size = 24 }: MotorcycleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide", className)}
    >
      {/* Roda traseira */}
      <circle cx="5" cy="17" r="3" />
      {/* Roda dianteira */}
      <circle cx="19" cy="17" r="3" />
      {/* Corpo da moto */}
      <path d="M5 17h4l3-6h4" />
      {/* Guidão */}
      <path d="M16 11l3-3" />
      <path d="M19 8v3" />
      {/* Tanque/selim */}
      <path d="M9 11l2-4h3" />
      {/* Escapamento */}
      <path d="M5 14h2" />
    </svg>
  );
}
