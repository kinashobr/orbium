"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { DetectedCardInstallment } from "@/types/pluggy";
import { formatCurrency } from "@/types/finance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CalendarCheck, Check, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

interface InstallmentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DetectedCardInstallment[];
  onItemsChange: (items: DetectedCardInstallment[]) => void;
}

export function InstallmentReviewModal({
  isOpen,
  onClose,
  items,
  onItemsChange
}: InstallmentReviewModalProps) {
  const { addPurchaseInstallments, contasMovimento } = useFinance();

  if (!items || items.length === 0) return null;

  const handleRegisterSingle = (item: DetectedCardInstallment) => {
    addPurchaseInstallments({
      description: item.cleanDescription,
      totalAmount: item.totalAmount,
      installments: item.totalInstallments,
      firstDueDate: item.firstDueDate,
      suggestedAccountId: item.targetAccountId,
      isRecurring: false,
    });

    toast.success(`"${item.cleanDescription}" cadastrado no Gerenciar Compromissos (${item.totalInstallments} parcelas)!`);
    
    const remaining = items.filter(i => i.id !== item.id);
    onItemsChange(remaining);
    if (remaining.length === 0) {
      onClose();
    }
  };

  const handleRegisterAll = () => {
    items.forEach(item => {
      addPurchaseInstallments({
        description: item.cleanDescription,
        totalAmount: item.totalAmount,
        installments: item.totalInstallments,
        firstDueDate: item.firstDueDate,
        suggestedAccountId: item.targetAccountId,
        isRecurring: false,
      });
    });

    toast.success(`${items.length} compras parceladas cadastradas no Gerenciar Compromissos!`);
    onItemsChange([]);
    onClose();
  };

  const handleDismissSingle = (id: string) => {
    const remaining = items.filter(i => i.id !== id);
    onItemsChange(remaining);
    if (remaining.length === 0) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border-border/50">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Novas Compras Parceladas no Cartão
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Identificamos compras parceladas no Open Finance. Confirme para cadastrá-las no Gerenciar Compromissos com seus prazos e valores.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-3 py-3 pr-1 scrollbar-thin">
          {items.map((item) => {
            const acc = contasMovimento.find(c => c.id === item.targetAccountId);
            let formattedDate = item.firstDueDate;
            try {
              formattedDate = format(parseDateLocal(item.firstDueDate), "dd/MM/yyyy");
            } catch {
              // fallback
            }

            return (
              <div 
                key={item.id}
                className="p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">
                      {item.cleanDescription}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold text-primary border-primary/30 bg-primary/5">
                      {item.totalInstallments}x de {formatCurrency(item.installmentAmount)}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-foreground">Total: {formatCurrency(item.totalAmount)}</span>
                    <span aria-hidden="true">·</span>
                    <span>1º Vencimento: {formattedDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium">{acc?.name || "Cartão de Crédito"}</span>
                  </p>

                  <p className="text-[10px] text-muted-foreground/70 font-mono truncate">
                    Ref: {item.originalDescription}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissSingle(item.id)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                    title="Descartar esta sugestão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Descartar</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRegisterSingle(item)}
                    className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Cadastrar</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {items.length} {items.length === 1 ? "compra parcelada pendente" : "compras parceladas pendentes"}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto text-xs h-9"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleRegisterAll}
              className="w-full sm:w-auto text-xs h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Cadastrar Todas ({items.length})</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
