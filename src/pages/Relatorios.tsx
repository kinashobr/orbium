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
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function Relatorios() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { dateRanges, setDateRanges } = useFinance();
  const [activeTab, setActiveTab] = useState("balanco");

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  const tabOptions = [
    { value: "balanco", label: "Balanço", icon: Scale },
    { value: "dre", label: "DRE", icon: Receipt },
    { value: "indicadores", label: "KPIs", icon: Activity },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-10 pb-12 max-w-[1200px] mx-auto">
        <header className="flex flex-col gap-6 sm:gap-10 px-1 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10">
                <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl sm:text-4xl leading-none tracking-tight text-foreground">Relatórios</h1>
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                   <Sparkles className="w-3.5 h-3.5 text-accent" />
                   <p className="text-[10px] sm:text-xs text-muted-foreground font-black tracking-[0.15em] uppercase opacity-60">Inteligência Patrimonial</p>
                </div>
              </div>
            </div>

            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange}
              className="h-10 sm:h-12 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm px-6 sm:px-8 font-bold text-xs sm:text-sm"
            />
          </div>

          <div className="flex justify-center w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-3 h-12 sm:h-14 bg-muted/30 p-1 rounded-2xl sm:rounded-[2rem] border border-border/40">
                {tabOptions.map((opt) => (
                  <TabsTrigger 
                    key={opt.value} 
                    value={opt.value}
                    className={cn(
                      "rounded-xl sm:rounded-[1.75rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                      "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-lg"
                    )}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                      <opt.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {opt.label}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        <div className="animate-fade-in-up">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="balanco" className="mt-0 focus-visible:outline-none"><BalancoTab dateRanges={dateRanges} /></TabsContent>
            <TabsContent value="dre" className="mt-0 focus-visible:outline-none"><DRETab dateRanges={dateRanges} /></TabsContent>
            <TabsContent value="indicadores" className="mt-0 focus-visible:outline-none"><IndicadoresTab dateRanges={dateRanges} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}