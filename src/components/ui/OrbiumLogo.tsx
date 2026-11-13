import { useId } from "react";
import { cn } from "@/lib/utils";

interface OrbiumLogoProps {
  className?: string;
}

export function OrbiumLogo({ className }: OrbiumLogoProps) {
  const maskId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="61 48 390 390"
      className={cn("select-none", className)}
      aria-label="Orbium Logo"
      role="img"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="500" height="500" fill="white" />
          <path
            d="M 135 245 C 65 305, 85 375, 195 340 C 285 310, 365 215, 405 135"
            fill="none"
            stroke="black"
            strokeWidth="44"
            strokeLinecap="round"
          />
          <polygon points="435,85 372,122 432,162" fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        {/* Anel Externo */}
        <circle
          cx="250"
          cy="250"
          r="132"
          fill="none"
          strokeWidth="26"
          className="stroke-[#532E14] dark:stroke-[#C86A22] transition-colors duration-300"
        />

        {/* Esfera Central (Planeta) */}
        <circle
          cx="250"
          cy="250"
          r="88"
          strokeWidth="10"
          className="fill-[#8C5D3C] stroke-[#532E14] dark:fill-[#C86A22] dark:stroke-[#C86A22] transition-colors duration-300"
        />
      </g>

      {/* Órbita / Seta Ascendente */}
      <path
        d="M 135 245 C 65 305, 85 375, 195 340 C 285 310, 365 215, 405 135"
        fill="none"
        strokeWidth="24"
        strokeLinecap="round"
        className="stroke-[#532E14] dark:stroke-[#C86A22] transition-colors duration-300"
      />

      {/* Ponta da Seta */}
      <polygon
        points="430,92 380,124 426,154"
        className="fill-[#532E14] dark:fill-[#C86A22] transition-colors duration-300"
      />
    </svg>
  );
}
