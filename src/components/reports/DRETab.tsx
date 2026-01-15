"use client";

import React, { useMemo, useCallback } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Calculator, Minus, Plus, 
  Sparkles, Receipt, Zap, PieChart, BarChart3, LineChart, Activity, Gauge, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ComparisonDateRanges, DateRange, formatCurrency } from "@/types/finance";
import { startOfDay, endOfDay, isWithinInterval, subMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { ptBR } from "date-fns/locale";
import { IndicatorRadialCard } from "./IndicatorRadialCard";
import { BalanceSheetList } from "./BalanceSheetList";

interface DREData {
  rec: number;
  fix: number;
  var: number;
  juros: number;
  rendimentos: number;
  res: number;
  details: {
    receitas: { label: string; value: number; id: string }[];
    despesasFixas: { label: string; value: number; id: string }[];
    despesasVariaveis: { label: string; value: number; id: string }[];
  };
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

    const rec = txs.filter(t => t.operationType === 'receita').reduce((a, t) => a + t.amount, 0);
    const rendimentos = txs.filter(t => t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
    const receitaBruta = rec + rendimentos;
    
    const fix = txs.filter(t => categoriesMap.get(t.categoryId || '')?.nature === 'despesa_fixa').reduce((a, t) => a + t.amount, 0);
    const var_ = txs.filter(t => categoriesMap.get(t.categoryId || '')?.nature === 'despesa_variavel').reduce((a, t) => a + t.amount, 0);
    
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
    
    const resultadoOperacional = receitaBruta - fix - var_;
    const resultadoLiquido = resultadoOperacional + rendimentos - juros;
    
    const groupDetails = (nature: 'receita' | 'despesa_fixa' | 'despesa_variavel') => {
      const filteredTxs = txs.filter(t => categoriesMap.get(t.categoryId || '')?.nature === nature);
      const grouped = filteredTxs.reduce((acc, t) => {
        const label = categoriesMap.get(t.categoryId || '')?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(grouped).map(([label, value]) => ({ label, value, id: label }));
    };

    return { 
      rec: receitaBruta, fix, var: var_, juros, rendimentos, res: resultadoLiquido,
      details: { receitas: groupDetails('receita'), despesasFixas: groupDetails('despesa_fixa'), despesasVariaveis: groupDetails('despesa_variavel') }
    };
  }, [transacoesV2, categoriasV2, calculateLoanSchedule, categoriesMap]);

  const dre1 = useMemo(() => calculateDRE(range1), [calculateDRE, range1]);
  const dre2 = useMemo(() => calculateDRE(range2), [calculateDRE, range2]);

  const variacaoRL = dre2.res !== 0 ? ((dre1.res - dre2.res) / Math.abs(dre2.res)) * 100 : 0;
  
  const indicadores = useMemo(() => {
    const { res, rec, fix, var: v, juros } = dre1;
    const totalDespesas = fix + v + juros;
    return {
      margemLiquida: rec > 0 ? (res / rec) * 100 : 0,
      eficienciaOp: rec > 0 ? ((rec - fix) / rec) * 100 : 0,
      pesoFixos: totalDespesas > 0 ? (fix / totalDespesas) * 100 : 0,
      savingsRate: rec > 0 ? (Math.max(0, res) / rec) * 100 : 0,
      impactoFinanceiro: rec > 0 ? (Math.abs(juros) / rec) * 100 : 0,
      pontoEquilibrio: (fix + v) > 0 ? (fix / (fix + v)) * 100 : 0
    };
  }, [dre1]);

  const receitaItems = useMemo(() => {
    const total = dre1.rec;
    const details = dre1.details.receitas.map(d => ({
        id: d.id, name: d.label, typeLabel: 'Receita Operacional', value: d.value, 
        percent: total > 0 ? (d.value / total) * 100 : 0, 
        icon: getCategoryIcon(d.label, TrendingUp)
    }));
    if (dre1.rendimentos > 0) {
        details.push({ id: 'rendimentos', name: 'Rendimentos Financeiros', typeLabel: 'Aplicação/Invest.', value: dre1.rendimentos, percent: total > 0 ? (dre1.rendimentos / total) * 100 : 0, icon: Sparkles });
    }
    return [{ label: 'FONTES DE RENDA', value: total, percent: 100, type: 'circulante' as const, details }];
  }, [dre1, getCategoryIcon]);

  const despesaItems = useMemo(() => {
    const total = dre1.fix + dre1.var + dre1.juros;
    const fixDetails = dre1.details.despesasFixas.map(d => ({
        id: d.id, name: d.label, typeLabel: 'Custo Fixo', value: d.value, 
        percent: total > 0 ? (d.value / total) * 100 : 0, 
        icon: getCategoryIcon(d.label, TrendingDown)
    }));
    const varDetails = dre1.details.despesasVariaveis.map(d => ({
        id: d.id, name: d.label, typeLabel: 'Consumo Variável', value: d.value, 
        percent: total > 0 ? (d.value / total) * 100 : 0, 
        icon: getCategoryIcon(d.label, Activity)
    }));
    if (dre1.juros > 0) {
        varDetails.push({ id: 'juros', name: 'Juros e Encargos', typeLabel: 'Custo Financeiro', value: dre1.juros, percent: total > 0 ? (dre1.juros / total) * 100 : 0, icon: Gauge });
    }
    return [
        { label: 'DESPESAS FIXAS', value: dre1.fix, percent: total > 0 ? (dre1.fix / total) * 100 : 0, type: 'circulante' as const, details: fixDetails },
        { label: 'DESPESAS VARIÁVEIS & JUROS', value: dre1.var + dre1.juros, percent: total > 0 ? ((dre1.var + dre1.juros) / total) * 100 : 0, type: 'nao_circulante' as const, details: varDetails },
        { label: 'RESULTADO LÍQUIDO', value: dre1.res, percent: 0, type: 'patrimonio' as const }
    ];
  }, [dre1, getCategoryIcon]);

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
                    {dre1.res >= 0 ? "Lucro Operacional" : "Déficit Mensal"}
                  </Badge>
                </div>
                <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Resultado Líquido do Período</h2>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                   <h3 className={cn("font-display font-extrabold text-5xl sm:text-6xl tracking-tighter leading-none tabular-nums", dre1.res >= 0 ? "text-success" : "text-destructive")}>
                     {formatCurrency(dre1.res)}
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
          <IndicatorRadialCard 
            title="Taxa de Sobra" 
            value={indicadores.margemLiquida} 
            label="Sobra" 
            status={indicadores.margemLiquida >= 20 ? "success" : "warning"}
            description="Quanto sobra da sua renda após pagar todas as contas."
            formula="Resultado ÷ Renda × 100"
            idealRange="Acima de 20%"
          />
          <IndicatorRadialCard 
            title="Eficiência Operacional" 
            value={indicadores.eficienciaOp} 
            label="Eficiência" 
            status={indicadores.eficienciaOp >= 70 ? "success" : "warning"}
            description="Quanto da sua renda está livre após custos fixos."
            formula="(Renda - Fixos) ÷ Renda × 100"
            idealRange="Acima de 70%"
          />
          <IndicatorRadialCard 
            title="Peso dos Fixos" 
            value={indicadores.pesoFixos} 
            label="Fixos" 
            status={indicadores.pesoFixos <= 40 ? "success" : "warning"}
            description="Quanto dos seus gastos são fixos e difíceis de cortar."
            formula="Fixos ÷ Total Gastos × 100"
            idealRange="Abaixo de 40%"
          />
          <IndicatorRadialCard 
            title="Taxa de Economia" 
            value={indicadores.savingsRate} 
            label="Economia" 
            status={indicadores.savingsRate >= 15 ? "success" : "warning"}
            description="Quanto você consegue guardar da sua renda."
            formula="Sobra ÷ Renda × 100"
            idealRange="Acima de 15%"
          />
          <IndicatorRadialCard 
            title="Custo das Dívidas" 
            value={indicadores.impactoFinanceiro} 
            label="Juros" 
            status={indicadores.impactoFinanceiro <= 5 ? "success" : "warning"}
            description="Impacto dos juros de empréstimos na sua renda."
            formula="Juros ÷ Renda × 100"
            idealRange="Abaixo de 5%"
          />
          <IndicatorRadialCard 
            title="Balanço Fixo/Variável" 
            value={indicadores.pontoEquilibrio} 
            label="Mix" 
            status={indicadores.pontoEquilibrio <= 50 ? "success" : "warning"}
            description="Proporção entre gastos fixos e variáveis."
            formula="Fixos ÷ (Fixos + Variáveis) × 100"
            idealRange="Abaixo de 50%"
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
            <p className="text-lg font-black tabular-nums text-destructive">{formatCurrency(dre1.var + dre1.juros)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Margem Bruta</p>
            <p className="text-lg font-black tabular-nums text-primary">{formatCurrency(dre1.rec - dre1.fix)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Resultado Financeiro</p>
            <p className={cn("text-lg font-black tabular-nums", (dre1.rendimentos - dre1.juros) >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(dre1.rendimentos - dre1.juros)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Variação do Período</p>
            <p className={cn("text-lg font-black tabular-nums", dre1.res >= dre2.res ? "text-success" : "text-destructive")}>{formatCurrency(dre1.res - dre2.res)}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-10">
          <BalanceSheetList title="RECEITAS & CRÉDITOS" totalValue={dre1.rec} items={receitaItems} isAsset={true} />
          <BalanceSheetList title="DESPESAS & CUSTOS" totalValue={dre1.fix + dre1.var + dre1.juros} items={despesaItems} isAsset={false} plValue={dre1.res} />
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
            <div className="flex-1 min-h-[300px] w-full">
               {compositionData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                       <Pie 
                          data={compositionData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={70} 
                          outerRadius={100} 
                          paddingAngle={4} 
                          dataKey="value" 
                          nameKey="name"
                          stroke="none"
                       >
                          {compositionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                       </Pie>
                       <Tooltip 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))'}}
                          formatter={(value: number, name: string) => [formatCurrency(value), name]}
                       />
                    </RePieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full opacity-30 py-10">
                    <PieChart className="w-12 h-12 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">Sem dados no período</p>
                 </div>
               )}
            </div>
            {compositionData.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6">
                 {compositionData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                       <span className="text-[10px] font-bold text-foreground truncate uppercase tracking-tight">{d.name}</span>
                    </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}