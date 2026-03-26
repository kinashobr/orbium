import { 
  TrendingUp, TrendingDown, Calendar, AlertTriangle, 
  Award, Zap, ArrowUp, ArrowDown, Sparkles, DollarSign,
  Calculator, Repeat, Target, Percent, TrendingUpDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TransacaoCompleta } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { useMemo } from "react";

interface SmartSummaryPanelProps {
  transacoes: TransacaoCompleta[];
}

export const SmartSummaryPanel = ({ transacoes }: SmartSummaryPanelProps) => {
  const { categoriasV2 } = useFinance();
  const categoriesMap = useMemo(() => new Map(categoriasV2.map(c => [c.id, c])), [categoriasV2]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Transações do mês atual
  const transacoesMes = transacoes.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  // Transações do mês anterior
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const transacoesMesAnterior = transacoes.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
  });

  // Maior despesa do mês
  const maiorDespesa = transacoesMes
    .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
    .sort((a, b) => b.amount - a.amount)[0];

  // Categoria que mais cresceu
  const gastosPorCategoriaMes = transacoesMes
    .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
    .reduce((acc, t) => {
      if (t.categoryId) {
        const label = categoriesMap.get(t.categoryId)?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

  const gastosPorCategoriaMesAnterior = transacoesMesAnterior
    .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
    .reduce((acc, t) => {
      if (t.categoryId) {
        const label = categoriesMap.get(t.categoryId)?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

  const variacoesCategorias = Object.keys(gastosPorCategoriaMes).map(cat => ({
    categoria: cat,
    atual: gastosPorCategoriaMes[cat] || 0,
    anterior: gastosPorCategoriaMesAnterior[cat] || 0,
    variacao: gastosPorCategoriaMesAnterior[cat] 
      ? ((gastosPorCategoriaMes[cat] - gastosPorCategoriaMesAnterior[cat]) / gastosPorCategoriaMesAnterior[cat]) * 100
      : 100,
  }));

  const categoriaMaisCresceu = variacoesCategorias
    .filter(v => v.anterior > 0)
    .sort((a, b) => b.variacao - a.variacao)[0];

  const categoriaMaisReducao = variacoesCategorias
    .filter(v => v.anterior > 0)
    .sort((a, b) => a.variacao - b.variacao)[0];

  // Principal origem de receita
  const receitasPorCategoria = transacoesMes
    .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
    .reduce((acc, t) => {
      if (t.categoryId) {
        const label = categoriesMap.get(t.categoryId)?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);
  
  const principalReceita = Object.entries(receitasPorCategoria)
    .sort(([,a], [,b]) => b - a)[0];

  // Transações incomuns
  const despesas = transacoesMes.filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo");
  const mediaDespesas = despesas.length > 0 
    ? despesas.reduce((acc, t) => acc + t.amount, 0) / despesas.length 
    : 0;
  const desvioPadrao = Math.sqrt(
    despesas.reduce((acc, t) => acc + Math.pow(t.amount - mediaDespesas, 2), 0) / (despesas.length || 1)
  );
  const transacoesIncomuns = despesas.filter(t => t.amount > mediaDespesas + desvioPadrao).length;

  // Cálculos avançados
  const receitasMes = transacoesMes.filter(t => t.operationType === "receita" || t.operationType === "rendimento").reduce((acc, t) => acc + t.amount, 0);
  const despesasMes = transacoesMes.filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo").reduce((acc, t) => acc + t.amount, 0);
  const saldoMes = receitasMes - despesasMes;
  
  const receitasMesAnterior = transacoesMesAnterior.filter(t => t.operationType === "receita" || t.operationType === "rendimento").reduce((acc, t) => acc + t.amount, 0);
  const despesasMesAnterior = transacoesMesAnterior.filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo").reduce((acc, t) => acc + t.amount, 0);
  const saldoMesAnterior = receitasMesAnterior - despesasMesAnterior;

  // Variações percentuais
  const variacaoReceitas = receitasMesAnterior > 0 ? ((receitasMes - receitasMesAnterior) / receitasMesAnterior) * 100 : 0;
  const variacaoDespesas = despesasMesAnterior > 0 ? ((despesasMes - despesasMesAnterior) / despesasMesAnterior) * 100 : 0;
  const variacaoSaldo = saldoMesAnterior !== 0 ? ((saldoMes - saldoMesAnterior) / saldoMesAnterior) * 100 : 0;

  // Indicadores de eficiência
  const margemPoupanca = receitasMes > 0 ? (saldoMes / receitasMes) * 100 : 0;
  const indiceEndividamento = receitasMes > 0 ? (despesasMes / receitasMes) * 100 : 0;
  
  // Despesas fixas vs variáveis (usando nature da categoria)
  const despesasFixas = transacoesMes
    .filter(t => {
      const cat = t.categoryId ? categoriesMap.get(t.categoryId) : null;
      return cat?.nature === 'despesa_fixa';
    })
    .reduce((acc, t) => acc + t.amount, 0);
  const despesasVariaveis = despesasMes - despesasFixas;

  // Projeção de saldo
  const diasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();
  const diaAtual = currentDate.getDate();
  const mediaDiaria = diaAtual > 0 ? saldoMes / diaAtual : 0;
  const diasRestantes = diasNoMes - diaAtual;
  const projecaoSaldo = saldoMes + (mediaDiaria * diasRestantes);

  // Classificação de desempenho
  const performance = (() => {
    if (variacaoReceitas >= 5 && variacaoDespesas <= 0) return { nivel: "Excelente", cor: "success" };
    if (variacaoReceitas >= 0 && variacaoDespesas <= 5) return { nivel: "Bom", cor: "success" };
    if (variacaoReceitas < 0 && variacaoDespesas > 0) return { nivel: "Preocupante", cor: "warning" };
    return { nivel: "Regular", cor: "warning" };
  })();

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Insights automáticos
  const insights: string[] = [];
  
  if (categoriaMaisCresceu && categoriaMaisCresceu.variacao > 20) {
    insights.push(`Cuidado: ${categoriaMaisCresceu.categoria} aumentou ${categoriaMaisCresceu.variacao.toFixed(0)}% este mês`);
  }
  if (categoriaMaisReducao && categoriaMaisReducao.variacao < -10) {
    insights.push(`Ótimo: Economizou ${Math.abs(categoriaMaisReducao.variacao).toFixed(0)}% em ${categoriaMaisReducao.categoria}`);
  }
  if (transacoesIncomuns > 0) {
    insights.push(`${transacoesIncomuns} transação(ões) acima da média detectada(s)`);
  }
  if (variacaoReceitas > 10) {
    insights.push(`Receitas em alta: +${variacaoReceitas.toFixed(1)}% vs mês anterior`);
  }
  if (variacaoDespesas > 10) {
    insights.push(`Atenção: Despesas aumentaram ${variacaoDespesas.toFixed(1)}%`);
  }
  if (margemPoupanca >= 20) {
    insights.push(`Poupança saudável: ${margemPoupanca.toFixed(1)}%`);
  } else if (margemPoupanca < 10) {
    insights.push(`Margem baixa: ${margemPoupanca.toFixed(1)}% - atenção às despesas`);
  }
  if (indiceEndividamento > 50) {
    insights.push(`Endividamento alto: ${indiceEndividamento.toFixed(1)}%`);
  }

  const summaryItems = [
    {
      icon: DollarSign,
      title: "Saldo Mensal",
      value: formatCurrency(saldoMes),
      extra: saldoMes >= 0 ? "Positivo" : "Negativo",
      color: saldoMes >= 0 ? "text-success" : "text-destructive",
      bgColor: saldoMes >= 0 ? "bg-success/10" : "bg-destructive/10",
      trend: variacaoSaldo,
    },
    {
      icon: TrendingUp,
      title: "Receitas",
      value: formatCurrency(receitasMes),
      extra: `${variacaoReceitas >= 0 ? "▲" : "▼"} ${Math.abs(variacaoReceitas).toFixed(1)}%`,
      color: variacaoReceitas >= 0 ? "text-success" : "text-destructive",
      bgColor: variacaoReceitas >= 0 ? "bg-success/10" : "bg-destructive/10",
      trend: variacaoReceitas,
    },
    {
      icon: TrendingDown,
      title: "Despesas",
      value: formatCurrency(despesasMes),
      extra: `${variacaoDespesas >= 0 ? "▲" : "▼"} ${Math.abs(variacaoDespesas).toFixed(1)}%`,
      color: variacaoDespesas >= 0 ? "text-destructive" : "text-success",
      bgColor: variacaoDespesas >= 0 ? "bg-destructive/10" : "bg-success/10",
      trend: -variacaoDespesas,
    },
    {
      icon: Target,
      title: "Margem Poupança",
      value: `${margemPoupanca.toFixed(1)}%`,
      extra: margemPoupanca >= 20 ? "Saudável" : margemPoupanca >= 10 ? "Cuidado" : "Alerta",
      color: margemPoupanca >= 20 ? "text-success" : margemPoupanca >= 10 ? "text-warning" : "text-destructive",
      bgColor: margemPoupanca >= 20 ? "bg-success/10" : margemPoupanca >= 10 ? "bg-warning/10" : "bg-destructive/10",
      trend: margemPoupanca,
    },
    {
      icon: Percent,
      title: "Endividamento",
      value: `${indiceEndividamento.toFixed(1)}%`,
      extra: indiceEndividamento <= 30 ? "Bom" : indiceEndividamento <= 50 ? "Cuidado" : "Alerta",
      color: indiceEndividamento <= 30 ? "text-success" : indiceEndividamento <= 50 ? "text-warning" : "text-destructive",
      bgColor: indiceEndividamento <= 30 ? "bg-success/10" : indiceEndividamento <= 50 ? "bg-warning/10" : "bg-destructive/10",
      trend: -indiceEndividamento,
    },
    {
      icon: Calculator,
      title: "Projeção Saldo",
      value: formatCurrency(projecaoSaldo),
      extra: projecaoSaldo >= 0 ? "Positiva" : "Negativa",
      color: projecaoSaldo >= 0 ? "text-success" : "text-destructive",
      bgColor: projecaoSaldo >= 0 ? "bg-success/10" : "bg-destructive/10",
      trend: projecaoSaldo >= 0 ? 10 : -10,
    },
    {
      icon: Repeat,
      title: "Despesas Fixas",
      value: formatCurrency(despesasFixas),
      extra: despesasFixas > 0 && despesasMes > 0 ? `${((despesasFixas / despesasMes) * 100).toFixed(1)}%` : "0%",
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: undefined,
    },
    {
      icon: Zap,
      title: "Despesas Variáveis",
      value: formatCurrency(despesasVariaveis),
      extra: despesasVariaveis > 0 && despesasMes > 0 ? `${((despesasVariaveis / despesasMes) * 100).toFixed(1)}%` : "0%",
      color: "text-warning",
      bgColor: "bg-warning/10",
      trend: undefined,
    },
  ];

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Resumo Inteligente do Mês
          </CardTitle>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs py-1 px-2",
              performance.cor === "success" && "bg-success/10 text-success border-success/20",
              performance.cor === "warning" && "bg-warning/10 text-warning border-warning/20",
              performance.cor === "destructive" && "bg-destructive/10 text-destructive border-destructive/20"
            )}
          >
            {performance.nivel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {summaryItems.map((item, index) => (
            <div 
              key={item.title}
              className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
            >
              <div className={cn("p-1.5 rounded-md w-fit mb-2", item.bgColor)}>
                <item.icon className={cn("w-4 h-4", item.color)} />
              </div>
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className={cn("font-semibold text-sm truncate", item.color)}>{item.value}</p>
              {item.extra && (
                <p className="text-xs text-muted-foreground truncate">{item.extra}</p>
              )}
              {item.trend !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 mt-1 text-xs",
                  item.trend >= 0 ? "text-success" : "text-destructive"
                )}>
                  <span>{item.trend >= 0 ? "▲" : "▼"}</span>
                  <span>{Math.abs(item.trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detalhes de categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Maior aumento</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{categoriaMaisCresceu ? categoriaMaisCresceu.categoria : "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {categoriaMaisCresceu ? `${categoriaMaisCresceu.variacao.toFixed(1)}%` : "Sem variação"}
                </p>
              </div>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {categoriaMaisCresceu ? "Cuidado" : "—"}
              </Badge>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Maior redução</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{categoriaMaisReducao ? categoriaMaisReducao.categoria : "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {categoriaMaisReducao ? `${Math.abs(categoriaMaisReducao.variacao).toFixed(1)}%` : "Sem variação"}
                </p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                {categoriaMaisReducao ? "Economia" : "—"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Insights</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.map((insight, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs py-1 px-2 bg-accent/10 text-accent-foreground border-accent/20"
                >
                  {insight}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Performance summary */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Desempenho do Mês</p>
              <p className="text-xs text-muted-foreground">Comparativo com mês anterior</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <p className="text-muted-foreground">Receitas</p>
                <p className={cn(
                  "font-semibold",
                  variacaoReceitas >= 0 ? "text-success" : "text-destructive"
                )}>
                  {variacaoReceitas >= 0 ? "▲" : "▼"} {Math.abs(variacaoReceitas).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Despesas</p>
                <p className={cn(
                  "font-semibold",
                  variacaoDespesas <= 0 ? "text-success" : "text-destructive"
                )}>
                  {variacaoDespesas >= 0 ? "▲" : "▼"} {Math.abs(variacaoDespesas).toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Saldo</p>
                <p className={cn(
                  "font-semibold",
                  variacaoSaldo >= 0 ? "text-success" : "text-destructive"
                )}>
                  {variacaoSaldo >= 0 ? "▲" : "▼"} {Math.abs(variacaoSaldo).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};