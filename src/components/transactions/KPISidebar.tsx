import { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Landmark, 
  Info, 
  Layers, 
  ChevronDown, 
  ChevronUp,
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { TransacaoCompleta, Categoria, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";

interface KPISidebarProps {
  transactions: TransacaoCompleta[];
  categories: Categoria[];
}

export function KPISidebar({ transactions, categories }: KPISidebarProps) {
  const { contasMovimento } = useFinance();
  const [showBreakdown, setShowBreakdown] = useState(true);

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
  const isPositive = saldoMensal >= 0;

  // 3. Últimos Gastos (Transações recentes de despesa / empréstimo no período)
  const ultimosGastos = useMemo(() => {
    return transactions
      .filter(t => (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && t.flow === 'out')
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB !== timeA) return timeB - timeA;
        const createdA = a.meta?.createdAt ? new Date(a.meta.createdAt).getTime() : 0;
        const createdB = b.meta?.createdAt ? new Date(b.meta.createdAt).getTime() : 0;
        return createdB - createdA;
      })
      .slice(0, 5)
      .map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const parsedDate = parseDateLocal(t.date);
        const formattedDate = !isNaN(parsedDate.getTime()) ? format(parsedDate, 'dd/MM') : '';
        const fallbackLabel = t.operationType === 'pagamento_emprestimo' ? 'Financiamento' : 'Despesa';

        return {
          id: t.id,
          description: t.description || cat?.label || fallbackLabel,
          categoryLabel: cat?.label,
          icon: cat?.icon || (t.operationType === 'pagamento_emprestimo' ? '🏦' : '🏷️'),
          date: formattedDate,
          amount: Math.abs(t.amount),
        };
      });
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
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                title="Regime de Competência e Origem das Despesas"
                aria-label="Regime de Competência e Origem das Despesas"
              >
                <Info className="w-4 h-4 text-primary" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 text-xs space-y-3.5 shadow-xl bg-popover border border-border/60" side="bottom" align="end">
              <p className="text-muted-foreground leading-relaxed text-xs">
                O cálculo segue o <strong>Regime de Competência</strong> com base na data do fato gerador no mês selecionado.
              </p>

              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Origem das Despesas
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
                      <Landmark className="w-3.5 h-3.5 text-red-500/80 shrink-0" /> Contas & Débito:
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatCurrency(expenseBreakdown.debitAndChecking)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <CreditCard className="w-3.5 h-3.5 text-warning/90 shrink-0" /> Cartão de Crédito:
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatCurrency(expenseBreakdown.creditCard)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Wallet className="w-3.5 h-3.5 text-indigo-500/80 shrink-0" /> Financiamentos:
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatCurrency(expenseBreakdown.loanPayments)}
                    </span>
                  </div>

                  {expenseBreakdown.refunds > 0 && (
                    <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> Estornos / Reembolsos:
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
      </div>

      {/* Últimos Gastos */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5" /> Últimos Gastos
        </h5>
        <div className="space-y-2.5">
          {ultimosGastos.map((item) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-base group-hover:scale-110 transition-transform shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate block">
                    {item.description}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {item.date}{item.categoryLabel ? ` • ${item.categoryLabel}` : ''}
                  </span>
                </div>
              </div>
              <span className="font-black text-xs text-foreground tabular-nums shrink-0">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          {ultimosGastos.length === 0 && (
            <div className="text-center py-4 opacity-40">
              <p className="text-[10px] font-bold uppercase">Sem gastos no período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}