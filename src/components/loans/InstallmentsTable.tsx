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
import { Check, Clock, AlertTriangle } from "lucide-react";
import { useFinance, AmortizationItem } from "@/contexts/FinanceContext";
import { Emprestimo, TransacaoCompleta } from "@/types/finance";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";

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
      if (payment) {
        status = "pago";
      } else if (dataVencimento < hoje) {
        status = "atrasado";
      }
      
      return {
        ...item,
        dataVencimento,
        valorTotal: emprestimo.parcela,
        status,
        dataPagamento: payment?.date,
        valorPago: payment?.amount,
      };
    });
  }, [emprestimo, payments, calculateLoanSchedule]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const statusConfig = {
    pago: { icon: Check, color: "bg-success/10 text-success border-success/20", label: "Pago" },
    pendente: { icon: Clock, color: "bg-muted text-muted-foreground border-border", label: "Pendente" },
    atrasado: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20", label: "Atrasado" },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-2">
        {parcelas.map((parcela) => {
          const config = statusConfig[parcela.status];
          const StatusIcon = config.icon;
          
          return (
            <div
              key={parcela.parcela}
              className={cn(
                "glass-card p-3 space-y-2",
                parcela.status === 'pago' && "border-l-2 border-l-success",
                parcela.status === 'atrasado' && "border-l-2 border-l-destructive"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground">#{parcela.parcela}</span>
                  <span className="text-sm font-medium">
                    {parcela.dataVencimento.toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Valor da Parcela</span>
                <span className="font-bold text-sm">{formatCurrency(emprestimo.parcela)}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/50">
                <div>
                  <p className="text-muted-foreground">Amortiz.</p>
                  <p className="font-medium text-success/80">{formatCurrency(parcela.amortizacao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Juros</p>
                  <p className="font-medium text-destructive/80">{formatCurrency(parcela.juros)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo</p>
                  <p className="font-medium">{formatCurrency(parcela.saldoDevedor)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-16 text-center">Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Amortização</TableHead>
                <TableHead className="text-right">Juros</TableHead>
                <TableHead className="text-right">Saldo Devedor</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => {
                const config = statusConfig[parcela.status];
                const StatusIcon = config.icon;
                const isPaid = parcela.status === 'pago';

                return (
                  <TableRow
                    key={parcela.parcela}
                    className={cn(
                      "border-border transition-colors",
                      isPaid ? "bg-success/5 hover:bg-success/10" : "hover:bg-muted/30",
                      parcela.status === 'atrasado' && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    <TableCell className="text-center font-medium text-muted-foreground">{parcela.parcela}</TableCell>
                    <TableCell className="font-medium">
                      {parcela.dataVencimento.toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(emprestimo.parcela)}
                    </TableCell>
                    <TableCell className="text-right text-success/80 text-sm">
                      {formatCurrency(parcela.amortizacao)}
                    </TableCell>
                    <TableCell className="text-right text-destructive/80 text-sm">
                      {formatCurrency(parcela.juros)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">
                      {formatCurrency(parcela.saldoDevedor)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("gap-1 font-semibold px-2 py-0.5", config.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
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