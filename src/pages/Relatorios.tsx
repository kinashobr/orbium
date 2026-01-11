"use client";

import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalancoTab } from "@/components/reports/BalancoTab";
import { DRETab } from "@/components/reports/DRETab";
import { IndicadoresTab } from "@/components/reports/IndicadoresTab";
import { Scale, Receipt, Activity, BarChart3, Sparkles } from "lucide-react";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { ComparisonDateRanges } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { cn } from "@/lib/utils";

export default function Relatorios() {
  const { dateRanges, setDateRanges } = useFinance();
  const [activeTab, setActiveTab] = useState("balanco");

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  const tabOptions = [
    { value: "balanco", label: "Balanço", icon: Scale },
    { value: "dre", label: "DRE", icon: Receipt },
    { value: "indicadores", label: "Saúde", icon: Activity },
  ];

  return (
    <MainLayout>
      <div className="space-y-8 pb-12">
        <header className="flex flex-col gap-8 px-1 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="font-display font-bold text-4xl leading-none tracking-tight text-foreground">Relatórios</h1>
                <div className="flex items-center gap-2 mt-1.5">
                   <Sparkles className="w-4 h-4 text-accent" />
                   <p className="text-sm text-muted-foreground font-black tracking-[0.15em] uppercase opacity-60">Inteligência Financeira</p>
                </div>
              </div>
            </div>

            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange}
              className="h-12 rounded-[1.25rem] bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm px-8 font-bold text-sm"
            />
          </div>

          {/* Navegação Centralizada - Material 3 Expressive */}
          <div className="flex justify-center w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-lg">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-muted/30 p-1.5 rounded-[2rem] border border-border/40">
                {tabOptions.map((opt) => (
                  <TabsTrigger 
                    key={opt.value} 
                    value={opt.value}
                    className={cn(
                      "rounded-[1.75rem] text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300",
                      "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:scale-[1.02]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <opt.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      {opt.label}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsContent value="balanco" className="mt-0 focus-visible:outline-none">
            <BalancoTab dateRanges={dateRanges} />
          </TabsContent>
          <TabsContent value="dre" className="mt-0 focus-visible:outline-none">
            <DRETab dateRanges={dateRanges} />
          </TabsContent>
          <TabsContent value="indicadores" className="mt-0 focus-visible:outline-none">
            <IndicadoresTab dateRanges={dateRanges} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}