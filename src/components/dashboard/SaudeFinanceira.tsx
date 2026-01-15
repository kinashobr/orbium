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
  TrendingUp,
  Target
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

// Estrutura de indicadores com metadados
const indicadoresConfig = [
  {
    id: 'liquidez',
    label: 'Índice de Liquidez',
    icon: Wallet,
    format: 'decimal' as const,
    getStatus: getLiquidezStatus,
    description: 'Capacidade de pagar todas as dívidas com seus ativos',
    formula: 'Total de Ativos ÷ Total de Passivos',
    idealRange: 'Acima de 1.5x é considerado saudável'
  },
  {
    id: 'endividamento',
    label: 'Nível de Dívidas',
    icon: Scale,
    format: 'percent' as const,
    getStatus: getEndividamentoStatus,
    description: 'Quanto do seu patrimônio está comprometido com dívidas',
    formula: '(Total de Passivos ÷ Total de Ativos) × 100',
    idealRange: 'Abaixo de 30% é ideal'
  },
  {
    id: 'diversificacao',
    label: 'Mix de Ativos',
    icon: Activity,
    format: 'percent' as const,
    getStatus: getDiversificacaoStatus,
    description: 'Distribuição entre diferentes classes de investimento',
    formula: 'Índice de diversificação por tipo de ativo',
    idealRange: 'Acima de 60% indica boa diversificação'
  },
  {
    id: 'estabilidade',
    label: 'Consistência',
    icon: Shield,
    format: 'percent' as const,
    getStatus: getEstabilidadeStatus,
    description: 'Regularidade do seu fluxo de caixa ao longo do tempo',
    formula: 'Variação média do saldo mensal',
    idealRange: 'Acima de 80% indica fluxo estável'
  }
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
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-display font-bold text-lg text-foreground">Indicadores de Saúde</h3>
          <span className="text-[10px] font-bold text-primary bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full uppercase tracking-wide">Desempenho</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {indicadoresConfig.map((config) => {
            const value = valores[config.id as keyof typeof valores];
            const status = config.getStatus(value);
            const StatusIcon = status.statusIcon;

            return (
              <Tooltip key={config.id}>
                <TooltipTrigger asChild>
                  <div className={cn("rounded-3xl p-5 border transition-all hover:scale-[1.02] group relative overflow-hidden cursor-help", status.bg, status.border)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-black/20 flex items-center justify-center shadow-sm">
                        <config.icon className={cn("w-5 h-5", status.color)} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={cn("w-3 h-3", status.color)} />
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5", status.badgeClass)}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <p className={cn("text-3xl font-display font-bold", status.color)}>
                      {config.format === 'decimal' ? `${value.toFixed(1)}x` : `${value.toFixed(0)}%`}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="text-[10px] font-bold uppercase tracking-tight opacity-60">{config.label}</p>
                      <Info className="w-2.5 h-2.5 opacity-40" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] p-4 rounded-2xl">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                    <div className="pt-2 border-t border-border/40 space-y-1">
                      <p className="text-[10px] text-muted-foreground"><strong>Cálculo:</strong> {config.formula}</p>
                      <p className="text-[10px] text-primary font-medium">{config.idealRange}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}