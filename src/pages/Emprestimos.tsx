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
  Banknote
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
    const rec = 10000; // Mock de receita para cálculo de comprometimento
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

  // --- Smooth SVG Path Generation para a Curva de Dívida ---
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
        <div className="space-y-10 pb-12">
          {/* Header Expressivo */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive to-red-700 flex items-center justify-center text-white shadow-xl shadow-destructive/20 ring-4 ring-destructive/10">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-display font-bold text-3xl leading-none tracking-tight">Financiamentos</h1>
                <p className="text-sm text-muted-foreground font-bold tracking-widest mt-1 uppercase opacity-60">Gestão de Passivos e Crédito</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PeriodSelector 
                initialRanges={dateRanges}
                onDateRangeChange={handlePeriodChange}
                className="h-11 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm px-6 font-bold"
              />
              {/* Removed LoanForm button */}
            </div>
          </header>

          {/* Hero Section: Painel de Dívida Expressivo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 h-[420px] flex flex-col justify-between group">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/[0.03] to-transparent opacity-50"></div>
                
                {/* Gráfico de Fundo */}
                <div className="absolute bottom-0 left-0 right-0 h-[300px] pointer-events-none opacity-40">
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
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-2xl text-destructive shadow-sm">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Saldo Devedor Total</span>
                      <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest mt-0.5">Impacto Patrimonial</p>
                    </div>
                  </div>
                  
                  <h2 className="font-display font-extrabold text-6xl sm:text-7xl text-foreground tracking-tighter leading-none tabular-nums">
                    {formatCurrency(calculos.saldoDevedorTotal)}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-8">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-none px-4 py-1.5 rounded-xl font-black text-xs">
                      {emprestimos.length} CONTRATOS ATIVOS
                    </Badge>
                    <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                      <History className="w-4 h-4 opacity-40" />
                      <span>Atualizado com base no último período</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex justify-end">
                   <div className="p-4 rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 flex items-center gap-4">
                      <div className="text-right">
                         <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Dívida Cartões</p>
                         <p className="font-black text-lg text-foreground leading-none">{formatCurrency(calculos.dividaCartoes)}</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                         <CreditCard className="w-5 h-5" />
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Cockpit de Indicadores Laterais */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              {/* Card Parcela Mensal */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-[200px] hover:-translate-y-1 transition-transform cursor-help">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-primary shadow-sm">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <Badge className="bg-warning/10 text-warning border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase">Fluxo Mensal</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Parcela Total</p>
                  <p className="font-display font-black text-3xl text-foreground tabular-nums">{formatCurrency(calculos.parcelaMensalTotal)}</p>
                </div>
              </div>

              {/* Card Comprometimento Renda */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-[194px] hover:-translate-y-1 transition-transform cursor-help">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-sm">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" 
                            strokeDasharray="125.66" strokeDashoffset={125.66 - (125.66 * Math.min(calculos.comprometimentoRenda, 100) / 100)}
                            strokeLinecap="round" 
                            className={cn(
                              "transition-all duration-1000",
                              calculos.comprometimentoRenda <= 30 ? "text-success" :
                              calculos.comprometimentoRenda <= 50 ? "text-warning" : "text-destructive"
                            )} 
                          />
                        </svg>
                        <span className={cn(
                          "absolute text-[10px] font-black",
                          calculos.comprometimentoRenda <= 30 ? "text-success" :
                          calculos.comprometimentoRenda <= 50 ? "text-warning" : "text-destructive"
                        )}>{Math.round(calculos.comprometimentoRenda)}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Comprometimento</p>
                        <Info className="w-3 h-3 text-muted-foreground/50" />
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={cn(
                          "font-display font-black text-3xl tabular-nums",
                          calculos.comprometimentoRenda <= 30 ? "text-success" :
                          calculos.comprometimentoRenda <= 50 ? "text-warning" : "text-destructive"
                        )}>{calculos.comprometimentoRenda.toFixed(1)}%</p>
                        <Badge className={cn(
                          "text-[8px] font-black border-none px-2 py-0.5 rounded-lg uppercase",
                          calculos.comprometimentoRenda <= 30 ? "bg-success/10 text-success" :
                          calculos.comprometimentoRenda <= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                        )}>
                          {calculos.comprometimentoRenda <= 30 ? "Saudável" :
                           calculos.comprometimentoRenda <= 50 ? "Atenção" : "Crítico"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] p-4 rounded-2xl">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm">Comprometimento de Renda</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Percentual da sua renda comprometido com parcelas de empréstimos e financiamentos.
                    </p>
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-[10px] font-bold">Até 30%: Saudável</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-[10px] font-bold">30-50%: Atenção</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-[10px] font-bold">Acima de 50%: Crítico</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Parcelas Totais: {formatCurrency(calculos.parcelaMensalTotal)}
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Seção Central: Insights e Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <LoanAlerts emprestimos={emprestimos} onOpenPendingConfig={() => { setSelectedLoan(pendingLoans[0]); setDetailDialogOpen(true); }} />
              </section>
              
              <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="bg-surface-light dark:bg-surface-dark rounded-[48px] p-10 shadow-soft border border-white/60 dark:border-white/5">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-black text-2xl text-foreground">Inteligência de Evolução</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Visão Futura dos Compromissos</p>
                      </div>
                    </div>
                  </div>
                  <LoanCharts emprestimos={emprestimos.filter(e => e.status !== 'pendente_config')} />
                </div>
              </section>
            </div>

            <div className="space-y-10">
              <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <LoanSimulator 
                  emprestimos={emprestimos.filter(e => e.status !== 'pendente_config')} 
                  className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 shadow-soft border border-white/60 dark:border-white/5" 
                />
              </section>
            </div>
          </div>

          {/* Grid de Contratos: O Inventário Premium */}
          <section className="space-y-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-2xl text-destructive shadow-sm">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-black text-2xl text-foreground">Contratos Ativos</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Portfólio de Crédito</p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full px-6 py-1.5 font-black text-xs uppercase tracking-widest bg-muted/50 text-muted-foreground">
                {emprestimos.length} CONTRATOS
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {emprestimos.map((loan) => {
                const paidCount = calculatePaidInstallmentsUpToDate(loan.id, dateRanges.range1.to || new Date());
                const progress = (paidCount / loan.meses) * 100;
                
                return (
                  <div 
                    key={loan.id}
                    onClick={() => { setSelectedLoan(loan); setDetailDialogOpen(true); }}
                    className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-2xl hover:-translate-y-2 group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                        <Building2 className="w-32 h-32" />
                    </div>

                    <div className="flex items-start justify-between mb-10 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                          <Building2 className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-lg text-foreground leading-tight tracking-tight">{loan.contrato}</p>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none px-2 py-0.5">{loan.meses} PARCELAS</Badge>
                             <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{loan.taxaMensal}% am</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 relative z-10">
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Parcela Mensal</p>
                           <p className="font-black text-2xl text-foreground tabular-nums">{formatCurrency(loan.parcela)}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Progresso</p>
                           <p className="text-sm font-black text-primary uppercase">{paidCount}/{loan.meses}</p>
                        </div>
                      </div>
                      
                      <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden shadow-inner p-0.5">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10">
                      <Badge variant="outline" className={cn(
                        "border-none font-black text-[10px] px-3 py-1 rounded-xl uppercase tracking-widest",
                        loan.status === 'ativo' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      )}>
                        {loan.status === 'ativo' ? 'EM DIA' : 'PENDENTE'}
                      </Badge>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                        DETALHES <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
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