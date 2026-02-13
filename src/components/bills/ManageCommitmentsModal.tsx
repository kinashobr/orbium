import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Settings } from "lucide-react";
import { BillTracker, PotentialFixedBill, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AddPurchaseInstallmentDialog } from "./AddPurchaseInstallmentDialog";

interface ManageCommitmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  potentialFixedBills: PotentialFixedBill[];
  futureFixedBills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
}

export function ManageCommitmentsModal({
  open,
  onOpenChange,
  currentDate,
  potentialFixedBills,
  futureFixedBills,
  onToggleFixedBill,
}: ManageCommitmentsModalProps) {
  const { billsTracker, contasMovimento } = useFinance();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const purchaseBills = useMemo(
    () => billsTracker
      .filter((b) => b.sourceType === "purchase_installment" && !b.isExcluded)
      .sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime()),
    [billsTracker]
  );

  const creditCards = useMemo(
    () => contasMovimento.filter((c) => c.accountType === "cartao_credito"),
    [contasMovimento]
  );

  const renderBillGrid = (bills: PotentialFixedBill[], emptyText: string) => {
    if (!bills.length) {
      return <p className="text-sm text-muted-foreground">{emptyText}</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bills.map((bill) => (
          <label key={bill.key} className="border rounded-xl p-3 flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={bill.isIncluded}
              onCheckedChange={(checked) => onToggleFixedBill(bill, Boolean(checked))}
            />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-sm truncate">{bill.description}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseDateLocal(bill.dueDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm font-bold">{formatCurrency(bill.expectedAmount)}</p>
            </div>
          </label>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Gerenciar Compromissos
            </DialogTitle>
            <DialogDescription>
              Centralize fixas, parceladas, adiantamentos e cartões sem poluir a tela principal.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="fixas" className="flex-1 min-h-0">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="fixas">Fixas</TabsTrigger>
              <TabsTrigger value="parceladas">Parceladas</TabsTrigger>
              <TabsTrigger value="adiantamentos">Adiantamentos</TabsTrigger>
              <TabsTrigger value="cartoes">Cartões</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(85vh-140px)] pr-2 mt-4">
              <TabsContent value="fixas" className="space-y-4">
                {renderBillGrid(potentialFixedBills, "Nenhuma conta fixa/parcela sugerida para este mês.")}
              </TabsContent>

              <TabsContent value="parceladas" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Compras parceladas cadastradas</p>
                    <p className="text-xs text-muted-foreground">{purchaseBills.length} parcela(s) ativa(s)</p>
                  </div>
                  <Button onClick={() => setShowPurchaseDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nova compra parcelada
                  </Button>
                </div>

                {!purchaseBills.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma compra parcelada cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {purchaseBills.slice(0, 30).map((bill: BillTracker) => (
                      <div key={bill.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{bill.description}</p>
                          <p className="text-xs text-muted-foreground">Vencimento: {format(parseDateLocal(bill.dueDate), "dd/MM/yyyy")}</p>
                        </div>
                        <Badge variant="secondary">{formatCurrency(bill.expectedAmount)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="adiantamentos" className="space-y-4">
                {renderBillGrid(futureFixedBills, "Nenhuma parcela futura disponível para adiantamento.")}
              </TabsContent>

              <TabsContent value="cartoes" className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  Os cartões já cadastrados em Contas Movimento aparecem aqui para futuras configurações de fatura.
                </div>

                {!creditCards.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma conta do tipo cartão de crédito cadastrada.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {creditCards.map((card) => (
                      <div key={card.id} className="border rounded-lg p-3">
                        <p className="font-semibold text-sm">{card.name}</p>
                        <p className="text-xs text-muted-foreground">{card.institution || "Sem instituição"}</p>
                        <p className="text-xs text-muted-foreground mt-1">Configuração detalhada de fatura será vinculada nesta aba.</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddPurchaseInstallmentDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        currentDate={currentDate}
      />
    </>
  );
}
