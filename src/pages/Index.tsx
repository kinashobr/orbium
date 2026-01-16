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
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Activity
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
      const y = 210 - ((val - min) / range) * 170; 
      return { x, y };
    });

    if (points.every(v => v === 0)) {
      return {
        line: "M0,230 L800,230",
        area: "M0,230 L800,230 L800,250 L0,250 Z"
      };
    }

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
  }, [getPatrimonioLiquido, transacoesV2, contasMovimento]);

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-4 sm:space-y-6 pb-10">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 animate-fade-in text-center sm:text-left">
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20"><LayoutDashboard className="w-5 h-5" /></div>
                <div>
                  <h1 className="font-display font-bold text-xl leading-none tracking-tight">Orbium</h1>
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide mt-0.5">Visão Premium</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <PeriodSelector 
                initialRanges={dateRanges}
                onDateRangeChange={handlePeriodChange}
                className="h-8 sm:h-9 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm"
              />
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 animate-fade-in-up">
            <div className="col-span-12 xl:col-span-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 lg:p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 group min-h-[280px] sm:h-[320px] lg:h-[350px] flex flex-col justify-between cursor-help transition-all hover:shadow-soft-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
                    
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.07] group-hover:scale-110 transition-transform duration-1000">
                      <ShieldCheck className="w-64 h-64 text-primary" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-[180px] sm:h-[220px] pointer-events-none">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 250">
                        <defs>
                          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4"></stop>
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"></stop>
                          </linearGradient>
                        </defs>
                        <path className="transition-all duration-1000 ease-in-out" d={dynamicPlPaths.area} fill="url(#chartFill)"></path>
                        <path d={dynamicPlPaths.line} fill="none" stroke="hsl(var(--primary))" strokeLinecap="round" strokeWidth="5" vectorEffect="non-scaling-stroke" className="transition-all duration-1000 ease-in-out drop-shadow-lg"></path>
                      </svg>
                    </div>

                    <div className="relative z-10 flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-sm ring-1 ring-primary/20">
                            <LineChart className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Consolidado</span>
                            <p className="text-xs font-bold text-primary uppercase tracking-widest">Patrimônio Líquido</p>
                          </div>
                        </div>
                        <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tighter leading-none mt-4 tabular-nums">
                          {formatCurrency(metricasPatrimoniais.plAtual)}
                        </h2>
                        <div className="flex items-center gap-3 mt-4">
                          <p className="text-xs sm:text-sm text-muted-foreground font-bold tabular-nums">
                            {metricasPatrimoniais.variacaoAbs >= 0 ? "+" : "-"} {formatCurrency(Math.abs(metricasPatrimoniais.variacaoAbs))}
                          </p>
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-black px-2 py-1 rounded-xl border-none shadow-sm",
                            metricasPatrimoniais.variacaoAbs >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          )}>
                            {metricasPatrimoniais.variacaoAbs >= 0 ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                            {Math.abs(metricasPatrimoniais.variacaoPerc).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="hidden sm:flex flex-col items-end gap-2">
                        <Badge className="bg-primary text-white border-none font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                          Premium Account
                        </Badge>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          <Sparkles className="w-3 h-3 text-accent" />
                          Atualizado agora
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] p-4 rounded-2xl border-border shadow-2xl">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">Como é calculado?</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground"><strong>Ativos - Passivos</strong>. Representa sua riqueza real acumulada.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-12 xl:col-span-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in-up">
            <div className="col-span-1">
              <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] p-5 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-center min-h-[120px] hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp className="w-20 h-20 text-success" />
                </div>
                <div className="flex items-start justify-between mb-2 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-700 dark:text-green-400 shadow-sm group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-none text-[8px] font-black uppercase px-1.5">Operacional</Badge>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Saldo Operacional</p>
                  <p className="font-display font-bold text-lg sm:text-xl text-foreground tabular-nums">{formatCurrency(fluxo.p1.saldo)}</p>
                </div>
              </div>
            </div>
            
            <div className="col-span-1">
              <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] p-5 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-center min-h-[120px] hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                  <TrendingDown className="w-20 h-20 text-destructive" />
                </div>
                <div className="flex items-start justify-between mb-2 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-destructive shadow-sm group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-none text-[8px] font-black uppercase px-1.5">Mensal</Badge>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Despesas Totais</p>
                  <p className="font-display font-bold text-lg sm:text-xl text-foreground tabular-nums">{formatCurrency(fluxo.p1.des)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              <section className="animate-fade-in-up">
                <SaudeFinanceira
                  liquidez={saude.liquidez}
                  endividamento={saude.endividamento}
                  diversificacao={saude.diversificacao}
                  estabilidadeFluxo={saude.estabilidade}
                  dependenciaRenda={saude.dependencia}
                />
              </section>
              <section className="animate-fade-in-up">
                <FluxoCaixaHeatmap 
                  month={dateRanges.range1.from ? format(dateRanges.range1.from, 'MM') : format(new Date(), 'MM')} 
                  year={dateRanges.range1.from ? dateRanges.range1.from.getFullYear() : new Date().getFullYear()} 
                  transacoes={transacoesPeriodo1} 
                />
              </section>
            </div>
            <div className="space-y-6 sm:space-y-8">
              <section className="animate-fade-in-up">
                <AcompanhamentoAtivos
                  investimentosRF={contasMovimento.filter(c => c.accountType === 'renda_fixa').reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  criptomoedas={contasMovimento.filter(c => c.accountType === 'cripto' && !c.name.toLowerCase().includes('stable')).reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  stablecoins={contasMovimento.filter(c => c.accountType === 'cripto' && c.name.toLowerCase().includes('stable')).reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  reservaEmergencia={contasMovimento.filter(c => c.accountType === 'reserva').reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                  poupanca={contasMovimento.filter(c => c.accountType === 'poupanca').reduce((a, c) => a + calculateBalanceUpToDate(c.id, dateRanges.range1.to, transacoesV2, contasMovimento), 0)}
                />
              </section>
              <section className="animate-fade-in-up">
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