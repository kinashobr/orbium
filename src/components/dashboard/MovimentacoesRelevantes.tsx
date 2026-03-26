"use client";

import { 
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronRight,
  TrendingUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, parseDateLocal } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { TransacaoCompleta } from "@/types/finance";

interface MovimentacoesRelevantesProps {
  transacoes: TransacaoCompleta[];
  limit?: number;
}

const configMap: Record<string, { icon: any, color: string, bg: string }> = {
  receita: { icon: ArrowUpCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  despesa: { icon: ArrowDownCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  rendimento: { icon: ArrowUpCircle, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
};

export function MovimentacoesRelevantes({ transacoes, limit = 6 }: MovimentacoesRelevantesProps) {
  const navigate = useNavigate();

  const movimentacoes = useMemo(() => {
    return [...transacoes]
      .filter(t => t.operationType !== 'transferencia' && t.amount >= 10)
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())
      .slice(0, limit);
  }, [transacoes, limit]);

  const formatDate = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/60 dark:border-white/5">
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">Últimas Movimentações</h3>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">Transações importantes</p>
        </div>
        <Button
          variant="ghost" 
          size="sm" 
          className="text-[10px] font-black uppercase text-primary hover:bg-primary/5 rounded-full"
          onClick={() => navigate("/receitas-despesas")}
        >
          VER TUDO <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-1">
        {movimentacoes.map((mov) => {
          const cfg = configMap[mov.operationType] || configMap.despesa;
          const isIncome = mov.flow === 'in' || mov.flow === 'transfer_in';
          
          return (
            <div 
              key={mov.id}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate("/receitas-despesas")}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cfg.bg)}>
                  <cfg.icon className={cn("h-6 w-6", cfg.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {mov.description}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground/60">{formatDate(mov.date)} • {mov.operationType}</p>
                </div>
              </div>
              <span className={cn(
                "font-black text-sm whitespace-nowrap tabular-nums",
                isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {isIncome ? "+" : "-"} R$ {mov.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}

        {movimentacoes.length === 0 && (
          <div className="text-center py-10 opacity-40">
            <TrendingUpDown className="w-10 h-10 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase">Sem registros</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';