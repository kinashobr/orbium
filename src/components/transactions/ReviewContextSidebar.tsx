"use client";

import { useMemo } from "react";
import { Calendar, Clock, Pin, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges } from "@/types/finance";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ReviewContextSidebarProps {
  accountId: string;
  pendingCount: number;
  readyToContabilizeCount: number;
  totalCount: number;
  reviewRange: DateRange;
  onPeriodChange: (ranges: ComparisonDateRanges) => void;
  onApplyFilter: () => void;
  onContabilize: () => void;
  onClose: () => void;
  onManageRules: () => void;
}

export function ReviewContextSidebar({
  pendingCount,
  readyToContabilizeCount,
  reviewRange,
  onPeriodChange,
  onApplyFilter,
  onManageRules,
}: ReviewContextSidebarProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const dummyRanges: ComparisonDateRanges = useMemo(() => ({
    range1: reviewRange,
    range2: { from: undefined, to: undefined }
  }), [reviewRange]);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className={cn("flex flex-col flex-1 p-6 space-y-8", isMobile && "pb-32")}>
        
        {/* 1. Status da Revisão (Design Consistente Orbium) */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 opacity-60">Status da Revisão</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Card Pendentes */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-warning/[0.03] border border-warning/20 transition-all hover:bg-warning/[0.08] group cursor-default">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                </div>
                <span className="text-sm font-black text-warning tabular-nums leading-none">{pendingCount}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-warning/60 leading-none">PEND.</span>
            </div>

            {/* Card Prontos */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-success/[0.03] border border-success/20 transition-all hover:bg-success/[0.08] group cursor-default">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                </div>
                <span className="text-sm font-black text-success tabular-nums leading-none">{readyToContabilizeCount}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-success/60 leading-none">OK</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-8">
            {/* 2. Ajustar Período */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Período de Análise</p>
              </div>
              <PeriodSelector 
                initialRanges={dummyRanges}
                onDateRangeChange={onPeriodChange}
                className="w-full h-11 rounded-2xl bg-muted/30 border-border/40 hover:bg-muted/50 transition-all font-bold"
              />
            </div>

            {/* 3. Atualizar Lista */}
            <div className="px-1">
              <Button 
                onClick={onApplyFilter} 
                variant="outline" 
                className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] gap-3 border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Atualizar Filtros
              </Button>
            </div>

            {/* 4. Regras de Padronização */}
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 opacity-60">Configurações</p>
              <Button 
                variant="outline" 
                className="w-full h-16 justify-start rounded-[1.75rem] border-dashed border-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group px-4"
                onClick={onManageRules}
              >
                <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors mr-3 shrink-0">
                  <Pin className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-tight text-foreground truncate">Regras Ativas</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">Gerenciar IA</p>
                </div>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}