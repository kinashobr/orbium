"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency, BillTracker } from "@/types/finance";
import { format, isAfter, isSameDay, startOfDay, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn, parseDateLocal } from "@/lib/utils";
import { CalendarDays, CheckCircle2, AlertCircle, ArrowUpRight, Sparkles, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMemo } from "react";

export const UpcomingExpenses = () => {
  const { 
    billsTracker, 
    getBillsForMonth, 
    getPotentialFixedBillsForMonth, 
    contasMovimento,
    categoriasV2 
  } = useFinance();
  const navigate = useNavigate();

  const { allBills } = useMemo(() => {
    const calculationNow = new Date();
    const monthBills = getBillsForMonth(calculationNow);
    const fixedBills = getPotentialFixedBillsForMonth(calculationNow, billsTracker);
    
    // Merge and sort
    const merged = [...monthBills];
    
    // Add fixed bills that are not already in merged
    fixedBills.forEach(fb => {
      if (!merged.find(b => b.dueDate === fb.dueDate && b.description === fb.description)) {
        merged.push({
          id: `potential_${fb.key}`,
          description: fb.description,
          dueDate: fb.dueDate,
          expectedAmount: fb.expectedAmount,
          isPaid: fb.isPaid,
          sourceType: fb.sourceType,
          suggestedCategoryId: (fb as any).suggestedCategoryId,
          type: 'tracker'
        } as BillTracker);
      }
    });

    return { allBills: merged.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime()) };
  }, [getBillsForMonth, getPotentialFixedBillsForMonth, billsTracker]);

  const unpaidBills = allBills.filter(b => !b.isPaid);
  const everythingPaid = allBills.length > 0 && unpaidBills.length === 0;

  const getAccountName = (accountId?: string) => {
    if (!accountId) return "N/A";
    return contasMovimento.find(a => a.id === accountId)?.name || "N/A";
  };

  const getCategoryInfo = (bill: BillTracker) => {
    if (bill.suggestedCategoryId) {
      const cat = categoriasV2.find(c => c.id === bill.suggestedCategoryId);
      if (cat) {
        return {
          icon: cat.icon || "🏷️",
          label: cat.label
        };
      }
    }

    switch (bill.sourceType) {
      case 'loan_installment':
        return { icon: "🏦", label: "Empréstimo" };
      case 'insurance_installment':
        return { icon: "🛡️", label: "Seguro" };
      case 'card_invoice':
        return { icon: "💳", label: "Fatura de Cartão" };
      case 'purchase_installment':
        return { icon: "🛍️", label: "Compra Parcelada" };
      case 'fixed_expense':
        return { icon: "📌", label: "Despesa Fixa" };
      case 'variable_expense':
        return { icon: "📊", label: "Despesa Variável" };
      default:
        return { icon: "💸", label: "Outras Despesas" };
    }
  };

  const getStatusInfo = (bill: BillTracker, now: Date) => {
    const dueDate = parseDateLocal(bill.dueDate);
    const today = startOfDay(now);
    const dueDay = startOfDay(dueDate);

    if (bill.isPaid) {
      const paidDateStr = bill.paymentDate ? format(parseDateLocal(bill.paymentDate), "dd/MM/yyyy", { locale: ptBR }) : null;
      return {
        type: "paid",
        label: "Pago",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeDot: "bg-emerald-500",
        icon: CheckCircle2,
        description: paidDateStr ? `Pago em ${paidDateStr}` : "Esta despesa já foi quitada.",
      };
    }

    if (isAfter(today, dueDay)) {
      const daysOverdue = differenceInCalendarDays(today, dueDay);
      const daysText = daysOverdue === 1 ? "1 dia" : `${daysOverdue} dias`;
      const formattedDate = format(dueDate, "dd/MM/yyyy", { locale: ptBR });
      return {
        type: "overdue",
        label: "Vencido",
        colorClass: "bg-destructive/10 text-destructive border-destructive/20",
        badgeDot: "bg-destructive animate-pulse",
        icon: AlertCircle,
        description: `Atrasado há ${daysText} (venceu em ${formattedDate}). Requer atenção!`,
      };
    }

    if (isSameDay(today, dueDay)) {
      return {
        type: "today",
        label: "Vence Hoje",
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        badgeDot: "bg-amber-500 animate-pulse",
        icon: Clock,
        description: "Vence hoje! Lembre-se de efetuar o pagamento até o final do dia.",
      };
    }

    const daysRemaining = differenceInCalendarDays(dueDay, today);
    const daysText = daysRemaining === 1 ? "Amanhã" : `em ${daysRemaining} dias`;
    const formattedDate = format(dueDate, "dd/MM/yyyy", { locale: ptBR });
    return {
      type: "pending",
      label: "A Vencer",
      colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      badgeDot: "bg-blue-500",
      icon: Clock,
      description: `Vencimento ${daysText} (${formattedDate}).`,
    };
  };

  const now = useMemo(() => new Date(), []);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Despesas a Vencer</h3>
          <button 
            onClick={() => navigate("/contas-pagar")}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            Ver tudo <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/60 dark:border-white/5 relative overflow-hidden">
          {everythingPaid ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-lg font-bold text-foreground">Tudo em dia! 🎉</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Você pagou todas as contas previstas para este mês. Que tal evitar novos gastos agora e fortalecer suas reservas?
                </p>
              </div>
              <Badge variant="outline" className="bg-success/5 text-success border-success/20 px-4 py-1">
                Meta de Pagamentos Atingida
              </Badge>
            </div>
          ) : allBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-60">
              <CalendarDays className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma despesa registrada para este mês.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vencimento</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Despesa</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Conta</th>
                    <th className="text-center py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {allBills.map((bill) => {
                    const dueDate = parseDateLocal(bill.dueDate);
                    const catInfo = getCategoryInfo(bill);
                    const status = getStatusInfo(bill, now);
                    
                    return (
                      <tr 
                        key={bill.id} 
                        className="group hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => navigate("/contas-pagar")}
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-foreground">
                            {format(dueDate, "dd/MM")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center text-base shrink-0 shadow-2xs group-hover:bg-primary/10 transition-colors">
                              {catInfo.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {bill.description}
                              </p>
                              <span className="text-[11px] font-medium text-muted-foreground/80 line-clamp-1">
                                {catInfo.label}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="text-sm font-extrabold text-foreground tabular-nums">
                            {formatCurrency(bill.expectedAmount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-medium text-muted-foreground">
                            {getAccountName(bill.suggestedAccountId)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center justify-center cursor-help">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 shadow-2xs",
                                  status.colorClass
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", status.badgeDot)} />
                                  {status.label}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] p-3 shadow-xl border border-border/80 bg-popover">
                              <div className="flex items-start gap-2.5">
                                <status.icon className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
                                <div className="space-y-0.5">
                                  <p className="font-bold text-xs text-foreground">{status.label}</p>
                                  <p className="text-[11px] text-muted-foreground leading-snug">{status.description}</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
