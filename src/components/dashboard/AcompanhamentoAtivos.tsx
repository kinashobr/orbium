"use client";

import { 
  Landmark, 
  Bitcoin, 
  Coins, 
  PiggyBank,
  TrendingUp,
  TrendingDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface AtivoGrupo {
  id: string;
  nome: string;
  valor: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface AcompanhamentoAtivosProps {
  investimentosRF: number;
  criptomoedas: number;
  stablecoins: number;
  reservaEmergencia: number;
  poupanca: number;
}

export function AcompanhamentoAtivos({
  investimentosRF,
  criptomoedas,
  stablecoins,
  reservaEmergencia,
  poupanca,
}: AcompanhamentoAtivosProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const grupos: AtivoGrupo[] = [
    { id: 'rf', nome: 'Renda Fixa', valor: investimentosRF + poupanca, icon: Landmark, color: 'text-primary', bgColor: 'bg-primary/10' },
    { id: 'cripto', nome: 'Criptoativos', valor: criptomoedas, icon: Bitcoin, color: 'text-warning', bgColor: 'bg-warning/10' },
    { id: 'stables', nome: 'Stablecoins', valor: stablecoins, icon: Coins, color: 'text-success', bgColor: 'bg-success/10' },
    { id: 'reserva', nome: 'Reserva', valor: reservaEmergencia, icon: PiggyBank, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  ].filter(g => g.valor > 0);

  const totalAtivos = grupos.reduce((acc, g) => acc + g.valor, 0);

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/40 dark:border-white/5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">Distribuição</h3>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">Carteira de Ativos</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="space-y-5">
        {grupos.map((grupo) => {
          const percentual = totalAtivos > 0 ? (grupo.valor / totalAtivos) * 100 : 0;
          
          return (
            <div key={grupo.id} className="group transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", grupo.bgColor, grupo.color)}>
                    <grupo.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{grupo.nome}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 mt-1">{percentual.toFixed(0)}% do portfólio</p>
                  </div>
                </div>
                <p className="text-sm font-black text-foreground">{formatCurrency(grupo.valor)}</p>
              </div>
              <Progress value={percentual} className="h-1.5 rounded-full" />
            </div>
          );
        })}
      </div>

      <div className="pt-6 mt-6 border-t border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total Líquido</span>
          <span className="text-xl font-black text-primary">
            {formatCurrency(totalAtivos)}
          </span>
        </div>
      </div>
    </div>
  );
}