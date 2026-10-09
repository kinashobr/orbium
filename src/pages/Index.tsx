"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { LayoutDashboard } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountBalanceCards } from "@/components/dashboard/AccountBalanceCards";
import { UpcomingExpenses } from "@/components/dashboard/UpcomingExpenses";
import { ExpenseComparisonCharts } from "@/components/dashboard/ExpenseComparisonCharts";
import { FinancialDistributionChart } from "@/components/dashboard/FinancialDistributionChart";
import { FinancialEvolutionChart } from "@/components/dashboard/FinancialEvolutionChart";
import { CategoryEvolutionChart } from "@/components/dashboard/CategoryEvolutionChart";
import { AssetCards } from "@/components/dashboard/AssetCards";
import { LoanContractCards } from "@/components/dashboard/LoanContractCards";
import { DateOrb } from "@/components/dashboard/DateOrb";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Index = () => {
  const [orbPhase, setOrbPhase] = useState<1 | 2 | 3>(1);

  return (
    <MainLayout>
      <TooltipProvider>
        <div
          className={cn(
            "space-y-5 sm:space-y-6 md:space-y-8 pb-20 max-w-[1600px] mx-auto relative transition-colors duration-700",
            orbPhase === 2 && "text-slate-900 dark:text-slate-100",
            orbPhase === 3 && "text-foreground"
          )}
        >
          {/* Efeito Atmosférico Suave de Fundo Conforme a Fase do Sistema Estelar */}
          {orbPhase === 2 && (
            <div className="absolute top-[-30px] right-0 w-[600px] max-w-full h-[320px] bg-rose-500/[0.05] dark:bg-rose-500/[0.08] rounded-full blur-3xl pointer-events-none animate-pulse" />
          )}
          {orbPhase === 3 && (
            <div
              className="absolute top-[-30px] right-0 w-[640px] max-w-full h-[340px] rounded-full pointer-events-none transition-all duration-700 z-0 opacity-80 dark:opacity-100"
              style={{
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                maskImage: "radial-gradient(circle at 75% 45%, rgba(0,0,0,1) 15%, rgba(0,0,0,0.5) 50%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(circle at 75% 45%, rgba(0,0,0,1) 15%, rgba(0,0,0,0.5) 50%, transparent 80%)",
                background: "radial-gradient(circle at 75% 45%, hsl(var(--primary) / 0.12) 0%, hsl(var(--destructive) / 0.05) 45%, transparent 75%)",
              }}
            />
          )}

          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 px-2 animate-fade-in relative z-10">
            <div className="flex items-center gap-4 md:pt-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-[18px] flex items-center justify-center text-white shadow-lg transition-all duration-700",
                  (orbPhase === 1 || orbPhase === 3) && "bg-primary shadow-primary/20",
                  orbPhase === 2 && "bg-rose-600 shadow-rose-600/30 animate-pulse"
                )}
              >
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-foreground">Visão Geral</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Sua saúde financeira em tempo real</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 self-start md:self-auto">
              <DateOrb onPhaseChange={setOrbPhase} />
            </div>
          </header>

          {/* 1. Saldo em Contas */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <AccountBalanceCards />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
            {/* 2. Despesas a Vencer */}
            <div className="xl:col-span-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <UpcomingExpenses />
            </div>

            {/* 4. Distribuição Financeira */}
            <div className="xl:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <FinancialDistributionChart />
            </div>
          </div>

          {/* 3. Comparativo de Despesas */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <ExpenseComparisonCharts />
          </section>

          {/* 5. Evolução Financeira */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <FinancialEvolutionChart />
          </section>

          {/* 6. Evolução das Despesas */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <CategoryEvolutionChart />
          </section>

          {/* 7. Bens */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <AssetCards />
          </section>

          {/* 8. Empréstimos */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <LoanContractCards />
          </section>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
};

export default Index;