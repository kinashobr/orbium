import { useMemo, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, X, DollarSign, Shield, ListChecks, Car, Building2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { PotentialFixedBill, formatCurrency, BillTracker } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface AllInstallmentsReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceDate: Date;
  localBills: BillTracker[];
  onToggleInstallment: (potentialBill: PotentialFixedBill, isChecked: boolean) => void;
}

const InstallmentTable = ({
    installments,
    referenceDate,
    onToggle,
    type
}: {
    installments: PotentialFixedBill[];
    referenceDate: Date;
    onToggle: (bill: PotentialFixedBill) => void;
    type: 'loan' | 'insurance';
}) => {
    const paidCount = installments.filter(b => b.isPaid).length;
    const pendingCount = installments.filter(b => !b.isPaid).length;
    
    const Icon = type === 'loan' ? Building2 : Car;

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {type === 'loan' ? 'Empréstimos' : 'Seguros'} ({installments.length} parcelas)
                </h4>
                <div className="flex gap-3 text-xs">
                    <span className="text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {paidCount} Pagas
                    </span>
                    <span className="text-warning flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {pendingCount} Pendentes
                    </span>
                </div>
            </div>
            
            <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0 h-full overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                            <TableRow>
                                <TableHead className="w-[120px]">Vencimento</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right w-[150px]">Valor</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[100px] text-center">Planejamento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {installments.map((bill) => {
                                const dueDate = parseDateLocal(bill.dueDate);
                                const isFuture = dueDate > referenceDate;
                                
                                return (
                                    <TableRow 
                                        key={bill.key} 
                                        className={cn(
                                            bill.isPaid && "bg-success/5 text-success",
                                            bill.isIncluded && !bill.isPaid && "bg-primary/5",
                                            isFuture && !bill.isPaid && "text-muted-foreground/80"
                                        )}
                                    >
                                        <TableCell>
                                            {format(dueDate, 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">{bill.description}</TableCell>
                                        <TableCell className="text-right font-black text-sm tabular-nums">
                                            {formatCurrency(bill.expectedAmount)}
                                        </TableCell>
                                        <TableCell className="text-center text-[10px] font-black uppercase">
                                            {bill.isPaid ? (
                                                <span className="text-success flex items-center justify-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> PAGA
                                                </span>
                                            ) : (
                                                <span className={cn(isFuture ? "text-muted-foreground" : "text-destructive")}>
                                                    {isFuture ? 'FUTURA' : 'VENCENDO'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {bill.isPaid ? (
                                                <Button variant="ghost" size="sm" disabled className="h-8 text-success text-[10px] font-black uppercase">
                                                    PAGO
                                                </Button>
                                            ) : (
                                                <Button 
                                                    variant={bill.isIncluded ? "destructive" : "default"} 
                                                    size="sm"
                                                    onClick={() => onToggle(bill)}
                                                    className="h-8 text-[10px] font-black uppercase rounded-lg px-3"
                                                >
                                                    {bill.isIncluded ? 'EXCLUIR' : 'INCLUIR'}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {installments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                        Nenhuma parcela ativa encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};


export function AllInstallmentsReviewModal({
  open,
  onOpenChange,
  referenceDate,
  localBills,
  onToggleInstallment,
}: AllInstallmentsReviewModalProps) {
  const { getPotentialFixedBillsForMonth, getFutureFixedBills } = useFinance();
  const [activeTab, setActiveTab] = useState('loan');

  const allFixedInstallments = useMemo(() => {
    const currentMonthBills = getPotentialFixedBillsForMonth(referenceDate, localBills);
    const futureBills = getFutureFixedBills(referenceDate, localBills);
    const combinedMap = new Map<string, PotentialFixedBill>();
    [...currentMonthBills, ...futureBills].forEach(bill => combinedMap.set(bill.key, bill));
    return Array.from(combinedMap.values()).sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [referenceDate, localBills, getPotentialFixedBillsForMonth, getFutureFixedBills]);
  
  const loanInstallments = useMemo(() => allFixedInstallments.filter(b => b.sourceType === 'loan_installment'), [allFixedInstallments]);
  const insuranceInstallments = useMemo(() => allFixedInstallments.filter(b => b.sourceType === 'insurance_installment'), [allFixedInstallments]);

  const handleToggle = useCallback((bill: PotentialFixedBill) => {
    if (bill.isPaid) {
        toast.info("Parcelas pagas não podem ser alteradas aqui.");
        return;
    }
    onToggleInstallment(bill, !bill.isIncluded);
  }, [onToggleInstallment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        className="max-w-[min(95vw,64rem)] h-[min(90vh,900px)] p-0 flex flex-col rounded-[2.5rem] shadow-2xl bg-card"
      >
        <DialogHeader className="px-8 pt-10 pb-6 border-b shrink-0 bg-muted/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ListChecks className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight">Revisão de Parcelas Fixas</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 sm:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-muted/50 shrink-0 h-auto p-1.5 rounded-2xl border mb-6">
                    <TabsTrigger value="loan" className="flex-1 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest h-10 data-[state=active]:bg-card">
                        <Building2 className="w-4 h-4" />
                        Empréstimos ({loanInstallments.length})
                    </TabsTrigger>
                    <TabsTrigger value="insurance" className="flex-1 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest h-10 data-[state=active]:bg-card">
                        <Shield className="w-4 h-4" />
                        Seguros ({insuranceInstallments.length})
                    </TabsTrigger>
                </TabsList>
                
                <div className="flex-1 min-h-0 overflow-hidden">
                    <TabsContent value="loan" className="h-full mt-0 focus-visible:outline-none">
                        <InstallmentTable installments={loanInstallments} referenceDate={referenceDate} onToggle={handleToggle} type="loan" />
                    </TabsContent>
                    <TabsContent value="insurance" className="h-full mt-0 focus-visible:outline-none">
                        <InstallmentTable installments={insuranceInstallments} referenceDate={referenceDate} onToggle={handleToggle} type="insurance" />
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}