import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, BillTracker, PotentialFixedBill } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateLocal } from "@/lib/utils";
import { FastForward, Trash2, History, Zap, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toast } from "sonner";

const isBillTracker = (bill: BillTracker | PotentialFixedBill): bill is BillTracker => 'id' in bill && bill.type === 'tracker';

interface CommitmentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  installments: (BillTracker | PotentialFixedBill)[];
  onAdvanceBill: (bill: PotentialFixedBill, discountAmount?: number) => void;
  onExcludeBill: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
  onUpdateBill?: (id: string, updates: Partial<BillTracker>) => void;
}

export function CommitmentDetailsModal({
  open,
  onOpenChange,
  title,
  installments,
  onAdvanceBill,
  onExcludeBill,
  onDeleteBill,
  onUpdateBill
}: CommitmentDetailsModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [discounts, setDiscounts] = useState<Record<string, string>>({});
  
  const sortedInstallments = [...installments].sort((a, b) => 
    parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime()
  );

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="commitment_details_modal"
        initialWidth={500}
        initialHeight={600}
        minWidth={400}
        minHeight={500}
        maxWidth={800}
        maxHeight={900}
        hideCloseButton
        className="rounded-[2.25rem] bg-card border-none shadow-2xl p-0 overflow-hidden flex flex-col"
      >
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 bg-card relative">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)} 
              className="absolute left-2 top-2 rounded-full h-8 w-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className={cn("flex items-center gap-3", isMobile && "pl-8")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">{title}</DialogTitle>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.15em] mt-0.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-primary" /> Histórico e Parcelas
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-4">
            {sortedInstallments.map((bill, idx) => {
              const isTracker = isBillTracker(bill);
              const isPaid = bill.isPaid;
              const isIncluded = isTracker ? !bill.isExcluded : bill.isIncluded;
              const dueDate = parseDateLocal(bill.dueDate);

              return (
                <div 
                  key={isTracker ? bill.id : (bill as PotentialFixedBill).key} 
                  className={cn(
                    "flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-[2rem] border transition-all duration-300 shadow-sm",
                    isPaid ? "bg-emerald-500/5 border-emerald-500/10 opacity-70" : 
                    isIncluded ? "bg-card border-border/40 hover:border-primary/30" : 
                    "bg-muted/5 border-border/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-black tracking-tight truncate">
                        {bill.description}
                      </p>
                      {isPaid && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                          PAGO
                        </span>
                      )}
                      {isTracker && !isPaid && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          NO MÊS
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {format(dueDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between xl:justify-end gap-3 flex-wrap">
                    <div className="text-left xl:text-right">
                      <p className={cn(
                        "text-base font-black tabular-nums tracking-tighter",
                        isPaid ? "text-emerald-500" : isIncluded ? "text-primary" : "text-foreground"
                      )}>
                        {formatCurrency(bill.expectedAmount)}
                      </p>
                      {isTracker && (bill as BillTracker).discountAmount ? (
                        <p className="text-[9px] font-black text-success">
                          Desc: {formatCurrency((bill as BillTracker).discountAmount || 0)}
                        </p>
                      ) : null}
                    </div>
                    
                    {!isPaid && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-muted/30 px-2.5 py-1.5 rounded-xl border border-border/40">
                          <span className="text-[9px] font-black text-success">Desc:</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0,00"
                            value={discounts[isTracker ? bill.id : (bill as PotentialFixedBill).key] || ""}
                            onChange={(e) => {
                              const itemId = isTracker ? bill.id : (bill as PotentialFixedBill).key;
                              const digits = e.target.value.replace(/\D/g, "");
                              const val = digits ? (parseInt(digits) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                              setDiscounts(prev => ({ ...prev, [itemId]: val }));
                            }}
                            className="h-7 w-20 text-xs font-black bg-transparent border-none focus-visible:ring-0 p-0 text-right tabular-nums text-success"
                          />
                        </div>

                        {/* Adiantar: only for PotentialFixedBill (future, not yet in tracker) */}
                        {!isTracker && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm border-none"
                            onClick={() => {
                              const itemId = (bill as PotentialFixedBill).key;
                              const disc = parseBrlValue(discounts[itemId] || "0");
                              onAdvanceBill(bill as PotentialFixedBill, disc);
                            }}
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            Adiantar
                          </Button>
                        )}
                        {/* Excluir/Desconto: for BillTracker items already in the month */}
                        {isTracker && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="secondary"
                              size="sm"
                              className="h-8 px-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all"
                              onClick={() => {
                                const itemId = bill.id;
                                const disc = parseBrlValue(discounts[itemId] || "0");
                                if (onUpdateBill) {
                                  onUpdateBill(bill.id, { discountAmount: disc > 0 ? disc : undefined });
                                  toast.success("Desconto atualizado!");
                                }
                              }}
                            >
                              Salvar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                              onClick={() => onDeleteBill(bill.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="p-2 bg-card border-t shrink-0 flex flex-row justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="rounded-full h-8 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            FECHAR
          </Button>
        </DialogFooter>

      </ResizableDialogContent>
    </Dialog>
  );
}