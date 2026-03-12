import { formatCurrency } from "@/types/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Calendar, ArrowRight } from "lucide-react";

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
  onClick,
  onAdvance
}: CommitmentCardProps) {
  const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  return (
    <Card 
      className="group cursor-pointer hover:border-primary/30 transition-all duration-500 bg-card border-border/40 rounded-[2rem] shadow-sm hover:shadow-soft-lg hover:-translate-y-1 overflow-hidden relative"
      onClick={onClick}
    >
      <Icon className="absolute -right-4 -bottom-4 w-24 h-24 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />

      <CardContent className="p-5 space-y-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("w-10 h-10 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500", iconBg)}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-black tracking-tight truncate leading-tight">{title}</h4>
              <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.15em] mt-0.5">
                Parcela {paidCount + 1} de {totalCount}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-1">
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary/60">Próxima</p>
            <p className="text-xl font-black tabular-nums tracking-tighter leading-none">{formatCurrency(nextInstallmentValue)}</p>
            {nextInstallmentDate && (
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground mt-1">
                <Calendar className="w-3 h-3 text-primary/40" />
                {nextInstallmentDate}
              </div>
            )}
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">Restante</p>
            <p className="text-xl font-black tabular-nums text-primary tracking-tighter leading-none">{formatCurrency(totalRemainingValue)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">Progresso</p>
              <p className="text-xs font-black text-primary">{Math.round(progress)}%</p>
            </div>
            {onAdvance && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-3 rounded-xl font-black text-[8px] uppercase tracking-widest gap-1.5 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvance();
                }}
              >
                Adiantar
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-2 bg-primary/5 rounded-full" />
        </div>

        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ativo</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
            DETALHES <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}