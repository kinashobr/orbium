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

const Index = () => {
  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-5 sm:space-y-6 md:space-y-8 pb-20 max-w-[1600px] mx-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 px-2 animate-fade-in">
            <div className="flex items-center gap-4 md:pt-3">
              <div className="w-12 h-12 rounded-[18px] bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-foreground">Visão Geral</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Sua saúde financeira em tempo real</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 self-start md:self-auto">
              <DateOrb />
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