"use client";

import React, { useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Scale, Building2, Car, 
  Banknote, Shield, History, CreditCard, ArrowUpRight, 
  Info, LineChart, PieChart, LayoutGrid, Sparkles,
  Zap, Target, Gauge, Activity, ShieldCheck, Wallet, Landmark
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ComparisonDateRanges, formatCurrency } from "@/types/finance";
import { subMonths, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IndicatorCard } from "./IndicatorCard";
import { BalanceSheetList } from "./BalanceSheetList";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";

const getIconForType = (type: string): React.ElementType => {
    switch (type) {
        case 'corrente':
        case 'poupanca':
        case 'reserva':
            return Building2;
        case 'renda_fixa':
        case 'cripto':
        case 'objetivo':
            return Shield;
        case 'imobilizado':
            return Car;
        case 'seguros_apropriar':
            return Shield;
        case 'cartoes':
            return CreditCard;
        case 'emprestimos_curto':
            return Banknote;
        case 'emprestimos_longo':
            return History;
        case 'seguros_pagar':
            return Shield;
        default:
            return Scale;
    }
};

export function BalancoTab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { 
    transacoesV2, contasMovimento, calculateBalanceUpToDate, 
    getValorFipeTotal, getSegurosAApropriar, getSegurosAPagar, 
    calculateLoanPrincipalDueInNextMonths, getLoanPrincipalRemaining,
    getCreditCardDebt, getPatrimonioLiquido
  } = useFinance();

  const colors = useChartColors();
  const finalDate = dateRanges.range1.to || new Date();
  const prevDate = dateRanges.range2.to || subMonths(finalDate, 1);

  const b1 = useMemo(() => {
    const saldos = contasMovimento.reduce((acc, c) => ({ 
      ...acc, 
      [c.id]: calculateBalanceUpToDate(c.id, finalDate, transacoesV2, contasMovimento) 
    }), {} as Record<string, number>);
    
    const circulantesRaw = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType));
    const invNaoCirculantesRaw = contasMovimento.filter(c => ['renda_fixa', 'cripto', 'objetivo'].includes(c.accountType));
    const ativoCirculante = circulantesRaw.reduce((acc, c) => acc + Math.max(0, saldos[c.id] || 0), 0);
    const investimentosNaoCirculantes = invNaoCirculantesRaw.reduce((acc, c) => acc + Math.max(0, saldos[c.id] || 0), 0);
    const imobilizadoFipe = getValorFipeTotal(finalDate);
    const segurosAApropriar = getSegurosAApropriar(finalDate);
    const totalAtivos = ativoCirculante + investimentosNaoCirculantes + imobilizadoFipe + segurosAApropriar;

    const dividaCartoes = getCreditCardDebt(finalDate);
    const principalLoans12m = calculateLoanPrincipalDueInNextMonths(finalDate, 12);
    const segurosAPagar = getSegurosAPagar(finalDate);
    const passivoCirculante = dividaCartoes + principalLoans12m + segurosAPagar;
    const totalLoans = getLoanPrincipalRemaining(finalDate);
    const passivoNaoCirculante = Math.max(0, totalLoans - principalLoans12m);
    const totalPassivos = passivoCirculante + passivoNaoCirculante;
    const pl = totalAtivos - totalPassivos;

    return { totalAtivos, ativoCirculante, investimentosNaoCirculantes, imobilizadoFipe, segurosAApropriar, totalPassivos, passivoCirculante, passivoNaoCirculante, pl, dividaCartoes, principalLoans12m, segurosAPagar, contasCirculantes: circulantesRaw.map(c => ({ ...c, saldo: saldos[c.id] || 0 })), contasInvestimentos: invNaoCirculantesRaw.map(c => ({ ...c, saldo: saldos[c.id] || 0 })) };
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate, getValorFipeTotal, getSegurosAApropriar, getSegurosAPagar, calculateLoanPrincipalDueInNextMonths, getLoanPrincipalRemaining, getCreditCardDebt, finalDate]);

  const indicadores = useMemo(() => {
    const { pl, totalAtivos, totalPassivos, ativoCirculante, passivoCirculante, imobilizadoFipe } = b1;
    const equityRatio = totalAtivos > 0 ? (pl / totalAtivos) * 100 : 0;
    const liqGeral = totalPassivos > 0 ? (totalAtivos / totalPassivos) : 0;
    const liqCorrente = passivoCirculante > 0 ? (ativoCirculante / passivoCirculante) : 0;
    const endividamento = totalAtivos > 0 ? (totalPassivos / totalAtivos) * 100 : 0;
    const assetCoverage = totalPassivos > 0 ? (pl / totalPassivos) : 0;
    const fixedAssetEquity = pl > 0 ? (imobilizadoFipe / pl) * 100 : 0;
    return { equityRatio, liqGeral, liqCorrente, endividamento, assetCoverage, fixedAssetEquity };
  }, [b1]);

  const plAnterior = getPatrimonioLiquido(prevDate);
  const variacaoPlPerc = plAnterior !== 0 ? ((b1.pl - plAnterior) / Math.abs(plAnterior)) * 100 : 0;
  
  const evolutionData = useMemo(() => {
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const date = endOfMonth(subMonths(new Date(), i));
      result.push({ mes: format(date, 'MMM', { locale: ptBR }).toUpperCase(), valor: getPatrimonioLiquido(date) });
    }
    return result;
  }, [getPatrimonioLiquido]);

  const compositionData = useMemo(() => [
    { name: 'Circulante', value: b1.ativoCirculante, color: colors.success },
    { name: 'Imobilizado', value: b1.imobilizadoFipe, color: colors.primary },
    { name: 'Investimentos', value: b1.investimentosNaoCirculantes, color: colors.accent }
  ].filter(d => d.value > 0), [b1, colors]);

  const ativoItems = useMemo(() => {
    const total = b1.totalAtivos;
    const circulanteDetails = b1.contasCirculantes.filter(c => c.saldo > 0).map(c => ({ id: c.id, name: c.name, typeLabel: ACCOUNT_TYPE_LABELS[c.accountType], value: c.saldo, percent: total > 0 ? (c.saldo / total) * 100 : 0, icon: getIconForType(c.accountType) }));
    if (b1.segurosAApropriar > 0) circulanteDetails.push({ id: 'seguros_apropriar', name: 'Seguros a Apropriar', typeLabel: 'Despesa Pré-Paga', value: b1.segurosAApropriar, percent: total > 0 ? (b1.segurosAApropriar / total) * 100 : 0, icon: getIconForType('seguros_apropriar') });
    const naoCirculanteDetails = b1.contasInvestimentos.filter(c => c.saldo > 0).map(c => ({ id: c.id, name: c.name, typeLabel: ACCOUNT_TYPE_LABELS[c.accountType], value: c.saldo, percent: total > 0 ? (c.saldo / total) * 100 : 0, icon: getIconForType(c.accountType) }));
    if (b1.imobilizadoFipe > 0) naoCirculanteDetails.push({ id: 'imobilizado', name: 'Imobilizado (Veículos)', typeLabel: 'Avaliação FIPE', value: b1.imobilizadoFipe, percent: total > 0 ? (b1.imobilizadoFipe / total) * 100 : 0, icon: getIconForType('imobilizado') });
    return [{ label: 'Ativo Circulante', value: b1.ativoCirculante + b1.segurosAApropriar, percent: total > 0 ? ((b1.ativoCirculante + b1.segurosAApropriar) / total) * 100 : 0, type: 'circulante' as const, details: circulanteDetails }, { label: 'Ativo Não Circulante', value: b1.investimentosNaoCirculantes + b1.imobilizadoFipe, percent: total > 0 ? ((b1.investimentosNaoCirculantes + b1.imobilizadoFipe) / total) * 100 : 0, type: 'nao_circulante' as const, details: naoCirculanteDetails }].filter(item => item.value > 0);
  }, [b1]);

  const passivoItems = useMemo(() => {
    const totalPassivoPL = b1.totalAtivos;
    const circulanteDetails = [];
    if (b1.dividaCartoes > 0) circulanteDetails.push({ id: 'cartoes', name: 'Saldo Cartões', typeLabel: 'Faturas em aberto', value: b1.dividaCartoes, percent: totalPassivoPL > 0 ? (b1.dividaCartoes / totalPassivoPL) * 100 : 0, icon: getIconForType('cartoes') });
    if (b1.principalLoans12m > 0) circulanteDetails.push({ id: 'emprestimos_curto', name: 'Principal (12m)', typeLabel: 'Obrigação CP', value: b1.principalLoans12m, percent: totalPassivoPL > 0 ? (b1.principalLoans12m / totalPassivoPL) * 100 : 0, icon: getIconForType('emprestimos_curto') });
    if (b1.segurosAPagar > 0) circulanteDetails.push({ id: 'seguros_pagar', name: 'Seguros a Pagar', typeLabel: 'Obrigação CP', value: b1.segurosAPagar, percent: totalPassivoPL > 0 ? (b1.segurosAPagar / totalPassivoPL) * 100 : 0, icon: getIconForType('seguros_pagar') });
    const naoCirculanteDetails = [];
    if (b1.passivoNaoCirculante > 0) naoCirculanteDetails.push({ id: 'emprestimos_longo', name: 'Principal (LP)', typeLabel: 'Obrigação LP', value: b1.passivoNaoCirculante, percent: totalPassivoPL > 0 ? (b1.passivoNaoCirculante / totalPassivoPL) * 100 : 0, icon: getIconForType('emprestimos_longo') });
    const sections = [];
    if (b1.passivoCirculante > 0) sections.push({ label: 'Passivo Circulante', value: b1.passivoCirculante, percent: totalPassivoPL > 0 ? (b1.passivoCirculante / totalPassivoPL) * 100 : 0, type: 'circulante' as const, details: circulanteDetails });
    if (b1.passivoNaoCirculante > 0) sections.push({ label: 'Passivo Não Circulante', value: b1.passivoNaoCirculante, percent: totalPassivoPL > 0 ? (b1.passivoNaoCirculante / totalPassivoPL) * 100 : 0, type: 'nao_circulante' as const, details: naoCirculanteDetails });
    sections.push({ label: 'Patrimônio Líquido', value: b1.pl, percent: totalPassivoPL > 0 ? (b1.pl / totalPassivoPL) * 100 : 0, type: 'patrimonio' as const });
    return sections;
  }, [b1]);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 h-[350px] sm:h-[400px] flex flex-col justify-center group transition-all">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent"></div>
             <div className="absolute right-0 top-0 opacity-10 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000"><LineChart className="w-[300px] h-[300px] text-primary" /></div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6"><Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest">Consolidado Patrimonial</Badge></div>
                <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Patrimônio Líquido Final</h2>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6"><h3 className="font-display font-extrabold text-4xl sm:text-6xl text-foreground tracking-tighter leading-none tabular-nums">{formatCurrency(b1.pl)}</h3><Badge className={cn("rounded-xl px-4 py-2 font-black text-xs gap-2 mb-2 w-fit", variacaoPlPerc >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{variacaoPlPerc >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{Math.abs(variacaoPlPerc).toFixed(1)}% evolução</Badge></div>
                <div className="mt-8 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-accent" /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance Orbium calculada em {format(finalDate, "MM/yyyy")}</span></div>
             </div>
          </div>
        </div>
        <div className="col-span-12 xl:col-span-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
          <IndicatorCard 
            title="Participação Própria" 
            value={`${indicadores.equityRatio.toFixed(1)}%`} 
            status={indicadores.equityRatio >= 40 ? "success" : "warning"} 
            icon={ShieldCheck}
            description="Percentual do patrimônio total que é financiado por capital próprio."
            formula="PL ÷ Ativos Totais × 100"
          />
          <IndicatorCard 
            title="Índice de Solvência" 
            value={`${indicadores.liqGeral.toFixed(2)}x`} 
            status={indicadores.liqGeral >= 1.5 ? "success" : "warning"} 
            icon={Scale}
            description="Capacidade de pagar todas as dívidas com os bens atuais."
            formula="Ativos ÷ Passivos"
          />
          <IndicatorCard 
            title="Liquidez CP" 
            value={`${indicadores.liqCorrente.toFixed(2)}x`} 
            status={indicadores.liqCorrente >= 1.2 ? "success" : "warning"} 
            icon={Wallet}
            description="Capacidade de pagar dívidas de curto prazo com dinheiro disponível."
            formula="Ativo Circulante ÷ Passivo Circulante"
          />
          <IndicatorCard 
            title="Endividamento" 
            value={`${indicadores.endividamento.toFixed(1)}%`} 
            status={indicadores.endividamento <= 30 ? "success" : "warning"} 
            icon={TrendingDown}
            description="Quanto do seu patrimônio está comprometido com dívidas."
            formula="Passivos ÷ Ativos × 100"
          />
          <IndicatorCard 
            title="Cobertura Patrimonial" 
            value={`${indicadores.assetCoverage.toFixed(2)}x`} 
            status={indicadores.assetCoverage >= 2 ? "success" : "warning"} 
            icon={Activity}
            description="Quantas vezes seu capital próprio cobre suas dívidas."
            formula="PL ÷ Passivos"
          />
          <IndicatorCard 
            title="Imobilização" 
            value={`${indicadores.fixedAssetEquity.toFixed(1)}%`} 
            status={indicadores.fixedAssetEquity <= 60 ? "success" : "warning"} 
            icon={Landmark}
            description="Quanto do seu capital próprio está 'preso' em bens físicos."
            formula="Imobilizado ÷ PL × 100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
         {[ { l: 'Total de Bens', v: b1.totalAtivos, c: 'text-success' }, { l: 'Disponível', v: b1.ativoCirculante, c: 'text-success/80' }, { l: 'Investimentos', v: b1.investimentosNaoCirculantes, c: 'text-indigo-500' }, { l: 'Obrigações', v: b1.totalPassivos, c: 'text-destructive' }, { l: 'Cap. Próprio', v: b1.pl, c: 'text-primary' }, { l: 'Variação PL', v: b1.pl - plAnterior, c: b1.pl >= plAnterior ? 'text-success' : 'text-destructive' }].map((item, idx) => (
           <div key={idx} className="p-4 sm:p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 truncate">{item.l}</p>
              <p className={cn("text-base sm:text-lg font-black tabular-nums truncate", item.c)}>{formatCurrency(item.v)}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
        <BalanceSheetList title="ATIVO" totalValue={b1.totalAtivos} items={ativoItems} isAsset={true} />
        <BalanceSheetList title="PASSIVO + PL" totalValue={b1.totalAtivos} items={passivoItems} isAsset={false} plValue={b1.pl} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-6 lg:p-8 border border-white/60 dark:border-white/5 shadow-soft">
            <div className="flex items-center gap-3 mb-8 px-2"><div className="p-2 bg-primary/10 rounded-xl text-primary"><LineChart className="w-5 h-5" /></div><h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Evolução Patrimonial</h4></div>
            <div className="h-[250px] sm:h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={evolutionData}><defs><linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold'}} /><YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} tickFormatter={v => `R$ ${v/1000}k`} /><Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} formatter={(v: number) => [formatCurrency(v), 'PL']} /><Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#plGradient)" /></AreaChart></ResponsiveContainer></div>
         </div>
         
         <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-6 lg:p-8 border border-white/60 dark:border-white/5 shadow-soft flex flex-col">
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><PieChart className="w-5 h-5" /></div>
              <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Composição Patrimonial</h4>
            </div>
            
            <div className="flex-1 min-h-[280px] relative flex flex-col items-center justify-center">
              <div className="w-full h-[240px] relative">
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
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Ativos</span>
                  <p className="text-2xl font-black text-foreground tracking-tighter">
                    {formatCurrency(b1.totalAtivos)}
                  </p>
                </div>
              </div>

              {/* Legenda customizada em Badges */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {compositionData.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/40 shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-foreground">{item.name}</span>
                    <span className="text-[9px] font-black text-muted-foreground">
                      {((item.value / b1.totalAtivos) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}