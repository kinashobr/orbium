"use client";

import { 
  Wallet, 
  Scale, 
  Activity,
  Shield,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SaudeFinanceiraProps {
  liquidez: number;
  endividamento: number;
  diversificacao: number;
  estabilidadeFluxo: number;
  dependenciaRenda: number;
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  badgeClass: string;
  statusIcon: typeof CheckCircle;
}

const getLiquidezStatus = (val: number): StatusConfig => {
  if (val >= 2) return { label: "ÓTIMO", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  if (val >= 1.2) return { label: "BOM", color: "text-blue-600", bg: "bg-blue-50/80 dark:bg-blue-900/10", border: "border-blue-100 dark:border-blue-900/20", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", statusIcon: CheckCircle };
  return { label: "ATENÇÃO", color: "text-orange-600", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", statusIcon: AlertTriangle };
};

const getEndividamentoStatus = (val: number): StatusConfig => {
  if (val <= 25) return { label: "ÓTIMO", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  if (val <= 45) return { label: "ALERTA", color: "text-orange-600", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", statusIcon: AlertTriangle };
  return { label: "ALTO", color: "text-red-600", bg: "bg-red-50/80 dark:bg-red-900/10", border: "border-red-100 dark:border-red-900/20", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", statusIcon: XCircle };
};

const getDiversificacaoStatus = (val: number): StatusConfig => {
  if (val >= 60) return { label: "ALTA", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  return { label: "BAIXA", color: "text-orange-600", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", statusIcon: AlertTriangle };
};

const getEstabilidadeStatus = (val: number): StatusConfig => {
  if (val >= 80) return { label: "ALTA", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  return { label: "MÉDIA", color: "text-primary", bg: "bg-primary/5 dark:bg-primary/10", border: "border-primary/20 dark:border-primary/30", badgeClass: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary", statusIcon: AlertTriangle };
};

const indicadoresConfig = [
  { id: 'liquidez', label: 'Liquidez', icon: Wallet, format: 'decimal' as const, getStatus: getLiquidezStatus },
  { id: 'endividamento', label: 'Dívidas', icon: Scale, format: 'percent' as const, getStatus: getEndividamentoStatus },
  { id: 'diversificacao', label: 'Mix Ativos', icon: Activity, format: 'percent' as const, getStatus: getDiversificacaoStatus },
  { id: 'estabilidade', label: 'Consistência', icon: Shield, format: 'percent' as const, getStatus: getEstabilidadeStatus }
];

export function SaudeFinanceira({
  liquidez,
  endividamento,
  diversificacao,
  estabilidadeFluxo,
}: SaudeFinanceiraProps) {
  
  const valores = {
    liquidez,
    endividamento,
    diversificacao,
    estabilidade: estabilidadeFluxo
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-display font-bold text-base text-foreground">Indicadores de Saúde</h3>
        <span className="text-[9px] font-bold text-primary bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full uppercase">Status</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {indicadoresConfig.map((config) => {
          const value = valores[config.id as keyof typeof valores];
          const status = config.getStatus(value);

          return (
            <div key={config.id} className={cn("rounded-2xl p-4 border transition-all hover:bg-white/50 dark:hover:bg-white/5 group relative overflow-hidden cursor-help", status.bg, status.border)}>
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
                  <config.icon className={cn("w-4 h-4", status.color)} />
                </div>
                <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md border border-black/5 dark:border-white/5", status.badgeClass)}>
                  {status.label}
                </span>
              </div>
              <p className={cn("text-xl sm:text-2xl font-display font-black tabular-nums leading-none", status.color)}>
                {config.format === 'decimal' ? `${value.toFixed(1)}x` : `${value.toFixed(0)}%`}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-tight opacity-60 mt-1">{config.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}