"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  CreditCard, 
  TrendingDown, 
  Building2, 
  Sparkles,
  LayoutGrid,
  ArrowRight,
  Info,
  TrendingUp,
  History,
  Wallet,
  Banknote,
  Zap,
  Activity
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Emprestimo, ComparisonDateRanges } from "@/types/finance";
import { LoanForm } from "@/components/loans/LoanForm";
import { LoanAlerts } from "@/components/loans/LoanAlerts";
import { LoanCharts } from "@/components/loans/LoanCharts";
import { LoanDetailDialog } from "@/components/loans/LoanDetailDialog";
import { LoanSimulator } from "@/components/loans/LoanSimulator";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useLocation } from "react-router-dom";
import { cn, parseDateLocal } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { subMonths, endOfMonth } from "date-fns";

const Emprestimos = () => {
  const { 
    emprestimos, 
    addEmprestimo, 
    getPendingLoans,
    getContasCorrentesTipo,
    dateRanges,
    setDateRanges,
    getLoanPrincipalRemaining,
    getCreditCardDebt,
    calculatePaidInstallmentsUpToDate,
    calculateLoanSchedule
  } = useFinance();
  
  const location = useLocation();
  const [selectedLoan, setSelectedLoan] = useState<Emprestimo | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const autoOpenHandledRef = useRef(false);
  
  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  const pendingLoans = getPendingLoans(); 

  useEffect(() => {
    const state = location.state as { openLoanConfig?: boolean } | null;
    if (state?.openLoanConfig && pendingLoans.length > 0 && !autoOpenHandledRef.current) {
      autoOpenHandledRef.current = true;
      setSelectedLoan(pendingLoans[0]);
      setDetailDialogOpen(true);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state, pendingLoans, location.pathname]);

  const calculos = useMemo(() => {
    const targetDate = dateRanges.range1.to;
    const rec = 10000; 
    const parcelas = emprestimos.reduce((acc, e) => acc + e.parcela, 0);
    
    return {
      saldoDevedorTotal: getLoanPrincipalRemaining(targetDate),
      dividaCartoes: getCreditCardDebt(targetDate),
      parcelaMensalTotal: parcelas,
      comprometimentoRenda: rec > 0 ? (parcelas / rec) * 100 : 0
    };
  }, [emprestimos, getLoanPrincipalRemaining, getCreditCardDebt, dateRanges.range1.to]);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  const dynamicDebtPaths = useMemo(() => {
    const now = new Date();
    const points = Array.from({ length: 7 }, (_, i) => {
      const date = endOfMonth(subMonths(now, 6 - i));
      return getLoanPrincipalRemaining(date);
    });

    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    
    const coords = points.map((val, i) => {
      const x = (i / (points.length - 1)) * 800;
      const y = 220 - ((val - min) / range) * 160; 
      return { x, y };
    });

    const getCurvePath = (data: {x: number, y: number}[]) => {
      let path = `M ${data[0].x},${data[0].y}`;
      for (let i = 1; i < data.length; i++) {
        const cp1x = data[i-1].x + (data[i].x - data[i-1].x) / 2;
        path += ` C ${cp1x},${data[i-1].y} ${cp1x},${data[i].y} ${data[i].x},${data[i].y}`;
      }
      return path;
    };

    const lineD = getCurvePath(coords);
    const areaD = `${lineD} L800,250 L0,250 Z`;
    return { line: lineD, area: areaD };
  }, [getLoanPrincipalRemaining]);

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="w-full space-y-8 sm:space-y-12 pb-12">
          {/* Header Expressivo */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1 animate-fade-in text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive to-red-700 flex items-center justify-center text-white shadow-xl shadow-destructive/20 ring-4 ring-destructive/10">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-display font-bold text-3xl leading-none tracking-tight">Financiamentos</h1>
                <p className="text-[10px] sm:text-sm text-muted-foreground font-bold tracking-widest mt-1 uppercase opacity-60">Gestão de Passivos e Crédito</p>
              </div>
            </div>
            <div className="flex justify-center">
              <PeriodSelector 
                initialRanges={dateRanges}
                onDateRangeChange={handlePeriodChange}
                className="h-9 sm:h-11 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm"
              />
            </div>
          </header>

          {/* Hero Section: Painel de Dívida Expressivo */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-10 animate-fade-in-up">
            <div className="col-span-12 xl:col-span-8">
              <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[40px] p-6 lg:p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 min-h-[300px] sm:h-[420px] flex flex-col justify-between group transition-all hover:shadow-soft-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/[0.03] to-transparent opacity-50"></div>
                
                {/* Elemento decorativo de fundo */}
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.07] group-hover:scale-110 transition-transform duration-1000">
                  <Banknote className="w-64 h-64 text-destructive" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[200px] sm:h-[300px] pointer-events-none opacity-40">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 250">
                    <defs>
                      <linearGradient id="debtFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.2"></stop>
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                    <path d={dynamicDebtPaths.area} fill="url(#debtFill)" className="transition-all duration-1000 ease-in-out"></path>
                    <path d={dynamicDebtPaths.line} fill="none" stroke="hsl(var(--destructive))" strokeLinecap="round" strokeWidth="4" vectorEffect="non-scaling-stroke" className="transition-all duration-1000 ease-in-out"></path>
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-2xl text-destructive shadow-sm ring-1 ring-destructive/20">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Saldo Devedor Total</span>
                      <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest mt-0.5">Principal em Aberto</p>
                    </div>
                  </div>
                  
                  <h2 className="font-display font-extrabold text-3xl sm:text-6xl md:text-7xl text-foreground tracking-tighter leading-none tabular-nums">
                    {formatCurrency(calculos.saldoDevedorTotal)}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-6 sm:mt-10">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-none px-3 py-1 rounded-xl font-black text-[10px] sm:text-xs">
                      {emprestimos.length} CONTRATOS ATIVOS
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Atualizado agora
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex justify-end">
                   <div className="p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 flex items-center gap-3 sm:gap-4 group/card hover:scale-105 transition-transform">
                      <div className="text-right">
                         <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Dívida Cartões</p>
                         <p className="font-black text-sm sm:text-lg text-foreground leading-none tabular-nums">{formatCurrency(calculos.dividaCartoes)}</p>
                      </div>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shadow-sm group-hover/card:bg-destructive group-hover/card:text-white transition-all">
                         <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-4 grid grid-cols-2 xl:flex xl:flex-col gap-6">
              {/* Card Parcela Total */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-auto min-h-[140px] xl:h-[200px] hover:shadow-soft-lg hover:-translate-y-1 transition-all group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                  <Wallet className="w-24 h-24 text-primary" />
                </div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <Badge className="bg-warning/10 text-warning border-none font-black text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-widest">Fluxo Mensal</Badge>
                </div>
                <div className="relative z-10">
                  <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Parcela Total</p>
                  <p className="font-display font-black text-lg lg:text-3xl text-foreground tabular-nums">{formatCurrency(calculos.parcelaMensalTotal)}</p>
                </div>
              </div>

              {/* Card Comprometimento */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-auto min-h-[140px] xl:h-[194px] hover:shadow-soft-lg hover:-translate-y-1 transition-all group relative overflow-hidden animate-fade-in-up cursor-help" style={{ animationDelay: '200ms' }}>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                      <Activity className="w-24 h-24 text-indigo-600" />
                    </div>
                    <div className="flex items-start justify-between relative z-10">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="50%" cy="50%" r="40%" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                          <circle cx="50%" cy="50%" r="40%" fill="transparent" stroke="currentColor" strokeWidth="4" 
                            strokeDasharray="100.53" strokeDashoffset={100.53 - (100.53 * Math.min(calculos.comprometimentoRenda, 100) / 100)}
                            strokeLinecap="round" 
                            className={cn(
                              "transition-all duration-1000",
                              calculos.comprometimentoRenda <= 30 ? "text-success" :
                              calculos.comprometimentoRenda <= 50 ? "text-warning" : "text-destructive"
                            )} 
                          />
                        </svg>
                        <span className="absolute text-[8px] sm:text-[10px] font-black tabular-nums">{Math.round(calculos.comprometimentoRenda)}%</span>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Comprometimento</p>
                      <p className={cn(
                        "font-display font-black text-lg lg:text-3xl tabular-nums",
                        calculos.comprometimentoRenda <= 30 ? "text-success" :
                        calculos.comprometimentoRenda <= 50 ? "text-warning" : "text-destructive"
                      )}>{calculos.comprometimentoRenda.toFixed(1)}%</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] p-4 rounded-2xl shadow-2xl border-border">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">O que é isso?</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Percentual da sua renda mensal comprometido com parcelas de empréstimos. O ideal é manter abaixo de <strong>30%</strong>.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 sm:gap-12">
            <div className="xl:col-span-2 space-y-12">
              <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <LoanAlerts emprestimos={emprestimos} onOpenPendingConfig={() => { setSelectedLoan(pendingLoans[0]); setDetailDialogOpen(true); }} />
              </section>
              
              <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] sm:rounded-[48px] p-6 lg:p-10 shadow-soft border border-white/60 dark:border-white/5 overflow-hidden transition-all">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm"><Sparkles className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                    <div><h3 className="font-display font-bold text-xl sm:text-2xl text-foreground">Inteligência de Evolução</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Análise de Peso e Custos</p></div>
                  </div>
                  <LoanCharts emprestimos={emprestimos.filter(e => e.status !== 'pendente_config')} />
                </div>
              </section>
            </div>

            <div className="space-y-12">
              <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <LoanSimulator 
                  emprestimos={emprestimos.filter(e => e.status !== 'pendente_config')} 
                  className="bg-surface-light dark:bg-surface-dark rounded-[32px] sm:rounded-[40px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5" 
                />
              </section>
            </div>
          </div>

          <section className="space-y-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-2xl text-destructive shadow-sm"><Banknote className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                  <h3 className="font-display font-black text-xl sm:text-2xl text-foreground uppercase tracking-tight">Contratos Ativos</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Detalhamento de Crédito</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-10">
              {emprestimos.map((loan, index) => {
                const paidCount = calculatePaidInstallmentsUpToDate(loan.id, dateRanges.range1.to || new Date());
                const progress = (paidCount / loan.meses) * 100;
                return (
                  <div 
                    key={loan.id} 
                    onClick={() => { setSelectedLoan(loan); setDetailDialogOpen(true); }} 
                    className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-soft-lg hover:-translate-y-2 group cursor-pointer relative overflow-hidden animate-fade-in-up"
                    style={{ animationDelay: `${(index + 5) * 100}ms` }}
                  >
                    {/* Ícone Decorativo de Fundo */}
                    <Building2 className="absolute -right-6 -bottom-6 w-32 h-32 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
                    
                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1rem] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500"><Building2 className="w-6 h-6" /></div>
                        <div className="space-y-1">
                          <p className="font-black text-base text-foreground truncate max-w-[160px] leading-tight">{loan.contrato}</p>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[8px] font-black uppercase bg-muted/50 border-none px-1.5 py-0.5">{loan.meses}P</Badge>
                             <span className="text-[10px] font-bold text-muted-foreground">{loan.taxaMensal}% am</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Parcela Mensal</p><p className="font-black text-xl text-foreground tabular-nums">{formatCurrency(loan.parcela)}</p></div>
                        <div className="text-right"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Progresso</p><p className="text-xs font-black text-primary uppercase">{paidCount}/{loan.meses}</p></div>
                      </div>
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} /></div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10"><Badge variant="outline" className={cn("border-none font-black text-[9px] px-3 py-1 rounded-xl uppercase tracking-widest", loan.status === 'ativo' ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{loan.status === 'ativo' ? 'EM DIA' : 'PENDENTE'}</Badge><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">VER <ArrowRight className="w-4 h-4" /></div></div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </TooltipProvider>
      <LoanDetailDialog emprestimo={selectedLoan} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} />
    </MainLayout>
  );
};

export default Emprestimos;