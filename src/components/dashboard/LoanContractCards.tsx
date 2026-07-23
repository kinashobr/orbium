"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency, Emprestimo } from "@/types/finance";
import { 
  Building2, 
  Calendar, 
  TrendingDown, 
  Percent,
  Clock,
  ArrowRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { LoanDetailDialog } from "@/components/loans/LoanDetailDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDueDate } from "@/lib/utils";

export const LoanContractCards = () => {
  const { 
    emprestimos, 
    calculateLoanSchedule, 
    calculatePaidInstallmentsUpToDate 
  } = useFinance();
  const [selectedLoan, setSelectedLoan] = useState<Emprestimo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const activeLoans = emprestimos.filter(e => e.status !== 'quitado' && e.status !== 'pendente_config');

  const handleLoanClick = (loan: Emprestimo) => {
    setSelectedLoan(loan);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Empréstimos e Financiamentos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeLoans.map((loan) => {
          const parcelasPagas = calculatePaidInstallmentsUpToDate(loan.id, new Date());
          const schedule = calculateLoanSchedule(loan.id);
          const currentInstallment = schedule.find(i => i.parcela === parcelasPagas + 1) || schedule[schedule.length - 1];
          const saldoDevedor = currentInstallment?.saldoDevedor || 0;
          const nextDueDate = getDueDate(loan.dataInicio || new Date().toISOString(), parcelasPagas + 1);
          const progress = (parcelasPagas / loan.meses) * 100;

          return (
            <div 
              key={`loan-${loan.id}`}
              onClick={() => handleLoanClick(loan)}
              className="bg-card rounded-[32px] p-6 border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg group hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 p-8 text-amber-950/[0.08] dark:text-white/[0.08] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Building2 className="w-52 h-52" />
              </div>

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-80">Contrato</p>
                    <h4 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{loan.contrato}</h4>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-2xl text-primary ring-1 ring-black/5 dark:ring-white/5 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <Building2 className="w-7 h-7" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-tight opacity-70">Parcela Atual</p>
                    <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{formatCurrency(loan.parcela)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-tight opacity-70">Vencimento</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">{format(nextDueDate, 'dd/MM')}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-tight opacity-70">Saldo Devedor</p>
                    <p className="text-base sm:text-lg font-black text-destructive tabular-nums">{formatCurrency(saldoDevedor)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-tight opacity-70">Juros (a.m)</p>
                    <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{loan.taxaMensal}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <span>Progresso</span>
                    <span>{parcelasPagas} / {loan.meses} parcelas</span>
                  </div>
                  <div className="h-3 bg-muted/30 rounded-full overflow-hidden p-0.5 shadow-inner ring-1 ring-border/20">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-black text-primary group-hover:underline">
                  Ver cronograma completo <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}

        {activeLoans.length === 0 && (
          <div className="col-span-2 py-10 bg-muted/5 border-2 border-dashed border-muted/20 rounded-[32px] flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center text-muted-foreground">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhum contrato ativo encontrado.</p>
          </div>
        )}
      </div>

      <LoanDetailDialog 
        emprestimo={selectedLoan}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};
