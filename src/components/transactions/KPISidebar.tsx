import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, BarChart3, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TransacaoCompleta, Categoria, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";

interface KPISidebarProps {
  transactions: TransacaoCompleta[];
  categories: Categoria[];
}

export function KPISidebar({ transactions, categories }: KPISidebarProps) {
  const totalReceitas = transactions
    .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDespesas = transactions
    .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldoMensal = totalReceitas - totalDespesas;
  const margemPoupanca = totalReceitas > 0 ? (saldoMensal / totalReceitas) * 100 : 0;
  const isPositive = saldoMensal >= 0;

  const topDespesas = categories
    .map(cat => ({
      ...cat,
      total: transactions
        .filter(t => t.categoryId === cat.id && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo'))
        .reduce((acc, t) => acc + t.amount, 0)
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Saldo Principal do Período */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resumo do Período</p>
        </div>
        
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-muted-foreground">Resultado do Período</h4>
          <p className={cn(
            "text-4xl font-black tabular-nums tracking-tight",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(saldoMensal)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
              <ArrowUpRight className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Receitas</span>
            </div>
            <p className="font-bold text-sm tabular-nums">{formatCurrency(totalReceitas)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
              <ArrowDownRight className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Despesas</span>
            </div>
            <p className="font-bold text-sm tabular-nums">{formatCurrency(totalDespesas)}</p>
          </div>
        </div>
      </div>

      {/* Eficiência e Poupança */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Taxa de Economia</span>
          </div>
          <Badge className={cn(
            "text-[10px] font-black border-none px-2 py-0.5 rounded-lg",
            margemPoupanca >= 20 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
          )}>
            {margemPoupanca.toFixed(1)}%
          </Badge>
        </div>
        <Progress value={Math.min(100, Math.max(0, margemPoupanca))} className="h-2 rounded-full" />
        <p className="text-[10px] font-medium text-muted-foreground">
          {margemPoupanca >= 20 ? "Você está superando a meta de 20%!" : "Abaixo do recomendado para acumulação."}
        </p>
      </div>

      {/* Top Categorias - Estilo Dashboard */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5" /> Principais Gastos
        </h5>
        <div className="space-y-3">
          {topDespesas.map((cat, idx) => (
            <div key={cat.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="text-lg group-hover:scale-125 transition-transform">{cat.icon}</span>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{cat.label}</span>
              </div>
              <span className="font-black text-xs text-foreground tabular-nums">{formatCurrency(cat.total)}</span>
            </div>
          ))}
          {topDespesas.length === 0 && (
            <div className="text-center py-4 opacity-40">
              <p className="text-[10px] font-bold uppercase">Sem despesas no período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}