"use client";

import { useMemo, useState, useCallback } from "react";
import { 
  Activity, ShieldCheck, Zap, Scale, Sparkles, TrendingUp, 
  TrendingDown, Target, Shield, Gauge, Heart, Wallet, 
  Coins, Landmark, BarChart3, Plus, LayoutGrid, User, Minus, Calendar,
  Settings2, LineChart
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { ComparisonDateRanges, DateRange, formatCurrency } from "@/types/finance";
import { startOfDay, endOfDay, isWithinInterval, subMonths, format } from "date-fns";
import { parseDateLocal, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { IndicatorCard, IndicatorStatus } from "./IndicatorCard";
import { IndicatorManagerModal, DefaultIndicatorDef, DefaultIndicatorOverride } from "./IndicatorManagerModal";
import { RadialGauge } from "./RadialGauge";
import { Button } from "@/components/ui/button";

interface CustomIndicator {
  id: string;
  name: string;
  format: string;
  formula: string;
  goal: number;
  alert: number;
  logic: "higher" | "lower";
  description: string;
}

export function IndicadoresTab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { 
    transacoesV2, 
    getAtivosTotal, 
    getPassivosTotal, 
    contasMovimento, 
    calculateBalanceUpToDate,
    getValorFipeTotal,
    getSegurosAPagar,
    getSegurosAApropriar,
    getCreditCardDebt,
    categoriasV2,
    billsTracker,
    calculateLoanPrincipalDueInNextMonths,
  } = useFinance();
  
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [customIndicators, setCustomIndicators] = useState<CustomIndicator[]>([]);
  
  const STORAGE_KEY_OVERRIDES = 'fin_indicator_overrides_v1';
  const [defaultOverrides, setDefaultOverrides] = useState<Record<string, DefaultIndicatorOverride>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_OVERRIDES) || '{}'); } catch { return {}; }
  });

  const handleSaveDefaultOverride = (id: string, override: DefaultIndicatorOverride) => {
    setDefaultOverrides(prev => {
      const next = { ...prev, [id]: override };
      localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(next));
      return next;
    });
  };

  const DEFAULT_INDICATORS: DefaultIndicatorDef[] = [
    { id: 'taxa_poupanca', name: 'Taxa de Poupança', formula: '(Receitas - Despesas) ÷ Receitas × 100', description: 'Percentual da renda que sobrou após despesas.', idealRange: '>= 20%', logic: 'higher', goal: 20, alert: 10 },
    { id: 'folga_financeira', name: 'Folga Financeira Mensal', formula: '(Receitas - Fixas) ÷ Receitas × 100', description: 'Parcela da renda livre após custos fixos.', idealRange: '>= 30%', logic: 'higher', goal: 30, alert: 15 },
    { id: 'liquidez_corrente', name: 'Liquidez Corrente', formula: 'Ativo Circulante ÷ Passivo Circulante', description: 'Cobertura do passivo circulante pelo ativo circulante.', idealRange: '>= 1,5x', logic: 'higher', goal: 1.5, alert: 1 },
    { id: 'cobertura_despesas', name: 'Cobertura de Despesas', formula: 'Disponibilidades ÷ Passivo Circulante', description: 'Capacidade de cobrir passivo com disponibilidades.', idealRange: '>= 1,0x', logic: 'higher', goal: 1, alert: 0.5 },
    { id: 'indice_solvencia', name: 'Índice de Solvência', formula: 'Ativos Totais ÷ Passivos Totais', description: 'Relação entre ativos e passivos totais.', idealRange: '>= 2,0x', logic: 'higher', goal: 2, alert: 1 },
    { id: 'sobra_caixa', name: 'Sobra em Caixa (%)', formula: '(Receitas - Despesas - Parcelas) ÷ Receitas × 100', description: 'Percentual da renda que sobra após despesas e parcelas.', idealRange: '>= 10%', logic: 'higher', goal: 10, alert: 0 },
    { id: 'alavancagem', name: 'Alavancagem', formula: 'Passivos Totais ÷ Ativos Totais × 100', description: 'Percentual dos ativos financiado por dívidas.', idealRange: '<= 30%', logic: 'lower', goal: 30, alert: 50 },
    { id: 'divida_patrimonio', name: 'Dívida sobre Patrimônio', formula: 'Passivos Totais ÷ Patrimônio Líquido × 100', description: 'Dívidas em relação ao patrimônio líquido.', idealRange: '<= 50%', logic: 'lower', goal: 50, alert: 80 },
    { id: 'imobilizacao', name: 'Imobilização do Patrimônio', formula: 'Imobilizado ÷ Patrimônio Líquido × 100', description: 'Percentual do PL alocado em bens imobilizados.', idealRange: '<= 60%', logic: 'lower', goal: 60, alert: 80 },
    { id: 'peso_curto_prazo', name: 'Peso do Curto Prazo', formula: 'Passivo Circulante ÷ Passivos Totais × 100', description: 'Proporção de dívidas de curto prazo.', idealRange: '<= 40%', logic: 'lower', goal: 40, alert: 60 },
    { id: 'margem_seguranca', name: 'Margem de Segurança', formula: '(Receitas - Despesas) ÷ Receitas × 100', description: 'Resultado do período sobre receitas.', idealRange: '>= 15%', logic: 'higher', goal: 15, alert: 5 },
    { id: 'roa', name: 'ROA (Retorno sobre Ativos)', formula: 'Lucro ÷ Ativos Totais × 100', description: 'Resultado em relação aos ativos.', idealRange: '>= 5%', logic: 'higher', goal: 5, alert: 2 },
    { id: 'taxa_consumo', name: 'Taxa de Consumo', formula: 'Despesas ÷ Receitas × 100', description: 'Percentual da renda consumido por despesas.', idealRange: '<= 80%', logic: 'lower', goal: 80, alert: 95 },
    { id: 'reserva_emergencia', name: 'Reserva de Emergência', formula: 'Ativo Circulante ÷ Custos Fixos', description: 'Meses de custos fixos cobertos pelo ativo circulante.', idealRange: '>= 6 meses', logic: 'higher', goal: 6, alert: 3 },
  ];

  const handleSaveIndicator = (indicator: CustomIndicator) => {
    setCustomIndicators(prev => {
      const exists = prev.find(i => i.id === indicator.id);
      if (exists) {
        return prev.map(i => i.id === indicator.id ? indicator : i);
      }
      return [...prev, indicator];
    });
  };

  const handleDeleteIndicator = (id: string) => {
    setCustomIndicators(prev => prev.filter(i => i.id !== id));
  };

  const { range1, range2 } = dateRanges;

  const calculateMetrics = useCallback((range: DateRange) => {
    const date = range.to || new Date();
    const from = range.from ? startOfDay(range.from) : new Date(0);
    const to = range.to ? endOfDay(range.to) : new Date();

    const txs = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return isWithinInterval(d, { start: from, end: to });
      } catch { return false; }
    });

    const totalAtivos = getAtivosTotal(date);
    const totalPassivos = getPassivosTotal(date);
    const pl = totalAtivos - totalPassivos;
    
    // Ativo Circulante: contas CP + Seguros a Apropriar
    const ativoCirculanteSaldos = contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType) || (c.accountTerm === 'curto_prazo' && ['renda_fixa', 'objetivo'].includes(c.accountType)))
      .reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);
    const ativoCirculante = ativoCirculanteSaldos + getSegurosAApropriar(date);
    
    // Disponibilidades: corrente + poupança + reserva + renda fixa CP + objetivo CP
    const disponibilidades = contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType) || (c.accountTerm === 'curto_prazo' && ['renda_fixa', 'objetivo'].includes(c.accountType)))
      .reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);

    // Compras parceladas pendentes
    const comprasParceladasPendentes = billsTracker
      .filter(b => b.sourceType === 'purchase_installment' && !b.isPaid && !b.isExcluded)
      .reduce((a, b) => a + b.expectedAmount, 0);

    // Passivo Circulante: cartões + seguros a pagar + principal 12m + compras parceladas
    const passivoCirculante = getCreditCardDebt(date) + getSegurosAPagar(date) + calculateLoanPrincipalDueInNextMonths(date, 12) + comprasParceladasPendentes;
    
    const receitas = txs.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
    // Despesas: apenas operações que são despesas reais (não movimentações patrimoniais)
    const despesas = txs.filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo').reduce((a, t) => a + t.amount, 0);
    const lucro = receitas - despesas;
    const fixas = txs.filter(t => categoriasV2.find(c => c.id === t.categoryId)?.nature === 'despesa_fixa').reduce((a, t) => a + t.amount, 0);
    const imobilizado = getValorFipeTotal(date);
    const variaveis = despesas - fixas;
    // Parcelas: empréstimos + seguros + compras parceladas pagas no período
    const parcelasEmprestimo = txs.filter(t => t.operationType === 'pagamento_emprestimo').reduce((a, t) => a + t.amount, 0);
    const parcelasSeguroECompras = billsTracker
      .filter(b => ['insurance_installment', 'purchase_installment'].includes(b.sourceType || '') && b.isPaid && b.paymentDate)
      .filter(b => {
        try {
          const d = parseDateLocal(b.paymentDate!);
          return isWithinInterval(d, { start: from, end: to });
        } catch { return false; }
      })
      .reduce((a, b) => a + b.expectedAmount, 0);
    const parcelas = parcelasEmprestimo + parcelasSeguroECompras;
    const rendimentos = txs.filter(t => t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
    const reservaMinima = fixas * 3;

    return {
      poupanca: receitas > 0 ? (lucro / receitas) * 100 : 0,
      sobraCaixa: receitas > 0 ? ((lucro - parcelas) / receitas) * 100 : 0,
      liqCorrente: passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 0,
      solvenciaImediata: passivoCirculante > 0 ? disponibilidades / passivoCirculante : 0,
      liqGeral: totalPassivos > 0 ? totalAtivos / totalPassivos : 0,
      endivTotal: totalAtivos > 0 ? (totalPassivos / totalAtivos) * 100 : 0,
      dividaPatrimonio: pl > 0 ? (totalPassivos / pl) * 100 : 0,
      imobPL: pl > 0 ? (imobilizado / pl) * 100 : 0,
      compDivida: totalPassivos > 0 ? (passivoCirculante / totalPassivos) * 100 : 0,
      margemLiquida: receitas > 0 ? (lucro / receitas) * 100 : 0,
      roa: totalAtivos > 0 ? (lucro / totalAtivos) * 100 : 0,
      roe: pl > 0 ? (lucro / pl) * 100 : 0,
      liberdade: despesas > 0 ? (rendimentos / despesas) * 100 : 0,
      partFixas: despesas > 0 ? (fixas / despesas) * 100 : 0,
      burnRate: receitas > 0 ? (despesas / receitas) * 100 : 0,
      margemSeguranca: receitas > 0 ? ((receitas - fixas) / receitas) * 100 : 0,
      sobrevivencia: fixas > 0 ? ativoCirculante / fixas : 0,
      comprometimentoRenda: receitas > 0 ? ((parcelas + fixas) / receitas) * 100 : 0,
      custoVida: receitas > 0 ? (variaveis / receitas) * 100 : 0,
      capacidadeInvestimento: receitas > 0 && lucro > reservaMinima ? ((lucro - reservaMinima) / receitas) * 100 : 0,
      // Raw values for formula display
      raw: { totalAtivos, totalPassivos, pl, ativoCirculante, disponibilidades, passivoCirculante, receitas, despesas, lucro, fixas, imobilizado, variaveis, parcelas, rendimentos, reservaMinima },
    };
  }, [transacoesV2, getAtivosTotal, getPassivosTotal, contasMovimento, calculateBalanceUpToDate, getCreditCardDebt, getSegurosAPagar, getSegurosAApropriar, getValorFipeTotal, categoriasV2, billsTracker, calculateLoanPrincipalDueInNextMonths]);

  const m1 = useMemo(() => calculateMetrics(range1), [calculateMetrics, range1]);
  const m2 = useMemo(() => calculateMetrics(range2), [calculateMetrics, range2]);
  const getTrend = (v1: number, v2: number) => v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : 0;

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const r = m1.raw;

  const SectionHeader = ({ title, subtitle, icon: Icon }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 px-2 gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm shrink-0"><Icon size={24} /></div>
        <div>
          <h3 className="font-display font-black text-xl text-foreground uppercase tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  const hasData = useMemo(() => {
    const date = range1.to || new Date();
    return transacoesV2.length > 0 || getAtivosTotal(date) > 0;
  }, [range1, getAtivosTotal, transacoesV2]);

  const scorePatrimonial = useMemo(() => {
    if (!hasData) return null;
    const clamp01 = (n: number) => Math.min(100, Math.max(0, n));

    const liqScore = clamp01((m1.liqGeral / 2) * 100);
    const endivScore = clamp01(100 - m1.endivTotal);
    const poupScore = clamp01((m1.poupanca / 30) * 100);
    const sobrevScore = clamp01((m1.sobrevivencia / 12) * 100);

    const score = (liqScore * 0.25) + (endivScore * 0.25) + (poupScore * 0.25) + (sobrevScore * 0.25);
    return clamp01(score);
  }, [m1, hasData]);

  return (
    <div className="space-y-12 lg:space-y-16 animate-fade-in-up pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-10">
        <div className="col-span-12 xl:col-span-6">
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-white rounded-[40px] p-8 lg:p-10 shadow-soft relative overflow-hidden border border-white/5 h-[400px] flex flex-col justify-center group transition-all">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent"></div>
             <div className="absolute right-0 top-0 opacity-10 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000">
                <Activity className="w-[300px] h-[300px] text-primary" />
             </div>
             
             <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
                <div className="shrink-0 scale-90 sm:scale-100">
                  {scorePatrimonial !== null ? (
                    <RadialGauge 
                      value={scorePatrimonial} 
                      label="Score" 
                      status={scorePatrimonial >= 70 ? "success" : scorePatrimonial >= 40 ? "warning" : "danger"} 
                      size={180} 
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
                      <Activity className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <Badge className="bg-primary/20 text-primary-foreground border-none font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">Saúde Patrimonial</Badge>
                  <h2 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em]">Score Consolidado</h2>
                  <h3 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tighter leading-tight">
                    {scorePatrimonial === null ? "Aguardando Dados" : scorePatrimonial >= 70 ? "Patrimônio Blindado" : scorePatrimonial >= 40 ? "Ajuste Recomendado" : "Alerta Estrutural"}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Análise de Risco Orbium</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
        <div className="col-span-12 xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <IndicatorCard 
            title="Taxa de Poupança" 
            value={hasData ? `${m1.poupanca.toFixed(1)}%` : "—"} 
            trend={hasData ? getTrend(m1.poupanca, m2.poupanca) : undefined} 
            status={!hasData ? "no-data" : m1.poupanca >= 20 ? "success" : m1.poupanca >= 10 ? "warning" : "danger"} 
            icon={ShieldCheck} 
            description="Percentual da renda do período que sobrou após todas as despesas."
            formula="(Receitas - Despesas) ÷ Receitas × 100"
            formulaValues={hasData ? `(${fmt(r.receitas)} - ${fmt(r.despesas)}) ÷ ${fmt(r.receitas)} × 100` : undefined}
            idealRange={">= 20%"}
          />
          <IndicatorCard 
            title="Folga Financeira Mensal" 
            value={hasData ? `${m1.margemSeguranca.toFixed(1)}%` : "—"} 
            trend={hasData ? getTrend(m1.margemSeguranca, m2.margemSeguranca) : undefined} 
            status={!hasData ? "no-data" : m1.margemSeguranca >= 30 ? "success" : "warning"} 
            icon={Heart} 
            description="Parcela da renda que permanece livre após pagar os custos fixos."
            formula="(Receitas - Fixas) ÷ Receitas × 100"
            formulaValues={hasData ? `(${fmt(r.receitas)} - ${fmt(r.fixas)}) ÷ ${fmt(r.receitas)} × 100` : undefined}
            idealRange={">= 30%"}
          />
          <div className="sm:col-span-2 flex flex-col sm:flex-row items-center justify-between bg-muted/20 px-6 py-4 rounded-[2rem] border border-border/40 gap-4">
            <div className="flex gap-4 sm:gap-6 shrink-0">{[{ c: 'bg-success', l: 'Saudável' }, { c: 'bg-warning', l: 'Atenção' }, { c: 'bg-destructive', l: 'Crítico' }].map((s, idx) => (<div key={idx} className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", s.c)} /><span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.l}</span></div>))}</div>
            <button onClick={() => setShowManagerModal(true)} className="rounded-full h-9 gap-2 px-5 font-black text-[10px] uppercase tracking-widest bg-card border border-border/60 flex items-center"><Settings2 size={14} className="mr-2" /> Ajustar</button>
          </div>
        </div>
      </div>

      <section className="space-y-8">
        <SectionHeader title="Gestão de Liquidez" subtitle="Capacidade de Pagamento" icon={Wallet} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <IndicatorCard 
            title="Liquidez Corrente" 
            value={hasData ? `${m1.liqCorrente.toFixed(2)}x` : "—"} 
            trend={hasData ? getTrend(m1.liqCorrente, m2.liqCorrente) : undefined} 
            status={!hasData ? "no-data" : m1.liqCorrente >= 1.5 ? "success" : "warning"} 
            icon={TrendingUp} 
            description="Quanto do ativo circulante cobre o passivo circulante."
            formula="Ativo Circulante ÷ Passivo Circulante"
            formulaValues={hasData ? `${fmt(r.ativoCirculante)} ÷ ${fmt(r.passivoCirculante)}` : undefined}
            idealRange={">= 1,5x"}
          />
          <IndicatorCard 
            title="Cobertura de Despesas" 
            value={hasData ? `${m1.solvenciaImediata.toFixed(2)}x` : "—"} 
            trend={hasData ? getTrend(m1.solvenciaImediata, m2.solvenciaImediata) : undefined} 
            status={!hasData ? "no-data" : m1.solvenciaImediata >= 1 ? "success" : "warning"} 
            icon={Activity} 
            description="Capacidade de cobrir o passivo circulante apenas com disponibilidades."
            formula="Disponibilidades ÷ Passivo Circulante"
            formulaValues={hasData ? `${fmt(r.disponibilidades)} ÷ ${fmt(r.passivoCirculante)}` : undefined}
            idealRange={">= 1,0x"}
          />
          <IndicatorCard 
            title="Índice de Solvência" 
            value={hasData ? `${m1.liqGeral.toFixed(2)}x` : "—"} 
            trend={hasData ? getTrend(m1.liqGeral, m2.liqGeral) : undefined} 
            status={!hasData ? "no-data" : m1.liqGeral >= 2 ? "success" : "warning"} 
            icon={Shield} 
            description="Relação entre ativos totais e passivos totais."
            formula="Ativos Totais ÷ Passivos Totais"
            formulaValues={hasData ? `${fmt(r.totalAtivos)} ÷ ${fmt(r.totalPassivos)}` : undefined}
            idealRange={">= 2,0x"}
          />
          <IndicatorCard
            title="Sobra em Caixa (%)"
            value={hasData ? `${m1.sobraCaixa.toFixed(1)}%` : "—"}
            trend={hasData ? getTrend(m1.sobraCaixa, m2.sobraCaixa) : undefined}
            status={!hasData ? "no-data" : m1.sobraCaixa >= 10 ? "success" : m1.sobraCaixa >= 0 ? "warning" : "danger"}
            icon={Coins}
            description="Percentual da renda que sobra após despesas e parcelas do período."
            formula="(Receitas - Despesas - Parcelas) ÷ Receitas × 100"
            formulaValues={hasData ? `(${fmt(r.receitas)} - ${fmt(r.despesas)} - ${fmt(r.parcelas)}) ÷ ${fmt(r.receitas)} × 100` : undefined}
            idealRange={">= 10%"}
          />
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader title="Endividamento" subtitle="Comprometimento do Patrimônio" icon={Scale} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <IndicatorCard 
            title="Alavancagem" 
            value={hasData ? `${m1.endivTotal.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.endivTotal <= 30 ? "success" : "warning"} 
            icon={TrendingDown} 
            description="Percentual dos ativos financiado por capital de terceiros (dívidas)."
            formula="Passivos Totais ÷ Ativos Totais × 100"
            formulaValues={hasData ? `${fmt(r.totalPassivos)} ÷ ${fmt(r.totalAtivos)} × 100` : undefined}
            idealRange={"<= 30%"}
          />
          <IndicatorCard 
            title="Dívida sobre Patrimônio" 
            value={hasData ? `${m1.dividaPatrimonio.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.dividaPatrimonio <= 50 ? "success" : "warning"} 
            icon={Target} 
            description="Quanto as dívidas representam em relação ao patrimônio líquido."
            formula="Passivos Totais ÷ Patrimônio Líquido × 100"
            formulaValues={hasData ? `${fmt(r.totalPassivos)} ÷ ${fmt(r.pl)} × 100` : undefined}
            idealRange={"<= 50%"}
          />
          <IndicatorCard 
            title="Imobilização do Patrimônio" 
            value={hasData ? `${m1.imobPL.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.imobPL <= 60 ? "success" : "warning"} 
            icon={Landmark} 
            description="Percentual do patrimônio líquido alocado em bens imobilizados."
            formula="Imobilizado ÷ Patrimônio Líquido × 100"
            formulaValues={hasData ? `${fmt(r.imobilizado)} ÷ ${fmt(r.pl)} × 100` : undefined}
            idealRange={"<= 60%"}
          />
          <IndicatorCard 
            title="Peso do Curto Prazo" 
            value={hasData ? `${m1.compDivida.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.compDivida <= 40 ? "success" : "warning"} 
            icon={LayoutGrid} 
            description="Proporção das dívidas que vence no curto prazo em relação ao total."
            formula="Passivo Circulante ÷ Passivos Totais × 100"
            formulaValues={hasData ? `${fmt(r.passivoCirculante)} ÷ ${fmt(r.totalPassivos)} × 100` : undefined}
            idealRange={"<= 40%"}
          />
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader title="Rentabilidade & Eficiência" subtitle="Performance Financeira" icon={TrendingUp} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <IndicatorCard 
            title="Margem de Segurança" 
            value={hasData ? `${m1.margemLiquida.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.margemLiquida >= 15 ? "success" : "warning"} 
            icon={Sparkles} 
            description="Percentual do período que ficou como resultado após despesas."
            formula="(Receitas - Despesas) ÷ Receitas × 100"
            formulaValues={hasData ? `(${fmt(r.receitas)} - ${fmt(r.despesas)}) ÷ ${fmt(r.receitas)} × 100` : undefined}
            idealRange={">= 15%"}
          />
          <IndicatorCard 
            title="ROA (Retorno sobre Ativos)" 
            value={hasData ? `${m1.roa.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.roa >= 5 ? "success" : "warning"} 
            icon={BarChart3} 
            description="Resultado do período em relação ao total de ativos."
            formula="Lucro ÷ Ativos Totais × 100"
            formulaValues={hasData ? `${fmt(r.lucro)} ÷ ${fmt(r.totalAtivos)} × 100` : undefined}
            idealRange={">= 5%"}
          />
          <IndicatorCard 
            title="Taxa de Consumo" 
            value={hasData ? `${m1.burnRate.toFixed(1)}%` : "—"} 
            status={!hasData ? "no-data" : m1.burnRate <= 80 ? "success" : "warning"} 
            icon={Zap} 
            description="Percentual da renda consumido por despesas no período."
            formula="Despesas ÷ Receitas × 100"
            formulaValues={hasData ? `${fmt(r.despesas)} ÷ ${fmt(r.receitas)} × 100` : undefined}
            idealRange={"<= 80%"}
          />
          <IndicatorCard 
            title="Reserva de Emergência" 
            value={hasData ? `${m1.sobrevivencia.toFixed(1)}m` : "—"} 
            status={!hasData ? "no-data" : m1.sobrevivencia >= 6 ? "success" : "warning"} 
            icon={Calendar} 
            description="Quantos meses de custos fixos o ativo circulante consegue cobrir."
            formula="Ativo Circulante ÷ Custos Fixos"
            formulaValues={hasData ? `${fmt(r.ativoCirculante)} ÷ ${fmt(r.fixas)}` : undefined}
            idealRange={">= 6 meses"}
          />
        </div>
      </section>

      <IndicatorManagerModal 
        open={showManagerModal} 
        onOpenChange={setShowManagerModal} 
        indicators={customIndicators} 
        onSave={handleSaveIndicator} 
        onDelete={handleDeleteIndicator}
        defaultIndicators={DEFAULT_INDICATORS}
        defaultOverrides={defaultOverrides}
        onSaveDefaultOverride={handleSaveDefaultOverride}
      />
    </div>
  );
}