"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts";
import { 
  TrendingUp, 
  Wallet, 
  Target, 
  CircleDollarSign, 
  Landmark, 
  Bitcoin, 
  ArrowUpRight, 
  Sparkles,
  PieChart,
  LayoutGrid,
  Zap,
  ArrowRight,
  LineChart
} from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ComparisonDateRanges, formatCurrency, AccountSummary } from "@/types/finance";
import { subMonths, endOfMonth, format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useChartColors } from "@/hooks/useChartColors";
import { AccountStatementDialog } from "@/components/transactions/AccountStatementDialog";
import { toast } from "sonner";

export default function Investimentos() {
  const { 
    contasMovimento,
    getValorFipeTotal,
    calculateBalanceUpToDate,
    dateRanges,
    setDateRanges,
    calculateTotalInvestmentBalanceAtDate,
    transacoesV2,
    setTransacoesV2,
    categoriasV2
  } = useFinance();
  
  const colors = useChartColors();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [showStatementDialog, setShowStatementDialog] = useState(false);

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  const targetDate = dateRanges.range1.to || new Date();

  const metricas = useMemo(() => {
    const totalInvestido = calculateTotalInvestmentBalanceAtDate(targetDate);
    const valorVeiculos = getValorFipeTotal(targetDate);
    const patrimonioTotal = totalInvestido + valorVeiculos;
    
    const rf = contasMovimento
      .filter(c => ['renda_fixa', 'poupanca', 'reserva'].includes(c.accountType))
      .reduce((a, c) => a + Math.max(0, calculateBalanceUpToDate(c.id, targetDate, transacoesV2, contasMovimento)), 0);
      
    const cripto = contasMovimento
      .filter(c => c.accountType === 'cripto')
      .reduce((a, c) => a + Math.max(0, calculateBalanceUpToDate(c.id, targetDate, transacoesV2, contasMovimento)), 0);

    const reservaEmergencia = contasMovimento
      .filter(c => c.accountType === 'reserva')
      .reduce((a, c) => a + Math.max(0, calculateBalanceUpToDate(c.id, targetDate, transacoesV2, contasMovimento)), 0);

    const tresMesesAtras = subMonths(targetDate, 3);
    const txsUltimos3Meses = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return d >= tresMesesAtras && d <= targetDate && t.flow === 'out';
      } catch { return false; }
    });
    const gastoMensalMedio = txsUltimos3Meses.reduce((a, t) => a + t.amount, 0) / 3;
    const metaReserva = gastoMensalMedio * 6;
    const progressoReserva = metaReserva > 0 ? Math.min(100, (reservaEmergencia / metaReserva) * 100) : 0;

    const rendimentosPassivos = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return d >= tresMesesAtras && d <= targetDate && t.operationType === 'rendimento';
      } catch { return false; }
    }).reduce((a, t) => a + t.amount, 0) / 3;

    const progressoLiberdade = gastoMensalMedio > 0 ? Math.min(100, (rendimentosPassivos / gastoMensalMedio) * 100) : 0;
    const percCripto = patrimonioTotal > 0 ? (cripto / patrimonioTotal) * 100 : 0;
    const percRF = patrimonioTotal > 0 ? (rf / patrimonioTotal) * 100 : 0;

    return { patrimonioTotal, totalInvestido, rf, cripto, reservaEmergencia, gastoMensalMedio, metaReserva, progressoReserva, progressoLiberdade, rendimentosPassivos, percCripto, percRF };
  }, [calculateTotalInvestmentBalanceAtDate, getValorFipeTotal, targetDate, contasMovimento, calculateBalanceUpToDate, transacoesV2]);

  const evolutionData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = endOfMonth(subMonths(new Date(), i));
      result.push({ mes: format(date, 'MMM', { locale: ptBR }).toUpperCase(), valor: calculateTotalInvestmentBalanceAtDate(date) });
    }
    return result;
  }, [calculateTotalInvestmentBalanceAtDate]);

  const distributionData = useMemo(() => [
    { name: 'Renda Fixa', value: metricas.rf, color: colors.primary },
    { name: 'Criptoativos', value: metricas.cripto, color: colors.accent },
    { name: 'Imobilizado', value: getValorFipeTotal(targetDate), color: colors.success },
  ].filter(d => d.value > 0), [metricas, getValorFipeTotal, targetDate, colors]);

  const viewingAccount = useMemo(() => viewingAccountId ? contasMovimento.find(a => a.id === viewingAccountId) : undefined, [viewingAccountId, contasMovimento]);

  const viewingSummary = useMemo((): AccountSummary | undefined => {
    if (!viewingAccount) return undefined;
    const periodStart = dateRanges.range1.from;
    const periodEnd = dateRanges.range1.to;
    const periodInitialBalance = periodStart ? calculateBalanceUpToDate(viewingAccount.id, subDays(periodStart, 1), transacoesV2, contasMovimento) : 0;
    const accountTx = transacoesV2.filter(t => t.accountId === viewingAccount.id && (!periodStart || isWithinInterval(parseDateLocal(t.date), { start: startOfDay(periodStart), end: endOfDay(periodEnd || new Date()) })));
    let totalIn = 0, totalOut = 0;
    accountTx.forEach(t => { if (t.flow === 'in' || t.flow === 'transfer_in') totalIn += t.amount; else totalOut += t.amount; });
    const finalBal = periodInitialBalance + totalIn - totalOut;
    return { accountId: viewingAccount.id, accountName: viewingAccount.name, accountType: viewingAccount.accountType, institution: viewingAccount.institution, initialBalance: periodInitialBalance, currentBalance: finalBal, projectedBalance: finalBal, totalIn, totalOut, reconciliationStatus: accountTx.every(t => t.conciliated) ? 'ok' : 'warning', transactionCount: accountTx.length };
  }, [viewingAccount, transacoesV2, dateRanges, calculateBalanceUpToDate, contasMovimento]);

  const recomendacao = useMemo(() => {
    const { percCripto, percRF, patrimonioTotal, progressoReserva } = metricas;
    if (patrimonioTotal === 0) return { tipo: 'info' as const, icone: Wallet, mensagem: 'Cadastre suas contas de investimento para acompanhar seu patrimônio.' };
    if (progressoReserva < 50) return { tipo: 'alerta' as const, icone: Target, mensagem: `Reserva de emergência em ${progressoReserva.toFixed(0)}%. Priorize completar antes de novos riscos.` };
    if (percCripto > 15) return { tipo: 'alerta' as const, icone: Bitcoin, mensagem: `Exposição em Cripto (${percCripto.toFixed(0)}%) alta. Considere rebalancear.` };
    if (percRF > 80) return { tipo: 'info' as const, icone: Landmark, mensagem: `Alta concentração em Renda Fixa (${percRF.toFixed(0)}%). Avalie diversificar.` };
    return { tipo: 'sucesso' as const, icone: Sparkles, mensagem: 'Portfólio bem diversificado! Continue com aportes regulares.' };
  }, [metricas]);

  return (
    <MainLayout>
      <div className="space-y-10 pb-12">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl leading-none tracking-tight">Investimentos</h1>
              <p className="text-sm text-muted-foreground font-bold tracking-widest mt-1 uppercase opacity-60">Gestão de Ativos e Patrimônio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              initialRanges={dateRanges} 
              onDateRangeChange={handlePeriodChange} 
              className="h-11 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm px-6 font-bold" 
            />
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 animate-fade-in-up">
          {/* Card Patrimônio Bruto (Hero) */}
          <div className="col-span-12 xl:col-span-8">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[40px] p-6 sm:p-8 lg:p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 min-h-[350px] sm:h-[420px] flex flex-col justify-between group transition-all hover:shadow-soft-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
              
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.07] group-hover:scale-110 transition-transform duration-1000">
                <CircleDollarSign className="w-64 h-64 text-primary" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[150px] sm:h-[180px] pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 250">
                  <defs>
                    <linearGradient id="colorVal" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity="0.4"/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <AreaChart data={evolutionData}>
                    <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={5} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-sm ring-1 ring-primary/20">
                    <LineChart className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Patrimônio Bruto</span>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Visão Acumulada</p>
                  </div>
                </div>
                
                <h2 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-foreground tracking-tighter leading-none mt-4 tabular-nums">
                  {formatCurrency(metricas.patrimonioTotal)}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <Badge variant="outline" className="bg-success/10 text-success border-none px-4 py-1.5 rounded-xl font-black text-xs shadow-sm">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> +2.4% ESTE MÊS
                  </Badge>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Portfólio Otimizado
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Laterais (Renda Fixa e Cripto) */}
          <div className="col-span-12 xl:col-span-4 grid grid-cols-2 xl:flex xl:flex-col gap-6">
            {/* Renda Fixa */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-auto min-h-[160px] xl:h-[200px] hover:shadow-soft-lg hover:-translate-y-1 transition-all group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                <Landmark className="w-32 h-32 text-blue-600" />
              </div>
              <div className="flex items-start justify-between relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                  <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-none font-black text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-widest">Estabilidade</Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Renda Fixa</p>
                <p className="font-display font-black text-xl lg:text-3xl text-foreground tabular-nums">{formatCurrency(metricas.rf)}</p>
              </div>
            </div>

            {/* Criptoativos */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-auto min-h-[160px] xl:h-[194px] hover:shadow-soft-lg hover:-translate-y-1 transition-all group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                <Bitcoin className="w-32 h-32 text-orange-600" />
              </div>
              <div className="flex items-start justify-between relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                  <Bitcoin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-none font-black text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-widest">Digital</Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Criptoativos</p>
                <p className="font-display font-black text-xl lg:text-3xl text-foreground tabular-nums">{formatCurrency(metricas.cripto)}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <div className="flex justify-center">
            <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] h-14 border border-border/40 max-w-md w-full grid grid-cols-2">
              <TabsTrigger value="visao-geral" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all gap-2">
                <LayoutGrid className="w-4 h-4" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="meus-ativos" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all gap-2">
                <Wallet className="w-4 h-4" /> Meus Ativos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visao-geral" className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              <div className="xl:col-span-2 bg-surface-light dark:bg-surface-dark rounded-[32px] sm:rounded-[48px] p-6 lg:p-10 shadow-soft border border-white/60 dark:border-white/5">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm"><PieChart className="w-6 h-6" /></div>
                  <div><h3 className="font-display font-black text-2xl text-foreground">Alocação de Capital</h3><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Distribuição por Classe de Ativo</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  <div className="h-[250px] sm:h-[300px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={distributionData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={12}>
                          {distributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} formatter={(v: number) => [formatCurrency(v), "Valor"]} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
                      <p className="text-xl sm:text-2xl font-black text-foreground">{formatCurrency(metricas.patrimonioTotal)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {distributionData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-bold text-foreground">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black">{formatCurrency(item.value)}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{((item.value / metricas.patrimonioTotal) * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] sm:rounded-[40px] p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shadow-sm"><Target className="w-6 h-6" /></div>
                  <div><h3 className="font-display font-bold text-xl text-foreground">Objetivos</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progresso de Metas</p></div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">Reserva de Emergência</span>
                      <span className={cn(metricas.progressoReserva >= 100 ? "text-success" : metricas.progressoReserva >= 50 ? "text-primary" : "text-destructive")}>
                        {metricas.progressoReserva.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", metricas.progressoReserva >= 100 ? "bg-success" : metricas.progressoReserva >= 50 ? "bg-primary" : "bg-destructive")} style={{ width: `${Math.min(100, metricas.progressoReserva)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(metricas.reservaEmergencia)} de {formatCurrency(metricas.metaReserva)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">Liberdade Financeira</span>
                      <span className={cn(metricas.progressoLiberdade >= 100 ? "text-success" : "text-accent")}>
                        {metricas.progressoLiberdade.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", metricas.progressoLiberdade >= 100 ? "bg-success" : "bg-accent")} style={{ width: `${Math.min(100, metricas.progressoLiberdade)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Renda passiva: {formatCurrency(metricas.rendimentosPassivos)}/mês</p>
                  </div>
                </div>
                <div className="pt-6 border-t border-border/40">
                  <div className={cn("p-4 rounded-2xl flex gap-3 border", recomendacao.tipo === 'sucesso' ? "bg-success/5 border-success/10" : recomendacao.tipo === 'alerta' ? "bg-destructive/5 border-destructive/10" : "bg-primary/5 border-primary/10")}>
                    <recomendacao.icone className={cn("w-5 h-5 shrink-0", recomendacao.tipo === 'sucesso' ? "text-success" : recomendacao.tipo === 'alerta' ? "text-destructive" : "text-primary")} />
                    <p className={cn("text-[11px] font-bold leading-tight", recomendacao.tipo === 'sucesso' ? "text-success" : recomendacao.tipo === 'alerta' ? "text-destructive" : "text-primary-dark")}>
                      {recomendacao.mensagem}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="meus-ativos" className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
              {contasMovimento.filter(c => ['renda_fixa', 'poupanca', 'cripto', 'reserva', 'objetivo'].includes(c.accountType)).map((account) => {
                const saldo = calculateBalanceUpToDate(account.id, targetDate, transacoesV2, contasMovimento);
                const isCripto = account.accountType === 'cripto';
                const Icon = isCripto ? Bitcoin : Landmark;
                return (
                  <div key={account.id} className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                      <Icon className="w-32 h-32" />
                    </div>
                    <div className="flex items-start justify-between mb-10 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-500", isCripto ? "bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white")}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-lg text-foreground leading-tight tracking-tight">{account.name}</p>
                          <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none px-2 py-0.5">{account.institution || account.accountType}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Atual</p>
                      <p className="font-black text-3xl text-foreground tabular-nums">{formatCurrency(saldo)}</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-1 text-success font-black text-[10px]"><ArrowUpRight className="w-3 h-3" /> +0.85%</div>
                      <Button variant="ghost" size="sm" className="h-8 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/10" onClick={() => { setViewingAccountId(account.id); setShowStatementDialog(true); }}>
                        Detalhes <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {viewingAccount && viewingSummary && (
        <AccountStatementDialog 
          open={showStatementDialog} 
          onOpenChange={setShowStatementDialog} 
          account={viewingAccount} 
          accountSummary={viewingSummary} 
          transactions={transacoesV2.filter(t => t.accountId === viewingAccountId)} 
          categories={categoriasV2} 
          onEditTransaction={() => {}} 
          onDeleteTransaction={() => {}} 
          onToggleConciliated={(id, val) => { setTransacoesV2(prev => prev.map(t => t.id === id ? { ...t, conciliated: val } : t)); }} 
          onReconcileAll={() => { setTransacoesV2(prev => prev.map(t => t.accountId === viewingAccountId ? { ...t, conciliated: true } : t)); }} 
        />
      )}
    </MainLayout>
  );
}