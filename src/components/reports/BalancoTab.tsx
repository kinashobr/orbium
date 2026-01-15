"use client";

import React, { useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Scale, Building2, Car, 
  Banknote, Shield, History, CreditCard, ArrowUpRight, 
  Info, LineChart, PieChart, LayoutGrid, Sparkles,
  Zap, Target, Gauge, Activity
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ComparisonDateRanges, formatCurrency } from "@/types/finance";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import { subMonths, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IndicatorRadialCard } from "./IndicatorRadialCard";
import { BalanceSheetList } from "./BalanceSheetList";

// Helper para obter ícone baseado no tipo de conta/item
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

  const finalDate = dateRanges.range1.to || new Date();
  const prevDate = dateRanges.range2.to || subMonths(finalDate, 1);

  const b1 = useMemo(() => {
    const saldos = contasMovimento.reduce((acc, c) => ({ 
      ...acc, 
      [c.id]: calculateBalanceUpToDate(c.id, finalDate, transacoesV2, contasMovimento) 
    }), {} as Record<string, number>);
    
    // Ativos
    const circulantesRaw = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType));
    const invNaoCirculantesRaw = contasMovimento.filter(c => ['renda_fixa', 'cripto', 'objetivo'].includes(c.accountType));
    
    const ativoCirculante = circulantesRaw.reduce((acc, c) => acc + Math.max(0, saldos[c.id] || 0), 0);
    const investimentosNaoCirculantes = invNaoCirculantesRaw.reduce((acc, c) => acc + Math.max(0, saldos[c.id] || 0), 0);
    const imobilizadoFipe = getValorFipeTotal(finalDate);
    const segurosAApropriar = getSegurosAApropriar(finalDate);
    const totalAtivos = ativoCirculante + investimentosNaoCirculantes + imobilizadoFipe + segurosAApropriar;

    // Passivos
    const dividaCartoes = getCreditCardDebt(finalDate);
    const principalLoans12m = calculateLoanPrincipalDueInNextMonths(finalDate, 12);
    const segurosAPagar = getSegurosAPagar(finalDate);
    const passivoCirculante = dividaCartoes + principalLoans12m + segurosAPagar;
    
    const totalLoans = getLoanPrincipalRemaining(finalDate);
    const passivoNaoCirculante = Math.max(0, totalLoans - principalLoans12m);
    const totalPassivos = passivoCirculante + passivoNaoCirculante;

    const pl = totalAtivos - totalPassivos;

    return {
      totalAtivos, ativoCirculante, investimentosNaoCirculantes, imobilizadoFipe, segurosAApropriar,
      totalPassivos, passivoCirculante, passivoNaoCirculante, pl,
      dividaCartoes,
      principalLoans12m,
      segurosAPagar,
      contasCirculantes: circulantesRaw.map(c => ({ ...c, saldo: saldos[c.id] || 0 })),
      contasInvestimentos: invNaoCirculantesRaw.map(c => ({ ...c, saldo: saldos[c.id] || 0 }))
    };
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate, getValorFipeTotal, getSegurosAApropriar, getSegurosAPagar, calculateLoanPrincipalDueInNextMonths, getLoanPrincipalRemaining, getCreditCardDebt, finalDate]);

  // Cálculos de Indicadores
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

  // Variação de PL
  const plAnterior = getPatrimonioLiquido(prevDate);
  const variacaoPlPerc = plAnterior !== 0 ? ((b1.pl - plAnterior) / Math.abs(plAnterior)) * 100 : 0;
  
  // Dados para o gráfico de Evolução Patrimonial (últimos 12 meses)
  const evolutionData = useMemo(() => {
    const now = new Date();
    const result: { mes: string; valor: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const fim = endOfMonth(data);
      const mesLabel = format(data, 'MMM', { locale: ptBR });

      const patrimonioLiquido = getPatrimonioLiquido(fim);
      
      result.push({ 
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), 
        valor: patrimonioLiquido,
      });
    }
    return result;
  }, [getPatrimonioLiquido]);

  // =================================================================
  // PREPARAÇÃO DOS DADOS PARA BalanceSheetList
  // =================================================================

  const ativoItems = useMemo(() => {
    const total = b1.totalAtivos;
    
    const circulanteDetails = b1.contasCirculantes
      .filter(c => c.saldo > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        typeLabel: ACCOUNT_TYPE_LABELS[c.accountType],
        value: c.saldo,
        percent: total > 0 ? (c.saldo / total) * 100 : 0,
        icon: getIconForType(c.accountType),
      }));
      
    if (b1.segurosAApropriar > 0) {
        circulanteDetails.push({
            id: 'seguros_apropriar',
            name: 'Seguros a Apropriar (Prêmio)',
            typeLabel: 'Despesa Pré-Paga',
            value: b1.segurosAApropriar,
            percent: total > 0 ? (b1.segurosAApropriar / total) * 100 : 0,
            icon: getIconForType('seguros_apropriar'),
        });
    }

    const naoCirculanteDetails = b1.contasInvestimentos
      .filter(c => c.saldo > 0)
      .map(c => ({
        id: c.id,
        name: c.name,
        typeLabel: ACCOUNT_TYPE_LABELS[c.accountType],
        value: c.saldo,
        percent: total > 0 ? (c.saldo / total) * 100 : 0,
        icon: getIconForType(c.accountType),
      }));
      
    if (b1.imobilizadoFipe > 0) {
        naoCirculanteDetails.push({
            id: 'imobilizado',
            name: 'Imobilizado (Veículos)',
            typeLabel: 'Avaliação FIPE',
            value: b1.imobilizadoFipe,
            percent: total > 0 ? (b1.imobilizadoFipe / total) * 100 : 0,
            icon: getIconForType('imobilizado'),
        });
    }

    return [
      {
        label: 'Ativo Circulante',
        value: b1.ativoCirculante + b1.segurosAApropriar,
        percent: total > 0 ? ((b1.ativoCirculante + b1.segurosAApropriar) / total) * 100 : 0,
        type: 'circulante' as const,
        details: circulanteDetails,
      },
      {
        label: 'Ativo Não Circulante',
        value: b1.investimentosNaoCirculantes + b1.imobilizadoFipe,
        percent: total > 0 ? ((b1.investimentosNaoCirculantes + b1.imobilizadoFipe) / total) * 100 : 0,
        type: 'nao_circulante' as const,
        details: naoCirculanteDetails,
      },
    ].filter(item => item.value > 0);
  }, [b1]);

  const passivoItems = useMemo(() => {
    const totalPassivoPL = b1.totalAtivos; // Total Passivo + PL deve ser igual ao Total Ativo
    
    const circulanteDetails = [];
    if (b1.dividaCartoes > 0) {
        circulanteDetails.push({
            id: 'cartoes',
            name: 'Saldo Devedor Cartões',
            typeLabel: 'Faturas em aberto',
            value: b1.dividaCartoes,
            percent: totalPassivoPL > 0 ? (b1.dividaCartoes / totalPassivoPL) * 100 : 0,
            icon: getIconForType('cartoes'),
        });
    }
    if (b1.principalLoans12m > 0) {
        circulanteDetails.push({
            id: 'emprestimos_curto',
            name: 'Principal Empréstimos (12 meses)',
            typeLabel: 'Obrigação Curto Prazo',
            value: b1.principalLoans12m,
            percent: totalPassivoPL > 0 ? (b1.principalLoans12m / totalPassivoPL) * 100 : 0,
            icon: getIconForType('emprestimos_curto'),
        });
    }
    if (b1.segurosAPagar > 0) {
        circulanteDetails.push({
            id: 'seguros_pagar',
            name: 'Seguros a Pagar (12 meses)',
            typeLabel: 'Obrigação Curto Prazo',
            value: b1.segurosAPagar,
            percent: totalPassivoPL > 0 ? (b1.segurosAPagar / totalPassivoPL) * 100 : 0,
            icon: getIconForType('seguros_pagar'),
        });
    }
    
    const naoCirculanteDetails = [];
    if (b1.passivoNaoCirculante > 0) {
        naoCirculanteDetails.push({
            id: 'emprestimos_longo',
            name: 'Principal Empréstimos (Longo Prazo)',
            typeLabel: 'Obrigação Longo Prazo',
            value: b1.passivoNaoCirculante,
            percent: totalPassivoPL > 0 ? (b1.passivoNaoCirculante / totalPassivoPL) * 100 : 0,
            icon: getIconForType('emprestimos_longo'),
        });
    }

    const passivoCirculanteTotal = b1.passivoCirculante;
    const passivoNaoCirculanteTotal = b1.passivoNaoCirculante;
    const totalPassivo = passivoCirculanteTotal + passivoNaoCirculanteTotal;

    const sections = [];
    
    if (passivoCirculanteTotal > 0) {
        sections.push({
            label: 'Passivo Circulante',
            value: passivoCirculanteTotal,
            percent: totalPassivoPL > 0 ? (passivoCirculanteTotal / totalPassivoPL) * 100 : 0,
            type: 'circulante' as const,
            details: circulanteDetails,
        });
    }
    
    if (passivoNaoCirculanteTotal > 0) {
        sections.push({
            label: 'Passivo Não Circulante',
            value: passivoNaoCirculanteTotal,
            percent: totalPassivoPL > 0 ? (passivoNaoCirculanteTotal / totalPassivoPL) * 100 : 0,
            type: 'nao_circulante' as const,
            details: naoCirculanteDetails,
        });
    }
    
    // Patrimônio Líquido (PL)
    sections.push({
        label: 'Patrimônio Líquido',
        value: b1.pl,
        percent: totalPassivoPL > 0 ? (b1.pl / totalPassivoPL) * 100 : 0,
        type: 'patrimonio' as const,
    });

    return sections;
  }, [b1]);

  // ItemCard e SmallKpi removidos pois não são mais usados no novo layout

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* SEÇÃO SUPERIOR: PL + INDICADORES PATRIMONIAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Card PL (50% no desktop) */}
        <div className="lg:col-span-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 sm:p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 h-[400px] flex flex-col justify-center group">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent"></div>
             <div className="absolute right-0 top-0 opacity-10 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000">
                <LineChart className="w-[300px] h-[300px] text-primary" />
             </div>

             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest">Consolidado Patrimonial</Badge>
                </div>
                <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Patrimônio Líquido Final</h2>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                   <h3 className="font-display font-extrabold text-5xl sm:text-6xl text-foreground tracking-tighter leading-none tabular-nums">{formatCurrency(b1.pl)}</h3>
                   <Badge className={cn("rounded-xl px-4 py-2 font-black text-xs gap-2 mb-2 w-fit", variacaoPlPerc >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {variacaoPlPerc >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {Math.abs(variacaoPlPerc).toFixed(1)}% evolução
                   </Badge>
                </div>
                <div className="mt-8 flex items-center gap-2">
                   <Sparkles className="w-3.5 h-3.5 text-accent" />
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance Orbium calculada em {format(finalDate, "MM/yyyy")}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Grade de Indicadores (50% no desktop) */}
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <IndicatorRadialCard 
            title="Participação Própria" 
            value={indicadores.equityRatio} 
            label="Particip." 
            unit="%"
            status={indicadores.equityRatio >= 40 ? "success" : "warning"}
            description="Quanto do patrimônio é seu de fato, livre de dívidas."
            formula="Capital Próprio ÷ Total Bens × 100"
            idealRange="Acima de 40%"
          />
          <IndicatorRadialCard 
            title="Índice de Solvência" 
            value={indicadores.liqGeral} 
            label="Solvência" 
            unit="x"
            status={indicadores.liqGeral >= 1.5 ? "success" : "warning"}
            description="Capacidade de pagar todas as dívidas com seus bens."
            formula="Total Bens ÷ Total Dívidas"
            idealRange="Acima de 1.5x"
          />
          <IndicatorRadialCard 
            title="Liquidez de Curto Prazo" 
            value={indicadores.liqCorrente} 
            label="Liquidez" 
            unit="x"
            status={indicadores.liqCorrente >= 1.2 ? "success" : "warning"}
            description="Capacidade de pagar dívidas que vencem em breve."
            formula="Disponível ÷ Dívidas Curto Prazo"
            idealRange="Acima de 1.2x"
          />
          <IndicatorRadialCard 
            title="Grau de Endividamento" 
            value={indicadores.endividamento} 
            label="Dívidas" 
            unit="%"
            status={indicadores.endividamento <= 30 ? "success" : "warning"}
            description="Peso das dívidas no seu patrimônio total."
            formula="(Dívidas ÷ Bens) × 100"
            idealRange="Abaixo de 30%"
          />
          <IndicatorRadialCard 
            title="Cobertura Patrimonial" 
            value={indicadores.assetCoverage} 
            label="Cobert." 
            unit="x"
            status={indicadores.assetCoverage >= 2 ? "success" : "warning"}
            description="Quanto o capital próprio cobre as dívidas."
            formula="Capital Próprio ÷ Total Dívidas"
            idealRange="Acima de 2x"
          />
          <IndicatorRadialCard 
            title="Imobilização do Capital" 
            value={indicadores.fixedAssetEquity} 
            label="Imobiliz." 
            unit="%"
            status={indicadores.fixedAssetEquity <= 60 ? "success" : "warning"}
            description="Quanto do seu patrimônio está preso em bens físicos."
            formula="(Bens Físicos ÷ Capital Próprio) × 100"
            idealRange="Abaixo de 60%"
          />
        </div>
      </div>

      {/* GRID DE INDICADORES TÉCNICOS (RAW VALUES) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total de Bens</p>
            <p className={cn("text-lg font-black tabular-nums", "text-success")}>{formatCurrency(b1.totalAtivos)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Recursos Disponíveis</p>
            <p className={cn("text-lg font-black tabular-nums", "text-success/80")}>{formatCurrency(b1.ativoCirculante)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Investimentos LP</p>
            <p className={cn("text-lg font-black tabular-nums", "text-indigo-500")}>{formatCurrency(b1.investimentosNaoCirculantes)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total de Obrigações</p>
            <p className={cn("text-lg font-black tabular-nums", "text-destructive")}>{formatCurrency(b1.totalPassivos)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Capital Próprio</p>
            <p className={cn("text-lg font-black tabular-nums", "text-primary")}>{formatCurrency(b1.pl)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Variação PL</p>
            <p className={cn("text-lg font-black tabular-nums", b1.pl >= plAnterior ? "text-success" : "text-destructive")}>{formatCurrency(b1.pl - plAnterior)}</p>
         </div>
      </div>

      {/* LEDGER COMPARATIVO (ATIVO VS PASSIVO) - NOVO FORMATO DE LISTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* COLUNA ATIVOS */}
        <BalanceSheetList
            title="ATIVO"
            totalValue={b1.totalAtivos}
            items={ativoItems}
            isAsset={true}
        />

        {/* COLUNA PASSIVOS + PL */}
        <BalanceSheetList
            title="PASSIVO + PL"
            totalValue={b1.totalAtivos} // Total Passivo + PL é igual ao Total Ativo
            items={passivoItems}
            isAsset={false}
            plValue={b1.pl}
        />
      </div>

      {/* EVOLUÇÃO E COMPOSIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="p-2 bg-primary/10 rounded-xl text-primary"><LineChart className="w-5 h-5" /></div>
               <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Evolução Patrimonial</h4>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                     <defs><linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                     <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} tickFormatter={v => `R$ ${v/1000}k`} />
                     <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} formatter={(v: number) => [formatCurrency(v), 'PL']} />
                     <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#plGradient)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft flex flex-col">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="p-2 bg-accent/10 rounded-xl text-accent"><PieChart className="w-5 h-5" /></div>
               <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Composição</h4>
            </div>
            <div className="flex-1 min-h-[240px]">
               <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                     <Pie data={[
                        { name: 'Circulante', value: b1.ativoCirculante },
                        { name: 'Imobilizado', value: b1.imobilizadoFipe },
                        { name: 'Investimentos', value: b1.investimentosNaoCirculantes }
                     ]} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                        <Cell fill="hsl(var(--success))" />
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--accent))" />
                     </Pie>
                     <Tooltip />
                  </RePieChart>
               </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
               {['Circ.', 'Imob.', 'Inv.'].map((l, i) => (
                  <div key={l} className="text-center">
                     <p className="text-[9px] font-black text-muted-foreground uppercase">{l}</p>
                     <div className={cn("h-1 rounded-full mt-1", i === 0 ? "bg-success" : i === 1 ? "bg-primary" : "bg-accent")} />
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}