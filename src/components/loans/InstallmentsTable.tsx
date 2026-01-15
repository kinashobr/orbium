import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useFinance, AmortizationItem } from "@/contexts/FinanceContext";
import { Emprestimo, TransacaoCompleta } from "@/types/finance";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Parcela extends AmortizationItem {
  dataVencimento: Date;
  valorTotal: number;
  status: "pago" | "pendente" | "atrasado";
  dataPagamento?: string;
  valorPago?: number;
}

interface InstallmentsTableProps {
  emprestimo: Emprestimo;
  className?: string;
}

export function InstallmentsTable({ emprestimo, className }: InstallmentsTableProps) {
  const { transacoesV2, calculateLoanSchedule } = useFinance();
  
  const payments = useMemo(() => {
    return transacoesV2.filter(t => 
      t.operationType === 'pagamento_emprestimo' && 
      t.links?.loanId === `loan_${emprestimo.id}`
    );
  }, [transacoesV2, emprestimo.id]);

  const parcelas = useMemo<Parcela[]>(() => {
    if (!emprestimo.dataInicio || emprestimo.meses === 0) return [];
    const hoje = new Date();
    const schedule = calculateLoanSchedule(emprestimo.id);

    const paymentsMap = new Map<number, TransacaoCompleta>();
    payments.forEach(p => {
      const parcelaNum = p.links?.parcelaId ? parseInt(p.links.parcelaId) : undefined;
      if (parcelaNum) paymentsMap.set(parcelaNum, p);
    });
    
    return schedule.map((item) => {
      const dataVencimento = getDueDate(emprestimo.dataInicio!, item.parcela);
      const payment = paymentsMap.get(item.parcela);
      
      let status: Parcela["status"] = "pendente";
      if (payment) status = "pago";
      else if (dataVencimento < hoje) status = "atrasado";
      
      return { ...item, dataVencimento, valorTotal: emprestimo.parcela, status, dataPagamento: payment?.date, valorPago: payment?.amount };
    });
  }, [emprestimo, payments, calculateLoanSchedule]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const statusConfig = {
    pago: { icon: CheckCircle2, color: "bg-success/10 text-success border-none", label: "PAGO" },
    pendente: { icon: Clock, color: "bg-muted/50 text-muted-foreground border-none", label: "PENDENTE" },
    atrasado: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-none", label: "ATRASADO" },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {parcelas.map((parcela) => {
          const config = statusConfig[parcela.status];
          const StatusIcon = config.icon;
          return (
            <div key={parcela.parcela} className={cn("p-4 rounded-2xl border transition-all", parcela.status === 'pago' ? "bg-success/[0.02] border-success/20 opacity-75" : "bg-card border-border/40")}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                   <div className="p-1.5 rounded-lg bg-muted/50 text-[10px] font-black">#{parcela.parcela}</div>
                   <div>
                      <p className="font-bold text-sm">{format(parcela.dataVencimento, 'dd/MM/yyyy')}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{format(parcela.dataVencimento, 'EEEE', { locale: ptBR })}</p>
                   </div>
                </div>
                <Badge className={cn("text-[8px] font-black px-2 py-0.5 rounded-md", config.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" /> {config.label}
                </Badge>
              </div>
              <div className="flex justify-between items-end border-t border-border/20 pt-3">
                 <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Valor da Parcela</p>
                    <p className="font-black text-lg text-foreground">{formatCurrency(parcela.valorTotal)}</p>
                 </div>
                 <div className="text-right text-[9px] font-bold text-muted-foreground">Principal: {formatCurrency(parcela.amortizacao)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-[2rem] border border-border/40 overflow-hidden">
        <div className="max-h-[550px] overflow-y-auto scrollbar-material">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="border-none hover:bg-transparent h-12">
                <TableHead className="w-16 text-center text-[10px] font-black uppercase tracking-widest">P.</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Vencimento</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Valor Total</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Principal</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Juros</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Saldo Devedor</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => {
                const config = statusConfig[parcela.status];
                const StatusIcon = config.icon;
                const isPaid = parcela.status === 'pago';

                return (
                  <TableRow key={parcela.parcela} className={cn("border-b border-border/40 transition-colors h-14 group", isPaid ? "bg-success/[0.02] opacity-70" : "hover:bg-muted/20")}>
                    <TableCell className="text-center font-bold text-muted-foreground text-xs">{parcela.parcela}</TableCell>
                    <TableCell className="font-bold text-sm">{format(parcela.dataVencimento, 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right font-black text-sm">{formatCurrency(parcela.valorTotal)}</TableCell>
                    <TableCell className="text-right text-success/80 font-bold text-xs">{formatCurrency(parcela.amortizacao)}</TableCell>
                    <TableCell className="text-right text-destructive/80 font-bold text-xs">{formatCurrency(parcela.juros)}</TableCell>
                    <TableCell className="text-right font-black text-muted-foreground text-xs tabular-nums">{formatCurrency(parcela.saldoDevedor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("gap-1 text-[9px] font-black px-3 py-1 rounded-xl", config.color)}>
                        <StatusIcon className="w-3 h-3" /> {config.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}