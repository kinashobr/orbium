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
    
    const fixas = txs.filter(t => {
        const cat = categoriasV2.find(c => c.id === t.categoryId);
        return cat?.nature === 'despesa_fixa';
    }).reduce((a, t) => a + t.amount, 0);

    const imobilizado = getValorFipeTotal(date);

    // Novos indicadores pessoais
    const variaveis = despesas - fixas;
    const parcelas = txs.filter(t => t.operationType === 'pagamento_emprestimo').reduce((a, t) => a + t.amount, 0);
    const rendimentos = txs.filter(t => t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
    const reservaMinima = fixas * 3; // 3 meses de gastos fixos como reserva mínima

    return {
      poupanca: receitas > 0 ? (lucro / receitas) * 100 : 0,
      liqCorrente: passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 0,
      // liqSeca removido - era duplicado de liqCorrente
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
      // Novos indicadores para finanças pessoais
      comprometimentoRenda: receitas > 0 ? ((parcelas + fixas) / receitas) * 100 : 0,
      custoVida: receitas > 0 ? (variaveis / receitas) * 100 : 0,
      capacidadeInvestimento: receitas > 0 && lucro > reservaMinima ? ((lucro - reservaMinima) / receitas) * 100 : 0,
    };
  }, [transacoesV2, getAtivosTotal, getPassivosTotal, contasMovimento, calculateBalanceUpToDate, getCreditCardDebt, getSegurosAPagar, getValorFipeTotal, categoriasV2]);

  const m1 = useMemo(() => calculateMetrics(range1), [calculateMetrics, range1]);
  const m2 = useMemo(() => calculateMetrics(range2), [calculateMetrics, range2]);

  const getTrend = (v1: number, v2: number) => v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : 0;

  const handleSaveIndicator = (indicator: CustomIndicator) => {
    setCustomIndicators(prev => {
      const exists = prev.find(i => i.id === indicator.id);
      if (exists) return prev.map(i => i.id === indicator.id ? indicator : i);
      return [...prev, indicator];
    });
  };

  const handleDeleteIndicator = (id: string) => {
    setCustomIndicators(prev => prev.filter(i => i.id !== id));
  };

  const SectionHeader = ({ title, subtitle, icon: Icon }: any) => (
    <div className="flex items-center justify-between mb-6 px-2">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="font-display font-black text-xl text-foreground uppercase tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  // Verifica se há dados suficientes para calcular o score
  const hasData = useMemo(() => {
    const date = range1.to || new Date();
    const totalAtivos = getAtivosTotal(date);
    const totalPassivos = getPassivosTotal(date);
    const hasTransactions = transacoesV2.length > 0;
    const hasAccounts = contasMovimento.length > 0;
    
    // Considera que há dados se tiver contas ou transações ou ativos/passivos
    return hasTransactions || hasAccounts || totalAtivos > 0 || totalPassivos > 0;
  }, [range1, getAtivosTotal, getPassivosTotal, transacoesV2, contasMovimento]);

  // Cálculo do Score de Saúde Patrimonial (real, não hardcoded)
  const scorePatrimonial = useMemo(() => {
    // Se não há dados, retorna null para indicar que não deve exibir
    if (!hasData) return null;
    
    // Pesos: Liquidez Geral (25%), Endividamento (25%), Taxa Poupança (25%), Meses Sobrevivência (25%)
    const liqScore = Math.min(100, (m1.liqGeral / 2) * 100); // 2x = 100%
    const endivScore = Math.max(0, 100 - m1.endivTotal); // 0% = 100 pontos
    const poupScore = Math.min(100, (m1.poupanca / 30) * 100); // 30% = 100 pontos
    const sobrevScore = Math.min(100, (m1.sobrevivencia / 12) * 100); // 12 meses = 100 pontos
    
    return (liqScore * 0.25) + (endivScore * 0.25) + (poupScore * 0.25) + (sobrevScore * 0.25);
  }, [m1, hasData]);

  return (
    <div className="space-y-16 animate-fade-in-up pb-20">
      {/* DESTAQUE PRINCIPAL: SCORE DE SAÚDE PATRIMONIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 sm:p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 h-[400px] flex flex-col justify-center group">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent"></div>
             <div className="absolute right-0 top-0 opacity-10 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000">
                <LineChart className="w-[300px] h-[300px] text-primary" />
             </div>

             <div className="relative z-10 flex flex-col sm:flex-row items-center gap-10">
                <div className="shrink-0">
                  {scorePatrimonial !== null ? (
                    <RadialGauge 
                      value={scorePatrimonial} 
                      label="Score"
                      status={scorePatrimonial >= 70 ? "success" : scorePatrimonial >= 40 ? "warning" : "danger"}
                      size={220}
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] rounded-full border-4 border-dashed border-muted-foreground/20 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                        <span className="text-xs text-muted-foreground/50 font-medium">Sem dados</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">Saúde Patrimonial</Badge>
                  <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Score de Saúde Financeira</h2>
                  <h3 className="font-display font-extrabold text-4xl text-foreground tracking-tighter leading-tight">
                    {scorePatrimonial === null 
                      ? "Cadastre seus dados" 
                      : scorePatrimonial >= 70 
                        ? "Patrimônio Saudável" 
                        : scorePatrimonial >= 40 
                          ? "Atenção Necessária" 
                          : "Situação Crítica"}
                  </h3>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {scorePatrimonial !== null 
                        ? `Calculado em ${format(range1.to || new Date(), "MM/yyyy")}`
                        : "Adicione contas e transações para calcular"}
                    </span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <IndicatorCard 
            title="Taxa de Economia" 
            value={`${m1.poupanca.toFixed(1)}%`} 
            trend={getTrend(m1.poupanca, m2.poupanca)}
            status={m1.poupanca >= 20 ? "success" : m1.poupanca >= 10 ? "warning" : "danger"}
            icon={ShieldCheck}
            sparklineData={[30, 45, 35, 50, 40, 60, 55]}
            description="Quanto você consegue guardar da sua renda mensal."
            formula="Sobra ÷ Renda × 100"
            idealRange="Acima de 20%"
            className="h-full"
          />
          <IndicatorCard 
            title="Folga Mensal" 
            value={`${m1.margemSeguranca.toFixed(1)}%`} 
            trend={getTrend(m1.margemSeguranca, m2.margemSeguranca)} 
            status={m1.margemSeguranca >= 30 ? "success" : "warning"} 
            icon={Heart}
            sparklineData={[20, 25, 22, 28, 30, 27, 32]}
            description="Quanto da sua renda está livre após pagar contas fixas."
            formula="(Renda - Fixos) ÷ Renda × 100"
            idealRange="Acima de 30%"
          />
          
          {/* Área de Configuração Refinada */}
          <div className="sm:col-span-2 flex items-center justify-between bg-muted/20 px-6 py-4 rounded-[2rem] border border-border/40">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Saudável</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Atenção</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Crítico</span>
              </div>
            </div>
            <Button 
              onClick={() => setShowManagerModal(true)} 
              variant="ghost" 
              size="sm"
              className="rounded-full h-9 gap-2 px-4 font-black text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Settings2 size={14} />
              Configurar
            </Button>
          </div>
        </div>
      </div>

      {/* 1. MEUS INDICADORES (Destaque) */}
      {customIndicators.length > 0 && (
        <section>
          <SectionHeader title="Meus Indicadores" subtitle="Métricas personalizadas" icon={User} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {customIndicators.map(ind => (
              <IndicatorCard 
                key={ind.id}
                title={ind.name} 
                value={ind.format === 'percent' ? '0.0%' : ind.format === 'currency' ? 'R$ 0,00' : '0.0x'} 
                status="neutral"
                icon={LayoutGrid}
                description={ind.description}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. LIQUIDEZ */}
      <section>
        <SectionHeader title="Indicadores de Liquidez" subtitle="Capacidade de pagamento" icon={Wallet} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IndicatorCard 
            title="Liquidez Imediata" 
            value={`${m1.liqCorrente.toFixed(2)}x`} 
            trend={getTrend(m1.liqCorrente, m2.liqCorrente)} 
            status={m1.liqCorrente >= 1.5 ? "success" : "warning"} 
            icon={TrendingUp}
            description="Quantas vezes você consegue pagar suas dívidas de curto prazo com o dinheiro disponível."
            formula="Disponível ÷ Dívidas Curto Prazo"
            idealRange="Acima de 1.5x"
          />
          <IndicatorCard 
            title="Cobertura do Mês" 
            value={`${m1.solvenciaImediata.toFixed(2)}x`} 
            trend={getTrend(m1.solvenciaImediata, m2.solvenciaImediata)} 
            status={m1.solvenciaImediata >= 1 ? "success" : "warning"} 
            icon={Activity}
            description="Se seu saldo em conta cobre as contas do mês."
            formula="Saldo Conta Corrente ÷ Contas do Mês"
            idealRange="Acima de 1x"
          />
          <IndicatorCard 
            title="Índice de Solvência" 
            value={`${m1.liqGeral.toFixed(2)}x`} 
            trend={getTrend(m1.liqGeral, m2.liqGeral)} 
            status={m1.liqGeral >= 2 ? "success" : "warning"} 
            icon={Shield}
            description="Para cada R$1 de dívida, quantos reais você tem em patrimônio."
            formula="Total Bens ÷ Total Dívidas"
            idealRange="Acima de 2x"
          />
        </div>
      </section>

      {/* 3. ENDIVIDAMENTO */}
      <section>
        <SectionHeader title="Indicadores de Endividamento" subtitle="Nível de comprometimento" icon={Scale} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <IndicatorCard 
            title="Nível de Dívidas" 
            value={`${m1.endivTotal.toFixed(1)}%`} 
            trend={getTrend(m1.endivTotal, m2.endivTotal)} 
            status={m1.endivTotal <= 30 ? "success" : "warning"} 
            icon={TrendingDown}
            description="Percentual do seu patrimônio comprometido com dívidas."
            formula="(Dívidas ÷ Bens) × 100"
            idealRange="Abaixo de 30%"
          />
          <IndicatorCard 
            title="Pressão das Dívidas" 
            value={`${m1.dividaPatrimonio.toFixed(1)}%`} 
            trend={getTrend(m1.dividaPatrimonio, m2.dividaPatrimonio)} 
            status={m1.dividaPatrimonio <= 50 ? "success" : "warning"} 
            icon={Target}
            description="Quanto suas dívidas pesam sobre seu patrimônio real."
            formula="(Dívidas ÷ Capital Próprio) × 100"
            idealRange="Abaixo de 50%"
          />
          <IndicatorCard 
            title="Patrimônio em Bens" 
            value={`${m1.imobPL.toFixed(1)}%`} 
            trend={getTrend(m1.imobPL, m2.imobPL)} 
            status={m1.imobPL <= 60 ? "success" : "warning"} 
            icon={Landmark}
            description="Quanto do seu dinheiro está 'preso' em bens como casa e carro."
            formula="(Valor Bens ÷ Capital Próprio) × 100"
            idealRange="Abaixo de 60%"
          />
          <IndicatorCard 
            title="Dívidas de Curto Prazo" 
            value={`${m1.compDivida.toFixed(1)}%`} 
            trend={getTrend(m1.compDivida, m2.compDivida)} 
            status={m1.compDivida <= 40 ? "success" : "warning"} 
            icon={LayoutGrid}
            description="Percentual das dívidas que vencem em até 12 meses."
            formula="(Curto Prazo ÷ Total Dívidas) × 100"
            idealRange="Abaixo de 40%"
          />
        </div>
      </section>

      {/* 4. RENTABILIDADE */}
      <section>
        <SectionHeader title="Indicadores de Rentabilidade" subtitle="Retorno e crescimento" icon={TrendingUp} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <IndicatorCard 
            title="Taxa de Sobra" 
            value={`${m1.margemLiquida.toFixed(1)}%`} 
            trend={getTrend(m1.margemLiquida, m2.margemLiquida)} 
            status={m1.margemLiquida >= 15 ? "success" : "warning"} 
            icon={Sparkles}
            description="De tudo que você ganha, quanto sobra após pagar as contas."
            formula="(Sobra ÷ Renda) × 100"
            idealRange="Acima de 15%"
          />
          <IndicatorCard 
            title="Rentabilidade do Patrimônio" 
            value={`${m1.roa.toFixed(1)}%`} 
            trend={getTrend(m1.roa, m2.roa)} 
            status={m1.roa >= 5 ? "success" : "warning"} 
            icon={BarChart3}
            description="Quanto seu patrimônio está gerando de resultado."
            formula="(Sobra ÷ Total Bens) × 100"
            idealRange="Acima de 5%"
          />
          <IndicatorCard 
            title="Crescimento Real" 
            value={`${m1.roe.toFixed(1)}%`} 
            trend={getTrend(m1.roe, m2.roe)} 
            status={m1.roe >= 10 ? "success" : "warning"} 
            icon={Coins}
            description="Velocidade de crescimento do seu patrimônio líquido."
            formula="(Sobra ÷ Capital Próprio) × 100"
            idealRange="Acima de 10%"
          />
          <IndicatorCard 
            title="Renda Passiva" 
            value={`${m1.liberdade.toFixed(1)}%`} 
            trend={getTrend(m1.liberdade, m2.liberdade)} 
            status={m1.liberdade >= 100 ? "success" : "warning"} 
            icon={Heart}
            description="Quanto dos seus gastos é coberto por rendimentos de investimentos."
            formula="(Rendimentos ÷ Gastos) × 100"
            idealRange="100% = Liberdade Financeira"
          />
        </div>
      </section>

      {/* 5. EFICIÊNCIA */}
      <section>
        <SectionHeader title="Indicadores de Eficiência" subtitle="Otimização de recursos" icon={Gauge} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <IndicatorCard 
            title="Peso dos Fixos" 
            value={`${m1.partFixas.toFixed(1)}%`} 
            trend={getTrend(m1.partFixas, m2.partFixas)} 
            status={m1.partFixas <= 40 ? "success" : "warning"} 
            icon={Minus}
            description="Quanto dos seus gastos são fixos e difíceis de cortar."
            formula="(Fixos ÷ Total Gastos) × 100"
            idealRange="Abaixo de 40%"
          />
          <IndicatorCard 
            title="Taxa de Consumo" 
            value={`${m1.burnRate.toFixed(1)}%`} 
            trend={getTrend(m1.burnRate, m2.burnRate)} 
            status={m1.burnRate <= 80 ? "success" : "warning"} 
            icon={Zap}
            description="Percentual da renda que você consome."
            formula="(Gastos ÷ Renda) × 100"
            idealRange="Abaixo de 80%"
          />
          <IndicatorCard 
            title="Reserva de Emergência" 
            value={`${m1.sobrevivencia.toFixed(1)} meses`} 
            trend={getTrend(m1.sobrevivencia, m2.sobrevivencia)} 
            status={m1.sobrevivencia >= 6 ? "success" : "warning"} 
            icon={Calendar}
            description="Quantos meses você sobrevive sem renda usando suas reservas."
            formula="Disponível ÷ Gastos Mensais"
            idealRange="Acima de 6 meses"
          />
        </div>
      </section>

      {/* 6. INDICADORES PESSOAIS (Novos) */}
      <section>
        <SectionHeader title="Indicadores Pessoais" subtitle="Métricas para o dia a dia" icon={User} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IndicatorCard 
            title="Comprometimento de Renda" 
            value={`${m1.comprometimentoRenda.toFixed(1)}%`} 
            trend={getTrend(m1.comprometimentoRenda, m2.comprometimentoRenda)} 
            status={m1.comprometimentoRenda <= 50 ? "success" : m1.comprometimentoRenda <= 70 ? "warning" : "danger"} 
            icon={Target}
            description="Quanto da sua renda está comprometida com parcelas e contas fixas."
            formula="(Parcelas + Fixos) ÷ Renda × 100"
            idealRange="Abaixo de 50%"
          />
          <IndicatorCard 
            title="Custo de Vida" 
            value={`${m1.custoVida.toFixed(1)}%`} 
            trend={getTrend(m1.custoVida, m2.custoVida)} 
            status={m1.custoVida <= 30 ? "success" : m1.custoVida <= 50 ? "warning" : "danger"} 
            icon={Wallet}
            description="Gastos variáveis com estilo de vida em relação à renda."
            formula="Variáveis ÷ Renda × 100"
            idealRange="Abaixo de 30%"
          />
          <IndicatorCard 
            title="Capacidade de Investimento" 
            value={`${m1.capacidadeInvestimento.toFixed(1)}%`} 
            trend={getTrend(m1.capacidadeInvestimento, m2.capacidadeInvestimento)} 
            status={m1.capacidadeInvestimento >= 15 ? "success" : m1.capacidadeInvestimento >= 5 ? "warning" : "danger"} 
            icon={Plus}
            description="Quanto você pode investir após garantir a reserva mínima."
            formula="(Sobra - Reserva Mínima) ÷ Renda × 100"
            idealRange="Acima de 15%"
          />
        </div>
      </section>

      <IndicatorManagerModal 
        open={showManagerModal} 
        onOpenChange={setShowManagerModal} 
        indicators={customIndicators}
        onSave={handleSaveIndicator}
        onDelete={handleDeleteIndicator}
      />
    </div>
  );
}