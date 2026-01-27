"use client";

import { useMemo } from "react";
import { Calendar, Check, Clock, Pin, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  onContabilize,
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
        
        {/* 1. Pendentes / Prontos (Compactado) */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Status da Revisão</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center p-3 rounded-[1.25rem] bg-warning/5 border border-warning/10">
              <Clock className="w-4 h-4 text-warning mb-1" />
              <p className="text-lg font-black text-warning tabular-nums leading-none">{pendingCount}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-warning/60 mt-0.5">Pendentes</p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-[1.25rem] bg-success/5 border border-success/10">
              <CheckCircle2 className="w-4 h-4 text-success mb-1" />
              <p className="text-lg font-black text-success tabular-nums leading-none">{readyToContabilizeCount}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-success/60 mt-0.5">Prontos</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-8">
            {/* 2. Ajustar Período */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Ajustar Período</p>
              </div>
              <PeriodSelector 
                initialRanges={dummyRanges}
                onDateRangeChange={onPeriodChange}
                className="w-full h-10 rounded-xl bg-muted/40 border-none font-bold"
              />
            </div>

            {/* 3. Atualizar Lista */}
            <div className="px-1">
              <Button 
                onClick={onApplyFilter} 
                variant="outline" 
                className="w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Atualizar Lista
              </Button>
            </div>

            {/* 4. Regras de Padronização */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Automação</p>
              <Button 
                variant="outline" 
                className="w-full h-14 justify-start rounded-[1.5rem] border-dashed border-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                onClick={onManageRules}
              >
                <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors mr-3">
                  <Pin className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-tighter">Regras de Padronização</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Gerenciar Automações</p>
                </div>
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Botão Contabilizar removido daqui, será mantido apenas no DialogFooter */}
      </div>
    </div>
  );
}