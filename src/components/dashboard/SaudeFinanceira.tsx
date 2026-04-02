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
import { Badge } from "@/components/ui/badge";

interface SaudeFinanceiraProps {
  liquidez: number;
  endividamento: number;
  diversificacao: number;
  estabilidadeFluxo: number;
  dependenciaRenda: number;
  hasData?: boolean;
  rawValues?: {
    ativosTotal: number;
    passivosTotal: number;
    tiposAtivos: number;
    totalTipos: number;
  };
}

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  badgeClass: string;
  statusIcon: typeof CheckCircle;
}

// Estado neutro para quando não há dados disponíveis
const getNeutralStatus = (): StatusConfig => ({
  label: "S/D",
  color: "text-muted-foreground",
  bg: "bg-muted/30 dark:bg-muted/10",
  border: "border-muted/20 dark:border-muted/10",
  badgeClass: "bg-muted/30 text-muted-foreground dark:bg-muted/20 dark:text-muted-foreground",
  statusIcon: AlertTriangle
});

const getLiquidezStatus = (val: number, hasData: boolean): StatusConfig => {
  if (!hasData || val === 0) return getNeutralStatus();
  if (val >= 2) return { label: "ÓTIMO", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  if (val >= 1.2) return { label: "BOM", color: "text-blue-600", bg: "bg-blue-50/80 dark:bg-blue-900/10", border: "border-blue-100 dark:border-blue-900/20", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", statusIcon: CheckCircle };
  return { label: "ATENÇÃO", color: "text-orange-600", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", statusIcon: AlertTriangle };
};

const getEndividamentoStatus = (val: number, hasData: boolean): StatusConfig => {
  if (!hasData) return getNeutralStatus();
  if (val <= 25) return { label: "ÓTIMO", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  if (val <= 45) return { label: "ALERTA", color: "text-orange-600", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", statusIcon: AlertTriangle };
  return { label: "ALTO", color: "text-red-600", bg: "bg-red-50/80 dark:bg-red-900/10", border: "border-red-100 dark:border-red-900/20", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", statusIcon: XCircle };
};

const getDiversificacaoStatus = (val: number, hasData: boolean): StatusConfig => {
  if (!hasData || val === 0) return getNeutralStatus();
  if (val >= 60) return { label: "ALTA", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  return { label: "BAIXA", color: "text-orange-600", bg: "bg-orange-50/80 dark:bg-orange-900/10", border: "border-orange-100 dark:border-orange-900/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", statusIcon: AlertTriangle };
};

const getEstabilidadeStatus = (val: number, hasData: boolean): StatusConfig => {
  if (!hasData || val === 0) return getNeutralStatus();
  if (val >= 80) return { label: "ALTA", color: "text-green-600", bg: "bg-green-50/80 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/20", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", statusIcon: CheckCircle };
  return { label: "MÉDIA", color: "text-primary", bg: "bg-primary/5 dark:bg-primary/10", border: "border-primary/20 dark:border-primary/30", badgeClass: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary", statusIcon: AlertTriangle };
};

const indicadoresConfig = [
  { id: 'liquidez', label: 'Indicador de Liquidez', shortLabel: 'Liquidez', icon: Wallet, format: 'decimal' as const, getStatus: getLiquidezStatus, description: 'Ativos ÷ Passivos. Acima de 1x = você consegue pagar suas dívidas.', formula: 'Ativos Totais ÷ Passivos Totais' },
  { id: 'endividamento', label: 'Indicador de Endividamento', shortLabel: 'Endividamento', icon: Scale, format: 'percent' as const, getStatus: getEndividamentoStatus, description: 'Dívidas ÷ Ativos. Ideal abaixo de 30%.', formula: 'Passivos ÷ Ativos × 100' },
  { id: 'diversificacao', label: 'Distribuição de Ativos', shortLabel: 'Distribuição', icon: Activity, format: 'percent' as const, getStatus: getDiversificacaoStatus, description: 'Variedade de contas. Mais tipos = menos risco.', formula: 'Tipos de Conta ÷ Total Tipos × 100' },
  { id: 'estabilidade', label: 'Consistência Patrimonial', shortLabel: 'Consistência', icon: Shield, format: 'percent' as const, getStatus: getEstabilidadeStatus, description: 'Regularidade do seu fluxo. Menos variação = mais controle.', formula: 'Índice de variância do fluxo' }
];

export function SaudeFinanceira({
  liquidez,
  endividamento,
  diversificacao,
  estabilidadeFluxo,
  hasData = true,
  rawValues,
}: SaudeFinanceiraProps) {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  
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
        <div className="flex items-center gap-2">
           <Activity className="w-4 h-4 text-primary" />
           <h3 className="font-display font-black text-lg text-foreground uppercase tracking-tight">Indicadores de Saúde</h3>
        </div>
        <Badge variant="outline" className="text-[9px] font-black text-primary bg-primary/5 border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest">Diagnóstico</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {indicadoresConfig.map((config, index) => {
          const value = valores[config.id as keyof typeof valores];
          const status = config.getStatus(value, hasData);
          const displayValue = !hasData
            ? "—" 
            : (config.format === 'decimal' ? `${value.toFixed(1)}x` : `${value.toFixed(0)}%`);

          const getFormulaValues = () => {
            if (!hasData || !rawValues) return undefined;
            const rv = rawValues;
            switch (config.id) {
              case 'liquidez': return `${fmt(rv.ativosTotal)} ÷ ${fmt(rv.passivosTotal)}`;
              case 'endividamento': return `${fmt(rv.passivosTotal)} ÷ ${fmt(rv.ativosTotal)} × 100`;
              case 'diversificacao': return `${rv.tiposAtivos} ÷ ${rv.totalTipos} × 100`;
              default: return undefined;
            }
          };
          const formulaVals = getFormulaValues();

          return (
            <div 
              key={config.id} 
              className={cn(
                "rounded-[2.5rem] p-5 sm:p-6 border-2 transition-all duration-500 hover:shadow-soft-lg hover:-translate-y-1 group relative overflow-hidden cursor-help animate-fade-in-up", 
                status.bg, 
                status.border
              )}
              style={{ animationDelay: `${(index + 3) * 100}ms` }}
            >
              {/* Ícone Decorativo de Fundo */}
              <config.icon className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.05] transition-transform duration-700 group-hover:scale-125 group-hover:rotate-6", status.color)} />

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <config.icon className={cn("w-5 h-5", status.color)} />
                </div>
                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg border border-black/5 dark:border-white/5 uppercase tracking-widest", status.badgeClass)}>
                  {status.label}
                </span>
              </div>
              <div className="relative z-10">
                <p className={cn("text-3xl sm:text-4xl font-display font-black tabular-nums leading-none tracking-tighter", status.color)}>
                  {displayValue}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{config.shortLabel}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-[9px] text-muted-foreground/70 mt-1 flex items-center gap-1 cursor-help">
                      <Info className="w-3 h-3" />
                      {config.description}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px] p-3 rounded-xl">
                    <p className="text-xs font-medium">{config.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{config.description}</p>
                    {config.formula && (
                      <div className="mt-2 pt-2 border-t border-border/40">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Fórmula</p>
                        <p className="text-[11px] text-primary font-mono">{config.formula}</p>
                        {formulaVals && (
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5 opacity-80">{formulaVals}</p>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </TooltipProvider>
  );
}