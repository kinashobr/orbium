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
import { IndicatorManagerModal } from "./IndicatorManagerModal";
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
    getCreditCardDebt,
    categoriasV2
  } = useFinance();
  
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [customIndicators, setCustomIndicators] = useState<CustomIndicator[]>([]);

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
    
    const ativoCirculante = contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType))
      .reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);
    
    const disponibilidades = contasMovimento
      .filter(c => c.accountType === 'corrente')
      .reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);

    const passivoCirculante = getCreditCardDebt(date) + getSegurosAPagar(date);
    const receitas = txs.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
    const despesas = txs.filter(t => t.flow === 'out').reduce((a, t) => a + t.amount, 0);
    const lucro = receitas - despesas;
    const fixas = txs.filter(t => categoriasV2.find(c => c.id === t.categoryId)?.nature === 'despesa_fixa').reduce((a, t) => a + t.amount, 0);
    const imobilizado = getValorFipeTotal(date);
    const variaveis = despesas - fixas;
    const parcelas = txs.filter(t => t.operationType === 'pagamento_emprestimo').reduce((a, t) => a + t.amount, 0);
    const rendimentos = txs.filter(t => t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
    const reservaMinima = fixas * 3;

    return {
      poupanca: receitas > 0 ? (lucro / receitas) * 100 : 0,
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
    };
  }, [transacoesV2, getAtivosTotal, getPassivosTotal, contasMovimento, calculateBalanceUpToDate, getCreditCardDebt, getSegurosAPagar, getValorFipeTotal, categoriasV2]);

  const m1 = useMemo(() => calculateMetrics(range1), [calculateMetrics, range1]);
  const m2 = useMemo(() => calculateMetrics(range2), [calculateMetrics, range2]);
  const getTrend = (v1: number, v2: number) => v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : 0;

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
    const liqScore = Math.min(100, (m1.liqGeral / 2) * 100);
    const endivScore = Math.max(0, 100 - m1.endivTotal);
    const poupScore = Math.min(100, (m1.poupanca / 30) * 100);
    const sobrevScore = Math.min(100, (m1.sobrevivencia / 12) * 100);
    return (liqScore * 0.25) + (endivScore * 0.25) + (poupScore * 0.25) + (sobrevScore * 0.25);
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
          <IndicatorCard title="Taxa de Economia" value={`${m1.poupanca.toFixed(1)}%`} trend={getTrend(m1.poupanca, m2.poupanca)} status={m1.poupanca >= 20 ? "success" : m1.poupanca >= 10 ? "warning" : "danger"} icon={ShieldCheck} />
          <IndicatorCard title="Folga Mensal" value={`${m1.margemSeguranca.toFixed(1)}%`} trend={getTrend(m1.margemSeguranca, m2.margemSeguranca)} status={m1.margemSeguranca >= 30 ? "success" : "warning"} icon={Heart} />
          <div className="sm:col-span-2 flex flex-col sm:flex-row items-center justify-between bg-muted/20 px-6 py-4 rounded-[2rem] border border-border/40 gap-4">
            <div className="flex gap-4 sm:gap-6 shrink-0">{[{ c: 'bg-success', l: 'Saudável' }, { c: 'bg-warning', l: 'Atenção' }, { c: 'bg-destructive', l: 'Crítico' }].map((s, idx) => (<div key={idx} className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", s.c)} /><span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.l}</span></div>))}</div>
            <button onClick={() => setShowManagerModal(true)} className="rounded-full h-9 gap-2 px-5 font-black text-[10px] uppercase tracking-widest bg-card border border-border/60 flex items-center"><Settings2 size={14} className="mr-2" /> Ajustar</button>
          </div>
        </div>
      </div>

      <section className="space-y-8">
        <SectionHeader title="Gestão de Liquidez" subtitle="Capacidade de Pagamento" icon={Wallet} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <IndicatorCard title="Liquidez Corrente" value={`${m1.liqCorrente.toFixed(2)}x`} trend={getTrend(m1.liqCorrente, m2.liqCorrente)} status={m1.liqCorrente >= 1.5 ? "success" : "warning"} icon={TrendingUp} />
          <IndicatorCard title="Cobertura Mensal" value={`${m1.solvenciaImediata.toFixed(2)}x`} trend={getTrend(m1.solvenciaImediata, m2.solvenciaImediata)} status={m1.solvenciaImediata >= 1 ? "success" : "warning"} icon={Activity} />
          <IndicatorCard title="Solvência Geral" value={`${m1.liqGeral.toFixed(2)}x`} trend={getTrend(m1.liqGeral, m2.liqGeral)} status={m1.liqGeral >= 2 ? "success" : "warning"} icon={Shield} />
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader title="Endividamento" subtitle="Comprometimento do Patrimônio" icon={Scale} />
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">
          <IndicatorCard title="Dívida / Ativo" value={`${m1.endivTotal.toFixed(1)}%`} status={m1.endivTotal <= 30 ? "success" : "warning"} icon={TrendingDown} />
          <IndicatorCard title="Dívida / PL" value={`${m1.dividaPatrimonio.toFixed(1)}%`} status={m1.dividaPatrimonio <= 50 ? "success" : "warning"} icon={Target} />
          <IndicatorCard title="Imobilização" value={`${m1.imobPL.toFixed(1)}%`} status={m1.imobPL <= 60 ? "success" : "warning"} icon={Landmark} />
          <IndicatorCard title="Curto Prazo" value={`${m1.compDivida.toFixed(1)}%`} status={m1.compDivida <= 40 ? "success" : "warning"} icon={LayoutGrid} />
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeader title="Rentabilidade & Eficiência" subtitle="Performance Financeira" icon={TrendingUp} />
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">
          <IndicatorCard title="Taxa de Sobra" value={`${m1.margemLiquida.toFixed(1)}%`} status={m1.margemLiquida >= 15 ? "success" : "warning"} icon={Sparkles} />
          <IndicatorCard title="Retorno Ativos" value={`${m1.roa.toFixed(1)}%`} status={m1.roa >= 5 ? "success" : "warning"} icon={BarChart3} />
          <IndicatorCard title="Burn Rate" value={`${m1.burnRate.toFixed(1)}%`} status={m1.burnRate <= 80 ? "success" : "warning"} icon={Zap} />
          <IndicatorCard title="Reserva (Meses)" value={`${m1.sobrevivencia.toFixed(1)}m`} status={m1.sobrevivencia >= 6 ? "success" : "warning"} icon={Calendar} />
        </div>
      </section>

      <IndicatorManagerModal open={showManagerModal} onOpenChange={setShowManagerModal} indicators={customIndicators} onSave={handleSaveIndicator} onDelete={handleDeleteIndicator} />
    </div>
  );
}