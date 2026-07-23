"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency, Categoria } from "@/types/finance";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from "recharts";
import { format, subMonths, isSameMonth, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useEffect } from "react";
import { useChartColors } from "@/hooks/useChartColors";
import { parseDateLocal, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";

const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", 
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#64748b"
];

const getBillCategoryLabel = (bill: any, categoriasV2: Categoria[]) => {
  const categoryId = bill.suggestedCategoryId || bill.categoryId;
  if (categoryId) {
    const category = categoriasV2.find(c => c.id === categoryId);
    if (category) return category.label;
  }

  const desc = (bill.description || "").toLowerCase();
  if (desc.includes("academia")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("academia"));
    if (cat) return cat.label;
    return "Academia";
  }
  if (desc.includes("energia") || desc.includes("luz")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("energia") || c.label.toLowerCase().includes("luz"));
    if (cat) return cat.label;
    return "Energia Elétrica";
  }
  if (desc.includes("internet") || desc.includes("wifi")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("internet") || c.label.toLowerCase().includes("wifi"));
    if (cat) return cat.label;
    return "Internet";
  }
  if (desc.includes("seguro")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("seguro"));
    if (cat) return cat.label;
    return "Seguro";
  }
  if (desc.includes("cabelo") || desc.includes("remedio") || desc.includes("remédio") || desc.includes("vitamina") || desc.includes("manual")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("médic") || c.label.toLowerCase().includes("remedio") || c.label.toLowerCase().includes("saúde") || c.label.toLowerCase().includes("vitamin"));
    if (cat) return cat.label;
    return "Remédios e Vitaminas";
  }
  if (desc.includes("combustivel") || desc.includes("gasolina") || desc.includes("posto")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("combustiv"));
    if (cat) return cat.label;
    return "Combustivel";
  }
  if (desc.includes("barbeiro") || desc.includes("cabelereiro") || desc.includes("corte")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("barbeir") || c.label.toLowerCase().includes("cabel"));
    if (cat) return cat.label;
    return "Barbeiro / Cabelereiro";
  }
  if (desc.includes("empréstimo") || desc.includes("emprestimo") || desc.includes("financiamento")) {
    const cat = categoriasV2.find(c => c.label.toLowerCase().includes("empréstimo") || c.label.toLowerCase().includes("emprestimo") || c.label.toLowerCase().includes("financiamento"));
    if (cat) return cat.label;
    return "Financiam.";
  }

  if (bill.sourceType === "card_invoice") return "Fatura";
  if (bill.sourceType === "loan_installment") return "Financiam.";
  if (bill.sourceType === "insurance_installment") return "Seguro";

  return "Compromissos Planejados";
};

export const ExpenseComparisonCharts = () => {
  const { 
    transacoesV2, 
    billsTracker, 
    categoriasV2, 
    emprestimos,
    getBillsForMonth,
    getOtherPaidExpensesForMonth,
    generateInvoiceBills,
    autoPopulateFixedBills
  } = useFinance();
  const colors = useChartColors();
  const [showTotalBudget, setShowTotalBudget] = useState(false);
  const now = new Date();
  const prevMonth = subMonths(now, 1);

  // Auto-populate fixed bills when component loads so we have correct dashboard stats
  useEffect(() => {
    autoPopulateFixedBills(now);
    autoPopulateFixedBills(prevMonth);
  }, [autoPopulateFixedBills]);

  const { prevMonthData, currMonthData, currMonthPlannedData } = useMemo(() => {
    const calculationNow = new Date();
    const calculationPrevMonth = subMonths(calculationNow, 1);

    const getCategoryData = (date: Date, mode: 'realized' | 'total') => {
      const categoryTotals: Record<string, number> = {};
      
      if (mode === 'realized') {
        // Realized expenses
        transacoesV2.forEach(tx => {
          const txDate = parseDateLocal(tx.date);
          if (isSameMonth(txDate, date) && isSameYear(txDate, date)) {
            if (tx.operationType === 'despesa' || tx.operationType === 'pagamento_emprestimo') {
              const category = categoriasV2.find(c => c.id === tx.categoryId);
              let label = category?.label || "Outros";
              
              // Map loan payments to a specific label if no category is found
              if (tx.operationType === 'pagamento_emprestimo' && label === "Outros") {
                const loanIdStr = tx.links?.loanId;
                const loanId = loanIdStr ? parseInt(loanIdStr.replace('loan_', '')) : null;
                label = loanId ? `Empréstimo ${loanId}` : "Empréstimo";
              }

              if (label !== "Outros") {
                categoryTotals[label] = (categoryTotals[label] || 0) + tx.amount;
              } else if (tx.amount > 0) {
                categoryTotals["Não Categorizado"] = (categoryTotals["Não Categorizado"] || 0) + tx.amount;
              }
            }
          }
        });
      } else {
        // Orçado (Total Planned): computed purely from the bills displayed in "Contas a Pagar" for that month!
        const trackerManagedBills = getBillsForMonth(date);
        const externalPaidBills = getOtherPaidExpensesForMonth(date);
        const invoiceBills = generateInvoiceBills(date);
        
        const trackerBillIds = new Set(trackerManagedBills.map(b => b.id));
        const newInvoiceBills = invoiceBills.filter(b => !trackerBillIds.has(b.id));

        const syncedTrackerBills = trackerManagedBills.map(b => {
          if (b.type === 'tracker' && b.sourceType === 'card_invoice' && !b.isPaid) {
            const freshInvoice = invoiceBills.find(inv => inv.id === b.id);
            if (freshInvoice && freshInvoice.expectedAmount !== b.expectedAmount) {
              return { ...b, expectedAmount: freshInvoice.expectedAmount };
            }
          }
          return b;
        });

        const trackerPaidTxIds = new Set(syncedTrackerBills.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
        const filtered = externalPaidBills.filter(eb => !trackerPaidTxIds.has(eb.id));
        const combinedBills = [...syncedTrackerBills, ...newInvoiceBills, ...filtered]
          .filter(bill => bill.sourceType !== "card_invoice" && getBillCategoryLabel(bill, categoriasV2) !== "Fatura");

        combinedBills.forEach(bill => {
          const label = getBillCategoryLabel(bill, categoriasV2);
          const amount = bill.expectedAmount;
          if (amount > 0) {
            categoryTotals[label] = (categoryTotals[label] || 0) + amount;
          }
        });
      }

      return Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
    };

    return {
      prevMonthData: getCategoryData(calculationPrevMonth, 'realized'),
      currMonthData: getCategoryData(calculationNow, 'realized'),
      currMonthPlannedData: getCategoryData(calculationNow, 'total')
    };
  }, [transacoesV2, billsTracker, categoriasV2, getBillsForMonth, getOtherPaidExpensesForMonth, generateInvoiceBills]);

  const activeCurrData = showTotalBudget ? currMonthPlannedData : currMonthData;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-[24px] shadow-soft-xl border border-border/40 backdrop-blur-md z-[999] relative">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-lg font-display font-black text-foreground tabular-nums">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-muted/5 flex items-center justify-center border border-dashed border-border/40">
        <RefreshCw className="w-8 h-8 text-muted-foreground/20" />
      </div>
      <div>
        <p className="text-sm font-bold text-muted-foreground">{message}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-2">Orbium Insight</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Comparativo de Despesas</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mês Anterior */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[48px] p-10 shadow-soft border border-white/60 dark:border-white/5 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[100px]" />
          </div>
          
          <div className="text-center mb-10 relative">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-70">Despesas em</span>
            <h4 className="text-xl font-bold text-foreground capitalize">{format(prevMonth, 'MMMM yyyy', { locale: ptBR })}</h4>
          </div>

          <div className="flex-1 w-full min-h-[350px] relative flex flex-col items-center justify-center">
            {prevMonthData.length > 0 ? (
              <div className="w-full h-full flex flex-col items-center">
                <div className="w-full h-[300px] relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Mês Ant.</span>
                    <p className="text-2xl font-black text-foreground tracking-tighter">
                      {formatCurrency(prevMonthData.reduce((acc, item) => acc + item.value, 0))}
                    </p>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prevMonthData}
                        cx="50%"
                        cy="50%"
                        innerRadius="72%"
                        outerRadius="95%"
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                      >
                        {prevMonthData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {prevMonthData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/5 border border-border/40 shadow-sm">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState message="Sem despesas no mês anterior" />
            )}
          </div>
        </div>

        {/* Mês Atual */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[48px] p-10 shadow-soft border border-white/60 dark:border-white/5 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary blur-[100px]" />
          </div>

          <div className="flex flex-col items-center mb-10 w-full relative">
            <div className="text-center">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-70">Despesas em</span>
              <h4 className="text-xl font-bold text-foreground capitalize">{format(now, 'MMMM yyyy', { locale: ptBR })}</h4>
            </div>
            
            <div className="absolute top-0 right-0 p-1 bg-muted/20 rounded-full flex items-center gap-1 border border-white/10 shadow-inner">
              <Button 
                variant={!showTotalBudget ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setShowTotalBudget(false)}
                className={cn(
                  "rounded-full h-7 px-4 text-[9px] font-black uppercase tracking-widest transition-all",
                  !showTotalBudget ? "bg-[#5D4037] text-white shadow-sm hover:bg-[#4E342E]" : "text-muted-foreground hover:bg-[#5D4037]/10"
                )}
              >
                Real
              </Button>
              <Button 
                variant={showTotalBudget ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setShowTotalBudget(true)}
                className={cn(
                  "rounded-full h-7 px-4 text-[9px] font-black uppercase tracking-widest transition-all",
                  showTotalBudget ? "bg-[#5D4037] text-white shadow-sm hover:bg-[#4E342E]" : "text-muted-foreground hover:bg-[#5D4037]/10"
                )}
              >
                Orçado
              </Button>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[350px] relative flex flex-col items-center justify-center">
            {activeCurrData.length > 0 ? (
              <div className="w-full h-full flex flex-col items-center">
                <div className="w-full h-[300px] relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total {showTotalBudget ? "Orçado" : "Realizado"}</span>
                    <p className="text-2xl font-black text-foreground tracking-tighter">
                      {formatCurrency(activeCurrData.reduce((acc, item) => acc + item.value, 0))}
                    </p>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeCurrData}
                        cx="50%"
                        cy="50%"
                        innerRadius="72%"
                        outerRadius="95%"
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                      >
                        {activeCurrData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {activeCurrData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/5 border border-border/40 shadow-sm">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState message={showTotalBudget ? "Nenhuma despesa orçada" : "Nenhuma despesa realizada"} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
