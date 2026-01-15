"use client";

import { useMemo } from "react";
import { Calendar, FileText, Check, Clock, Pin, RefreshCw, X, Sparkles, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges, ImportedStatement } from "@/types/finance";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface ReviewContextSidebarProps {
  accountId: string;
  statements: ImportedStatement[];
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
  accountId,
  statements,
  pendingCount,
  readyToContabilizeCount,
  totalCount,
  reviewRange,
  onPeriodChange,
  onApplyFilter,
  onContabilize,
  onClose,
  onManageRules,
}: ReviewContextSidebarProps) {
  
  const isReadyToContabilize = readyToContabilizeCount > 0;
  const progress = totalCount > 0 ? ((totalCount - pendingCount) / totalCount) * 100 : 0;
  
  const dummyRanges: ComparisonDateRanges = useMemo(() => ({
    range1: reviewRange,
    range2: { from: undefined, to: undefined }
  }), [reviewRange]);

  return (
    <div className="flex flex-col h-full p-6 space-y-8 bg-card dark:bg-[hsl(24_8%_12%)]">
      {/* Status de Progresso Expressivo */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progresso</p>
            <h4 className="text-3xl font-black tracking-tighter text-foreground">
              {progress.toFixed(0)}%
            </h4>
          </div>
          <Badge variant="outline" className={cn(
            "rounded-lg border-none font-black text-[10px] px-2 py-1",
            pendingCount === 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            {pendingCount === 0 ? "CONCLUÍDO" : `${pendingCount} PENDENTES`}
          </Badge>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full bg-muted/50 dark:bg-white/10" />
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-8 pb-6">
          {/* Filtros de Período */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4 text-primary" />
              <Label className="text-[11px] font-bold uppercase tracking-widest text-foreground">Período de Análise</Label>
            </div>
            <div className="p-4 rounded-[1.5rem] bg-muted/30 dark:bg-black/20 border border-border/40 dark:border-white/5 shadow-sm space-y-3">
              <PeriodSelector 
                initialRanges={dummyRanges}
                onDateRangeChange={onPeriodChange}
                className="w-full h-10 rounded-xl border-none bg-card dark:bg-white/5"
              />
              <Button 
                onClick={onApplyFilter} 
                variant="outline" 
                className="w-full h-10 rounded-xl font-bold text-xs gap-2 border-primary/30 text-primary hover:bg-primary/10 dark:border-primary/20 dark:bg-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Lista
              </Button>
            </div>
          </div>

          {/* Automação */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <Label className="text-[11px] font-bold uppercase tracking-widest text-foreground">Inteligência</Label>
            </div>
            <Button 
              variant="outline" 
              className="w-full h-14 justify-start rounded-[1.5rem] border-dashed border-2 border-border/60 dark:border-white/10 hover:border-primary/40 hover:bg-primary/5 dark:bg-white/5 transition-all group"
              onClick={onManageRules}
            >
              <div className="p-2 rounded-xl bg-muted dark:bg-white/10 group-hover:bg-primary/10 transition-colors mr-3">
                <Pin className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">Regras de Padrão</p>
                <p className="text-[10px] text-muted-foreground">Gerenciar automações</p>
              </div>
            </Button>
          </div>

          {/* Resumo de Cargas */}
          <div className="p-5 rounded-[1.75rem] bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/5 border border-primary/20 dark:border-primary/10 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-widest">Resumo da Conta</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-primary/60 uppercase">Arquivos</p>
                <p className="text-lg font-black text-primary">{statements.length}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-primary/60 uppercase">Total Itens</p>
                <p className="text-lg font-black text-primary">{totalCount}</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Ação Principal - FAB Style */}
      <div className="pt-4 space-y-3">
        <Button 
          onClick={onContabilize} 
          disabled={!isReadyToContabilize}
          className="w-full h-14 rounded-[1.5rem] font-black text-sm shadow-xl shadow-primary/20 gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Check className="w-5 h-5" />
          CONTABILIZAR ({readyToContabilizeCount})
        </Button>
        <Button 
          variant="ghost" 
          onClick={onClose} 
          className="w-full h-10 rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground"
        >
          Sair da Revisão
        </Button>
      </div>
    </div>
  );
}