"use client";

import { useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { CockpitCards } from "@/components/dashboard/CockpitCards";
import { MovimentacoesRelevantes } from "@/components/dashboard/MovimentacoesRelevantes";
import { AcompanhamentoAtivos } from "@/components/dashboard/AcompanhamentoAtivos";
import { SaudeFinanceira } from "@/components/dashboard/SaudeFinanceira";
import { FluxoCaixaHeatmap } from "@/components/dashboard/FluxoCaixaHeatmap";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges, TransacaoCompleta } from "@/types/finance";
import { 
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Sparkles,
  LineChart,
  Info,
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, subMonths, endOfMonth } from "date-fns";
import { parseDateLocal, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Index = () => {
  const { 
    transacoesV2,
    contasMovimento,
    veiculos,
    getAtivosTotal,
    getPassivosTotal,
    getPatrimonioLiquido,
    calculateBalanceUpToDate,
    dateRanges,
    setDateRanges,
  } = useFinance();

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  const filterTransactionsByRange = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return transacoesV2;
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    return transacoesV2.filter(t => {
      try {
        const transactionDate = parseDateLocal(t.date);
        return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
      } catch {
        return false;
      }
    });
  }, [transacoesV2]);

  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(dateRanges.range1), [filterTransactionsByRange, dateRanges.range1]);

  const metricasPatrimoniais = useMemo(() => {
    const end1 = dateRanges.range1.to;
    const end2 = dateRanges.range2.to;

    const ativos1 = getAtivosTotal(end1);
    const passivos1 = getPassivosTotal(end1);
    const pl1 = ativos1 - passivos1;

    const ativos2 = getAtivosTotal(end2);
    const passivos2 = getPassivosTotal(end2);
    const pl2 = ativos2 - passivos2;

    const variacaoAbs = pl1 - pl2;
    const variacaoPerc = pl2 !== 0 ? (variacaoAbs / Math.abs(pl2)) * 100 : 0;

    const contasLiquidez = contasMovimento.filter(c => 
      ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType)
    );
    const liquidezImediata = contasLiquidez.reduce((acc, c) => {
      const balance = calculateBalanceUpToDate(c.id, end1, transacoesV2, contasMovimento);
      return acc + Math.max(0, balance);
    }, 0);

    return { 
      plAtual: pl1, 
      ativosAtuais: ativos1, 
      passivosAtuais: passivos1, 
      variacaoAbs, 
      variacaoPerc,
      liquidezImediata 
    };
  }, [dateRanges, getAtivosTotal, getPassivosTotal, contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const fluxo = useMemo(() => {
    const calc = (txs: TransacaoCompleta[]) => {
      const rec = txs
        .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento' || t.operationType === 'liberacao_emprestimo')
        .reduce((acc, t) => acc + t.amount, 0);
      const des = txs
        .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo' || t.operationType === 'veiculo')
        .reduce((acc, t) => acc + t.amount, 0);
      return { rec, des, saldo: rec - des };
    };

    const p1 = calc(transacoesPeriodo1);
    return { p1 };
  }, [transacoesPeriodo1]);

  const saude = useMemo(() => {
    const temDados = contasMovimento.length > 0;
    const diversificacao = temDados ? 65 : 0; 
    const estabilidade = 85; 
    const dependencia = 40;

    return {
      liquidez: metricasPatrimoniais.passivosAtuais > 0 ? metricasPatrimoniais.ativosAtuais / metricasPatrimoniais.passivosAtuais : 0,
      endividamento: metricasPatrimoniais.ativosAtuais > 0 ? (metricasPatrimoniais.passivosAtuais / metricasPatrimoniais.ativosAtuais) * 100 : 0,
      diversificacao,
      estabilidade,
      dependencia
    };
  }, [metricasPatrimoniais, contasMovimento]);

  const scoreOrbium = useMemo(() => {
    if (contasMovimento.length === 0) return 0;
    
    let score = 0;
    const liqRatio = saude.liquidez;
    if (liqRatio >= 2) score += 250;
    else if (liqRatio >= 1.2) score += 150;
    else if (liqRatio > 0) score += 50;

    const endRatio = saude.endividamento;
    if (metricasPatrimoniais.ativosAtuais > 0) {
      if (endRatio <= 25) score += 250;
      else if (endRatio <= 45) score += 150;
      else score += 50;
    }

    const savingsRate = fluxo.p1.rec > 0 ? (fluxo.p1.saldo / fluxo.p1.rec) * 100 : 0;
    if (fluxo.p1.rec > 0) {
      if (savingsRate >= 20) score += 250;
      else if (savingsRate >= 10) score += 150;
      else score += 50;
    }

    if (metricasPatrimoniais.variacaoAbs > 0) score += 250;
    else if (metricasPatrimoniais.variacaoAbs === 0 && metricasPatrimoniais.plAtual > 0) score += 125;
    else if (metricasPatrimoniais.variacaoAbs < 0) score += 25;

    return score;
  }, [saude, fluxo, metricasPatrimoniais, contasMovimento]);

  const scoreInfo = useMemo(() => {
    if (contasMovimento.length === 0) return { label: "Iniciante", status: "Crítico" };
    if (scoreOrbium >= 800) return { label: "Excelente", status: "Premium" };
    if (scoreOrbium >= 600) return { label: "Bom", status: "Prêmio" };
    if (scoreOrbium >= 400) return { label: "Regular", status: "Padrão" };
    return { label: "Atenção", status: "Básico" };
  }, [scoreOrbium, contasMovimento]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // --- Smooth SVG Path Generation ---
  const dynamicPlPaths = useMemo(() => {
    const now = new Date();
    const points = Array.from({ length: 7 }, (_, i) => {
      const date = endOfMonth(subMonths(now, 6 - i));
      return getPatrimonioLiquido(date);
    });

    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    
    const coords = points.map((val, i) => {
      const x = (i / (points.length - 1)) * 800;
      const y = 210 - ((val - min) / range) * 170; // Adjusted for better fit
      return { x, y };
    });

    if (points.every(v => v === 0)) {
      return {
        line: "M0,230 L800,230",
        area: "M0,230 L800,230 L800,250 L0,250 Z"
      };
    }

    // Helper function for Catmull-Rom to Cubic Bezier conversion for smoothness
    const getCurvePath = (data: {x: number, y: number}[]) => {
      const smoothing = 0.15;
      
      const line = (a: {x: number, y: number}, b: {x: number, y: number}) => {
        const lengthX = b.x - a.x;
        const lengthY = b.y - a.y;
        return {
          length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
          angle: Math.atan2(lengthY, lengthX)
        };
      };

      const controlPoint = (current: {x: number, y: number}, previous: {x: number, y: number}, next: {x: number, y: number}, isEnd?: boolean) => {
        const p = previous || current;
        const n = next || current;
        const o = line(p, n);
        const angle = o.angle + (isEnd ? Math.PI : 0);
        const length = o.length * smoothing;
        const x = current.x + Math.cos(angle) * length;
        const y = current.y + Math.sin(angle) * length;
        return [x, y];
      };

      let path = `M ${data[0].x},${data[0].y}`;

      for (let i = 1; i < data.length; i++) {
        const cp1 = controlPoint(data[i-1], data[i-2], data[i]);
        const cp2 = controlPoint(data[i], data[i-1], data[i+1], true);
        path += ` C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${data[i].x},${data[i].y}`;
      }
      return path;
    };

    const lineD = getCurvePath(coords);
    const areaD = `${lineD} L800,250 L0,250 Z`;

    return { line: lineD, area: areaD };
  }, [getPatrimonioLiquido, transacoesV2, contasMovimento, veiculos]);

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-8 pb-10">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 animate-fade-in">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-2xl leading-none tracking-tight">Orbium</h1>
                  <p className="text-xs text-muted-foreground font-medium tracking-wide mt-0.5">Visão Premium</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PeriodSelector 
                initialRanges={dateRanges}
                onDateRangeChange={handlePeriodChange}
                className="h-10 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm"
              />
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in-up">
            <div className="col-span-12 lg:col-span-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 group h-[420px] flex flex-col justify-between cursor-help">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
                    
                    <div className="absolute bottom-0 left-0 right-0 h-[300px] pointer-events-none">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 250">
                        <defs>
                          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4"></stop>
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"></stop>
                          </linearGradient>
                        </defs>
                        <path 
                          className="transition-all duration-700 ease-in-out" 
                          d={dynamicPlPaths.area} 
                          fill="url(#chartFill)" 
                        ></path>
                        <path 
                          d={dynamicPlPaths.line} 
                          fill="none" 
                          stroke="hsl(var(--primary))" 
                          strokeLinecap="round" 
                          strokeWidth="5" 
                          vectorEffect="non-scaling-stroke"
                          className="transition-all duration-700 ease-in-out"
                        ></path>
                      </svg>
                    </div>

                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-primary">
                            <LineChart className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Patrimônio Líquido</span>
                            <Info className="w-3 h-3 text-muted-foreground/40" />
                          </div>
                        </div>
                        <h2 className="font-display font-extrabold text-5xl sm:text-6xl text-foreground tracking-tight leading-none mt-4 tabular-nums">
                          {formatCurrency(metricasPatrimoniais.plAtual)}
                        </h2>
                        <div className="flex items-center gap-2 mt-4">
                          <p className="text-muted-foreground font-medium tabular-nums">
                            {metricasPatrimoniais.variacaoAbs >= 0 ? "+" : "-"} {formatCurrency(Math.abs(metricasPatrimoniais.variacaoAbs))}
                          </p>
                          <Badge variant="outline" className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-lg border-none",
                            metricasPatrimoniais.variacaoAbs >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {metricasPatrimoniais.variacaoAbs >= 0 ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                            {Math.abs(metricasPatrimoniais.variacaoPerc).toFixed(1)}% {metricasPatrimoniais.variacaoAbs >= 0 ? 'de evolução' : 'de redução'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] p-4 rounded-3xl border-border shadow-2xl">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">Como é calculado?</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <strong>Patrimônio Líquido = Ativos - Passivos</strong>.
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Representa sua riqueza real. Considera saldos em contas, investimentos e veículos, subtraindo dívidas, empréstimos e faturas. O gráfico exibe a tendência dos últimos 7 meses.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <CockpitCards data={{
                patrimonioTotal: metricasPatrimoniais.plAtual,
                variacaoPatrimonio: metricasPatrimoniais.variacaoAbs,
                variacaoPercentual: metricasPatrimoniais.variacaoPerc,
                liquidezImediata: metricasPatrimoniais.liquidezImediata,
                compromissosMes: fluxo.p1.des,
                compromissosPercent: fluxo.p1.rec > 0 ? (fluxo.p1.des / fluxo.p1.rec) * 100 : 0,
                projecao30Dias: fluxo.p1.saldo,
                totalAtivos: metricasPatrimoniais.ativosAtuais
              }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="col-span-1 md:col-span-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-center h-[160px] hover:-translate-y-1 transition-transform duration-300 cursor-help">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-700 dark:text-green-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Resultado Operacional</p>
                        <Info className="w-2.5 h-2.5 opacity-30" />
                      </div>
                      <p className="font-display font-bold text-3xl text-foreground tabular-nums">{formatCurrency(fluxo.p1.saldo)}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] p-3 rounded-2xl">
                  <p className="text-xs">Diferença entre todas as Entradas e Saídas do período selecionado. Indica se você está vivendo abaixo das suas posses.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-center h-[160px] hover:-translate-y-1 transition-transform duration-300 cursor-help">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-primary">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">Mês Atual</Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Despesas Totais</p>
                        <Info className="w-2.5 h-2.5 opacity-30" />
                      </div>
                      <p className="font-display font-bold text-3xl text-foreground tabular-nums">{formatCurrency(fluxo.p1.des)}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] p-3 rounded-2xl">
                  <p className="text-xs">Soma de todos os gastos (Despesas, Parcelas de Empréstimo e Compras de Bens) ocorridos no período selecionado.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="col-span-1 md:col-span-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-[32px] p-6 shadow-lg flex items-center justify-between relative overflow-hidden h-[160px] cursor-help">
                    <div className="absolute right-0 bottom-0 opacity-10 scale-150 translate-x-10 translate-y-10">
                      <Sparkles className="w-[180px] h-[180px]" />
                    </div>
                    <div className="z-10">
                      <h3 className="font-display font-bold text-2xl mb-1">Score Orbium</h3>
                      <p className="text-neutral-400 text-sm mb-4 max-w-[200px]">Saúde patrimonial com base em {contasMovimento.length} contas.</p>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase backdrop-blur-md border border-white/10">
                          {scoreInfo.label}
                        </span>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase backdrop-blur-md border border-white/10">{scoreInfo.status}</span>
                      </div>
                    </div>
                    <div className="z-10 text-right">
                      <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm relative">
                        <span className="font-display font-bold text-3xl">{scoreOrbium}</span>
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle 
                            cx="48" cy="48" r="44" 
                            fill="transparent" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth="4" 
                            strokeDasharray="276.46"
                            strokeDashoffset={276.46 - (276.46 * (scoreOrbium / 1000))}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] p-4 rounded-3xl border-border shadow-2xl">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-foreground">O que compõe o Score?</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-muted/50 rounded-xl"><strong>Liquidez:</strong> Capacidade de pagamento imediato.</div>
                      <div className="p-2 bg-muted/50 rounded-xl"><strong>Dívida:</strong> Peso dos passivos no patrimônio.</div>
                      <div className="p-2 bg-muted/50 rounded-xl"><strong>Poupança:</strong> Capacidade de poupar mensalmente.</div>
                      <div className="p-2 bg-muted/50 rounded-xl"><strong>Evolução:</strong> Crescimento do PL no tempo.</div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <SaudeFinanceira
                  liquidez={saude.liquidez}
                  endividamento={saude.endividamento}
                  diversificacao={saude.diversificacao}
                  estabilidadeFluxo={saude.estabilidade}
                  dependenciaRenda={saude.dependencia}
                />
              </section>
              <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <FluxoCaixaHeatmap 
                  month={dateRanges.range1.from ? format(dateRanges.range1.from, 'MM') : format(new Date(), 'MM')} 
                  year={dateRanges.range1.from ? dateRanges.range1.from.getFullYear() : new Date().getFullYear()} 
                  transacoes={transacoesPeriodo1} 
                />
              </section>
            </div>
            <div className="space-y-8">
              <section className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                <AcompanhamentoAtivos
                  investimentosRF={contasMovimento.filter(c => c.accountType === 'renda_fixa').reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  criptomoedas={contasMovimento.filter(c => c.accountType === 'cripto' && !c.name.toLowerCase().includes('stable')).reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  stablecoins={contasMovimento.filter(c => c.accountType === 'cripto' && c.name.toLowerCase().includes('stable')).reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  reservaEmergencia={contasMovimento.filter(c => c.accountType === 'reserva').reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  poupanca={contasMovimento.filter(c => c.accountType === 'poupanca').reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                />
              </section>
              <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <MovimentacoesRelevantes transacoes={transacoesPeriodo1} limit={5} />
              </section>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
};

export default Index;