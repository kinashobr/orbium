"use client";

import { CltCompetencia } from "@/types/finance";
import { formatCurrency } from "@/types/finance";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowRight, Calendar } from "lucide-react";

interface Props {
  competencia: CltCompetencia;
  onClick: () => void;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TIPO_LABELS: Record<string, string> = {
  normal: '',
  '13_primeira': '13º 1ª Parcela',
  '13_segunda': '13º 2ª Parcela',
};

export function CltCompetenciaCard({ competencia, onClick }: Props) {
  const [, mes] = competencia.mesAno.split('-').map(Number);
  const mesLabel = MESES[mes - 1];
  const is13 = competencia.tipo !== 'normal';
  const isPaid = competencia.status === 'recebido';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group cursor-pointer hover:border-primary/30 transition-all duration-500 bg-card border-border/40 rounded-[2rem] shadow-sm hover:shadow-soft-lg hover:-translate-y-1 overflow-hidden relative border",
        isPaid && "bg-emerald-500/5 border-emerald-500/20"
      )}
    >
      <div className="p-5 space-y-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-11 h-11 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500",
              isPaid ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
            )}>
              {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-black tracking-tight truncate leading-tight">
                {is13 ? TIPO_LABELS[competencia.tipo] : `Competência ${mesLabel}`}
              </h4>
              <p className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.1em] mt-0.5">
                {competencia.mesAno}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-1">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/60">Líquido</p>
            <p className={cn("text-xl font-black tabular-nums tracking-tighter leading-none", isPaid && "text-emerald-600")}>
              {formatCurrency(competencia.salarioLiquido)}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">Status</p>
            <Badge variant="outline" className={cn(
              "text-[10px] font-black border-none px-2 h-5 rounded-lg",
              isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            )}>
              {isPaid ? "RECEBIDO" : "PENDENTE"}
            </Badge>
          </div>
        </div>

        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isPaid ? "bg-emerald-500" : "bg-amber-400 animate-pulse")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isPaid ? "Concluído" : "Aguardando"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
            DETALHES <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}