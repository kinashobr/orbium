import { formatCurrency } from "@/types/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Calendar, ArrowRight, CheckCircle2, PartyPopper } from "lucide-react";

interface CommitmentCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  nextInstallmentDate?: string;
  nextInstallmentValue: number;
  totalRemainingValue: number;
  paidCount: number;
  totalCount: number;
  totalPaidValue?: number;
  onClick: () => void;
  onAdvance?: () => void;
}

export function CommitmentCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  nextInstallmentDate,
  nextInstallmentValue,
  totalRemainingValue,
  paidCount,
  totalCount,
  totalPaidValue,
  onClick,
  onAdvance
}: CommitmentCardProps) {
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const isCompleted = totalCount > 0 && paidCount === totalCount;

  if (isCompleted) {
    return (
      <Card 
        className="group cursor-pointer transition-all duration-500 bg-emerald-500/5 border-emerald-500/20 rounded-2xl shadow-sm hover:shadow-soft-lg hover:-translate-y-0.5 overflow-hidden relative"
        onClick={onClick}
      >
        <CheckCircle2 className="absolute -right-2 -bottom-2 w-12 h-12 text-emerald-500 opacity-[0.06] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />

        <CardContent className="p-3 space-y-2 relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-emerald-500/15 group-hover:scale-110 transition-transform duration-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black tracking-tight truncate leading-tight">{title}</h4>
                <p className="text-[7.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em] mt-0.5 flex items-center gap-0.5">
                  <PartyPopper className="w-2.5 h-2.5" /> QUITADO
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 py-0.5">
            <div className="space-y-0.5">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-emerald-600/60 dark:text-emerald-400/60">Total pago</p>
              <p className="text-sm font-black tabular-nums tracking-tighter leading-none text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPaidValue ?? 0)}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">Parcelas</p>
              <p className="text-sm font-black tabular-nums tracking-tighter leading-none text-emerald-600 dark:text-emerald-400">
                {paidCount}/{totalCount}
              </p>
            </div>
          </div>

          <Progress value={100} className="h-1 bg-emerald-500/10 rounded-full [&>div]:bg-emerald-500" />

          <div className="pt-1.5 border-t border-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[7.5px] font-black uppercase tracking-widest text-emerald-600/60 dark:text-emerald-400/60">Concluído</span>
            </div>
            <div className="flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500">
              HISTÓRICO <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="group cursor-pointer hover:border-primary/30 transition-all duration-500 bg-card border-border/40 rounded-2xl shadow-sm hover:shadow-soft-lg hover:-translate-y-0.5 overflow-hidden relative"
      onClick={onClick}
    >
      <Icon className="absolute -right-2 -bottom-2 w-12 h-12 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />

      <CardContent className="p-3 space-y-2 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500", iconBg)}>
              <Icon className={cn("w-3 h-3", iconColor)} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black tracking-tight truncate leading-tight">{title}</h4>
              <p className="text-[7.5px] font-black text-muted-foreground/60 uppercase tracking-[0.15em] mt-0.5">
                Parcela {paidCount + 1} de {totalCount}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 py-0.5">
          <div className="space-y-0.5">
            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-primary/60">Próxima</p>
            <p className="text-sm font-black tabular-nums tracking-tighter leading-none">{formatCurrency(nextInstallmentValue)}</p>
            {nextInstallmentDate && (
              <div className="flex items-center gap-1 text-[7.5px] font-bold text-muted-foreground mt-0.5">
                <Calendar className="w-2.5 h-2.5 text-primary/40" />
                {nextInstallmentDate}
              </div>
            )}
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">Restante</p>
            <p className="text-sm font-black tabular-nums text-primary tracking-tighter leading-none">{formatCurrency(totalRemainingValue)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">Progresso</p>
              <p className="text-[10px] font-black text-primary leading-none">{Math.round(progress)}%</p>
            </div>
            {onAdvance && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-5 px-2 rounded-lg font-black text-[7px] uppercase tracking-widest gap-1 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvance();
                }}
              >
                Adiantar
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-1 bg-primary/5 rounded-full" />
        </div>

        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Ativo</span>
          </div>
          <div className="flex items-center gap-1 text-[7.5px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500">
            DETALHES <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
