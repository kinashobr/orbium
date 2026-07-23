"use client";

import React, { useMemo, useCallback } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Calculator, Minus, Plus, 
  Sparkles, Receipt, Zap, PieChart, BarChart3, LineChart, Activity, Gauge, ArrowUpRight, ArrowDownRight, Target, PiggyBank, Award
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ComparisonDateRanges, DateRange, formatCurrency } from "@/types/finance";
import { startOfDay, endOfDay, isWithinInterval, subMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { ptBR } from "date-fns/locale";
import { IndicatorCard } from "./IndicatorCard";
import { DREStatement } from "./DREStatement";

interface DREData {
  // Receita Total (operacional + rendimentos financeiros + descontos obtidos)
  rec: number;
  fix: number;
  var: number;
  juros: number;
  rendimentos: number;
  descontosObtidos: number;
  // Resultado Líquido (Resultado Operacional + Resultado Financeiro)
  res: number;
  // Receita Operacional (apenas operationType = 'receita')
  receitaOperacional: number;
  // Resultado Operacional: Receita Operacional - Despesas Operacionais (fixas + variáveis)
  resultadoOperacional: number;
  // Resultado Financeiro: Rendimentos + Descontos Obtidos - Juros
  resultadoFinanceiro: number;
  details: {
    receitas: { label: string; value: number; id: string }[];
    despesasFixas: { label: string; value: number; id: string }[];
    despesasVariaveis: { label: string; value: number; id: string }[];
  };
}

interface DREItem {
  label: string;
  value: number;
  type: "header" | "subtotal" | "detail" | "final";
  details?: DREItem[];
  icon?: React.ElementType;
  color?: string;
}

export function DRETab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { transacoesV2, categoriasV2, calculateLoanSchedule } = useFinance();
  const { range1, range2 } = dateRanges;
  const colors = useChartColors();
  const categoriesMap = useMemo(() => new Map(categoriasV2.map(c => [c.id, c])), [categoriasV2]);

  const getCategoryIcon = useCallback((label: string, defaultIcon: React.ElementType) => {
    const cat = categoriasV2.find(c => c.label === label);
    if (cat?.icon) {
      return () => <span className="text-lg leading-none flex items-center justify-center">{cat.icon}</span>;
    }
    return defaultIcon;
  }, [categoriasV2]);

  const finalDate = range1.to || new Date();
  const prevDate = range2.to || subMonths(finalDate, 1);

  const calculateDRE = useCallback((range: DateRange): DREData => {
    const rangeFrom = range.from ? startOfDay(range.from) : undefined;
    const rangeTo = range.to ? endOfDay(range.to) : undefined;
    
    const txs = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() }));
      } catch { return false; }
    });

    // Descontos obtidos financeiros (regime de caixa)
    const descontosObtidos = txs
      .filter((t) => t.categoryId === 'cat_descontos_obtidos' || categoriesMap.get(t.categoryId || '')?.label === 'Descontos Obtidos')
      .reduce((a, t) => a + t.amount, 0);

    // Receita operacional (regime de caixa) - excluindo descontos obtidos
    const receitaOperacional = txs
      .filter((t) => t.operationType === 'receita' && t.categoryId !== 'cat_descontos_obtidos' && categoriesMap.get(t.categoryId || '')?.label !== 'Descontos Obtidos')
      .reduce((a, t) => a + t.amount, 0);

    // Rendimentos financeiros (regime de caixa)
    const rendimentos = txs
      .filter((t) => t.operationType === 'rendimento')
      .reduce((a, t) => a + t.amount, 0);

    // Receita total do período (operacional + financeira + descontos)
    const receitaTotal = receitaOperacional + rendimentos + descontosObtidos;
    
    const fix = txs
      .filter((t) => categoriesMap.get(t.categoryId || '')?.nature === 'despesa_fixa')
      .reduce((a, t) => a + t.amount, 0);
    const var_ = txs
      .filter((t) => categoriesMap.get(t.categoryId || '')?.nature === 'despesa_variavel')
      .reduce((a, t) => a + t.amount, 0);
    
    // Juros de empréstimos (custo financeiro) – calculado a partir das parcelas pagas no período
    let juros = 0;
    txs.filter(t => t.operationType === 'pagamento_emprestimo').forEach(t => {
      const lid = t.links?.loanId?.replace('loan_', '');
      const pid = t.links?.parcelaId;
      if (lid && pid) {
        const s = calculateLoanSchedule(parseInt(lid));
        const item = s.find(i => i.parcela === parseInt(pid));
        if (item) juros += item.juros;
      }
    });

    // Resultado operacional: receitas operacionais - despesas operacionais (fixas + variáveis)
    const despesasOperacionais = fix + var_;
    const resultadoOperacional = receitaOperacional - despesasOperacionais;

    // Resultado financeiro: rendimentos + descontos obtidos - juros
    const resultadoFinanceiro = rendimentos + descontosObtidos - juros;

    // Resultado líquido do período (caixa): operacional + financeiro
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;
    
    // Agrupador genérico por natureza de categoria, com filtro opcional por tipo de operação.
    // Isso evita, por exemplo, que rendimentos (operationType = 'rendimento') caiam junto
    // nas linhas de Receita Operacional, o que poderia duplicar valores na DRE.
    const groupDetails = (
      nature: 'receita' | 'despesa_fixa' | 'despesa_variavel',
      operationType?: 'receita' | 'despesa'
    ) => {
      const filteredTxs = txs.filter((t) => {
        const catNature = categoriesMap.get(t.categoryId || '')?.nature;
        if (catNature !== nature) return false;
        // Se um operationType específico foi informado, filtramos também por ele
        if (operationType && t.operationType !== operationType) return false;
        // Excluir cat_descontos_obtidos das receitas operacionais para não duplicar
        if (t.categoryId === 'cat_descontos_obtidos') return false;
        return true;
      });
      const grouped = filteredTxs.reduce((acc, t) => {
        const label = categoriesMap.get(t.categoryId || '')?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(grouped).map(([label, value]) => ({ label, value, id: label }));
    };

    return {
      // rec passa a representar a Receita Total (operacional + financeira + descontos)
      rec: receitaTotal,
      fix,
      var: var_,
      juros,
      rendimentos,
      descontosObtidos,
      res: resultadoLiquido,
      receitaOperacional,
      resultadoOperacional,
      resultadoFinanceiro,
      details: {
        // Receitas operacionais: apenas transações marcadas como 'receita'
        // (rendimentos financeiros continuam segregados em `rendimentos` para o
        // cálculo do resultado financeiro, evitando dupla contagem).
        receitas: groupDetails('receita', 'receita'),
        despesasFixas: groupDetails('despesa_fixa'),
        despesasVariaveis: groupDetails('despesa_variavel'),
      },
    };
  }, [transacoesV2, categoriasV2, calculateLoanSchedule, categoriesMap]);

  const dre1 = useMemo(() => calculateDRE(range1), [calculateDRE, range1]);
  const dre2 = useMemo(() => calculateDRE(range2), [calculateDRE, range2]);

  const variacaoRL = dre2.res !== 0 ? ((dre1.res - dre2.res) / Math.abs(dre2.res)) * 100 : 0;
  
  const indicadores = useMemo(() => {
    const { res, rec, fix, var: v, juros, rendimentos } = dre1;
    const totalDespesas = fix + v + juros;
    return {
      // Margem líquida e demais indicadores agora usam Receita Total como base
      margemLiquida: rec > 0 ? (res / rec) * 100 : 0,
      // Eficiência operacional considera apenas a receita operacional (sem rendimentos)
      eficienciaOp:
        rec - rendimentos > 0
          ? (((rec - rendimentos) - fix) / (rec - rendimentos)) * 100
          : 0,
      pesoFixos: totalDespesas > 0 ? (fix / totalDespesas) * 100 : 0,
      savingsRate: rec > 0 ? (Math.max(0, res) / rec) * 100 : 0,
      impactoFinanceiro: rec > 0 ? (Math.abs(juros) / rec) * 100 : 0,
      pontoEquilibrio: (fix + v) > 0 ? (fix / (fix + v)) * 100 : 0
    };
  }, [dre1]);
  
  const dreStatementData: DREItem[] = useMemo(() => [
    {
      label: "RECEITA OPERACIONAL",
      value: dre1.receitaOperacional,
      type: "header",
      icon: TrendingUp,
      color: "text-success",
      details: dre1.details.receitas.map((r) => ({
        label: r.label,
        value: r.value,
        type: "detail",
        icon: getCategoryIcon(r.label, TrendingUp),
        color: "text-success",
      })),
    },
    {
      label: "DESPESAS OPERACIONAIS",
      value: dre1.fix + dre1.var,
      type: "header",
      icon: TrendingDown,
      color: "text-destructive",
      // Aqui exibimos diretamente as categorias (fixas e variáveis)
      // como linhas individuais com ícones, para ficar igual ao Balanço
      // em termos de leitura por categoria.
      details: [
        ...dre1.details.despesasFixas.map((d) => ({
          label: d.label,
          value: d.value,
          type: "detail" as const,
          icon: getCategoryIcon(d.label, TrendingDown),
          color: "text-destructive",
        })),
        ...dre1.details.despesasVariaveis.map((d) => ({
          label: d.label,
          value: d.value,
          type: "detail" as const,
          icon: getCategoryIcon(d.label, Activity),
          color: "text-destructive",
        })),
      ],
    },
    {
      label: "RESULTADO OPERACIONAL",
      value: dre1.resultadoOperacional,
      type: "subtotal",
      icon: DollarSign,
      color: dre1.resultadoOperacional >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "RESULTADO FINANCEIRO",
      value: dre1.resultadoFinanceiro,
      type: "header",
      icon: Zap,
      color: dre1.resultadoFinanceiro >= 0 ? "text-success" : "text-destructive",
      details: [
        {
          label: "Rendimentos Financeiros",
          value: dre1.rendimentos,
          type: "detail",
          icon: Sparkles,
          color: "text-success",
        },
        {
          label: "Descontos Obtidos",
          value: dre1.descontosObtidos,
          type: "detail",
          icon: Award,
          color: "text-success",
        },
        {
          label: "Juros e Encargos",
          value: -dre1.juros,
          type: "detail",
          icon: Gauge,
          color: "text-destructive",
        },
      ],
    },
    {
      label: "RESULTADO LÍQUIDO DO PERÍODO",
      value: dre1.res,
      type: "final",
      icon: DollarSign,
      color: dre1.res >= 0 ? "text-success" : "text-destructive",
    },
  ], [dre1, getCategoryIcon]);

  const evolutionData = useMemo(() => {
    const now = new Date();
    const result: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const dre = calculateDRE({ from: startOfMonth(data), to: endOfMonth(data) });
      result.push({ mes: format(data, 'MMM', { locale: ptBR }), receitas: dre.rec, despesas: dre.fix + dre.var + dre.juros, resultado: dre.res });
    }
    return result;
  }, [calculateDRE]);

  const compositionData = useMemo(() => {
    const palette = [
        colors.primary, 'hsl(var(--neon-purple))', 'hsl(var(--neon-blue))',
        colors.destructive, 'hsl(var(--neon-pink))', colors.warning,
        colors.success, 'hsl(var(--neon-cyan))', 'hsl(var(--indigo-500))'
    ];

    const allExpenses = [
        ...dre1.details.despesasFixas.map(d => ({ name: d.label, value: d.value })),
        ...dre1.details.despesasVariaveis.map(d => ({ name: d.label, value: d.value }))
    ];
    
    if (dre1.juros > 0) {
        allExpenses.push({ name: 'Juros e Encargos', value: dre1.juros });
    }

    const filtered = allExpenses
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

    if (filtered.length === 0) return [];

    return filtered.map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [dre1, colors]);

  const totalGastos = useMemo(() => dre1.fix + dre1.var + dre1.juros, [dre1]);
  const resultadoLiquidoLabel = useMemo(() => {
    const v = dre1.res;
    return v < 0 ? `-${formatCurrency(Math.abs(v))}` : formatCurrency(v);
  }, [dre1.res]);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <div className={cn(
            "rounded-[40px] p-8 sm:p-10 shadow-soft relative overflow-hidden border-4 h-[400px] flex flex-col justify-center group transition-all duration-700",
            dre1.res >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
          )}>
             <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent"></div>
             <div className="absolute right-0 top-0 opacity-10 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000">
                <Receipt className="w-[300px] h-[300px] text-primary" />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                <Badge className={cn("border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest", dre1.res >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {dre1.res >= 0 ? "Superávit Mensal" : "Déficit Mensal"}
                  </Badge>
                </div>
                <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Resultado Líquido do Período</h2>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                   <h3 className={cn("font-display font-extrabold text-5xl sm:text-6xl tracking-tighter leading-none tabular-nums whitespace-nowrap", dre1.res >= 0 ? "text-success" : "text-destructive")}>
                      {resultadoLiquidoLabel}
                   </h3>
                   <Badge className={cn("rounded-xl px-4 py-2 font-black text-xs gap-2 mb-2 w-fit", variacaoRL >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {variacaoRL >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {Math.abs(variacaoRL).toFixed(1)}% evolução
                   </Badge>
                </div>
                <div className="mt-8 flex items-center gap-2">
                   <Sparkles className="w-3.5 h-3.5 text-accent" />
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance Orbium calculada em {format(finalDate, "MM/yyyy")}</span>
                </div>
             </div>
          </div>
        </div>
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <IndicatorCard 
            title="Margem Líq." 
            value={`${indicadores.margemLiquida.toFixed(1)}%`} 
            status={indicadores.margemLiquida >= 20 ? "success" : "warning"}
            icon={DollarSign}
            description="Quanto sobra da sua renda após pagar todas as contas."
            formula="Resultado ÷ Renda × 100"
            formulaValues={`${formatCurrency(dre1.res)} ÷ ${formatCurrency(dre1.rec)} × 100`}
          />
          <IndicatorCard 
            title="Eficiência Op." 
            value={`${indicadores.eficienciaOp.toFixed(1)}%`} 
            status={indicadores.eficienciaOp >= 70 ? "success" : "warning"}
            icon={Zap}
            description="Quanto da sua renda está livre após custos fixos."
            formula="(Renda - Fixos) ÷ Renda × 100"
            formulaValues={`(${formatCurrency(dre1.receitaOperacional)} - ${formatCurrency(dre1.fix)}) ÷ ${formatCurrency(dre1.receitaOperacional)} × 100`}
          />
          <IndicatorCard 
            title="Fixos (%)" 
            value={`${indicadores.pesoFixos.toFixed(1)}%`} 
            status={indicadores.pesoFixos <= 40 ? "success" : "warning"}
            icon={Target}
            description="Quanto dos seus gastos são fixos e difíceis de cortar."
            formula="Fixos ÷ Total Gastos × 100"
            formulaValues={`${formatCurrency(dre1.fix)} ÷ ${formatCurrency(dre1.fix + dre1.var + dre1.juros)} × 100`}
          />
          <IndicatorCard 
            title="Juros (%)" 
            value={`${indicadores.impactoFinanceiro.toFixed(1)}%`} 
            status={indicadores.impactoFinanceiro <= 5 ? "success" : "warning"}
            icon={Gauge}
            description="Impacto dos juros de empréstimos na sua renda."
            formula="Juros ÷ Renda × 100"
            formulaValues={`${formatCurrency(dre1.juros)} ÷ ${formatCurrency(dre1.rec)} × 100`}
          />
          <IndicatorCard 
            title="Fixos vs Var." 
            value={`${indicadores.pontoEquilibrio.toFixed(1)}%`} 
            status={indicadores.pontoEquilibrio <= 50 ? "success" : "warning"}
            icon={Activity}
            description="Proporção entre gastos fixos e variáveis."
            formula="Fixos ÷ (Fixos + Variáveis) × 100"
            formulaValues={`${formatCurrency(dre1.fix)} ÷ (${formatCurrency(dre1.fix)} + ${formatCurrency(dre1.var)}) × 100`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Renda Total</p>
            <p className="text-lg font-black tabular-nums text-success">{formatCurrency(dre1.rec)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Custos Fixos</p>
            <p className="text-lg font-black tabular-nums text-destructive/80">{formatCurrency(dre1.fix)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Custos Variáveis</p>
             <p className="text-lg font-black tabular-nums text-destructive">{formatCurrency(dre1.var)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Resultado Operacional</p>
             <p className="text-lg font-black tabular-nums text-primary">{formatCurrency(dre1.resultadoOperacional)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Resultado Financeiro</p>
             <p className={cn("text-lg font-black tabular-nums", dre1.resultadoFinanceiro >= 0 ? "text-success" : "text-destructive")}>
               {formatCurrency(dre1.resultadoFinanceiro)}
             </p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Variação do Período</p>
            <p className={cn("text-lg font-black tabular-nums", dre1.res >= dre2.res ? "text-success" : "text-destructive")}>{formatCurrency(dre1.res - dre2.res)}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-10">
          <DREStatement
            title="Demonstração do Resultado do Período"
            data={dreStatementData}
            className="mt-2"
          />
        </div>

        <div className="lg:col-span-5 space-y-10 lg:sticky lg:top-24">
          <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="p-2 bg-primary/10 rounded-xl text-primary"><BarChart3 className="w-5 h-5" /></div>
               <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Fluxo de Caixa Histórico</h4>
            </div>
            <div className="h-[280px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                     <defs>
                        <linearGradient id="recGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.success} stopOpacity={0.3}/><stop offset="95%" stopColor={colors.success} stopOpacity={0}/></linearGradient>
                        <linearGradient id="despGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.destructive} stopOpacity={0.3}/><stop offset="95%" stopColor={colors.destructive} stopOpacity={0}/></linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                     <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} tickFormatter={v => `R$ ${v/1000}k`} />
                     <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                     <Legend iconType="circle" />
                     <Area type="monotone" dataKey="receitas" name="Receitas" stroke={colors.success} strokeWidth={4} fillOpacity={1} fill="url(#recGradient)" />
                     <Area type="monotone" dataKey="despesas" name="Despesas" stroke={colors.destructive} strokeWidth={4} fillOpacity={1} fill="url(#despGradient)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft flex flex-col">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="p-2 bg-accent/10 rounded-xl text-accent"><PieChart className="w-5 h-5" /></div>
               <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Top Gastos por Categoria</h4>
            </div>
            
            <div className="flex-1 min-h-[320px] relative flex flex-col items-center justify-center">
              <div className="w-full h-[280px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie 
                      data={compositionData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="72%" 
                      outerRadius="95%" 
                      paddingAngle={6} 
                      dataKey="value" 
                      stroke="none"
                      cornerRadius={12}
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: 'none', 
                        borderRadius: '16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
                      }}
                      formatter={(v: number) => [formatCurrency(v), "Valor"]}
                    />
                  </RePieChart>
                </ResponsiveContainer>

                {/* Valor Centralizado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Gastos</span>
                  <p className="text-2xl font-black text-foreground tracking-tighter">
                    {formatCurrency(totalGastos)}
                  </p>
                </div>
              </div>

              {/* Legenda customizada em Badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {compositionData.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/40 shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-foreground truncate max-w-[100px]">{item.name}</span>
                    <span className="text-[9px] font-black text-muted-foreground">
                      {((item.value / totalGastos) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}