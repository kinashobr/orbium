import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Landmark, 
  Info, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Receipt
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { TransacaoCompleta, Categoria, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { cn } from "@/lib/utils";

interface KPISidebarProps {
  transactions: TransacaoCompleta[];
  categories: Categoria[];
}

export function KPISidebar({ transactions, categories }: KPISidebarProps) {
  const { contasMovimento } = useFinance();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const creditCardAccountIds = useMemo(() => 
    new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id)),
    [contasMovimento]
  );

  // 1. Receitas do Período (Regime de Competência / Caixa realizado)
  const totalReceitas = useMemo(() => {
    return transactions
      .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
      .reduce((acc, t) => {
        const val = Math.abs(t.amount);
        return acc + (t.flow === 'out' ? -val : val);
      }, 0);
  }, [transactions]);

  // 2. Detalhamento e Cálculo das Despesas por Competência
  const expenseBreakdown = useMemo(() => {
    let debitAndChecking = 0;
    let debitCount = 0;
    let creditCard = 0;
    let creditCount = 0;
    let loanPayments = 0;
    let loanCount = 0;
    let refunds = 0;
    let refundCount = 0;

    transactions.forEach(t => {
      const isExpense = t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo';
      if (!isExpense) return;

      const isRefund = t.flow === 'in';
      const amount = Math.abs(t.amount);

      if (isRefund) {
        refunds += amount;
        refundCount++;
        return;
      }

      if (t.operationType === 'pagamento_emprestimo') {
        loanPayments += amount;
        loanCount++;
      } else if (creditCardAccountIds.has(t.accountId)) {
        creditCard += amount;
        creditCount++;
      } else {
        debitAndChecking += amount;
        debitCount++;
      }
    });

    const netTotal = Math.max(0, (debitAndChecking + creditCard + loanPayments) - refunds);

    return {
      debitAndChecking,
      debitCount,
      creditCard,
      creditCount,
      loanPayments,
      loanCount,
      refunds,
      refundCount,
      netTotal,
      totalCount: debitCount + creditCount + loanCount + refundCount,
    };
  }, [transactions, creditCardAccountIds]);

  const totalDespesas = expenseBreakdown.netTotal;
  const saldoMensal = totalReceitas - totalDespesas;
  const margemPoupanca = totalReceitas > 0 ? (saldoMensal / totalReceitas) * 100 : 0;
  const isPositive = saldoMensal >= 0;

  // 3. Principais Gastos (Top Categorias com suporte a empréstimos e não categorizados)
  const topDespesas = useMemo(() => {
    const catTotals: Record<string, { id: string; label: string; icon: string; total: number }> = {};
    
    // Inicializa com as categorias existentes
    categories.forEach(c => {
      catTotals[c.id] = { id: c.id, label: c.label, icon: c.icon || "🏷️", total: 0 };
    });

    const LOAN_CAT_ID = '__loan_payments__';
    const UNCAT_CAT_ID = '__uncategorized__';

    transactions.forEach(t => {
      const isExpense = t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo';
      if (!isExpense) return;

      const netAmount = t.flow === 'in' ? -t.amount : t.amount;

      if (t.operationType === 'pagamento_emprestimo' && !t.categoryId) {
        if (!catTotals[LOAN_CAT_ID]) {
          catTotals[LOAN_CAT_ID] = { id: LOAN_CAT_ID, label: 'Empréstimos / Parcelas', icon: '🏦', total: 0 };
        }
        catTotals[LOAN_CAT_ID].total += netAmount;
      } else if (!t.categoryId) {
        if (!catTotals[UNCAT_CAT_ID]) {
          catTotals[UNCAT_CAT_ID] = { id: UNCAT_CAT_ID, label: 'Não Categorizado', icon: '📦', total: 0 };
        }
        catTotals[UNCAT_CAT_ID].total += netAmount;
      } else if (catTotals[t.categoryId]) {
        catTotals[t.categoryId].total += netAmount;
      } else {
        const catObj = categories.find(c => c.id === t.categoryId);
        catTotals[t.categoryId] = {
          id: t.categoryId,
          label: catObj?.label || 'Outros',
          icon: catObj?.icon || '🏷️',
          total: netAmount
        };
      }
    });

    return Object.values(catTotals)
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, categories]);

  return (
    <div className="space-y-6">
      {/* Saldo Principal do Período */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resumo do Período</p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors bg-muted/40 hover:bg-muted/70 px-2 py-0.5 rounded-full"
                title="Ver o que engloba o cálculo de despesas"
              >
                <span>Competência</span>
                <Info className="w-3 h-3 text-primary" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 text-xs space-y-3 shadow-xl" side="bottom" align="end">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Receipt className="w-4 h-4 text-primary" />
                <h5 className="font-bold text-sm text-foreground">O que engloba Despesas?</h5>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Nesta tela, o cálculo segue o <strong>Regime de Competência</strong> com base na data do fato gerador no mês selecionado:
              </p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <span><strong>Cartão de Crédito:</strong> Todas as compras realizadas no mês na data exata da compra.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span><strong>Contas Bancárias:</strong> Boletos, PIX e débitos pagos com data no mês.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Financiamentos:</strong> Parcelas de empréstimos quitadas no período.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Estornos e Reembolsos:</strong> Abatem automaticamente do total de despesas.</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground/80 bg-muted/30 p-2 rounded-lg">
                💡 <em>Nota: Transferências entre contas e pagamentos de fatura do cartão não são duplicados como despesa.</em>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resultado do Período</h4>
          <p className={cn(
            "text-3xl sm:text-4xl font-black tabular-nums tracking-tight",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(saldoMensal)}
          </p>
        </div>

        {/* Cards de Receitas e Despesas */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 mb-1">
              <ArrowUpRight className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Receitas</span>
            </div>
            <p className="font-black text-sm tabular-nums text-foreground">{formatCurrency(totalReceitas)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 mb-1">
              <ArrowDownRight className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Despesas</span>
            </div>
            <p className="font-black text-sm tabular-nums text-foreground">{formatCurrency(totalDespesas)}</p>
          </div>
        </div>

        {/* Detalhamento da Composição de Despesas */}
        <div className="mt-3 p-3 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" /> Origem das Despesas
            </span>
            <button
              type="button"
              onClick={() => setShowBreakdown(prev => !prev)}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
            >
              {showBreakdown ? (
                <>Recolher <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Detalhar ({expenseBreakdown.totalCount}) <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Landmark className="w-3 h-3 text-red-500/80 shrink-0" /> Contas & Débito:
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {formatCurrency(expenseBreakdown.debitAndChecking)}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5 text-[11px]">
                <CreditCard className="w-3 h-3 text-warning/90 shrink-0" /> Cartão de Crédito:
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {formatCurrency(expenseBreakdown.creditCard)}
              </span>
            </div>

            {expenseBreakdown.loanPayments > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Wallet className="w-3 h-3 text-indigo-500/80 shrink-0" /> Financiamentos:
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  {formatCurrency(expenseBreakdown.loanPayments)}
                </span>
              </div>
            )}

            {expenseBreakdown.refunds > 0 && (
              <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ArrowUpRight className="w-3 h-3 shrink-0" /> Estornos / Reembolsos:
                </span>
                <span className="font-bold tabular-nums">
                  -{formatCurrency(expenseBreakdown.refunds)}
                </span>
              </div>
            )}
          </div>

          {showBreakdown && (
            <div className="pt-2 mt-2 border-t border-border/30 text-[10px] text-muted-foreground space-y-1">
              <p>• {expenseBreakdown.debitCount} saída(s) de conta bancária</p>
              <p>• {expenseBreakdown.creditCount} compra(s) no cartão na data da compra</p>
              {expenseBreakdown.loanCount > 0 && (
                <p>• {expenseBreakdown.loanCount} parcela(s) de financiamento</p>
              )}
              {expenseBreakdown.refundCount > 0 && (
                <p>• {expenseBreakdown.refundCount} estorno(s) deduzido(s)</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Eficiência e Poupança */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Taxa de Poupança</span>
          </div>
          <Badge className={cn(
            "text-[10px] font-black border-none px-2 py-0.5 rounded-lg",
            margemPoupanca >= 20 ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400" : "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400"
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
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5" /> Principais Gastos
        </h5>
        <div className="space-y-2.5">
          {topDespesas.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-base group-hover:scale-110 transition-transform shrink-0">{cat.icon}</span>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">{cat.label}</span>
              </div>
              <span className="font-black text-xs text-foreground tabular-nums shrink-0">{formatCurrency(cat.total)}</span>
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